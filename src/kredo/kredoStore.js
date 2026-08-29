/**
 * KREDO — High-Performance Isolated IndexedDB Store & Deduplication Engine
 * Independent from Memoir Vault; exclusively restricted to Maaz's local storage.
 */

const DB_NAME = 'kredo_expense_vault_v1';
const DB_VERSION = 1;
const TX_STORE = 'transactions';
const META_STORE = 'metadata';
const BACKUP_KEY = 'kredo_expenses_backup_v1';
const SETTINGS_KEY = 'kredo_settings_v1';

// Deterministic fingerprinting to prevent duplicates
export function computeTransactionFingerprint(tx) {
  if (!tx) return '';
  if (tx.referenceId && String(tx.referenceId).trim().length > 3) {
    return 'ref_' + String(tx.referenceId).trim().toLowerCase();
  }
  const date = String(tx.date || '').trim();
  const time = String(tx.time || '').trim().toLowerCase();
  const merchant = String(tx.merchant || tx.title || '').trim().toLowerCase();
  const amount = Number(tx.amount || 0).toFixed(2);
  const type = String(tx.type || 'debit').trim().toLowerCase();
  const method = String(tx.paymentMethod || tx.method || 'upi').trim().toLowerCase();
  return `${date}#${time}#${merchant}#${amount}#${type}#${method}`;
}

