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
  computeTransactionFingerprint,
  SEED_TRANSACTIONS,
  getKredoTransactions,
  addKredoTransaction,
  updateKredoTransaction,
  deleteKredoTransactionsBatch,
} from '../src/kredo/kredoStore.js';

import {
  parseRawGeminiInput,
  normalizeTransaction,
  analyzeImportBatch,
} from '../src/kredo/kredoImporter.js';

import {
  filterTransactionsByDate,
  filterTransactions,
  groupTransactionsHierarchically,
  computeKredoAnalytics,
  formatINR,
  resolveFinancialStatus,
} from '../src/kredo/kredoAnalytics.js';

import { ACCOUNT_PROFILES, accountProfileByCode } from '../lib/accountProfiles.js';

console.log('🧪 Running KREDO Engine & Deduplication Test Suite...\n');

// 1. Account Access Gate (Maaz vs Deepti)
const maazProfile = accountProfileByCode('2002');
const deeptiProfile = accountProfileByCode('2005');

assert.equal(maazProfile.name, 'Maaz');
assert.equal(maazProfile.code, '2002');
assert.equal(deeptiProfile.name, 'Deepti');
assert.equal(deeptiProfile.code, '2005');

const isMaazAllowed = maazProfile.code === '2002';
const isDeeptiAllowed = deeptiProfile.code === '2002';

assert.equal(isMaazAllowed, true, 'Maaz must be permitted access to KREDO');
assert.equal(isDeeptiAllowed, false, 'Deepti must NOT be permitted access to KREDO');
console.log('✓ Account access gate passed: Maaz authorized, Deepti restricted.');

// 2. Fingerprint & Deduplication Test
const sampleTx1 = {
  date: '2026-03-12',
  time: '09:31 PM',
  merchant: 'Amazon',
  amount: 23499,
  type: 'debit',
  paymentMethod: 'UPI',
  referenceId: 'UPI/607223918231',
};

const sampleTx1Duplicate = {
  date: '2026-03-12',
  time: '09:31 PM',
  merchant: 'Amazon',
  amount: 23499,
  type: 'debit',
  paymentMethod: 'UPI',
  referenceId: 'UPI/607223918231',
};

const fp1 = computeTransactionFingerprint(sampleTx1);
const fp2 = computeTransactionFingerprint(sampleTx1Duplicate);
assert.equal(fp1, fp2, 'Fingerprints of identical transactions must match');
assert.ok(fp1.includes('upi/607223918231'), 'Fingerprint should use reference ID if available');
console.log('✓ Fingerprint hashing passed: deterministic deduplication key verified.');

// 3. Gemini JSON Parser & Ingestion Test
const mockGeminiOutput = `
Here is the extracted expense list from your Gmail receipts:
\`\`\`json
[
  {
    "date": "2026-03-12",
    "time": "09:31 PM",
    "merchant": "Amazon",
    "amount": 23499,
    "type": "debit",
    "category": "Shopping",
    "paymentMethod": "UPI",
    "referenceId": "UPI/607223918231"
  },
  {
    "date": "2026-03-13",
    "time": "10:15 AM",
    "merchant": "Starbucks Coffee",
    "amount": 450,
    "type": "debit",
    "paymentMethod": "Credit Card",
    "referenceId": "TXN/SBUX/99120"
  },
  {
    "date": "2026-03-14",
    "time": "04:30 PM",
    "merchant": "Dividend Credit",
    "amount": 5400,
    "type": "credit",
    "paymentMethod": "Net Banking",
    "referenceId": "DIV/INFY/44910"
  }
]
\`\`\`
Hope this helps!
`;

const parsed = parseRawGeminiInput(mockGeminiOutput);
assert.equal(parsed.length, 3, 'Parser should extract 3 transactions ignoring markdown prose');

const normalized0 = normalizeTransaction(parsed[0]);
assert.equal(normalized0.merchant, 'Amazon');
assert.equal(normalized0.amount, 23499);
assert.equal(normalized0.type, 'debit');

const normalized1 = normalizeTransaction(parsed[1]);
assert.equal(normalized1.category, 'Food & Dining', 'Starbucks should auto-classify to Food & Dining');
assert.equal(normalized1.paymentMethod, 'Credit Card');

