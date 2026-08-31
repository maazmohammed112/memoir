/**
 * KREDO — Gemini Gmail JSON Extractor & Resilient Deduplication Importer
 * Parses structured JSON from Gemini prompts, handles partial/markdown chunks,
 * auto-detects categories, and guarantees zero duplicate inserts.
 */

import { computeTransactionFingerprint } from './kredoStore.js';
import { format12HourTime } from './kredoAnalytics.js';

export const GEMINI_PROMPT_TEMPLATE = `You are a financial parsing assistant. Extract all debit and credit transactions from my bank SMS, emails, or account statements.
Output ONLY a valid JSON array of objects with NO conversational filler, markdown explanations, or preamble.

Schema for each transaction:
[
  {
    "date": "YYYY-MM-DD",              // e.g. "2026-03-12"
    "time": "HH:MM AM/PM",             // e.g. "09:31 PM"
    "type": "debit",                   // "debit" (expense) or "credit" (income/refund/bill payment)
    "amount": 23499,                    // Numeric amount in INR (no symbols)
    "category": "Shopping",             // "Shopping" | "Food & Dining" | "Groceries" | "Bills & Utilities" | "Healthcare" | "Travel" | "Entertainment" | "Income" | "Other"
    "paymentMethod": "Credit Card",    // "Credit Card" | "UPI" | "Debit Card" | "Net Banking" | "Cash"
    "merchant": "Amazon",              // Name of payee/store/beneficiary
    "cardOrAccount": "Axis Ace",       // Bank account or card nickname
    "source": "Statement Import",      // Data origin
    "rawMessage": "SMS text...",       // Raw notification message if available
    "transactionId": "TXN-00129",      // Primary transaction ID if present
    "bank": "Axis Bank",               // Bank institution (leave blank if unknown)
    "cardLast4": "0123",               // Last 4 digits of card/account (leave blank if unknown)
    "referenceId": "UPI/607223918231", // Bank UTR or UPI/Card Ref number
    "nature": "Discretionary",         // "Personal" | "Business" | "Subscription" | "Recurring" | "Refund" | "Transfer" | "Investment"
    "confidence": "0.99",              // Confidence score (0.0 to 1.0)
    "currency": "INR",                 // ISO Currency code (default INR)
    "status": "Completed",             // "Completed" | "Pending" | "Failed" | "Settled"
    "reviewFlag": "",                  // "Needs Review" | "Flagged" if suspicious or low confidence
    "reviewReason": "",                // Explanation if reviewFlag is set
    "linkedBillId": "",                // Statement or bill ID if linked
    "parserVersion": "v2.4",           // Parser engine version
    "paymentApp": "CRED",              // "Google Pay" | "PhonePe" | "CRED" | "Paytm" | "Amazon Pay" etc.
    "cardNetwork": "Visa",             // "Visa" | "Mastercard" | "RuPay" | "Amex" | "Diners Club"
    "notes": "Desk setup electronics"  // Additional notes
  }
]`;

/**
 * Intelligent category classifier based on merchant keywords
 */
