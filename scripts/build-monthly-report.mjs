#!/usr/bin/env node
/**
 * Monthly report ingestion.
 *
 * Reads the most recent Excel exports from reports-workspace/data/,
 * interactively confirms practitioner classifications (focus + in-discipline),
 * and writes public/reports/monthly-report/data.json.
 *
 * Expected inputs (latest by mtime, unless availability where filename pattern picks 1mo/4mo/12mo):
 *   reports-workspace/data/ehr-revenue/*.xlsx     — transactional revenue (Purchase Date, Staff Member, Item, Total)
 *   reports-workspace/data/cancellations/*.xlsx   — transactional cancellations (start_at, staff_member_name, state)
 *   reports-workspace/data/availability/*.xlsx    — snapshots per practitioner (one row per staff, totals over window)
 */

import XLSX from "xlsx";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(ROOT, "reports-workspace", "data");
const CONFIG_PATH = join(ROOT, "reports-workspace", "config", "practitioners.json");
const OUT_PATH = join(ROOT, "public", "reports", "monthly-report", "data.json");

// Column mapping — derived from actual EHR exports. Adjust if the EHR output format changes.
const COLS = {
  availability: {
    staff: "Staff Name",
    shiftHours: "Shift Total Hours",
    breakHours: "Break Total Hours",
    apptHours: "Appointment Total Hours",
    apptCount: "Appointment Total Count",
  },
  cancellations: {
    startAt: "start_at",
    staff: "staff_member_name",
    state: "state",
    treatment: "treatment_name",
  },
  revenue: {
    purchaseDate: "Purchase Date",
    staff: "Staff Member",
    item: "Item",
    total: "Total",
    status: "Status",
  },
};

// --- PII sanitization -------------------------------------------------------
// Runs before anything else reads the data. Rewrites each source .xlsx in-place
// with PII columns dropped. Idempotent: a clean file is a no-op.

const PII_EXACT = new Set([
  "patient", "notes", "notes_text",
  "email", "phone", "mobile", "cell", "address", "street", "postal_code", "zip",
  "dob", "date_of_birth", "birth_date", "gender", "sex",
  "first_name", "last_name", "preferred_name", "middle_name", "full_name",
]);

function isPIIHeader(h) {
  if (h == null) return false;
  const s = String(h).trim().toLowerCase().replace(/\s+/g, "_");
  if (!s) return false;
  if (PII_EXACT.has(s)) return true;
  if (s === "patient" || s.startsWith("patient_")) return true;
  return false;
}

function sanitizeFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const dropped = [];
  let changed = false;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
    if (rows.length === 0) continue;
    const headers = rows[0];
    const keep = [];
    for (let i = 0; i < headers.length; i++) {
      if (isPIIHeader(headers[i])) dropped.push(String(headers[i]));
      else keep.push(i);
    }
    if (keep.length === headers.length) continue;
    const newRows = rows.map(r => keep.map(i => (r[i] === undefined ? null : r[i])));
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(newRows);
    changed = true;
  }
  if (changed) XLSX.writeFile(wb, filePath);
  return dropped;
}

function sanitizeAll() {
  const folders = ["availability", "cancellations", "ehr-revenue"].map(s => join(DATA_DIR, s));
  let totalDropped = 0;
  let anyLogged = false;
  for (const dir of folders) {
    if (!existsSync(dir)) continue;
    for (const f of xlsxIn(dir)) {
      const dropped = sanitizeFile(f.path);
      if (dropped.length) {
        if (!anyLogged) { console.log("Sanitizing source files (stripping PII columns):"); anyLogged = true; }
        console.log(`  ${basename(f.path)} → dropped ${dropped.length} column(s): ${dropped.join(", ")}`);
        totalDropped += dropped.length;
      }
    }
  }
  if (totalDropped === 0) {
    console.log("PII check: source files already clean.");
  }
}

// --- File discovery ---------------------------------------------------------

function xlsxIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".xlsx"))
    .map(f => ({ name: f, path: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }));
}

function latestFile(dir) {
  const files = xlsxIn(dir);
  if (!files.length) return null;
  files.sort((a, b) => b.mtime - a.mtime);
  return files[0];
}

// Read every .xlsx in a folder and concat rows. Lets us combine current-year
// and prior-year exports in the same folder (non-overlapping date ranges).
function readAllSheets(dir) {
  const files = xlsxIn(dir);
  if (!files.length) return { rows: [], files: [] };
  files.sort((a, b) => a.name.localeCompare(b.name));
  const rows = [];
  for (const f of files) rows.push(...readSheet(f.path));
  return { rows, files };
}

function availabilityFiles(dir) {
  const all = xlsxIn(dir);
  // \b prevents "04 month" (from a date like 2026.04) from matching "4 month".
  const match = (re) => all.find(f => re.test(f.name.toLowerCase()));
  return {
    "12mo": match(/\b12\s*month/) || null,
    "4mo":  match(/\b4\s*month/)  || null,
    "1mo":  match(/(month\s*snapshot|\b1\s*month)/) || null,
  };
}

