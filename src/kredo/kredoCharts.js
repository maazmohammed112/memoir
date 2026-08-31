/**
 * KREDO — Executive Financial Data Visualization & Chart Engine (Power BI / Tableau Style)
 * Pure Vector SVGs, zero external heavy chart libraries, responsive, retina-crisp.
 */

import { formatINR } from './kredoAnalytics.js';

// Executive Color Palette for Financial Categories
export const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Food': '#f97316',
  'Dining': '#ea580c',
  'Groceries': '#10b981',
  'Shopping': '#2563eb',
  'Bills & Utilities': '#8b5cf6',
  'Bills': '#8b5cf6',
  'Utilities': '#7c3aed',
  'Travel': '#06b6d4',
  'Cab / Ride': '#0891b2',
  'Healthcare': '#ec4899',
  'Health': '#db2777',
  'Entertainment': '#f59e0b',
  'Investment': '#6366f1',
  'Tea & Coffee': '#d97706',
  'Tea': '#d97706',
  'Coffee': '#b45309',
  'Income': '#059669',
  'Salary': '#10b981',
  'General': '#64748b',
  'Other': '#94a3b8',
};

export function getCategoryColor(catName = '') {
  const c = String(catName).trim();
  if (CATEGORY_COLORS[c]) return CATEGORY_COLORS[c];
  
  const lower = c.toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key.toLowerCase())) return color;
  }
  
  // Deterministic fallback hash color
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = c.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * 1. INTERACTIVE DONUT / PIE CHART (Category Allocation Portfolio)
 */
export function renderDonutChart(categoryData = [], totalSpend = 0, options = {}) {
  const { size = 240, strokeWidth = 32, activeCategory = null } = options;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (!categoryData || categoryData.length === 0 || totalSpend <= 0) {
    return `
      <div class="kredo-chart-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: var(--kredo-outline); text-align: center; width: 100%;">
        <span class="material-symbols-outlined text-[32px]" style="margin-bottom: 6px; opacity: 0.35; color: var(--kredo-primary);">pie_chart</span>
        <span style="font-size: 13px; font-weight: 700; color: var(--kredo-secondary);">No Outflows In This Filter</span>
        <span style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 2px;">Try selecting "All Time" or switching streams above</span>
      </div>
    `;
  }

  let accumulatedOffset = 0;
  const slices = categoryData.map((item) => {
    const fraction = item.amount / totalSpend;
    const strokeDash = fraction * circumference;
    const strokeOffset = -accumulatedOffset;
    accumulatedOffset += strokeDash;
    const color = getCategoryColor(item.category);
    const isSelected = activeCategory === item.category;

    return `
      <circle
        class="kredo-donut-slice ${isSelected ? 'active-slice' : ''}"
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="transparent"
        stroke="${color}"
        stroke-width="${isSelected ? strokeWidth + 6 : strokeWidth}"
        stroke-dasharray="${strokeDash} ${circumference - strokeDash}"
        stroke-dashoffset="${strokeOffset}"
        data-cat-slice="${encodeURIComponent(item.category)}"
        data-cat-name="${item.category}"
        data-cat-amount="${item.amount}"
        data-cat-percent="${item.percentage}"
        data-cat-count="${item.count || 0}"
        style="transform-origin: center; transform: rotate(-90deg); transition: stroke-width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease; cursor: pointer; opacity: ${activeCategory && !isSelected ? '0.35' : '1'};"
      >
        <title>${item.category}: ${formatINR(item.amount)} (${item.percentage}% of total)</title>
      </circle>
    `;
  }).join('');

  return `
    <div class="kredo-donut-container" style="position: relative; width: 100%; max-width: ${size}px; height: auto; aspect-ratio: 1; margin: 0 auto;">
      <svg width="100%" height="100%" viewBox="0 0 ${size} ${size}" style="overflow: visible; display: block;">
        <!-- Background track -->
        <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="var(--kredo-surface-container)" stroke-width="${strokeWidth}" />
        <!-- Slices -->
        ${slices}
      </svg>
      <!-- Center Donut KPI Telemetry (Live updates on hover/click) -->
      <div class="kredo-donut-center" id="donut-center-box" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; padding: 12px;">
        <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--kredo-outline); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" id="donut-center-label">${activeCategory ? activeCategory : 'Total Outflow'}</span>
        <strong style="font-size: 17px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-secondary);" id="donut-center-val">${formatINR(activeCategory ? (categoryData.find(c => c.category === activeCategory)?.amount || totalSpend) : totalSpend)}</strong>
        <span style="font-size: 10.5px; color: var(--kredo-primary); font-weight: 700;" id="donut-center-sub">${activeCategory ? `${categoryData.find(c => c.category === activeCategory)?.percentage || 0}% of spend` : `${categoryData.length} Categories`}</span>
      </div>
    </div>
  `;
}