export function inferCategory(merchantName = '') {
  const m = merchantName.toLowerCase();
  if (/swiggy|zomato|starbucks|mcdonald|domino|cafe|kfc|burger|restaurant|dine/i.test(m)) return 'Food & Dining';
  if (/amazon|flipkart|myntra|apple|zara|h&m|ikea|croma|reliance digital/i.test(m)) return 'Shopping';
  if (/blinkit|zepto|instamart|bigbasket|nature's basket|dmart|grocery|supermarket/i.test(m)) return 'Groceries';
  if (/uber|ola|rapido|indigo|air india|irctc|makemytrip|cleartrip|fuel|petrol|shell/i.test(m)) return 'Travel';
  if (/bescom|electricity|airtel|jio|act fibernet|tata power|gas|broadband|water|recharge/i.test(m)) return 'Bills & Utilities';
  if (/apollo|medplus|pharmeasy|hospital|clinic|doctor|pharmacy|medico/i.test(m)) return 'Healthcare';
  if (/netflix|spotify|prime video|youtube|hotstar|pvr|inox|bookmyshow/i.test(m)) return 'Entertainment';
  if (/salary|remuneration|dividend|interest credit|payroll/i.test(m)) return 'Income';
  return 'General';
}

/**
 * Parses raw JSON string or object, robust against markdown formatting, unescaped text, or partial lists
 */
export function parseRawGeminiInput(rawInput) {
  if (!rawInput) return [];

  // If already an array, return directly
  if (Array.isArray(rawInput)) return rawInput;

  // If object with nested array
  if (typeof rawInput === 'object') {
    if (Array.isArray(rawInput.transactions)) return rawInput.transactions;
    if (Array.isArray(rawInput.expenses)) return rawInput.expenses;
    if (Array.isArray(rawInput.data)) return rawInput.data;
    if (Array.isArray(rawInput.items)) return rawInput.items;
    return [rawInput];
  }

  if (typeof rawInput !== 'string') return [];
  let cleaned = rawInput.trim();

  // Strip markdown ```json ... ``` code blocks
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  // First direct JSON parse attempt
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.transactions)) return parsed.transactions;
      if (Array.isArray(parsed.expenses)) return parsed.expenses;
      if (Array.isArray(parsed.data)) return parsed.data;
      if (Array.isArray(parsed.items)) return parsed.items;
      return [parsed];
    }
  } catch (err) {
    // Fall back to regex bracket scanning for resilient partial parsing
  }

  // Extract JSON array chunk
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try {
      const sliced = cleaned.slice(arrayStart, arrayEnd + 1);
      const parsed = JSON.parse(sliced);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Continue to object chunking
    }
  }

  // Chunk parser: scan individual { ... } objects even if surrounding JSON is broken
  const objects = [];
  let depth = 0;
  let startIdx = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const objStr = cleaned.slice(startIdx, i + 1);
        try {
          const item = JSON.parse(objStr);
          if (item && typeof item === 'object') objects.push(item);
        } catch (ignore) {}
        startIdx = -1;
      }
    }
  }

  return objects;
}

/**
 * Normalizes an arbitrary transaction object into standard Kredo format with all 24 fields
 */
