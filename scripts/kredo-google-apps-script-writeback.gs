/**
 * Memoir KREDO write-back extension for Smart Finance Intelligence v6.2+.
 *
 * Add this at the FIRST line inside the existing doPost(e):
 *   var kredoResponse = tryHandleKredoWriteback_(e);
 *   if (kredoResponse) return kredoResponse;
 *
 * Add SECRET_TOKEN in Apps Script Project Settings > Script Properties and
 * redeploy the web app. Put the same token in Vercel as
 * KREDO_SHEET_WRITEBACK_TOKEN. Never place it in browser code or Git.
 */

function tryHandleKredoWriteback_(e) {
  var raw = e && e.postData && String(e.postData.contents || '').trim();
  if (!raw || raw.charAt(0) !== '{') return null;
  var payload;
  try { payload = JSON.parse(raw); } catch (error) { return null; }
  var actions = ['updateReviewStatus', 'updateRecord', 'markBillPaid', 'createRule'];
  if (!payload || actions.indexOf(String(payload.action || '')) < 0) return null;

  try {
    // Reuse the existing v6.2 token so iPhone/Android ingestion is unchanged.
    // A Script Property can override it later without changing this code.
    var expectedToken = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || (typeof SECRET_TOKEN !== 'undefined' ? SECRET_TOKEN : '');
    if (!expectedToken) return kredoJson_({ success: false, error: 'SECRET_TOKEN is not configured' });
    if (String(payload.token || '') !== expectedToken) return kredoJson_({ success: false, error: 'Unauthorized' });
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (payload.spreadsheetId && String(payload.spreadsheetId) !== spreadsheet.getId()) return kredoJson_({ success: false, error: 'Spreadsheet is outside the KREDO allowlist' });

    var action = String(payload.action);
    var sheetName = action === 'updateReviewStatus' ? 'Transactions' : String(payload.sheetName || '');
    var allowed = kredoWritableFields_();
    if (!allowed[sheetName]) return kredoJson_({ success: false, error: 'Sheet tab is not writable' });
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return kredoJson_({ success: false, error: sheetName + ' sheet was not found' });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (action === 'createRule') return kredoCreateRule_(sheet, payload.fields || {});
      var identityHeader = sheetName === 'Bills' ? 'Bill ID' : sheetName === 'Alerts' ? 'Alert ID' : sheetName === 'Rules' ? 'Rule ID' : 'Transaction ID';
      var row = kredoFindRow_(sheet, [
        { header: identityHeader, value: payload.recordId || payload.transactionId },
        { header: 'Reference ID', value: payload.referenceId }
      ]);
      if (row < 2) return kredoJson_({ success: false, error: 'No matching ' + sheetName + ' record was found' });

      if (action === 'updateReviewStatus') {
        kredoSetFields_(sheet, row, { 'Review Flag': payload.approved === false ? 'Yes' : 'Approved', 'Review Reason': payload.reviewReason || 'Approved in Memoir KREDO' }, allowed.Transactions);
      } else if (action === 'markBillPaid') {
        kredoMarkBillPaid_(sheet, row, payload);
      } else {
        var count = kredoSetFields_(sheet, row, payload.updates || {}, allowed[sheetName]);
        if (!count) return kredoJson_({ success: false, error: 'No writable fields were supplied' });
        kredoSetTimestamp_(sheet, row, 'Updated At');
      }
      SpreadsheetApp.flush();
      return kredoJson_({ success: true, action: action, updated: true, updatedRows: 1, row: row, recordId: payload.recordId || payload.transactionId || payload.referenceId });
    } finally { lock.releaseLock(); }
  } catch (error) {
    return kredoJson_({ success: false, error: String(error && error.message || error) });
  }
}

function kredoWritableFields_() {
  return {
    Transactions: ['Date', 'Time', 'Type', 'Amount', 'Category', 'Payment Method', 'Merchant', 'Account', 'Bank', 'Last 4', 'Reference ID', 'Nature', 'Currency', 'Status', 'Review Flag', 'Review Reason', 'Linked Bill ID', 'Payment App', 'Card Network'],
    Bills: ['Bill Type', 'Issuer / Biller', 'Bank', 'Account', 'Last 4', 'Statement Date', 'Statement Period', 'Due Date', 'Bill Amount', 'Minimum Due', 'Paid Amount', 'Balance Due', 'Status', 'Autopay', 'Last Event', 'Reference ID'],
    Alerts: ['Alert Class', 'Severity', 'Reason', 'Suggested Action', 'Status'],
    Rules: ['Rule Type', 'Match', 'Value', 'Active', 'Notes']
  };
}

function kredoHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
}

function kredoHeaderColumn_(sheet, header, createIfMissing) {
  var headers = kredoHeaders_(sheet);
  var wanted = String(header || '').toLowerCase();
  for (var i = 0; i < headers.length; i++) if (headers[i].toLowerCase() === wanted) return i + 1;
  if (!createIfMissing) return -1;
  var col = headers.length + 1;
  sheet.getRange(1, col).setValue(header).setBackground('#111827').setFontColor('#ffffff').setFontWeight('bold');
  return col;
}

function kredoFindRow_(sheet, identities) {
  if (sheet.getLastRow() < 2) return -1;
  for (var i = 0; i < identities.length; i++) {
    var wanted = String(identities[i].value || '').trim();
    if (!wanted) continue;
    var col = kredoHeaderColumn_(sheet, identities[i].header, false);
    if (col < 1) continue;
    var values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (var row = 0; row < values.length; row++) if (String(values[row][0] || '').trim() === wanted) return row + 2;
  }
  return -1;
}

function kredoSetFields_(sheet, row, updates, allowed) {
  var count = 0;
  Object.keys(updates || {}).forEach(function(header) {
    if (allowed.indexOf(header) < 0) return;
    var col = kredoHeaderColumn_(sheet, header, false);
    if (col < 1) return;
    sheet.getRange(row, col).setValue(updates[header]);
    count++;
  });
  return count;
}

function kredoNumber_(value) { return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0; }
function kredoTimestamp_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy hh:mm:ss a'); }
function kredoSetTimestamp_(sheet, row, header) { sheet.getRange(row, kredoHeaderColumn_(sheet, header, true)).setValue(kredoTimestamp_()); }

function kredoMarkBillPaid_(sheet, row, payload) {
  var totalCol = kredoHeaderColumn_(sheet, 'Bill Amount', false);
  var paidCol = kredoHeaderColumn_(sheet, 'Paid Amount', false);
  var balanceCol = kredoHeaderColumn_(sheet, 'Balance Due', false);
  var statusCol = kredoHeaderColumn_(sheet, 'Status', false);
  var eventCol = kredoHeaderColumn_(sheet, 'Last Event', false);
  if ([totalCol, paidCol, balanceCol, statusCol, eventCol].some(function(col) { return col < 1; })) throw new Error('Bills payment columns are incomplete');
  var total = kredoNumber_(sheet.getRange(row, totalCol).getValue());
  var previousPaid = kredoNumber_(sheet.getRange(row, paidCol).getValue());
  var payment = Math.max(0, Number(payload.paidAmount || 0));
  var paid = Math.min(total || previousPaid + payment, previousPaid + payment);
  var balance = total > 0 ? Math.max(0, total - paid) : 0;
  var status = balance <= 0 ? 'Paid' : 'Partially Paid';
  sheet.getRange(row, paidCol).setValue(paid);
  sheet.getRange(row, balanceCol).setValue(balance);
  sheet.getRange(row, statusCol).setValue(status);
  sheet.getRange(row, eventCol).setValue('Payment recorded in Memoir KREDO' + (payload.paidVia ? ' via ' + payload.paidVia : ''));
  kredoSetTimestamp_(sheet, row, 'Updated At');
  kredoSetTimestamp_(sheet, row, 'Paid At');
  if (status === 'Paid') sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), 24)).setBackground('#F0FDF4').setFontColor('#166534');
}

function kredoCreateRule_(sheet, fields) {
  var ruleId = 'rule-' + Utilities.getUuid();
  sheet.appendRow([ruleId, fields['Rule Type'] || 'Merchant', fields.Match || '', fields.Value || '', fields.Active === false ? false : true, fields.Notes || '', kredoTimestamp_()]);
  SpreadsheetApp.flush();
  return kredoJson_({ success: true, action: 'createRule', updated: true, updatedRows: 1, recordId: ruleId });
}

function kredoJson_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
