/**
 * KREDO — Executive Financial Ledger, Credit Card Vault & Intelligence Suite
 * Full-Screen Desktop Dashboard & Mobile Application
 * - Electric Cobalt Blue (#0000FF), Warm Porcelain (#FCF8F8), Obsidian (#050505)
 * - Inter Typography, Display Numeric Tabulars, Material Symbols Outlined
 * - Responsive 2-Column Desktop Grid Layout & Fluid Mobile Views
 * - Hidden Scrollbars for seamless luxury aesthetic
 * - Dedicated Credit Cards Vault with auto-calculated used limit & utilization %
 * - Real-Time Dynamic SVG Wave Curve with Clickable Data Inspection Points
 * - Auto-Deducting limits on new transactions matching card last 4 digits
 * - Copy AI Extraction Prompt button in statement importer
 * - 12-Hour (AM/PM) standard time formatting across all views
 */

import {
  getKredoTransactions,
  addKredoTransaction,
  updateKredoTransaction,
  addKredoTransactionsBatch,
  deleteKredoTransaction,
  deleteKredoTransactionsBatch,
  getKredoSettings,
} from './kredoStore.js';

import {
  formatINR,
  formatINRDecimal,
  format12HourTime,
  getAvailableMonths,
  filterTransactions,
  groupTransactionsHierarchically,
  computeKredoAnalytics,
  resolveFinancialStatus,
} from './kredoAnalytics.js';

import {
  GEMINI_PROMPT_TEMPLATE,
  analyzeImportBatch,
} from './kredoImporter.js';

import {
  getCreditCards,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  DEFAULT_CARD_GRADIENTS,
} from './kredoCardStore.js';

import {
  findPendingReconciliationMatches,
  mergeTransactions,
  unmergeTransactions,
  isUndoAvailable,
  getUndoRemainingSeconds,
  formatRemainingTime,
  dismissMatch,
  getDismissedMatches,
  getReconciliationStore,
  buildUnifiedReconciledTransactionList,
  getSheetApprovals,
  setSheetApproval,
  batchSetSheetApprovals,
  decorateTransactionsWithApprovals,
  isTxApproved,
} from './kredoReconciliation.js';

import {
  getMerchantAnnotations,
  setMerchantAnnotation,
  removeMerchantAnnotation,
  setTransactionAnnotationOverride,
  resolveTransactionAnnotation,
  attachAnnotationsToTransactions,
} from './kredoAnnotations.js';

import {
  fetchGoogleSheetTransactions,
  subscribeToSheetUpdates,
  startSheetRealtimePolling,
  stopSheetRealtimePolling,
  GOOGLE_SHEET_URL,
} from './kredoSheetService.js';

import {
  renderDonutChart,
  renderCategoryLegend,
  renderVelocityBarChart,
  renderCumulativeLineChart,
  renderHorizontalBarRanking,
  getCategoryColor,
} from './kredoCharts.js';


// Premium Category Icon Vector Mapping (Zero emojis, modern Material Symbols)
function getCategoryIcon(cat = '', type = 'debit') {
  const c = String(cat).toLowerCase();
  let icon = 'credit_card';

  if (c.includes('food') || c.includes('dine') || c.includes('swiggy') || c.includes('zomato') || c.includes('restaur')) {
    icon = 'restaurant';
  } else if (c.includes('shop') || c.includes('cloth') || c.includes('amazon') || c.includes('electr')) {
    icon = 'shopping_bag';
  } else if (c.includes('groc') || c.includes('blinkit') || c.includes('zepto') || c.includes('instamart') || c.includes('superm')) {
    icon = 'local_grocery_store';
  } else if (c.includes('bill') || c.includes('util') || c.includes('power') || c.includes('recharg') || c.includes('electri')) {
    icon = 'bolt';
  } else if (c.includes('health') || c.includes('medic') || c.includes('pharm')) {
    icon = 'medical_services';
  } else if (c.includes('travel') || c.includes('trip') || c.includes('ride') || c.includes('uber') || c.includes('ola')) {
    icon = 'directions_car';
  } else if (c.includes('income') || c.includes('salary') || type === 'credit') {
    icon = 'trending_up';
  } else if (c.includes('entertain') || c.includes('movie') || c.includes('netflix') || c.includes('prime')) {
    icon = 'movie';
  } else if (c.includes('invest') || c.includes('stock') || c.includes('crypto')) {
    icon = 'monitoring';
  }

  return `<span class="material-symbols-outlined text-[18px]">${icon}</span>`;
}

export class KredoController {
  constructor(container, profile, options = {}) {
    this.container = container;
    this.profile = profile;
    this.onBack = options.onBack || (() => {});

    this.state = {
      isLoading: true,
      transactions: [],
      cards: [],
      selectedMonth: 'all',
      searchQuery: '',
      typeFilter: 'all',
      categoryFilter: 'all',
      paymentMethodFilter: 'all',
      insightsSource: 'kredo', // 'kredo' (Email) | 'sheet' (Google Sheet) | 'all' (Unified)
      insightsCategoryFilter: 'all',
      insightsMethodFilter: 'all',
      insightsBankFilter: 'all',
      insightsAppFilter: 'all',
      insightsNetFilter: 'all',
      insightsNatureFilter: 'all',
      insightsReviewFilter: 'all',
      insightsTypeFilter: 'all', // 'all' | 'debit' | 'credit'
      insightsTimePreset: 'all', // 'all' | 'ytd' | 'this_month' | 'prev_month' | '30d' | '7d' | 'custom'
      insightsCustomStart: '',
      insightsCustomEnd: '',
      insightsActiveCategory: null,
      inspectingCategory: null,
      timeRange: '1D', // '1H' | '1D' | '1W' | '1M' | '1Y' | 'All'
      showBalance: true,
      activeTab: 'ledger', // 'ledger' | 'cards' | 'sheet' | 'categories' | 'insights' | 'ai'
      dataSource: 'kredo', // 'kredo' (Email/Manual) | 'sheet' (Google Sheet)
      sheetTransactions: [],
      isSheetLoading: false,
      lastSheetSync: null,
      sheetError: null,
      activeModal: null,   // 'action-menu' | 'add' | 'edit' | 'preview' | 'import' | 'delete-confirm' | 'batch-delete-confirm' | 'add-card' | 'edit-card' | 'delete-card-confirm'
      selectedTx: null,
      selectedCard: null,
      selectedTxIds: new Set(),
      visibleCvvCardIds: new Set(),
      selectedCardIdFilter: null,
      inspectingPoint: null,
      importDraft: '',
      importAnalysis: null,
      settings: getKredoSettings(),
    };

    // Auto-poll Google Sheet every 10s for real-time live sync
    this.sheetUnsubscribe = subscribeToSheetUpdates((data) => {
      this.state.sheetTransactions = data.transactions || [];
      this.state.lastSheetSync = data.lastSync;
      // Do not re-render if a modal is open to avoid glitching/flickering
      if (!this.state.activeModal && (this.state.activeTab === 'sheet' || this.state.dataSource === 'sheet' || this.state.activeTab === 'insights')) {
        this.render();
      }
    });
    startSheetRealtimePolling(10000);

    // Render skeleton immediately (0ms latency, zero flicker)
    this.render();
    this.init();
  }

