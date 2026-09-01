/**
 * KREDO — Smart Intelligence Cross-Stream Reconciliation Agent
 * Detects identical/duplicate transactions between Email Vault and Live Google Sheet
 * from August 31, 2026 onwards, supports 1-click side-by-side merging, and provides
 * a 5-minute countdown undo/unmerge mechanism.
 */

export const RECONCILIATION_DATE_THRESHOLD = '2026-08-31';
const RECONCILIATION_STORE_KEY = 'kredo_reconciliation_store_v1';
const DISMISSED_MATCHES_KEY = 'kredo_dismissed_matches_v1';
const SHEET_APPROVALS_KEY = 'kredo_sheet_approvals_v1';
export const UNDO_WINDOW_SECONDS = 300; // 5 minutes

/**
 * Checks if a transaction date is on or after the reconciliation threshold (2026-08-31)
 */
export function isReconciliationEligibleDate(dateStr) {
  if (!dateStr) return false;
  const str = String(dateStr).trim().slice(0, 10);
  return str >= RECONCILIATION_DATE_THRESHOLD;
}

/**
 * Normalizes merchant tokens for similarity matching
 */
export function extractMerchantTokens(merchant = '') {
  return String(merchant || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['pvt', 'ltd', 'limited', 'india', 'store', 'online', 'pay', 'payment', 'in'].includes(t));
}

/**
 * Calculates merchant name token similarity (0.0 to 1.0)
 */
export function calculateMerchantSimilarity(nameA = '', nameB = '') {
  const cleanA = String(nameA).toLowerCase().trim();
  const cleanB = String(nameB).toLowerCase().trim();

  if (!cleanA || !cleanB) return 0;
  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.9;

  const tokensA = extractMerchantTokens(nameA);
  const tokensB = extractMerchantTokens(nameB);

  if (!tokensA.length || !tokensB.length) return 0;

  let common = 0;
  for (const tA of tokensA) {
    if (tokensB.some(tB => tB.includes(tA) || tA.includes(tB))) {
      common++;
    }
  }

  return common / Math.max(tokensA.length, tokensB.length);
}

/**
 * Calculates date proximity in calendar days
 */
