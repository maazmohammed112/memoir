import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const mockStorage = new Map();
  globalThis.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  };
}

import {
  scoreTransactionMatch,
  findPendingReconciliationMatches,
  mergeTransactions,
  unmergeTransactions,
  isUndoAvailable,
  getUndoRemainingSeconds,
  formatRemainingTime,
  dismissMatch,
  buildUnifiedReconciledTransactionList,
  getSheetApprovals,
  setSheetApproval,
  batchSetSheetApprovals,
  decorateTransactionsWithApprovals,
  setSheetApprovalSyncState,
  RECONCILIATION_DATE_THRESHOLD,
  UNDO_WINDOW_SECONDS,
} from '../src/kredo/kredoReconciliation.js';

import {
  getMerchantAnnotations,
  getMerchantAnnotation,
  setMerchantAnnotation,
  removeMerchantAnnotation,
  resolveTransactionAnnotation,
  attachAnnotationsToTransactions,
} from '../src/kredo/kredoAnnotations.js';

import {
  resolveFinancialStatus,
  filterTransactions,
} from '../src/kredo/kredoAnalytics.js';

import {
  buildGoogleSheetQueryUrl,
  fetchGoogleSheetTransactions,
  syncGoogleSheetApproval,
} from '../src/kredo/kredoSheetService.js';
import kredoSheetHandler from '../api/kredo-sheet.js';

console.log('🧪 Running KREDO Smart Reconciliation & Annotation Suite...\n');

// ----------------------------------------------------------------------------
// 1. DATE THRESHOLD CONSTRAINT: August 31, 2026 onwards
// ----------------------------------------------------------------------------
assert.equal(RECONCILIATION_DATE_THRESHOLD, '2026-08-31', 'Reconciliation start threshold must be 2026-08-31');

const emailTxOld = {
  id: 'tx_old_email',
  date: '2026-08-15',
  amount: 450,
  merchant: 'Swiggy',
  type: 'debit',
  paymentMethod: 'UPI',
  source: 'Email Vault',
};

const sheetTxOld = {
  id: 'tx_old_sheet',
  date: '2026-08-15',
  amount: 450,
  merchant: 'Swiggy',
  type: 'debit',
  paymentMethod: 'UPI',
  source: 'Google Sheet',
};

const matchesOld = findPendingReconciliationMatches([emailTxOld], [sheetTxOld]);
assert.equal(matchesOld.length, 0, 'Transactions prior to August 31, 2026 must NOT be suggested for cross-stream reconciliation');
console.log('✓ Threshold constraint passed: transactions before Aug 31, 2026 excluded.');

// ----------------------------------------------------------------------------
// 2. MULTI-FACTOR SCORING & CANDIDATE MATCHING (Aug 31+ transactions)
// ----------------------------------------------------------------------------
const emailTxAug31 = {
  id: 'tx_email_aug31',
  date: '2026-08-31',
  amount: 499,
  merchant: 'Swiggy Instamart',
  type: 'debit',
  paymentMethod: 'UPI',
  referenceId: 'UPI/6241098231',
  cardLast4: '4028',
  source: 'Email Vault',
};

const sheetTxSep01 = {
  id: 'tx_sheet_sep01',
  date: '2026-09-01',
  amount: 499,
  merchant: 'Swiggy',
  type: 'debit',
  paymentMethod: 'UPI',
  referenceId: 'UPI/6241098231',
  cardLast4: '4028',
  source: 'Google Sheet',
  reviewFlag: 'Check Bill',
};

const scoreResult = scoreTransactionMatch(emailTxAug31, sheetTxSep01);
assert.ok(scoreResult.isMatch, 'Identical amount, reference ID, and merchant should be flagged as match');
assert.ok(scoreResult.confidence >= 90, 'Confidence score should be 90% or higher');
assert.ok(scoreResult.reasons.length >= 2, 'Should provide clear reasons for match');
console.log(`✓ Multi-factor scoring passed: ${scoreResult.confidence}% confidence with reasons: ${scoreResult.reasons.join(', ')}`);

const matches = findPendingReconciliationMatches([emailTxAug31], [sheetTxSep01]);
assert.equal(matches.length, 1, 'Should find 1 pending reconciliation candidate pair');
assert.equal(matches[0].emailTx.id, 'tx_email_aug31');
assert.equal(matches[0].sheetTx.id, 'tx_sheet_sep01');
console.log('✓ Candidate pair detection verified from Aug 31, 2026 onwards.');