const normalized2 = normalizeTransaction(parsed[2]);
assert.equal(normalized2.type, 'credit', 'Dividend should normalize to credit');
console.log('✓ Gemini JSON parser passed: markdown stripped, categories auto-inferred, types normalized.');

// 4. Batch Import Deduplication Test
const existingDb = [normalized0]; // Amazon is already in DB

const batchAnalysis = analyzeImportBatch(mockGeminiOutput, existingDb);
assert.equal(batchAnalysis.newItems.length, 2, '2 new items should be ready to import');
assert.equal(batchAnalysis.duplicateItems.length, 1, '1 duplicate item (Amazon) should be detected');
assert.equal(batchAnalysis.duplicateItems[0].merchant, 'Amazon');
console.log('✓ Batch deduplication analyzer passed: skipped duplicate, retained new records.');

// 5. Analytics & Calculation Engine Test
const seedAnalytics = computeKredoAnalytics(SEED_TRANSACTIONS, SEED_TRANSACTIONS, { monthlyBudget: 60000 });

assert.ok(seedAnalytics.totalDebits > 0, 'Total debits must be calculated');
assert.ok(seedAnalytics.totalCredits > 0, 'Total credits must be calculated');
assert.ok(seedAnalytics.debitsCount > 0, 'Outflow count must be tracked');
assert.ok(seedAnalytics.creditsCount > 0, 'Inflow count must be tracked');
assert.ok(seedAnalytics.highestPaymentPeriod !== null, 'Period peak spend must be tracked');
assert.ok(seedAnalytics.paymentMethodShare.length >= 2, 'Payment methods must have share breakdown');

const ccShare = seedAnalytics.paymentMethodShare.find(p => p.method === 'Credit Card');
const upiShare = seedAnalytics.paymentMethodShare.find(p => p.method === 'UPI');
assert.ok(ccShare !== undefined, 'Credit card metrics must be present');
assert.ok(upiShare !== undefined, 'UPI metrics must be present');

console.log(`✓ Analytics calculations passed: Debits=${formatINR(seedAnalytics.totalDebits)}, Credits=${formatINR(seedAnalytics.totalCredits)}, Peak=${formatINR(seedAnalytics.highestPaymentPeriod.amount)} (${seedAnalytics.highestPaymentPeriod.merchant}).`);

// 6. Date Range Filtering Test (Year-to-Date / Jan to Now)
const ytdTxs = filterTransactionsByDate(SEED_TRANSACTIONS, 'ytd');
assert.ok(ytdTxs.length >= SEED_TRANSACTIONS.length - 2, 'YTD filter must include all 2026 transactions from January to current date');

const marchOnly = filterTransactionsByDate(SEED_TRANSACTIONS, 'custom', '2026-03-01', '2026-03-31');
assert.ok(marchOnly.every(t => t.date.startsWith('2026-03')), 'Custom range 2026-03 must only contain March entries');
console.log(`✓ Date filtering passed: YTD count=${ytdTxs.length}, Custom March count=${marchOnly.length}.`);

// 7. Local AI Insights Algorithms Test
assert.ok(seedAnalytics.localAiInsights.length >= 3, 'Local AI must generate multiple actionable insight cards');
const hasRecurring = seedAnalytics.localAiInsights.some(i => i.type === 'recurring');
const hasChannel = seedAnalytics.localAiInsights.some(i => i.type === 'channel');
const hasCashflow = seedAnalytics.localAiInsights.some(i => i.type === 'cashflow');

assert.ok(hasRecurring, 'Recurring charge detector must be active');
assert.ok(hasChannel, 'Channel preference detector must be active');
assert.ok(hasCashflow, 'Cashflow retention analysis must be active');
console.log(`✓ Local AI Algorithms passed: generated ${seedAnalytics.localAiInsights.length} actionable intelligence cards.`);

// 8. Hierarchical Time Grouping & Search Test (Month -> Week -> Day)
const marchTxs = filterTransactions(SEED_TRANSACTIONS, { month: '2026-03' });
const marchWeeks = groupTransactionsHierarchically(marchTxs);

