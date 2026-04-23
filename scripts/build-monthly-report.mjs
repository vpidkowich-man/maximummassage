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
    endAt: "end_at",
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

function parseDate(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const mo = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  const m = String(val).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Parse a "YYYY-MM-DD HH:MM:SS -0600" style datetime to epoch ms. Timezone suffix is stripped
// (we're only using these for duration, so the shared TZ cancels out).
function parseDateTime(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime();
  const s = String(val).replace(/\s*[+-]\d{4}$/, "").replace(" ", "T");
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function cancelHours(row) {
  const start = parseDateTime(row[COLS.cancellations.startAt]);
  const end   = parseDateTime(row[COLS.cancellations.endAt]);
  if (start == null || end == null) return 0;
  const h = (end - start) / 3600000;
  return h > 0 && h < 12 ? h : 0;
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
  catch { return { focus: [], inDiscipline: [], exclude: [] }; }
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
    return { focus: config.focus || [], inDiscipline: config.inDiscipline || [], exclude: config.exclude || [] };
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
      const updated = { focus: newFocus, inDiscipline: newDisc, exclude: config.exclude || [] };
      saveConfig(updated);
      console.log("  Saved updated config.");
      return updated;
    }
  } finally {
    rl.close();
  }

  const updated = { focus, inDiscipline: disc, exclude: config.exclude || [] };
  saveConfig(updated);
  return updated;
}

// --- Aggregation ------------------------------------------------------------

function buildDaily(revenueRows, cancellationRows, predicateRevenue, predicateCancellation) {
  const bucket = {}; // YYYY-MM-DD -> { revenue, completed, cancelled }
  const get = (d) => (bucket[d] ??= { revenue: 0, completed: 0, cancelled: 0 });

  for (const r of revenueRows) {
    const day = parseDate(r[COLS.revenue.purchaseDate]);
    if (!day) continue;
    if (!predicateRevenue(r)) continue;
    const total = Number(r[COLS.revenue.total]) || 0;
    get(day).revenue += total;
    const staff = r[COLS.revenue.staff];
    if (staff && typeof staff === "string" && staff.trim() !== "") {
      // Rows with a Staff Member are appointments; rows without (products) are not.
      get(day).completed += 1;
    }
  }
  for (const c of cancellationRows) {
    const day = parseDate(c[COLS.cancellations.startAt]);
    if (!day) continue;
    if (c[COLS.cancellations.state] !== "cancelled") continue;
    if (!predicateCancellation(c)) continue;
    get(day).cancelled += 1;
  }

  return Object.keys(bucket).sort().map(d => ({
    date: d,
    revenue: Math.round(bucket[d].revenue * 100) / 100,
    completed: bucket[d].completed,
    cancelled: bucket[d].cancelled,
    booked: bucket[d].completed + bucket[d].cancelled,
  }));
}

// Derive the date range that a snapshot window covers, inferred from `dataThrough` ("YYYY-MM").
// Used to scope cancelled-hours counts to the same window the availability export implies.
function snapshotWindowRange(dataThrough, months) {
  const [y, m] = dataThrough.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // last day of month m
  const endDate = `${dataThrough}-${String(lastDay).padStart(2, "0")}`;
  let sy = y, sm = m - months + 1;
  while (sm < 1) { sm += 12; sy -= 1; }
  const startDate = `${sy}-${String(sm).padStart(2, "0")}-01`;
  return { start: startDate, end: endDate };
}