// Initial realistic dataset matching the CRED screenshot provided by the user
export const SEED_TRANSACTIONS = [
  {
    id: 'krtx_seed_01',
    date: '2026-03-12',
    time: '09:31 PM',
    merchant: 'Amazon',
    displaySub: 'amazon (upi)',
    amount: 23499,
    type: 'debit',
    category: 'Shopping',
    paymentMethod: 'UPI',
    cardOrAccount: 'Cred UPI',
    referenceId: 'UPI/607223918231',
    notes: 'Smart electronics & desk setup',
    createdAt: Date.parse('2026-03-12T21:31:00'),
  },
  {
    id: 'krtx_seed_02',
    date: '2026-03-11',
    time: '11:17 AM',
    merchant: 'Medico Store',
    displaySub: 'medico store (upi)',
    amount: 650,
    type: 'credit',
    category: 'Healthcare',
    paymentMethod: 'UPI',
    cardOrAccount: 'Cred UPI',
    referenceId: 'UPI/607119283719',
    notes: 'Pharmacy refund & wellness cashback',
    createdAt: Date.parse('2026-03-11T11:17:00'),
  },
  {
    id: 'krtx_seed_03',
    date: '2026-03-09',
    time: '08:15 PM',
    merchant: 'Swiggy',
    displaySub: 'swiggy (upi)',
    amount: 299,
    type: 'debit',
    category: 'Food & Dining',
    paymentMethod: 'UPI',
    cardOrAccount: 'Cred UPI',
    referenceId: 'UPI/606992817263',
    notes: 'Dinner gourmet bowl',
    createdAt: Date.parse('2026-03-09T20:15:00'),
  },
  {
    id: 'krtx_seed_04',
    date: '2026-03-08',
    time: '02:40 PM',
    merchant: 'Axis Ace Card Bill',
    displaySub: 'axis ace card (autopay)',
    amount: 14250,
    type: 'debit',
    category: 'Bills & Utilities',
    paymentMethod: 'Credit Card',
    cardOrAccount: 'Axis Ace',
    referenceId: 'CC/AXIS/998231',
    notes: 'Monthly statement settlement',
    createdAt: Date.parse('2026-03-08T14:40:00'),
  },
  {
    id: 'krtx_seed_05',
    date: '2026-03-06',
    time: '07:22 PM',
    merchant: 'Uber India',
    displaySub: 'uber rides (card)',
    amount: 540,
    type: 'debit',
    category: 'Travel',
    paymentMethod: 'Credit Card',
    cardOrAccount: 'Axis Ace',
    referenceId: 'TXN/UBR/882194',
    notes: 'Airport commute',
    createdAt: Date.parse('2026-03-06T19:22:00'),
  },
  {
    id: 'krtx_seed_06',
    date: '2026-03-04',
    time: '04:10 PM',
    merchant: 'Blinkit',
    displaySub: 'blinkit instant (upi)',
    amount: 890,
    type: 'debit',
    category: 'Groceries',
    paymentMethod: 'UPI',
    cardOrAccount: 'PhonePe',
    referenceId: 'UPI/606412093847',
    notes: 'Weekly fresh produce & kitchen pantry',
    createdAt: Date.parse('2026-03-04T16:10:00'),
  },
  {
    id: 'krtx_seed_07',
    date: '2026-03-01',
    time: '10:00 AM',
    merchant: 'Salary Credit',
    displaySub: 'payroll direct transfer',
    amount: 175000,
    type: 'credit',
    category: 'Income',
    paymentMethod: 'Net Banking',
    cardOrAccount: 'HDFC Salary A/c',
    referenceId: 'NEFT/HDFC/00192837',
    notes: 'March monthly remuneration',
    createdAt: Date.parse('2026-03-01T10:00:00'),
  },
  // February & January historical entries for yearly calculations
  {
    id: 'krtx_seed_08',
    date: '2026-02-24',
    time: '08:30 PM',
    merchant: 'Apple Store',
    displaySub: 'apple bangalore (card)',
    amount: 54900,
    type: 'debit',
    category: 'Shopping',
    paymentMethod: 'Credit Card',
    cardOrAccount: 'HDFC Millennia',
    referenceId: 'TXN/APL/772183',
    notes: 'AirPods Max & Accessories',
    createdAt: Date.parse('2026-02-24T20:30:00'),
  },
  {
    id: 'krtx_seed_09',
    date: '2026-02-18',
    time: '01:15 PM',
    merchant: 'Zomato',
    displaySub: 'zomato gold (upi)',
    amount: 720,
    type: 'debit',
    category: 'Food & Dining',
    paymentMethod: 'UPI',
    cardOrAccount: 'Cred UPI',
    referenceId: 'UPI/604819284716',
    notes: 'Weekend brunch',
    createdAt: Date.parse('2026-02-18T13:15:00'),
  },
  {
    id: 'krtx_seed_10',
    date: '2026-02-10',
    time: '03:45 PM',
    merchant: 'Tata Power Electricity',
    displaySub: 'bescom bill (cred billpay)',
    amount: 3250,
    type: 'debit',
    category: 'Bills & Utilities',
    paymentMethod: 'UPI',
    cardOrAccount: 'Cred UPI',
    referenceId: 'BILL/BESCOM/29381',
    notes: 'Monthly residential electricity bill',
    createdAt: Date.parse('2026-02-10T15:45:00'),
  },
  {
    id: 'krtx_seed_11',
    date: '2026-02-01',
    time: '10:00 AM',
    merchant: 'Salary Credit',
    displaySub: 'payroll direct transfer',
    amount: 175000,
    type: 'credit',
    category: 'Income',
    paymentMethod: 'Net Banking',
    cardOrAccount: 'HDFC Salary A/c',
    referenceId: 'NEFT/HDFC/00181726',
    notes: 'February monthly remuneration',
    createdAt: Date.parse('2026-02-01T10:00:00'),
  },
  {
    id: 'krtx_seed_12',
    date: '2026-01-22',
    time: '06:20 PM',
    merchant: 'MakeMyTrip Flight',
    displaySub: 'makemytrip booking (card)',
    amount: 18450,
    type: 'debit',
    category: 'Travel',
    paymentMethod: 'Credit Card',
    cardOrAccount: 'SBI SimplyCLICK',
    referenceId: 'TXN/MMT/192837',
    notes: 'Delhi conference round trip',
    createdAt: Date.parse('2026-01-22T18:20:00'),
  },
  {
    id: 'krtx_seed_13',
    date: '2026-01-14',
    time: '09:00 PM',
    merchant: 'Cult.Fit Gym Membership',
    displaySub: 'cult pass annual (card)',
    amount: 14500,
    type: 'debit',
    category: 'Healthcare',
    paymentMethod: 'Credit Card',
    cardOrAccount: 'Axis Ace',
    referenceId: 'TXN/CULT/827163',
    notes: 'Annual fitness pass',
    createdAt: Date.parse('2026-01-14T21:00:00'),
  },
  {
    id: 'krtx_seed_14',
    date: '2026-01-01',
    time: '10:00 AM',
    merchant: 'Salary Credit',
    displaySub: 'payroll direct transfer',
    amount: 175000,
    type: 'credit',
    category: 'Income',
    paymentMethod: 'Net Banking',
    cardOrAccount: 'HDFC Salary A/c',
    referenceId: 'NEFT/HDFC/00171625',
    notes: 'January monthly remuneration',
    createdAt: Date.parse('2026-01-01T10:00:00'),
  }
];

