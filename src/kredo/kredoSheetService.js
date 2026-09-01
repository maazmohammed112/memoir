/**
 * KREDO — Real-Time Google Sheet Integration Service
 * Fetches transaction rows in real-time directly from Google Sheets via the Visualization Query endpoint.
 * URL: https://docs.google.com/spreadsheets/d/1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0/gviz/tq?tqx=out:json
 */

export const GOOGLE_SHEET_ID = '1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0';
export const GOOGLE_SHEET_WEBAPP_DEPLOYMENT_ID = 'AKfycbyySoeJz7k9gwJN9_gM7zOS5Q73bSQmHEscWQR3dQD9y97i5infseMFDl23rZXYBdZoEg';
export const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit?usp=sharing`;
export const GVIZ_QUERY_ENDPOINT = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq`;
export const KREDO_SHEET_SYNC_ENDPOINT = '/api/kredo-sheet';

const CACHE_KEY = 'kredo_google_sheet_cache_v1';
const LAST_SYNC_KEY = 'kredo_google_sheet_last_sync_v1';
let sheetFetchInFlight = null;

export const FINANCE_SHEET_TABS = ['Transactions', 'Bills', 'Alerts', 'Rules', 'Dashboard', 'Calc_Data'];
export const FINANCE_SHEET_SCHEMAS = {
  Bills: ['Bill ID', 'Detected Date', 'Detected Time', 'Bill Type', 'Issuer / Biller', 'Bank', 'Account', 'Last 4', 'Statement Date', 'Statement Period', 'Due Date', 'Bill Amount', 'Minimum Due', 'Paid Amount', 'Balance Due', 'Status', 'Autopay', 'Last Event', 'Reference ID', 'Confidence', 'Source', 'Raw Message', 'Updated At', 'Paid At'],
  Alerts: ['Alert ID', 'Date', 'Time', 'Alert Class', 'Severity', 'Bank', 'Account', 'Last 4', 'Amount', 'Merchant / Counterparty', 'Reason', 'Suggested Action', 'Status', 'Sender', 'Source', 'Raw Message', 'Confidence', 'Related Transaction ID'],
  Rules: ['Rule ID', 'Rule Type', 'Match', 'Value', 'Active', 'Notes', 'Updated At'],
};

export function buildGoogleSheetQueryUrl(cacheBust = Date.now(), sheetName = 'Transactions') {
  const params = new URLSearchParams({
    tqx: `out:json;reqId:${cacheBust}`,
    sheet: sheetName,
    headers: '1',
    tq: 'select *',
    _: String(cacheBust),
  });
  return `${GVIZ_QUERY_ENDPOINT}?${params.toString()}`;
}

/**
 * Parses raw cell value safely
 */
function getCellValue(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell).trim();
  }
  if (typeof cell === 'object') {
    if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
  }
  return '';
}

/**
 * Format time string to 12-hour AM/PM if needed
 */
function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (trimmed.toUpperCase().includes('AM') || trimmed.toUpperCase().includes('PM')) {
    return trimmed;
  }
  // Try parsing HH:MM:SS or HH:MM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
  }
  return trimmed;
}

/**
 * Normalizes any date format from Google Sheets to standard ISO YYYY-MM-DD
 */
