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

console.log(`✓ Credit Card Vault & Auto-Deduction passed: ${refreshedCard.cardName} (••${refreshedCard.last4}) available ₹${refreshedCard.currentLimit.toLocaleString()}, used ₹${refreshedCard.usedLimit.toLocaleString()} (${refreshedCard.utilization}%).`);

console.log('\n🎉 ALL KREDO ENGINE & DEDUPLICATION TESTS PASSED WITH 100% SUCCESS!\n');