// --- Reading ----------------------------------------------------------------

function readSheet(path) {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function parseMonth(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}`;
  const m = String(val).match(/(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// --- Practitioner detection + config ---------------------------------------

function detectPractitioners(revenueRows, cancellationRows, availabilities) {
  const names = new Set();
  for (const r of revenueRows) {
    const s = r[COLS.revenue.staff];
    if (s && typeof s === "string") names.add(s.trim());
  }
  for (const r of cancellationRows) {
    const s = r[COLS.cancellations.staff];
    if (s && typeof s === "string") names.add(s.trim());
  }
  for (const file of Object.values(availabilities)) {
    if (!file) continue;
    for (const r of readSheet(file.path)) {
      const s = r[COLS.availability.staff];
      if (s && typeof s === "string") names.add(s.trim());
    }
  }
  names.delete("");
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function loadConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf8")); }
  catch { return { focus: [], inDiscipline: [] }; }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

async function confirmConfig(detected, config) {
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  const interactive = isTTY && !process.env.NO_PROMPT;

  // Reconcile: carry over existing memberships for anyone still in the data, add new names.
  const known = new Set(detected);
  const focus = (config.focus || []).filter(n => known.has(n));
  const disc  = (config.inDiscipline || []).filter(n => known.has(n));
  const newNames = detected.filter(n => !(config.focus || []).includes(n) && !(config.inDiscipline || []).includes(n));

  console.log("\nPractitioners detected in this month's data:");
  for (const name of detected) {
    const f = focus.includes(name) ? "Y" : "·";
    const d = disc.includes(name)  ? "Y" : "·";
    console.log(`  [${f}] focus  [${d}] discipline   ${name}`);
  }
  if (newNames.length) {
    console.log(`\n${newNames.length} new practitioner(s) not yet classified: ${newNames.join(", ")}`);
  }

  if (!interactive) {
    // Non-interactive: use config exactly as-is, don't overwrite. If names don't match the data,
    // segments will be empty and that's a signal the user needs to run interactively to classify.
    console.log("\n(non-interactive — using config as-is, no changes saved)");
    return { focus: config.focus || [], inDiscipline: config.inDiscipline || [] };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const edit = (await rl.question("\nEdit classifications? [y/N] ")).trim().toLowerCase();
    if (edit === "y" || edit === "yes") {
      const newFocus = [];
      const newDisc  = [];
      for (const name of detected) {
        const curF = focus.includes(name);
        const curD = disc.includes(name);
        const f = (await rl.question(`  ${name} — in focus list? [${curF ? "Y/n" : "y/N"}] `)).trim().toLowerCase();
        const d = (await rl.question(`  ${name} — massage (in-discipline)? [${curD ? "Y/n" : "y/N"}] `)).trim().toLowerCase();
        const wantF = f === "" ? curF : (f === "y" || f === "yes");
        const wantD = d === "" ? curD : (d === "y" || d === "yes");
        if (wantF) newFocus.push(name);
        if (wantD) newDisc.push(name);
      }
      const updated = { focus: newFocus, inDiscipline: newDisc };
      saveConfig(updated);
      console.log("  Saved updated config.");
      return updated;
    }
  } finally {
    rl.close();
  }

  const updated = { focus, inDiscipline: disc };
  saveConfig(updated);
  return updated;
}

// --- Aggregation ------------------------------------------------------------

function buildMonthly(revenueRows, cancellationRows, predicateRevenue, predicateCancellation) {
  const bucket = {}; // YYYY-MM -> { revenue, completed, cancelled }
  const get = (m) => (bucket[m] ??= { revenue: 0, completed: 0, cancelled: 0 });

  for (const r of revenueRows) {
    const month = parseMonth(r[COLS.revenue.purchaseDate]);
    if (!month) continue;
    if (!predicateRevenue(r)) continue;
    const total = Number(r[COLS.revenue.total]) || 0;
    get(month).revenue += total;
    const staff = r[COLS.revenue.staff];
    if (staff && typeof staff === "string" && staff.trim() !== "") {
      // Rows with a Staff Member are appointments; rows without (products) are not.
      get(month).completed += 1;
    }
  }
  for (const c of cancellationRows) {
    const month = parseMonth(c[COLS.cancellations.startAt]);
    if (!month) continue;
    if (c[COLS.cancellations.state] !== "cancelled") continue;
    if (!predicateCancellation(c)) continue;
    get(month).cancelled += 1;
  }

  return Object.keys(bucket).sort().map(m => ({
    month: m,
    revenue: Math.round(bucket[m].revenue * 100) / 100,
    completed: bucket[m].completed,
    cancelled: bucket[m].cancelled,
    booked: bucket[m].completed + bucket[m].cancelled,
  }));
}

function buildSnapshot(file, staffPredicate) {
  if (!file) return null;
  const rows = readSheet(file.path);
  let shift = 0, brk = 0, appt = 0, apptCount = 0, matched = 0;
  for (const r of rows) {
    const staff = r[COLS.availability.staff];
    if (!staff || typeof staff !== "string") continue;
    const name = staff.trim();
    if (!staffPredicate(name)) continue;
    matched += 1;
    shift += Number(r[COLS.availability.shiftHours])   || 0;
    brk   += Number(r[COLS.availability.breakHours])   || 0;
    appt  += Number(r[COLS.availability.apptHours])    || 0;
    apptCount += Number(r[COLS.availability.apptCount]) || 0;
  }
  if (matched === 0) return null;
  // EHR's "Break" column in this export isn't lunch breaks — for some practitioners
  // it's larger than (shift - appt), which would make shift-minus-breaks nonsense.
  // Treat shift hours as the total available capacity; idle = shift - appt.
  const idle = Math.max(0, shift - appt);
  return {
    shiftHours: round1(shift),
    apptHours: round1(appt),
    idleHours: round1(idle),
    apptCount,
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// --- Main -------------------------------------------------------------------

async function main() {
  sanitizeAll();

  const availabilities = availabilityFiles(join(DATA_DIR, "availability"));
  const revBundle  = readAllSheets(join(DATA_DIR, "ehr-revenue"));
  const cancBundle = readAllSheets(join(DATA_DIR, "cancellations"));

  if (!revBundle.files.length)  { console.error("✗ No revenue file in reports-workspace/data/ehr-revenue/");   process.exit(1); }
  if (!cancBundle.files.length) { console.error("✗ No cancellations file in reports-workspace/data/cancellations/"); process.exit(1); }
  if (!availabilities["12mo"] && !availabilities["4mo"] && !availabilities["1mo"]) {
    console.error("✗ No availability files found in reports-workspace/data/availability/ (expected names containing '12 month', '4 month', or 'month snapshot')");
    process.exit(1);
  }

  console.log("Reading files:");
  for (const f of revBundle.files)  console.log(`  revenue:       ${f.name}`);
  for (const f of cancBundle.files) console.log(`  cancellations: ${f.name}`);
  for (const [k, f] of Object.entries(availabilities)) {
    if (f) console.log(`  availability(${k}): ${basename(f.path)}`);
  }

  const revenue = revBundle.rows;
  const cancellations = cancBundle.rows;

  const detected = detectPractitioners(revenue, cancellations, availabilities);
  const config = await confirmConfig(detected, loadConfig());

  const focus = config.focus || [];
  const disc  = new Set(config.inDiscipline || []);

  const segments = {};

  // All massage: in-discipline practitioners only
  segments["all-massage"] = {
    label: "All Massage",
    monthly: buildMonthly(
      revenue, cancellations,
      (r) => { const s = r[COLS.revenue.staff]; return typeof s === "string" && disc.has(s.trim()); },
      (c) => { const s = c[COLS.cancellations.staff]; return typeof s === "string" && disc.has(s.trim()); },
    ),
    snapshot: Object.fromEntries(["1mo","4mo","12mo"].map(k => [k, buildSnapshot(availabilities[k], (s) => disc.has(s))])),
  };

  // Per focus practitioner
  for (const name of focus) {
    segments[name] = {
      label: name,
      monthly: buildMonthly(
        revenue, cancellations,
        (r) => { const s = r[COLS.revenue.staff]; return typeof s === "string" && s.trim() === name; },
        (c) => { const s = c[COLS.cancellations.staff]; return typeof s === "string" && s.trim() === name; },
      ),
      snapshot: Object.fromEntries(["1mo","4mo","12mo"].map(k => [k, buildSnapshot(availabilities[k], (s) => s === name)])),
    };
  }

  // Whole clinic: everything (including product rows for revenue)
  segments["whole-clinic"] = {
    label: "Whole Clinic",
    monthly: buildMonthly(
      revenue, cancellations,
      () => true,
      () => true,
    ),
    snapshot: Object.fromEntries(["1mo","4mo","12mo"].map(k => [k, buildSnapshot(availabilities[k], () => true)])),
  };

  // Preserve order: whole-clinic, all-massage, per-therapist (config order)
  const ordered = {
    "whole-clinic": segments["whole-clinic"],
    "all-massage": segments["all-massage"],
  };
  for (const n of focus) ordered[n] = segments[n];

  const allMonths = Object.values(ordered).flatMap(s => (s.monthly || []).map(m => m.month));
  const dataThrough = allMonths.length ? allMonths.sort().at(-1) : null;

  const out = {
    updatedAt: new Date().toISOString(),
    dataThrough,
    practitioners: {
      all: detected,
      focus: config.focus,
      inDiscipline: config.inDiscipline,
    },
    sourceFiles: {
      revenue: revBundle.files.map(f => f.name),
      cancellations: cancBundle.files.map(f => f.name),
      availability: Object.fromEntries(
        Object.entries(availabilities).filter(([, f]) => f).map(([k, f]) => [k, basename(f.path)])
      ),
    },
    segments: ordered,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n✓ Wrote ${OUT_PATH}`);
  console.log(`  ${Object.keys(ordered).length} segments · dataThrough ${dataThrough} · ${detected.length} practitioners detected`);
}

main().catch(e => { console.error(e); process.exit(1); });