export const DEFAULT_CARDS = [
  {
    id: 'card_axis_ace',
    bank: 'Axis Bank',
    name: 'AXIS ACE',
    number: 'XXXX 0123',
    type: 'VISA Signature',
    gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #000 100%)',
    theme: 'teal-cyan',
    limit: 300000,
    used: 30658,
    available: 269342,
    dueDate: '24th Mar',
    billAmount: 14250,
  },
  {
    id: 'card_sbi_simplyclick',
    bank: 'SBI Card',
    name: 'SBI SIMPLYCLICK',
    number: 'XXXX 4481',
    type: 'Mastercard World',
    gradient: 'linear-gradient(135deg, #ff9900 0%, #ff5e62 70%, #1e130c 100%)',
    theme: 'amber-orange',
    limit: 150000,
    used: 37600,
    available: 112400,
    dueDate: '18th Mar',
    billAmount: 18450,
  },
  {
    id: 'card_hdfc_millennia',
    bank: 'HDFC Bank',
    name: 'HDFC MILLENNIA',
    number: 'XXXX 8820',
    type: 'Diners Club',
    gradient: 'linear-gradient(135deg, #b055f6 0%, #8e2de2 50%, #4a00e0 100%)',
    theme: 'violet-purple',
    limit: 200000,
    used: 28990,
    available: 171010,
    dueDate: '28th Mar',
    billAmount: 8900,
  },
];

export const DEFAULT_SETTINGS = {
  coins: 1274895,
  cashback: 32,
  coupons: 6,
  monthlyBudget: 60000,
  activeCardId: 'card_axis_ace',
};

// Database Promise Handler
let dbPromise = null;

function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TX_STORE)) {
        const store = db.createObjectStore(TX_STORE, { keyPath: 'id' });
        store.createIndex('fingerprint', 'fingerprint', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('IndexedDB failed to open, falling back to LocalStorage', request.error);
      resolve(null);
    };
  });
  return dbPromise;
}

// Fallback LocalStorage reader
function getLocalStorageBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalStorageBackup(items) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage backup failed:', e);
  }
}

// In-memory cache for ultra-fast, zero-lag synchronous consistency
let inMemoryTransactions = null;
const INITIALIZED_FLAG_KEY = 'kredo_initialized_v1';

