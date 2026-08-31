/**
 * KREDO — Executive Financial Intelligence & Hierarchical Analytics Engine
 * Provides multi-field search, month/week/day hierarchical grouping,
 * dynamic metric aggregations, burn rate forecasting, and local AI intelligence.
 */

// Format Indian Rupee currency standard
export function formatINR(val, includeSymbol = true) {
  const num = Math.round(Number(val) || 0);
  const formatted = num.toLocaleString('en-IN');
  return includeSymbol ? `₹${formatted}` : formatted;
}

export function formatINRDecimal(val, includeSymbol = true) {
  const num = Number(val) || 0;
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return includeSymbol ? `₹${formatted}` : formatted;
}

// Convert any 24h or arbitrary time string into standard 12-hour AM/PM format (e.g. 9:00 PM)
export function format12HourTime(rawTime = '') {
  if (!rawTime) return '';
  const str = String(rawTime).trim();
  if (/am|pm/i.test(str)) {
    return str.toUpperCase();
  }
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }
  return str;
}

export const DATE_RANGE_MODES = [
  { id: 'all', label: 'All Time' },
  { id: 'ytd', label: 'Year to Date' },
  { id: 'this_month', label: 'This Month' },
  { id: 'prev_month', label: 'Last Month' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'custom', label: 'Custom Range' },
];

/**
 * Resolves intelligent status-based highlight and financial classification
 * Clean outline-only design tokens, precise reason sentences, zero guessing.
 *
 * Tiers:
 * - 'completed': Subtle Green outline (Normal completed/settled transactions)
 * - 'upcoming': Neutral Gray outline (Scheduled upcoming bills / due dates > 3 days)
 * - 'due-soon': Vibrant Orange outline (Due within 3 days)
 * - 'due-today': Vibrant Orange outline (Due today)
 * - 'overdue': High-contrast Red outline (Payment past due date)
 * - 'flagged': Amber outline (Transactions requiring review or validation)
 */
