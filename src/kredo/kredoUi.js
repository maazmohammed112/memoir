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
      timeRange: '1D', // '1H' | '1D' | '1W' | '1M' | '1Y' | 'All'
      showBalance: true,
      activeTab: 'ledger', // 'ledger' | 'cards' | 'categories' | 'insights' | 'ai'
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

    // Render skeleton immediately (0ms latency, zero flicker)
    this.render();
    this.init();
  }

  async init() {
    try {
      const [txs, cards] = await Promise.all([
        getKredoTransactions(),
        getCreditCards(),
      ]);
      this.state.transactions = txs;
      this.state.cards = cards;
      const months = getAvailableMonths(txs);
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
    } = this.state;

    // Filter transactions using multi-filter engine
    let filteredTxs = filterTransactions(transactions, {
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

    // Compute Executive Analytics
    const analytics = computeKredoAnalytics(transactions, filteredTxs);

    // Real-Time Dynamic Chart Data
    const chartData = this.computeRealtimeChart(filteredTxs, timeRange);

    const availableMonths = getAvailableMonths(transactions);
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
              <!-- Desktop Navigation Tabs -->
              <nav class="kredo-desktop-nav-tabs">
                <button class="kredo-desktop-tab-btn ${activeTab === 'ledger' ? 'active' : ''}" data-nav="ledger">
                  <span class="material-symbols-outlined text-[16px]">receipt_long</span> Ledger
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'cards' ? 'active' : ''}" data-nav="cards">
                  <span class="material-symbols-outlined text-[16px]">credit_card</span> Credit Cards
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'categories' ? 'active' : ''}" data-nav="categories">
                  <span class="material-symbols-outlined text-[16px]">pie_chart</span> Categories
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'insights' ? 'active' : ''}" data-nav="insights">
                  <span class="material-symbols-outlined text-[16px]">speed</span> Velocity
                </button>
                <button class="kredo-desktop-tab-btn ${activeTab === 'ai' ? 'active' : ''}" data-nav="ai">
                  <span class="material-symbols-outlined text-[16px]">psychology</span> AI
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
            ${this.renderCanvasContent(analytics, hierarchicalWeeks, filteredTxs, availableMonths, isAllSelected, chartData)}
          </main>

          <!-- Floating Bottom Navigation Pill Shell (Mobile Only) -->
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

              <button class="kredo-nav-item ${activeTab === 'categories' ? 'active' : ''}" data-nav="categories" title="Categories">
                <span class="material-symbols-outlined ${activeTab === 'categories' ? 'fill' : ''}">pie_chart</span>
              </button>
              <button class="kredo-nav-item ${activeTab === 'insights' ? 'active' : ''}" data-nav="insights" title="Spending Velocity">
                <span class="material-symbols-outlined ${activeTab === 'insights' ? 'fill' : ''}">speed</span>
              </button>
            </div>
          </nav>

          <!-- Floating Batch Selection Actions Dock -->
          ${selectedCount > 0 ? `
            <div class="kredo-batch-dock">
              <span style="font-size: 13px; font-weight: 700;">
                ${selectedCount} selected
              </span>
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

    this.bindEvents(filteredTxs, chartData);
  }

  renderCanvasContent(analytics, hierarchicalWeeks, filteredTxs, availableMonths, isAllSelected, chartData) {
    const { isLoading, activeTab, showBalance, timeRange, selectedMonth, typeFilter, inspectingPoint, cards, selectedCardIdFilter } = this.state;
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
                    <div class="kredo-card" style="padding: 16px 18px; gap: 12px;">
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

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 8px 10px; background: var(--kredo-surface-container-low); border-radius: 8px; font-size: 11.5px;">
                        <div>
                          <span style="color: var(--kredo-outline); display: block;">Billing Date</span>
                          <strong style="color: var(--kredo-secondary);">${card.billDay}th of month</strong>
                        </div>
                        <div>
                          <span style="color: var(--kredo-outline); display: block;">Payment Due</span>
                          <strong style="color: ${card.dueBadgeColor};">${card.dueBadge}</strong>
                        </div>
                      </div>

                      <!-- Card Action Controls -->
                      <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--kredo-outline-variant); padding-top: 10px;">
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
            
            <!-- Filter Strip & Month Dropdown -->
            <section class="kredo-filter-strip">
              <div class="kredo-filter-pills">
                <button class="kredo-filter-pill ${typeFilter === 'all' ? 'active' : ''}" data-filter-type="all">All</button>
                <button class="kredo-filter-pill ${typeFilter === 'debit' ? 'active' : ''}" data-filter-type="debit">Outflows</button>
                <button class="kredo-filter-pill ${typeFilter === 'credit' ? 'active' : ''}" data-filter-type="credit">Inflows</button>
                <button class="kredo-filter-pill ${isAllSelected ? 'active' : ''}" id="toggle-select-all-btn" style="background: ${isAllSelected ? 'var(--kredo-primary)' : 'transparent'}; color: ${isAllSelected ? '#ffffff' : 'inherit'};">
                  ${isAllSelected ? '✓ Deselect' : `Select All (${filteredTxs.length})`}
                </button>
              </div>

              <select class="kredo-month-select" id="kredo-month-dropdown">
                <option value="all" ${selectedMonth === 'all' ? 'selected' : ''}>All Months</option>
                ${availableMonths.map(m => `
                  <option value="${m.key}" ${selectedMonth === m.key ? 'selected' : ''}>${m.label}</option>
                `).join('')}
              </select>
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

                        ${(day.transactions || []).map(tx => `
                          <div class="kredo-tx-row" data-open-tx="${tx.id}">
                            <div class="kredo-tx-left">
                              <div class="kredo-tx-checkbox ${this.state.selectedTxIds.has(tx.id) ? 'checked' : ''}" data-toggle-select="${tx.id}">
                                ${this.state.selectedTxIds.has(tx.id) ? '✓' : ''}
                              </div>
                              
                              <div class="kredo-tx-avatar ${tx.type === 'debit' ? 'debit' : 'credit'}">
                                ${getCategoryIcon(tx.category, tx.type)}
                              </div>

                              <div style="min-width: 0; flex: 1;">
                                <div class="kredo-tx-merchant">${tx.merchant}</div>
                                <div class="kredo-tx-meta">
                                  <span>${tx.category}</span> &bull; <span>${tx.paymentMethod}</span>
                                  ${tx.cardLast4 ? `&bull; <span style="font-family:var(--kredo-mono); font-weight:600;">••${tx.cardLast4}</span>` : ''}
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
                        `).join('')}
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

    if (activeTab === 'categories') {
      const categories = analytics.categoryShare || [];
      const paymentMethods = analytics.paymentMethodShare || [];

      return `
        <!-- Categories Breakdown Desktop Dashboard -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
          
          <div class="kredo-card">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">Category Outflows</h3>
              <span style="font-size: 12px; color: var(--kredo-outline);">${categories.length} Categories</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${categories.length > 0 ? categories.map(cat => `
                <div style="background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(0,0,255,0.08); color: var(--kredo-primary); display: flex; align-items: center; justify-content: center;">
                        ${getCategoryIcon(cat.category)}
                      </div>
                      <strong style="font-size: 14px; color: var(--kredo-secondary);">${cat.category}</strong>
                    </div>
                    <div style="text-align: right;">
                      <strong style="font-size: 14px; font-family: var(--kredo-mono);">${formatINR(cat.amount)}</strong>
                      <span style="font-size: 11px; color: var(--kredo-outline); margin-left: 4px;">(${cat.percentage}%)</span>
                    </div>
                  </div>
                  <div style="height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${cat.percentage}%; background: var(--kredo-primary); border-radius: 3px;"></div>
                  </div>
                </div>
              `).join('') : '<p style="color: var(--kredo-outline); font-size: 13px; text-align: center; padding: 20px 0;">No category data recorded.</p>'}
            </div>
          </div>

          <div class="kredo-card">
            <h4 style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: var(--kredo-secondary);">Payment Method Distribution</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${paymentMethods.length > 0 ? paymentMethods.map(pm => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--kredo-surface-container-low); border-radius: 10px; font-size: 13px;">
                  <span style="color: var(--kredo-secondary); font-weight: 600;">${pm.method}</span>
                  <span style="font-family: var(--kredo-mono); color: var(--kredo-outline); font-weight: 700;">${formatINR(pm.amount)} (${pm.percentage}%)</span>
                </div>
              `).join('') : '<p style="color: var(--kredo-outline); font-size: 13px; text-align: center; padding: 20px 0;">No payment method distribution available.</p>'}
            </div>
          </div>

        </div>
      `;
    }

    if (activeTab === 'insights') {
      const aiInsights = analytics.localAiInsights || [];

      return `
        <!-- Spending Velocity & Local AI Analytics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
          
          <div class="kredo-card">
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 16px 0; color: var(--kredo-secondary);">Spending Velocity</h3>

            <div style="background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 14px; padding: 16px 18px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--kredo-outline); text-transform: uppercase;">Daily Burn Pace</span>
                <strong style="font-size: 20px; color: var(--kredo-primary); font-family: var(--kredo-mono);">${formatINR(analytics.dailyAverageSpend || 0)} / day</strong>
              </div>
              <p style="font-size: 12.5px; color: var(--kredo-on-surface-variant); margin: 0;">
                Peak Outflow: ${analytics.highestPaymentPeriod ? `${formatINR(analytics.highestPaymentPeriod.amount)} at ${analytics.highestPaymentPeriod.merchant} (${analytics.highestPaymentPeriod.date || ''})` : 'None recorded'}
              </p>
            </div>

            <div style="background: var(--kredo-surface-container-low); border-radius: 12px; padding: 14px 16px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--kredo-outline); text-transform: uppercase; display: block; margin-bottom: 4px;">Total Transaction Count</span>
              <strong style="font-size: 18px; color: var(--kredo-secondary);">${analytics.debitsCount} outflows &bull; ${analytics.creditsCount} inflows</strong>
            </div>
          </div>

          <div class="kredo-card">
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 16px 0; color: var(--kredo-secondary);">Actionable Intelligence</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${aiInsights.length > 0 ? aiInsights.map(ai => `
                <div style="background: #ffffff; border-left: 4px solid var(--kredo-primary); border-radius: 10px; padding: 14px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); border-top: 1px solid var(--kredo-outline-variant); border-right: 1px solid var(--kredo-outline-variant); border-bottom: 1px solid var(--kredo-outline-variant);">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--kredo-primary); margin-bottom: 2px;">
                    ${ai.tag || ai.severity || ai.type || 'INSIGHT'}
                  </div>
                  <strong style="font-size: 14px; color: var(--kredo-secondary); display: block; margin-bottom: 4px;">
                    ${ai.title || 'Financial Velocity Insight'}
                  </strong>
                  <p style="font-size: 12.5px; color: var(--kredo-on-surface-variant); margin: 0; line-height: 1.4;">
                    ${ai.desc || ai.message || 'On-device telemetry evaluated smoothly.'}
                  </p>
                </div>
              `).join('') : '<p style="color: var(--kredo-outline); font-size: 13px; text-align: center; padding: 20px 0;">Record expenses to view on-device AI velocity intelligence.</p>'}
            </div>
          </div>

        </div>
      `;
    }

    if (activeTab === 'ai') {
      return `
        <!-- AI Financial Health & Overview -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
          
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

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Limit (₹)</label>
                  <input type="number" step="1000" class="kredo-form-input" id="card-total-limit" placeholder="e.g. 500000" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Available Limit (₹)</label>
                  <input type="number" step="1000" class="kredo-form-input" id="card-current-limit" placeholder="e.g. 420000" required />
                </div>
              </div>

              <!-- Live Calculation Preview -->
              <div id="card-limit-calc-preview" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--kredo-surface-container-low); border-radius: 8px; font-size: 12px;">
                <span style="color: var(--kredo-outline);">Auto-calculated Used Limit:</span>
                <strong style="color: var(--kredo-primary); font-family: var(--kredo-mono);" id="card-preview-used">₹0 (0% utilization)</strong>
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

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Total Limit (₹)</label>
                  <input type="number" class="kredo-form-input" id="edit-card-total-limit" value="${selectedCard.totalLimit}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Available Limit (₹)</label>
                  <input type="number" class="kredo-form-input" id="edit-card-current-limit" value="${selectedCard.currentLimit}" required />
                </div>
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

    // TRANSACTION PREVIEW BOX (Pure, clean, structured receipt - not edit form!)
    if (activeModal === 'preview' && selectedTx) {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet" style="max-width: 440px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="kredo-tx-avatar ${selectedTx.type === 'credit' ? 'credit' : 'debit'}">
                  ${getCategoryIcon(selectedTx.category, selectedTx.type)}
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--kredo-secondary);">${selectedTx.merchant}</h3>
                  <span style="font-size: 11.5px; color: var(--kredo-outline);">${selectedTx.category}</span>
                </div>
              </div>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Prominent Amount Display -->
            <div style="background: var(--kredo-surface-container-low); border-radius: 12px; padding: 18px 20px; text-align: center; margin-bottom: 16px; border: 1px solid var(--kredo-outline-variant);">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                ${selectedTx.type === 'credit' ? 'Inflow (Credit)' : 'Outflow (Debit)'}
              </span>
              <div style="font-size: 32px; font-weight: 800; font-family: var(--kredo-mono); color: ${selectedTx.type === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-secondary)'};">
                ${selectedTx.type === 'credit' ? '+' : '-'}${formatINR(selectedTx.amount)}
              </div>
              <div style="margin-top: 6px;">
                <span style="background: ${selectedTx.type === 'credit' ? 'var(--kredo-green-bg)' : 'rgba(0,0,255,0.08)'}; color: ${selectedTx.type === 'credit' ? 'var(--kredo-green)' : 'var(--kredo-primary)'}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                  VERIFIED &bull; ON-DEVICE STORED
                </span>
              </div>
            </div>

            <!-- Structured Detail List -->
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                <span style="color: var(--kredo-outline);">Date & Time</span>
                <strong style="color: var(--kredo-secondary);">${selectedTx.date} &bull; ${format12HourTime(selectedTx.time) || '12:00 PM'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                <span style="color: var(--kredo-outline);">Payment Method</span>
                <strong style="color: var(--kredo-secondary);">${selectedTx.paymentMethod || 'UPI'}${selectedTx.cardLast4 ? ` (••${selectedTx.cardLast4})` : ''}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                <span style="color: var(--kredo-outline);">Category</span>
                <strong style="color: var(--kredo-secondary);">${selectedTx.category || 'General'}</strong>
              </div>
              ${selectedTx.referenceId ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                  <span style="color: var(--kredo-outline);">Reference ID</span>
                  <strong style="font-family: var(--kredo-mono); font-size: 11.5px; color: var(--kredo-secondary);">${selectedTx.referenceId}</strong>
                </div>
              ` : ''}
              ${selectedTx.notes ? `
                <div style="display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: #ffffff; border: 1px solid var(--kredo-outline-variant); border-radius: 8px;">
                  <span style="color: var(--kredo-outline); font-size: 11px;">Notes</span>
                  <span style="color: var(--kredo-secondary);">${selectedTx.notes}</span>
                </div>
              ` : ''}
            </div>

            <div style="margin-top: 16px;">
              <button class="kredo-btn-action" id="close-modal-btn-2" style="width: 100%;">
                Done
              </button>
            </div>
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
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Add Transaction</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-add-tx-form" style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Type</label>
                <div style="display: flex; gap: 8px;">
                  <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px solid var(--kredo-outline-variant); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    <input type="radio" name="add-type" value="debit" checked /> Outflow
                  </label>
                  <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px solid var(--kredo-outline-variant); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    <input type="radio" name="add-type" value="credit" /> Inflow
                  </label>
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

              <!-- Card Last 4 Digits (for auto-deduction) -->
              <div id="add-card-last4-wrap" style="display: none;">
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Card Last 4 Digits</label>
                <input type="text" class="kredo-form-input" id="add-card-last4" placeholder="e.g. 4028 (Auto-deducts card limit)" maxlength="4" />
              </div>

              <button type="submit" class="kredo-btn-action" style="width: 100%; margin-top: 8px;">
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // EDIT TRANSACTION MODAL
    if (activeModal === 'edit' && selectedTx) {
      return `
        <div class="kredo-modal-backdrop" id="kredo-modal-bg">
          <div class="kredo-modal-sheet">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0;">Edit Transaction</h3>
              <button class="kredo-mini-btn" id="close-modal-btn">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="kredo-edit-tx-form" style="display: flex; flex-direction: column; gap: 12px;">
              <input type="hidden" id="edit-tx-id" value="${selectedTx.id}" />

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Type</label>
                <div style="display: flex; gap: 8px;">
                  <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px solid var(--kredo-outline-variant); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    <input type="radio" name="edit-type" value="debit" ${selectedTx.type === 'debit' ? 'checked' : ''} /> Outflow
                  </label>
                  <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px solid var(--kredo-outline-variant); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    <input type="radio" name="edit-type" value="credit" ${selectedTx.type === 'credit' ? 'checked' : ''} /> Inflow
                  </label>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Amount (₹)</label>
                  <input type="number" step="0.01" class="kredo-form-input" id="edit-amount" value="${selectedTx.amount}" required />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Date</label>
                  <input type="date" class="kredo-form-input" id="edit-date" value="${selectedTx.date || ''}" required />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Merchant / Payee</label>
                <input type="text" class="kredo-form-input" id="edit-merchant" value="${selectedTx.merchant}" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Category</label>
                  <select class="kredo-form-select" id="edit-category">
                    ${['Food & Dining', 'Shopping', 'Groceries', 'Bills & Utilities', 'Travel', 'Healthcare', 'Income', 'Entertainment', 'Investment', 'Other'].map(c => `
                      <option value="${c}" ${selectedTx.category === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Payment Method</label>
                  <select class="kredo-form-select" id="edit-method">
                    ${['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'].map(m => `
                      <option value="${m}" ${selectedTx.paymentMethod === m ? 'selected' : ''}>${m}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kredo-outline); display: block; margin-bottom: 4px;">Notes</label>
                <input type="text" class="kredo-form-input" id="edit-notes" value="${selectedTx.notes || ''}" placeholder="Optional notes" />
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

    // Add Card Live Limit Calculation
    const totalLimitInput = this.container.querySelector('#card-total-limit');
    const currentLimitInput = this.container.querySelector('#card-current-limit');
    const usedPreview = this.container.querySelector('#card-preview-used');

    const updateCalcPreview = () => {
      if (totalLimitInput && currentLimitInput && usedPreview) {
        const tot = parseFloat(totalLimitInput.value || '0');
        const cur = parseFloat(currentLimitInput.value || '0');
        const used = Math.max(0, tot - cur);
        const util = tot > 0 ? Math.min(100, Math.round((used / tot) * 100)) : 0;
        usedPreview.innerText = `${formatINR(used)} (${util}% utilization)`;
      }
    };

    totalLimitInput?.addEventListener('input', updateCalcPreview);
    totalLimitInput?.addEventListener('keyup', updateCalcPreview);
    totalLimitInput?.addEventListener('change', updateCalcPreview);
    currentLimitInput?.addEventListener('input', updateCalcPreview);
    currentLimitInput?.addEventListener('keyup', updateCalcPreview);
    currentLimitInput?.addEventListener('change', updateCalcPreview);
    updateCalcPreview(); // Run immediately on mount!

    // Add Card Form Submit
    this.container.querySelector('#kredo-add-card-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bank = this.container.querySelector('#card-bank')?.value || 'HDFC';
      const cardName = this.container.querySelector('#card-name')?.value?.trim();
      const cardNumber = this.container.querySelector('#card-number')?.value?.trim();
      const expiry = this.container.querySelector('#card-expiry')?.value?.trim() || '12/28';
      const cvv = this.container.querySelector('#card-cvv')?.value?.trim() || '•••';
      const cardholderName = this.container.querySelector('#card-holder')?.value?.trim() || 'Maaz Mohammed';
      const totalLimit = parseFloat(this.container.querySelector('#card-total-limit')?.value || '0');
      const currentLimit = parseFloat(this.container.querySelector('#card-current-limit')?.value || String(totalLimit));
      const billDay = parseInt(this.container.querySelector('#card-bill-day')?.value || '15', 10);
      const dueDay = parseInt(this.container.querySelector('#card-due-day')?.value || '5', 10);
      const theme = this.container.querySelector('input[name="card-theme"]:checked')?.value || 'obsidian';

      if (!cardName || !cardNumber || !totalLimit) return;

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

    // Edit Card Form Submit
    this.container.querySelector('#kredo-edit-card-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = this.container.querySelector('#edit-card-id')?.value;
      const cardName = this.container.querySelector('#edit-card-name')?.value?.trim();
      const last4 = this.container.querySelector('#edit-card-last4')?.value?.trim()?.slice(-4);
      const totalLimit = parseFloat(this.container.querySelector('#edit-card-total-limit')?.value || '0');
      const currentLimit = parseFloat(this.container.querySelector('#edit-card-current-limit')?.value || '0');
      const billDay = parseInt(this.container.querySelector('#edit-card-bill-day')?.value || '15', 10);
      const dueDay = parseInt(this.container.querySelector('#edit-card-due-day')?.value || '5', 10);

      if (!id || !cardName || !totalLimit) return;

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

    // Month Selector Dropdown
    this.container.querySelector('#kredo-month-dropdown')?.addEventListener('change', (e) => {
      this.state.selectedMonth = e.target.value;
      this.state.inspectingPoint = null;
      this.render();
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

    // Quick Edit Button
    this.container.querySelectorAll('[data-quick-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tx = this.state.transactions.find(t => t.id === btn.dataset.quickEdit);
        if (tx) this.openModal('edit', tx);
      });
    });

    // Quick Delete Button
    this.container.querySelectorAll('[data-quick-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tx = this.state.transactions.find(t => t.id === btn.dataset.quickDelete);
        if (tx) this.openModal('delete-confirm', tx);
      });
    });

    // Row Click: Show PREVIEW BOX (Pure, clean, structured receipt)
    this.container.querySelectorAll('[data-open-tx]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-toggle-select]') || e.target.closest('.kredo-mini-btn')) return;
        const tx = this.state.transactions.find(t => t.id === row.dataset.openTx);
        if (tx) this.openModal('preview', tx);
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

    // Add Form Submit
    this.container.querySelector('#kredo-add-tx-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(this.container.querySelector('#add-amount')?.value || '0');
      const date = this.container.querySelector('#add-date')?.value || new Date().toISOString().slice(0, 10);
      const merchant = this.container.querySelector('#add-merchant')?.value.trim();
      const type = this.container.querySelector('input[name="add-type"]:checked')?.value || 'debit';
      const paymentMethod = this.container.querySelector('#add-method')?.value || 'UPI';
      const category = this.container.querySelector('#add-category')?.value || 'General';
      const cardLast4 = this.container.querySelector('#add-card-last4')?.value?.trim()?.slice(-4) || '';

      if (!amount || !merchant) return;

      const result = await addKredoTransaction({
        date,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        amount,
        merchant,
        type,
        paymentMethod,
        category,
        cardLast4,
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
      const merchant = this.container.querySelector('#edit-merchant')?.value.trim();
      const category = this.container.querySelector('#edit-category')?.value;
      const paymentMethod = this.container.querySelector('#edit-method')?.value;
      const type = this.container.querySelector('input[name="edit-type"]:checked')?.value || 'debit';
      const notes = this.container.querySelector('#edit-notes')?.value.trim();

      if (!id || !amount || !merchant) return;

      await updateKredoTransaction(id, {
        amount,
        date,
        merchant,
        category,
        paymentMethod,
        type,
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