export function normalizeTransaction(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Extract amount
  let amt = raw.amount !== undefined ? raw.amount : (raw.value || raw.price || raw.total || 0);
  if (typeof amt === 'string') {
    amt = parseFloat(amt.replace(/[^\d.-]/g, ''));
  }
  amt = Math.abs(Number(amt) || 0);

  if (amt <= 0) return null;

  // Merchant / Title
  const merchant = String(raw.merchant || raw.title || raw.vendor || raw.payee || raw.name || 'Expense Item').trim();

  // Date normalization
  let dateStr = raw.date || '';
  if (!dateStr || isNaN(Date.parse(dateStr))) {
    dateStr = new Date().toISOString().slice(0, 10);
  } else {
    try {
      const d = new Date(dateStr);
      dateStr = d.toISOString().slice(0, 10);
    } catch {
      dateStr = new Date().toISOString().slice(0, 10);
    }
  }

  // Time (12-hour format: e.g. 9:30 PM)
  const timeStr = raw.time ? format12HourTime(raw.time) : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Type: debit vs credit
  const rawType = String(raw.type || raw.transactionType || '').toLowerCase();
  const isCredit = rawType.includes('credit') || rawType.includes('income') || rawType.includes('refund') || rawType.includes('cashback');
  const type = isCredit ? 'credit' : 'debit';

  // Category
  const category = String(raw.category || inferCategory(merchant)).trim();

  // Method
  let method = 'UPI';
  const rawMethod = String(raw.paymentMethod || raw.method || raw.mode || '').toLowerCase();
  if (rawMethod.includes('card') || rawMethod.includes('credit')) method = 'Credit Card';
  else if (rawMethod.includes('debit')) method = 'Debit Card';
  else if (rawMethod.includes('net') || rawMethod.includes('bank') || rawMethod.includes('neft')) method = 'Net Banking';
  else if (rawMethod.includes('cash')) method = 'Cash';

  const cardOrAccount = String(raw.cardOrAccount || raw.account || (method === 'UPI' ? 'Cred UPI' : '')).trim();
  const referenceId = String(raw.referenceId || raw.utr || raw.txnId || raw.ref || raw.rrn || '').trim();
  const transactionId = String(raw.transactionId || raw.txId || raw.sheetId || '').trim();
  const notes = String(raw.notes || raw.description || '').trim();
  const bank = String(raw.bank || raw.bankName || raw.issuer || '').trim();
  const nature = String(raw.nature || raw.natureOfSpend || raw.classification || '').trim();
  const confidence = String(raw.confidence !== undefined ? raw.confidence : '').trim();
  const currency = String(raw.currency || 'INR').trim();
  const status = String(raw.status || 'Completed').trim();
  const reviewFlag = String(raw.reviewFlag || raw.flag || '').trim();
  const reviewReason = String(raw.reviewReason || raw.reason || '').trim();
  const linkedBillId = String(raw.linkedBillId || raw.billId || '').trim();
  const parserVersion = String(raw.parserVersion || 'v2.4').trim();
  const paymentApp = String(raw.paymentApp || raw.app || '').trim();
  const cardNetwork = String(raw.cardNetwork || raw.network || '').trim();
  const source = String(raw.source || 'Statement Import').trim();
  const rawMessage = String(raw.rawMessage || raw.rawSms || raw.raw || '').trim();

  // Extract last 4 digits of credit/debit card (strictly 4 digits, never guessed)
  let cardLast4 = String(raw.cardLast4 || raw.last4 || '').trim().replace(/\D/g, '').slice(-4);
  if (!cardLast4 && cardOrAccount) {
    const match = String(cardOrAccount).match(/\b(\d{4})\b/);
    if (match) cardLast4 = match[1];
  }
  if (!cardLast4 && notes) {
    const match = String(notes).match(/ending (?:in )?(\d{4})|xx+(\d{4})|card (\d{4})/i);
    if (match) cardLast4 = match[1] || match[2] || match[3];
  }

  const displaySub = `${merchant.toLowerCase()} (${method.toLowerCase()}${cardLast4 ? ` • ${cardLast4}` : ''})`;

  const normalized = {
    id: raw.id || 'krtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    transactionId,
    referenceId,
    date: dateStr,
    time: timeStr,
    merchant,
    displaySub,
    amount: amt,
    type,
    category,
    paymentMethod: method,
    cardOrAccount,
    bank,
    cardLast4,
    nature,
    confidence,
    currency,
    status,
    reviewFlag,
    reviewReason,
    linkedBillId,
    parserVersion,
    paymentApp,
    cardNetwork,
    source,
    rawMessage,
    notes,
    createdAt: Date.parse(`${dateStr}T${timeStr.includes(':') ? '12:00:00' : '00:00:00'}`) || Date.now(),
  };

  normalized.fingerprint = computeTransactionFingerprint(normalized);
  return normalized;
}

/**
 * Validates candidate batch and tests for duplicates against existing transactions
 */
export function analyzeImportBatch(rawText, existingTransactions = []) {
  const parsedList = parseRawGeminiInput(rawText);
  const existingFingerprints = new Set(existingTransactions.map(e => e.fingerprint));
  const existingRefs = new Set(
    existingTransactions.filter(e => e.referenceId).map(e => e.referenceId.toLowerCase())
  );

  const newItems = [];
  const duplicateItems = [];
  const invalidItems = [];

  const seenInBatch = new Set();

  for (const raw of parsedList) {
    const normalized = normalizeTransaction(raw);
    if (!normalized) {
      invalidItems.push(raw);
      continue;
    }

    const fp = normalized.fingerprint;
    const refMatch = normalized.referenceId && existingRefs.has(normalized.referenceId.toLowerCase());
    const fpMatch = existingFingerprints.has(fp);
    const batchDuplicate = seenInBatch.has(fp);

    if (refMatch || fpMatch || batchDuplicate) {
      duplicateItems.push({
        ...normalized,
        duplicateReason: refMatch ? `Reference ID ${normalized.referenceId} already recorded` : 'Matching timestamp, merchant and amount exists',
      });
    } else {
      seenInBatch.add(fp);
      newItems.push(normalized);
    }
  }

  return {
    totalParsed: parsedList.length,
    newItems,
    newTransactions: newItems,
    duplicateItems,
    invalidItems,
    canImport: newItems.length > 0,
  };
}