  async init() {
    try {
      const [txs, cards, sheetRes] = await Promise.all([
        getKredoTransactions(),
        getCreditCards(),
        fetchGoogleSheetTransactions(true),
      ]);
      this.state.transactions = txs;
      this.state.cards = cards;
      if (sheetRes && sheetRes.transactions) {
        this.state.sheetTransactions = sheetRes.transactions;
        this.state.lastSheetSync = sheetRes.lastSync;
      }
      const activePool = this.state.dataSource === 'sheet' ? this.state.sheetTransactions : txs;
      const months = getAvailableMonths(activePool);
      if (months.length > 0) {
        this.state.selectedMonth = months[0].key;
      }
    } catch (e) {
      console.warn('Kredo store init error:', e);
    } finally {
      this.state.isLoading = false;
      this.render();
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #050505;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--kredo-font);
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      z-index: 20000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: kredoFadeIn 0.15s ease;
    `;
    toast.innerHTML = `<span class="material-symbols-outlined text-[16px]" style="color:#00ffa3;">check_circle</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }

  openModal(modalName, data = null) {
    this.state.activeModal = modalName;
    if (data) {
      if (modalName.includes('card')) {
        this.state.selectedCard = data;
      } else {
        this.state.selectedTx = data;
      }
    }
    this.render();
  }

  closeModal() {
    this.state.activeModal = null;
    this.state.selectedTx = null;
    this.state.selectedCard = null;
    this.state.importDraft = '';
    this.state.importAnalysis = null;
    this.render();
  }

  toggleSelectTx(id) {
    if (this.state.selectedTxIds.has(id)) {
      this.state.selectedTxIds.delete(id);
    } else {
      this.state.selectedTxIds.add(id);
    }
    this.render();
  }

  toggleSelectAll(filteredTxs) {
    const allFilteredIds = filteredTxs.map(t => t.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => this.state.selectedTxIds.has(id));

    if (areAllSelected) {
      allFilteredIds.forEach(id => this.state.selectedTxIds.delete(id));
    } else {
      allFilteredIds.forEach(id => this.state.selectedTxIds.add(id));
    }
    this.render();
  }

  clearSelection() {
    this.state.selectedTxIds.clear();
    this.render();
  }

  toggleCardCvv(cardId) {
    if (this.state.visibleCvvCardIds.has(cardId)) {
      this.state.visibleCvvCardIds.delete(cardId);
    } else {
      this.state.visibleCvvCardIds.add(cardId);
    }
    this.render();
  }

  // REAL-TIME DYNAMIC SVG WAVE CHART GENERATOR (Dynamically responds to 1H, 1D, 1W, 1M, 1Y, All)
  computeRealtimeChart(filteredTxs, timeRange) {
    const debitTxs = filteredTxs.filter(t => t.type !== 'credit');
    const now = new Date();
    
    // Sort chronologically ascending
    const sortedAll = [...debitTxs].sort((a, b) => {
      const ta = a.createdAt || Date.parse(`${a.date}T${a.time || '00:00:00'}`) || 0;
      const tb = b.createdAt || Date.parse(`${b.date}T${b.time || '00:00:00'}`) || 0;
      return ta - tb;
    });

    let rawDataPoints = [];
    let periodTotal = 0;
    let periodLabel = 'Total Outflow';

    if (timeRange === '1H') {
      periodLabel = '1-Hour Outflow (1H)';
      const latestTx = sortedAll[sortedAll.length - 1];
      const targetDate = latestTx ? latestTx.date : now.toISOString().slice(0, 10);
      const dayTxs = sortedAll.filter(t => t.date === targetDate);
      periodTotal = dayTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const slots = [
        { label: '9:00 AM', startHour: 0, endHour: 11, amount: 0, count: 0 },
        { label: '12:00 PM', startHour: 11, endHour: 14, amount: 0, count: 0 },
        { label: '3:00 PM', startHour: 14, endHour: 17, amount: 0, count: 0 },
        { label: '6:00 PM', startHour: 17, endHour: 20, amount: 0, count: 0 },
        { label: '9:00 PM', startHour: 20, endHour: 24, amount: 0, count: 0 },
      ];

      dayTxs.forEach(t => {
        let hour = 12;
        if (t.time) {
          const match = t.time.match(/(\d+):(\d+)/);
          if (match) {
            let h = parseInt(match[1], 10);
            if (t.time.toLowerCase().includes('pm') && h < 12) h += 12;
            if (t.time.toLowerCase().includes('am') && h === 12) h = 0;
            hour = h;
          }
        }
        const s = slots.find(slot => hour >= slot.startHour && hour < slot.endHour) || slots[slots.length - 1];
        s.amount += Number(t.amount || 0);
        s.count++;
      });

      rawDataPoints = slots.map(s => ({
        label: s.label,
        amount: s.amount,
        date: targetDate,
        merchant: s.count > 0 ? `${s.count} txs at ${s.label}` : `No spend at ${s.label}`,
      }));

    } else if (timeRange === '1D') {
      periodLabel = "Today's Outflow (1D)";
      const latestTx = sortedAll[sortedAll.length - 1];
      const targetDate = latestTx ? latestTx.date : now.toISOString().slice(0, 10);
      const dayTxs = sortedAll.filter(t => t.date === targetDate);
      periodTotal = dayTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      if (dayTxs.length === 0) {
        rawDataPoints = [
          { label: 'Morning', amount: 0, date: targetDate, merchant: 'No Expenses' },
          { label: 'Afternoon', amount: 0, date: targetDate, merchant: 'No Expenses' },
          { label: 'Evening', amount: 0, date: targetDate, merchant: 'No Expenses' },
          { label: 'Night', amount: 0, date: targetDate, merchant: 'No Expenses' },
        ];
      } else if (dayTxs.length === 1) {
        rawDataPoints = [
          { label: 'Start', amount: 0, date: targetDate, merchant: 'Baseline' },
          { label: format12HourTime(dayTxs[0].time) || '12:00 PM', amount: Number(dayTxs[0].amount || 0), date: targetDate, merchant: dayTxs[0].merchant },
        ];
      } else {
        rawDataPoints = dayTxs.map((t, idx) => ({
          label: format12HourTime(t.time) || `Tx ${idx + 1}`,
          amount: Number(t.amount || 0),
          date: t.date,
          merchant: t.merchant,
          category: t.category,
        }));
      }

    } else if (timeRange === '1W') {
      periodLabel = 'Past 7 Days (1W)';
      const refDate = sortedAll.length > 0 ? new Date(sortedAll[sortedAll.length - 1].date) : new Date();
      const dayBuckets = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate);
        d.setDate(refDate.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`;
        dayBuckets.push({ dateStr, label: dayLabel, amount: 0, merchants: [] });
      }

      dayBuckets.forEach(b => {
        const matching = sortedAll.filter(t => t.date === b.dateStr);
        b.amount = matching.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        b.merchants = matching.map(t => t.merchant);
      });

      periodTotal = dayBuckets.reduce((sum, b) => sum + b.amount, 0);

      rawDataPoints = dayBuckets.map(b => ({
        label: b.label,
        amount: b.amount,
        date: b.dateStr,
        merchant: b.merchants.length > 0 ? b.merchants.slice(0, 2).join(', ') : 'No Outflows',
      }));

    } else if (timeRange === '1M') {
      periodLabel = 'Monthly Outflow (1M)';
      const refDate = sortedAll.length > 0 ? sortedAll[sortedAll.length - 1].date.slice(0, 7) : now.toISOString().slice(0, 7);
      const monthTxs = sortedAll.filter(t => t.date && t.date.startsWith(refDate));
      periodTotal = monthTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const weeks = [
        { label: 'W1 (1-7)', start: 1, end: 7, amount: 0, count: 0 },
        { label: 'W2 (8-14)', start: 8, end: 14, amount: 0, count: 0 },
        { label: 'W3 (15-21)', start: 15, end: 21, amount: 0, count: 0 },
        { label: 'W4 (22-28)', start: 22, end: 28, amount: 0, count: 0 },
        { label: 'W5 (29+)', start: 29, end: 31, amount: 0, count: 0 },
      ];

      monthTxs.forEach(t => {
        const dayNum = parseInt(t.date.split('-')[2], 10) || 1;
        const w = weeks.find(w => dayNum >= w.start && dayNum <= w.end) || weeks[weeks.length - 1];
        w.amount += Number(t.amount || 0);
        w.count++;
      });

      rawDataPoints = weeks.map(w => ({
        label: w.label,
        amount: w.amount,
        date: `${refDate}`,
        merchant: w.count > 0 ? `${w.count} txs in ${w.label}` : 'No spend',
      }));

    } else if (timeRange === '1Y') {
      periodLabel = 'Annual Outflow (1Y)';
      const year = sortedAll.length > 0 ? sortedAll[sortedAll.length - 1].date.slice(0, 4) : String(now.getFullYear());
      const yearTxs = sortedAll.filter(t => t.date && t.date.startsWith(year));
      periodTotal = yearTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      rawDataPoints = months.map((m, idx) => {
        const mKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
        const mTxs = yearTxs.filter(t => t.date && t.date.startsWith(mKey));
        const amt = mTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        return {
          label: m,
          amount: amt,
          date: mKey,
          merchant: mTxs.length > 0 ? `${mTxs.length} txs in ${m}` : 'No spend',
        };
      });

    } else { // 'All'
      periodLabel = 'All-Time Outflow';
      periodTotal = sortedAll.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      if (sortedAll.length === 0) {
        rawDataPoints = [
          { label: 'Start', amount: 0, date: '', merchant: 'No Expenses' },
          { label: 'End', amount: 0, date: '', merchant: 'No Expenses' },
        ];
      } else if (sortedAll.length === 1) {
        rawDataPoints = [
          { label: 'Baseline', amount: 0, date: sortedAll[0].date, merchant: 'Baseline' },
          { label: sortedAll[0].date, amount: Number(sortedAll[0].amount || 0), date: sortedAll[0].date, merchant: sortedAll[0].merchant },
        ];
      } else {
        rawDataPoints = sortedAll.map((t, idx) => ({
          label: t.date || `T${idx + 1}`,
          amount: Number(t.amount || 0),
          date: t.date || '',
          merchant: t.merchant || 'Expense',
          category: t.category || '',
        }));
      }
    }

    const maxAmount = Math.max(...rawDataPoints.map(p => p.amount), 100);
    const n = rawDataPoints.length;

    const points = rawDataPoints.map((p, i) => {
      const x = n === 1 ? 200 : (i / (n - 1)) * 380 + 10;
      const y = 135 - (p.amount / maxAmount) * 105;
      return { ...p, x: Math.round(x), y: Math.round(y) };
    });

    let linePath = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const areaPath = `${linePath} L ${lastX},150 L ${firstX},150 Z`;

    return { points, linePath, areaPath, maxAmount, periodTotal, periodLabel };
  }

  render() {
    const {
      transactions,
      sheetTransactions,
      cards,
      selectedMonth,
      searchQuery,
      typeFilter,
      categoryFilter,
      paymentMethodFilter,
      timeRange,
      showBalance,
      activeTab,
      selectedTxIds,
      selectedCardIdFilter,
      dataSource, // 'kredo' | 'sheet' | 'unified'
    } = this.state;

    // Decorate Email and Google Sheet transactions with merchant auto-annotations and persistent approvals
    const sheetApprovals = getSheetApprovals();
    const decoratedEmailTxs = attachAnnotationsToTransactions(decorateTransactionsWithApprovals(transactions || []));
    const decoratedSheetTxs = attachAnnotationsToTransactions(decorateTransactionsWithApprovals(sheetTransactions || []));

    // Find pending reconciliation matches from Aug 31, 2026 onwards
    const pendingMatches = findPendingReconciliationMatches(decoratedEmailTxs, decoratedSheetTxs);
    const reconStore = getReconciliationStore();
    const mergedRecords = reconStore.mergedRecords || [];

    // Isolate data or build unified reconciled stream
    let rawPool = [];
    if (dataSource === 'sheet') {
      rawPool = decoratedSheetTxs;
    } else if (dataSource === 'unified') {
      rawPool = buildUnifiedReconciledTransactionList(decoratedEmailTxs, decoratedSheetTxs);
    } else {
      rawPool = decoratedEmailTxs;
    }

    // Filter transactions using multi-filter engine
    let filteredTxs = filterTransactions(rawPool, {
      month: selectedMonth,
      query: searchQuery,
      type: typeFilter,
      category: categoryFilter,
      paymentMethod: paymentMethodFilter,
    });

    // If filtered by specific credit card
    if (selectedCardIdFilter) {
      const card = cards.find(c => c.id === selectedCardIdFilter);
      if (card && card.last4) {
        filteredTxs = filteredTxs.filter(t => 
          (t.cardLast4 && t.cardLast4 === card.last4) ||
          (t.cardOrAccount && t.cardOrAccount.includes(card.last4)) ||
          (t.notes && t.notes.includes(card.last4))
        );
      }
    }

    // Hierarchical Week & Day grouping
    const hierarchicalWeeks = groupTransactionsHierarchically(filteredTxs);

    // Extract unique available categories & payment methods from active pool
    const availableCategories = Array.from(new Set(rawPool.map(t => t.category).filter(Boolean))).sort();
    const availableMethods = Array.from(new Set(rawPool.map(t => t.paymentMethod).filter(Boolean))).sort();

    // Multi-Dimensional Insights Pipeline
    let insightsPool = [];
    const insSrc = this.state.insightsSource || this.state.dataSource;
    if (insSrc === 'sheet') {
      insightsPool = decoratedSheetTxs;
    } else if (insSrc === 'kredo') {
      insightsPool = decoratedEmailTxs;
    } else if (insSrc === 'all' || insSrc === 'unified') {
      insightsPool = buildUnifiedReconciledTransactionList(decoratedEmailTxs, decoratedSheetTxs);
    } else {
      insightsPool = rawPool;
    }

    const effectiveCatFilter = this.state.insightsActiveCategory || this.state.insightsCategoryFilter || 'all';

    const insightsFilteredTxs = filterTransactions(insightsPool, {
      month: selectedMonth,
      category: effectiveCatFilter,
      paymentMethod: this.state.insightsMethodFilter || 'all',
      bank: this.state.insightsBankFilter || 'all',
      paymentApp: this.state.insightsAppFilter || 'all',
      cardNetwork: this.state.insightsNetFilter || 'all',
      nature: this.state.insightsNatureFilter || 'all',
      reviewFlag: this.state.insightsReviewFilter || 'all',
      type: this.state.insightsTypeFilter || 'all',
      dateRangeMode: this.state.insightsTimePreset || 'all',
      customStart: this.state.insightsCustomStart,
      customEnd: this.state.insightsCustomEnd,
      query: searchQuery,
    });

    const insightsAnalytics = computeKredoAnalytics(insightsPool, insightsFilteredTxs);
    const insightsAvailableCategories = Array.from(new Set(insightsPool.map(t => t.category).filter(Boolean))).sort();
    const insightsAvailableMethods = Array.from(new Set(insightsPool.map(t => t.paymentMethod).filter(Boolean))).sort();
    const insightsAvailableBanks = Array.from(new Set(insightsPool.map(t => t.bank).filter(Boolean))).sort();
    const insightsAvailableApps = Array.from(new Set(insightsPool.map(t => t.paymentApp).filter(Boolean))).sort();
    const insightsAvailableNetworks = Array.from(new Set(insightsPool.map(t => t.cardNetwork).filter(Boolean))).sort();
    const insightsAvailableNatures = Array.from(new Set(insightsPool.map(t => t.nature).filter(Boolean))).sort();

    // Compute Executive Analytics on active data pool for Ledger & Overview
    const analytics = computeKredoAnalytics(rawPool, filteredTxs);

    // Real-Time Dynamic Chart Data
    const chartData = this.computeRealtimeChart(filteredTxs, timeRange);

    const availableMonths = getAvailableMonths(rawPool);
    const isAllSelected = filteredTxs.length > 0 && filteredTxs.every(t => selectedTxIds.has(t.id));
    const selectedCount = selectedTxIds.size;

    this.container.innerHTML = `
      <div class="kredo-app-root">
        <div class="kredo-device-container">
          
          <!-- Top Navigation Header (Desktop & Mobile Unified) -->
          <header class="kredo-header">
            <button class="kredo-brand-home-btn" id="kredo-back-memoir-btn" title="Back to Memoir Home">
              <img src="/brand/memoir-rhino-ui.png" alt="Memoir" style="width: 28px; height: 28px; object-fit: contain;">
              <span class="kredo-brand-title">memoir</span>
            </button>

            <div class="kredo-header-search-wrap">
              <div class="kredo-search-pill" id="kredo-search-trigger">
                <span class="material-symbols-outlined text-[18px] text-boro-on-surface-variant">search</span>
                <span class="kredo-search-pill-text">${searchQuery ? `Search: "${searchQuery}"` : 'Search transactions...'}</span>
              </div>
            </div>

            <div class="kredo-header-actions">
              <!-- Sleek Segmented Source Switcher -->
              <div class="kredo-source-segmented" role="tablist" title="Data Stream: Email Vault vs Live Google Sheet vs Reconciled Unified">
                <button type="button" class="kredo-source-seg-btn ${dataSource === 'kredo' ? 'active' : ''}" data-source="kredo" title="Kredo Email & Local Ledger">
                  <span class="material-symbols-outlined text-[15px]">mail</span>
                  <span class="kredo-seg-text">Email Vault</span>
                </button>
                <button type="button" class="kredo-source-seg-btn ${dataSource === 'sheet' ? 'active' : ''}" data-source="sheet" title="Real-Time Google Sheet Stream">
                  <span class="material-symbols-outlined text-[15px]">table_chart</span>
                  <span class="kredo-seg-text">Google Sheet</span>
                  <span class="kredo-live-micro-dot"></span>
                </button>
                <button type="button" class="kredo-source-seg-btn ${dataSource === 'unified' ? 'active' : ''}" data-source="unified" title="Unified Deduplicated Stream">
                  <span class="material-symbols-outlined text-[15px]">sync_alt</span>
                  <span class="kredo-seg-text">Unified</span>
                </button>
              </div>

              <!-- Desktop Navigation Tabs -->
              <nav class="kredo-desktop-nav-tabs">
                <button class="kredo-desktop-tab-btn ${activeTab === 'ledger' ? 'active' : ''}" data-nav="ledger">
                  <span class="material-symbols-outlined text-[16px]">receipt_long</span> Ledger
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'cards' ? 'active' : ''}" data-nav="cards">
                  <span class="material-symbols-outlined text-[16px]">credit_card</span> Cards
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'sheet' ? 'active' : ''}" data-nav="sheet">
                  <span class="material-symbols-outlined text-[16px]">table_chart</span> Sheet
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'reconcile' ? 'active' : ''}" data-nav="reconcile" title="Smart Cross-Stream Reconciliation Agent">
                  <span class="material-symbols-outlined text-[16px]">sync_alt</span> Reconcile
                  ${pendingMatches && pendingMatches.length > 0 ? `<span class="kredo-nav-badge-pill">${pendingMatches.length}</span>` : ''}
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'insights' ? 'active' : ''}" data-nav="insights">
                  <span class="material-symbols-outlined text-[16px]">insights</span> Insights
                </button>
              </nav>

              <!-- Prominent Action Trigger (+) (Replaces overlapping buttons) -->
              <button class="kredo-header-add-btn" id="kredo-action-trigger-btn" title="Quick Actions">
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>Actions</span>
              </button>
            </div>
          </header>

          <!-- Main Canvas Content (Responsive Grid Layout) -->
          <main class="kredo-main-canvas">
            ${this.renderCanvasContent(analytics, hierarchicalWeeks, filteredTxs, availableMonths, isAllSelected, chartData, insightsAnalytics, availableCategories, availableMethods, insightsFilteredTxs, insightsPool, insightsAvailableCategories, insightsAvailableMethods, insightsAvailableBanks, insightsAvailableApps, insightsAvailableNetworks, insightsAvailableNatures, pendingMatches, mergedRecords, sheetApprovals)}
          </main>

          <!-- Floating Bottom Navigation Pill Shell (Mobile Only - 5 Clean Tabs + Center Action Button) -->
          <nav class="kredo-bottom-nav">
            <div class="kredo-bottom-nav-pill">
              <button class="kredo-nav-item ${activeTab === 'ledger' ? 'active' : ''}" data-nav="ledger" title="Ledger Feed">
                <span class="material-symbols-outlined ${activeTab === 'ledger' ? 'fill' : ''}">receipt_long</span>
              </button>
              <button class="kredo-nav-item ${activeTab === 'cards' ? 'active' : ''}" data-nav="cards" title="Credit Cards">
                <span class="material-symbols-outlined ${activeTab === 'cards' ? 'fill' : ''}">credit_card</span>
              </button>

              <!-- Center Floating Action Button (+) opens quick menu -->
              <button class="kredo-nav-center-add" id="kredo-center-add-btn" title="Actions">
                <span class="material-symbols-outlined text-[24px]">add</span>
              </button>

              <button class="kredo-nav-item ${activeTab === 'sheet' ? 'active' : ''}" data-nav="sheet" title="Live Google Sheet">
                <span class="material-symbols-outlined ${activeTab === 'sheet' ? 'fill' : ''}">table_chart</span>
              </button>
              <button class="kredo-nav-item ${activeTab === 'reconcile' ? 'active' : ''}" data-nav="reconcile" title="Reconcile Agent">
                <span class="material-symbols-outlined ${activeTab === 'reconcile' ? 'fill' : ''}">sync_alt</span>
              </button>
              <button class="kredo-nav-item ${activeTab === 'insights' ? 'active' : ''}" data-nav="insights" title="Visual Analytics & Insights">
                <span class="material-symbols-outlined ${activeTab === 'insights' ? 'fill' : ''}">insights</span>
              </button>
            </div>
          </nav>

          <!-- Floating Batch Selection Actions Dock -->
          ${selectedCount > 0 ? `
            <div class="kredo-batch-dock">
              <span style="font-size: 13px; font-weight: 700;">
                ${selectedCount} selected
              </span>
              <button type="button" id="batch-approve-btn" class="kredo-approve-btn prominent" style="padding: 5px 12px; font-size: 11.5px;">
                <span class="material-symbols-outlined text-[14px]">check_circle</span> Approve (${selectedCount})
              </button>
              <button type="button" id="batch-clear-btn" style="background: rgba(255,255,255,0.15); border: none; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                Deselect
              </button>
              <button type="button" id="batch-delete-btn" style="background: #ff5252; border: none; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined text-[15px]">delete</span> Delete All (${selectedCount})
              </button>
            </div>
          ` : ''}

          <!-- Modals & Sheets -->
          ${this.renderActiveModal(filteredTxs)}

        </div>
      </div>
    `;

    this.bindEvents(filteredTxs, chartData, pendingMatches);
  }

  renderCanvasContent(analytics, hierarchicalWeeks, filteredTxs, availableMonths, isAllSelected, chartData, insightsAnalytics, availableCategories, availableMethods, insightsFilteredTxs = [], insightsPool = [], insightsAvailableCategories = [], insightsAvailableMethods = [], insightsAvailableBanks = [], insightsAvailableApps = [], insightsAvailableNetworks = [], insightsAvailableNatures = [], pendingMatches = [], mergedRecords = [], sheetApprovals = {}) {
    const { 
      isLoading, 
      activeTab, 
      showBalance, 
      timeRange, 
      selectedMonth, 
      typeFilter, 
      inspectingPoint, 
      cards, 
      selectedCardIdFilter,
      dataSource,
      transactions,
      sheetTransactions,
      isSheetLoading,
      lastSheetSync,
      insightsSource,
      insightsTimePreset,
      insightsCustomStart,
      insightsCustomEnd,
      insightsTypeFilter,
      insightsCategoryFilter,
      insightsMethodFilter,
      insightsBankFilter,
      insightsAppFilter,
      insightsNetFilter,
      insightsNatureFilter,
      insightsReviewFilter,
      insightsActiveCategory,
    } = this.state;
    const displayAmount = showBalance ? formatINR(analytics.totalDebits || 0) : '••••••••';

    // SKELETON LOADING SCREEN (Zero flicker, ultra smooth startup)
    if (isLoading) {
      return `
        <div class="kredo-dashboard-grid" style="opacity: 0.95;">
          <div class="kredo-left-column">
            <div class="kredo-card" style="padding: 24px;">
              <div class="kredo-skeleton" style="width: 110px; height: 16px; margin-bottom: 12px;"></div>
              <div class="kredo-skeleton" style="width: 220px; height: 42px; margin-bottom: 22px;"></div>
              <div class="kredo-skeleton" style="width: 100%; height: 130px; border-radius: 12px; margin-bottom: 18px;"></div>
              <div style="display: flex; gap: 8px;">
                ${[1, 2, 3, 4, 5, 6].map(() => `<div class="kredo-skeleton" style="flex: 1; height: 32px; border-radius: 8px;"></div>`).join('')}
              </div>
            </div>
            <div class="kredo-card" style="padding: 20px;">
              <div class="kredo-skeleton" style="width: 140px; height: 16px; margin-bottom: 14px;"></div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="kredo-skeleton" style="height: 60px; border-radius: 10px;"></div>
                <div class="kredo-skeleton" style="height: 60px; border-radius: 10px;"></div>
              </div>
            </div>
          </div>
          <div class="kredo-right-column">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
              <div style="display: flex; gap: 8px;">
                <div class="kredo-skeleton" style="width: 60px; height: 32px; border-radius: 8px;"></div>
                <div class="kredo-skeleton" style="width: 80px; height: 32px; border-radius: 8px;"></div>
                <div class="kredo-skeleton" style="width: 80px; height: 32px; border-radius: 8px;"></div>
              </div>
              <div class="kredo-skeleton" style="width: 130px; height: 32px; border-radius: 8px;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${[1, 2].map(() => `
                <div class="kredo-card" style="padding: 16px;">
                  <div class="kredo-skeleton" style="width: 160px; height: 18px; margin-bottom: 14px;"></div>
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${[1, 2, 3].map(() => `
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div class="kredo-skeleton" style="width: 38px; height: 38px; border-radius: 10px;"></div>
                          <div>
                            <div class="kredo-skeleton" style="width: 120px; height: 14px; margin-bottom: 6px;"></div>
                            <div class="kredo-skeleton" style="width: 80px; height: 11px;"></div>
                          </div>
                        </div>
                        <div class="kredo-skeleton" style="width: 70px; height: 16px;"></div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // CREDIT CARDS VAULT TAB
    if (activeTab === 'cards') {
      const cardList = cards || [];
      const totalCreditLine = cardList.reduce((sum, c) => sum + (c.totalLimit || 0), 0);
      const totalAvailable = cardList.reduce((sum, c) => sum + (c.currentLimit || 0), 0);
      const totalUsed = cardList.reduce((sum, c) => sum + (c.usedLimit || 0), 0);
      const overallUtilization = totalCreditLine > 0 ? Math.min(100, Math.round((totalUsed / totalCreditLine) * 100)) : 0;

      return `
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Top Executive Metrics Bar -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Credit Line</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(totalCreditLine)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">${cardList.length} Active Cards</span>
            </div>

            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Available Limit</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: var(--kredo-primary);">${formatINR(totalAvailable)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">Safe Liquidity Margin</span>
            </div>

            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Used / Outstanding</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: var(--kredo-tertiary);">${formatINR(totalUsed)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">Auto-calculated from limits</span>
            </div>

            <div class="kredo-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline);">Utilization Rate</span>
                <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${overallUtilization < 30 ? 'var(--kredo-green-bg)' : (overallUtilization < 70 ? '#fef3c7' : '#fee2e2')}; color: ${overallUtilization < 30 ? 'var(--kredo-green)' : (overallUtilization < 70 ? '#d97706' : 'var(--kredo-error)')};">
                  ${overallUtilization < 30 ? 'HEALTHY (<30%)' : (overallUtilization < 70 ? 'MODERATE' : 'HIGH')}
                </span>
              </div>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono);">${overallUtilization}%</h3>
              <div class="kredo-utilization-bar" style="margin-top: 8px;">
                <div class="kredo-utilization-fill" style="width: ${overallUtilization}%; background: ${overallUtilization < 30 ? 'var(--kredo-green)' : (overallUtilization < 70 ? '#d97706' : 'var(--kredo-error)')};"></div>
              </div>
            </div>
          </div>

          <!-- Section Action Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Credit Cards Vault</h3>
              <span style="font-size: 12px; color: var(--kredo-outline);">Tracks limits, billing cycles, and auto-deducts expenses by last 4 digits</span>
            </div>
            <button class="kredo-btn-action" id="open-add-card-btn">
              <span class="material-symbols-outlined text-[18px]">add_card</span> Add Credit Card
            </button>
          </div>

          <!-- Cards Visual Gallery -->
          ${cardList.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
              ${cardList.map(card => {
                const gradientObj = DEFAULT_CARD_GRADIENTS.find(g => g.id === card.theme) || DEFAULT_CARD_GRADIENTS[0];
                const isCvvVisible = this.state.visibleCvvCardIds.has(card.id);
                return `
                  <div style="display: flex; flex-direction: column; gap: 14px;">
                    <!-- Realistic Luxury Credit Card Component -->
                    <div class="kredo-credit-card" style="background: ${gradientObj.background}; color: ${gradientObj.text};">
                      <div class="kredo-card-gloss"></div>

                      <!-- Card Top Row: Bank & Contactless -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; z-index: 2;">
                        <div>
                          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; display: block;">${card.bank || 'EXECUTIVE'}</span>
                          <strong style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">${card.cardName}</strong>
                        </div>
                        <span class="material-symbols-outlined text-[24px]" style="opacity: 0.8;">contactless</span>
                      </div>

                      <!-- Card Middle Row: EMV Chip & Number -->
                      <div style="display: flex; flex-direction: column; gap: 12px; z-index: 2; margin: 8px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <div class="kredo-card-chip"></div>
                          <span style="font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; letter-spacing: 1px;">CREDIT</span>
                        </div>
                        <div class="kredo-card-number-display">
                          <span>••••</span>
                          <span>••••</span>
                          <span>••••</span>
                          <span style="color: #ffffff; text-decoration: underline dotted;">${card.last4 || '••••'}</span>
                        </div>
                      </div>

                      <!-- Card Bottom Row: Cardholder, Expiry, CVV -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-end; z-index: 2;">
                        <div>
                          <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; display: block;">CARDHOLDER</span>
                          <strong style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">${card.cardholderName || 'CARD MEMBER'}</strong>
                        </div>

                        <div style="display: flex; gap: 14px; align-items: flex-end;">
                          <div>
                            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; display: block;">EXPIRES</span>
                            <span style="font-size: 12px; font-weight: 700; font-family: var(--kredo-mono);">${card.expiry || '12/28'}</span>
                          </div>

                          <div>
                            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; display: block;">CVV</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                              <span style="font-size: 12px; font-weight: 700; font-family: var(--kredo-mono);">${isCvvVisible ? (card.cvv || '•••') : '•••'}</span>
                              <button type="button" data-toggle-cvv="${card.id}" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; opacity: 0.75;" title="Toggle CVV visibility">
                                <span class="material-symbols-outlined text-[14px]">${isCvvVisible ? 'visibility_off' : 'visibility'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Card Limit & Billing Summary Card -->
                    <div class="kredo-card ${card.financialStatus?.outlineClass || 'kredo-status-outline-upcoming'}" style="padding: 16px 18px; gap: 12px; cursor: pointer;" data-inspect-card-due="${card.id}" title="Tap to inspect full billing and payment details">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                          <div>
                            <span style="font-size: 11px; font-weight: 700; color: var(--kredo-outline); text-transform: uppercase;">Available: </span>
                            <strong style="font-size: 16px; font-weight: 700; color: var(--kredo-primary); font-family: var(--kredo-mono);">${formatINR(card.currentLimit)}</strong>
                          </div>
                          <div style="text-align: right;">
                            <span style="font-size: 11px; color: var(--kredo-outline);">Used: </span>
                            <strong style="font-size: 14px; font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(card.usedLimit)} (${card.utilization}%)</strong>
                          </div>
                        </div>
                        <div class="kredo-utilization-bar">
                          <div class="kredo-utilization-fill" style="width: ${card.utilization}%; background: ${card.utilization < 30 ? 'var(--kredo-green)' : (card.utilization < 70 ? '#d97706' : 'var(--kredo-error)')};"></div>
                        </div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 8px 10px; background: var(--kredo-surface-container-low); border-radius: 8px; font-size: 11.5px; border: 1px solid var(--kredo-outline-variant);">
                        <div>
                          <span style="color: var(--kredo-outline); display: block;">Billing Date</span>
                          <strong style="color: var(--kredo-secondary);">${card.billDay}th of month</strong>
                        </div>
                        <div>
                          <span style="color: var(--kredo-outline); display: block; margin-bottom: 2px;">Payment Due</span>
                          <span class="kredo-status-pill ${card.financialStatus?.tier || 'upcoming'}">
                            ${card.dueBadge || 'UPCOMING'}
                          </span>
                        </div>
                      </div>

                      <!-- Card Action Controls -->
                      <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--kredo-outline-variant); padding-top: 10px;">
                        <button type="button" data-inspect-card-due="${card.id}" style="background: transparent; border: 1px solid var(--kredo-outline-variant); border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                          <span class="material-symbols-outlined text-[14px]">info</span> Details
                        </button>
                        <button type="button" data-view-card-txs="${card.id}" style="background: transparent; border: 1px solid var(--kredo-outline-variant); border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                          <span class="material-symbols-outlined text-[14px]">receipt_long</span> Transactions
                        </button>
                        <button type="button" data-edit-card="${card.id}" style="background: transparent; border: 1px solid var(--kredo-outline-variant); border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                          <span class="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                        <button type="button" data-delete-card="${card.id}" style="background: rgba(186,26,26,0.08); border: none; color: var(--kredo-error); border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                          <span class="material-symbols-outlined text-[14px]">delete</span> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="background:#ffffff; border:1px dashed var(--kredo-outline-variant); border-radius:14px; padding:48px 20px; text-align:center; color:var(--kredo-outline);">
              <span class="material-symbols-outlined text-[44px]" style="margin-bottom:8px; display:block; color:var(--kredo-primary);">credit_card</span>
              <h4 style="margin:0 0 6px 0; color:var(--kredo-secondary); font-size:17px; font-weight:700;">No Credit Cards Added Yet</h4>
              <p style="margin:0 0 20px 0; font-size:13px; max-width: 420px; margin-left: auto; margin-right: auto;">
                Add your cards to monitor limits, auto-calculate utilization, track due dates, and auto-deduct newly imported statement expenses by last 4 digits.
              </p>
              
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
                <button type="button" class="kredo-btn-action secondary" data-quick-sample="hdfc" style="font-size: 12px; padding: 8px 14px;">
                  + Add HDFC Regalia (••4028)
                </button>
                <button type="button" class="kredo-btn-action secondary" data-quick-sample="axis" style="font-size: 12px; padding: 8px 14px;">
                  + Add Axis Ace (••8812)
                </button>
              </div>

              <button class="kredo-btn-action" style="max-width:200px; margin:0 auto; padding:10px 20px; font-size:13.5px;" id="open-add-card-btn-2">
                <span class="material-symbols-outlined text-[18px]">add_card</span> Add Custom Card
              </button>
            </div>
          `}

        </div>
      `;
    }

    // DEDICATED GOOGLE SHEET REAL-TIME TAB
    if (activeTab === 'sheet') {
      const sheetTxs = this.state.sheetTransactions || [];
      const totalInflow = sheetTxs.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
      const totalOutflow = sheetTxs.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
      const netSheetFlow = totalInflow - totalOutflow;
      let lastSyncStr = 'Pending';
      if (this.state.lastSheetSync) {
        try {
          const syncDate = this.state.lastSheetSync instanceof Date ? this.state.lastSheetSync : new Date(this.state.lastSheetSync);
          lastSyncStr = !isNaN(syncDate.getTime()) ? syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Synced';
        } catch {
          lastSyncStr = 'Synced';
        }
      }

      return `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Top Live Sync Status & Controls -->
          <div class="kredo-sheet-hero-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="kredo-live-pulsar"></span>
                  <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #00c853;">Live Connected</span>
                  <span style="font-size: 11px; color: var(--kredo-outline);">&bull; Auto-Sync: 10s</span>
                </div>
                <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 8px;">
                  <span class="material-symbols-outlined text-[24px]" style="color: #0f9d58;">table_chart</span> Google Sheet Live Stream
                </h2>
                <p style="font-size: 12.5px; color: var(--kredo-outline); margin: 0;">
                  Real-time direct read from your Google Sheet ledger. Changes in Google Sheets reflect automatically.
                </p>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="kredo-btn-action secondary" id="kredo-sheet-refresh-btn" style="padding: 8px 14px; font-size: 12.5px; display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[16px] ${this.state.isSheetLoading ? 'animate-spin' : ''}">sync</span> Refresh Now
                </button>
                <a href="${GOOGLE_SHEET_URL}" target="_blank" rel="noopener noreferrer" class="kredo-btn-action" style="padding: 8px 16px; font-size: 12.5px; text-decoration: none; display: flex; align-items: center; gap: 6px; background: #0f9d58; color: #fff;">
                  <span class="material-symbols-outlined text-[16px]">open_in_new</span> Open Sheet
                </a>
              </div>
            </div>

            <!-- Sync Telemetry Bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--kredo-outline-variant); font-size: 11.5px; color: var(--kredo-outline);">
              <div>
                <strong>Last sync:</strong> <span style="font-family: var(--kredo-mono); color: var(--kredo-secondary); font-weight: 600;">${lastSyncStr}</span>
              </div>
              <div>
                <strong>Records in sheet:</strong> <span style="font-family: var(--kredo-mono); color: var(--kredo-secondary); font-weight: 700;">${sheetTxs.length}</span>
              </div>
              <div>
                <strong>Mode:</strong> <span style="color: #0000ff; font-weight: 700;">Zero-Leak Isolated Stream</span>
              </div>
            </div>
          </div>

          <!-- Executive Live Metrics Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Credits (Inflow)</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: var(--kredo-green);">${formatINR(totalInflow)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">Direct from Google Sheet</span>
            </div>

            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Debits (Outflow)</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(totalOutflow)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">Direct from Google Sheet</span>
            </div>

            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Net Cashflow Delta</span>
              <h3 style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--kredo-mono); color: ${netSheetFlow >= 0 ? 'var(--kredo-green)' : 'var(--kredo-tertiary)'};">${formatINR(netSheetFlow)}</h3>
              <span style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">Real-time delta</span>
            </div>

            <div class="kredo-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Data Isolation</span>
              <div style="margin-top: 6px;">
                <button type="button" class="kredo-btn-action secondary" data-switch-source="sheet" style="font-size: 11.5px; padding: 6px 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[15px]">tune</span> Filter App to Sheet
                </button>
              </div>
              <span style="font-size: 10.5px; color: var(--kredo-outline); margin-top: 4px; display: block;">Isolates Ledger & Velocity exclusively to Sheet</span>
            </div>
          </div>

          <!-- Live Transactions Feed Table (Horizon Scrollable with Min-Width) -->
          <div class="kredo-sheet-table-card">
            <div class="kredo-sheet-table-header">
              <div>
                <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Live Google Sheet Ledger</h3>
                <span style="font-size: 11.5px; color: var(--kredo-outline);">All ${sheetTxs.length} real-time transactions synchronized</span>
              </div>
              <span class="kredo-live-badge">
                <span class="kredo-live-micro-dot"></span> LIVE POLLING ACTIVE
              </span>
            </div>

            ${sheetTxs.length > 0 ? `
              <div class="kredo-sheet-table-24-container">
                <table class="kredo-sheet-table-24">
                  <thead>
                    <tr>
                      <th style="width: 44px; text-align: center;">#</th>
                      <th style="min-width: 130px;">Date & Time</th>
                      <th style="min-width: 90px;">Type</th>
                      <th style="min-width: 120px; text-align: right;">Amount</th>
                      <th style="min-width: 130px;">Category</th>
                      <th style="min-width: 120px;">Payment Method</th>
                      <th style="min-width: 180px;">Merchant</th>
                      <th style="min-width: 130px;">Account</th>
                      <th style="min-width: 110px;">Source</th>
                      <th style="min-width: 140px;">Bank</th>
                      <th style="min-width: 90px;">Last 4</th>
                      <th style="min-width: 130px;">Payment App</th>
                      <th style="min-width: 110px;">Card Network</th>
                      <th style="min-width: 130px;">Reference ID</th>
                      <th style="min-width: 130px;">Transaction ID</th>
                      <th style="min-width: 110px;">Nature</th>
                      <th style="min-width: 90px;">Status</th>
                      <th style="min-width: 120px;">Review Flag</th>
                      <th style="min-width: 140px;">Review Reason</th>
                      <th style="min-width: 140px;">Linked Bill ID</th>
                      <th style="min-width: 80px;">Currency</th>
                      <th style="min-width: 90px;">Confidence</th>
                      <th style="min-width: 90px;">Parser</th>
                      <th style="min-width: 220px;">Raw Message</th>
                      <th style="width: 80px; text-align: center; position: sticky; right: 0; background: var(--kredo-surface-container-low);">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sheetTxs.map((tx, idx) => {
                      const catLower = String(tx.category || '').toLowerCase();
                      let catClass = 'food';
                      if (catLower.includes('tea') || catLower.includes('coffee')) catClass = 'tea';
                      else if (catLower.includes('shop') || catLower.includes('amazon')) catClass = 'shopping';
                      else if (catLower.includes('travel') || catLower.includes('uber')) catClass = 'travel';
                      else if (catLower.includes('bill') || catLower.includes('util')) catClass = 'bills';
                      else if (catLower.includes('health') || catLower.includes('medic')) catClass = 'health';
                      else if (catLower.includes('income') || tx.type === 'credit') catClass = 'income';

                      const finStatus = resolveFinancialStatus(tx);
                      const rFlag = String(tx.reviewFlag || '').trim();
                      const isFlagged = finStatus.isFlagged;

                      return `
                        <tr class="kredo-sheet-row ${finStatus.outlineClass} ${isFlagged ? 'kredo-row-flagged' : ''}" data-open-sheet-tx="${tx.id}">
                          <td style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-outline); text-align: center;">
                            ${idx + 1}
                          </td>
                          <td>
                            <div style="font-weight: 600; color: var(--kredo-secondary); font-size: 12px;">${tx.date || '-'}</div>
                            <div style="font-size: 10.5px; color: var(--kredo-outline); font-family: var(--kredo-mono);">${format12HourTime(tx.time) || tx.time || '-'}</div>
                          </td>
                          <td>
                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${tx.type === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)'};">
                              ${tx.type === 'credit' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td style="text-align: right;">
                            <span class="kredo-tx-amount ${tx.type === 'debit' ? 'debit' : 'credit'}" style="font-size: 13px; font-weight: 700; font-family: var(--kredo-mono);">
                              ${tx.type === 'debit' ? '-' : '+'}${formatINR(tx.amount)}
                            </span>
                          </td>
                          <td>
                            <span class="kredo-category-badge ${catClass}">
                              ${tx.category || '-'}
                            </span>
                          </td>
                          <td style="font-size: 12px; color: var(--kredo-secondary); font-weight: 500;">
                            ${tx.paymentMethod || '-'}
                          </td>
                          <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <div class="kredo-tx-avatar ${tx.type === 'credit' ? 'credit' : 'debit'}" style="width: 26px; height: 26px; font-size: 14px;">
                                ${getCategoryIcon(tx.category, tx.type)}
                              </div>
                              <strong style="color: var(--kredo-secondary); font-size: 12.5px;">${tx.merchant || '-'}</strong>
                            </div>
                          </td>
                          <td>
                            <span class="kredo-account-chip">
                              ${tx.cardOrAccount || '-'}
                            </span>
                          </td>
                          <td style="font-size: 11.5px; color: var(--kredo-neutral);">
                            ${tx.source || '-'}
                          </td>
                          <td>
                            ${tx.bank ? `<span class="kredo-bank-tag"><span class="material-symbols-outlined text-[12px]">account_balance</span>${tx.bank}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td>
                            ${tx.cardLast4 ? `<span style="font-family:var(--kredo-mono); font-size:11.5px; font-weight:700; color:var(--kredo-secondary);">••${tx.cardLast4}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td>
                            ${tx.paymentApp ? `<span class="kredo-app-tag"><span class="material-symbols-outlined text-[12px]">smartphone</span>${tx.paymentApp}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td>
                            ${tx.cardNetwork ? `<span class="kredo-net-tag">${tx.cardNetwork}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-neutral);">
                            ${tx.referenceId || '-'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-neutral);">
                            ${tx.transactionId || '-'}
                          </td>
                          <td>
                            ${tx.nature ? `<span class="kredo-nature-tag">${tx.nature}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td>
                            ${finStatus.isApproved ? `
                              <span class="kredo-status-pill approved" title="Approved & verified for Insights">
                                <span class="material-symbols-outlined text-[10px]">check_circle</span> APPROVED
                              </span>
                            ` : `
                              <span class="kredo-status-pill ${finStatus.tier}">
                                ${finStatus.badgeLabel}
                              </span>
                            `}
                          </td>
                          <td>
                            ${isFlagged ? `
                              <span class="kredo-review-badge">
                                <span class="material-symbols-outlined text-[12px]">flag</span> ${rFlag}
                              </span>
                            ` : '<span style="color:var(--kredo-outline); font-size:11px;">Clear</span>'}
                          </td>
                          <td style="font-size: 11px; color: ${isFlagged ? '#b45309' : 'var(--kredo-outline)'};">
                            ${tx.reviewReason || '-'}
                          </td>
                          <td>
                            ${tx.annotation ? `
                              <span class="kredo-annotation-pill" data-edit-annotation="${tx.id}" title="Merchant Annotation">
                                <span class="material-symbols-outlined text-[10px]">label</span> ${tx.annotation}
                              </span>
                            ` : `
                              <button type="button" class="kredo-annotation-pill empty-add" data-add-annotation="${tx.id}" title="Add tag">
                                <span class="material-symbols-outlined text-[10px]">add</span>Tag
                              </button>
                            `}
                          </td>
                          <td>
                            ${tx.linkedBillId ? `<span class="kredo-bill-chip"><span class="material-symbols-outlined text-[11px]">link</span>${tx.linkedBillId}</span>` : '<span style="color:var(--kredo-outline);">-</span>'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 11px;">
                            ${tx.currency || 'INR'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 11px;">
                            ${tx.confidence || '-'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-outline);">
                            ${tx.parserVersion || '-'}
                          </td>
                          <td style="font-family: var(--kredo-mono); font-size: 10.5px; color: var(--kredo-outline); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${tx.rawMessage || ''}">
                            ${tx.rawMessage || '-'}
                          </td>
                          <td style="text-align: center; position: sticky; right: 0; background: var(--kredo-surface-container-lowest);">
                            <div class="kredo-sheet-actions" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                              ${!finStatus.isApproved ? `
                                <button type="button" class="kredo-approve-btn" data-quick-approve="${tx.id}" title="Mark as approved and sync to Insights">
                                  <span class="material-symbols-outlined text-[12px]">check_circle</span>
                                </button>
                              ` : ''}
                              <button type="button" class="kredo-sheet-action-btn" data-sheet-info="${tx.id}" title="Inspect All 24 Fields">
                                <span class="material-symbols-outlined text-[15px]">info</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div style="padding: 48px 20px; text-align: center; color: var(--kredo-outline);">
                <span class="material-symbols-outlined text-[44px]" style="margin-bottom: 8px; display: block; color: #0f9d58;">table_chart</span>
                <h4 style="margin: 0 0 6px 0; color: var(--kredo-secondary); font-size: 16px; font-weight: 700;">Google Sheet is currently empty</h4>
                <p style="margin: 0 0 16px 0; font-size: 13px; max-width: 440px; margin-left: auto; margin-right: auto;">
                  Whenever your iOS shortcut or manual entry script posts an SMS or transaction to Google Sheets, it appears here in real-time.
                </p>
                <a href="${GOOGLE_SHEET_URL}" target="_blank" rel="noopener noreferrer" class="kredo-btn-action" style="max-width: 220px; margin: 0 auto; padding: 9px 18px; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #0f9d58; color: #fff;">
                  <span class="material-symbols-outlined text-[16px]">open_in_new</span> Open Google Sheet
                </a>
              </div>
            `}
          </div>

        </div>
      `;
    }

    if (activeTab === 'ledger') {
      return `
        <!-- Desktop 2-Column Responsive Dashboard Layout -->
        <div class="kredo-dashboard-grid">
          
          <!-- LEFT COLUMN: Executive Balance, Real-Time Chart & Velocity Mini-Cards -->
          <div class="kredo-left-column">
            
            <!-- Outflow Hero Card -->
            <div class="kredo-card">
              <section class="kredo-balance-hero">
                <div class="kredo-balance-label-row">
                  <span>${chartData.periodLabel || 'Total Outflow'}</span>
                  <button type="button" id="kredo-toggle-balance" style="background:none; border:none; color:inherit; cursor:pointer; padding:2px; display:flex; align-items:center;">
                    <span class="material-symbols-outlined text-[16px]">
                      ${showBalance ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                
                <h1 class="kredo-balance-amount">
                  ${showBalance ? formatINR(chartData.periodTotal !== undefined ? chartData.periodTotal : (analytics.totalDebits || 0)) : '••••••••'}
                </h1>

                <div class="kredo-trend-chip">
                  <span class="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>${inspectingPoint ? `${inspectingPoint.merchant} &bull; ${formatINR(inspectingPoint.amount)} (${inspectingPoint.date})` : (chartData.periodTotal > 0 ? `${timeRange} Active Period Outflow` : 'No Recorded Outflows')}</span>
                </div>
              </section>

              <!-- REAL-TIME DYNAMIC SVG WAVE CHART -->
              <section class="kredo-chart-section">
                ${inspectingPoint ? `
                  <div class="kredo-chart-inspection-pill">
                    <span>${inspectingPoint.merchant}</span>
                    <strong style="color:#00ffa3;">${formatINR(inspectingPoint.amount)}</strong>
                    <span>${inspectingPoint.date}</span>
                  </div>
                ` : ''}

                <svg class="kredo-svg-chart" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="kredoChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#0000ff" stop-opacity="0.14"/>
                      <stop offset="100%" stop-color="#0000ff" stop-opacity="0.0"/>
                    </linearGradient>
                    <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.2" fill="#0000ff" opacity="0.18" />
                    </pattern>
                  </defs>

                  <path d="${chartData.areaPath}" fill="url(#dotPattern)" />
                  <path d="${chartData.areaPath}" fill="url(#kredoChartGradient)" />
                  <path d="${chartData.linePath}" fill="none" stroke="#0000ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                  ${chartData.points.map((pt, i) => `
                    <circle cx="${pt.x}" cy="${pt.y}" r="${inspectingPoint && inspectingPoint.idx === i ? 6 : 4}" 
                            fill="${inspectingPoint && inspectingPoint.idx === i ? '#0000ff' : '#ffffff'}" 
                            stroke="#0000ff" 
                            stroke-width="2" 
                            class="kredo-chart-dot ${inspectingPoint && inspectingPoint.idx === i ? 'active' : ''}" 
                            data-chart-point="${i}" 
                            title="${pt.merchant}: ${formatINR(pt.amount)}" />
                  `).join('')}
                </svg>
              </section>

              <!-- X-Axis Timeline Milestones -->
              <div style="display: flex; justify-content: space-between; padding: 2px 4px 4px 4px; font-size: 10px; font-weight: 600; color: var(--kredo-outline); font-family: var(--kredo-mono);">
                ${chartData.points.length > 0 ? `
                  <span>${chartData.points[0].label}</span>
                  ${chartData.points.length > 2 ? `<span>${chartData.points[Math.floor(chartData.points.length / 2)].label}</span>` : ''}
                  <span>${chartData.points[chartData.points.length - 1].label}</span>
                ` : ''}
              </div>

              <!-- Time Range Selector -->
              <section class="kredo-time-selector">
                ${['1H', '1D', '1W', '1M', '1Y', 'All'].map(t => `
                  <button class="kredo-time-btn ${timeRange === t ? 'active' : ''}" data-time="${t}">
                    ${t}
                  </button>
                `).join('')}
              </section>
            </div>

            <!-- Quick Metrics Overview Card -->
            <div class="kredo-card">
              <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 12px 0; color: var(--kredo-secondary);">Executive Velocity</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="background: var(--kredo-surface-container-low); padding: 12px 14px; border-radius: 10px;">
                  <span style="font-size: 11px; color: var(--kredo-outline); display: block; font-weight: 600;">Daily Burn Rate</span>
                  <strong style="font-size: 17px; color: var(--kredo-primary); font-family: var(--kredo-mono);">${formatINR(analytics.dailyAverageSpend || 0)}/day</strong>
                </div>
                <div style="background: var(--kredo-surface-container-low); padding: 12px 14px; border-radius: 10px;">
                  <span style="font-size: 11px; color: var(--kredo-outline); display: block; font-weight: 600;">Net Cashflow</span>
                  <strong style="font-size: 17px; color: ${analytics.netCashflow >= 0 ? 'var(--kredo-green)' : 'var(--kredo-tertiary)'}; font-family: var(--kredo-mono);">
                    ${formatINR(analytics.netCashflow || 0)}
                  </strong>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Multi-Filter & Hierarchical Ledger Feed -->
          <div class="kredo-right-column">
            
            <!-- Filter Strip & Month Dropdown & Data Source Selector -->
            <section class="kredo-filter-strip">
              <div class="kredo-filter-left-group">
                <!-- Source Selector Capsule (Email vs Sheet) -->
                <div class="kredo-source-segmented mini" role="tablist" title="Data Stream">
                  <button type="button" class="kredo-source-seg-btn ${dataSource === 'kredo' ? 'active' : ''}" data-source="kredo" title="Kredo Email & Manual Vault">
                    <span class="material-symbols-outlined text-[14px]">mail</span>
                    <span class="kredo-seg-text">Email</span>
                  </button>
                  <button type="button" class="kredo-source-seg-btn ${dataSource === 'sheet' ? 'active' : ''}" data-source="sheet" title="Real-Time Google Sheet Stream">
                    <span class="material-symbols-outlined text-[14px]">table_chart</span>
                    <span class="kredo-seg-text">Sheet</span>
                    <span class="kredo-live-micro-dot"></span>
                  </button>
                </div>

                <div class="kredo-filter-divider"></div>

                <!-- Outflow / Inflow Pills -->
                <div class="kredo-type-pills">
                  <button type="button" class="kredo-filter-pill ${typeFilter === 'all' ? 'active' : ''}" data-filter-type="all">All</button>
                  <button type="button" class="kredo-filter-pill ${typeFilter === 'debit' ? 'active' : ''}" data-filter-type="debit">Outflows</button>
                  <button type="button" class="kredo-filter-pill ${typeFilter === 'credit' ? 'active' : ''}" data-filter-type="credit">Inflows</button>
                </div>
              </div>

              <div class="kredo-filter-right-group">
                <button type="button" class="kredo-filter-pill select-all-pill ${isAllSelected ? 'active' : ''}" id="toggle-select-all-btn">
                  ${isAllSelected ? '✓ Deselect' : `Select All (${filteredTxs.length})`}
                </button>

                <select class="kredo-month-select" id="kredo-month-dropdown">
                  <option value="all" ${selectedMonth === 'all' ? 'selected' : ''}>All Months</option>
                  ${availableMonths.map(m => `
                    <option value="${m.key}" ${selectedMonth === m.key ? 'selected' : ''}>${m.label}</option>
                  `).join('')}
                </select>
              </div>
            </section>

            <!-- Hierarchical Week & Day Ledger Cards -->
            <section class="kredo-hierarchical-ledger">
              ${hierarchicalWeeks && hierarchicalWeeks.length > 0 ? 
                hierarchicalWeeks.map(week => `
                  <div class="kredo-week-block">
                    <div class="kredo-week-header">
                      <div style="display: flex; align-items: center;">
                        <span class="kredo-week-tag">Week ${week.weekNumber}</span>
                        <span class="kredo-week-label">${week.label}</span>
                      </div>
                      <span class="kredo-week-spend">${formatINR(week.totalDebit)}</span>
                    </div>

                    ${(week.days || []).map(day => `
                      <div class="kredo-day-group">
                        <div class="kredo-day-header">
                          <span class="kredo-day-title">${day.dayLabel}</span>
                          <span class="kredo-day-total">${formatINR(day.totalDebit)}</span>
                        </div>

                        ${(day.transactions || []).map(tx => {
                          const finStatus = resolveFinancialStatus(tx);
                          return `
                          <div class="kredo-tx-row ${finStatus.outlineClass} ${finStatus.isFlagged ? 'kredo-status-outline-flagged' : ''}" data-open-tx="${tx.id}">
                            <div class="kredo-tx-left">
                              <div class="kredo-tx-checkbox ${this.state.selectedTxIds.has(tx.id) ? 'checked' : ''}" data-toggle-select="${tx.id}">
                                ${this.state.selectedTxIds.has(tx.id) ? '✓' : ''}
                              </div>
                              
                              <div class="kredo-tx-avatar ${tx.type === 'debit' ? 'debit' : 'credit'}">
                                ${getCategoryIcon(tx.category, tx.type)}
                              </div>

                              <div style="min-width: 0; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                  <span class="kredo-tx-merchant">${tx.merchant}</span>
                                  <span class="kredo-status-pill ${finStatus.tier}">${finStatus.badgeLabel}</span>
                                  ${finStatus.isFlagged ? `
                                    <span class="kredo-status-pill flagged" style="font-size: 9.5px;">
                                      <span class="material-symbols-outlined text-[10px]">flag</span> ${tx.reviewFlag}
                                    </span>
                                  ` : ''}
                                  ${tx.isMerged ? `
                                    <span class="kredo-merged-badge-pill" style="font-size: 9.5px;">Unified</span>
                                  ` : ''}
                                  ${tx.annotation ? `
                                    <span class="kredo-annotation-pill" data-edit-annotation="${tx.id}" title="Merchant Annotation (Auto-remembered)">
                                      <span class="material-symbols-outlined text-[11px]">label</span>${tx.annotation}
                                    </span>
                                  ` : `
                                    <button type="button" class="kredo-annotation-pill empty-add" data-add-annotation="${tx.id}" title="Add merchant annotation">
                                      <span class="material-symbols-outlined text-[11px]">add</span>Tag
                                    </button>
                                  `}
                                  ${!finStatus.isApproved && (tx.source?.includes('Sheet') || tx.isGoogleSheet || finStatus.isFlagged) ? `
                                    <button type="button" class="kredo-approve-btn" data-quick-approve="${tx.id}" title="Approve & sync to Insights">
                                      <span class="material-symbols-outlined text-[13px]">check_circle</span> Approve
                                    </button>
                                  ` : ''}
                                  ${tx.linkedBillId ? `
                                    <span class="kredo-bill-chip" style="font-size: 9px; padding: 1px 4px;">
                                      <span class="material-symbols-outlined text-[9px]">link</span> ${tx.linkedBillId}
                                    </span>
                                  ` : ''}
                                </div>
                                <div class="kredo-tx-meta" style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 2px;">
                                  <span>${tx.category}</span> &bull; <span>${tx.paymentMethod}</span>
                                  ${tx.bank ? `&bull; <span style="font-weight:600; color:var(--kredo-secondary);">${tx.bank}</span>` : ''}
                                  ${tx.paymentApp ? `&bull; <span style="color:#4f46e5; font-weight:600;">${tx.paymentApp}</span>` : ''}
                                  ${tx.cardNetwork ? `&bull; <span style="color:#7e22ce; font-weight:700; font-size:10px;">${tx.cardNetwork}</span>` : ''}
                                  ${tx.cardLast4 ? `&bull; <span style="font-family:var(--kredo-mono); font-weight:600;">••${tx.cardLast4}</span>` : ''}
                                  ${finStatus.dueDate ? `&bull; <span style="font-family:var(--kredo-mono); font-size:10.5px; color:${finStatus.tier === 'overdue' ? 'var(--kredo-status-red-text)' : (finStatus.tier === 'due-soon' || finStatus.tier === 'due-today' ? 'var(--kredo-status-orange-text)' : 'var(--kredo-outline)')}; font-weight:600;">Due: ${finStatus.dueDate}</span>` : ''}
                                </div>
                              </div>
                            </div>

                            <div class="kredo-tx-right">
                              <span class="kredo-tx-amount ${tx.type === 'debit' ? 'debit' : 'credit'}">
                                ${tx.type === 'debit' ? '-' : '+'}${formatINR(tx.amount)}
                              </span>
                              <span class="kredo-tx-time">${format12HourTime(tx.time) || tx.date}</span>
                            </div>

                            <div class="kredo-tx-actions">
                              <button class="kredo-mini-btn" data-quick-edit="${tx.id}" title="Edit Transaction">
                                <span class="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button class="kredo-mini-btn danger" data-quick-delete="${tx.id}" title="Delete Transaction">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        `;
                        }).join('')}
                      </div>
                    `).join('')}
                  </div>
                `).join('')
                : `
                <div style="background:#ffffff; border:1px dashed var(--kredo-outline-variant); border-radius:14px; padding:48px 20px; text-align:center; color:var(--kredo-outline);">
                  <span class="material-symbols-outlined text-[36px]" style="margin-bottom:8px; display:block; color:var(--kredo-outline);">receipt_long</span>
                  <h4 style="margin:0 0 6px 0; color:var(--kredo-secondary); font-size:16px; font-weight:700;">No transactions recorded</h4>
                  <p style="margin:0 0 16px 0; font-size:13px;">Click Actions or (+) to add an expense or import a statement.</p>
                  <button class="kredo-btn-action" style="max-width:180px; margin:0 auto; padding:9px 18px; font-size:13px;" id="kredo-empty-add-btn">
                    <span class="material-symbols-outlined text-[18px]">add</span> Add Expense
                  </button>
                </div>
              `}
            </section>

          </div>

        </div>
      `;
    }

    // DEDICATED SMART RECONCILIATION AGENT WORKSPACE
    if (activeTab === 'reconcile') {
      const dismissedCount = getDismissedMatches().size;
      return `
        <div class="kredo-reconcile-workspace">
          
          <!-- Executive Reconciliation Header & Summary Metrics -->
          <div class="kredo-reconcile-hero">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span class="material-symbols-outlined text-[24px]" style="color: #6366f1;">sync_alt</span>
                  <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--kredo-secondary);">Smart Reconciliation Agent</h2>
                  <span class="kredo-confidence-badge" style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                    Horizon: Aug 31, 2026+
                  </span>
                </div>
                <p style="font-size: 12.5px; color: var(--kredo-outline); margin: 0; max-width: 650px; line-height: 1.4;">
                  Continuous cross-stream duplicate detection between Email Vault and Live Google Sheet. Review matching evidence, execute 1-click unification, or reverse any merge with instant 5-minute rollback.
                </p>
              </div>

              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" id="kredo-reconcile-refresh-btn" class="kredo-btn-action secondary" style="padding: 7px 14px; font-size: 12px;">
                  <span class="material-symbols-outlined text-[15px]">refresh</span> Rescan Streams
                </button>
              </div>
            </div>

            <!-- 4 Telemetry Metric Cards -->
            <div class="kredo-reconcile-stats-grid">
              <div class="kredo-reconcile-stat-card">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">Pending Candidate Matches</span>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;">
                  <strong style="font-size: 22px; font-weight: 800; font-family: var(--kredo-mono); color: ${pendingMatches.length > 0 ? '#6366f1' : 'var(--kredo-green)'};">
                    ${pendingMatches.length}
                  </strong>
                  <span style="font-size: 11px; font-weight: 600; color: var(--kredo-outline);">
                    ${pendingMatches.length > 0 ? 'Requires Action' : 'All Clear'}
                  </span>
                </div>
              </div>

              <div class="kredo-reconcile-stat-card">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">Unified Reconciled Records</span>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;">
                  <strong style="font-size: 22px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary);">
                    ${mergedRecords.length}
                  </strong>
                  <span style="font-size: 11px; font-weight: 600; color: #2563eb;">
                    ${mergedRecords.filter(m => getUndoRemainingSeconds(m) > 0).length} active undo
                  </span>
                </div>
              </div>

              <div class="kredo-reconcile-stat-card">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">Dismissed Suggestions</span>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;">
                  <strong style="font-size: 22px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-outline);">
                    ${dismissedCount}
                  </strong>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Independent pairs</span>
                </div>
              </div>

              <div class="kredo-reconcile-stat-card">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">Engine Confidence Rules</span>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;">
                  <strong style="font-size: 14px; font-weight: 700; color: var(--kredo-primary);">
                    6-Factor Scoring
                  </strong>
                  <span style="font-size: 11px; color: var(--kredo-green); font-weight: 600;">Deterministic</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 1: Candidate Duplicate Match Queue -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Candidate Duplicate Match Queue</h3>
                <span class="kredo-confidence-badge" style="background: ${pendingMatches.length > 0 ? '#eff6ff' : '#ecfdf5'}; color: ${pendingMatches.length > 0 ? '#1e40af' : '#047857'}; border-color: ${pendingMatches.length > 0 ? '#bfdbfe' : '#a7f3d0'};">
                  ${pendingMatches.length} pending
                </span>
              </div>
            </div>

            ${pendingMatches && pendingMatches.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${pendingMatches.map((match, idx) => `
                  <div class="kredo-candidate-card-modular">
                    <!-- Top Match Evidence Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--kredo-outline-variant);">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined text-[18px]" style="color: #6366f1;">compare_arrows</span>
                        <strong style="font-size: 14px; color: var(--kredo-secondary);">Match Suggestion #${idx + 1}</strong>
                        <span class="kredo-confidence-badge" style="background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; font-size: 11px; font-weight: 800;">
                          ${match.confidence}% Confidence
                        </span>
                      </div>
                      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${(match.reasons || []).map(r => `
                          <span style="font-size: 10.5px; font-weight: 600; background: var(--kredo-surface-container); border: 1px solid var(--kredo-outline-variant); padding: 2px 7px; border-radius: 5px; color: var(--kredo-secondary);">
                            ✓ ${r}
                          </span>
                        `).join('')}
                      </div>
                    </div>

                    <!-- Dual Stream Side-by-Side Comparison -->
                    <div class="kredo-candidate-streams-row">
                      <!-- Email Vault Candidate -->
                      <div class="kredo-stream-panel email">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #2563eb; display: flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined text-[13px]">mail</span> Email Vault Stream
                          </span>
                          <span style="font-size: 11px; font-weight: 600; color: var(--kredo-outline);">${match.emailTx.date} &bull; ${format12HourTime(match.emailTx.time) || match.emailTx.time || ''}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                          <strong style="font-size: 15px; color: var(--kredo-secondary);">${match.emailTx.merchant}</strong>
                          <strong style="font-size: 16px; font-family: var(--kredo-mono); color: var(--kredo-primary);">${formatINR(match.emailTx.amount)}</strong>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; color: var(--kredo-outline);">
                          <span>${match.emailTx.category || 'General'}</span>
                          <span>&bull;</span>
                          <span>${match.emailTx.paymentMethod || 'UPI'}</span>
                          ${match.emailTx.bank ? `<span>&bull; ${match.emailTx.bank}</span>` : ''}
                          ${match.emailTx.cardLast4 ? `<span>&bull; ••${match.emailTx.cardLast4}</span>` : ''}
                          ${match.emailTx.referenceId ? `<span>&bull; Ref: ${match.emailTx.referenceId}</span>` : ''}
                        </div>
                      </div>

                      <!-- Center Action Divider -->
                      <div class="kredo-match-center-badge">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">
                          VS
                        </div>
                      </div>

                      <!-- Google Sheet Candidate -->
                      <div class="kredo-stream-panel sheet">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f9d58; display: flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined text-[13px]">table_chart</span> Google Sheet Stream
                          </span>
                          <span style="font-size: 11px; font-weight: 600; color: var(--kredo-outline);">${match.sheetTx.date} &bull; ${format12HourTime(match.sheetTx.time) || match.sheetTx.time || ''}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                          <strong style="font-size: 15px; color: var(--kredo-secondary);">${match.sheetTx.merchant}</strong>
                          <strong style="font-size: 16px; font-family: var(--kredo-mono); color: var(--kredo-primary);">${formatINR(match.sheetTx.amount)}</strong>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; color: var(--kredo-outline);">
                          <span>${match.sheetTx.category || 'General'}</span>
                          <span>&bull;</span>
                          <span>${match.sheetTx.paymentMethod || 'UPI'}</span>
                          ${match.sheetTx.bank ? `<span>&bull; ${match.sheetTx.bank}</span>` : ''}
                          ${match.sheetTx.cardLast4 ? `<span>&bull; ••${match.sheetTx.cardLast4}</span>` : ''}
                          ${match.sheetTx.referenceId ? `<span>&bull; Ref: ${match.sheetTx.referenceId}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Actions Toolbar -->
                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 8px; border-top: 1px solid var(--kredo-outline-variant); flex-wrap: wrap;">
                      <button type="button" class="kredo-btn-action secondary" data-dismiss-match="${match.pairKey}" style="padding: 7px 12px; font-size: 12px;">
                        <span class="material-symbols-outlined text-[15px]">close</span> Dismiss
                      </button>
                      <button type="button" class="kredo-btn-action" data-reconcile-compare="${idx}" style="padding: 7px 14px; font-size: 12px; background: #4f46e5; color: #fff;">
                        <span class="material-symbols-outlined text-[15px]">compare</span> Compare & Review
                      </button>
                      <button type="button" class="kredo-btn-action" data-quick-merge="${idx}" style="padding: 7px 16px; font-size: 12px; background: #6366f1; color: #fff;">
                        <span class="material-symbols-outlined text-[15px]">merge</span> 1-Click Merge (Unified)
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="background: #ffffff; border: 1px dashed var(--kredo-outline-variant); border-radius: 14px; padding: 48px 24px; text-align: center; color: var(--kredo-outline);">
                <span class="material-symbols-outlined text-[44px]" style="margin-bottom: 8px; display: block; color: #10b981;">sync_saved</span>
                <h4 style="margin: 0 0 6px 0; color: var(--kredo-secondary); font-size: 16px; font-weight: 700;">All Streams Perfectly Reconciled</h4>
                <p style="margin: 0 0 16px 0; font-size: 13px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.4;">
                  No pending duplicate transaction pairs detected between Email Vault and Google Sheet from August 31, 2026 onwards.
                </p>
                <button type="button" class="kredo-btn-action" data-nav="ledger" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 12.5px;">
                  <span class="material-symbols-outlined text-[16px]">receipt_long</span> View Unified Ledger
                </button>
              </div>
            `}
          </div>

          <!-- Section 2: Active Merged Unified Records & 5-Minute Undo Mechanism -->
          ${mergedRecords && mergedRecords.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px]" style="color: #2563eb;">history</span>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Active Unified Reconciled Records</h3>
                  <span class="kredo-confidence-badge" style="background: #eff6ff; color: #1e40af; border-color: #bfdbfe;">
                    ${mergedRecords.length} records
                  </span>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${mergedRecords.map(m => {
                  const remainingSec = getUndoRemainingSeconds(m);
                  const canUndo = remainingSec > 0;
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 12px; gap: 12px; flex-wrap: wrap;">
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span class="kredo-merged-badge-pill" style="font-size: 10.5px; padding: 2px 7px;">Unified Record</span>
                          <strong style="color: var(--kredo-secondary); font-size: 14px;">${m.unifiedTx.merchant}</strong>
                          <strong style="font-family: var(--kredo-mono); color: var(--kredo-primary); font-size: 15px;">${formatINR(m.unifiedTx.amount)}</strong>
                          <span style="font-size: 11px; color: var(--kredo-outline);">${m.unifiedTx.category} &bull; ${m.unifiedTx.date}</span>
                        </div>
                        <div style="font-size: 11px; color: var(--kredo-outline); margin-top: 4px;">
                          Unified from Email (${m.emailTx?.date || '-'}) + Sheet (${m.sheetTx?.date || '-'}) &bull; Ref: ${m.unifiedTx.referenceId || m.unifiedTx.transactionId || 'Unified'}
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                        ${canUndo ? `
                          <span class="kredo-timer-pill-live" title="5-minute instant reversible unmerge active">
                            <span class="kredo-timer-dot-pulse"></span> Undo: ${formatRemainingTime(remainingSec)}
                          </span>
                          <button type="button" class="kredo-unmerge-btn" data-unmerge="${m.mergeId}" title="Reversible unmerge back to original Email and Sheet rows">
                            <span class="material-symbols-outlined text-[14px]">undo</span> Undo Merge
                          </button>
                        ` : `
                          <span class="kredo-undo-pill" style="opacity: 0.7; font-size: 11px;">Permanent Reconciled</span>
                          <button type="button" class="kredo-unmerge-btn" data-unmerge="${m.mergeId}" style="opacity: 0.85;" title="Unmerge pair">
                            <span class="material-symbols-outlined text-[14px]">undo</span> Unmerge
                          </button>
                        `}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      `;
    }


    if (activeTab === 'insights') {
      const insAnalytics = insightsAnalytics || analytics;
      const categories = insAnalytics.categoryShare || [];
      const topMerchants = insAnalytics.topMerchants || [];
      const paymentMethods = insAnalytics.paymentMethodShare || [];
      const velocityPeriods = insAnalytics.velocityPeriods || [];
      const cumulativeTrajectory = insAnalytics.cumulativeTrajectory || [];
      const aiInsights = insAnalytics.localAiInsights || [];

      const currentSource = insightsSource || dataSource;
      const totalOutflow = insAnalytics.totalDebits || 0;
      const totalInflow = insAnalytics.totalCredits || 0;
      const netFlow = insAnalytics.netCashflow || 0;
      const totalTxCount = (insAnalytics.debitsCount || 0) + (insAnalytics.creditsCount || 0);
      const isFilterActive = insightsTimePreset !== 'all' || selectedMonth !== 'all' || insightsTypeFilter !== 'all' || insightsCategoryFilter !== 'all' || insightsMethodFilter !== 'all' || insightsActiveCategory !== null || Boolean(insightsCustomStart) || Boolean(insightsCustomEnd);

      // Available months for insights pool
      const insMonths = getAvailableMonths(insightsPool.length > 0 ? insightsPool : (dataSource === 'sheet' ? sheetTransactions : (transactions || [])));

      return `
        <!-- PowerBI Executive Visual Analytics & Multi-Tier Insights Engine -->
        <div class="kredo-insights-root">
          
          <!-- PowerBI Multi-Dimensional Slicer & Filter Ribbon -->
          <section class="kredo-insights-filter-card">
            
            <!-- Filter Row 1: Data Stream Segmented Switcher & Flow Direction -->
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--kredo-outline-variant);">
              
              <!-- Left Slicers: Data Stream -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined text-[15px]">database</span> Stream:
                </span>
                <div class="kredo-source-segmented" role="tablist" style="margin: 0;">
                  <button type="button" class="kredo-source-seg-btn ${currentSource === 'kredo' ? 'active' : ''}" data-insights-source="kredo" title="Kredo Email Vault Data Only">
                    <span class="material-symbols-outlined text-[13px]">mail</span>
                    <span class="kredo-seg-text">Email</span>
                  </button>
                  <button type="button" class="kredo-source-seg-btn ${currentSource === 'sheet' ? 'active' : ''}" data-insights-source="sheet" title="Live Google Sheet Stream Only">
                    <span class="material-symbols-outlined text-[13px]">table_chart</span>
                    <span class="kredo-seg-text">Sheet</span>
                    <span class="kredo-live-micro-dot"></span>
                  </button>
                  <button type="button" class="kredo-source-seg-btn ${currentSource === 'all' ? 'active' : ''}" data-insights-source="all" title="Unified Both Streams">
                    <span class="material-symbols-outlined text-[13px]">sync_alt</span>
                    <span class="kredo-seg-text">Unified</span>
                  </button>
                </div>
              </div>

              <!-- Right Slicers: Flow Direction (All / Outflow / Inflow) -->
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline);">Flow:</span>
                <div class="kredo-filter-pills" style="margin: 0;">
                  <button class="kredo-filter-pill ${insightsTypeFilter === 'all' ? 'active' : ''}" data-insights-type="all">All</button>
                  <button class="kredo-filter-pill ${insightsTypeFilter === 'debit' ? 'active' : ''}" data-insights-type="debit">Outflows</button>
                  <button class="kredo-filter-pill ${insightsTypeFilter === 'credit' ? 'active' : ''}" data-insights-type="credit">Inflows</button>
                </div>
              </div>

            </div>

            <!-- Filter Row 2: Date Range Presets & Dimension Selectors -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              
              <!-- Time Presets Pills (Horizontal Scrollable Strip on Mobile) -->
              <div style="display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0;">
                <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); flex-shrink: 0;">Time:</span>
                <div class="kredo-preset-strip">
                  <button class="kredo-preset-pill ${insightsTimePreset === 'all' ? 'active' : ''}" data-insights-preset="all">All Time</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === 'ytd' ? 'active' : ''}" data-insights-preset="ytd">YTD</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === 'this_month' ? 'active' : ''}" data-insights-preset="this_month">This Month</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === 'prev_month' ? 'active' : ''}" data-insights-preset="prev_month">Last Month</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === '30d' ? 'active' : ''}" data-insights-preset="30d">Last 30D</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === '7d' ? 'active' : ''}" data-insights-preset="7d">Last 7D</button>
                  <button class="kredo-preset-pill ${insightsTimePreset === 'custom' ? 'active' : ''}" data-insights-preset="custom">
                    <span class="material-symbols-outlined text-[12px]">calendar_today</span> Custom
                  </button>
                </div>
              </div>

              <!-- Month & Dimension Selectors (Responsive Flex Wrap) -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%;">
                <!-- Month Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-month-select" style="flex: 1 1 110px; min-width: 0; font-size: 12px;" title="Filter by Specific Month">
                  <option value="all" ${selectedMonth === 'all' ? 'selected' : ''}>All Months (${insMonths.length})</option>
                  ${insMonths.map(m => `
                    <option value="${m.key}" ${selectedMonth === m.key ? 'selected' : ''}>${m.label} (${m.count})</option>
                  `).join('')}
                </select>

                <!-- Category Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-category-select" style="flex: 1 1 110px; min-width: 0; font-size: 12px;" title="Filter by Category">
                  <option value="all" ${insightsCategoryFilter === 'all' && !insightsActiveCategory ? 'selected' : ''}>All Categories</option>
                  ${insightsAvailableCategories.map(cat => `
                    <option value="${cat}" ${(insightsActiveCategory === cat || insightsCategoryFilter === cat) ? 'selected' : ''}>${cat}</option>
                  `).join('')}
                </select>

                <!-- Payment Method Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-method-select" style="flex: 1 1 100px; min-width: 0; font-size: 12px;" title="Filter by Payment Channel">
                  <option value="all" ${insightsMethodFilter === 'all' ? 'selected' : ''}>All Methods</option>
                  ${insightsAvailableMethods.map(m => `
                    <option value="${m}" ${insightsMethodFilter === m ? 'selected' : ''}>${m}</option>
                  `).join('')}
                </select>

                <!-- Bank Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-bank-select" style="flex: 1 1 100px; min-width: 0; font-size: 12px;" title="Filter by Bank">
                  <option value="all" ${insightsBankFilter === 'all' ? 'selected' : ''}>All Banks</option>
                  ${insightsAvailableBanks.map(b => `
                    <option value="${b}" ${insightsBankFilter === b ? 'selected' : ''}>${b}</option>
                  `).join('')}
                </select>

                <!-- Payment App Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-app-select" style="flex: 1 1 100px; min-width: 0; font-size: 12px;" title="Filter by Payment App">
                  <option value="all" ${insightsAppFilter === 'all' ? 'selected' : ''}>All Apps</option>
                  ${insightsAvailableApps.map(a => `
                    <option value="${a}" ${insightsAppFilter === a ? 'selected' : ''}>${a}</option>
                  `).join('')}
                </select>

                <!-- Card Network Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-network-select" style="flex: 1 1 100px; min-width: 0; font-size: 12px;" title="Filter by Card Network">
                  <option value="all" ${insightsNetFilter === 'all' ? 'selected' : ''}>All Networks</option>
                  ${insightsAvailableNetworks.map(n => `
                    <option value="${n}" ${insightsNetFilter === n ? 'selected' : ''}>${n}</option>
                  `).join('')}
                </select>

                <!-- Review Flag Slicer Dropdown -->
                <select class="kredo-month-select" id="kredo-insights-review-select" style="flex: 1 1 100px; min-width: 0; font-size: 12px;" title="Filter by Review Status">
                  <option value="all" ${insightsReviewFilter === 'all' ? 'selected' : ''}>All Flags</option>
                  <option value="approved" ${insightsReviewFilter === 'approved' ? 'selected' : ''}>✓ Approved Only</option>
                  <option value="flagged" ${insightsReviewFilter === 'flagged' ? 'selected' : ''}>⚠️ Flagged Only</option>
                  <option value="clear" ${insightsReviewFilter === 'clear' ? 'selected' : ''}>Clear Only</option>
                </select>
              </div>

            </div>

            <!-- Custom Date Inputs (Conditionally revealed when 'custom' preset is active) -->
            ${insightsTimePreset === 'custom' ? `
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--kredo-surface-container-low); padding: 8px 12px; border-radius: 10px; margin-top: 10px; border: 1px solid var(--kredo-outline-variant);">
                <span style="font-size: 11.5px; font-weight: 700; color: var(--kredo-secondary); display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined text-[15px] text-boro-primary">date_range</span> Span:
                </span>
                <input type="date" id="kredo-insights-start-date" value="${insightsCustomStart || ''}" class="kredo-date-input" style="padding: 5px 8px; border-radius: 6px; border: 1px solid var(--kredo-outline-variant); font-family: var(--kredo-mono); font-size: 11.5px; background: #fff; flex: 1 1 110px;">
                <span style="font-size: 11px; color: var(--kredo-outline);">➔</span>
                <input type="date" id="kredo-insights-end-date" value="${insightsCustomEnd || ''}" class="kredo-date-input" style="padding: 5px 8px; border-radius: 6px; border: 1px solid var(--kredo-outline-variant); font-family: var(--kredo-mono); font-size: 11.5px; background: #fff; flex: 1 1 110px;">
              </div>
            ` : ''}

            <!-- Active Filter Badges Bar & 1-Click Reset -->
            ${isFilterActive ? `
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--kredo-outline-variant);">
                <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                  <span style="font-size: 10px; font-weight: 800; color: var(--kredo-outline); text-transform: uppercase;">Active Slicers:</span>
                  ${currentSource !== 'kredo' ? `<span class="kredo-active-chip">Stream: ${currentSource === 'sheet' ? 'Google Sheet' : 'Unified'}</span>` : ''}
                  ${insightsTimePreset !== 'all' ? `<span class="kredo-active-chip">Window: ${insightsTimePreset.toUpperCase()}</span>` : ''}
                  ${selectedMonth !== 'all' ? `<span class="kredo-active-chip">Month: ${selectedMonth}</span>` : ''}
                  ${insightsTypeFilter !== 'all' ? `<span class="kredo-active-chip">Flow: ${insightsTypeFilter}</span>` : ''}
                  ${insightsActiveCategory ? `<span class="kredo-active-chip" style="background: ${getCategoryColor(insightsActiveCategory)}20; color: ${getCategoryColor(insightsActiveCategory)}; border-color: ${getCategoryColor(insightsActiveCategory)}60;">Category: ${insightsActiveCategory}</span>` : (insightsCategoryFilter !== 'all' ? `<span class="kredo-active-chip">Category: ${insightsCategoryFilter}</span>` : '')}
                  ${insightsMethodFilter !== 'all' ? `<span class="kredo-active-chip">Channel: ${insightsMethodFilter}</span>` : ''}
                  ${insightsBankFilter !== 'all' ? `<span class="kredo-active-chip">Bank: ${insightsBankFilter}</span>` : ''}
                  ${insightsAppFilter !== 'all' ? `<span class="kredo-active-chip">App: ${insightsAppFilter}</span>` : ''}
                  ${insightsNetFilter !== 'all' ? `<span class="kredo-active-chip">Network: ${insightsNetFilter}</span>` : ''}
                  ${insightsReviewFilter !== 'all' ? `<span class="kredo-active-chip" style="background:#fef3c7; color:#92400e; border-color:#fde68a;">Review: ${insightsReviewFilter}</span>` : ''}
                  <span style="font-size: 11px; font-weight: 600; color: var(--kredo-outline); margin-left: 2px;">(${insightsFilteredTxs.length} rows)</span>
                </div>
                <button type="button" id="kredo-reset-insights-filters-btn" class="kredo-reset-filters-btn">
                  <span class="material-symbols-outlined text-[13px]">restart_alt</span> Reset Slicers
                </button>
              </div>
            ` : ''}

          </section>

          <!-- PowerBI Executive KPI Metric Ribbon (6 High-Density Telemetry Cards) -->
          <section class="kredo-kpi-ribbon">
            
            <!-- Outflows KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; border-left: 3.5px solid var(--kredo-secondary);">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">arrow_outward</span> Outflows
                </span>
                <strong style="font-size: 18px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary); display: block; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${formatINR(totalOutflow)}
                </strong>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: var(--kredo-outline); margin-top: 4px;">
                ${insAnalytics.debitsCount || 0} debits
              </span>
            </div>

            <!-- Inflows KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; border-left: 3.5px solid var(--kredo-green);">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">call_received</span> Inflows
                </span>
                <strong style="font-size: 18px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-green); display: block; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${formatINR(totalInflow)}
                </strong>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: var(--kredo-outline); margin-top: 4px;">
                ${insAnalytics.creditsCount || 0} credits
              </span>
            </div>

            <!-- Net Cashflow KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; border-left: 3.5px solid ${netFlow >= 0 ? 'var(--kredo-primary)' : 'var(--kredo-error)'};">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">account_balance_wallet</span> Net
                </span>
                <strong style="font-size: 18px; font-weight: 800; font-family: var(--kredo-mono); color: ${netFlow >= 0 ? 'var(--kredo-primary)' : 'var(--kredo-error)'}; display: block; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${netFlow >= 0 ? '+' : ''}${formatINR(netFlow)}
                </strong>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: ${netFlow >= 0 ? 'var(--kredo-primary)' : 'var(--kredo-error)'}; margin-top: 4px;">
                ${insAnalytics.savingsRatio}% saved
              </span>
            </div>

            <!-- Daily Burn Pace KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">local_fire_department</span> Burn Pace
                </span>
                <strong style="font-size: 17px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary); display: block; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${formatINR(insAnalytics.dailyAverageSpend || 0)}/d
                </strong>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: var(--kredo-outline); margin-top: 4px;">
                ${Object.keys(insAnalytics.dailyMap || {}).length} active days
              </span>
            </div>

            <!-- Flagged & Approved Audit Alerts KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; border-left: 3.5px solid ${insAnalytics.reviewFlagStats?.totalFlagged > 0 ? '#f59e0b' : 'var(--kredo-green)'};">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">verified_user</span> Audit Review
                </span>
                <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 3px; flex-wrap: wrap;">
                  <strong style="font-size: 16px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-green);">
                    ${insAnalytics.reviewFlagStats?.totalApproved || 0} approved
                  </strong>
                  ${insAnalytics.reviewFlagStats?.totalFlagged > 0 ? `
                    <span style="font-size: 12px; font-weight: 700; font-family: var(--kredo-mono); color: #b45309;">
                      (${insAnalytics.reviewFlagStats?.totalFlagged} flagged)
                    </span>
                  ` : ''}
                </div>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: var(--kredo-outline); margin-top: 4px;">
                ${insAnalytics.linkedBillStats?.totalLinkedCount || 0} bill linked txs
              </span>
            </div>

            <!-- Total Transactions KPI -->
            <div class="kredo-card" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); display: flex; align-items: center; gap: 3px;">
                  <span class="material-symbols-outlined text-[13px]">speed</span> Volume
                </span>
                <strong style="font-size: 17px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary); display: block; margin-top: 3px;">
                  ${totalTxCount} txs
                </strong>
              </div>
              <span style="font-size: 10.5px; font-weight: 600; color: var(--kredo-outline); margin-top: 4px;">
                ${categories.length} categories
              </span>
            </div>

          </section>

          <!-- PowerBI Visual Analytics Canvas (Responsive Grid) -->
          <div class="kredo-powerbi-grid">
            
            <!-- VISUAL 1: Interactive Category Allocation Donut / Pie Chart & Interactive Slicer Legend -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <div style="min-width: 0;">
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">pie_chart</span> Category Allocation
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Click slice or legend to isolate</span>
                </div>
                ${insightsActiveCategory ? `
                  <button type="button" class="kredo-mini-reset-btn" data-filter-cat="${encodeURIComponent(insightsActiveCategory)}" title="Clear category filter" style="flex-shrink: 0;">
                    <span>Clear (${insightsActiveCategory})</span>
                    <span class="material-symbols-outlined text-[12px]">close</span>
                  </button>
                ` : `<span style="font-size: 11.5px; font-weight: 700; font-family: var(--kredo-mono); color: var(--kredo-primary); flex-shrink: 0;">${categories.length} Categories</span>`}
              </div>

              <!-- Donut Chart Canvas -->
              <div style="display: flex; flex-direction: column; align-items: center; padding: 6px 0; width: 100%; box-sizing: border-box;">
                ${renderDonutChart(categories, totalOutflow, { size: 240, strokeWidth: 32, activeCategory: insightsActiveCategory })}
              </div>

              <!-- Interactive Category Slicer Legend -->
              ${renderCategoryLegend(categories, insightsActiveCategory)}
            </div>

            <!-- VISUAL 2: Dual Periodic Cashflow Velocity Bar Chart (Inflow vs Outflow) -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">bar_chart</span> Periodic Cashflow Velocity
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Inflows (Emerald) vs Outflows (Obsidian)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 700;">
                  <span style="display: flex; align-items: center; gap: 3px; color: var(--kredo-secondary);">
                    <span style="width: 7px; height: 7px; border-radius: 2px; background: var(--kredo-secondary);"></span> Outflows
                  </span>
                  <span style="display: flex; align-items: center; gap: 3px; color: var(--kredo-green);">
                    <span style="width: 7px; height: 7px; border-radius: 2px; background: var(--kredo-green);"></span> Inflows
                  </span>
                </div>
              </div>

              <!-- Velocity Bar Chart Canvas -->
              <div style="padding: 4px 0; width: 100%; box-sizing: border-box; overflow: hidden;">
                ${renderVelocityBarChart(velocityPeriods, { width: 500, height: 210 })}
              </div>

              <div style="background: var(--kredo-surface-container-low); border-radius: 8px; padding: 8px 12px; font-size: 11.5px; color: var(--kredo-on-surface-variant); display: flex; justify-content: space-between; align-items: center;">
                <span>Velocity Periods: <strong>${velocityPeriods.length}</strong></span>
                <span style="font-family: var(--kredo-mono); font-weight: 700; color: var(--kredo-secondary);">Net: ${netFlow >= 0 ? '+' : ''}${formatINR(netFlow)}</span>
              </div>
            </div>

            <!-- VISUAL 3: Cumulative Liquidity & Burn Trajectory (Spline Curve Area Fill) -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">show_chart</span> Cumulative Burn Trajectory
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Running cumulative spend progression</span>
                </div>
                <span style="font-size: 11.5px; font-weight: 700; font-family: var(--kredo-mono); color: var(--kredo-secondary);">Peak: ${formatINR(totalOutflow)}</span>
              </div>

              <!-- Spline Curve Canvas -->
              <div style="padding: 4px 0; width: 100%; box-sizing: border-box; overflow: hidden;">
                ${renderCumulativeLineChart(cumulativeTrajectory, { width: 500, height: 190 })}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--kredo-outline);">
                <span>Start: ${cumulativeTrajectory[0]?.date || '—'}</span>
                <span>End: ${cumulativeTrajectory[cumulativeTrajectory.length - 1]?.date || '—'}</span>
              </div>
            </div>

            <!-- VISUAL 4: Top Spending Merchants & Hotspots (Horizontal Ranking Progress Bars) -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">local_convenience_store</span> Top Outflow Merchants
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Highest volume payees by expenditure</span>
                </div>
                <span style="font-size: 11px; color: var(--kredo-outline);">Top ${Math.min(topMerchants.length, 6)} Payees</span>
              </div>

              <!-- Horizontal Progress Bars -->
              ${renderHorizontalBarRanking(topMerchants, { total: totalOutflow, maxItems: 6 })}
            </div>

            <!-- VISUAL 5: Payment Channel & Settlement Matrix -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px] text-boro-primary">payments</span> Payment Channel Distribution
                </h3>
                <span style="font-size: 11px; color: var(--kredo-outline);">Settlement breakdown across payment rails</span>
              </div>

              ${(paymentMethods.length > 0 && totalOutflow > 0) ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); gap: 10px;">
                  ${paymentMethods.map(pm => `
                    <div style="background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <span style="font-size: 10px; font-weight: 700; color: var(--kredo-outline); text-transform: uppercase;">${pm.method}</span>
                        <strong style="font-size: 14.5px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary); display: block; margin-top: 3px;">
                          ${formatINR(pm.amount)}
                        </strong>
                      </div>
                      <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10.5px; color: var(--kredo-outline);">${pm.count} txs</span>
                        <span style="font-size: 10.5px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-primary); background: var(--kredo-primary-fixed); padding: 1px 5px; border-radius: 4px;">${pm.percentage}%</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding: 24px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[28px]" style="opacity: 0.35; margin-bottom: 4px; color: var(--kredo-primary);">credit_card</span>
                  <span style="font-weight: 700; color: var(--kredo-secondary);">No Outflows In This Filter</span>
                  <span style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 2px;">Payment channel breakdown will display when outflow transactions exist</span>
                </div>
              `}
            </div>

            <!-- VISUAL 6: Banking & Issuer Share Ranking -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">account_balance</span> Bank & Financial Institutions
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">Volume & share across banking accounts</span>
                </div>
                <span style="font-size: 11px; color: var(--kredo-outline);">${(insAnalytics.bankShare || []).length} Banks</span>
              </div>

              ${(insAnalytics.bankShare && insAnalytics.bankShare.length > 0) ? `
                ${renderHorizontalBarRanking(insAnalytics.bankShare, { total: totalOutflow, maxItems: 6 })}
              ` : `
                <div style="padding: 24px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px;">
                  <span class="material-symbols-outlined text-[24px]" style="opacity: 0.4; margin-bottom: 4px; display: block;">account_balance</span>
                  No identified bank records in this filter
                </div>
              `}
            </div>

            <!-- VISUAL 7: Payment Apps & Rails Dominance -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined text-[18px] text-boro-primary">smartphone</span> Payment Apps & Wallets
                  </h3>
                  <span style="font-size: 11px; color: var(--kredo-outline);">CRED, Google Pay, PhonePe & fintech rails</span>
                </div>
                <span style="font-size: 11px; color: var(--kredo-outline);">${(insAnalytics.paymentAppShare || []).length} Apps</span>
              </div>

              ${(insAnalytics.paymentAppShare && insAnalytics.paymentAppShare.length > 0) ? `
                ${renderHorizontalBarRanking(insAnalytics.paymentAppShare, { total: totalOutflow, maxItems: 6 })}
              ` : `
                <div style="padding: 24px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px;">
                  <span class="material-symbols-outlined text-[24px]" style="opacity: 0.4; margin-bottom: 4px; display: block;">smartphone</span>
                  No payment app data identified
                </div>
              `}
            </div>

            <!-- VISUAL 8: Card Networks & Rails Distribution -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px] text-boro-primary">credit_score</span> Card Networks & Rails
                </h3>
                <span style="font-size: 11px; color: var(--kredo-outline);">Visa, Mastercard, RuPay & Amex spend split</span>
              </div>

              ${(insAnalytics.cardNetworkShare && insAnalytics.cardNetworkShare.length > 0) ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); gap: 10px;">
                  ${insAnalytics.cardNetworkShare.map(net => `
                    <div style="background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 10px; padding: 10px 12px;">
                      <span style="font-size: 10px; font-weight: 800; color: #7e22ce; text-transform: uppercase;">${net.cardNetwork}</span>
                      <strong style="font-size: 14px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary); display: block; margin-top: 3px;">
                        ${formatINR(net.amount)}
                      </strong>
                      <div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 10.5px; color: var(--kredo-outline);">
                        <span>${net.count} txs</span>
                        <span style="font-weight: 700; color: #7e22ce;">${net.percentage}%</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding: 24px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px;">
                  <span class="material-symbols-outlined text-[24px]" style="opacity: 0.4; margin-bottom: 4px; display: block;">credit_card</span>
                  No card network records in this filter
                </div>
              `}
            </div>

            <!-- VISUAL 9: Spend Nature Profile (Discretionary vs Essential) -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px] text-boro-primary">tune</span> Spend Nature & Lifestyle Split
                </h3>
                <span style="font-size: 11px; color: var(--kredo-outline);">Discretionary, Essential, Subscription & Investments</span>
              </div>

              ${(insAnalytics.natureShare && insAnalytics.natureShare.length > 0) ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${insAnalytics.natureShare.map(nat => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--kredo-surface-container-low); border-radius: 8px; border: 1px solid var(--kredo-outline-variant);">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="kredo-nature-tag">${nat.nature}</span>
                        <span style="font-size: 11.5px; color: var(--kredo-outline);">${nat.count} transactions</span>
                      </div>
                      <div style="text-align: right;">
                        <strong style="font-size: 13px; font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(nat.amount)}</strong>
                        <span style="font-size: 11px; color: var(--kredo-outline); margin-left: 4px;">(${nat.percentage}%)</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding: 24px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px;">
                  No nature classification records in this filter
                </div>
              `}
            </div>

            <!-- VISUAL 10: Actionable On-Device AI Financial Intelligence -->
            <div class="kredo-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px] text-boro-primary">psychology</span> Executive AI Telemetry
                </h3>
                <span style="font-size: 11px; color: var(--kredo-outline);">Privacy-first on-device financial intelligence</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${aiInsights.length > 0 ? aiInsights.map(ai => `
                  <div style="background: #ffffff; border-left: 3.5px solid ${ai.color || 'var(--kredo-primary)'}; border-radius: 8px; padding: 10px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); border-top: 1px solid var(--kredo-outline-variant); border-right: 1px solid var(--kredo-outline-variant); border-bottom: 1px solid var(--kredo-outline-variant);">
                    <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: ${ai.color || 'var(--kredo-primary)'}; margin-bottom: 2px;">
                      ${ai.tag || 'AI TELEMETRY'}
                    </div>
                    <strong style="font-size: 13px; color: var(--kredo-secondary); display: block; margin-bottom: 2px;">
                      ${ai.title || 'Financial Pace'}
                    </strong>
                    <p style="font-size: 11.5px; color: var(--kredo-on-surface-variant); margin: 0; line-height: 1.35;">
                      ${ai.desc || ai.message || ''}
                    </p>
                  </div>
                `).join('') : '<p style="color: var(--kredo-outline); font-size: 12px; text-align: center; padding: 16px 0;">Record transactions to view on-device AI intelligence.</p>'}
              </div>
            </div>

          </div>

        </div>
      `;
    }

    if (activeTab === 'ai') {
      return `
        <!-- AI Financial Health & Overview -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Month Selector for AI -->
          <section class="kredo-filter-strip">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--kredo-secondary); display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined text-[18px]">psychology</span> Executive AI Telemetry
            </div>

            <select class="kredo-month-select" id="kredo-month-dropdown">
              <option value="all" ${selectedMonth === 'all' ? 'selected' : ''}>All History</option>
              ${availableMonths.map(m => `
                <option value="${m.key}" ${selectedMonth === m.key ? 'selected' : ''}>${m.label}</option>
              `).join('')}
            </select>
          </section>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
            <div class="kredo-card">
              <div style="background: var(--kredo-primary-fixed); border-radius: 14px; padding: 18px 20px; color: var(--kredo-on-primary-fixed); margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="material-symbols-outlined text-[20px]" style="color: var(--kredo-primary);">shield_check</span>
                  <strong style="font-size: 15px;">Executive Cashflow Health</strong>
                </div>
                <p style="font-size: 12.5px; margin: 0; line-height: 1.4; opacity: 0.9;">
                  Retained liquidity: ${formatINR(analytics.netCashflow)}. All computations executed privately on-device with zero cloud telemetry.
                </p>
              </div>

              <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">Summary Metrics</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: var(--kredo-surface-container-low); padding: 12px 14px; border-radius: 8px;">
                  <span style="font-size: 11px; color: var(--kredo-outline); display: block;">Total Inflows</span>
                  <strong style="font-size: 16px; color: var(--kredo-green);">${formatINR(analytics.totalCredits)}</strong>
                </div>
                <div style="background: var(--kredo-surface-container-low); padding: 12px 14px; border-radius: 8px;">
                  <span style="font-size: 11px; color: var(--kredo-outline); display: block;">Total Outflows</span>
                  <strong style="font-size: 16px; color: var(--kredo-secondary);">${formatINR(analytics.totalDebits)}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;
    }

    return '';
  }

  // Modals & Bottom Drawers
  renderActiveModal(filteredTxs) {
    const { activeModal, selectedTx, selectedCard, importDraft } = this.state;
    if (!activeModal) return '';

    // ADD CREDIT CARD MODAL
    if (activeModal === 'add-card') {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 480px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Add Credit Card</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-add-card-form" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Bank</label>
                  <select class="kredo-form-select" id="card-bank" required>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="Axis">Axis Bank</option>
                    <option value="SBI">SBI Card</option>
                    <option value="Amex">American Express</option>
                    <option value="Kotak">Kotak Mahindra</option>
                    <option value="Standard Chartered">Standard Chartered</option>
                    <option value="Other">Other Bank</option>
                  </select>
                </div>

                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Name</label>
                  <input type="text" class="kredo-form-input" id="card-name" placeholder="e.g. Regalia Gold, Ace" required />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Number / Last 4</label>
                  <input type="text" class="kredo-form-input" id="card-number" placeholder="•••• 4028" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Expiry</label>
                  <input type="text" class="kredo-form-input" id="card-expiry" placeholder="08/29" maxlength="5" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">CVV</label>
                  <input type="password" class="kredo-form-input" id="card-cvv" placeholder="•••" maxlength="4" />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Cardholder Name</label>
                <input type="text" class="kredo-form-input" id="card-holder" value="${this.profile?.displayName || 'Maaz Mohammed'}" required />
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Credit Limit (₹)</label>
                <input type="number" step="any" min="0" class="kredo-form-input" id="card-total-limit" placeholder="e.g. 500000" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Available Limit (₹)</label>
                  <input type="number" step="any" min="0" class="kredo-form-input" id="card-current-limit" placeholder="e.g. 420000" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Or Used / Outstanding (₹)</label>
                  <input type="number" step="any" min="0" class="kredo-form-input" id="card-used-limit" placeholder="e.g. 80000" />
                </div>
              </div>

              <!-- Live Calculation Preview -->
              <div id="card-limit-calc-preview" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--kredo-surface-container-low); border-radius: 8px; font-size: 12px; border: 1px solid var(--kredo-outline-variant);">
                <span style="color: var(--kredo-outline); font-size: 11.5px;">Auto-calculated breakdown:</span>
                <strong style="color: var(--kredo-primary); font-family: var(--kredo-mono);" id="card-preview-used">₹0 Used &bull; ₹0 Avail (0%)</strong>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Bill Date (Day of Month)</label>
                  <input type="number" min="1" max="31" class="kredo-form-input" id="card-bill-day" value="15" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment Due Day</label>
                  <input type="number" min="1" max="31" class="kredo-form-input" id="card-due-day" value="5" required />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 6px;">Card Color Theme</label>
                <div style="display: flex; gap: 8px;">
                  ${DEFAULT_CARD_GRADIENTS.map(g => `
                    <label class="kredo-theme-pill-label" data-theme-val="${g.id}" style="flex: 1; height: 36px; border-radius: 8px; background: ${g.background}; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 2px solid ${g.id === 'obsidian' ? 'var(--kredo-primary)' : 'rgba(0,0,0,0.1)'}; transition: all 0.15s; position: relative;" title="${g.name}">
                      <input type="radio" name="card-theme" value="${g.id}" ${g.id === 'obsidian' ? 'checked' : ''} style="opacity: 0; width: 0; height: 0; position: absolute;" />
                      <span class="theme-check material-symbols-outlined text-[16px]" style="color: #ffffff; display: ${g.id === 'obsidian' ? 'inline-block' : 'none'};">check</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <button type="submit" class="kredo-btn-action" style="width: 100%; margin-top: 6px;">
                Save Card to Vault
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // EDIT CREDIT CARD MODAL
    if (activeModal === 'edit-card' && selectedCard) {
      const initUsed = selectedCard.usedLimit !== undefined ? selectedCard.usedLimit : Math.max(0, selectedCard.totalLimit - selectedCard.currentLimit);
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 480px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Edit ${selectedCard.cardName}</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-edit-card-form" style="display: flex; flex-direction: column; gap: 12px;">
              <input type="hidden" id="edit-card-id" value="${selectedCard.id}" />

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Name</label>
                  <input type="text" class="kredo-form-input" id="edit-card-name" value="${selectedCard.cardName}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Last 4 Digits</label>
                  <input type="text" class="kredo-form-input" id="edit-card-last4" value="${selectedCard.last4}" maxlength="4" required />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Credit Limit (₹)</label>
                <input type="number" step="any" min="0" class="kredo-form-input" id="edit-card-total-limit" value="${selectedCard.totalLimit}" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Available Limit (₹)</label>
                  <input type="number" step="any" min="0" class="kredo-form-input" id="edit-card-current-limit" value="${selectedCard.currentLimit}" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Or Used / Outstanding (₹)</label>
                  <input type="number" step="any" min="0" class="kredo-form-input" id="edit-card-used-limit" value="${initUsed}" />
                </div>
              </div>

              <!-- Live Calculation Preview in Edit Modal -->
              <div id="edit-card-limit-calc-preview" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--kredo-surface-container-low); border-radius: 8px; font-size: 12px; border: 1px solid var(--kredo-outline-variant);">
                <span style="color: var(--kredo-outline); font-size: 11.5px;">Auto-calculated breakdown:</span>
                <strong style="color: var(--kredo-primary); font-family: var(--kredo-mono);" id="edit-card-preview-used">${formatINR(initUsed)} Used &bull; ${formatINR(selectedCard.currentLimit)} Avail (${selectedCard.utilization || 0}%)</strong>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Billing Day</label>
                  <input type="number" min="1" max="31" class="kredo-form-input" id="edit-card-bill-day" value="${selectedCard.billDay}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment Due Day</label>
                  <input type="number" min="1" max="31" class="kredo-form-input" id="edit-card-due-day" value="${selectedCard.dueDay}" required />
                </div>
              </div>

              <div style="display: flex; gap: 10px; margin-top: 8px;">
                <button type="button" class="kredo-btn-action secondary" id="edit-card-cancel-btn" style="flex: 1;">Cancel</button>
                <button type="submit" class="kredo-btn-action" style="flex: 1;">Update Card</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // TRANSACTION PREVIEW & DETAIL INSPECTOR (Pure, clean, structured receipt for all 24 fields)
    if (activeModal === 'preview' && selectedTx) {
      const tx = selectedTx;
      const finStatus = resolveFinancialStatus(tx);
      const isFlagged = finStatus.isFlagged;

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 500px; max-height: 88vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="kredo-tx-avatar ${tx.type === 'credit' ? 'credit' : 'debit'}">
                  ${getCategoryIcon(tx.category, tx.type)}
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">${tx.merchant || 'Transaction Item'}</h3>
                  <span style="font-size: 11.5px; color: var(--kredo-outline);">${tx.category || 'Financial Entry'}</span>
                </div>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Highlight Reason Banner -->
            <div class="kredo-highlight-reason-banner ${finStatus.tier}">
              <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; margin-bottom: 2px;">Highlight Reason</div>
              <div>${finStatus.highlightReason}</div>
            </div>

            <!-- Prominent Amount & Status Display -->
            <div style="background: var(--kredo-surface-container-low); border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 14px; border: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">
                  ${tx.type === 'credit' ? 'Inflow (Credit)' : 'Outflow (Debit)'}
                </span>
                <span class="kredo-status-pill ${finStatus.tier}">
                  ${finStatus.badgeLabel}
                </span>
              </div>
              <div style="font-size: 30px; font-weight: 800; font-family: var(--kredo-mono); color: ${tx.type === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)'};">
                ${tx.type === 'credit' ? '+' : '-'}${formatINR(tx.amount || 0)}
              </div>
              <div style="font-size: 11px; color: var(--kredo-outline); margin-top: 3px; font-family: var(--kredo-mono);">
                ${tx.currency || 'INR'}
              </div>
            </div>

            <!-- SECTION 1: PRIMARY DETAILS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Primary Details
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Date & Time</span>
                  <strong style="color: var(--kredo-secondary);">${tx.date || '-'} &bull; ${format12HourTime(tx.time) || tx.time || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Due Date</span>
                  <strong style="color: ${finStatus.tier === 'overdue' ? 'var(--kredo-status-red-text)' : (finStatus.tier === 'due-soon' || finStatus.tier === 'due-today' ? 'var(--kredo-status-orange-text)' : 'var(--kredo-secondary)')}; font-family: var(--kredo-mono);">${finStatus.dueDate ? `${finStatus.dueDate}${finStatus.daysToDue !== null ? ` (${finStatus.daysToDue === 0 ? 'Due Today' : (finStatus.daysToDue < 0 ? `${Math.abs(finStatus.daysToDue)}d overdue` : `in ${finStatus.daysToDue}d`)})` : ''}` : '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Merchant / Payee</span>
                  <strong style="color: var(--kredo-secondary);">${tx.merchant || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Category</span>
                  <strong style="color: var(--kredo-secondary);">${tx.category || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Status</span>
                  <strong style="color: var(--kredo-secondary);">${tx.status || finStatus.status || '-'}</strong>
                </div>
              </div>
            </div>

            <!-- SECTION 2: BANKING & CARDS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Banking & Cards
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Bank</span>
                  <strong style="color: var(--kredo-secondary);">${tx.bank || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Account / Card</span>
                  <strong style="color: var(--kredo-secondary);">${tx.cardOrAccount || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Last 4 Digits</span>
                  <strong style="font-family: var(--kredo-mono); color: var(--kredo-secondary);">${tx.cardLast4 ? `••••${tx.cardLast4}` : '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Card Network</span>
                  <strong style="color: var(--kredo-secondary);">${tx.cardNetwork || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Reference ID / UTR</span>
                  <strong style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-secondary);">${tx.referenceId || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Transaction ID</span>
                  <strong style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-secondary);">${tx.transactionId || '-'}</strong>
                </div>
              </div>
            </div>

            <!-- SECTION 3: PROCESSING & CLASSIFICATION -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Processing & Classification
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Payment Method</span>
                  <strong style="color: var(--kredo-secondary);">${tx.paymentMethod || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Payment App</span>
                  <strong style="color: #4f46e5;">${tx.paymentApp || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Nature of Spend</span>
                  <strong style="color: var(--kredo-secondary);">${tx.nature || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Linked Bill ID</span>
                  <strong style="font-family: var(--kredo-mono); color: #0000d6;">${tx.linkedBillId || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Source</span>
                  <span style="color: var(--kredo-secondary);">${tx.source || 'Email Vault'}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 4: AI PARSER AUDIT & REVIEW -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                AI Parser & Verification
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Review Flag</span>
                  <span style="font-weight: 700; color: ${isFlagged ? '#b45309' : 'var(--kredo-green)'};">${tx.reviewFlag ? `<span class="kredo-status-pill flagged">${tx.reviewFlag}</span>` : 'Clear (Verified)'}</span>
                </div>
                ${tx.reviewReason ? `
                  <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px;">
                    <span style="color: #b45309; font-weight: 600;">Review Reason</span>
                    <span style="color: #92400e; font-weight: 600;">${tx.reviewReason}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Parser Confidence</span>
                  <span style="font-family: var(--kredo-mono); color: var(--kredo-secondary); font-weight: 600;">${tx.confidence ? `${Math.round(Number(tx.confidence) * 100)}% (${tx.confidence})` : '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Parser Version</span>
                  <span style="font-family: var(--kredo-mono); color: var(--kredo-outline);">${tx.parserVersion || '-'}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 5: NOTES & RAW MESSAGE -->
            <div style="margin-bottom: 14px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Audit Trail & Notification Stream
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                ${tx.notes ? `
                  <div style="padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                    <span style="color: var(--kredo-outline); font-size: 10px; display: block; margin-bottom: 2px;">Notes</span>
                    <span style="color: var(--kredo-secondary);">${tx.notes}</span>
                  </div>
                ` : ''}
                ${tx.rawMessage ? `
                  <div style="padding: 7px 10px; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                    <span style="color: var(--kredo-outline); font-size: 10px; display: block; margin-bottom: 2px;">Raw Notification Payload</span>
                    <span style="font-family: var(--kredo-mono); font-size: 10.5px; color: var(--kredo-secondary); word-break: break-word; line-height: 1.4;">${tx.rawMessage}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
              ${!finStatus.isApproved ? `
                <button type="button" class="kredo-btn-action" data-modal-approve-tx="${tx.id}" style="background: #10b981; color: #fff; width: 100%; padding: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[17px]">check_circle</span> Mark as Approved & Sync to Insights
                </button>
              ` : `
                <div style="text-align: center; padding: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #047857; font-size: 12px; font-weight: 700;">
                  ✓ Approved & Synchronized with Insights
                </div>
              `}
              <div style="display: flex; gap: 8px;">
                <button class="kredo-btn-action secondary" id="close-modal-btn-2" style="flex: 1; padding: 10px;">
                  Close
                </button>
                <button class="kredo-btn-action" data-modal-tag-tx="${tx.id}" style="flex: 1; padding: 10px; background: #4f46e5; color: #fff;">
                  <span class="material-symbols-outlined text-[15px]">label</span> Tag
                </button>
                <button class="kredo-btn-action" data-modal-edit-tx="${tx.id}" style="flex: 1; padding: 10px;">
                  Edit Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // GOOGLE SHEET READ-ONLY NOTICE / DETAIL MODAL (Full 24-column live inspection)
    if (activeModal === 'sheet-readonly-notice' || activeModal === 'sheet-detail') {
      const tx = selectedTx || {};
      const finStatus = resolveFinancialStatus(tx);
      const isFlagged = finStatus.isFlagged;

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 500px; max-height: 88vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(15, 157, 88, 0.12); color: #0f9d58; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span class="material-symbols-outlined text-[22px]">table_chart</span>
                </div>
                <div>
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f9d58; letter-spacing: 0.5px;">Google Sheet Live Record</div>
                  <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">${tx.merchant || 'Live Transaction'}</h3>
                </div>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Highlight Reason Banner -->
            <div class="kredo-highlight-reason-banner ${finStatus.tier}">
              <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; margin-bottom: 2px;">Highlight Reason</div>
              <div>${finStatus.highlightReason}</div>
            </div>

            <!-- Notice Box: Exact message requested by user -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span class="material-symbols-outlined text-[16px]" style="color: #16a34a; flex-shrink: 0; margin-top: 1px;">info</span>
                <p style="margin: 0; font-size: 11.5px; color: #166534; line-height: 1.4; font-weight: 500;">
                  For any delete and edit, make changes in the Google Sheet, it will automatically reflect here.
                </p>
              </div>
            </div>

            <!-- Prominent Amount Display -->
            <div style="background: var(--kredo-surface-container-low); border-radius: 12px; padding: 14px 18px; text-align: center; margin-bottom: 14px; border: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline);">
                  ${tx.type === 'credit' ? 'Inflow (Credit)' : 'Outflow (Debit)'}
                </span>
                <span class="kredo-status-pill ${finStatus.tier}">
                  ${finStatus.badgeLabel}
                </span>
              </div>
              <div style="font-size: 28px; font-weight: 800; font-family: var(--kredo-mono); color: ${tx.type === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)'};">
                ${tx.type === 'credit' ? '+' : '-'}${formatINR(tx.amount || 0)}
              </div>
              <div style="font-size: 11px; color: var(--kredo-outline); font-family: var(--kredo-mono); margin-top: 2px;">
                ${tx.currency || 'INR'}
              </div>
            </div>

            <!-- SECTION 1: PRIMARY DETAILS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); margin-bottom: 5px;">Primary Details</div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Date & Time</span>
                  <span style="font-weight: 600; color: var(--kredo-secondary);">${tx.date || '-'} &bull; ${format12HourTime(tx.time) || tx.time || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Due Date</span>
                  <strong style="color: ${finStatus.tier === 'overdue' ? 'var(--kredo-status-red-text)' : (finStatus.tier === 'due-soon' || finStatus.tier === 'due-today' ? 'var(--kredo-status-orange-text)' : 'var(--kredo-secondary)')}; font-family: var(--kredo-mono);">${finStatus.dueDate ? `${finStatus.dueDate}${finStatus.daysToDue !== null ? ` (${finStatus.daysToDue === 0 ? 'Due Today' : (finStatus.daysToDue < 0 ? `${Math.abs(finStatus.daysToDue)}d overdue` : `in ${finStatus.daysToDue}d`)})` : ''}` : '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Merchant</span>
                  <strong style="color: var(--kredo-secondary);">${tx.merchant || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Category</span>
                  <strong style="color: var(--kredo-secondary);">${tx.category || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Status</span>
                  <strong style="color: var(--kredo-secondary);">${tx.status || finStatus.status || '-'}</strong>
                </div>
              </div>
            </div>

            <!-- SECTION 2: BANK & CARDS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); margin-bottom: 5px;">Banking & Cards</div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Bank</span>
                  <strong style="color: var(--kredo-secondary);">${tx.bank || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Account</span>
                  <strong style="color: var(--kredo-secondary);">${tx.cardOrAccount || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Last 4</span>
                  <strong style="font-family: var(--kredo-mono); color: var(--kredo-secondary);">${tx.cardLast4 ? `••••${tx.cardLast4}` : '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Card Network</span>
                  <strong style="color: var(--kredo-secondary);">${tx.cardNetwork || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Reference ID</span>
                  <strong style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-secondary);">${tx.referenceId || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Transaction ID</span>
                  <strong style="font-family: var(--kredo-mono); font-size: 11px; color: var(--kredo-secondary);">${tx.transactionId || '-'}</strong>
                </div>
              </div>
            </div>

            <!-- SECTION 3: APP & STATUS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); margin-bottom: 5px;">Payment App & Status</div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Payment Method</span>
                  <strong style="color: var(--kredo-secondary);">${tx.paymentMethod || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Payment App</span>
                  <strong style="color: #4f46e5;">${tx.paymentApp || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Nature</span>
                  <strong style="color: var(--kredo-secondary);">${tx.nature || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Linked Bill ID</span>
                  <strong style="font-family: var(--kredo-mono); color: #0000d6;">${tx.linkedBillId || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Review Flag</span>
                  <span style="font-weight: 700; color: ${isFlagged ? '#b45309' : 'var(--kredo-green)'};">${tx.reviewFlag ? `<span class="kredo-status-pill flagged">${tx.reviewFlag}</span>` : 'Clear'}</span>
                </div>
                ${tx.reviewReason ? `
                  <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px;">
                    <span style="color: #b45309; font-weight: 600;">Review Reason</span>
                    <span style="color: #92400e; font-weight: 600;">${tx.reviewReason}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Confidence / Parser</span>
                  <span style="font-family: var(--kredo-mono); color: var(--kredo-secondary);">${tx.confidence ? `${Math.round(Number(tx.confidence)*100)}%` : '-'} &bull; ${tx.parserVersion || '-'}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 4: RAW MESSAGE -->
            ${tx.rawMessage ? `
              <div style="margin-bottom: 14px;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-outline); margin-bottom: 5px;">Raw Notification</div>
                <div style="padding: 8px 10px; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 6px; font-family: var(--kredo-mono); font-size: 10.5px; color: var(--kredo-secondary); word-break: break-word; line-height: 1.4;">
                  ${tx.rawMessage}
                </div>
              </div>
            ` : ''}

            <!-- Modal Action Buttons -->
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
              ${!finStatus.isApproved ? `
                <button type="button" class="kredo-btn-action prominent" data-modal-approve-tx="${tx.id}" style="background: #10b981; color: #fff; width: 100%; padding: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span> Mark as Approved & Sync to Insights
                </button>
              ` : `
                <div style="text-align: center; padding: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #047857; font-size: 12px; font-weight: 700;">
                  ✓ Approved & Synchronized with Insights
                </div>
              `}
              <div style="display: flex; gap: 8px;">
                <button type="button" class="kredo-btn-action secondary" id="close-modal-btn-2" style="flex: 1; padding: 10px;">
                  Close
                </button>
                <button type="button" class="kredo-btn-action" data-modal-tag-tx="${tx.id}" style="flex: 1; padding: 10px; background: #4f46e5; color: #fff;">
                  <span class="material-symbols-outlined text-[15px]">label</span> Merchant Tag
                </button>
                <a href="${GOOGLE_SHEET_URL}" target="_blank" rel="noopener noreferrer" class="kredo-btn-action" style="flex: 1.5; text-decoration: none; padding: 10px; background: #0f9d58; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                  <span class="material-symbols-outlined text-[16px]">open_in_new</span> Sheet
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // CREDIT CARD BILLING & OBLIGATION DETAIL MODAL
    if (activeModal === 'card-due-detail' && this.state.selectedCard) {
      const card = this.state.selectedCard;
      const finStatus = card.financialStatus || resolveFinancialStatus({
        status: card.daysToDue === 0 ? 'due today' : (card.daysToDue <= 3 ? 'due soon' : 'upcoming'),
        dueDay: card.dueDay,
        daysToDue: card.daysToDue,
        billDay: card.billDay,
        nature: 'Bill',
        category: 'Credit Card Bill',
        merchant: card.cardName,
        bank: card.bank,
        cardLast4: card.last4,
        cardOrAccount: card.cardName,
        cardNetwork: card.cardNetwork,
        amount: card.usedLimit,
        amountDue: card.usedLimit,
      });

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 500px; max-height: 88vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(0,0,255,0.08); color: var(--kredo-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span class="material-symbols-outlined text-[22px]">credit_card</span>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">${card.cardName}</h3>
                  <span style="font-size: 11.5px; color: var(--kredo-outline);">${card.bank} &bull; ••${card.last4}</span>
                </div>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Highlight Reason Banner -->
            <div class="kredo-highlight-reason-banner ${finStatus.tier}">
              <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; margin-bottom: 2px;">Highlight Reason</div>
              <div>${finStatus.highlightReason}</div>
            </div>

            <!-- Prominent Amount & Due Card -->
            <div style="background: var(--kredo-surface-container-low); border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 14px; border: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px;">
                  Current Outstanding Due
                </span>
                <span class="kredo-status-pill ${finStatus.tier}">
                  ${finStatus.badgeLabel}
                </span>
              </div>
              <div style="font-size: 30px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-tertiary);">
                ${formatINR(card.usedLimit || 0)}
              </div>
              <div style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 3px;">
                Total Credit Limit: <strong style="font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(card.totalLimit)}</strong> &bull; Utilization: <strong>${card.utilization}%</strong>
              </div>
            </div>

            <!-- SECTION 1: BILLING CYCLE & DUE DATES -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Billing Cycle & Deadlines
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Payment Due Day</span>
                  <strong style="color: var(--kredo-secondary);">${card.dueDay}th of month (${finStatus.badgeLabel})</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Statement Generation Day</span>
                  <strong style="color: var(--kredo-secondary);">${card.billDay}th of month</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Available Limit</span>
                  <strong style="font-family: var(--kredo-mono); color: var(--kredo-primary);">${formatINR(card.currentLimit)}</strong>
                </div>
              </div>
            </div>

            <!-- SECTION 2: CARD SPECIFICATIONS -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--kredo-outline); margin-bottom: 5px;">
                Card Telemetry
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Issuing Bank</span>
                  <strong style="color: var(--kredo-secondary);">${card.bank || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Card Network</span>
                  <strong style="color: var(--kredo-secondary);">${card.cardNetwork || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Cardholder</span>
                  <strong style="color: var(--kredo-secondary);">${card.cardholderName || '-'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #fff; border: 1px solid var(--kredo-outline-variant); border-radius: 6px;">
                  <span style="color: var(--kredo-outline);">Card Number (Last 4)</span>
                  <strong style="font-family: var(--kredo-mono); color: var(--kredo-secondary);">${card.last4 ? `••••${card.last4}` : '-'}</strong>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 14px;">
              <button type="button" class="kredo-btn-action secondary" id="close-modal-btn-2" style="flex: 1; padding: 10px;">
                Close
              </button>
              <button type="button" class="kredo-btn-action" data-view-card-txs="${card.id}" style="flex: 1; padding: 10px;">
                View Transactions
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // SIDE-BY-SIDE RECONCILIATION COMPARISON MODAL
    if (activeModal === 'reconcile-compare' && this.state.activeCandidateMatch) {
      const match = this.state.activeCandidateMatch;
      const emailTx = match.emailTx || {};
      const sheetTx = match.sheetTx || {};

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 680px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(99, 102, 241, 0.12); color: #6366f1; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[20px]">compare</span>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Cross-Stream Side-by-Side Comparison</h3>
                  <span class="kredo-confidence-badge">${match.confidence}% Match Confidence</span>
                </div>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p style="font-size: 12px; color: var(--kredo-outline); margin-bottom: 14px;">
              Reconciliation agent detected that this Email Vault entry and Google Sheet entry correspond to the same real-world financial transaction. Merging will preserve the best attributes and deduplicate your insights.
            </p>

            <div class="kredo-compare-grid">
              <!-- Email Column -->
              <div class="kredo-compare-column email">
                <div style="font-size: 12px; font-weight: 800; color: #2563eb; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined text-[16px]">mail</span> Email Vault Record
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">MERCHANT</span><div style="font-weight: 700;">${emailTx.merchant}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">AMOUNT</span><div style="font-weight: 700; font-family: var(--kredo-mono);">${formatINR(emailTx.amount)}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">DATE & TIME</span><div>${emailTx.date} &bull; ${emailTx.time || '-'}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">CATEGORY / METHOD</span><div>${emailTx.category} &bull; ${emailTx.paymentMethod}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">CARD / BANK</span><div>${emailTx.bank || '-'} (••${emailTx.cardLast4 || 'N/A'})</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">REFERENCE ID</span><div style="font-family: var(--kredo-mono); font-size: 11px;">${emailTx.referenceId || '-'}</div></div>
                </div>
              </div>

              <!-- Sheet Column -->
              <div class="kredo-compare-column sheet">
                <div style="font-size: 12px; font-weight: 800; color: #0f9d58; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined text-[16px]">table_chart</span> Google Sheet Record
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">MERCHANT</span><div style="font-weight: 700;">${sheetTx.merchant}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">AMOUNT</span><div style="font-weight: 700; font-family: var(--kredo-mono);">${formatINR(sheetTx.amount)}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">DATE & TIME</span><div>${sheetTx.date} &bull; ${sheetTx.time || '-'}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">CATEGORY / METHOD</span><div>${sheetTx.category} &bull; ${sheetTx.paymentMethod}</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">CARD / BANK</span><div>${sheetTx.bank || '-'} (••${sheetTx.cardLast4 || 'N/A'})</div></div>
                  <div><span style="color: var(--kredo-outline); font-size: 10px;">REFERENCE ID</span><div style="font-family: var(--kredo-mono); font-size: 11px;">${sheetTx.referenceId || '-'}</div></div>
                </div>
              </div>
            </div>

            <div style="background: #f8faff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px;">
              <strong style="color: #4338ca; display: block; margin-bottom: 4px;">Matching Evidence:</strong>
              <ul style="margin: 0; padding-left: 18px; color: #3730a3;">
                ${(match.reasons || []).map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="kredo-btn-action secondary" id="modal-dismiss-match-btn" data-pair-key="${match.pairKey}" style="flex: 1;">
                Dismiss Suggestion
              </button>
              <button type="button" class="kredo-btn-action" id="modal-merge-confirm-btn" style="flex: 2; background: #6366f1;">
                <span class="material-symbols-outlined text-[16px]">merge</span> Merge (5-Min Reversible Undo)
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // EDIT MERCHANT ANNOTATION MODAL
    if (activeModal === 'edit-annotation' && this.state.annotationTx) {
      const tx = this.state.annotationTx;
      const currentAnnotation = tx.annotation || '';

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined text-[22px]" style="color: #4f46e5;">label</span>
                <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Merchant Annotation & Memory</h3>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p style="font-size: 12px; color: var(--kredo-outline); margin-bottom: 12px;">
              Tag transactions from <strong>${tx.merchant}</strong> (e.g. <em>chips</em>, <em>dinner</em>, <em>office coffee</em>). The memory engine will auto-apply this tag to existing and future transactions from this merchant.
            </p>

            <form id="kredo-annotation-form">
              <input type="hidden" id="annotation-tx-id" value="${tx.id}" />
              <input type="hidden" id="annotation-tx-merchant" value="${tx.merchant}" />

              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 6px;">Tag / Annotation</label>
              <input type="text" class="kredo-form-input" id="annotation-input" value="${currentAnnotation}" placeholder="e.g. chips, swiggy dineout, taxi, wifi" required />

              <div style="display: flex; gap: 6px; margin: 8px 0 14px 0; flex-wrap: wrap;">
                ${['chips', 'dinner', 'groceries', 'coffee', 'taxi', 'office', 'personal', 'subscriptions'].map(chip => `
                  <button type="button" class="kredo-annotation-pill" data-fill-annotation="${chip}">
                    + ${chip}
                  </button>
                `).join('')}
              </div>

              <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--kredo-secondary); cursor: pointer; margin-bottom: 16px; background: var(--kredo-surface-container-low); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--kredo-outline-variant);">
                <input type="checkbox" id="annotation-remember-merchant" checked style="margin-top: 2px;" />
                <div>
                  <strong>Remember for all transactions from "${tx.merchant}"</strong>
                  <span style="font-size: 11px; color: var(--kredo-outline); display: block;">Automatically tags any future import from ${tx.merchant}.</span>
                </div>
              </label>

              <div style="display: flex; gap: 10px;">
                <button type="button" class="kredo-btn-action secondary" id="close-modal-btn-2" style="flex: 1;">Cancel</button>
                <button type="submit" class="kredo-btn-action" style="flex: 2;">Save Annotation</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // MANAGE ALL MERCHANT ANNOTATIONS MODAL
    if (activeModal === 'manage-annotations') {
      const annotations = getMerchantAnnotations();
      const entries = Object.entries(annotations);

      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 520px; max-height: 85vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined text-[22px]" style="color: #4f46e5;">psychology</span>
                <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Merchant Memory Rules</h3>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p style="font-size: 12px; color: var(--kredo-outline); margin-bottom: 14px;">
              These tags are automatically attached across all transaction views and insights whenever a merchant is recognized.
            </p>

            ${entries.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                ${entries.map(([merchant, tag]) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                    <div>
                      <strong style="font-size: 13px; color: var(--kredo-secondary);">${merchant}</strong>
                      <div style="margin-top: 2px;">
                        <span class="kredo-annotation-pill"><span class="material-symbols-outlined text-[10px]">label</span> ${tag}</span>
                      </div>
                    </div>
                    <button type="button" class="kredo-mini-btn danger" data-delete-annotation-merchant="${merchant}" title="Delete memory rule" style="width: 28px; height: 28px;">
                      <span class="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 24px; color: var(--kredo-outline); font-size: 12px;">
                No merchant rules configured yet. Click "Tag" on any transaction row to teach KREDO's memory engine.
              </div>
            `}

            <button type="button" class="kredo-btn-action" id="close-modal-btn-2" style="width: 100%;">
              Done
            </button>
          </div>
        </div>
      `;
    }

    // QUICK ACTION MENU (Replaces the awkward overlapping floating buttons!)
    if (activeModal === 'action-menu') {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Quick Actions</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div class="kredo-quick-action-options">
              <button class="kredo-quick-action-btn primary" id="quick-action-add-btn">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: var(--kredo-primary); color: #fff; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[20px]">add</span>
                </div>
                <div>
                  <strong style="font-size: 14px; display: block; color: var(--kredo-secondary);">Add Transaction</strong>
                  <span style="font-size: 12px; color: var(--kredo-outline);">Record single expense or incoming funds</span>
                </div>
              </button>

              <button class="kredo-quick-action-btn" id="quick-action-add-card-btn">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #e0e0ff; color: var(--kredo-primary); display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[20px]">credit_card</span>
                </div>
                <div>
                  <strong style="font-size: 14px; display: block; color: var(--kredo-secondary);">Add Credit Card</strong>
                  <span style="font-size: 12px; color: var(--kredo-outline);">Track limit, utilization, and due dates</span>
                </div>
              </button>

              <button class="kredo-quick-action-btn" id="quick-action-annotations-btn">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #ede9fe; color: #6d28d9; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <div>
                  <strong style="font-size: 14px; display: block; color: var(--kredo-secondary);">Merchant Memory & Tags</strong>
                  <span style="font-size: 12px; color: var(--kredo-outline);">Manage auto-annotation tags (e.g. chips)</span>
                </div>
              </button>

              <button class="kredo-quick-action-btn" id="quick-action-import-btn">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: var(--kredo-surface-variant); color: var(--kredo-secondary); display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined text-[20px]">upload_file</span>
                </div>
                <div>
                  <strong style="font-size: 14px; display: block; color: var(--kredo-secondary);">Import Statement JSON</strong>
                  <span style="font-size: 12px; color: var(--kredo-outline);">Batch import with automatic AI deduplication</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // ADD TRANSACTION MODAL
    if (activeModal === 'add') {
      const todayDate = new Date().toISOString().slice(0, 10);
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 500px; max-height: 88vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Add Transaction</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-add-tx-form" style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 6px;">Transaction Type</label>
                <div class="kredo-segmented-type" style="display: flex; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 10px; padding: 3px; gap: 4px;">
                  <button type="button" class="kredo-type-btn active" data-type-target="debit" style="flex: 1; padding: 9px 12px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; background: var(--kredo-secondary); color: #ffffff;">
                    <span class="material-symbols-outlined text-[16px]">arrow_downward</span> Outflow
                  </button>
                  <button type="button" class="kredo-type-btn" data-type-target="credit" style="flex: 1; padding: 9px 12px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; background: transparent; color: var(--kredo-outline);">
                    <span class="material-symbols-outlined text-[16px]">arrow_upward</span> Inflow
                  </button>
                  <input type="hidden" name="add-type" id="add-type-val" value="debit" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Amount (₹)</label>
                  <input type="number" step="0.01" class="kredo-form-input" id="add-amount" placeholder="e.g. 450" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Date</label>
                  <input type="date" class="kredo-form-input" id="add-date" value="${todayDate}" required />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Merchant / Payee</label>
                <input type="text" class="kredo-form-input" id="add-merchant" placeholder="e.g. Swiggy, Amazon, Zomato" required />
                <div style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
                  ${['Swiggy', 'Amazon', 'Zomato', 'Blinkit', 'Uber', 'Electricity Bill', 'Salary Credit'].map(chip => `
                    <button type="button" class="quick-chip" data-chip="${chip}" style="background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: 500;">
                      ${chip}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Category</label>
                  <select class="kredo-form-select" id="add-category">
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Bills & Utilities">Bills & Utilities</option>
                    <option value="Travel">Travel</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Income">Income</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Investment">Investment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment Method</label>
                  <select class="kredo-form-select" id="add-method">
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <!-- Banking & Card Details -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Bank (Optional)</label>
                  <input type="text" class="kredo-form-input" id="add-bank" placeholder="e.g. HDFC, ICICI, SBI" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Last 4 Digits</label>
                  <input type="text" class="kredo-form-input" id="add-card-last4" placeholder="e.g. 4028" maxlength="4" />
                </div>
              </div>

              <!-- App, Network & Nature -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment App</label>
                  <input type="text" class="kredo-form-input" id="add-app" placeholder="e.g. CRED, Google Pay, PhonePe" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Network</label>
                  <select class="kredo-form-select" id="add-network">
                    <option value="">None / Not Applicable</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="RuPay">RuPay</option>
                    <option value="Amex">Amex</option>
                    <option value="Diners Club">Diners Club</option>
                  </select>
                </div>
              </div>

              <!-- Reference, Bill ID & Nature -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Reference ID / UTR</label>
                  <input type="text" class="kredo-form-input" id="add-ref-id" placeholder="e.g. UPI/123456789" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Linked Bill ID</label>
                  <input type="text" class="kredo-form-input" id="add-linked-bill" placeholder="e.g. BILL-HDFC-MAR26" />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Notes</label>
                <input type="text" class="kredo-form-input" id="add-notes" placeholder="Optional personal notes" />
              </div>

              <button type="submit" class="kredo-btn-action" style="width: 100%; margin-top: 8px;">
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // EDIT TRANSACTION MODAL (All 24 fields editable)
    if (activeModal === 'edit' && selectedTx) {
      const tx = selectedTx;
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 520px; max-height: 88vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: sticky; top: 0; background: var(--kredo-surface-container-lowest); padding-bottom: 8px; z-index: 10; border-bottom: 1px solid var(--kredo-outline-variant);">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Edit Transaction</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-edit-tx-form" style="display: flex; flex-direction: column; gap: 12px;">
              <input type="hidden" id="edit-tx-id" value="${tx.id}" />

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 6px;">Transaction Type</label>
                <div class="kredo-segmented-type" style="display: flex; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 10px; padding: 3px; gap: 4px;">
                  <button type="button" class="kredo-edit-type-btn ${tx.type === 'debit' ? 'active' : ''}" data-type-target="debit" style="flex: 1; padding: 9px 12px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; background: ${tx.type === 'debit' ? 'var(--kredo-secondary)' : 'transparent'}; color: ${tx.type === 'debit' ? '#ffffff' : 'var(--kredo-outline)'};">
                    <span class="material-symbols-outlined text-[16px]">arrow_downward</span> Outflow
                  </button>
                  <button type="button" class="kredo-edit-type-btn ${tx.type === 'credit' ? 'active' : ''}" data-type-target="credit" style="flex: 1; padding: 9px 12px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; background: ${tx.type === 'credit' ? 'var(--kredo-green)' : 'transparent'}; color: ${tx.type === 'credit' ? '#ffffff' : 'var(--kredo-outline)'};">
                    <span class="material-symbols-outlined text-[16px]">arrow_upward</span> Inflow
                  </button>
                  <input type="hidden" name="edit-type" id="edit-type-val" value="${tx.type}" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Amount (₹)</label>
                  <input type="number" step="0.01" class="kredo-form-input" id="edit-amount" value="${tx.amount}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Date</label>
                  <input type="date" class="kredo-form-input" id="edit-date" value="${tx.date || ''}" required />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Merchant / Payee</label>
                  <input type="text" class="kredo-form-input" id="edit-merchant" value="${tx.merchant || ''}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Time</label>
                  <input type="text" class="kredo-form-input" id="edit-time" value="${tx.time || ''}" placeholder="e.g. 14:30 or 2:30 PM" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Category</label>
                  <select class="kredo-form-select" id="edit-category">
                    ${['Food & Dining', 'Shopping', 'Groceries', 'Bills & Utilities', 'Travel', 'Healthcare', 'Income', 'Entertainment', 'Investment', 'Other'].map(c => `
                      <option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment Method</label>
                  <select class="kredo-form-select" id="edit-method">
                    ${['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'].map(m => `
                      <option value="${m}" ${tx.paymentMethod === m ? 'selected' : ''}>${m}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Banking & Card Fields -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Bank</label>
                  <input type="text" class="kredo-form-input" id="edit-bank" value="${tx.bank || ''}" placeholder="e.g. HDFC, ICICI" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Last 4 Digits</label>
                  <input type="text" class="kredo-form-input" id="edit-card-last4" value="${tx.cardLast4 || ''}" placeholder="e.g. 4028" maxlength="4" />
                </div>
              </div>

              <!-- App, Network, Account -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment App</label>
                  <input type="text" class="kredo-form-input" id="edit-app" value="${tx.paymentApp || ''}" placeholder="e.g. CRED, GPay" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Network</label>
                  <input type="text" class="kredo-form-input" id="edit-network" value="${tx.cardNetwork || ''}" placeholder="e.g. Visa, Mastercard" />
                </div>
              </div>

              <!-- Ref ID, Tx ID -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Reference ID / UTR</label>
                  <input type="text" class="kredo-form-input" id="edit-ref-id" value="${tx.referenceId || ''}" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Transaction ID</label>
                  <input type="text" class="kredo-form-input" id="edit-tx-id-val" value="${tx.transactionId || ''}" />
                </div>
              </div>

              <!-- Nature, Linked Bill ID -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Nature of Spend</label>
                  <input type="text" class="kredo-form-input" id="edit-nature" value="${tx.nature || ''}" placeholder="e.g. Discretionary, Essential" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Linked Bill ID</label>
                  <input type="text" class="kredo-form-input" id="edit-linked-bill" value="${tx.linkedBillId || ''}" />
                </div>
              </div>

              <!-- Review Flag & Reason -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Review Flag</label>
                  <input type="text" class="kredo-form-input" id="edit-review-flag" value="${tx.reviewFlag || ''}" placeholder="e.g. Check Bill, High Outflow" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Review Reason</label>
                  <input type="text" class="kredo-form-input" id="edit-review-reason" value="${tx.reviewReason || ''}" />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Notes</label>
                <input type="text" class="kredo-form-input" id="edit-notes" value="${tx.notes || ''}" placeholder="Optional notes" />
              </div>

              <div style="display: flex; gap: 10px; margin-top: 8px;">
                <button type="button" class="kredo-btn-action secondary" id="edit-cancel-btn" style="flex: 1;">Cancel</button>
                <button type="submit" class="kredo-btn-action" style="flex: 1;">Update</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // SINGLE DELETE CONFIRMATION MODAL
    if (activeModal === 'delete-confirm' && selectedTx) {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="text-align: center;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(186,26,26,0.1); color: var(--kredo-error); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <span class="material-symbols-outlined text-[24px]">delete</span>
            </div>
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 6px 0;">Delete Transaction?</h3>
            <p style="font-size: 13px; color: var(--kredo-on-surface-variant); margin: 0 0 18px 0;">
              Are you sure you want to remove <strong>${selectedTx.merchant}</strong> (${formatINR(selectedTx.amount)})?
            </p>
            <div style="display: flex; gap: 10px;">
              <button class="kredo-btn-action secondary" id="cancel-delete-btn" style="flex: 1;">Cancel</button>
              <button class="kredo-btn-action" id="confirm-single-delete-btn" style="flex: 1; background: var(--kredo-error); box-shadow: none;">Delete</button>
            </div>
          </div>
        </div>
      `;
    }

    // DELETE CREDIT CARD CONFIRMATION MODAL
    if (activeModal === 'delete-card-confirm' && selectedCard) {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="text-align: center;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(186,26,26,0.1); color: var(--kredo-error); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <span class="material-symbols-outlined text-[24px]">credit_card_off</span>
            </div>
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 6px 0;">Delete Credit Card?</h3>
            <p style="font-size: 13px; color: var(--kredo-on-surface-variant); margin: 0 0 18px 0;">
              Are you sure you want to remove <strong>${selectedCard.cardName} (••${selectedCard.last4})</strong> from your credit vault?
            </p>
            <div style="display: flex; gap: 10px;">
              <button class="kredo-btn-action secondary" id="cancel-delete-card-btn" style="flex: 1;">Cancel</button>
              <button class="kredo-btn-action" id="confirm-delete-card-btn" style="flex: 1; background: var(--kredo-error); box-shadow: none;">Delete Card</button>
            </div>
          </div>
        </div>
      `;
    }

    // BATCH DELETE CONFIRMATION MODAL
    if (activeModal === 'batch-delete-confirm') {
      const count = this.state.selectedTxIds.size;
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="text-align: center;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(186,26,26,0.1); color: var(--kredo-error); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <span class="material-symbols-outlined text-[24px]">delete_sweep</span>
            </div>
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 6px 0;">Delete ${count} Transactions?</h3>
            <p style="font-size: 13px; color: var(--kredo-on-surface-variant); margin: 0 0 18px 0;">
              This will permanently remove all ${count} selected records from your ledger.
            </p>
            <div style="display: flex; gap: 10px;">
              <button class="kredo-btn-action secondary" id="cancel-batch-delete-btn" style="flex: 1;">Cancel</button>
              <button class="kredo-btn-action" id="confirm-batch-delete-btn" style="flex: 1; background: var(--kredo-error); box-shadow: none;">Delete All (${count})</button>
            </div>
          </div>
        </div>
      `;
    }

    // JSON IMPORTER MODAL (Zero size limit, Copy AI Prompt, auto card limit deduction)
    if (activeModal === 'import') {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 540px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <h3 style="font-size: 17px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Import Statement JSON</h3>
                <span style="font-size: 11.5px; color: var(--kredo-outline);">Unbounded capacity &bull; Auto card limit deduction</span>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Prominent Copy AI Prompt Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--kredo-primary-fixed); padding: 10px 14px; border-radius: 10px; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 13px; color: var(--kredo-on-primary-fixed); display: block;">Gemini AI Extraction Prompt</strong>
                <span style="font-size: 11px; color: var(--kredo-primary);">Extracts last 4 digits for automatic credit card deductions</span>
              </div>
              <button type="button" id="copy-ai-prompt-btn" style="background: var(--kredo-primary); color: #fff; border: none; border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,255,0.2);">
                <span class="material-symbols-outlined text-[15px]">content_copy</span> Copy Prompt
              </button>
            </div>

            <p style="font-size: 12px; color: var(--kredo-on-surface-variant); margin: 0 0 10px 0; line-height: 1.4;">
              Paste any statement JSON. If a transaction has a card's last 4 digits, its available limit will be deducted automatically.
            </p>

            <textarea class="kredo-form-textarea" id="import-json-input" style="height: 160px; font-family: var(--kredo-mono); font-size: 12px; resize: vertical; line-height: 1.4;" placeholder='Paste any JSON array or statement export:&#10;[&#10;  { "date": "2026-03-20", "amount": 350, "merchant": "Swiggy", "type": "debit", "paymentMethod": "Credit Card", "cardLast4": "4028" }&#10;]'>${importDraft}</textarea>

            <div id="import-loading-status" style="display: none;" class="kredo-import-status-box">
              <span class="kredo-spinner dark"></span>
              <span>Importing statement data... Please wait</span>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 14px;">
              <button type="button" class="kredo-btn-action" id="analyze-import-btn" style="width: 100%;">
                <span>Analyze & Import Statement</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  bindEvents(filteredTxs = [], chartData = null) {
    // Back to Memoir Vault
    this.container.querySelector('#kredo-back-memoir-btn')?.addEventListener('click', () => {
      this.onBack();
    });

    // Toggle Balance Visibility
    this.container.querySelector('#kredo-toggle-balance')?.addEventListener('click', () => {
      this.state.showBalance = !this.state.showBalance;
      this.render();
    });

    // Search Trigger
    this.container.querySelector('#kredo-search-trigger')?.addEventListener('click', () => {
      const q = prompt('Search transactions, merchants, or notes:', this.state.searchQuery);
      if (q !== null) {
        this.state.searchQuery = q.trim();
        this.render();
      }
    });

    // Quick Action Trigger (+) in top header
    this.container.querySelector('#kredo-action-trigger-btn')?.addEventListener('click', () => {
      this.openModal('action-menu');
    });

    // Center Action Button (+) in bottom mobile nav
    this.container.querySelector('#kredo-center-add-btn')?.addEventListener('click', () => {
      this.openModal('action-menu');
    });

    // Action Menu options
    this.container.querySelector('#quick-action-add-btn')?.addEventListener('click', () => {
      this.openModal('add');
    });

    this.container.querySelector('#quick-action-add-card-btn')?.addEventListener('click', () => {
      this.openModal('add-card');
    });

    this.container.querySelector('#quick-action-import-btn')?.addEventListener('click', () => {
      this.openModal('import');
    });

    // Open Add Card Modal
    this.container.querySelector('#open-add-card-btn')?.addEventListener('click', () => {
      this.openModal('add-card');
    });

    this.container.querySelector('#open-add-card-btn-2')?.addEventListener('click', () => {
      this.openModal('add-card');
    });

    // Empty state add button
    this.container.querySelector('#kredo-empty-add-btn')?.addEventListener('click', () => {
      this.openModal('add');
    });

    // Copy AI Prompt
    this.container.querySelector('#copy-ai-prompt-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(GEMINI_PROMPT_TEMPLATE);
      this.showToast('Copied AI Extraction Prompt to Clipboard!');
    });

    // Quick Sample Cards
    this.container.querySelectorAll('[data-quick-sample]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sample = btn.dataset.quickSample;
        if (sample === 'hdfc') {
          await addCreditCard({
            cardName: 'HDFC Regalia Gold',
            bank: 'HDFC',
            cardNumber: '•••• •••• •••• 4028',
            last4: '4028',
            cardholderName: this.profile?.displayName || 'Maaz Mohammed',
            expiry: '08/29',
            cvv: '782',
            totalLimit: 500000,
            currentLimit: 420000,
            billDay: 15,
            dueDay: 5,
            theme: 'obsidian',
          });
          this.state.cards = await getCreditCards();
          this.render();
          this.showToast('Added HDFC Regalia Gold (••4028) to Vault!');
        } else if (sample === 'axis') {
          await addCreditCard({
            cardName: 'Axis Ace',
            bank: 'Axis',
            cardNumber: '•••• •••• •••• 8812',
            last4: '8812',
            cardholderName: this.profile?.displayName || 'Maaz Mohammed',
            expiry: '11/28',
            cvv: '419',
            totalLimit: 300000,
            currentLimit: 265000,
            billDay: 20,
            dueDay: 10,
            theme: 'cobalt',
          });
          this.state.cards = await getCreditCards();
          this.render();
          this.showToast('Added Axis Ace (••8812) to Vault!');
        }
      });
    });

    // Toggle CVV Visibility
    this.container.querySelectorAll('[data-toggle-cvv]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCardCvv(btn.dataset.toggleCvv);
      });
    });

    // Edit Card Button
    this.container.querySelectorAll('[data-edit-card]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = this.state.cards.find(c => c.id === btn.dataset.editCard);
        if (card) this.openModal('edit-card', card);
      });
    });

    // Delete Card Button
    this.container.querySelectorAll('[data-delete-card]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = this.state.cards.find(c => c.id === btn.dataset.deleteCard);
        if (card) this.openModal('delete-card-confirm', card);
      });
    });

    // View Card Transactions Button
    this.container.querySelectorAll('[data-view-card-txs]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.selectedCardIdFilter = btn.dataset.viewCardTxs;
        this.state.activeTab = 'ledger';
        this.render();
        this.showToast('Filtering ledger for this card transactions');
      });
    });

    // Theme Selector Radio Handlers in Add Card Modal
    this.container.querySelectorAll('.kredo-theme-pill-label').forEach(label => {
      label.addEventListener('click', () => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        this.container.querySelectorAll('.kredo-theme-pill-label').forEach(l => {
          l.style.borderColor = 'rgba(0,0,0,0.1)';
          const check = l.querySelector('.theme-check');
          if (check) check.style.display = 'none';
        });
        label.style.borderColor = 'var(--kredo-primary)';
        const check = label.querySelector('.theme-check');
        if (check) check.style.display = 'inline-block';
      });
    });

    // Flexible Number Parser
    const parseFlexibleNumber = (val) => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const cleaned = String(val || '').replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Add Card Two-Way Synchronized Limit Calculation
    const totalLimitInput = this.container.querySelector('#card-total-limit');
    const currentLimitInput = this.container.querySelector('#card-current-limit');
    const usedLimitInput = this.container.querySelector('#card-used-limit');
    const usedPreview = this.container.querySelector('#card-preview-used');

    const updateAddCardPreview = (source = 'total') => {
      if (!totalLimitInput || !usedPreview) return;
      const tot = parseFlexibleNumber(totalLimitInput.value);

      if (source === 'used' && usedLimitInput) {
        // User entered Used / Outstanding -> auto-calculate Available
        const used = parseFlexibleNumber(usedLimitInput.value);
        const avail = Math.max(0, tot - used);
        if (currentLimitInput && document.activeElement !== currentLimitInput) {
          currentLimitInput.value = avail > 0 || used > 0 ? avail : '';
        }
      } else if (source === 'available' && currentLimitInput) {
        // User entered Available -> auto-calculate Used
        const avail = parseFlexibleNumber(currentLimitInput.value);
        const used = Math.max(0, tot - avail);
        if (usedLimitInput && document.activeElement !== usedLimitInput) {
          usedLimitInput.value = used > 0 || avail > 0 ? used : '';
        }
      } else if (source === 'total') {
        if (currentLimitInput && currentLimitInput.value !== '') {
          const avail = parseFlexibleNumber(currentLimitInput.value);
          const used = Math.max(0, tot - avail);
          if (usedLimitInput && document.activeElement !== usedLimitInput) usedLimitInput.value = used;
        } else if (usedLimitInput && usedLimitInput.value !== '') {
          const used = parseFlexibleNumber(usedLimitInput.value);
          const avail = Math.max(0, tot - used);
          if (currentLimitInput && document.activeElement !== currentLimitInput) currentLimitInput.value = avail;
        }
      }

      const availVal = parseFlexibleNumber(currentLimitInput?.value || String(tot));
      const usedVal = Math.max(0, tot - availVal);
      const util = tot > 0 ? Math.min(100, Math.round((usedVal / tot) * 100)) : 0;
      usedPreview.innerText = `${formatINR(usedVal)} Used • ${formatINR(availVal)} Avail (${util}%)`;
    };

    totalLimitInput?.addEventListener('input', () => updateAddCardPreview('total'));
    totalLimitInput?.addEventListener('keyup', () => updateAddCardPreview('total'));
    currentLimitInput?.addEventListener('input', () => updateAddCardPreview('available'));
    currentLimitInput?.addEventListener('keyup', () => updateAddCardPreview('available'));
    usedLimitInput?.addEventListener('input', () => updateAddCardPreview('used'));
    usedLimitInput?.addEventListener('keyup', () => updateAddCardPreview('used'));
    if (totalLimitInput) updateAddCardPreview('total');

    // Add Card Form Submit
    this.container.querySelector('#kredo-add-card-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bank = this.container.querySelector('#card-bank')?.value || 'HDFC';
      const cardName = this.container.querySelector('#card-name')?.value?.trim();
      const cardNumber = this.container.querySelector('#card-number')?.value?.trim();
      const expiry = this.container.querySelector('#card-expiry')?.value?.trim() || '12/28';
      const cvv = this.container.querySelector('#card-cvv')?.value?.trim() || '•••';
      const cardholderName = this.container.querySelector('#card-holder')?.value?.trim() || 'Maaz Mohammed';
      const totalLimit = parseFlexibleNumber(this.container.querySelector('#card-total-limit')?.value);
      const currentLimitRaw = this.container.querySelector('#card-current-limit')?.value;
      const usedLimitRaw = this.container.querySelector('#card-used-limit')?.value;

      let currentLimit = totalLimit;
      if (currentLimitRaw !== '' && currentLimitRaw !== undefined) {
        currentLimit = parseFlexibleNumber(currentLimitRaw);
      } else if (usedLimitRaw !== '' && usedLimitRaw !== undefined) {
        const used = parseFlexibleNumber(usedLimitRaw);
        currentLimit = Math.max(0, totalLimit - used);
      }

      const billDay = parseInt(this.container.querySelector('#card-bill-day')?.value || '15', 10) || 15;
      const dueDay = parseInt(this.container.querySelector('#card-due-day')?.value || '5', 10) || 5;
      const theme = this.container.querySelector('input[name="card-theme"]:checked')?.value || 'obsidian';

      if (!cardName || !cardNumber || totalLimit <= 0) {
        this.showToast('Please enter a valid card name and limit amount.');
        return;
      }

      const digits = cardNumber.replace(/\D/g, '');
      const last4 = digits.slice(-4) || '0000';

      await addCreditCard({
        bank,
        cardName,
        cardNumber: `•••• •••• •••• ${last4}`,
        last4,
        cardholderName,
        expiry,
        cvv,
        totalLimit,
        currentLimit,
        billDay,
        dueDay,
        theme,
      });

      this.state.cards = await getCreditCards();
      this.closeModal();
      this.showToast(`Added ${cardName} (••${last4}) to Credit Vault!`);
    });

    // Edit Card Two-Way Synchronized Limit Calculation
    const editTotalInput = this.container.querySelector('#edit-card-total-limit');
    const editCurrentInput = this.container.querySelector('#edit-card-current-limit');
    const editUsedInput = this.container.querySelector('#edit-card-used-limit');
    const editUsedPreview = this.container.querySelector('#edit-card-preview-used');

    const updateEditCardPreview = (source = 'total') => {
      if (!editTotalInput || !editUsedPreview) return;
      const tot = parseFlexibleNumber(editTotalInput.value);

      if (source === 'used' && editUsedInput) {
        const used = parseFlexibleNumber(editUsedInput.value);
        const avail = Math.max(0, tot - used);
        if (editCurrentInput && document.activeElement !== editCurrentInput) {
          editCurrentInput.value = avail;
        }
      } else if (source === 'available' && editCurrentInput) {
        const avail = parseFlexibleNumber(editCurrentInput.value);
        const used = Math.max(0, tot - avail);
        if (editUsedInput && document.activeElement !== editUsedInput) {
          editUsedInput.value = used;
        }
      } else if (source === 'total') {
        const avail = parseFlexibleNumber(editCurrentInput?.value || '0');
        const used = Math.max(0, tot - avail);
        if (editUsedInput && document.activeElement !== editUsedInput) editUsedInput.value = used;
      }

      const availVal = parseFlexibleNumber(editCurrentInput?.value || String(tot));
      const usedVal = Math.max(0, tot - availVal);
      const util = tot > 0 ? Math.min(100, Math.round((usedVal / tot) * 100)) : 0;
      editUsedPreview.innerText = `${formatINR(usedVal)} Used • ${formatINR(availVal)} Avail (${util}%)`;
    };

    editTotalInput?.addEventListener('input', () => updateEditCardPreview('total'));
    editTotalInput?.addEventListener('keyup', () => updateEditCardPreview('total'));
    editCurrentInput?.addEventListener('input', () => updateEditCardPreview('available'));
    editCurrentInput?.addEventListener('keyup', () => updateEditCardPreview('available'));
    editUsedInput?.addEventListener('input', () => updateEditCardPreview('used'));
    editUsedInput?.addEventListener('keyup', () => updateEditCardPreview('used'));
    if (editTotalInput) updateEditCardPreview('total');

    // Edit Card Form Submit
    this.container.querySelector('#kredo-edit-card-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = this.container.querySelector('#edit-card-id')?.value;
      const cardName = this.container.querySelector('#edit-card-name')?.value?.trim();
      const last4 = this.container.querySelector('#edit-card-last4')?.value?.trim()?.slice(-4) || '0000';
      const totalLimit = parseFlexibleNumber(this.container.querySelector('#edit-card-total-limit')?.value);
      const currentLimitRaw = this.container.querySelector('#edit-card-current-limit')?.value;
      const usedLimitRaw = this.container.querySelector('#edit-card-used-limit')?.value;

      let currentLimit = totalLimit;
      if (currentLimitRaw !== '' && currentLimitRaw !== undefined) {
        currentLimit = parseFlexibleNumber(currentLimitRaw);
      } else if (usedLimitRaw !== '' && usedLimitRaw !== undefined) {
        const used = parseFlexibleNumber(usedLimitRaw);
        currentLimit = Math.max(0, totalLimit - used);
      }

      const billDay = parseInt(this.container.querySelector('#edit-card-bill-day')?.value || '15', 10) || 15;
      const dueDay = parseInt(this.container.querySelector('#edit-card-due-day')?.value || '5', 10) || 5;

      if (!id || !cardName || totalLimit <= 0) return;

      await updateCreditCard(id, {
        cardName,
        last4,
        totalLimit,
        currentLimit,
        billDay,
        dueDay,
      });

      this.state.cards = await getCreditCards();
      this.closeModal();
      this.showToast('Credit Card updated successfully.');
    });

    // Confirm Delete Card
    this.container.querySelector('#confirm-delete-card-btn')?.addEventListener('click', async () => {
      if (this.state.selectedCard) {
        await deleteCreditCard(this.state.selectedCard.id);
        this.state.cards = await getCreditCards();
        this.closeModal();
        this.showToast('Credit card removed from vault.');
      }
    });

    this.container.querySelector('#cancel-delete-card-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    this.container.querySelector('#edit-card-cancel-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Show / Hide Card Last 4 in Add Transaction Form when Payment Method is Credit Card
    const addMethodSelect = this.container.querySelector('#add-method');
    const cardLast4Wrap = this.container.querySelector('#add-card-last4-wrap');
    if (addMethodSelect && cardLast4Wrap) {
      addMethodSelect.addEventListener('change', () => {
        if (addMethodSelect.value === 'Credit Card') {
          cardLast4Wrap.style.display = 'block';
        } else {
          cardLast4Wrap.style.display = 'none';
        }
      });
    }

    // Time Range Buttons
    this.container.querySelectorAll('[data-time]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.timeRange = btn.dataset.time;
        this.state.inspectingPoint = null;
        this.render();
      });
    });

    // Interactive Real-Time Chart Dots
    this.container.querySelectorAll('[data-chart-point]').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(dot.dataset.chartPoint, 10);
        if (chartData && chartData.points[idx]) {
          const pt = chartData.points[idx];
          this.state.inspectingPoint = { ...pt, idx };
          this.render();
        }
      });
    });

    // Month Selector Dropdown (Ledger, Categories, Velocity, AI)
    this.container.querySelectorAll('#kredo-month-dropdown, .kredo-month-select:not(#kredo-insights-month-select):not(#kredo-insights-category-select):not(#kredo-insights-method-select)').forEach(sel => {
      sel.addEventListener('change', (e) => {
        this.state.selectedMonth = e.target.value;
        this.state.inspectingPoint = null;
        this.render();
      });
    });

    // Insights Data Source Slicer (Email Vault vs Google Sheet vs Unified)
    this.container.querySelectorAll('[data-insights-source]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = btn.dataset.insightsSource;
        if (src) {
          this.state.insightsSource = src;
          this.state.insightsActiveCategory = null;
          this.render();
          this.showToast(`Switched Insights Stream to ${src === 'sheet' ? 'Google Sheet' : (src === 'all' ? 'Unified (Both Streams)' : 'Email Vault')}`);
        }
      });
    });

    // Insights Flow Direction Slicer (All / Debit / Credit)
    this.container.querySelectorAll('[data-insights-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.insightsTypeFilter = btn.dataset.insightsType;
        this.render();
      });
    });

    // Insights Time Range Presets (All / YTD / This Month / Prev Month / 30D / 7D / Custom)
    this.container.querySelectorAll('[data-insights-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.insightsTimePreset = btn.dataset.insightsPreset;
        this.render();
      });
    });

    // Insights Month Dropdown
    this.container.querySelector('#kredo-insights-month-select')?.addEventListener('change', (e) => {
      this.state.selectedMonth = e.target.value;
      this.render();
    });

    // Insights Category Dropdown Slicer
    this.container.querySelector('#kredo-insights-category-select')?.addEventListener('change', (e) => {
      this.state.insightsCategoryFilter = e.target.value;
      this.state.insightsActiveCategory = null;
      this.render();
    });

    // Insights Payment Method Slicer
    this.container.querySelector('#kredo-insights-method-select')?.addEventListener('change', (e) => {
      this.state.insightsMethodFilter = e.target.value;
      this.render();
    });

    // Insights Bank Slicer
    this.container.querySelector('#kredo-insights-bank-select')?.addEventListener('change', (e) => {
      this.state.insightsBankFilter = e.target.value;
      this.render();
    });

    // Insights Payment App Slicer
    this.container.querySelector('#kredo-insights-app-select')?.addEventListener('change', (e) => {
      this.state.insightsAppFilter = e.target.value;
      this.render();
    });

    // Insights Card Network Slicer
    this.container.querySelector('#kredo-insights-network-select')?.addEventListener('change', (e) => {
      this.state.insightsNetFilter = e.target.value;
      this.render();
    });

    // Insights Review Flag Slicer
    this.container.querySelector('#kredo-insights-review-select')?.addEventListener('change', (e) => {
      this.state.insightsReviewFilter = e.target.value;
      this.render();
    });

    // Custom Date Range Inputs
    this.container.querySelector('#kredo-insights-start-date')?.addEventListener('change', (e) => {
      this.state.insightsCustomStart = e.target.value;
      this.render();
    });
    this.container.querySelector('#kredo-insights-end-date')?.addEventListener('change', (e) => {
      this.state.insightsCustomEnd = e.target.value;
      this.render();
    });

    // Interactive Category Drill-Down & Isolate (Legend & Donut Slices)
    this.container.querySelectorAll('[data-filter-cat], .kredo-donut-slice').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = decodeURIComponent(el.dataset.filterCat || el.dataset.catSlice || '');
        if (cat) {
          if (this.state.insightsActiveCategory === cat) {
            this.state.insightsActiveCategory = null;
            this.showToast(`Cleared ${cat} isolate`);
          } else {
            this.state.insightsActiveCategory = cat;
            this.showToast(`Isolated category: ${cat}`);
          }
          this.render();
        }
      });
    });

    // Real-Time Donut Slice Hover Telemetry
    this.container.querySelectorAll('.kredo-donut-slice').forEach(slice => {
      slice.addEventListener('mouseenter', () => {
        const catName = slice.dataset.catName;
        const catAmt = slice.dataset.catAmount;
        const catPct = slice.dataset.catPercent;
        const lbl = this.container.querySelector('#donut-center-label');
        const val = this.container.querySelector('#donut-center-val');
        const sub = this.container.querySelector('#donut-center-sub');
        if (lbl && val && sub) {
          lbl.innerText = catName || 'Category';
          val.innerText = formatINR(catAmt || 0);
          sub.innerText = `${catPct}% of spend`;
        }
      });
      slice.addEventListener('mouseleave', () => {
        const lbl = this.container.querySelector('#donut-center-label');
        const val = this.container.querySelector('#donut-center-val');
        const sub = this.container.querySelector('#donut-center-sub');
        if (lbl && val && sub && !this.state.insightsActiveCategory) {
          lbl.innerText = 'Total Outflow';
          val.innerText = formatINR(insightsAnalytics?.totalDebits || analytics?.totalDebits || 0);
          sub.innerText = `${(insightsAnalytics?.categoryShare || []).length} Categories`;
        }
      });
    });

    // Reset All Insights Slicers
    this.container.querySelector('#kredo-reset-insights-filters-btn')?.addEventListener('click', () => {
      this.state.insightsSource = this.state.dataSource;
      this.state.insightsTimePreset = 'all';
      this.state.selectedMonth = 'all';
      this.state.insightsTypeFilter = 'all';
      this.state.insightsCategoryFilter = 'all';
      this.state.insightsMethodFilter = 'all';
      this.state.insightsBankFilter = 'all';
      this.state.insightsAppFilter = 'all';
      this.state.insightsNetFilter = 'all';
      this.state.insightsNatureFilter = 'all';
      this.state.insightsReviewFilter = 'all';
      this.state.insightsActiveCategory = null;
      this.state.insightsCustomStart = '';
      this.state.insightsCustomEnd = '';
      this.render();
      this.showToast('Reset all Insights filters to default');
    });

    // Data Source Isolation Switcher (Kredo Email vs Google Sheet)
    this.container.querySelectorAll('[data-source]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const source = btn.dataset.source;
        if (source && (source === 'kredo' || source === 'sheet')) {
          this.state.dataSource = source;
          const pool = source === 'sheet' ? this.state.sheetTransactions : this.state.transactions;
          const months = getAvailableMonths(pool);
          if (months.length > 0 && !months.some(m => m.key === this.state.selectedMonth)) {
            this.state.selectedMonth = 'all';
          }
          this.state.selectedTxIds.clear();
          this.render();
          this.showToast(source === 'sheet' ? 'Switched to Google Sheet isolated stream' : 'Switched to Kredo Email isolated vault');
        }
      });
    });

    // Switch Source from Sheet Hero
    this.container.querySelectorAll('[data-switch-source]').forEach(btn => {
      btn.addEventListener('click', () => {
        const source = btn.dataset.switchSource;
        if (source) {
          this.state.dataSource = source;
          this.state.activeTab = 'ledger';
          this.render();
          this.showToast('Filtering ledger and insights exclusively for Google Sheet');
        }
      });
    });

    // Sheet Manual Refresh Button
    this.container.querySelector('#kredo-sheet-refresh-btn')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#kredo-sheet-refresh-btn');
      if (btn) {
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
      }
      this.state.isSheetLoading = true;
      try {
        const res = await fetchGoogleSheetTransactions(true);
        if (res.success) {
          this.state.sheetTransactions = res.transactions;
          this.state.lastSheetSync = res.lastSync;
          this.showToast(`Synced ${res.transactions.length} rows from Google Sheet`);
        } else {
          this.showToast('Google Sheet refresh failed: ' + (res.error || 'Check connection'));
        }
      } catch (err) {
        this.showToast('Error syncing Google Sheet');
      } finally {
        this.state.isSheetLoading = false;
        this.render();
      }
    });

    // Filter Type Pills
    this.container.querySelectorAll('[data-filter-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.typeFilter = btn.dataset.filterType;
        this.state.inspectingPoint = null;
        this.render();
      });
    });

    // Toggle Select All
    this.container.querySelector('#toggle-select-all-btn')?.addEventListener('click', () => {
      this.toggleSelectAll(filteredTxs);
    });

    // Row Checkbox Toggle
    this.container.querySelectorAll('[data-toggle-select]').forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSelectTx(checkbox.dataset.toggleSelect);
      });
    });

    const activePool = this.state.dataSource === 'sheet' ? this.state.sheetTransactions : this.state.transactions;

    // Quick Edit Button
    // Google Sheet Table Actions (Info, Edit, Delete, Row Click)
    this.container.querySelectorAll('[data-sheet-edit], [data-sheet-delete], [data-sheet-info]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const txId = btn.dataset.sheetEdit || btn.dataset.sheetDelete || btn.dataset.sheetInfo;
        const tx = this.state.sheetTransactions.find(t => t.id === txId);
        if (tx) {
          this.openModal('sheet-readonly-notice', tx);
        }
      });
    });

    this.container.querySelectorAll('[data-open-sheet-tx]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.kredo-sheet-action-btn')) return;
        const txId = row.dataset.openSheetTx;
        const tx = this.state.sheetTransactions.find(t => t.id === txId);
        if (tx) {
          this.openModal('sheet-readonly-notice', tx);
        }
      });
    });

    // Card Due Detail Inspection
    this.container.querySelectorAll('[data-inspect-card-due]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-view-card-txs]') || e.target.closest('[data-edit-card]') || e.target.closest('[data-delete-card]')) return;
        const cardId = el.dataset.inspectCardDue;
        const card = this.state.cards.find(c => c.id === cardId);
        if (card) {
          this.state.selectedCard = card;
          this.openModal('card-due-detail');
        }
      });
    });

    // Modal Edit Trigger from Detail Inspector
    this.container.querySelectorAll('[data-modal-edit-tx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tx = this.state.transactions.find(t => t.id === btn.dataset.modalEditTx) || this.state.selectedTx;
        if (tx) {
          this.openModal('edit', tx);
        }
      });
    });

    // Quick Edit Button
    this.container.querySelectorAll('[data-quick-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tx = activePool.find(t => t.id === btn.dataset.quickEdit);
        if (tx) {
          if (this.state.dataSource === 'sheet' || tx.isGoogleSheet) {
            this.openModal('sheet-readonly-notice', tx);
          } else {
            this.openModal('edit', tx);
          }
        }
      });
    });

    // Quick Delete Button
    this.container.querySelectorAll('[data-quick-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tx = activePool.find(t => t.id === btn.dataset.quickDelete);
        if (tx) {
          if (this.state.dataSource === 'sheet' || tx.isGoogleSheet) {
            this.openModal('sheet-readonly-notice', tx);
          } else {
            this.openModal('delete-confirm', tx);
          }
        }
      });
    });

    // Row Click: Show PREVIEW BOX (Pure, clean, structured receipt)
    this.container.querySelectorAll('[data-open-tx]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-toggle-select]') || e.target.closest('.kredo-mini-btn')) return;
        const tx = activePool.find(t => t.id === row.dataset.openTx);
        if (tx) {
          if (this.state.dataSource === 'sheet' || tx.isGoogleSheet) {
            this.openModal('sheet-readonly-notice', tx);
          } else {
            this.openModal('preview', tx);
          }
        }
      });
    });

    // Desktop & Mobile Navigation Tabs
    this.container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.activeTab = btn.dataset.nav;
        this.state.selectedCardIdFilter = null;
        this.render();
      });
    });

    // Batch Actions
    this.container.querySelector('#batch-clear-btn')?.addEventListener('click', () => {
      this.clearSelection();
    });

    this.container.querySelector('#batch-delete-btn')?.addEventListener('click', () => {
      this.openModal('batch-delete-confirm');
    });

    // Confirm Batch Delete
    this.container.querySelector('#confirm-batch-delete-btn')?.addEventListener('click', async () => {
      const idsToDelete = Array.from(this.state.selectedTxIds);
      await deleteKredoTransactionsBatch(idsToDelete);
      this.state.transactions = await getKredoTransactions();
      this.clearSelection();
      this.closeModal();
      this.showToast(`Deleted ${idsToDelete.length} transactions.`);
    });

    this.container.querySelector('#cancel-batch-delete-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Confirm Single Delete
    this.container.querySelector('#confirm-single-delete-btn')?.addEventListener('click', async () => {
      if (this.state.selectedTx) {
        await deleteKredoTransaction(this.state.selectedTx.id);
        this.state.transactions = await getKredoTransactions();

        // Check if selected month still has transactions
        const remainingInMonth = this.state.transactions.filter(t => t.date && t.date.startsWith(this.state.selectedMonth));
        if (remainingInMonth.length === 0 && this.state.selectedMonth !== 'all') {
          const months = getAvailableMonths(this.state.transactions);
          this.state.selectedMonth = months.length > 0 ? months[0].key : 'all';
        }

        this.closeModal();
        this.showToast('Transaction deleted.');
      }
    });

    this.container.querySelector('#cancel-delete-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Close Modal
    this.container.querySelector('#close-modal-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    this.container.querySelector('#close-modal-btn-2')?.addEventListener('click', () => {
      this.closeModal();
    });

    this.container.querySelector('#edit-cancel-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    this.container.querySelector('#kredo-modal-bg')?.addEventListener('click', (e) => {
      if (e.target.id === 'kredo-modal-bg') this.closeModal();
    });

    // Segmented Type Button Handlers in Add Transaction Modal
    this.container.querySelectorAll('.kredo-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.dataset.typeTarget;
        const hiddenInput = this.container.querySelector('#add-type-val');
        if (hiddenInput) hiddenInput.value = targetType;
        this.container.querySelectorAll('.kredo-type-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--kredo-outline)';
        });
        btn.classList.add('active');
        btn.style.background = targetType === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)';
        btn.style.color = '#ffffff';
      });
    });

    // Segmented Type Button Handlers in Edit Transaction Modal
    this.container.querySelectorAll('.kredo-edit-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.dataset.typeTarget;
        const hiddenInput = this.container.querySelector('#edit-type-val');
        if (hiddenInput) hiddenInput.value = targetType;
        this.container.querySelectorAll('.kredo-edit-type-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--kredo-outline)';
        });
        btn.classList.add('active');
        btn.style.background = targetType === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)';
        btn.style.color = '#ffffff';
      });
    });

    // Add Form Submit
    this.container.querySelector('#kredo-add-tx-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(this.container.querySelector('#add-amount')?.value || '0');
      const date = this.container.querySelector('#add-date')?.value || new Date().toISOString().slice(0, 10);
      const merchant = this.container.querySelector('#add-merchant')?.value.trim();
      const type = this.container.querySelector('#add-type-val')?.value || 'debit';
      const paymentMethod = this.container.querySelector('#add-method')?.value || 'UPI';
      const category = this.container.querySelector('#add-category')?.value || 'General';
      const bank = this.container.querySelector('#add-bank')?.value?.trim() || '';
      const cardLast4 = this.container.querySelector('#add-card-last4')?.value?.trim()?.slice(-4) || '';
      const paymentApp = this.container.querySelector('#add-app')?.value?.trim() || '';
      const cardNetwork = this.container.querySelector('#add-network')?.value?.trim() || '';
      const referenceId = this.container.querySelector('#add-ref-id')?.value?.trim() || '';
      const linkedBillId = this.container.querySelector('#add-linked-bill')?.value?.trim() || '';
      const notes = this.container.querySelector('#add-notes')?.value?.trim() || '';

      if (!amount || !merchant) return;

      const result = await addKredoTransaction({
        date,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        amount,
        merchant,
        type,
        paymentMethod,
        category,
        bank,
        cardLast4,
        paymentApp,
        cardNetwork,
        referenceId,
        linkedBillId,
        notes,
        currency: 'INR',
        status: 'Completed',
        source: 'Manual Entry',
      });

      if (result.duplicate) {
        this.showToast('Duplicate transaction detected!');
      } else {
        this.state.transactions = await getKredoTransactions();
        this.state.cards = await getCreditCards(); // refresh limits
        // Ensure the month of the newly added transaction is visible
        const txMonth = date.slice(0, 7);
        if (this.state.selectedMonth !== 'all' && this.state.selectedMonth !== txMonth) {
          this.state.selectedMonth = txMonth;
        }
        this.closeModal();
        this.showToast(`Saved ${formatINR(amount)} for ${merchant}!`);
      }
    });

    // Edit Form Submit
    this.container.querySelector('#kredo-edit-tx-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = this.container.querySelector('#edit-tx-id')?.value;
      const amount = parseFloat(this.container.querySelector('#edit-amount')?.value || '0');
      const date = this.container.querySelector('#edit-date')?.value;
      const time = this.container.querySelector('#edit-time')?.value?.trim();
      const merchant = this.container.querySelector('#edit-merchant')?.value.trim();
      const category = this.container.querySelector('#edit-category')?.value;
      const paymentMethod = this.container.querySelector('#edit-method')?.value;
      const type = this.container.querySelector('#edit-type-val')?.value || 'debit';
      const bank = this.container.querySelector('#edit-bank')?.value?.trim() || '';
      const cardLast4 = this.container.querySelector('#edit-card-last4')?.value?.trim()?.slice(-4) || '';
      const paymentApp = this.container.querySelector('#edit-app')?.value?.trim() || '';
      const cardNetwork = this.container.querySelector('#edit-network')?.value?.trim() || '';
      const referenceId = this.container.querySelector('#edit-ref-id')?.value?.trim() || '';
      const transactionId = this.container.querySelector('#edit-tx-id-val')?.value?.trim() || '';
      const nature = this.container.querySelector('#edit-nature')?.value?.trim() || '';
      const linkedBillId = this.container.querySelector('#edit-linked-bill')?.value?.trim() || '';
      const reviewFlag = this.container.querySelector('#edit-review-flag')?.value?.trim() || '';
      const reviewReason = this.container.querySelector('#edit-review-reason')?.value?.trim() || '';
      const notes = this.container.querySelector('#edit-notes')?.value?.trim() || '';

      if (!id || !amount || !merchant) return;

      await updateKredoTransaction(id, {
        amount,
        date,
        time,
        merchant,
        category,
        paymentMethod,
        type,
        bank,
        cardLast4,
        paymentApp,
        cardNetwork,
        referenceId,
        transactionId,
        nature,
        linkedBillId,
        reviewFlag,
        reviewReason,
        notes,
      });

      this.state.transactions = await getKredoTransactions();
      this.closeModal();
      this.showToast('Transaction updated successfully.');
    });

    // Autocomplete quick chips
    this.container.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = this.container.querySelector('#add-merchant');
        if (input) input.value = btn.dataset.chip;
      });
    });

    // Analyze & Import Statement (Handles unlimited volume, resilient syntax, and animated progress)
    this.container.querySelector('#analyze-import-btn')?.addEventListener('click', async () => {
      const inputEl = this.container.querySelector('#import-json-input');
      const btn = this.container.querySelector('#analyze-import-btn');
      const statusBox = this.container.querySelector('#import-loading-status');
      const raw = inputEl?.value?.trim();

      if (!raw) {
        alert('Please paste statement JSON data before importing.');
        return;
      }

      // 1. Enter Animated Loading / Progress State
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="kredo-spinner"></span> <span>Importing statement data... Please wait</span>';
        btn.style.opacity = '0.8';
        btn.style.pointerEvents = 'none';
      }
      if (statusBox) statusBox.style.display = 'flex';
      if (inputEl) inputEl.disabled = true;

      // Yield execution to the browser thread so the spinner and "Please wait" state paints immediately
      await new Promise(resolve => setTimeout(resolve, 80));

      try {
        // analyzeImportBatch seamlessly handles raw strings, markdown code blocks, JSON arrays, and nested objects
        const analysis = analyzeImportBatch(raw, this.state.transactions);
        const newItems = analysis.newItems || analysis.newTransactions || [];
        const duplicateItems = analysis.duplicateItems || [];
        const total = analysis.totalParsed || (newItems.length + duplicateItems.length);

        if (newItems.length === 0) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Analyze & Import Statement</span>';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
          }
          if (statusBox) statusBox.style.display = 'none';
          if (inputEl) inputEl.disabled = false;

          if (duplicateItems.length > 0) {
            alert(`Deduplication: All ${total} transactions already exist in your vault. 0 duplicates imported.`);
          } else {
            alert('Could not find valid transaction records. Please ensure your JSON includes date, amount, and merchant name.');
          }
          return;
        }

        // Batch save into persistent storage & reactive cache
        await addKredoTransactionsBatch(newItems);
        this.state.transactions = await getKredoTransactions();
        this.state.cards = await getCreditCards(); // refresh card limits
        this.state.selectedMonth = 'all'; // Set to all so newly imported records are visible immediately
        this.closeModal();
        this.showToast(`Imported ${newItems.length} transactions! (${duplicateItems.length} duplicates skipped)`);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Analyze & Import Statement</span>';
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        }
        if (statusBox) statusBox.style.display = 'none';
        if (inputEl) inputEl.disabled = false;
        alert('Statement parsing error: ' + (err.message || 'Unknown error. Please check formatting.'));
      }
    });

    // Quick Approve & Mark as Approved
    this.container.querySelectorAll('[data-quick-approve], [data-modal-approve-tx]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const txId = btn.dataset.quickApprove || btn.dataset.modalApproveTx;
        if (!txId) return;

        setSheetApproval(txId, true, 'Approved & Synced to Insights');

        // Update local memory
        const updateInList = (list) => list.map(t => {
          if (t.id === txId) {
            return {
              ...t,
              isApproved: true,
              reviewFlag: 'Approved',
              reviewReason: 'Verified & Approved',
            };
          }
          return t;
        });

        this.state.transactions = updateInList(this.state.transactions);
        this.state.sheetTransactions = updateInList(this.state.sheetTransactions);

        if (this.state.selectedTx && this.state.selectedTx.id === txId) {
          this.state.selectedTx.isApproved = true;
          this.state.selectedTx.reviewFlag = 'Approved';
        }

        // Also persist if it's an email/local transaction
        const localTx = this.state.transactions.find(t => t.id === txId);
        if (localTx) {
          await updateKredoTransaction(txId, {
            ...localTx,
            isApproved: true,
            reviewFlag: 'Approved',
            reviewReason: 'Verified & Approved',
          });
        }

        this.showToast('Transaction approved and synced to Insights!');
        this.render();
      });
    });

    // Batch Approve
    this.container.querySelector('#batch-approve-btn')?.addEventListener('click', async () => {
      const selectedIds = Array.from(this.state.selectedTxIds);
      if (selectedIds.length === 0) return;

      batchSetSheetApprovals(selectedIds, true);

      const updateInList = (list) => list.map(t => {
        if (selectedIds.includes(t.id)) {
          return {
            ...t,
            isApproved: true,
            reviewFlag: 'Approved',
            reviewReason: 'Verified & Approved',
          };
        }
        return t;
      });

      this.state.transactions = updateInList(this.state.transactions);
      this.state.sheetTransactions = updateInList(this.state.sheetTransactions);

      this.clearSelection();
      this.showToast(`Approved ${selectedIds.length} transactions and synced to Insights!`);
      this.render();
    });

    // Reconciliation Compare Side-by-Side
    this.container.querySelectorAll('[data-reconcile-compare]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.reconcileCompare, 10);
        if (pendingMatches && pendingMatches[idx]) {
          this.state.activeCandidateMatch = pendingMatches[idx];
          this.openModal('reconcile-compare');
        }
      });
    });

    // Reconciliation Quick Merge
    this.container.querySelectorAll('[data-quick-merge]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.quickMerge, 10);
        if (pendingMatches && pendingMatches[idx]) {
          const match = pendingMatches[idx];
          mergeTransactions(match.emailTx, match.sheetTx, match.confidence);
          this.showToast('Transactions merged into unified record with 5-minute undo!');
          this.render();
        }
      });
    });

    // Reconcile Modal Confirm Merge
    this.container.querySelector('#modal-merge-confirm-btn')?.addEventListener('click', () => {
      if (this.state.activeCandidateMatch) {
        const match = this.state.activeCandidateMatch;
        mergeTransactions(match.emailTx, match.sheetTx, match.confidence);
        this.closeModal();
        this.showToast('Transactions merged into unified record with 5-minute undo!');
        this.render();
      }
    });

    // Reconcile Dismiss Match Suggestion
    this.container.querySelectorAll('[data-dismiss-match], #modal-dismiss-match-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.dismissMatch || btn.dataset.pairKey;
        if (key) {
          dismissMatch(key);
          this.closeModal();
          this.showToast('Match suggestion dismissed');
          this.render();
        }
      });
    });

    // Reconcile Rescan / Refresh Button
    this.container.querySelector('#kredo-reconcile-refresh-btn')?.addEventListener('click', () => {
      this.showToast('Rescanning streams for duplicate candidate matches...');
      this.render();
    });

    // Reconcile Unmerge / Undo
    this.container.querySelectorAll('[data-unmerge]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mergeId = btn.dataset.unmerge;
        if (mergeId) {
          unmergeTransactions(mergeId);
          this.showToast('Transactions restored to original individual states!');
          this.render();
        }
      });
    });

    // Open Annotation Tag Modal
    this.container.querySelectorAll('[data-add-annotation], [data-edit-annotation], [data-modal-tag-tx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const txId = btn.dataset.addAnnotation || btn.dataset.editAnnotation || btn.dataset.modalTagTx;
        const tx = activePool.find(t => t.id === txId) || this.state.transactions.find(t => t.id === txId) || this.state.sheetTransactions.find(t => t.id === txId) || this.state.selectedTx;
        if (tx) {
          this.state.annotationTx = tx;
          this.openModal('edit-annotation');
        }
      });
    });

    // Quick tag chips in Annotation modal
    this.container.querySelectorAll('[data-fill-annotation]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = this.container.querySelector('#annotation-input');
        if (input) input.value = btn.dataset.fillAnnotation;
      });
    });

    // Save Annotation Form Submit
    this.container.querySelector('#kredo-annotation-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const txId = this.container.querySelector('#annotation-tx-id')?.value;
      const merchant = this.container.querySelector('#annotation-tx-merchant')?.value;
      const tag = this.container.querySelector('#annotation-input')?.value?.trim();
      const remember = this.container.querySelector('#annotation-remember-merchant')?.checked;

      if (!tag) return;

      if (remember && merchant) {
        setMerchantAnnotation(merchant, tag);
      }
      if (txId) {
        setTransactionAnnotationOverride(txId, tag);
      }

      this.closeModal();
      this.showToast(`Saved annotation "${tag}" for ${merchant || 'transaction'}!`);
      this.render();
    });

    // Open Manage Annotations Modal
    this.container.querySelector('#quick-action-annotations-btn')?.addEventListener('click', () => {
      this.openModal('manage-annotations');
    });

    // Delete Annotation Memory Rule
    this.container.querySelectorAll('[data-delete-annotation-merchant]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const merchant = btn.dataset.deleteAnnotationMerchant;
        if (merchant) {
          removeMerchantAnnotation(merchant);
          this.showToast(`Deleted memory rule for ${merchant}`);
          this.render();
        }
      });
    });
  }
}

/**
 * Mounts KREDO application directly
 */
export function mountKredoApp(containerNode, profile, options = {}) {
  document.querySelectorAll('.kredo-splash-screen').forEach(s => s.remove());
  if (containerNode) containerNode.innerHTML = '';
  return new KredoController(containerNode, profile, options);
}