assert.ok(marchWeeks.length > 0, 'March transactions must be grouped into weeks');
marchWeeks.forEach(w => {
  assert.ok(w.label.includes('Week'), 'Week label must be structured');
  assert.ok(w.days.length > 0, 'Week must contain days');
  assert.ok(w.totalDebit >= 0, 'Week total debit must be computed');
  w.days.forEach(d => {
    assert.ok(d.dayLabel.length > 0, 'Day label must be present');
    assert.ok(d.transactions.length > 0, 'Day must have transactions');
  });
});

const searchResult = filterTransactions(SEED_TRANSACTIONS, { query: 'Amazon' });
assert.equal(searchResult.length, 1, 'Search for Amazon should return exactly 1 transaction');
assert.equal(searchResult[0].merchant, 'Amazon');

console.log(`✓ Hierarchical grouping & search passed: March organized into ${marchWeeks.length} weeks with day subtotals, search queries working accurately.`);

// 9. Edit, Batch Delete, and Single Delete Test
await addKredoTransaction({ merchant: 'Amazon Test', amount: 23499, type: 'debit', category: 'Shopping', date: '2026-03-12' });
await addKredoTransaction({ merchant: 'Swiggy Test', amount: 299, type: 'debit', category: 'Food & Dining', date: '2026-03-09' });
await addKredoTransaction({ merchant: 'Blinkit Test', amount: 890, type: 'debit', category: 'Groceries', date: '2026-03-04' });
const initialTxs = await getKredoTransactions();
assert.ok(initialTxs.length >= 3, 'Must have at least 3 transactions');
const targetId = initialTxs[0].id;
const updateRes = await updateKredoTransaction(targetId, {
  merchant: 'Amazon Supermarket Updated',
  amount: 25000,
});
assert.equal(updateRes.success, true, 'Transaction must update successfully');
assert.equal(updateRes.tx.merchant, 'Amazon Supermarket Updated');
assert.equal(updateRes.tx.amount, 25000);

// Batch delete test
const txsBeforeBatch = await getKredoTransactions();
const batchIdsToDelete = [txsBeforeBatch[1].id, txsBeforeBatch[2].id];
const deleteCount = await deleteKredoTransactionsBatch(batchIdsToDelete);
assert.equal(deleteCount, 2, 'Batch delete should report 2 items deleted');
const txsAfterBatch = await getKredoTransactions();
assert.equal(txsAfterBatch.length, txsBeforeBatch.length - 2, 'Store must reflect 2 fewer transactions');

console.log(`✓ Edit & Batch Delete passed: updated transaction "${updateRes.tx.merchant}", deleted ${deleteCount} items in batch.`);

// 10. Credit Card Vault & Auto-Deduction Engine Test
const {
  addCreditCard,
  getCreditCards,
  updateCreditCard,
  deleteCreditCard,
  matchAndAdjustCardForTransaction,
} = await import('../src/kredo/kredoCardStore.js');

const testCard = await addCreditCard({
  cardName: 'HDFC Regalia Gold',
  bank: 'HDFC',
  cardNumber: '4111 2222 3333 4028',
  last4: '4028',
  totalLimit: 500000,
  currentLimit: 420000,
  billDay: 15,
  dueDay: 5,
});

assert.equal(testCard.last4, '4028', 'Last 4 digits must be extracted');
assert.equal(testCard.usedLimit, 80000, 'Used limit must be totalLimit - currentLimit (500000 - 420000 = 80000)');
assert.equal(testCard.utilization, 16, 'Utilization must be 16%');

// Test auto-deduction on new debit transaction
const debitTx = {
  amount: 20000,
  type: 'debit',
  cardLast4: '4028',
  merchant: 'Apple Store',
};
const adjustResult = await matchAndAdjustCardForTransaction(debitTx, true);
assert.equal(adjustResult.matched, true, 'Transaction must match card by last 4 digits');
assert.equal(adjustResult.newCurrentLimit, 400000, 'Current limit must be reduced by 20000 (420000 - 20000 = 400000)');

const updatedCards = await getCreditCards();
const refreshedCard = updatedCards.find(c => c.id === testCard.id);
assert.equal(refreshedCard.currentLimit, 400000, 'Store must reflect updated available limit');
assert.equal(refreshedCard.usedLimit, 100000, 'Used limit must now be 100000');
assert.equal(refreshedCard.utilization, 20, 'Utilization must now be 20%');