// Public API
export async function getKredoTransactions() {
  if (inMemoryTransactions !== null) {
    return [...inMemoryTransactions];
  }

  const db = await getDb();
  let items = null;

  if (db) {
    items = await new Promise((resolve) => {
      try {
        const tx = db.transaction(TX_STORE, 'readwrite');
        const store = tx.objectStore(TX_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          // Purge any legacy demo seed data directly from DB
          all.forEach(record => {
            if (record.id && record.id.startsWith('krtx_seed_')) {
              store.delete(record.id);
            }
          });
          const realItems = all.filter(r => !r.id || !r.id.startsWith('krtx_seed_'));
          resolve(realItems);
        };
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  if (!items || !items.length) {
    items = getLocalStorageBackup();
  }

  // Purge any demo seed data from storage
  items = (items || []).filter(tx => tx && (!tx.id || !tx.id.startsWith('krtx_seed_')));

  // Mark initialized so demo seed is never re-injected
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  inMemoryTransactions = [...items];
  saveLocalStorageBackup(inMemoryTransactions);
  return [...inMemoryTransactions];
}

import { format12HourTime } from './kredoAnalytics.js';
import { matchAndAdjustCardForTransaction } from './kredoCardStore.js';

export async function addKredoTransaction(rawTx) {
  const existing = await getKredoTransactions();
  const fingerprint = computeTransactionFingerprint(rawTx);

  const tx = {
    id: rawTx.id || 'krtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    date: rawTx.date || new Date().toISOString().slice(0, 10),
    time: rawTx.time ? format12HourTime(rawTx.time) : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    merchant: rawTx.merchant || 'Expense Item',
    displaySub: rawTx.displaySub || `${(rawTx.merchant || 'Expense').toLowerCase()} (${(rawTx.paymentMethod || 'UPI').toLowerCase()})`,
    amount: Number(rawTx.amount || 0),
    type: rawTx.type === 'credit' ? 'credit' : 'debit',
    category: rawTx.category || 'General',
    paymentMethod: rawTx.paymentMethod || 'UPI',
    cardOrAccount: rawTx.cardOrAccount || 'Cred UPI',
    cardLast4: rawTx.cardLast4 || '',
    referenceId: rawTx.referenceId || '',
    notes: rawTx.notes || '',
    createdAt: rawTx.createdAt || Date.now(),
    fingerprint,
  };

  // Check for duplicate fingerprint
  const isDuplicate = existing.some(e => e.fingerprint === fingerprint || (e.id === tx.id));
  if (isDuplicate) {
    return { success: false, duplicate: true, tx };
  }

  // Update in-memory cache synchronously
  inMemoryTransactions = [tx, ...existing];
  saveLocalStorageBackup(inMemoryTransactions);
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  // Match credit card by last 4 digits and auto-deduct limit for new transactions
  try {
    await matchAndAdjustCardForTransaction(tx, true);
  } catch (e) {
    console.warn('Card limit match error:', e);
  }

  const db = await getDb();
  if (db) {
    try {
      const dbTx = db.transaction(TX_STORE, 'readwrite');
      const store = dbTx.objectStore(TX_STORE);
      store.put(tx);
    } catch (e) {
      console.warn('IndexedDB put error:', e);
    }
  }

  return { success: true, duplicate: false, tx };
}

export async function addKredoTransactionsBatch(txList = []) {
  const existing = await getKredoTransactions();
  const existingFingerprints = new Set(existing.map(e => e.fingerprint));
  const existingIds = new Set(existing.map(e => e.id));

  const added = [];
  const duplicates = [];
  const invalid = [];

  const db = await getDb();
  let writeTx = null;
  let writeStore = null;
  if (db) {
    try {
      writeTx = db.transaction(TX_STORE, 'readwrite');
      writeStore = writeTx.objectStore(TX_STORE);
    } catch (e) {
      console.warn('DB batch error:', e);
    }
  }

  for (const raw of txList) {
    if (!raw || isNaN(Number(raw.amount))) {
      invalid.push(raw);
      continue;
    }

    const fingerprint = computeTransactionFingerprint(raw);
    if (existingFingerprints.has(fingerprint) || (raw.id && existingIds.has(raw.id))) {
      duplicates.push({ ...raw, reason: 'Duplicate signature or Reference ID' });
      continue;
    }

    const normalized = {
      id: raw.id || 'krtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      date: raw.date || new Date().toISOString().slice(0, 10),
      time: raw.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      merchant: raw.merchant || 'Expense Item',
      displaySub: raw.displaySub || `${(raw.merchant || 'Expense').toLowerCase()} (${(raw.paymentMethod || 'UPI').toLowerCase()})`,
      amount: Math.abs(Number(raw.amount || 0)),
      type: String(raw.type || '').toLowerCase().includes('credit') || String(raw.type || '').toLowerCase().includes('income') ? 'credit' : 'debit',
      category: raw.category || 'General',
      paymentMethod: raw.paymentMethod || 'UPI',
      cardOrAccount: raw.cardOrAccount || 'Account',
      referenceId: raw.referenceId || '',
      notes: raw.notes || '',
      createdAt: raw.createdAt || Date.now(),
      fingerprint,
    };

    added.push(normalized);
    existingFingerprints.add(fingerprint);
    existingIds.add(normalized.id);

    if (writeStore) {
      try {
        writeStore.put(normalized);
      } catch (err) {
        console.warn('Store put failed', err);
      }
    }
  }

  inMemoryTransactions = [...added, ...existing];
  saveLocalStorageBackup(inMemoryTransactions);
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  // Match credit card limits for newly imported records
  try {
    for (const t of added) {
      await matchAndAdjustCardForTransaction(t, true);
    }
  } catch (e) {
    console.warn('Batch card match error:', e);
  }

  return {
    addedCount: added.length,
    duplicateCount: duplicates.length,
    invalidCount: invalid.length,
    added,
    duplicates,
    invalid,
  };
}

export async function updateKredoTransaction(id, updates = {}) {
  const existing = await getKredoTransactions();
  const index = existing.findIndex(e => e.id === id);
  if (index === -1) return { success: false, error: 'Not found' };

  const current = existing[index];
  const updated = {
    ...current,
    ...updates,
    amount: Math.abs(Number(updates.amount !== undefined ? updates.amount : current.amount)),
    type: updates.type || current.type,
    merchant: updates.merchant || current.merchant,
    date: updates.date || current.date,
    category: updates.category || current.category,
    paymentMethod: updates.paymentMethod || current.paymentMethod,
    notes: updates.notes !== undefined ? updates.notes : current.notes,
    displaySub: updates.merchant ? `${updates.merchant.toLowerCase()} (${(updates.paymentMethod || current.paymentMethod || 'UPI').toLowerCase()})` : current.displaySub,
  };
  updated.fingerprint = computeTransactionFingerprint(updated);

  existing[index] = updated;
  inMemoryTransactions = [...existing];
  saveLocalStorageBackup(inMemoryTransactions);

  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(TX_STORE, 'readwrite');
      const store = tx.objectStore(TX_STORE);
      store.put(updated);
    } catch (e) {
      console.warn('DB update error:', e);
    }
  }

  return { success: true, tx: updated };
}

export async function deleteKredoTransaction(id) {
  const existing = await getKredoTransactions();
  const filtered = existing.filter(e => e.id !== id);

  inMemoryTransactions = [...filtered];
  saveLocalStorageBackup(inMemoryTransactions);
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(TX_STORE, 'readwrite');
      tx.objectStore(TX_STORE).delete(id);
    } catch (e) {
      console.warn('DB delete error:', e);
    }
  }

  return true;
}

export async function deleteKredoTransactionsBatch(ids = []) {
  if (!ids || !ids.length) return 0;
  const idSet = new Set(ids);
  const existing = await getKredoTransactions();
  const filtered = existing.filter(e => !idSet.has(e.id));

  inMemoryTransactions = [...filtered];
  saveLocalStorageBackup(inMemoryTransactions);
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(TX_STORE, 'readwrite');
      const store = tx.objectStore(TX_STORE);
      ids.forEach(id => store.delete(id));
    } catch (e) {
      console.warn('DB batch delete error:', e);
    }
  }

  return ids.length;
}

export async function clearAllKredoTransactions() {
  inMemoryTransactions = [];
  saveLocalStorageBackup([]);
  localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(TX_STORE, 'readwrite');
      tx.objectStore(TX_STORE).clear();
    } catch (e) {
      console.warn('DB clear error:', e);
    }
  }
  return true;
}

export function getKredoSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveKredoSettings(updates) {
  const current = getKredoSettings();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save Kredo settings', e);
  }
  return next;
}