/**
 * Interactive Category Legend Component with Clickable Filters
 */
export function renderCategoryLegend(categoryData = [], activeCategory = null) {
  if (!categoryData || categoryData.length === 0) return '';

  return `
    <div class="kredo-cat-legend-grid">
      ${categoryData.map(item => {
        const color = getCategoryColor(item.category);
        const isActive = activeCategory === item.category;
        return `
          <button
            type="button"
            class="kredo-cat-legend-item ${isActive ? 'active' : ''}"
            data-filter-cat="${encodeURIComponent(item.category)}"
            title="Click to isolate ${item.category} analytics"
            style="border-color: ${isActive ? color : 'var(--kredo-outline-variant)'}; background: ${isActive ? `${color}14` : 'var(--kredo-surface-container-low)'};"
          >
            <div style="display: flex; align-items: center; gap: 7px; min-width: 0; flex: 1;">
              <span class="kredo-legend-color-dot" style="background-color: ${color}; box-shadow: 0 0 6px ${color}60;"></span>
              <span class="kredo-legend-cat-name" style="font-size: 12px; font-weight: 600; color: var(--kredo-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.category}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
              <span class="kredo-legend-pct-badge" style="background: ${color}20; color: ${color}; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px; font-family: var(--kredo-mono);">${item.percentage}%</span>
              <span class="kredo-legend-amount" style="font-size: 11.5px; font-family: var(--kredo-mono); font-weight: 700; color: var(--kredo-secondary);">${formatINR(item.amount)}</span>
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * 2. DUAL CASHFLOW VELOCITY BAR CHART (Inflows vs Outflows Periodic Comparison)
 */
export function renderVelocityBarChart(periods = [], options = {}) {
  const { width = 500, height = 210, activePeriod = null } = options;
  if (!periods || periods.length === 0) {
    return `
      <div class="kredo-chart-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: var(--kredo-outline); font-size: 13px; text-align: center; width: 100%;">
        <span class="material-symbols-outlined text-[30px]" style="margin-bottom: 6px; opacity: 0.35; color: var(--kredo-primary);">bar_chart</span>
        <span style="font-size: 13px; font-weight: 700; color: var(--kredo-secondary);">No Velocity Recorded</span>
        <span style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 2px;">Transactions in this window will display periodic cashflow comparisons</span>
      </div>
    `;
  }

  const maxVal = Math.max(...periods.map(p => Math.max(p.debits || 0, p.credits || 0)), 1000);
  const paddingLeft = 46;
  const paddingRight = 12;
  const paddingTop = 20;
  const paddingBottom = 32;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const barGroupWidth = chartW / periods.length;
  const barWidth = Math.max(4, Math.min(18, (barGroupWidth - 6) / 2));

  // Y-axis gridlines & ticks
  const yTicks = [0, 0.5, 1].map(frac => {
    const yVal = Math.round(maxVal * frac);
    const yPos = paddingTop + chartH - (frac * chartH);
    return `
      <g>
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="var(--kredo-outline-variant)" stroke-dasharray="3,3" stroke-width="1" opacity="0.6" />
        <text x="${paddingLeft - 6}" y="${yPos + 3.5}" text-anchor="end" font-size="9" fill="var(--kredo-outline)" font-family="var(--kredo-mono)">₹${yVal >= 100000 ? `${(yVal/100000).toFixed(1)}L` : (yVal >= 1000 ? `${Math.round(yVal/1000)}k` : yVal)}</text>
      </g>
    `;
  }).join('');

  // Bars and X-labels
  const bars = periods.map((p, idx) => {
    const groupX = paddingLeft + (idx * barGroupWidth) + (barGroupWidth / 2);
    const isSelected = activePeriod === (p.dateKey || p.label);
    
    // Outflow Bar (Debit)
    const debitFrac = (p.debits || 0) / maxVal;
    const debitH = Math.max(debitFrac * chartH, (p.debits > 0 ? 3 : 0));
    const debitY = paddingTop + chartH - debitH;
    const debitX = groupX - barWidth - 1;

    // Inflow Bar (Credit)
    const creditFrac = (p.credits || 0) / maxVal;
    const creditH = Math.max(creditFrac * chartH, (p.credits > 0 ? 3 : 0));
    const creditY = paddingTop + chartH - creditH;
    const creditX = groupX + 1;

    const label = p.label || p.dateKey || `P${idx+1}`;

    return `
      <g class="kredo-bar-group ${isSelected ? 'selected' : ''}" data-period-label="${label}" data-debit="${p.debits || 0}" data-credit="${p.credits || 0}" style="cursor: pointer;">
        <!-- Outflow Bar -->
        ${p.debits > 0 ? `
          <rect
            x="${debitX}"
            y="${debitY}"
            width="${barWidth}"
            height="${debitH}"
            rx="2.5"
            fill="var(--kredo-secondary)"
            style="transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);"
          >
            <title>Outflow: ${formatINR(p.debits || 0)} (${label})</title>
          </rect>
        ` : ''}
        <!-- Inflow Bar -->
        ${p.credits > 0 ? `
          <rect
            x="${creditX}"
            y="${creditY}"
            width="${barWidth}"
            height="${creditH}"
            rx="2.5"
            fill="var(--kredo-green)"
            style="transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);"
          >
            <title>Inflow: ${formatINR(p.credits || 0)} (${label})</title>
          </rect>
        ` : ''}
        <!-- Invisible Hit Target for Tooltip / Click -->
        <rect
          x="${groupX - barWidth - 4}"
          y="${paddingTop}"
          width="${barWidth * 2 + 8}"
          height="${chartH + 10}"
          fill="transparent"
        >
          <title>${label}: Outflow ${formatINR(p.debits || 0)} | Inflow ${formatINR(p.credits || 0)}</title>
        </rect>
        <!-- X-Axis Label -->
        <text
          x="${groupX}"
          y="${height - 10}"
          text-anchor="middle"
          font-size="9"
          font-weight="600"
          fill="var(--kredo-outline)"
        >${label.length > 8 ? label.slice(5) : label}</text>
      </g>
    `;
  }).join('');

  return `
    <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box;" class="kredo-scroll-area">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto; max-width: 100%; display: block; overflow: visible;">
        ${yTicks}
        ${bars}
      </svg>
    </div>
  `;
}

/**
 * 3. CUMULATIVE LIQUIDITY & BURN CURVE (Smooth Bezier Line with Area Fill)
 */
export function renderCumulativeLineChart(trendPoints = [], options = {}) {
  const { width = 500, height = 190 } = options;
  if (!trendPoints || trendPoints.length === 0) {
    return `
      <div class="kredo-chart-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: var(--kredo-outline); font-size: 13px; text-align: center; width: 100%;">
        <span class="material-symbols-outlined text-[30px]" style="margin-bottom: 6px; opacity: 0.35; color: var(--kredo-primary);">show_chart</span>
        <span style="font-size: 13px; font-weight: 700; color: var(--kredo-secondary);">No Trajectory Recorded</span>
        <span style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 2px;">Cumulative spending curve will appear when outflow transactions exist</span>
      </div>
    `;
  }

  const paddingLeft = 46;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxCumulative = Math.max(...trendPoints.map(t => t.cumulative), 1000);
  const minCumulative = 0;

  // Compute coordinates for bezier curve
  const coords = trendPoints.map((pt, i) => {
    const x = paddingLeft + (i / Math.max(trendPoints.length - 1, 1)) * chartW;
    const frac = (pt.cumulative - minCumulative) / (maxCumulative - minCumulative || 1);
    const y = paddingTop + chartH - (frac * chartH);
    return { x, y, pt };
  });

  // Generate smooth SVG cubic bezier path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  // Area path
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartH} L ${coords[0].x} ${paddingTop + chartH} Z`;

  // Gridlines
  const yTicks = [0, 0.5, 1].map(frac => {
    const val = Math.round(maxCumulative * frac);
    const yPos = paddingTop + chartH - (frac * chartH);
    return `
      <g>
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="var(--kredo-outline-variant)" stroke-dasharray="3,3" stroke-width="1" opacity="0.6" />
        <text x="${paddingLeft - 6}" y="${yPos + 3.5}" text-anchor="end" font-size="9" fill="var(--kredo-outline)" font-family="var(--kredo-mono)">₹${val >= 100000 ? `${(val/100000).toFixed(1)}L` : (val >= 1000 ? `${Math.round(val/1000)}k` : val)}</text>
      </g>
    `;
  }).join('');

  // Interactive Data Points
  const dots = coords.map((c) => `
    <g class="kredo-trend-dot" style="cursor: pointer;">
      <circle cx="${c.x}" cy="${c.y}" r="3" fill="#ffffff" stroke="var(--kredo-primary)" stroke-width="2" />
      <circle cx="${c.x}" cy="${c.y}" r="10" fill="transparent" />
      <title>${c.pt.label || c.pt.date}: Cumulative Outflow ${formatINR(c.pt.cumulative)} (Daily: ${formatINR(c.pt.dailyDebit || 0)})</title>
    </g>
  `).join('');

  return `
    <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box;" class="kredo-scroll-area">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto; max-width: 100%; display: block; overflow: visible;">
        <defs>
          <linearGradient id="kredoCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--kredo-primary)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--kredo-primary)" stop-opacity="0.01" />
          </linearGradient>
        </defs>
        ${yTicks}
        <!-- Area fill -->
        <path d="${areaD}" fill="url(#kredoCurveGradient)" />
        <!-- Stroke Line -->
        <path d="${pathD}" fill="none" stroke="var(--kredo-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Data Dots -->
        ${dots}
      </svg>
    </div>
  `;
}

/**
 * 4. POWER BI HORIZONTAL PROGRESS RANKING BARS (Top Merchants / Payment Channels)
 */
export function renderHorizontalBarRanking(items = [], options = {}) {
  const { total = 0, maxItems = 6 } = options;
  if (!items || items.length === 0) {
    return `
      <div style="padding: 28px 16px; text-align: center; color: var(--kredo-outline); font-size: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <span class="material-symbols-outlined text-[28px]" style="opacity: 0.35; margin-bottom: 4px; color: var(--kredo-primary);">storefront</span>
        <span style="font-weight: 700; color: var(--kredo-secondary);">No Merchant Rankings</span>
        <span style="font-size: 11.5px; color: var(--kredo-outline); margin-top: 2px;">Payee rankings will appear when expense data is present</span>
      </div>
    `;
  }

  const list = items.slice(0, maxItems);
  const maxAmount = Math.max(...list.map(i => i.amount || 0), 1);

  return `
    <div class="kredo-ranking-list" style="display: flex; flex-direction: column; gap: 8px;">
      ${list.map((item, idx) => {
        const pct = total > 0 ? Math.round((item.amount / total) * 100) : Math.round((item.amount / maxAmount) * 100);
        const barWidth = Math.max(3, Math.min(100, Math.round((item.amount / maxAmount) * 100)));
        const color = getCategoryColor(item.category || item.name || 'General');

        return `
          <div class="kredo-ranking-row" style="display: flex; flex-direction: column; gap: 4px; background: var(--kredo-surface-container-low); border: 1px solid var(--kredo-outline-variant); border-radius: 10px; padding: 9px 12px; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;">
                <span style="font-size: 10.5px; font-weight: 800; font-family: var(--kredo-mono); color: var(--kredo-outline); width: 16px; flex-shrink: 0;">#${idx + 1}</span>
                <strong style="font-size: 12.5px; color: var(--kredo-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;">${item.merchant || item.name || item.method}</strong>
                ${item.category ? `<span style="font-size: 9.5px; background: ${color}15; color: ${color}; padding: 1px 5px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">${item.category}</span>` : ''}
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <strong style="font-size: 12.5px; font-family: var(--kredo-mono); color: var(--kredo-secondary);">${formatINR(item.amount)}</strong>
                <span style="font-size: 10px; color: var(--kredo-outline); margin-left: 3px;">(${pct}%)</span>
              </div>
            </div>
            <div style="height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${barWidth}%; background: ${color}; border-radius: 2px; transition: width 0.3s ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