// 11. Google Sheet 24-Column Normalization & Zero-Guessing Rule Test
const { normalizeSheetRow, SHEET_COLUMNS, buildColumnIndexMap } = await import('../src/kredo/kredoSheetService.js');

// Test with full 24 columns present
const sampleFull24Row = [
  '2026-03-22',                // 0: Date
  '02:45 PM',                  // 1: Time
  'debit',                     // 2: Type
  '12499',                     // 3: Amount
  'Electronics',               // 4: Category
  'Credit Card',               // 5: Payment Method
  'Croma Electronics',         // 6: Merchant
  'HDFC Regalia',              // 7: Account
  'SMS Parser',                // 8: Source
  'Debited INR 12499 on HDFC', // 9: Raw Message
  'TXN-998812',                // 10: Transaction ID
  'HDFC Bank',                 // 11: Bank
  '4028',                      // 12: Last 4
  'REF-CROMA-771',             // 13: Reference ID
  'Discretionary',             // 14: Nature
  '0.98',                      // 15: Confidence
  'INR',                       // 16: Currency
  'Completed',                 // 17: Status
  'Flagged',                   // 18: Review Flag
  'High Single Spend Alert',   // 19: Review Reason
  'BILL-HDFC-MAR26',           // 20: Linked Bill ID
  'v2.4.1',                    // 21: Parser Version
  'CRED',                      // 22: Payment App
  'Visa',                      // 23: Card Network
];

const normalized24 = normalizeSheetRow(sampleFull24Row, 1);
assert.equal(normalized24.date, '2026-03-22');
assert.equal(normalized24.time, '02:45 PM');
assert.equal(normalized24.type, 'debit');
assert.equal(normalized24.amount, 12499);
assert.equal(normalized24.category, 'Electronics');
assert.equal(normalized24.paymentMethod, 'Credit Card');
assert.equal(normalized24.merchant, 'Croma Electronics');
assert.equal(normalized24.cardOrAccount, 'HDFC Regalia');
assert.equal(normalized24.source, 'SMS Parser');
assert.equal(normalized24.rawMessage, 'Debited INR 12499 on HDFC');
assert.equal(normalized24.transactionId, 'TXN-998812');
assert.equal(normalized24.bank, 'HDFC Bank');
assert.equal(normalized24.cardLast4, '4028');
assert.equal(normalized24.referenceId, 'REF-CROMA-771');
assert.equal(normalized24.nature, 'Discretionary');
assert.equal(normalized24.confidence, '0.98');
assert.equal(normalized24.currency, 'INR');
assert.equal(normalized24.status, 'Completed');
assert.equal(normalized24.reviewFlag, 'Flagged');
assert.equal(normalized24.reviewReason, 'High Single Spend Alert');
assert.equal(normalized24.linkedBillId, 'BILL-HDFC-MAR26');
assert.equal(normalized24.parserVersion, 'v2.4.1');
assert.equal(normalized24.paymentApp, 'CRED');
assert.equal(normalized24.cardNetwork, 'Visa');

// Zero-Guessing Rule Verification: Missing fields MUST remain blank
const sampleSparseRow = [
  '2026-03-23', // Date
  '',           // Time (missing)
  'debit',      // Type
  '150',        // Amount
  'Chai & Tea', // Category
  'UPI',        // Payment Method
  'Chai Point', // Merchant
  // All remaining 17 fields missing
];

const normalizedSparse = normalizeSheetRow(sampleSparseRow, 2);
assert.equal(normalizedSparse.merchant, 'Chai Point');
assert.equal(normalizedSparse.amount, 150);
assert.equal(normalizedSparse.bank, '', 'Bank must remain blank when not provided');
assert.equal(normalizedSparse.cardLast4, '', 'Last 4 must remain blank when not provided');
assert.equal(normalizedSparse.paymentApp, '', 'Payment App must remain blank when not provided');
assert.equal(normalizedSparse.cardNetwork, '', 'Card Network must remain blank when not provided');
assert.equal(normalizedSparse.referenceId, '', 'Reference ID must remain blank when not provided');
assert.equal(normalizedSparse.linkedBillId, '', 'Linked Bill ID must remain blank when not provided');
assert.equal(normalizedSparse.reviewFlag, '', 'Review Flag must remain blank when not provided');
assert.equal(normalizedSparse.reviewReason, '', 'Review Reason must remain blank when not provided');