// ----------------------------------------------------------------------------
// 3. 1-CLICK SIDE-BY-SIDE MERGE & 5-MINUTE UNDO COUNTDOWN
// ----------------------------------------------------------------------------
const mergeResult = mergeTransactions(emailTxAug31, sheetTxSep01, scoreResult.confidence);
assert.ok(mergeResult.mergeId, 'Merge operation should generate unique mergeId');
assert.equal(mergeResult.unifiedTx.amount, 499);
assert.equal(mergeResult.unifiedTx.isMerged, true);
assert.equal(mergeResult.unifiedTx.merchant, 'Swiggy Instamart');

assert.equal(isUndoAvailable(mergeResult), true, 'Undo must be available immediately after merge');
const remainingSec = getUndoRemainingSeconds(mergeResult);
assert.ok(remainingSec > 290 && remainingSec <= 300, `Remaining seconds should be ~300s (was ${remainingSec}s)`);
assert.ok(formatRemainingTime(remainingSec).includes(':'), 'formatRemainingTime should output MM:SS');
console.log(`✓ 1-click merge passed: unified transaction created, 5-minute undo timer active (${formatRemainingTime(remainingSec)}).`);

// Unified stream deduplication test
const unifiedList = buildUnifiedReconciledTransactionList([emailTxAug31], [sheetTxSep01]);
assert.equal(unifiedList.length, 1, 'Unified reconciled stream should present exactly 1 deduplicated record instead of 2 duplicates');
assert.equal(unifiedList[0].id, mergeResult.unifiedTx.id);
console.log('✓ Unified stream deduplication verified: single record in unified pipeline.');

// ----------------------------------------------------------------------------
// 4. IMMEDIATE REVERSIBLE UNMERGE / UNDO TEST
// ----------------------------------------------------------------------------
const unmergeSuccess = unmergeTransactions(mergeResult.mergeId);
assert.ok(unmergeSuccess, 'unmergeTransactions should return unmerged record object');

const unifiedListAfterUnmerge = buildUnifiedReconciledTransactionList([emailTxAug31], [sheetTxSep01]);
assert.equal(unifiedListAfterUnmerge.length, 2, 'After unmerge, both individual transactions should reappear');
console.log('✓ Immediate unmerge / rollback passed: both independent records restored.');

// ----------------------------------------------------------------------------
// 5. GOOGLE SHEET FLAGGED & APPROVED STATUS PIPELINE
// ----------------------------------------------------------------------------
const unapprovedSheetTx = {
  id: 'sheet_tx_unapproved',
  date: '2026-09-01',
  amount: 1250,
  merchant: 'Zara Shopping',
  type: 'debit',
  paymentMethod: 'Credit Card',
  source: 'Google Sheet',
  reviewFlag: 'Pending Approval',
};

const initialStatus = resolveFinancialStatus(unapprovedSheetTx);
assert.equal(initialStatus.isFlagged, true);
assert.notEqual(initialStatus.tier, 'approved');

// User marks as Approved & verified
setSheetApproval({
  ...unapprovedSheetTx,
  transactionId: 'SHEET-TX-RELOAD-001',
  referenceId: 'SHEET-REF-RELOAD-001',
}, true, 'Approved & Synced to Insights');

const approvals = getSheetApprovals();
assert.ok(approvals['sheet_tx_unapproved']);
assert.equal(approvals['sheet_tx_unapproved'].approved, true);
assert.equal(approvals['SHEET-TX-RELOAD-001'].approved, true);
assert.equal(approvals['SHEET-REF-RELOAD-001'].approved, true);

const decoratedAfterReload = decorateTransactionsWithApprovals([{
  ...unapprovedSheetTx,
  id: 'sheet_tx_rehydrated_id',
  transactionId: 'SHEET-TX-RELOAD-001',
  referenceId: 'SHEET-REF-RELOAD-001',
}]);
assert.equal(decoratedAfterReload[0].isApproved, true, 'Approval must survive a fresh Sheet row object after reload');
assert.equal(decoratedAfterReload[0].reviewFlag, 'Approved', 'Reloaded Sheet row must not fall back to amber');
setSheetApprovalSyncState({
  id: 'sheet_tx_rehydrated_id',
  transactionId: 'SHEET-TX-RELOAD-001',
  referenceId: 'SHEET-REF-RELOAD-001',
}, 'pending', 'Awaiting remote deployment');
const decoratedPendingSync = decorateTransactionsWithApprovals([{
  ...unapprovedSheetTx,
  id: 'sheet_tx_rehydrated_id',
  transactionId: 'SHEET-TX-RELOAD-001',
  referenceId: 'SHEET-REF-RELOAD-001',
}]);
assert.equal(decoratedPendingSync[0].approvalSyncState, 'pending');
assert.equal(decoratedPendingSync[0].approvalSyncError, 'Awaiting remote deployment');

