/**
 * KREDO — Real-Time Google Sheet Integration Service
 * Fetches transaction rows in real-time directly from Google Sheets via the Visualization Query endpoint.
 * URL: https://docs.google.com/spreadsheets/d/1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0/gviz/tq?tqx=out:json
 */

export const GOOGLE_SHEET_ID = '1wWqq4SBsNp4B1CDPFR-yo3VDyriDawrdM55TfoF3AG0';
export const GOOGLE_SHEET_WEBAPP_DEPLOYMENT_ID = 'AKfycbyySoeJz7k9gwJN9_gM7zOS5Q73bSQmHEscWQR3dQD9y97i5infseMFDl23rZXYBdZoEg';
export const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit?usp=sharing`;
export const GVIZ_QUERY_ENDPOINT = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;

const CACHE_KEY = 'kredo_google_sheet_cache_v1';
const LAST_SYNC_KEY = 'kredo_google_sheet_last_sync_v1';

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
  const id = rawTxId ? `sheet_tx_${rawTxId.trim()}` : (rawRefId ? `sheet_ref_${rawRefId.trim()}` : `sheet_row_${index}_${date}_${cleanAmountNum}_${cleanMerchantSlug}`);

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
    createdAt,
  };
}

/**
 * Fetch real-time transactions from Google Sheets gviz query endpoint
 */
export async function fetchGoogleSheetTransactions() {
  try {
    const res = await fetch(GVIZ_QUERY_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
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
      return { transactions: [], lastSync: new Date().toISOString() };
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

    // Save cache and sync timestamp
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(transactions));
      localStorage.setItem(LAST_SYNC_KEY, nowIso);
    } catch (e) {
      console.warn('Failed to cache sheet transactions', e);
    }

    return {
      transactions,
      lastSync: nowIso,
      rowCount: transactions.length,
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
    const result = await fetchGoogleSheetTransactions();
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

