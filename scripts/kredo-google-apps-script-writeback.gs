/**
 * KREDO approval write-back extension for the existing Smart Finance Apps Script.
 *
 * Add this guard at the very top of the deployment's existing doPost(e):
 *
 *   var kredoResponse = tryHandleKredoWriteback_(e);
 *   if (kredoResponse) return kredoResponse;
 *
 * Then paste this file into the same bound Apps Script project and redeploy the
 * web app. Existing SMS/manual-entry behavior remains untouched.
 */

function tryHandleKredoWriteback_(e) {
  var raw = e && e.postData && e.postData.contents;
  if (!raw) return null;

  var payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    return null;
  }

  if (!payload || payload.action !== 'updateReviewStatus') return null;

  try {
    var spreadsheetId = String(payload.spreadsheetId || '').trim();
    var spreadsheet = spreadsheetId
      ? SpreadsheetApp.openById(spreadsheetId)
      : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(String(payload.sheetName || 'Transactions'));
    if (!sheet) return kredoJson_({ success: false, error: 'Transactions sheet was not found' });

    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) {
      return kredoJson_({ success: false, error: 'Transactions sheet is empty' });
    }

    var values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
    var headers = values[0].map(function (value) { return String(value || '').trim().toLowerCase(); });
    var txIdColumn = headers.indexOf('transaction id');
    var refIdColumn = headers.indexOf('reference id');
    var reviewFlagColumn = headers.indexOf('review flag');
    var reviewReasonColumn = headers.indexOf('review reason');

    if (reviewFlagColumn < 0) {
      return kredoJson_({ success: false, error: 'Review Flag column was not found' });
    }

    var transactionId = String(payload.transactionId || '').trim();
    var referenceId = String(payload.referenceId || '').trim();
    var matchedRow = -1;

    for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
      var rowTransactionId = txIdColumn >= 0 ? String(values[rowIndex][txIdColumn] || '').trim() : '';
      var rowReferenceId = refIdColumn >= 0 ? String(values[rowIndex][refIdColumn] || '').trim() : '';
      if ((transactionId && rowTransactionId === transactionId) || (referenceId && rowReferenceId === referenceId)) {
        matchedRow = rowIndex + 1;
        break;
      }
    }

    if (matchedRow < 0) {
      return kredoJson_({ success: false, error: 'No matching transaction row was found' });
    }

    var approved = payload.approved !== false;
    var reviewFlag = approved ? 'Approved' : String(payload.reviewFlag || 'Yes');
    var reviewReason = String(payload.reviewReason || (approved ? 'Approved in Memoir KREDO' : 'Approval removed in Memoir KREDO'));
    sheet.getRange(matchedRow, reviewFlagColumn + 1).setValue(reviewFlag);
    if (reviewReasonColumn >= 0) sheet.getRange(matchedRow, reviewReasonColumn + 1).setValue(reviewReason);
    SpreadsheetApp.flush();

    return kredoJson_({
      success: true,
      action: 'updateReviewStatus',
      updated: true,
      updatedRows: 1,
      row: matchedRow,
      transactionId: transactionId,
      reviewFlag: reviewFlag
    });
  } catch (error) {
    return kredoJson_({ success: false, error: String(error && error.message || error) });
  }
}

function kredoJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