export function resolveFinancialStatus(item = {}, options = {}) {
  if (!item) return {
    tier: 'completed',
    badgeLabel: 'COMPLETED',
    outlineClass: 'kredo-status-outline-completed',
    highlightReason: 'Completed transaction.',
    daysToDue: null,
    dueDate: '',
    dueDay: null,
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    isUpcoming: false,
    isCompleted: true,
    isFlagged: false,
    reviewFlag: '',
    reviewReason: '',
    linkedBillId: '',
    status: 'Completed',
  };

  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const rawStatus = String(item.status || '').trim();
  const statusLower = rawStatus.toLowerCase();
  const rawNature = String(item.nature || '').trim();
  const natureLower = rawNature.toLowerCase();
  const rawCat = String(item.category || '').trim();
  const catLower = rawCat.toLowerCase();
  const rawFlag = String(item.reviewFlag || '').trim();
  const flagLower = rawFlag.toLowerCase();
  const isFlagged = Boolean(rawFlag && flagLower !== 'no' && flagLower !== 'false' && flagLower !== 'clear' && flagLower !== 'verified' && flagLower !== 'none');
  const reviewReason = String(item.reviewReason || '').trim();

  // Extract / Calculate Due Date & Days to Due
  let dueDateStr = String(item.dueDate || item.dueAt || '').trim();
  let dueDay = item.dueDay !== undefined && item.dueDay !== null && item.dueDay !== '' ? parseInt(item.dueDay, 10) : null;
  let daysToDue = null;
  let parsedDueDateObj = null;

  if (item.daysToDue !== undefined && item.daysToDue !== null && Number.isFinite(Number(item.daysToDue))) {
    daysToDue = Number(item.daysToDue);
  }

  // Parse dueDate string if present
  if (dueDateStr) {
    // Check ISO or YYYY-MM-DD
    const isoMatch = dueDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      parsedDueDateObj = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    } else {
      const ddmmyyyy = dueDateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (ddmmyyyy) {
        parsedDueDateObj = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
      } else {
        // e.g. "24th Mar", "18th Mar 2026"
        const ordinalMatch = dueDateStr.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)(?:\s+(\d{4}))?/i);
        if (ordinalMatch) {
          const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
          const mStr = ordinalMatch[2].toLowerCase().slice(0, 3);
          if (monthMap[mStr] !== undefined) {
            const yr = ordinalMatch[3] ? Number(ordinalMatch[3]) : refDate.getFullYear();
            parsedDueDateObj = new Date(yr, monthMap[mStr], Number(ordinalMatch[1]));
          }
        } else {
          const tryParse = new Date(dueDateStr);
          if (!isNaN(tryParse.getTime())) {
            parsedDueDateObj = tryParse;
          }
        }
      }
    }
  } else if (dueDay && !isNaN(dueDay)) {
    // If only day of month is provided (e.g. 5 for 5th of month)
    const currentDay = refDate.getDate();
    const currentMonth = refDate.getMonth();
    const currentYear = refDate.getFullYear();
    if (dueDay >= currentDay) {
      parsedDueDateObj = new Date(currentYear, currentMonth, dueDay);
    } else {
      parsedDueDateObj = new Date(currentYear, currentMonth + 1, dueDay);
    }
  }

  // If parsedDueDateObj exists and daysToDue wasn't explicitly supplied, compute day difference
  if (parsedDueDateObj && daysToDue === null) {
    const startOfRef = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
    const startOfDue = new Date(parsedDueDateObj.getFullYear(), parsedDueDateObj.getMonth(), parsedDueDateObj.getDate()).getTime();
    daysToDue = Math.round((startOfDue - startOfRef) / 86400000);
  }

  const isCompletedExplicit = ['completed', 'settled', 'cleared', 'success', 'paid', 'executed'].includes(statusLower);
  const isOverdueExplicit = ['overdue', 'missed', 'unpaid past due', 'past due', 'failed'].includes(statusLower);
  const isDueTodayExplicit = ['due today', 'due-today', 'duetoday'].includes(statusLower);
  const isDueSoonExplicit = ['due soon', 'due-soon', 'duesoon', 'urgent'].includes(statusLower);
  const isUpcomingExplicit = ['upcoming', 'scheduled', 'pending', 'unbilled', 'generated', 'active'].includes(statusLower);
  const isBillObligation = Boolean(item.linkedBillId || natureLower.includes('bill') || natureLower.includes('subscription') || catLower.includes('bill') || catLower.includes('util') || dueDateStr || dueDay !== null);

  let tier = 'completed';
  let badgeLabel = 'COMPLETED';
  let outlineClass = 'kredo-status-outline-completed';
  let highlightReason = 'Completed & Settled: Transaction processed and reconciled.';
  let isOverdue = false;
  let isDueToday = false;
  let isDueSoon = false;
  let isUpcoming = false;

  const formattedDate = item.date || (parsedDueDateObj ? parsedDueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  // 1. Check for OVERDUE
  if (!isCompletedExplicit && (isOverdueExplicit || (daysToDue !== null && daysToDue < 0))) {
    tier = 'overdue';
    isOverdue = true;
    const absDays = daysToDue !== null ? Math.abs(daysToDue) : 0;
    badgeLabel = 'OVERDUE';
    outlineClass = 'kredo-status-outline-overdue';
    highlightReason = dueDateStr || parsedDueDateObj
      ? `Overdue: Payment deadline passed ${absDays > 0 ? `${absDays} day${absDays === 1 ? '' : 's'} ago` : ''} on ${dueDateStr || parsedDueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Immediate settlement required.`
      : 'Overdue: Payment deadline has elapsed. Please verify settlement.';
  }
  // 2. Check for DUE TODAY
  else if (!isCompletedExplicit && (isDueTodayExplicit || (daysToDue !== null && daysToDue === 0))) {
    tier = 'due-today';
    isDueToday = true;
    badgeLabel = 'DUE TODAY';
    outlineClass = 'kredo-status-outline-due-today';
    highlightReason = 'Due Today: Payment is due before 11:59 PM today. Settle now to avoid late charges.';
  }
  // 3. Check for DUE SOON (1 to 3 days)
  else if (!isCompletedExplicit && (isDueSoonExplicit || (daysToDue !== null && daysToDue > 0 && daysToDue <= 3))) {
    tier = 'due-soon';
    isDueSoon = true;
    const dayCount = daysToDue !== null ? daysToDue : 3;
    badgeLabel = `DUE IN ${dayCount} ${dayCount === 1 ? 'DAY' : 'DAYS'}`;
    outlineClass = 'kredo-status-outline-due-soon';
    highlightReason = `Due Soon: Payment deadline in ${dayCount} day${dayCount === 1 ? '' : 's'}${dueDateStr ? ` on ${dueDateStr}` : ''}.`;
  }
  // 4. Check for UPCOMING BILL / SCHEDULED ITEM (>3 days or pending/scheduled bill)
  else if (!isCompletedExplicit && (isUpcomingExplicit || (daysToDue !== null && daysToDue > 3) || isBillObligation)) {
    tier = 'upcoming';
    isUpcoming = true;
    badgeLabel = 'UPCOMING';
    outlineClass = 'kredo-status-outline-upcoming';
    if (daysToDue !== null && daysToDue > 3) {
      highlightReason = `Upcoming Bill: Scheduled for payment in ${daysToDue} days${dueDateStr ? ` on ${dueDateStr}` : ''}.`;
    } else if (dueDateStr) {
      highlightReason = `Upcoming Bill: Scheduled due date on ${dueDateStr}.`;
    } else {
      highlightReason = 'Upcoming Bill: Scheduled regular payment obligation.';
    }
  }
  // 5. Normal COMPLETED / SETTLED (Default)
  else {
    tier = 'completed';
    badgeLabel = statusLower === 'settled' ? 'SETTLED' : 'COMPLETED';
    outlineClass = 'kredo-status-outline-completed';
    if (item.type === 'credit') {
      highlightReason = 'Completed & Settled: Inflow credit cleared and reconciled.';
    } else if (item.linkedBillId) {
      highlightReason = `Completed & Settled: Paid against bill ${item.linkedBillId}.`;
    } else {
      highlightReason = `Completed & Settled: Transaction cleared successfully${formattedDate ? ` on ${formattedDate}` : ''}.`;
    }
  }

  // Append Flag details if flagged
  if (isFlagged) {
    highlightReason += ` [Review Flag: ${rawFlag}${reviewReason ? ` — ${reviewReason}` : ''}]`;
  }

  return {
    tier,
    badgeLabel,
    outlineClass,
    highlightReason,
    daysToDue,
    dueDate: dueDateStr || (parsedDueDateObj ? parsedDueDateObj.toISOString().slice(0, 10) : ''),
    dueDay,
    isOverdue,
    isDueToday,
    isDueSoon,
    isUpcoming,
    isCompleted: tier === 'completed',
    isFlagged,
    reviewFlag: rawFlag,
    reviewReason,
    linkedBillId: item.linkedBillId || '',
    status: rawStatus || (tier === 'completed' ? 'Completed' : tier === 'overdue' ? 'Overdue' : tier === 'due-today' ? 'Due Today' : tier === 'due-soon' ? 'Due Soon' : 'Upcoming'),
  };
}