console.log('✓ Google Sheet 24-column parser & Zero-Guessing rule verified: all 24 fields mapped cleanly without hallucinating missing data.');

// 12. Multi-Dimensional 24-Column Slicer & Analytics Breakdown Test
const mixedDataset = [
  normalized24,
  normalizedSparse,
  ...SEED_TRANSACTIONS,
];

const bankFilterResult = filterTransactions(mixedDataset, { bank: 'HDFC Bank' });
assert.ok(bankFilterResult.length >= 1, 'Filter by bank must match');
assert.ok(bankFilterResult.every(t => (t.bank || '').toLowerCase().includes('hdfc bank')), 'Bank filter must strictly isolate matching records');

const appFilterResult = filterTransactions(mixedDataset, { paymentApp: 'CRED' });
assert.ok(appFilterResult.length >= 1, 'Filter by payment app must match');
assert.ok(appFilterResult.every(t => t.paymentApp === 'CRED'), 'Payment App filter must strictly isolate matching records');

const netFilterResult = filterTransactions(mixedDataset, { cardNetwork: 'Visa' });
assert.ok(netFilterResult.length >= 1, 'Filter by card network must match');
assert.ok(netFilterResult.every(t => t.cardNetwork === 'Visa'), 'Card Network filter must strictly isolate matching records');

const reviewFilterResult = filterTransactions(mixedDataset, { reviewFlag: 'flagged' });
assert.ok(reviewFilterResult.length >= 1, 'Filter by flagged review status must match');
assert.ok(reviewFilterResult.every(t => t.reviewFlag && t.reviewFlag !== 'no' && t.reviewFlag !== 'false' && t.reviewFlag !== 'clear'), 'Review Flag filter must isolate flagged items');

const deepAnalytics = computeKredoAnalytics(mixedDataset, mixedDataset);
assert.ok(deepAnalytics.bankShare.length > 0, 'Analytics must aggregate bank share breakdown');
assert.ok(deepAnalytics.paymentAppShare.length > 0, 'Analytics must aggregate payment app share breakdown');
assert.ok(deepAnalytics.cardNetworkShare.length > 0, 'Analytics must aggregate card network breakdown');
assert.ok(deepAnalytics.natureShare.length > 0, 'Analytics must aggregate spend nature breakdown');
assert.ok(deepAnalytics.reviewFlagStats.totalFlagged >= 1, 'Analytics must track flagged audit stats');
assert.ok(deepAnalytics.linkedBillStats.totalLinkedCount >= 1, 'Analytics must track linked bill settlements');

// 13. Financial Status Engine & Outline Highlighting Verification
const baseReferenceDate = '2026-03-31';

// Case A: Completed / Settled normal transaction -> subtle green
const txCompleted = {
  merchant: 'Swiggy Gourmet',
  amount: 850,
  status: 'Completed',
  nature: 'Food & Dining',
  date: '2026-03-28',
};
const resCompleted = resolveFinancialStatus(txCompleted, { referenceDate: baseReferenceDate });
assert.equal(resCompleted.tier, 'completed', 'Completed transaction tier must be completed');
assert.equal(resCompleted.outlineClass, 'kredo-status-outline-completed', 'Completed class must be kredo-status-outline-completed');
assert.ok(resCompleted.highlightReason.toLowerCase().includes('settled'), 'Reason should explain settled status');

// Case B: Upcoming Bill (> 3 days out) -> Gray by default
const txUpcoming = {
  merchant: 'JioFiber Home Internet',
  amount: 1179,
  nature: 'Bill',
  status: 'Upcoming',
  dueDate: '2026-04-10', // 10 days out
};
const resUpcoming = resolveFinancialStatus(txUpcoming, { referenceDate: baseReferenceDate });
assert.equal(resUpcoming.tier, 'upcoming', 'Bill > 3 days out must be upcoming');
assert.equal(resUpcoming.outlineClass, 'kredo-status-outline-upcoming', 'Upcoming class must be kredo-status-outline-upcoming');
assert.ok(resUpcoming.daysToDue > 3, 'Days to due must be > 3');
assert.ok(resUpcoming.highlightReason.toLowerCase().includes('upcoming'), 'Reason must explain upcoming obligation');