export function normalizeSheetDate(rawDate) {
  if (!rawDate) return new Date().toISOString().slice(0, 10);
  const str = String(rawDate).trim();
  
  // Format: Date(2026,7,28) or Date(2026,7,28,14,30,0) (GViz format)
  const gvizMatch = str.match(/Date\((\d+),(\d+),(\d+)/i);
  if (gvizMatch) {
    const y = parseInt(gvizMatch[1], 10);
    const m = parseInt(gvizMatch[2], 10) + 1; // 0-indexed in GViz
    const d = parseInt(gvizMatch[3], 10);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10);
    const y = parseInt(ddmmyyyy[3], 10);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Format: YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = parseInt(yyyymmdd[2], 10);
    const d = parseInt(yyyymmdd[3], 10);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Generic Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return new Date().toISOString().slice(0, 10);
}

export const SHEET_COLUMNS = [
  'Date', 'Time', 'Type', 'Amount', 'Category', 'Payment Method',
  'Merchant', 'Account', 'Source', 'Raw Message', 'Transaction ID',
  'Bank', 'Last 4', 'Reference ID', 'Nature', 'Confidence', 'Currency',
  'Status', 'Review Flag', 'Review Reason', 'Linked Bill ID',
  'Parser Version', 'Payment App', 'Card Network'
];

/**
 * Builds dynamic column index map from GViz cols array and/or header row cells
 */
export function buildColumnIndexMap(cols = [], headerRowCells = null) {
  const map = {};
  if (Array.isArray(cols)) {
    cols.forEach((col, idx) => {
      if (col) {
        const label = (col.label || col.id || '').trim().toLowerCase();
        if (label) map[label] = idx;
      }
    });
  }
  if (headerRowCells && Array.isArray(headerRowCells)) {
    headerRowCells.forEach((cell, idx) => {
      const val = getCellValue(cell).trim().toLowerCase();
      if (val) map[val] = idx;
    });
  }
  return map;
}

/**
 * Helper to safely extract cell value by candidate column names or fallback index
 */
export function getColValue(rowCells, colMap, candidateNames, defaultIndex) {
  if (!rowCells || !Array.isArray(rowCells)) return '';
  if (colMap && typeof colMap === 'object') {
    for (const name of candidateNames) {
      const key = String(name).trim().toLowerCase();
      if (colMap[key] !== undefined && rowCells[colMap[key]] !== undefined) {
        return getCellValue(rowCells[colMap[key]]);
      }
    }
  }
  if (defaultIndex !== undefined && defaultIndex < rowCells.length && rowCells[defaultIndex] !== undefined) {
    return getCellValue(rowCells[defaultIndex]);
  }
  return '';
}

/**
 * Normalizes a row from the Google Sheet supporting all 24 columns:
 * 0: Date, 1: Time, 2: Type, 3: Amount, 4: Category, 5: Payment Method,
 * 6: Merchant, 7: Account, 8: Source, 9: Raw Message, 10: Transaction ID,
 * 11: Bank, 12: Last 4, 13: Reference ID, 14: Nature, 15: Confidence, 16: Currency,
 * 17: Status, 18: Review Flag, 19: Review Reason, 20: Linked Bill ID,
 * 21: Parser Version, 22: Payment App, 23: Card Network
 */
export function normalizeSheetRow(rowCells, index, colMap = null) {
  const rawDate = getColValue(rowCells, colMap, ['date', 'timestamp', 'txn date', 'transaction date'], 0);
  const rawTime = getColValue(rowCells, colMap, ['time', 'txn time', 'timestamp time'], 1);
  const rawType = getColValue(rowCells, colMap, ['type', 'txn type', 'transaction type', 'flow'], 2).toLowerCase();
  const rawAmount = getColValue(rowCells, colMap, ['amount', 'inr', 'value', 'spent', 'txn amount'], 3);
  const rawCategory = getColValue(rowCells, colMap, ['category', 'cat', 'spend category'], 4);
  const rawMethod = getColValue(rowCells, colMap, ['payment method', 'method', 'mode', 'channel', 'payment mode'], 5);
  const rawMerchant = getColValue(rowCells, colMap, ['merchant', 'payee', 'vendor', 'store', 'beneficiary', 'title'], 6);
  const rawAccount = getColValue(rowCells, colMap, ['account', 'card / account', 'card/account', 'source account'], 7);
  const rawSource = getColValue(rowCells, colMap, ['source', 'data source', 'stream'], 8);
  const rawMessage = getColValue(rowCells, colMap, ['raw message', 'raw sms', 'sms', 'message', 'body'], 9);
  const rawTxId = getColValue(rowCells, colMap, ['transaction id', 'txn id', 'tx id', 'id', 'sheet id'], 10);
  const rawBank = getColValue(rowCells, colMap, ['bank', 'bank name', 'issuer', 'banking institution'], 11);
  const rawLast4 = getColValue(rowCells, colMap, ['last 4', 'last4', 'card last 4', 'card last4', 'account last 4'], 12);
  const rawRefId = getColValue(rowCells, colMap, ['reference id', 'reference', 'ref id', 'utr', 'rrn', 'ref number'], 13);
  const rawNature = getColValue(rowCells, colMap, ['nature', 'nature of spend', 'expense nature', 'spend nature', 'classification'], 14);
  const rawConfidence = getColValue(rowCells, colMap, ['confidence', 'confidence score', 'ai confidence', 'score'], 15);
  const rawCurrency = getColValue(rowCells, colMap, ['currency', 'curr', 'ccy'], 16);
  const rawStatus = getColValue(rowCells, colMap, ['status', 'state', 'tx status', 'txn status'], 17);
  const rawReviewFlag = getColValue(rowCells, colMap, ['review flag', 'review', 'flag', 'needs review', 'audit flag'], 18);
  const rawReviewReason = getColValue(rowCells, colMap, ['review reason', 'reason', 'flag reason', 'audit reason'], 19);
  const rawLinkedBillId = getColValue(rowCells, colMap, ['linked bill id', 'linked bill', 'bill id', 'bill link', 'statement id'], 20);
  const rawParserVersion = getColValue(rowCells, colMap, ['parser version', 'parser', 'version', 'engine'], 21);
  const rawPaymentApp = getColValue(rowCells, colMap, ['payment app', 'app', 'upi app', 'wallet app'], 22);
  const rawCardNetwork = getColValue(rowCells, colMap, ['card network', 'network', 'scheme', 'card scheme'], 23);

  // Clean amount: strip ₹, commas, spaces
  const cleanAmountNum = Math.abs(parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0);
  const isCredit = rawType.includes('credit') || rawType.includes('deposit') || rawType.includes('income') || rawType.includes('refund') || rawType.includes('cashback');
  const type = isCredit ? 'credit' : 'debit';
  const time = formatTimeTo12Hour(rawTime);
  const merchant = rawMerchant.trim() || 'Transaction';
  const date = normalizeSheetDate(rawDate);
  // Deterministic ID generation to ensure approvals and annotations persist across live fetches
  const cleanMerchantSlug = merchant.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'txn';
  const stableToken = value => String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
  const id = rawTxId ? `sheet_tx_${stableToken(rawTxId)}` : (rawRefId ? `sheet_ref_${stableToken(rawRefId)}` : `sheet_row_${index}_${date}_${cleanAmountNum}_${cleanMerchantSlug}`);

  // Clean card last 4 (strictly digits, maximum 4 characters, never guessed)
  const cleanLast4 = rawLast4 ? String(rawLast4).replace(/\D/g, '').slice(-4) : '';

  // Compute realistic timestamp from parsed date
  const parsedDateObj = new Date(date + 'T12:00:00');
  const createdAt = !isNaN(parsedDateObj.getTime()) ? parsedDateObj.getTime() : (Date.now() - index * 60000);

  return {
    id,
    transactionId: rawTxId.trim(),
    referenceId: rawRefId.trim() || rawTxId.trim() || '',
    date,
    time: time || '12:00 PM',
    type,
    amount: cleanAmountNum,
    category: rawCategory.trim() || 'General',
    paymentMethod: rawMethod.trim() || 'UPI',
    cardOrAccount: rawAccount.trim() || '',
    merchant,
    displaySub: rawAccount ? `${merchant.toLowerCase()} (${rawAccount.toLowerCase()})` : merchant.toLowerCase(),
    source: rawSource.trim() || 'Google Sheet',
    rawMessage: rawMessage.trim(),
    bank: rawBank.trim(),
    cardLast4: cleanLast4,
    nature: rawNature.trim(),
    confidence: rawConfidence.trim(),
    currency: rawCurrency.trim() || 'INR',
    status: rawStatus.trim() || 'Completed',
    reviewFlag: rawReviewFlag.trim(),
    reviewReason: rawReviewReason.trim(),
    linkedBillId: rawLinkedBillId.trim(),
    parserVersion: rawParserVersion.trim(),
    paymentApp: rawPaymentApp.trim(),
    cardNetwork: rawCardNetwork.trim(),
    isGoogleSheet: true,
    sheetName: 'Transactions',
    sheetRowNumber: index + 2,
    createdAt,
  };
}

function sortSheetTransactions(transactions = []) {
  return [...transactions].sort((a, b) => {
    const dateOrder = String(b?.date || '').localeCompare(String(a?.date || ''));
    if (dateOrder !== 0) return dateOrder;
    const createdOrder = Number(b?.createdAt || 0) - Number(a?.createdAt || 0);
    if (createdOrder !== 0) return createdOrder;
    return Number(b?.sheetRowNumber || 0) - Number(a?.sheetRowNumber || 0);
  });
}

/**
 * Fetch real-time transactions from Google Sheets gviz query endpoint
 */
export async function fetchGoogleSheetTransactions(forceRefresh = false) {
  if (!forceRefresh && sheetFetchInFlight) return sheetFetchInFlight;

  const request = (async () => {
    try {
    const cacheBust = Date.now();
    const res = await fetch(buildGoogleSheetQueryUrl(cacheBust), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Google Sheet request failed: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    // Extract JSON from google.visualization.Query.setResponse({...})
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Invalid Google Sheet response format');
    }

    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    if (parsed.status !== 'ok' || !parsed.table) {
      throw new Error(parsed.errors ? parsed.errors[0]?.message : 'Google Sheet returned non-OK status');
    }

    const rows = parsed.table.rows || [];
    const tableCols = parsed.table.cols || [];
    if (rows.length === 0) {
      return { transactions: [], lastSync: new Date().toISOString(), rowCount: 0, success: true };
    }

    // Check if first row is header
    let startIndex = 0;
    const firstRowCells = rows[0]?.c || [];
    const firstRowFirstCol = getCellValue(firstRowCells[0]).toLowerCase();
    const hasHeaderRow = firstRowFirstCol === 'date' || firstRowFirstCol === 'timestamp' || firstRowFirstCol === 'time';
    if (hasHeaderRow) {
      startIndex = 1;
    }

    const colMap = buildColumnIndexMap(tableCols, hasHeaderRow ? firstRowCells : null);

    const transactions = [];
    for (let i = startIndex; i < rows.length; i++) {
      const cells = rows[i]?.c || [];
      // Skip completely blank rows
      const hasAnyValue = cells.some(c => c && (c.v !== null || c.f !== null));
      if (!hasAnyValue) continue;

      const tx = normalizeSheetRow(cells, i, colMap);
      transactions.push(tx);
    }

    const sortedTransactions = sortSheetTransactions(transactions);

    // Save cache and sync timestamp
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(sortedTransactions));
      localStorage.setItem(LAST_SYNC_KEY, nowIso);
    } catch (e) {
      console.warn('Failed to cache sheet transactions', e);
    }

    return {
      transactions: sortedTransactions,
      lastSync: nowIso,
      rowCount: sortedTransactions.length,
      latestTransactionDate: sortedTransactions[0]?.date || null,
      success: true
    };
  } catch (error) {
    console.error('Error fetching Google Sheet transactions:', error);
    // Return cached transactions if available
    const cached = getCachedSheetTransactions();
    return {
      transactions: cached.transactions,
      lastSync: cached.lastSync,
      error: error.message,
      isFallback: true,
      success: false
    };
    }
  })();

  sheetFetchInFlight = request;
  try {
    return await request;
  } finally {
    if (sheetFetchInFlight === request) sheetFetchInFlight = null;
  }
}

