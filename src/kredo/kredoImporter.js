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
    "merchant": "Name of payee/store", // e.g. "Amazon", "Swiggy", "HDFC CC Bill"
    "amount": 23499,                    // Numeric amount in INR (no symbols)
    "type": "debit",                   // "debit" (expense) or "credit" (income/refund/bill payment)
    "category": "Shopping",             // "Shopping" | "Food & Dining" | "Groceries" | "Bills & Utilities" | "Healthcare" | "Travel" | "Entertainment" | "Income" | "Other"
    "paymentMethod": "Credit Card",    // "Credit Card" | "UPI" | "Debit Card" | "Net Banking" | "Cash"
    "cardLast4": "4028",               // REQUIRED for Credit Card: Extract the 4-digit card number (e.g. ending in 4028, xx4028)
    "cardOrAccount": "HDFC Regalia",   // Bank or Card name if mentioned
    "referenceId": "UPI/607223918231", // Bank UTR or UPI/Card Ref number
    "notes": "Brief description"
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
 * Normalizes an arbitrary transaction object into standard Kredo format
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
  const category = raw.category || inferCategory(merchant);

  // Method
  let method = 'UPI';
  const rawMethod = String(raw.paymentMethod || raw.method || raw.mode || '').toLowerCase();
  if (rawMethod.includes('card') || rawMethod.includes('credit')) method = 'Credit Card';
  else if (rawMethod.includes('debit')) method = 'Debit Card';
  else if (rawMethod.includes('net') || rawMethod.includes('bank') || rawMethod.includes('neft')) method = 'Net Banking';
  else if (rawMethod.includes('cash')) method = 'Cash';

  const cardOrAccount = raw.cardOrAccount || raw.account || (method === 'UPI' ? 'Cred UPI' : 'Bank A/c');
  const referenceId = String(raw.referenceId || raw.utr || raw.txnId || raw.ref || '').trim();
  const notes = raw.notes || raw.description || '';

  // Extract last 4 digits of credit/debit card
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
    date: dateStr,
    time: timeStr,
    merchant,
    displaySub,
    amount: amt,
    type,
    category,
    paymentMethod: method,
    cardOrAccount,
    cardLast4,
    referenceId,
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