function buildSnapshot(file, cancellationRows, staffPredicate, dateStart, dateEnd) {
  if (!file) return null;
  const rows = readSheet(file.path);
  let shift = 0, appt = 0, apptCount = 0, matched = 0;
  for (const r of rows) {
    const staff = r[COLS.availability.staff];
    if (!staff || typeof staff !== "string") continue;
    const name = staff.trim();
    if (!staffPredicate(name)) continue;
    matched += 1;
    shift += Number(r[COLS.availability.shiftHours])   || 0;
    appt  += Number(r[COLS.availability.apptHours])    || 0;
    apptCount += Number(r[COLS.availability.apptCount]) || 0;
  }
  if (matched === 0) return null;

  // Sum cancelled hours from the cancellations file within the same date window.
  let cancHours = 0, cancCount = 0;
  for (const c of cancellationRows) {
    if (c[COLS.cancellations.state] !== "cancelled") continue;
    const staff = c[COLS.cancellations.staff];
    if (!staff || typeof staff !== "string" || !staffPredicate(staff.trim())) continue;
    const d = parseDate(c[COLS.cancellations.startAt]);
    if (!d || d < dateStart || d > dateEnd) continue;
    cancHours += cancelHours(c);
    cancCount += 1;
  }

  // Treat shift hours as total available capacity (see memory: EHR Break column is unreliable).
  // apptHours from the availability export includes both attended + cancelled bookings;
  // break out cancelled separately so the bucket chart can stack completed + cancelled + idle.
  const idleHours = Math.max(0, shift - appt);
  const completedHours = Math.max(0, appt - cancHours);
  return {
    shiftHours: round1(shift),
    apptHours: round1(appt),
    completedHours: round1(completedHours),
    cancelledHours: round1(cancHours),
    idleHours: round1(idleHours),
    apptCount,
    cancelledCount: cancCount,
    windowStart: dateStart,
    windowEnd: dateEnd,
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

  const detectedRaw = detectPractitioners(revenue, cancellations, availabilities);
  const config = await confirmConfig(detectedRaw, loadConfig());

  // `exclude` drops practitioners from the report entirely — they don't appear in any
  // segment, the per-therapist breakdown, or the Schedule Utilization chart.
  // Use this for staff who shouldn't be on the client's dashboard at all (e.g. left
  // the clinic, contractor under a separate billing relationship, etc.).
  const exclude = new Set(config.exclude || []);
  const detected = detectedRaw.filter(n => !exclude.has(n));
  if (exclude.size) {
    const dropped = detectedRaw.filter(n => exclude.has(n));
    if (dropped.length) console.log(`Excluded from report: ${dropped.join(", ")}`);
  }

  const focus = (config.focus || []).filter(n => !exclude.has(n));
  const focusSet = new Set(focus);
  const disc  = new Set((config.inDiscipline || []).filter(n => !exclude.has(n)));

  // Derive dataThrough (YYYY-MM) from the latest revenue/cancellation date so the
  // snapshot window date ranges can be inferred before we build snapshots.
  const allDates = [
    ...revenue.map(r => parseDate(r[COLS.revenue.purchaseDate])).filter(Boolean),
    ...cancellations.map(c => parseDate(c[COLS.cancellations.startAt])).filter(Boolean),
  ].sort();
  const lastDate = allDates.at(-1) || null;
  const dataThrough = lastDate ? lastDate.slice(0, 7) : null;

  const snapshotRanges = dataThrough ? {
    "1mo":  snapshotWindowRange(dataThrough, 1),
    "4mo":  snapshotWindowRange(dataThrough, 4),
    "12mo": snapshotWindowRange(dataThrough, 12),
  } : { "1mo": null, "4mo": null, "12mo": null };

  const buildAllSnapshots = (pred) => Object.fromEntries(
    ["1mo","4mo","12mo"].map(k => {
      const range = snapshotRanges[k];
      if (!range) return [k, null];
      return [k, buildSnapshot(availabilities[k], cancellations, pred, range.start, range.end)];
    })
  );

  const segments = {};

  // All massage: in-discipline practitioners only
  segments["all-massage"] = {
    label: "All Massage",
    daily: buildDaily(
      revenue, cancellations,
      (r) => { const s = r[COLS.revenue.staff]; return typeof s === "string" && disc.has(s.trim()); },
      (c) => { const s = c[COLS.cancellations.staff]; return typeof s === "string" && disc.has(s.trim()); },
    ),
    snapshot: buildAllSnapshots((s) => disc.has(s)),
  };

  // Focus massage: just the four focus practitioners (subset of all-massage)
  segments["focus-massage"] = {
    label: '4 "in Focus" Therapists Only',
    daily: buildDaily(
      revenue, cancellations,
      (r) => { const s = r[COLS.revenue.staff]; return typeof s === "string" && focusSet.has(s.trim()); },
      (c) => { const s = c[COLS.cancellations.staff]; return typeof s === "string" && focusSet.has(s.trim()); },
    ),
    snapshot: buildAllSnapshots((s) => focusSet.has(s)),
  };

  // Per focus practitioner
  for (const name of focus) {
    segments[name] = {
      label: name,
      daily: buildDaily(
        revenue, cancellations,
        (r) => { const s = r[COLS.revenue.staff]; return typeof s === "string" && s.trim() === name; },
        (c) => { const s = c[COLS.cancellations.staff]; return typeof s === "string" && s.trim() === name; },
      ),
      snapshot: buildAllSnapshots((s) => s === name),
    };
  }

  // Whole clinic: everything except excluded staff (still includes product/no-staff
  // revenue rows since they belong to the clinic regardless of who delivered them).
  const notExcluded = (row, col) => {
    const s = row[col];
    return !(s && typeof s === "string" && exclude.has(s.trim()));
  };
  segments["whole-clinic"] = {
    label: "Whole Clinic",
    daily: buildDaily(
      revenue, cancellations,
      (r) => notExcluded(r, COLS.revenue.staff),
      (c) => notExcluded(c, COLS.cancellations.staff),
    ),
    snapshot: buildAllSnapshots((name) => !exclude.has(name)),
  };

  // Preserve order: whole-clinic, all-massage, focus-massage, per-therapist (config order)
  const ordered = {
    "whole-clinic":  segments["whole-clinic"],
    "all-massage":   segments["all-massage"],
    "focus-massage": segments["focus-massage"],
  };
  for (const n of focus) ordered[n] = segments[n];

  // Per-practitioner utilization for the pill-selector bucket chart — includes EVERY
  // practitioner detected (not just focus). Lets the UI toggle any staff member into
  // the utilization comparison without bloating the side-rail segment list.
  const practitionerUtilization = Object.fromEntries(
    detected.map(name => [name, buildAllSnapshots((s) => s === name)])
  );

  const out = {
    updatedAt: new Date().toISOString(),
    dataThrough,
    lastDataDate: lastDate,
    snapshotRanges,
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
    practitionerUtilization,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n✓ Wrote ${OUT_PATH}`);
  console.log(`  ${Object.keys(ordered).length} segments · dataThrough ${dataThrough} · ${detected.length} practitioners detected`);
}

main().catch(e => { console.error(e); process.exit(1); });