function parseGvizResponse(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Invalid Google Sheet response format');
  const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  if (parsed.status !== 'ok' || !parsed.table) {
    throw new Error(parsed.errors?.[0]?.message || 'Google Sheet returned non-OK status');
  }
  return parsed.table;
}

function tableToRecords(table, sheetName) {
  const rows = table.rows || [];
  const cols = table.cols || [];
  if (!rows.length) return [];
  const firstCells = rows[0]?.c || [];
  const expectedFirst = String(FINANCE_SHEET_SCHEMAS[sheetName]?.[0] || '').toLowerCase();
  const firstValue = getCellValue(firstCells[0]).toLowerCase();
  const hasHeader = Boolean(firstValue) && (firstValue === expectedFirst || firstValue === 'date');
  const headers = hasHeader
    ? firstCells.map(getCellValue)
    : cols.map((col, index) => String(col?.label || col?.id || FINANCE_SHEET_SCHEMAS[sheetName]?.[index] || `Column ${index + 1}`).trim());
  return rows.slice(hasHeader ? 1 : 0).map((row, index) => {
    const values = row?.c || [];
    if (!values.some(cell => getCellValue(cell) !== '')) return null;
    const fields = {};
    headers.forEach((header, colIndex) => {
      if (header) fields[header] = getCellValue(values[colIndex]);
    });
    const idHeader = FINANCE_SHEET_SCHEMAS[sheetName]?.[0];
    return {
      id: fields[idHeader] || `${sheetName.toLowerCase()}-${index + 2}`,
      sheetName,
      sheetRowNumber: index + 2,
      fields,
    };
  }).filter(Boolean);
}

