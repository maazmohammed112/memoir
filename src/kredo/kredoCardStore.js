/**
 * KREDO — Credit Card Vault & Dynamic Limit Engine
 * Manages credit cards, auto-calculates used limit and utilization rate,
 * computes bill generation & payment due countdowns,
 * and matches incoming transactions by last 4 digits to auto-adjust limits.
 */

const CARD_STORAGE_KEY = 'kredo_credit_cards_v1';
const CARD_DB_STORE = 'credit_cards';

let inMemoryCards = null;

export const DEFAULT_CARD_GRADIENTS = [
  { id: 'obsidian', name: 'Obsidian Black', background: 'linear-gradient(135deg, #141416 0%, #050505 100%)', text: '#ffffff', chip: '#d4af37' },
  { id: 'cobalt', name: 'Electric Cobalt', background: 'linear-gradient(135deg, #0000ff 0%, #00006e 100%)', text: '#ffffff', chip: '#ffffff' },
  { id: 'platinum', name: 'Titanium Silver', background: 'linear-gradient(135deg, #2b2e3a 0%, #1a1c23 100%)', text: '#f0f2f5', chip: '#e0e0ff' },
  { id: 'emerald', name: 'Imperial Emerald', background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', text: '#ffffff', chip: '#34d399' },
  { id: 'gold', name: 'Royal Gold', background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', text: '#fef3c7', chip: '#f59e0b' },
];

function getStoredCards() {
  try {
    const raw = localStorage.getItem(CARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredCards(cards) {
  try {
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.warn('Failed to save credit cards to localStorage:', e);
  }
}

import { resolveFinancialStatus } from './kredoAnalytics.js';

/**
 * Normalizes and calculates limits & utilization
 */
export function enrichCardData(card) {
  const totalLimit = Math.max(0, Number(card.totalLimit || 0));
  const currentLimit = Math.max(0, Number(card.currentLimit !== undefined ? card.currentLimit : totalLimit));
  const usedLimit = Math.max(0, totalLimit - currentLimit);
  const utilization = totalLimit > 0 ? Math.min(100, Math.round((usedLimit / totalLimit) * 100)) : 0;

  // Extract last 4 digits
  let last4 = String(card.last4 || '').replace(/\D/g, '').slice(-4);
  if (!last4 && card.cardNumber) {
    const digits = String(card.cardNumber).replace(/\D/g, '');
    last4 = digits.slice(-4);
  }

  // Normalize card network
  let cardNetwork = String(card.cardNetwork || card.network || card.type || '').trim();
  if (!cardNetwork) {
    const lowerName = String(card.cardName || '').toLowerCase();
    if (lowerName.includes('visa')) cardNetwork = 'Visa';
    else if (lowerName.includes('mastercard') || lowerName.includes('master')) cardNetwork = 'Mastercard';
    else if (lowerName.includes('rupay')) cardNetwork = 'RuPay';
    else if (lowerName.includes('amex') || lowerName.includes('american express')) cardNetwork = 'Amex';
    else if (lowerName.includes('diners')) cardNetwork = 'Diners Club';
  }

  // Calculate Due Date & Bill Generation countdown
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const billingDay = parseInt(card.billDay, 10) || 15;
  const dueDay = parseInt(card.dueDay, 10) || 5;

  let daysToDue = 0;
  // Compute accurate days to due date
  if (dueDay >= currentDay) {
    daysToDue = dueDay - currentDay;
  } else {
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    daysToDue = (daysInCurrentMonth - currentDay) + dueDay;
  }

  const finStatus = resolveFinancialStatus({
    status: card.status || (card.isOverdue ? 'overdue' : (daysToDue === 0 ? 'due today' : (daysToDue <= 3 ? 'due soon' : 'upcoming'))),
    dueDay,
    daysToDue,
    billDay: billingDay,
    nature: 'Bill',
    category: 'Credit Card Bill',
    merchant: card.cardName || `${card.bank} Credit Card`,
    bank: card.bank,
    cardLast4: last4,
    cardOrAccount: card.cardName,
    cardNetwork,
    amount: usedLimit,
    amountDue: usedLimit,
  });

  const dueBadge = finStatus.badgeLabel;
  let dueBadgeColor = 'var(--kredo-status-gray-text)';
  if (finStatus.tier === 'overdue') dueBadgeColor = 'var(--kredo-status-red-text)';
  else if (finStatus.tier === 'due-today' || finStatus.tier === 'due-soon') dueBadgeColor = 'var(--kredo-status-orange-text)';
  else if (finStatus.tier === 'completed') dueBadgeColor = 'var(--kredo-status-green-text)';

  return {
    ...card,
    last4,
    bank: card.bank || 'Bank',
    cardNetwork: cardNetwork || 'Credit Card',
    totalLimit,
    currentLimit,
    usedLimit,
    utilization,
    billDay: billingDay,
    dueDay,
    daysToDue,
    dueBadge,
    dueBadgeColor,
    financialStatus: finStatus,
  };
}

export async function getCreditCards() {
  if (inMemoryCards !== null) {
    return [...inMemoryCards];
  }
  const raw = getStoredCards();
  inMemoryCards = raw.map(enrichCardData);
  return [...inMemoryCards];
}

export async function addCreditCard(rawCard) {
  const cards = await getCreditCards();
  const id = rawCard.id || 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  const enriched = enrichCardData({
    ...rawCard,
    id,
    createdAt: Date.now(),
  });

  const updated = [enriched, ...cards];
  inMemoryCards = updated;
  saveStoredCards(inMemoryCards);
  return enriched;
}

export async function updateCreditCard(id, updates) {
  const cards = await getCreditCards();
  const index = cards.findIndex(c => c.id === id);
  if (index === -1) return { success: false, error: 'Card not found' };

  const current = cards[index];
  const updatedCard = enrichCardData({
    ...current,
    ...updates,
    id,
  });

  cards[index] = updatedCard;
  inMemoryCards = [...cards];
  saveStoredCards(inMemoryCards);
  return { success: true, card: updatedCard };
}

export async function deleteCreditCard(id) {
  const cards = await getCreditCards();
  const filtered = cards.filter(c => c.id !== id);
  inMemoryCards = [...filtered];
  saveStoredCards(inMemoryCards);
  return true;
}

/**
 * Match a newly added/imported transaction to a credit card by last 4 digits,
 * bank + network, or linkedBillId, and automatically adjusts the current/available limit.
 */
export async function matchAndAdjustCardForTransaction(tx, isNew = true) {
  if (!isNew || !tx || !tx.amount) return null;

  const cards = await getCreditCards();
  if (cards.length === 0) return null;

  // Search criteria for last 4 digits
  const candidateLast4 = String(tx.cardLast4 || tx.last4 || '').trim().replace(/\D/g, '').slice(-4);
  const cardOrAccount = String(tx.cardOrAccount || tx.merchant || tx.notes || '').toLowerCase();
  const txBank = String(tx.bank || '').toLowerCase();
  const txNetwork = String(tx.cardNetwork || '').toLowerCase();
  const linkedBillId = String(tx.linkedBillId || '').toLowerCase();

  let matchedCard = null;

  // 1. Exact last 4 match
  if (candidateLast4 && candidateLast4.length === 4) {
    matchedCard = cards.find(c => c.last4 === candidateLast4);
  }

  // 2. Linked Bill ID match (e.g. BILL/AXIS/0123-MAR)
  if (!matchedCard && linkedBillId) {
    matchedCard = cards.find(c => {
      if (c.last4 && linkedBillId.includes(c.last4)) return true;
      if (c.id && linkedBillId.includes(c.id.toLowerCase())) return true;
      return false;
    });
  }

  // 3. Bank & Card Network match
  if (!matchedCard && txBank && (txNetwork || tx.paymentMethod === 'Credit Card')) {
    matchedCard = cards.find(c => {
      const bMatch = String(c.bank || '').toLowerCase().includes(txBank) || txBank.includes(String(c.bank || '').toLowerCase());
      const nMatch = txNetwork ? String(c.cardNetwork || '').toLowerCase().includes(txNetwork) : true;
      return bMatch && nMatch;
    });
  }

  // 4. Card name or Account substring match
  if (!matchedCard) {
    matchedCard = cards.find(c => {
      if (c.last4 && cardOrAccount.includes(c.last4)) return true;
      const bankName = String(c.bank || '').toLowerCase();
      const cardName = String(c.cardName || '').toLowerCase();
      if (cardName && cardOrAccount.includes(cardName)) return true;
      if (bankName && cardOrAccount.includes(bankName) && (cardOrAccount.includes('card') || cardOrAccount.includes('credit'))) return true;
      return false;
    });
  }

  if (!matchedCard) return null;

  const amt = Number(tx.amount || 0);
  let newCurrentLimit = matchedCard.currentLimit;

  if (tx.type === 'debit') {
    // Spending on credit card decreases available current limit
    newCurrentLimit = Math.max(0, matchedCard.currentLimit - amt);
  } else if (tx.type === 'credit') {
    // Bill payment or refund increases available limit up to total limit
    newCurrentLimit = Math.min(matchedCard.totalLimit, matchedCard.currentLimit + amt);
  }

  await updateCreditCard(matchedCard.id, { currentLimit: newCurrentLimit });

  return {
    matched: true,
    cardId: matchedCard.id,
    cardName: matchedCard.cardName,
    last4: matchedCard.last4,
    previousLimit: matchedCard.currentLimit,
    newCurrentLimit,
  };
}