const approvedSheetTx = {
  ...unapprovedSheetTx,
  isApproved: true,
  reviewFlag: 'Approved',
};

const approvedStatus = resolveFinancialStatus(approvedSheetTx);
assert.equal(approvedStatus.tier, 'approved');
assert.equal(approvedStatus.badgeLabel, 'APPROVED');
assert.equal(approvedStatus.outlineClass, 'kredo-status-outline-approved');
assert.equal(approvedStatus.isApproved, true);
console.log('✓ Approved status pipeline passed: green badge & outline resolved.');

// Filtering by Approved in Insights
const testPool = [
  approvedSheetTx,
  { id: 'tx_flagged', merchant: 'High spend', reviewFlag: 'Check Overdue' },
  { id: 'tx_clear', merchant: 'Normal' },
];

const approvedFiltered = filterTransactions(testPool, { reviewFlag: 'approved' });
assert.equal(approvedFiltered.length, 1);
assert.equal(approvedFiltered[0].id, 'sheet_tx_unapproved');

const flaggedFiltered = filterTransactions(testPool, { reviewFlag: 'flagged' });
assert.equal(flaggedFiltered.length, 1);
assert.equal(flaggedFiltered[0].id, 'tx_flagged');
console.log('✓ Insights review & approval filter passed: strictly isolates approved transactions.');

// Fresh GViz reads must be cache-busted, complete, newest-first, and write-back aware
const urlA = buildGoogleSheetQueryUrl(1001);
const urlB = buildGoogleSheetQueryUrl(1002);
assert.notEqual(urlA, urlB);
assert.ok(urlA.includes('sheet=Transactions'));
assert.ok(urlA.includes('headers=1'));

const originalFetch = globalThis.fetch;
let capturedSheetUrl = '';
const cols = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Payment Method', 'Merchant', 'Account', 'Source', 'Raw Message', 'Transaction ID']
  .map((label, index) => ({ id: String.fromCharCode(65 + index), label, type: 'string' }));
const gvizPayload = {
  status: 'ok',
  table: {
    cols,
    rows: [
      { c: [{ v: 'Date(2026,7,31)', f: '31-08-2026' }, { v: '23:21:03' }, { v: 'Debit' }, { v: 126 }, { v: 'Food' }, { v: 'Credit Card' }, { v: 'Axis Card' }, null, { v: 'Manual Entry' }, { v: 'old' }, { v: 'old-row' }] },
      { c: [{ v: 'Date(2026,8,1)', f: '01-09-2026' }, { v: '12:05:37' }, { v: 'Debit' }, { v: 30 }, { v: 'Other' }, { v: 'Credit Card UPI' }, { v: 'Kandhan' }, null, { v: 'iPhone SMS' }, { v: 'today' }, { v: 'today-row' }] },
    ],
  },
};
globalThis.fetch = async url => {
  capturedSheetUrl = String(url);
  return new Response(`google.visualization.Query.setResponse(${JSON.stringify(gvizPayload)});`, { status: 200 });
};
const liveResult = await fetchGoogleSheetTransactions(true);
assert.equal(liveResult.success, true);
assert.equal(liveResult.rowCount, 2);
assert.equal(liveResult.transactions[0].transactionId, 'today-row');
assert.equal(liveResult.latestTransactionDate, '2026-09-01');
assert.ok(capturedSheetUrl.includes('reqId'));
assert.ok(capturedSheetUrl.includes('_='));