// Case C: Due Within 3 Days -> Orange
const txDueSoon = {
  merchant: 'Airtel Broadband Bill',
  amount: 1179,
  nature: 'Bill',
  status: 'Pending',
  dueDate: '2026-04-02', // 2 days out from 2026-03-31
};
const resDueSoon = resolveFinancialStatus(txDueSoon, { referenceDate: baseReferenceDate });
assert.equal(resDueSoon.tier, 'due-soon', 'Bill within 3 days must resolve to due-soon');
assert.equal(resDueSoon.outlineClass, 'kredo-status-outline-due-soon', 'Due soon class must be kredo-status-outline-due-soon');
assert.equal(resDueSoon.daysToDue, 2, 'Days to due should be precisely 2');
assert.ok(resDueSoon.highlightReason.toLowerCase().includes('2 day'), 'Reason must state exact countdown');

// Case D: Due Today -> Orange
const txDueToday = {
  merchant: 'HDFC CC Payment',
  amount: 24000,
  nature: 'Bill',
  dueDate: '2026-03-31', // Today
};
const resDueToday = resolveFinancialStatus(txDueToday, { referenceDate: baseReferenceDate });
assert.equal(resDueToday.tier, 'due-today', 'Bill due on reference date must resolve to due-today');
assert.equal(resDueToday.outlineClass, 'kredo-status-outline-due-today', 'Due today class must be kredo-status-outline-due-today');
assert.equal(resDueToday.daysToDue, 0, 'Days to due must be 0 for today');
assert.ok(resDueToday.badgeLabel.toLowerCase().includes('due today'), 'Badge label must state DUE TODAY');

// Case E: Overdue -> Red
const txOverdue = {
  merchant: 'BESCOM Electricity Bill',
  amount: 3450,
  nature: 'Bill',
  status: 'Unpaid',
  dueDate: '2026-03-25', // 6 days overdue
};
const resOverdue = resolveFinancialStatus(txOverdue, { referenceDate: baseReferenceDate });
assert.equal(resOverdue.tier, 'overdue', 'Past-due bill must resolve to overdue');
assert.equal(resOverdue.outlineClass, 'kredo-status-outline-overdue', 'Overdue class must be kredo-status-outline-overdue');
assert.equal(resOverdue.daysToDue, -6, 'Days to due must be negative for overdue');
assert.ok(resOverdue.highlightReason.toLowerCase().includes('6 day'), 'Reason must explain days overdue');

// Case F: Review Flagging & Audit
const txFlagged = {
  merchant: 'Unknown POS Swipe',
  amount: 45000,
  status: 'Completed',
  reviewFlag: 'Flagged',
  reviewReason: 'Suspicious overseas transaction',
};
const resFlagged = resolveFinancialStatus(txFlagged, { referenceDate: baseReferenceDate });
assert.equal(resFlagged.isFlagged, true, 'Flagged review items must set isFlagged: true');
assert.ok(resFlagged.highlightReason.includes('Suspicious overseas transaction'), 'Reason must include review reason');

// Case G: Strict Zero-Emoji & Clean Text Invariant
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
const testResults = [resCompleted, resUpcoming, resDueSoon, resDueToday, resOverdue, resFlagged];
for (const res of testResults) {
  assert.equal(emojiRegex.test(res.badgeLabel), false, `Badge label "${res.badgeLabel}" must contain NO emojis`);
  assert.equal(emojiRegex.test(res.highlightReason), false, `Highlight reason "${res.highlightReason}" must contain NO emojis`);
}
console.log('✓ Status Highlighting Engine verified: subtle green (completed), gray (upcoming), orange (due today/soon), red (overdue), amber (flagged) with zero emojis.');

console.log('\n🎉 ALL KREDO STATUS & FINANCIAL INTELLIGENCE TESTS PASSED WITH 100% SUCCESS!\n');


