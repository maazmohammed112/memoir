const SHEET_ID = '1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0';
const DEFAULT_WRITEBACK_URL = 'https://script.google.com/macros/s/AKfycbyySoeJz7k9gwJN9_gM7zOS5Q73bSQmHEscWQR3dQD9y97i5infseMFDl23rZXYBdZoEg/exec';

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(payload);
}

function cleanIdentity(value, max = 180) {
  return String(value || '').trim().slice(0, max);
}

const ACTIONS = new Set(['updateReviewStatus', 'updateRecord', 'markBillPaid', 'createRule']);
const WRITABLE_FIELDS = {
  Transactions: new Set(['Date', 'Time', 'Type', 'Amount', 'Category', 'Payment Method', 'Merchant', 'Account', 'Bank', 'Last 4', 'Reference ID', 'Nature', 'Currency', 'Status', 'Review Flag', 'Review Reason', 'Linked Bill ID', 'Payment App', 'Card Network']),
  Bills: new Set(['Bill Type', 'Issuer / Biller', 'Bank', 'Account', 'Last 4', 'Statement Date', 'Statement Period', 'Due Date', 'Bill Amount', 'Minimum Due', 'Paid Amount', 'Balance Due', 'Status', 'Autopay', 'Last Event', 'Reference ID']),
  Alerts: new Set(['Alert Class', 'Severity', 'Reason', 'Suggested Action', 'Status']),
  Rules: new Set(['Rule Type', 'Match', 'Value', 'Active', 'Notes']),
};

function cleanFields(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => allowed?.has(key))
    .map(([key, fieldValue]) => [key, typeof fieldValue === 'boolean' ? fieldValue : cleanIdentity(fieldValue, 1000)]));
}

export default async function kredoSheetHandler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!ACTIONS.has(body.action)) {
    return sendJson(res, 400, { success: false, error: 'Unsupported Sheet action' });
  }
  if (body.spreadsheetId && body.spreadsheetId !== SHEET_ID) {
    return sendJson(res, 403, { success: false, error: 'Spreadsheet is outside the KREDO allowlist' });
  }

  const sheetName = cleanIdentity(body.sheetName || (body.action === 'updateReviewStatus' ? 'Transactions' : ''));
  if (!WRITABLE_FIELDS[sheetName]) return sendJson(res, 400, { success: false, error: 'Sheet tab is not writable' });
  const transactionId = cleanIdentity(body.transactionId);
  const referenceId = cleanIdentity(body.referenceId);
  const appTransactionId = cleanIdentity(body.appTransactionId);
  const recordId = cleanIdentity(body.recordId);
  if (body.action !== 'createRule' && !recordId && !transactionId && !referenceId && !appTransactionId) {
    return sendJson(res, 400, { success: false, error: 'A stable record identity is required' });
  }

  const writebackUrl = process.env.KREDO_SHEET_WRITEBACK_WEBAPP_URL || process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL || DEFAULT_WRITEBACK_URL;
  const writebackToken = process.env.KREDO_SHEET_WRITEBACK_TOKEN;
  if (!writebackToken) {
    return sendJson(res, 503, {
      success: false,
      pending: true,
      configurationError: true,
      error: 'KREDO Sheet write-back token is not configured in the production server',
    });
  }
  const requestPayload = {
    action: body.action,
    spreadsheetId: SHEET_ID,
    sheetName,
    transactionId,
    referenceId,
    appTransactionId,
    recordId,
    approved: body.approved !== false,
    reviewFlag: body.approved === false ? 'Yes' : 'Approved',
    reviewReason: cleanIdentity(body.reviewReason, 500) || 'Approved in Memoir KREDO',
    updates: cleanFields(body.updates, WRITABLE_FIELDS[sheetName]),
    fields: cleanFields(body.fields, WRITABLE_FIELDS.Rules),
    paidAmount: Math.max(0, Number(body.paidAmount || 0)),
    paidVia: cleanIdentity(body.paidVia, 120),
    source: 'Memoir KREDO',
    requestedAt: new Date().toISOString(),
  };
  requestPayload.token = writebackToken;

  try {
    const upstream = await fetch(writebackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify(requestPayload),
    });
    const upstreamText = await upstream.text();
    let upstreamPayload = {};
    try { upstreamPayload = JSON.parse(upstreamText); } catch {}

    const updatedRows = Number(upstreamPayload.updatedRows || upstreamPayload.updatedRowCount || 0);
    const verifiedUpdate = upstream.ok && upstreamPayload.success === true && (
      upstreamPayload.updated === true ||
      updatedRows > 0 ||
      upstreamPayload.action === body.action
    );

    if (!verifiedUpdate) {
      return sendJson(res, 502, {
        success: false,
        pending: true,
        error: upstreamPayload.error || 'The Google Apps Script deployment has not enabled KREDO write-back yet',
      });
    }

    return sendJson(res, 200, {
      success: true,
      updated: true,
      updatedRows: updatedRows || 1,
      transactionId,
      recordId,
      action: body.action,
      reviewFlag: upstreamPayload.reviewFlag || requestPayload.reviewFlag,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 502, {
      success: false,
      pending: true,
      error: error?.name === 'TimeoutError' ? 'Google Sheet write-back timed out' : (error?.message || 'Google Sheet write-back failed'),
    });
  }
}