export function getDateDifferenceInDays(dateA, dateB) {
  if (!dateA || !dateB) return 999;
  const d1 = new Date(String(dateA).slice(0, 10) + 'T00:00:00');
  const d2 = new Date(String(dateB).slice(0, 10) + 'T00:00:00');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes multi-factor match score between an Email transaction and a Google Sheet transaction
 * @returns {{ score: number, confidence: number, reasons: string[], isMatch: boolean }}
 */
export function scoreTransactionMatch(emailTx, sheetTx) {
  if (!emailTx || !sheetTx) {
    return { score: 0, confidence: 0, reasons: [], isMatch: false };
  }

  // Strict Date Threshold: Must be >= 2026-08-31
  if (!isReconciliationEligibleDate(emailTx.date) || !isReconciliationEligibleDate(sheetTx.date)) {
    return { score: 0, confidence: 0, reasons: ['Before Aug 31, 2026 threshold'], isMatch: false };
  }

  let totalScore = 0;
  const maxScore = 120;
  const reasons = [];

  // 1. Amount Match (Up to 40 pts)
  const amtEmail = Number(emailTx.amount || 0);
  const amtSheet = Number(sheetTx.amount || 0);
  const amtDiff = Math.abs(amtEmail - amtSheet);

  if (amtDiff === 0 && amtEmail > 0) {
    totalScore += 40;
    reasons.push(`Exact amount match (₹${amtEmail})`);
  } else if (amtDiff <= 1.0 && amtEmail > 0) {
    totalScore += 35;
    reasons.push(`Near-exact amount match (±₹${amtDiff.toFixed(2)})`);
  } else {
    // If amounts differ substantially, cannot be a duplicate
    return { score: 0, confidence: 0, reasons: ['Amount mismatch'], isMatch: false };
  }

  // 2. Type Match (Debit vs Credit)
  if (emailTx.type && sheetTx.type && emailTx.type !== sheetTx.type) {
    return { score: 0, confidence: 0, reasons: ['Transaction type mismatch'], isMatch: false };
  }

  // 3. Date Proximity (Up to 30 pts)
  const dayDiff = getDateDifferenceInDays(emailTx.date, sheetTx.date);
  if (dayDiff === 0) {
    totalScore += 30;
    reasons.push('Identical transaction date');
  } else if (dayDiff === 1) {
    totalScore += 20;
    reasons.push('1-day settlement buffer match');
  } else if (dayDiff === 2) {
    totalScore += 10;
    reasons.push('2-day bank clearing buffer match');
  } else {
    // Too far apart (> 2 days)
    return { score: 0, confidence: 0, reasons: ['Date delta > 2 days'], isMatch: false };
  }

  // 4. Merchant Token Similarity (Up to 25 pts)
  const mSim = calculateMerchantSimilarity(emailTx.merchant, sheetTx.merchant);
  if (mSim >= 0.8) {
    totalScore += 25;
    reasons.push(`Merchant match: "${emailTx.merchant}" ≈ "${sheetTx.merchant}"`);
  } else if (mSim >= 0.4) {
    totalScore += 15;
    reasons.push(`Partial merchant match: "${emailTx.merchant}" ~ "${sheetTx.merchant}"`);
  }

  // 5. Account / Card Last 4 / Bank Match (Up to 15 pts)
  const last4Email = String(emailTx.cardLast4 || '').replace(/\D/g, '').slice(-4);
  const last4Sheet = String(sheetTx.cardLast4 || '').replace(/\D/g, '').slice(-4);

  if (last4Email && last4Sheet && last4Email === last4Sheet) {
    totalScore += 15;
    reasons.push(`Matching card last 4 digits (••${last4Email})`);
  } else if (emailTx.bank && sheetTx.bank && String(emailTx.bank).toLowerCase() === String(sheetTx.bank).toLowerCase()) {
    totalScore += 8;
    reasons.push(`Matching bank institution (${emailTx.bank})`);
  }

  // 6. Reference ID Match (Up to 20 pts bonus)
  const refEmail = String(emailTx.referenceId || emailTx.transactionId || '').trim().toLowerCase();
  const refSheet = String(sheetTx.referenceId || sheetTx.transactionId || '').trim().toLowerCase();
  if (refEmail && refSheet && (refEmail === refSheet || refEmail.includes(refSheet) || refSheet.includes(refEmail))) {
    totalScore += 20;
    reasons.push(`Matching Reference/UTR ID (${emailTx.referenceId || emailTx.transactionId})`);
  }

  const confidence = Math.min(100, Math.round((totalScore / maxScore) * 100));
  const isMatch = confidence >= 60;

  return {
    score: totalScore,
    confidence,
    reasons,
    isMatch,
  };
}

/**
 * Storage Helpers for Merged Records & Dismissals
 */
export function getReconciliationStore() {
  try {
    const raw = localStorage.getItem(RECONCILIATION_STORE_KEY);
    return raw ? JSON.parse(raw) : { mergedRecords: [] };
  } catch (e) {
    console.warn('Failed to load reconciliation store:', e);
    return { mergedRecords: [] };
  }
}

export function saveReconciliationStore(data) {
  try {
    localStorage.setItem(RECONCILIATION_STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save reconciliation store:', e);
  }
}

export function getDismissedMatches() {
  try {
    const raw = localStorage.getItem(DISMISSED_MATCHES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDismissedMatches(set) {
  try {
    localStorage.setItem(DISMISSED_MATCHES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save dismissed matches:', e);
  }
}

/**
 * Google Sheet Approvals Store
 */
export function getSheetApprovals() {
  try {
    const raw = localStorage.getItem(SHEET_APPROVALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Checks if a transaction is approved across all possible keys/flags
 */
export function isTxApproved(tx, approvals = null) {
  if (!tx) return false;
  if (tx.isApproved === true) return true;
  const flag = String(tx.reviewFlag || '').trim().toLowerCase();
  const stat = String(tx.status || '').trim().toLowerCase();
  if (flag === 'approved' || flag === 'verified' || stat === 'approved' || stat === 'verified') return true;

  const current = approvals || getSheetApprovals();
  if (tx.id && current[tx.id] && current[tx.id].approved) return true;
  if (tx.referenceId && current[tx.referenceId] && current[tx.referenceId].approved) return true;
  if (tx.transactionId && current[tx.transactionId] && current[tx.transactionId].approved) return true;
  return false;
}

/**
 * Decorates a list of transactions with persistent approval states
 */
export function decorateTransactionsWithApprovals(transactions = []) {
  const currentApprovals = getSheetApprovals();
  return transactions.map(tx => {
    if (!tx) return tx;
    if (isTxApproved(tx, currentApprovals)) {
      const approvalData = currentApprovals[tx.id] || (tx.referenceId && currentApprovals[tx.referenceId]) || (tx.transactionId && currentApprovals[tx.transactionId]) || {};
      return {
        ...tx,
        isApproved: true,
        reviewFlag: 'Approved',
        reviewReason: approvalData.notes || (tx.reviewFlag === 'Approved' && tx.reviewReason) || 'Verified & Approved',
      };
    }
    return tx;
  });
}

export function setSheetApproval(txOrId, approved = true, notes = '') {
  if (!txOrId) return;
  const current = getSheetApprovals();
  const now = Date.now();
  const approvalPayload = {
    approved: true,
    approvedAt: now,
    notes: notes || 'Verified and approved for Insights',
  };

  const id = typeof txOrId === 'object' ? txOrId.id : txOrId;
  const refId = typeof txOrId === 'object' ? txOrId.referenceId : null;
  const txnId = typeof txOrId === 'object' ? txOrId.transactionId : null;

  if (approved) {
    if (id) current[id] = approvalPayload;
    if (refId) current[refId] = approvalPayload;
    if (txnId) current[txnId] = approvalPayload;
  } else {
    if (id) delete current[id];
    if (refId) delete current[refId];
    if (txnId) delete current[txnId];
  }

  try {
    localStorage.setItem(SHEET_APPROVALS_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save sheet approval:', e);
  }
  return current;
}

export function batchSetSheetApprovals(txsOrIds = [], approved = true) {
  const current = getSheetApprovals();
  const now = Date.now();
  const approvalPayload = {
    approved: true,
    approvedAt: now,
    notes: 'Batch verified and approved for Insights',
  };

  txsOrIds.forEach(item => {
    const id = typeof item === 'object' ? item.id : item;
    const refId = typeof item === 'object' ? item.referenceId : null;
    const txnId = typeof item === 'object' ? item.transactionId : null;

    if (approved) {
      if (id) current[id] = approvalPayload;
      if (refId) current[refId] = approvalPayload;
      if (txnId) current[txnId] = approvalPayload;
    } else {
      if (id) delete current[id];
      if (refId) delete current[refId];
      if (txnId) delete current[txnId];
    }
  });

  try {
    localStorage.setItem(SHEET_APPROVALS_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save batch sheet approvals:', e);
  }
  return current;
}

/**
 * Finds all pending duplicate match suggestions between Email Vault transactions and Google Sheet transactions
 */
export function findPendingReconciliationMatches(emailTransactions = [], sheetTransactions = []) {
  const store = getReconciliationStore();
  const mergedEmailIds = new Set(store.mergedRecords.map(m => m.emailTxId));
  const mergedSheetIds = new Set(store.mergedRecords.map(m => m.sheetTxId));
  const dismissedSet = getDismissedMatches();

  const eligibleEmail = emailTransactions.filter(tx => isReconciliationEligibleDate(tx.date) && !mergedEmailIds.has(tx.id));
  const eligibleSheet = sheetTransactions.filter(tx => isReconciliationEligibleDate(tx.date) && !mergedSheetIds.has(tx.id));

  const matches = [];
  const matchedSheetIds = new Set();

  for (const emailTx of eligibleEmail) {
    let bestMatch = null;
    let highestScore = 0;

    for (const sheetTx of eligibleSheet) {
      if (matchedSheetIds.has(sheetTx.id)) continue;

      const pairKey = `${emailTx.id}##${sheetTx.id}`;
      if (dismissedSet.has(pairKey)) continue;

      const result = scoreTransactionMatch(emailTx, sheetTx);
      if (result.isMatch && result.score > highestScore) {
        highestScore = result.score;
        bestMatch = {
          emailTx,
          sheetTx,
          score: result.score,
          confidence: result.confidence,
          reasons: result.reasons,
          pairKey,
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      matchedSheetIds.add(bestMatch.sheetTx.id);
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Merges an Email transaction and a Google Sheet transaction into a single unified record
 */
export function mergeTransactions(emailTx, sheetTx, matchConfidence = 95) {
  if (!emailTx || !sheetTx) return null;

  const store = getReconciliationStore();
  const mergeId = `mrg_${emailTx.id}_${sheetTx.id}_${Date.now()}`;
  const mergedAt = Date.now();

  // Create Unified Transaction Record preserving the richest data across both
  const unifiedTx = {
    id: `unified_${emailTx.id}`,
    isMerged: true,
    mergeId,
    mergedAt,
    emailTxId: emailTx.id,
    sheetTxId: sheetTx.id,
    source: 'Unified (Email + Sheet)',
    date: emailTx.date || sheetTx.date,
    time: emailTx.time || sheetTx.time,
    amount: emailTx.amount || sheetTx.amount,
    type: emailTx.type || sheetTx.type || 'debit',
    merchant: emailTx.merchant || sheetTx.merchant,
    displaySub: `${(emailTx.merchant || sheetTx.merchant).toLowerCase()} (unified email + sheet)`,
    category: emailTx.category && emailTx.category !== 'General' ? emailTx.category : (sheetTx.category || 'General'),
    paymentMethod: emailTx.paymentMethod || sheetTx.paymentMethod || 'UPI',
    cardOrAccount: emailTx.cardOrAccount || sheetTx.cardOrAccount || '',
    bank: emailTx.bank || sheetTx.bank || '',
    cardLast4: emailTx.cardLast4 || sheetTx.cardLast4 || '',
    referenceId: emailTx.referenceId || sheetTx.referenceId || '',
    transactionId: emailTx.transactionId || sheetTx.transactionId || '',
    nature: emailTx.nature || sheetTx.nature || '',
    confidence: String(Math.max(Number(emailTx.confidence || 0), Number(sheetTx.confidence || 0), matchConfidence / 100)),
    currency: emailTx.currency || sheetTx.currency || 'INR',
    status: 'Completed',
    reviewFlag: 'Approved',
    reviewReason: `Reconciled & merged cross-stream (${matchConfidence}% match confidence)`,
    linkedBillId: emailTx.linkedBillId || sheetTx.linkedBillId || '',
    parserVersion: emailTx.parserVersion || sheetTx.parserVersion || 'v2.4',
    paymentApp: emailTx.paymentApp || sheetTx.paymentApp || '',
    cardNetwork: emailTx.cardNetwork || sheetTx.cardNetwork || '',
    notes: [emailTx.notes, sheetTx.notes].filter(Boolean).join(' | ') || 'Unified verified cross-stream expense',
    rawMessage: `Email: ${emailTx.rawMessage || 'N/A'}\nSheet: ${sheetTx.rawMessage || 'N/A'}`,
    createdAt: Math.max(emailTx.createdAt || 0, sheetTx.createdAt || 0, mergedAt),
  };

  const mergeRecord = {
    mergeId,
    mergedAt,
    emailTxId: emailTx.id,
    sheetTxId: sheetTx.id,
    emailTx,
    sheetTx,
    unifiedTx,
    confidence: matchConfidence,
  };

  store.mergedRecords.unshift(mergeRecord);
  saveReconciliationStore(store);

  return mergeRecord;
}

/**
 * 5-Minute Countdown Undo / Unmerge Mechanism
 */
export function getUndoRemainingSeconds(mergeRecord) {
  if (!mergeRecord || !mergeRecord.mergedAt) return 0;
  const elapsedSeconds = Math.floor((Date.now() - mergeRecord.mergedAt) / 1000);
  return Math.max(0, UNDO_WINDOW_SECONDS - elapsedSeconds);
}

export function isUndoAvailable(mergeRecord) {
  return getUndoRemainingSeconds(mergeRecord) > 0;
}

export function formatRemainingTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Unmerges a previously merged pair and restores them
 */
export function unmergeTransactions(mergeId) {
  const store = getReconciliationStore();
  const index = store.mergedRecords.findIndex(m => m.mergeId === mergeId);
  if (index === -1) return false;

  const [unmerged] = store.mergedRecords.splice(index, 1);
  saveReconciliationStore(store);
  return unmerged || true;
}

/**
 * Dismisses a match so it won't be suggested again
 */
export function dismissMatch(pairKey) {
  if (!pairKey) return;
  const dismissedSet = getDismissedMatches();
  dismissedSet.add(pairKey);
  saveDismissedMatches(dismissedSet);
}

/**
 * Builds a unified, deduplicated transaction list combining Email Vault, Google Sheet,
 * and active Merged records, preventing any duplicate counting in feeds or analytics.
 */
export function buildUnifiedReconciledTransactionList(emailTransactions = [], sheetTransactions = []) {
  const store = getReconciliationStore();
  const mergedEmailIds = new Set(store.mergedRecords.map(m => m.emailTxId));
  const mergedSheetIds = new Set(store.mergedRecords.map(m => m.sheetTxId));
  const sheetApprovals = getSheetApprovals();

  // Unified records from merge store
  const unifiedRecords = store.mergedRecords.map(m => m.unifiedTx);

  // Unmerged email records
  const unmergedEmail = emailTransactions.filter(tx => !mergedEmailIds.has(tx.id));

  // Unmerged sheet records decorated with approval status if approved
  const unmergedSheet = decorateTransactionsWithApprovals(
    sheetTransactions.filter(tx => !mergedSheetIds.has(tx.id))
  );

  return [...unifiedRecords, ...unmergedEmail, ...unmergedSheet].sort((a, b) => {
    const timeA = a.createdAt || Date.parse(`${a.date}T${a.time || '00:00:00'}`) || 0;
    const timeB = b.createdAt || Date.parse(`${b.date}T${b.time || '00:00:00'}`) || 0;
    return timeB - timeA;
  });
}