let writebackBody = null;
globalThis.fetch = async (_url, options) => {
  writebackBody = JSON.parse(options.body);
  return new Response(JSON.stringify({ success: true, updated: true, updatedRows: 1 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const writebackResult = await syncGoogleSheetApproval(liveResult.transactions[0], true, 'Approved in test');
assert.equal(writebackResult.success, true);
assert.equal(writebackBody.transactionId, 'today-row');
assert.equal(writebackBody.reviewFlag, 'Approved');
globalThis.fetch = originalFetch;
console.log('✓ Fresh Sheet sync passed: cache-busted read includes today rows and ID-based approval write-back.');

const originalWritebackUrl = process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL;
const originalWritebackToken = process.env.KREDO_SHEET_WRITEBACK_TOKEN;
delete process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL;
delete process.env.KREDO_SHEET_WRITEBACK_TOKEN;
const createMockResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});
const pendingResponse = createMockResponse();
await kredoSheetHandler({
  method: 'POST',
  body: { action: 'updateReviewStatus', transactionId: 'today-row' },
}, pendingResponse);
assert.equal(pendingResponse.statusCode, 503);
assert.equal(pendingResponse.body.pending, true);

process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL = 'https://script.google.test/exec';
process.env.KREDO_SHEET_WRITEBACK_TOKEN = 'test-only-token';
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  assert.equal(body.transactionId, 'today-row');
  return new Response(JSON.stringify({ success: true, action: 'updateReviewStatus', updated: true, updatedRows: 1 }), { status: 200 });
};
const syncedResponse = createMockResponse();
await kredoSheetHandler({
  method: 'POST',
  body: { action: 'updateReviewStatus', transactionId: 'today-row', approved: true },
}, syncedResponse);
assert.equal(syncedResponse.statusCode, 200);
assert.equal(syncedResponse.body.updatedRows, 1);

let paidWriteback = null;
globalThis.fetch = async (_url, options) => {
  paidWriteback = JSON.parse(options.body);
  return new Response(JSON.stringify({ success: true, action: 'markBillPaid', updated: true, updatedRows: 1 }), { status: 200 });
};
const paidResponse = createMockResponse();
await kredoSheetHandler({
  method: 'POST',
  body: { action: 'markBillPaid', sheetName: 'Bills', recordId: 'bill-lazypay-1', paidAmount: 1251.37, paidVia: 'UPI' },
}, paidResponse);
assert.equal(paidResponse.statusCode, 200);
assert.equal(paidWriteback.recordId, 'bill-lazypay-1');
assert.equal(paidWriteback.paidAmount, 1251.37);
assert.equal(paidWriteback.paidVia, 'UPI');
globalThis.fetch = originalFetch;
if (originalWritebackUrl === undefined) delete process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL;
else process.env.KREDO_SHEET_APPROVAL_WEBAPP_URL = originalWritebackUrl;
if (originalWritebackToken === undefined) delete process.env.KREDO_SHEET_WRITEBACK_TOKEN;
else process.env.KREDO_SHEET_WRITEBACK_TOKEN = originalWritebackToken;
console.log('✓ Approval API passed: unconfigured deployments fail safely and verified Apps Script updates succeed.');
console.log('✓ Bill payment API passed: stable Bill ID, paid amount, and payment method reach Apps Script safely.');

// ----------------------------------------------------------------------------
// 6. SMART MERCHANT ANNOTATION & AUTO-MEMORY ENGINE
// ----------------------------------------------------------------------------
// User annotates "Blinkit" as "chips"
setMerchantAnnotation('Blinkit', 'chips');

const annotation = getMerchantAnnotation('Blinkit');
assert.equal(annotation, 'chips');

// Exact & Fuzzy Merchant Tag Resolution
const txBlinkit1 = { id: 'bk_1', merchant: 'Blinkit', amount: 150 };
const txBlinkit2 = { id: 'bk_2', merchant: 'Blinkit Quick Commerce Ltd', amount: 220 };
const txSwiggy = { id: 'sw_1', merchant: 'Swiggy', amount: 350 };

const decoratedList = attachAnnotationsToTransactions([txBlinkit1, txBlinkit2, txSwiggy]);
assert.equal(decoratedList[0].annotation, 'chips', 'Exact merchant name should be annotated as "chips"');
assert.equal(decoratedList[1].annotation, 'chips', 'Fuzzy variant "Blinkit Quick Commerce" should inherit "chips"');
assert.equal(decoratedList[2].annotation, '', 'Unrelated merchant should not have annotation');
console.log('✓ Smart Merchant Annotation passed: auto-applies tag to existing & future merchant transactions.');

// Clean up rule
removeMerchantAnnotation('Blinkit');
const cleanedAnnotations = getMerchantAnnotations();
assert.equal(cleanedAnnotations['Blinkit'], undefined);
console.log('✓ Merchant annotation removal rule verified.');

console.log('\n🎉 ALL RECONCILIATION, ANNOTATION & APPROVAL TESTS PASSED WITH 100% SUCCESS!\n');
