const SHEET_ID = '1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0';

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(payload);
}

function cleanIdentity(value, max = 180) {
  return String(value || '').trim().slice(0, max);
}

export default async function kredoSheetHandler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (body.action !== 'updateReviewStatus') {
    return sendJson(res, 400, { success: false, error: 'Unsupported Sheet action' });
  }
  if (body.spreadsheetId && body.spreadsheetId !== SHEET_ID) {
    return sendJson(res, 403, { success: false, error: 'Spreadsheet is outside the KREDO allowlist' });
  }

  const transactionId = cleanIdentity(body.transactionId);
  const referenceId = cleanIdentity(body.referenceId);
  const appTransactionId = cleanIdentity(body.appTransactionId);
  if (!transactionId && !referenceId && !appTransactionId) {
    return sendJson(res, 400, { success: false, error: 'A stable transaction identity is required' });
  }

  const writebackUrl = process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL;
  if (!writebackUrl) {
    return sendJson(res, 503, {
      success: false,
      pending: true,
      error: 'KREDO Sheet approval write-back is not configured',
    });
  }
  const approvalPayload = {
    action: 'updateReviewStatus',
    spreadsheetId: SHEET_ID,
    sheetName: 'Transactions',
    transactionId,
    referenceId,
    appTransactionId,
    approved: body.approved !== false,
    reviewFlag: body.approved === false ? 'Yes' : 'Approved',
    reviewReason: cleanIdentity(body.reviewReason, 500) || 'Approved in Memoir KREDO',
    source: 'Memoir KREDO',
    requestedAt: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(writebackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify(approvalPayload),
    });
    const upstreamText = await upstream.text();
    let upstreamPayload = {};
    try { upstreamPayload = JSON.parse(upstreamText); } catch {}

    const updatedRows = Number(upstreamPayload.updatedRows || upstreamPayload.updatedRowCount || 0);
    const verifiedUpdate = upstream.ok && upstreamPayload.success === true && (
      upstreamPayload.updated === true ||
      updatedRows > 0 ||
      upstreamPayload.action === 'updateReviewStatus'
    );

    if (!verifiedUpdate) {
      return sendJson(res, 502, {
        success: false,
        pending: true,
        error: upstreamPayload.error || 'The Google Apps Script deployment has not enabled KREDO approval write-back yet',
      });
    }

    return sendJson(res, 200, {
      success: true,
      updated: true,
      updatedRows: updatedRows || 1,
      transactionId,
      reviewFlag: approvalPayload.reviewFlag,
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
