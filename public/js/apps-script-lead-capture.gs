/**
 * Maximum Health — Flow B lead-capture endpoint (Google Apps Script).
 *
 * Paste this file into your Google Sheet at Extensions → Apps Script.
 * Then Deploy → New deployment → Type: Web app.
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Copy the deployment URL and paste it into:
 *   public/js/therapist-picker.js       (LEAD_CAPTURE_ENDPOINT)
 *   public/massage-therapy-calgary-flow-b/confirmation/index.html  (LEAD_CAPTURE_ENDPOINT)
 *
 * The script handles two actions:
 *   - action: "lead"    → appends a new row with the form data
 *   - action: "notify"  → updates that same row with notify_preference (yes/no)
 *
 * Rows are matched back by GCLID when available. If GCLID is empty
 * (direct/organic traffic), the most recent row with the same email is updated.
 */

const SHEET_NAME = 'Leads';

const HEADERS = [
  'Timestamp',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Selected Therapist',
  'Recommended Therapist',
  'Matched Recommendation',
  'GCLID',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'page_variant',
  'flow',
  'Notify Preference',
  'Notify Recorded At'
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet = getOrCreateSheet();

    if (action === 'lead') {
      appendLead(sheet, body);
      return jsonOk();
    }
    if (action === 'notify') {
      updateNotify(sheet, body);
      return jsonOk();
    }
    return jsonErr('unknown action: ' + action);
  } catch (err) {
    return jsonErr(err && err.message ? err.message : String(err));
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Maximum Health lead capture endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendLead(sheet, body) {
  const row = [
    new Date(),
    body.first_name || '',
    body.last_name || '',
    body.email || '',
    body.phone || '',
    body.selected_therapist || '',
    body.recommended_therapist || '',
    body.matched_recommendation === true ? 'TRUE'
      : body.matched_recommendation === false ? 'FALSE' : '',
    body.gclid || '',
    body.utm_source || '',
    body.utm_medium || '',
    body.utm_campaign || '',
    body.utm_term || '',
    body.utm_content || '',
    body.page_variant || '',
    body.flow || '',
    '',
    ''
  ];
  sheet.appendRow(row);
}

function updateNotify(sheet, body) {
  const data = sheet.getDataRange().getValues();
  const gclidCol = HEADERS.indexOf('GCLID');
  const emailCol = HEADERS.indexOf('Email');
  const notifyCol = HEADERS.indexOf('Notify Preference');
  const notifyTsCol = HEADERS.indexOf('Notify Recorded At');

  let targetRow = -1;

  if (body.gclid) {
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][gclidCol]) === String(body.gclid)) { targetRow = i + 1; break; }
    }
  }
  if (targetRow === -1 && body.email) {
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][emailCol]).toLowerCase() === String(body.email).toLowerCase()) {
        targetRow = i + 1; break;
      }
    }
  }

  if (targetRow !== -1) {
    sheet.getRange(targetRow, notifyCol + 1).setValue(body.notify_preference || '');
    sheet.getRange(targetRow, notifyTsCol + 1).setValue(new Date());
  } else {
    // No matching row found — append a new "notify only" row so we don't lose the signal
    const row = new Array(HEADERS.length).fill('');
    row[0] = new Date();
    row[emailCol] = body.email || '';
    row[HEADERS.indexOf('Phone')] = body.phone || '';
    row[gclidCol] = body.gclid || '';
    row[HEADERS.indexOf('page_variant')] = body.page_variant || '';
    row[HEADERS.indexOf('flow')] = body.flow || '';
    row[notifyCol] = body.notify_preference || '';
    row[notifyTsCol] = new Date();
    sheet.appendRow(row);
  }
}

function jsonOk() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