export function parseTxDate(tx) {
  if (!tx) return new Date();

  // 1. Try parsing tx.date first (standardized ISO, Sheet format, or text dates)
  if (tx.date) {
    const str = String(tx.date).trim();
    // Match YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }
    // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (ddmmyyyy) {
      return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
    }
    // Match GViz Date(Y,M,D)
    const gvizMatch = str.match(/Date\((\d+),(\d+),(\d+)/i);
    if (gvizMatch) {
      return new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3]));
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 2. Fallback to createdAt timestamp
  if (tx.createdAt && !isNaN(Number(tx.createdAt))) {
    return new Date(Number(tx.createdAt));
  }

  return new Date();
}

/**
 * Extracts unique months available in transaction history
 */
export function getAvailableMonths(transactions = []) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const map = new Map();

  for (const tx of transactions) {
    const d = parseTxDate(tx);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) {
      map.set(key, { key, label, year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }
    map.get(key).count++;
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  return sorted;
}

/**
 * Multi-dimensional search and filter engine with Time Presets, Months, Weeks, Direction, Category, Channels, Banks, Payment Apps, Card Networks, Nature, Status, Review Flags, and Linked Bills
 */
export function filterTransactions(transactions = [], filters = {}) {
  const {
    month = 'all',
    query = '',
    type = 'all',
    category = 'all',
    paymentMethod = 'all',
    bank = 'all',
    paymentApp = 'all',
    cardNetwork = 'all',
    nature = 'all',
    status = 'all',
    reviewFlag = 'all',
    linkedBill = 'all',
    dateRangeMode = 'all',
    customStart = null,
    customEnd = null,
    selectedWeek = 'all',
  } = filters;

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return transactions.filter(tx => {
    if (!tx) return false;
    const d = parseTxDate(tx);

    // 1. Time Presets & Range Filtering
    if (dateRangeMode === '7d') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      if (d < sevenDaysAgo) return false;
    } else if (dateRangeMode === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      if (d < thirtyDaysAgo) return false;
    } else if (dateRangeMode === 'this_month') {
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
    } else if (dateRangeMode === 'prev_month') {
      const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
      if (d.getFullYear() !== prevMonthDate.getFullYear() || d.getMonth() !== prevMonthDate.getMonth()) return false;
    } else if (dateRangeMode === 'ytd') {
      if (d.getFullYear() !== currentYear) return false;
    } else if (dateRangeMode === 'today') {
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth || d.getDate() !== now.getDate()) return false;
    } else if (dateRangeMode === 'custom' && (customStart || customEnd)) {
      const dTime = d.getTime();
      const sTime = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : 0;
      const eTime = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : Infinity;
      if (dTime < sTime || dTime > eTime) return false;
    }

    // 2. Explicit Month filter (e.g. '2026-08') if not 'all'
    if (month && month !== 'all') {
      const txMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (txMonthKey !== month) {
        return false;
      }
    }

    // 3. Cashflow Direction (Type: all, debit, credit)
    if (type !== 'all' && tx.type !== type) {
      return false;
    }

    // 4. Category filter
    if (category !== 'all' && tx.category !== category) {
      return false;
    }

    // 5. Payment method filter
    if (paymentMethod !== 'all') {
      const mStr = String(tx.paymentMethod || '').toLowerCase();
      const filterStr = String(paymentMethod).toLowerCase();
      if (!mStr.includes(filterStr)) {
        return false;
      }
    }

    // 6. Bank filter
    if (bank !== 'all') {
      const bStr = String(tx.bank || '').toLowerCase();
      const filterBank = String(bank).toLowerCase();
      if (!bStr.includes(filterBank)) {
        return false;
      }
    }

    // 7. Payment App filter
    if (paymentApp !== 'all') {
      const pStr = String(tx.paymentApp || '').toLowerCase();
      const filterApp = String(paymentApp).toLowerCase();
      if (!pStr.includes(filterApp)) {
        return false;
      }
    }

    // 8. Card Network filter
    if (cardNetwork !== 'all') {
      const nStr = String(tx.cardNetwork || '').toLowerCase();
      const filterNet = String(cardNetwork).toLowerCase();
      if (!nStr.includes(filterNet)) {
        return false;
      }
    }

    // 9. Nature filter
    if (nature !== 'all') {
      const natStr = String(tx.nature || '').toLowerCase();
      const filterNat = String(nature).toLowerCase();
      if (!natStr.includes(filterNat)) {
        return false;
      }
    }

    // 10. Status filter
    if (status !== 'all') {
      const sStr = String(tx.status || '').toLowerCase();
      const filterStat = String(status).toLowerCase();
      if (!sStr.includes(filterStat)) {
        return false;
      }
    }

    // 11. Review Flag filter
    if (reviewFlag !== 'all') {
      const rFlag = String(tx.reviewFlag || '').toLowerCase();
      const isFlagged = Boolean(rFlag && rFlag !== 'no' && rFlag !== 'false' && rFlag !== 'clear' && rFlag !== 'verified');
      if (reviewFlag === 'flagged' || reviewFlag === 'needs review') {
        if (!isFlagged) return false;
      } else if (reviewFlag === 'clear' || reviewFlag === 'verified') {
        if (isFlagged) return false;
      }
    }

    // 12. Linked Bill filter
    if (linkedBill !== 'all') {
      const hasBill = Boolean(tx.linkedBillId && String(tx.linkedBillId).trim().length > 0);
      if (linkedBill === 'linked' && !hasBill) return false;
      if (linkedBill === 'unlinked' && hasBill) return false;
    }

    // 13. Query search across all 24 columns
    if (normalizedQuery) {
      const matchMerchant = String(tx.merchant || '').toLowerCase().includes(normalizedQuery);
      const matchSub = String(tx.displaySub || '').toLowerCase().includes(normalizedQuery);
      const matchNotes = String(tx.notes || '').toLowerCase().includes(normalizedQuery);
      const matchRef = String(tx.referenceId || '').toLowerCase().includes(normalizedQuery);
      const matchTxId = String(tx.transactionId || '').toLowerCase().includes(normalizedQuery);
      const matchCategory = String(tx.category || '').toLowerCase().includes(normalizedQuery);
      const matchMethod = String(tx.paymentMethod || '').toLowerCase().includes(normalizedQuery);
      const matchBank = String(tx.bank || '').toLowerCase().includes(normalizedQuery);
      const matchApp = String(tx.paymentApp || '').toLowerCase().includes(normalizedQuery);
      const matchNet = String(tx.cardNetwork || '').toLowerCase().includes(normalizedQuery);
      const matchNature = String(tx.nature || '').toLowerCase().includes(normalizedQuery);
      const matchReviewReason = String(tx.reviewReason || '').toLowerCase().includes(normalizedQuery);
      const matchBillId = String(tx.linkedBillId || '').toLowerCase().includes(normalizedQuery);
      const matchAccount = String(tx.cardOrAccount || '').toLowerCase().includes(normalizedQuery);
      const matchLast4 = String(tx.cardLast4 || '').includes(normalizedQuery);
      const matchAmount = String(tx.amount || '').includes(normalizedQuery);
      const matchRawMsg = String(tx.rawMessage || '').toLowerCase().includes(normalizedQuery);
      const matchSource = String(tx.source || '').toLowerCase().includes(normalizedQuery);

      if (
        !matchMerchant && !matchSub && !matchNotes && !matchRef && !matchTxId &&
        !matchCategory && !matchMethod && !matchBank && !matchApp && !matchNet &&
        !matchNature && !matchReviewReason && !matchBillId && !matchAccount &&
        !matchLast4 && !matchAmount && !matchRawMsg && !matchSource
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Backwards-compatible date filter
 */
export function filterTransactionsByDate(transactions = [], rangeMode = 'all', customStart = null, customEnd = null) {
  return filterTransactions(transactions, { dateRangeMode: rangeMode, customStart, customEnd });
}

/**
 * HIERARCHICAL TIME GROUPING: Month -> Week -> Day -> Transactions
 * Isolates each week cleanly, computes weekly subtotals, and groups each day with daily subtotals.
 */
export function groupTransactionsHierarchically(transactions = []) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Sort transactions chronologically descending
  const sorted = [...transactions].sort((a, b) => {
    const timeA = a.createdAt || Date.parse(`${a.date}T${a.time || '00:00:00'}`) || 0;
    const timeB = b.createdAt || Date.parse(`${b.date}T${b.time || '00:00:00'}`) || 0;
    return timeB - timeA;
  });

  // Group into Weeks based on calendar day brackets
  const weekMap = new Map();

  for (const tx of sorted) {
    const d = parseTxDate(tx);
    const dayOfMonth = d.getDate();
    const monthIndex = d.getMonth();
    const monthShort = monthNames[monthIndex];
    const year = d.getFullYear();

    // Determine week index & date bounds
    let weekNumber = 1;
    let weekStartDay = 1;
    let weekEndDay = 7;

    if (dayOfMonth >= 8 && dayOfMonth <= 14) {
      weekNumber = 2;
      weekStartDay = 8;
      weekEndDay = 14;
    } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
      weekNumber = 3;
      weekStartDay = 15;
      weekEndDay = 21;
    } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
      weekNumber = 4;
      weekStartDay = 22;
      weekEndDay = 28;
    } else if (dayOfMonth >= 29) {
      weekNumber = 5;
      weekStartDay = 29;
      const lastDayOfM = new Date(year, monthIndex + 1, 0).getDate();
      weekEndDay = lastDayOfM;
    }

    const weekKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-W${weekNumber}`;
    const weekLabel = `Week ${weekNumber} · ${String(weekStartDay).padStart(2, '0')} – ${String(weekEndDay).padStart(2, '0')} ${monthShort} ${year}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        key: weekKey,
        label: weekLabel,
        weekNumber,
        year,
        monthIndex,
        totalDebit: 0,
        totalCredit: 0,
        transactionCount: 0,
        days: new Map(),
      });
    }

    const week = weekMap.get(weekKey);
    const amt = Number(tx.amount || 0);

    if (tx.type === 'credit') {
      week.totalCredit += amt;
    } else {
      week.totalDebit += amt;
    }
    week.transactionCount++;

    // Day grouping inside Week
    const dateKey = tx.date || d.toISOString().slice(0, 10);
    const dayLabel = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[monthIndex]} ${year}`;

    if (!week.days.has(dateKey)) {
      week.days.set(dateKey, {
        dateKey,
        dayLabel,
        dayOfMonth: d.getDate(),
        totalDebit: 0,
        totalCredit: 0,
        transactions: [],
      });
    }

    const day = week.days.get(dateKey);
    if (tx.type === 'credit') {
      day.totalCredit += amt;
    } else {
      day.totalDebit += amt;
    }
    day.transactions.push(tx);
  }

  // Convert map to structured arrays
  const result = Array.from(weekMap.values()).map(w => ({
    ...w,
    days: Array.from(w.days.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
  }));

  return result;
}

/**
 * Calculates executive KPI analytics, time-series velocity periods, cumulative burn, and ranking models across all 24 dimensions
 */
export function computeKredoAnalytics(allTransactions = [], filteredTransactions = [], options = {}) {
  const { monthlyBudget = 60000 } = options;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalDebits = 0;
  let totalCredits = 0;
  let debitsCount = 0;
  let creditsCount = 0;

  let highestPaymentPeriod = null;
  let highestPaymentToday = null;

  const methodStats = {
    UPI: { amount: 0, count: 0 },
    'Credit Card': { amount: 0, count: 0 },
    'Debit Card': { amount: 0, count: 0 },
    'Net Banking': { amount: 0, count: 0 },
    Other: { amount: 0, count: 0 },
  };

  const categoryStats = {};
  const merchantStats = {};
  const bankStats = {};
  const paymentAppStats = {};
  const cardNetworkStats = {};
  const natureStats = {};
  const statusStats = {};
  const periodVelocityMap = {};
  const dailyMap = {};

  const flaggedItems = [];
  const linkedBillItems = [];

  for (const tx of filteredTransactions) {
    if (!tx) continue;
    const amt = Number(tx.amount || 0);
    const isCredit = tx.type === 'credit';
    const d = parseTxDate(tx);
    const isToday = d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === now.getDate();
    const dateKey = tx.date || d.toISOString().slice(0, 10);

    // Track review flags
    const rFlag = String(tx.reviewFlag || '').toLowerCase();
    const isFlagged = Boolean(rFlag && rFlag !== 'no' && rFlag !== 'false' && rFlag !== 'clear' && rFlag !== 'verified');
    if (isFlagged) {
      flaggedItems.push(tx);
    }

    // Track linked bills
    if (tx.linkedBillId && String(tx.linkedBillId).trim().length > 0) {
      linkedBillItems.push(tx);
    }

    if (!periodVelocityMap[dateKey]) {
      periodVelocityMap[dateKey] = { dateKey, label: dateKey.slice(5), debits: 0, credits: 0, count: 0 };
    }
    periodVelocityMap[dateKey].count++;

    if (isCredit) {
      totalCredits += amt;
      creditsCount++;
      periodVelocityMap[dateKey].credits += amt;
    } else {
      totalDebits += amt;
      debitsCount++;
      periodVelocityMap[dateKey].debits += amt;

      if (!highestPaymentPeriod || amt > highestPaymentPeriod.amount) {
        highestPaymentPeriod = {
          amount: amt,
          merchant: tx.merchant || 'Expense',
          date: tx.date || '',
          method: tx.paymentMethod || 'UPI',
        };
      }

      if (isToday) {
        if (!highestPaymentToday || amt > highestPaymentToday.amount) {
          highestPaymentToday = {
            amount: amt,
            merchant: tx.merchant || 'Expense',
            time: tx.time || '',
          };
        }
      }

      // Method Stats
      let normalizedMethod = 'Other';
      const mStr = String(tx.paymentMethod || '').toLowerCase();
      if (mStr.includes('upi')) normalizedMethod = 'UPI';
      else if (mStr.includes('credit') || mStr.includes('card') && !mStr.includes('debit')) normalizedMethod = 'Credit Card';
      else if (mStr.includes('debit')) normalizedMethod = 'Debit Card';
      else if (mStr.includes('net') || mStr.includes('bank') || mStr.includes('neft')) normalizedMethod = 'Net Banking';

      if (!methodStats[normalizedMethod]) methodStats[normalizedMethod] = { amount: 0, count: 0 };
      methodStats[normalizedMethod].amount += amt;
      methodStats[normalizedMethod].count++;

      // Category Stats
      const cat = tx.category || 'General';
      if (!categoryStats[cat]) categoryStats[cat] = { amount: 0, count: 0 };
      categoryStats[cat].amount += amt;
      categoryStats[cat].count++;

      // Merchant Stats
      const merchantName = tx.merchant || 'Unknown Payee';
      if (!merchantStats[merchantName]) merchantStats[merchantName] = { merchant: merchantName, amount: 0, count: 0, category: cat };
      merchantStats[merchantName].amount += amt;
      merchantStats[merchantName].count++;

      // Bank Stats
      if (tx.bank && String(tx.bank).trim()) {
        const bName = String(tx.bank).trim();
        if (!bankStats[bName]) bankStats[bName] = { bank: bName, amount: 0, count: 0 };
        bankStats[bName].amount += amt;
        bankStats[bName].count++;
      }

      // Payment App Stats
      if (tx.paymentApp && String(tx.paymentApp).trim()) {
        const appName = String(tx.paymentApp).trim();
        if (!paymentAppStats[appName]) paymentAppStats[appName] = { paymentApp: appName, amount: 0, count: 0 };
        paymentAppStats[appName].amount += amt;
        paymentAppStats[appName].count++;
      }

      // Card Network Stats
      if (tx.cardNetwork && String(tx.cardNetwork).trim()) {
        const netName = String(tx.cardNetwork).trim();
        if (!cardNetworkStats[netName]) cardNetworkStats[netName] = { cardNetwork: netName, amount: 0, count: 0 };
        cardNetworkStats[netName].amount += amt;
        cardNetworkStats[netName].count++;
      }

      // Nature Stats
      if (tx.nature && String(tx.nature).trim()) {
        const natName = String(tx.nature).trim();
        if (!natureStats[natName]) natureStats[natName] = { nature: natName, amount: 0, count: 0 };
        natureStats[natName].amount += amt;
        natureStats[natName].count++;
      }

      // Status Stats
      const stName = tx.status || 'Completed';
      if (!statusStats[stName]) statusStats[stName] = { status: stName, amount: 0, count: 0 };
      statusStats[stName].amount += amt;
      statusStats[stName].count++;

      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amt;
    }
  }

  // Top Spending Merchants Ranking
  const topMerchants = Object.values(merchantStats)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 7)
    .map(m => ({
      ...m,
      percentage: Math.round((m.amount / (totalDebits || 1)) * 100),
    }));

  // Chronological Time-Series Velocity Buckets (for Dual Bar Chart)
  const velocityPeriods = Object.values(periodVelocityMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Cumulative Spending Trajectory (for Bezier Line Chart)
  let runningCumulative = 0;
  const cumulativeTrajectory = velocityPeriods.map(p => {
    runningCumulative += p.debits;
    return {
      date: p.dateKey,
      label: p.label,
      dailyDebit: p.debits,
      cumulative: runningCumulative,
    };
  });

  // Peak Outflow Day
  let peakDay = null;
  let maxDaySpend = 0;
  for (const [dKey, dAmt] of Object.entries(dailyMap)) {
    if (dAmt > maxDaySpend) {
      maxDaySpend = dAmt;
      peakDay = { date: dKey, amount: dAmt };
    }
  }

  // Monthly breakdown across ALL transactions
  const monthlyTotals = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const tx of allTransactions) {
    if (!tx) continue;
    const d = parseTxDate(tx);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (!monthlyTotals[key]) {
      monthlyTotals[key] = { key, label, monthName: monthNames[d.getMonth()], debits: 0, credits: 0, count: 0 };
    }
    const amt = Number(tx.amount || 0);
    if (tx.type === 'credit') {
      monthlyTotals[key].credits += amt;
    } else {
      monthlyTotals[key].debits += amt;
    }
    monthlyTotals[key].count++;
  }

  // Channel share
  const totalMethodSpend = Object.values(methodStats).reduce((acc, m) => acc + m.amount, 0) || 1;
  const paymentMethodShare = Object.entries(methodStats).map(([method, data]) => ({
    method,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / totalMethodSpend) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Category share
  const categoryShare = Object.entries(categoryStats).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / (totalDebits || 1)) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Bank share
  const totalBankSpend = Object.values(bankStats).reduce((acc, b) => acc + b.amount, 0) || 1;
  const bankShare = Object.entries(bankStats).map(([bank, data]) => ({
    bank,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / totalBankSpend) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Payment App share
  const totalAppSpend = Object.values(paymentAppStats).reduce((acc, a) => acc + a.amount, 0) || 1;
  const paymentAppShare = Object.entries(paymentAppStats).map(([paymentApp, data]) => ({
    paymentApp,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / totalAppSpend) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Card Network share
  const totalNetworkSpend = Object.values(cardNetworkStats).reduce((acc, n) => acc + n.amount, 0) || 1;
  const cardNetworkShare = Object.entries(cardNetworkStats).map(([cardNetwork, data]) => ({
    cardNetwork,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / totalNetworkSpend) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Nature share
  const natureShare = Object.entries(natureStats).map(([nature, data]) => ({
    nature,
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / (totalDebits || 1)) * 100),
  })).sort((a, b) => b.amount - a.amount);

  // Review Flag stats
  const reviewFlagStats = {
    totalFlagged: flaggedItems.length,
    flaggedAmount: flaggedItems.reduce((sum, t) => sum + (t.amount || 0), 0),
    flaggedItems,
  };

  // Linked Bill stats
  const linkedBillStats = {
    totalLinked: linkedBillItems.length,
    totalLinkedCount: linkedBillItems.length,
    linkedAmount: linkedBillItems.reduce((sum, t) => sum + (t.amount || 0), 0),
    linkedItems: linkedBillItems,
  };

  // Average Daily Spend Velocity
  const activeDays = Object.keys(dailyMap).length || 1;
  const dailyAverageSpend = Math.round(totalDebits / activeDays);

  // Financial Health Metrics & Ratios
  const netCashflow = totalCredits - totalDebits;
  const savingsRatio = totalCredits > 0 ? Math.round((netCashflow / totalCredits) * 100) : (totalDebits > 0 ? -100 : 0);
  const expenseToIncomeRatio = totalCredits > 0 ? Math.round((totalDebits / totalCredits) * 100) : 100;
  
  const dayOfMonth = now.getDate() || 1;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthEnd = Math.round((totalDebits / dayOfMonth) * daysInMonth);

  const localAiInsights = generateLocalAiInsights({
    filteredTransactions,
    allTransactions,
    totalDebits,
    totalCredits,
    monthlyBudget,
    paymentMethodShare,
    categoryShare,
    bankShare,
    paymentAppShare,
    cardNetworkShare,
    reviewFlagStats,
    linkedBillStats,
    highestPaymentPeriod,
  });

  return {
    totalDebits,
    totalCredits,
    netCashflow,
    savingsRatio,
    expenseToIncomeRatio,
    projectedMonthEnd,
    debitsCount,
    creditsCount,
    highestPaymentPeriod,
    highestPaymentToday,
    peakDay,
    dailyAverageSpend,
    topMerchants,
    velocityPeriods,
    cumulativeTrajectory,
    monthlyTotals: Object.values(monthlyTotals).sort((a, b) => a.key.localeCompare(b.key)),
    paymentMethodShare,
    categoryShare,
    bankShare,
    paymentAppShare,
    cardNetworkShare,
    natureShare,
    reviewFlagStats,
    linkedBillStats,
    dailyMap,
    localAiInsights,
  };
}

/**
 * On-Device Local AI Intelligence generator
 */
function generateLocalAiInsights(params) {
  const {
    filteredTransactions,
    totalDebits,
    totalCredits,
    monthlyBudget,
    paymentMethodShare = [],
    categoryShare = [],
    bankShare = [],
    paymentAppShare = [],
    reviewFlagStats = { totalFlagged: 0, flaggedAmount: 0, flaggedItems: [] },
    linkedBillStats = { totalLinked: 0, linkedAmount: 0 },
  } = params;
  const insights = [];

  // 1. Audit / Review Flag Telemetry
  if (reviewFlagStats && reviewFlagStats.totalFlagged > 0) {
    const reasons = reviewFlagStats.flaggedItems.map(t => t.reviewReason || t.merchant).filter(Boolean);
    insights.push({
      type: 'review',
      tag: 'Audit Flag',
      title: `${reviewFlagStats.totalFlagged} Transaction${reviewFlagStats.totalFlagged === 1 ? '' : 's'} Need Review`,
      desc: `Flagged items totaling ${formatINR(reviewFlagStats.flaggedAmount)} detected (${reasons.slice(0, 2).join(', ')}). Verify details in your ledger.`,
      icon: 'flag',
      color: '#f59e0b',
    });
  }

  // 2. Channel and App Intelligence
  const ccShare = paymentMethodShare.find(p => p.method === 'Credit Card')?.percentage || 0;
  const upiShare = paymentMethodShare.find(p => p.method === 'UPI')?.percentage || 0;

  if (ccShare > upiShare) {
    insights.push({
      type: 'channel',
      tag: 'Smart Maximizer',
      title: 'Credit Card Dominant Spend',
      desc: `${ccShare}% of your outflow is routed via Credit Cards. You maximize rewards and liquidity while settling via autopay.`,
      icon: 'credit-card',
      color: '#00f2fe',
    });
  } else if (upiShare > 0) {
    insights.push({
      type: 'channel',
      tag: 'Instant Velocity',
      title: 'High UPI Frequency',
      desc: `${upiShare}% of payments are direct UPI transfers. Immediate settlement with zero revolving balance risk.`,
      icon: 'zap',
      color: '#00ffa3',
    });
  }

  // 3. Payment App Dominance
  if (paymentAppShare.length > 0 && paymentAppShare[0].percentage >= 30) {
    const topApp = paymentAppShare[0];
    insights.push({
      type: 'app',
      tag: 'App Habit',
      title: `${topApp.paymentApp} Preferred App`,
      desc: `${topApp.percentage}% of digital payments (${formatINR(topApp.amount)}) are processed via ${topApp.paymentApp}.`,
      icon: 'smartphone',
      color: '#6366f1',
    });
  }

  // 4. Linked Bill Settlements
  if (linkedBillStats && linkedBillStats.totalLinked > 0) {
    insights.push({
      type: 'bills',
      tag: 'Bill Settlements',
      title: `${linkedBillStats.totalLinked} Bill Payments Linked`,
      desc: `Linked statement settlements totaling ${formatINR(linkedBillStats.linkedAmount)} tracked against billing cycles.`,
      icon: 'receipt_long',
      color: '#0000ff',
    });
  }

  // 5. Category Share
  if (categoryShare.length > 0) {
    const topCat = categoryShare[0];
    insights.push({
      type: 'category',
      tag: 'Wallet Share',
      title: `Top Category: ${topCat.category}`,
      desc: `${topCat.category} represents ${topCat.percentage}% of your current period outflows (${formatINR(topCat.amount)}).`,
      icon: 'pie-chart',
      color: '#ff9900',
    });
  }

  // 6. Subscriptions
  const recurring = detectRecurringCharges(filteredTransactions);
  if (recurring.length > 0) {
    const totalRecurring = recurring.reduce((acc, r) => acc + r.amount, 0);
    insights.push({
      type: 'recurring',
      tag: 'Active Subscriptions',
      title: `${recurring.length} Recurring Charges Detected`,
      desc: `Identified ${recurring.map(r => r.merchant).slice(0, 3).join(', ')} totaling ${formatINR(totalRecurring)}.`,
      icon: 'repeat',
      color: '#b055f6',
    });
  }

  // 7. Budget Velocity Pace
  const now = new Date();
  const dayOfMonth = now.getDate() || 1;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyPace = totalDebits / dayOfMonth;
  const projectedMonthEnd = Math.round(dailyPace * daysInMonth);

  if (projectedMonthEnd > monthlyBudget) {
    insights.push({
      type: 'alert',
      tag: 'Pace Warning',
      title: 'Burn Velocity Above Budget',
      desc: `At current pace of ${formatINR(dailyPace)}/day, month-end projection is ${formatINR(projectedMonthEnd)} vs budget of ${formatINR(monthlyBudget)}.`,
      icon: 'alert-triangle',
      color: '#ff5252',
    });
  } else {
    insights.push({
      type: 'status',
      tag: 'Optimal Pace',
      title: 'Healthy Budget Margin',
      desc: `Projecting ${formatINR(projectedMonthEnd)} this month against your ${formatINR(monthlyBudget)} limit. Safe pacing!`,
      icon: 'shield-check',
      color: '#00ffa3',
    });
  }

  // 8. Net Cashflow Retention
  if (totalCredits > 0) {
    const savingsRatio = Math.round(((totalCredits - totalDebits) / totalCredits) * 100);
    insights.push({
      type: 'cashflow',
      tag: 'Cashflow Health',
      title: savingsRatio >= 0 ? `${savingsRatio}% Net Savings Retention` : 'Net Cash Deficit',
      desc: savingsRatio >= 0 
        ? `Out of ${formatINR(totalCredits)} incoming funds, you retained ${formatINR(totalCredits - totalDebits)}.` 
        : `Expenditure exceeded incoming funds by ${formatINR(Math.abs(totalCredits - totalDebits))}.`,
      icon: 'landmark',
      color: savingsRatio >= 0 ? '#00ffa3' : '#ff5252',
    });
  }

  return insights;
}

function detectRecurringCharges(transactions = []) {
  const recurringKeywords = ['netflix', 'spotify', 'prime', 'bill', 'electricity', 'broadband', 'airtel', 'jio', 'membership', 'cult', 'autopay', 'insurance'];
  const map = new Map();

  for (const tx of transactions) {
    if (!tx || tx.type !== 'debit') continue;
    const name = String(tx.merchant || '').toLowerCase();
    const isKeywordMatch = recurringKeywords.some(k => name.includes(k)) || tx.nature?.toLowerCase() === 'subscription' || tx.nature?.toLowerCase() === 'recurring';
    if (isKeywordMatch) {
      if (!map.has(tx.merchant)) {
        map.set(tx.merchant, { merchant: tx.merchant, amount: Number(tx.amount || 0), count: 1 });
      } else {
        const item = map.get(tx.merchant);
        item.count++;
      }
    }
  }

  return Array.from(map.values());
}
