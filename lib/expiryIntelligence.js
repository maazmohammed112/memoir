export const EXPIRY_NOTIFICATION_OFFSETS = [
  [150 * 24 * 60 * 60 * 1000, '5 months'],
  [120 * 24 * 60 * 60 * 1000, '4 months'],
  [90 * 24 * 60 * 60 * 1000, '3 months'],
  [60 * 24 * 60 * 60 * 1000, '2 months'],
  [30 * 24 * 60 * 60 * 1000, '1 month'],
  [10 * 24 * 60 * 60 * 1000, '10 days'],
  [5 * 24 * 60 * 60 * 1000, '5 days'],
  [2 * 24 * 60 * 60 * 1000, '2 days'],
  [1 * 24 * 60 * 60 * 1000, '1 day'],
  [0, 'today'],
];

export function parseExpiryDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Format: MM/YY or MM/YYYY (e.g. "08/28", "8/28", "08/2028", "08 / 28")
  const mmyyMatch = str.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return new Date(year, month - 1, lastDay, 23, 59, 59).getTime();
    }
  }

  // 2. Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59).getTime();
  }

  // 3. Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59).getTime();
  }

  // 4. Fallback: standard Date.parse
  const parsed = new Date(str).getTime();
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return null;
}

export function formatRemainingTime(expiryTimestamp, now = Date.now()) {
  const diffMs = expiryTimestamp - now;
  if (diffMs <= 0) {
    const daysAgo = Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000));
    return {
      text: daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo}d ago`,
      isCritical: true,
      isExpired: true,
      monthsRemaining: 0,
      daysRemaining: 0,
    };
  }

  const totalDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const monthsRemaining = diffMs / (30 * 24 * 60 * 60 * 1000);
  const isCritical = monthsRemaining <= 5.0; // <= 5 months alert window

  const expDate = new Date(expiryTimestamp);
  const nowDate = new Date(now);

  let years = expDate.getFullYear() - nowDate.getFullYear();
  let months = expDate.getMonth() - nowDate.getMonth();
  let days = expDate.getDate() - nowDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(expDate.getFullYear(), expDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let text = '';
  if (years > 0) {
    text = `${years} yr${months > 0 ? ` ${months} mo` : ''} left`;
  } else if (months > 0) {
    text = `${months} mo${days > 0 ? ` ${days} d` : ''} left`;
  } else {
    text = `${totalDays} day${totalDays === 1 ? '' : 's'} left`;
  }

  return {
    text,
    isCritical,
    isExpired: false,
    monthsRemaining,
    daysRemaining: totalDays,
  };
}

export function extractItemExpiry(item, now = Date.now()) {
  if (!item || !item.fields) return null;
  const fields = item.fields;
  const fieldEntries = Object.entries(fields);

  // Search for expiry field
  const expiryEntry = fieldEntries.find(([k]) => {
    const key = k.toLowerCase().replace(/[_-]/g, ' ').trim();
    return /^(expiry date|valid thru|expiry|expires on|valid till|valid up to|policy expiry|renewal date|date of expiry|expires)$/i.test(key) ||
      (/\b(expiry|expires|valid thru|valid till|renewal)\b/i.test(key) && !/\b(reminder|frequency)\b/i.test(key));
  });

  if (!expiryEntry) return null;

  const rawExpiry = String(expiryEntry[1] || '').trim();
  const timestamp = parseExpiryDate(rawExpiry);
  if (!timestamp) return null;

  const status = formatRemainingTime(timestamp, now);

  // Determine if it's a financial card
  const title = String(item.title || '');
  const type = String(item.type || '');
  const cardEntry = fieldEntries.find(([k]) => /\b(card\s*number|debit|credit|account|number)\b/i.test(k));
  const cardNum = cardEntry ? String(cardEntry[1] || '') : '';
  const isCard = /card/i.test(type) || /card/i.test(title) || Boolean(cardNum) || type === 'Finance';

  // Extract last 4 digits if card
  let last4 = '';
  if (cardNum) {
    const digits = String(cardNum).replace(/\D/g, '');
    if (digits.length >= 4) last4 = digits.slice(-4);
  }
  if (!last4) {
    const titleMatch = title.match(/(\d{4})/);
    if (titleMatch) last4 = titleMatch[1];
  }

  // Extract bank / issuer
  const bankEntry = fieldEntries.find(([k]) => /^(bank|bank\s*name|issuer|provider)$/i.test(k.trim()));
  const bank = bankEntry ? String(bankEntry[1] || '') : '';

  // Extract document number if document
  const docEntry = fieldEntries.find(([k]) => /^(document\s*number|passport\s*number|license\s*number|policy\s*number|id\s*number|doc\s*#)$/i.test(k.trim()));
  const docNum = docEntry ? String(docEntry[1] || '') : '';

  return {
    itemId: item.id,
    title: item.title,
    type: item.type,
    expiryField: expiryEntry[0],
    rawExpiry,
    expiryTimestamp: timestamp,
    status,
    isCard,
    last4,
    bank,
    docNum,
  };
}

