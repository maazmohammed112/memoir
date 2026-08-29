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
  { id: 'all', label: 'All History' },
  { id: 'ytd', label: 'Year to Date (Jan – Now)' },
  { id: 'this_month', label: 'This Month' },
  { id: 'prev_month', label: 'Previous Month' },
  { id: 'this_week', label: 'This Week' },
  { id: 'today', label: 'Today' },
  { id: 'custom', label: 'Custom Range' },
];

export function parseTxDate(tx) {
  if (tx.createdAt && !isNaN(Number(tx.createdAt))) {
    return new Date(Number(tx.createdAt));
  }
  if (tx.date) {
    const parts = tx.date.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
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
 * Multi-dimensional search and filter engine
 */
export function filterTransactions(transactions = [], filters = {}) {
  const {
    month = 'all',
    query = '',
    type = 'all',
    category = 'all',
    paymentMethod = 'all',
    dateRangeMode = 'all',
    customStart = null,
    customEnd = null,
  } = filters;

  const normalizedQuery = String(query || '').trim().toLowerCase();

  return transactions.filter(tx => {
    // 1. Month filter (e.g. '2026-03')
    if (month && month !== 'all') {
      if (!tx.date || !tx.date.startsWith(month)) {
        return false;
      }
    }

    // 2. Type filter
    if (type !== 'all' && tx.type !== type) {
      return false;
    }

    // 3. Category filter
    if (category !== 'all' && tx.category !== category) {
      return false;
    }

    // 4. Payment method filter
    if (paymentMethod !== 'all') {
      const mStr = String(tx.paymentMethod || '').toLowerCase();
      const filterStr = String(paymentMethod).toLowerCase();
      if (!mStr.includes(filterStr)) {
        return false;
      }
    }

    // 5. Query search
    if (normalizedQuery) {
      const matchMerchant = String(tx.merchant || '').toLowerCase().includes(normalizedQuery);
      const matchSub = String(tx.displaySub || '').toLowerCase().includes(normalizedQuery);
      const matchNotes = String(tx.notes || '').toLowerCase().includes(normalizedQuery);
      const matchRef = String(tx.referenceId || '').toLowerCase().includes(normalizedQuery);
      const matchCategory = String(tx.category || '').toLowerCase().includes(normalizedQuery);
      const matchMethod = String(tx.paymentMethod || '').toLowerCase().includes(normalizedQuery);
      const matchAmount = String(tx.amount || '').includes(normalizedQuery);

      if (!matchMerchant && !matchSub && !matchNotes && !matchRef && !matchCategory && !matchMethod && !matchAmount) {
        return false;
      }
    }

    // 6. Custom date range filter (if active)
    if (dateRangeMode === 'custom' && (customStart || customEnd)) {
      const dTime = parseTxDate(tx).getTime();
      const sTime = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : 0;
      const eTime = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : Infinity;
      if (dTime < sTime || dTime > eTime) return false;
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
 * Calculates executive KPI analytics
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
  const dailyMap = {};

  for (const tx of filteredTransactions) {
    const amt = Number(tx.amount || 0);
    const isCredit = tx.type === 'credit';
    const d = parseTxDate(tx);
    const isToday = d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === now.getDate();

    if (isCredit) {
      totalCredits += amt;
      creditsCount++;
    } else {
      totalDebits += amt;
      debitsCount++;

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

      let normalizedMethod = 'Other';
      const mStr = String(tx.paymentMethod || '').toLowerCase();
      if (mStr.includes('upi')) normalizedMethod = 'UPI';
      else if (mStr.includes('credit') || mStr.includes('card') && !mStr.includes('debit')) normalizedMethod = 'Credit Card';
      else if (mStr.includes('debit')) normalizedMethod = 'Debit Card';
      else if (mStr.includes('net') || mStr.includes('bank') || mStr.includes('neft')) normalizedMethod = 'Net Banking';

      if (!methodStats[normalizedMethod]) methodStats[normalizedMethod] = { amount: 0, count: 0 };
      methodStats[normalizedMethod].amount += amt;
      methodStats[normalizedMethod].count++;

      const cat = tx.category || 'General';
      if (!categoryStats[cat]) categoryStats[cat] = { amount: 0, count: 0 };
      categoryStats[cat].amount += amt;
      categoryStats[cat].count++;

      const dateKey = tx.date || d.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amt;
    }
  }

  // Monthly breakdown across ALL transactions
  const monthlyTotals = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const tx of allTransactions) {
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

  // Average Daily Spend Velocity
  const activeDays = Object.keys(dailyMap).length || 1;
  const dailyAverageSpend = Math.round(totalDebits / activeDays);

  const localAiInsights = generateLocalAiInsights({
    filteredTransactions,
    allTransactions,
    totalDebits,
    totalCredits,
    monthlyBudget,
    paymentMethodShare,
    categoryShare,
    highestPaymentPeriod,
  });

  return {
    totalDebits,
    totalCredits,
    netCashflow: totalCredits - totalDebits,
    debitsCount,
    creditsCount,
    highestPaymentPeriod,
    highestPaymentToday,
    dailyAverageSpend,
    monthlyTotals: Object.values(monthlyTotals).sort((a, b) => a.key.localeCompare(b.key)),
    paymentMethodShare,
    categoryShare,
    dailyMap,
    localAiInsights,
  };
}

/**
 * On-Device Local AI Intelligence generator
 */
function generateLocalAiInsights(params) {
  const { filteredTransactions, totalDebits, totalCredits, monthlyBudget, paymentMethodShare, categoryShare } = params;
  const insights = [];

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
    if (tx.type !== 'debit') continue;
    const name = String(tx.merchant || '').toLowerCase();
    const isKeywordMatch = recurringKeywords.some(k => name.includes(k));
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