/** Fetches any finance tab without mutating formula-driven cells. */
export async function fetchGoogleSheetTab(sheetName, forceRefresh = false) {
  if (!FINANCE_SHEET_TABS.includes(sheetName)) throw new Error(`Unsupported Sheet tab: ${sheetName}`);
  const response = await fetch(buildGoogleSheetQueryUrl(forceRefresh ? Date.now() : Math.floor(Date.now() / 5000), sheetName), {
    method: 'GET',
    headers: { Accept: 'application/json, text/plain, */*', 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`${sheetName} request failed: ${response.status}`);
  const table = parseGvizResponse(await response.text());
  return { sheetName, records: tableToRecords(table, sheetName), success: true };
}

function normalizeBillRecord(record) {
  const f = record.fields || {};
  const amount = value => Math.abs(parseFloat(String(value || '').replace(/[^0-9.-]+/g, '')) || 0);
  return {
    ...record,
    billId: f['Bill ID'] || record.id,
    issuer: f['Issuer / Biller'] || 'Bill',
    billType: f['Bill Type'] || 'Bill',
    dueDate: normalizeSheetDate(f['Due Date']),
    billAmount: amount(f['Bill Amount']),
    minimumDue: amount(f['Minimum Due']),
    paidAmount: amount(f['Paid Amount']),
    balanceDue: amount(f['Balance Due']),
    status: f.Status || 'Open',
    paidAt: f['Paid At'] || '',
    updatedAt: f['Updated At'] || '',
  };
}

/** Reads all workbook tabs as one consistent snapshot for the Sheet workspace. */
export async function fetchGoogleFinanceWorkbook(forceRefresh = false) {
  const transactionResult = await fetchGoogleSheetTransactions(forceRefresh);
  const secondaryTabs = await Promise.all(FINANCE_SHEET_TABS.slice(1).map(async sheetName => {
    try { return await fetchGoogleSheetTab(sheetName, forceRefresh); }
    catch (error) { return { sheetName, records: [], success: false, error: error.message }; }
  }));
  const tabs = Object.fromEntries(secondaryTabs.map(result => [result.sheetName, result.records || []]));
  const result = {
    ...transactionResult,
    tabs,
    bills: (tabs.Bills || []).map(normalizeBillRecord),
    alerts: tabs.Alerts || [],
    rules: tabs.Rules || [],
    dashboard: tabs.Dashboard || [],
    calcData: tabs.Calc_Data || [],
  };
  try { localStorage.setItem('kredo_google_finance_workbook_v1', JSON.stringify(result)); } catch {}
  return result;
}

export async function syncGoogleSheetRecord(payload) {
  try {
    const response = await fetch(KREDO_SHEET_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ spreadsheetId: GOOGLE_SHEET_ID, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) throw new Error(result.error || `Sheet write-back failed (${response.status})`);
    return result;
  } catch (error) {
    return { success: false, pending: true, error: error?.message || 'Sheet write-back failed' };
  }
}

export function markGoogleSheetBillPaid(bill, paidAmount, paidVia = '') {
  return syncGoogleSheetRecord({
    action: 'markBillPaid', sheetName: 'Bills', recordId: bill.billId || bill.id,
    paidAmount: Number(paidAmount || bill.balanceDue || bill.billAmount || 0), paidVia,
  });
}

export function updateGoogleSheetRecord(sheetName, recordId, updates, referenceId = '') {
  return syncGoogleSheetRecord({ action: 'updateRecord', sheetName, recordId, referenceId, updates });
}

export function createGoogleSheetRule(fields) {
  return syncGoogleSheetRecord({ action: 'createRule', sheetName: 'Rules', fields });
}

/**
 * Writes approval state back to the Google Sheet by stable transaction identity.
 * The server verifies the Apps Script response before this is considered synced.
 */
export async function syncGoogleSheetApproval(transaction, approved = true, notes = '') {
  if (!transaction || (!transaction.transactionId && !transaction.referenceId && !transaction.id)) {
    return { success: false, error: 'Transaction identity is missing' };
  }

  try {
    return await syncGoogleSheetRecord({
        action: 'updateReviewStatus',
        sheetName: 'Transactions',
        transactionId: transaction.transactionId || '',
        referenceId: transaction.referenceId || '',
        appTransactionId: transaction.id || '',
        approved: Boolean(approved),
        reviewFlag: approved ? 'Approved' : 'Yes',
        reviewReason: notes || (approved ? 'Approved in Memoir KREDO' : 'Approval removed in Memoir KREDO'),
      });
  } catch (error) {
    return { success: false, error: error?.message || 'Sheet write-back failed' };
  }
}

/**
 * Retrieve cached transactions from localStorage
 */
export function getCachedSheetTransactions() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || null;
    return {
      transactions: raw ? JSON.parse(raw) : [],
      lastSync
    };
  } catch {
    return { transactions: [], lastSync: null };
  }
}

// Real-time polling & subscribers
const sheetSubscribers = new Set();
let sheetPollingInterval = null;

export function subscribeToSheetUpdates(callback) {
  if (typeof callback === 'function') {
    sheetSubscribers.add(callback);
    // Immediately notify with current cache
    const cached = getCachedSheetTransactions();
    if (cached.transactions && cached.transactions.length > 0) {
      try { callback(cached); } catch(e) {}
    }
  }
  return () => {
    sheetSubscribers.delete(callback);
  };
}

export function notifySheetSubscribers(data) {
  sheetSubscribers.forEach(cb => {
    try { cb(data); } catch (e) { console.warn('Sheet subscriber error:', e); }
  });
}

export function startSheetRealtimePolling(intervalMs = 15000) {
  if (sheetPollingInterval) return;
  sheetPollingInterval = setInterval(async () => {
    const result = await fetchGoogleFinanceWorkbook();
    if (result.success) {
      notifySheetSubscribers(result);
    }
  }, intervalMs);
}

export function stopSheetRealtimePolling() {
  if (sheetPollingInterval) {
    clearInterval(sheetPollingInterval);
    sheetPollingInterval = null;
  }
}
