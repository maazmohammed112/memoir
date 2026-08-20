import './styles.css';
import './brand.css';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import ArrowLeft from 'lucide/dist/esm/icons/arrow-left.mjs';
import ArrowUp from 'lucide/dist/esm/icons/arrow-up.mjs';
import ArrowUpRight from 'lucide/dist/esm/icons/arrow-up-right.mjs';
import AlarmClock from 'lucide/dist/esm/icons/alarm-clock.mjs';
import BadgeCheck from 'lucide/dist/esm/icons/badge-check.mjs';
import BellRing from 'lucide/dist/esm/icons/bell-ring.mjs';
import CakeSlice from 'lucide/dist/esm/icons/cake-slice.mjs';
import Check from 'lucide/dist/esm/icons/check.mjs';
import CircleCheckBig from 'lucide/dist/esm/icons/circle-check-big.mjs';
import CirclePause from 'lucide/dist/esm/icons/circle-pause.mjs';
import CirclePlay from 'lucide/dist/esm/icons/circle-play.mjs';
import ChevronRight from 'lucide/dist/esm/icons/chevron-right.mjs';
import Circle from 'lucide/dist/esm/icons/circle.mjs';
import Clipboard from 'lucide/dist/esm/icons/clipboard.mjs';
import ClipboardPaste from 'lucide/dist/esm/icons/clipboard-paste.mjs';
import Copy from 'lucide/dist/esm/icons/copy.mjs';
import Ellipsis from 'lucide/dist/esm/icons/ellipsis.mjs';
import Eraser from 'lucide/dist/esm/icons/eraser.mjs';
import Eye from 'lucide/dist/esm/icons/eye.mjs';
import EyeOff from 'lucide/dist/esm/icons/eye-off.mjs';
import Gem from 'lucide/dist/esm/icons/gem.mjs';
import House from 'lucide/dist/esm/icons/house.mjs';
import KeyRound from 'lucide/dist/esm/icons/key-round.mjs';
import Landmark from 'lucide/dist/esm/icons/landmark.mjs';
import LockKeyhole from 'lucide/dist/esm/icons/lock-keyhole.mjs';
import LogOut from 'lucide/dist/esm/icons/log-out.mjs';
import Moon from 'lucide/dist/esm/icons/moon.mjs';
import NotebookText from 'lucide/dist/esm/icons/notebook-text.mjs';
import Pencil from 'lucide/dist/esm/icons/pencil.mjs';
import Plus from 'lucide/dist/esm/icons/plus.mjs';
import Search from 'lucide/dist/esm/icons/search.mjs';
import ShieldCheck from 'lucide/dist/esm/icons/shield-check.mjs';
import Sun from 'lucide/dist/esm/icons/sun.mjs';
import Trash2 from 'lucide/dist/esm/icons/trash-2.mjs';
import WandSparkles from 'lucide/dist/esm/icons/wand-sparkles.mjs';
import Wifi from 'lucide/dist/esm/icons/wifi.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';
import { vaultStore } from './store.js';

const nav = [
  ['home', 'House', 'Home'], ['vault', 'Gem', 'Memories'], ['assistant', 'Rhino', 'Rhinous'],
  ['reminders', 'AlarmClock', 'Reminders'], ['clipboard', 'Clipboard', 'Clipboard'], ['birthdays', 'CakeSlice', 'Birthdays'],
];
const typeIcons = { Login: 'KeyRound', Finance: 'Landmark', Identity: 'BadgeCheck', Personal: 'NotebookText', Birthday: 'CakeSlice', Reminder: 'AlarmClock', Notification: 'BellRing', 'Wi-Fi': 'Wifi', Clipboard: 'Clipboard' };
const iconSet = { AlarmClock, ArrowLeft, ArrowUp, ArrowUpRight, BadgeCheck, BellRing, CakeSlice, Check, ChevronRight, Circle, CircleCheckBig, CirclePause, CirclePlay, Clipboard, ClipboardPaste, Copy, Ellipsis, Eraser, Eye, EyeOff, Gem, House, KeyRound, Landmark, LockKeyhole, LogOut, Moon, NotebookText, Pencil, Plus, Search, ShieldCheck, Sun, Trash2, WandSparkles, Wifi, X };
const fieldMap = {
  Login: ['Username / ID', 'Password'], Finance: ['Account number', 'IFSC code', 'Debit card number', 'Expiry', 'CVV', 'ATM PIN'],
  Identity: ['Document number', 'Expiry'], Personal: ['Value'], Birthday: ['Date', 'Relation', 'Gift idea', 'Wish note'], 'Wi-Fi': ['Network', 'Password'],
  Reminder: ['Due at', 'Status', 'Snoozed'],
};
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const toastNode = document.querySelector('#toast');
const state = {
  view: 'home', items: [], status: 'loading', hidden: true, dark: localStorage.getItem('memoir-theme') === 'dark',
  provider: localStorage.getItem('memoir-provider') || 'gemini', query: '', messages: [], assistantLog: loadAssistantLog(), chatLoading: false, reminderTab: 'upcoming', telegramSyncing: false,
  auth: { status: 'checking', email: 'maaz@memo.com', message: '' }, authError: '',
};

marked.setOptions({ gfm: true, breaks: true });
document.body.classList.toggle('dark', state.dark);

function icon(name, className = '') {
  const item = iconSet[name] || Circle;
  const nodes = item.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([key]) => key !== 'key').map(([key, value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${String(value).replace(/"/g, '&quot;')}"`).join(' ')}/>`).join('');
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
}
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function toast(text) { toastNode.textContent = text; toastNode.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => toastNode.classList.remove('show'), 1900); }
let activityDepth = 0;
async function withRhinoActivity(label, task) {
  const started = Date.now(); activityDepth += 1; let node = document.querySelector('#rhino-activity');
  if (!node) { node = document.createElement('div'); node.id = 'rhino-activity'; node.className = 'rhino-activity'; node.innerHTML = `<span><img src="/brand/memoir-rhino-ui.png" alt=""></span><strong></strong><i></i>`; document.body.appendChild(node); }
  node.querySelector('strong').textContent = label; requestAnimationFrame(() => node.classList.add('show'));
  try { return await task(); }
  finally { await new Promise(resolve => setTimeout(resolve, Math.max(0, 320 - (Date.now() - started)))); activityDepth = Math.max(0, activityDepth - 1); if (!activityDepth) { node.classList.remove('show'); setTimeout(() => { if (!activityDepth) node.remove(); }, 220); } }
}
function titleForView() { return { home: 'Good morning, Maaz', vault: 'Your memories', assistant: 'Ask Rhinous', reminders: 'Your reminders', clipboard: 'Clipboard vault', birthdays: 'Meaningful moments' }[state.view]; }
function category(item) { return item.kind === 'clipboard' ? 'Clipboard' : item.type || 'Personal'; }
function itemIcon(item) { return typeIcons[category(item)] || 'Gem'; }
function allFields(item) { return item.fields || {}; }
function searchable(item) { return [item.title, item.note, category(item), ...Object.keys(allFields(item)), ...Object.values(allFields(item))].join(' ').toLowerCase(); }
function parseBirthday(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '')); if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(year || 2000, month, 0).getDate()) return null;
  return { year, month, day, hasYear: year > 0 };
}
function birthdayAt(year, parts) { return new Date(year, parts.month - 1, Math.min(parts.day, new Date(year, parts.month, 0).getDate())); }
function nextBirthday(item, now = new Date()) {
  const parts = parseBirthday(item?.fields?.Date); if (!parts) return null; const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let occurrence = birthdayAt(today.getFullYear(), parts); if (occurrence < today) occurrence = birthdayAt(today.getFullYear() + 1, parts);
  return { ...parts, occurrence, daysAway: Math.round((occurrence - today) / 86400000) };
}
function formatDate(value) {
  const parts = parseBirthday(value); if (!parts) return 'No valid date';
  const label = birthdayAt(parts.hasYear ? parts.year : 2000, parts).toLocaleDateString(undefined, { day: 'numeric', month: 'long', ...(parts.hasYear ? { year: 'numeric' } : {}) });
  return parts.hasYear ? label : `${label} · Birth year not added`;
}
function currentAge(item, now = new Date()) {
  const parts = parseBirthday(item?.fields?.Date); if (!parts?.hasYear) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const birth = birthdayAt(parts.year, parts); if (birth > today) return null;
  let years = today.getFullYear() - parts.year; let months = today.getMonth() - (parts.month - 1); let days = today.getDate() - parts.day;
  if (days < 0) { months -= 1; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  return { years, months, days };
}
function currentAgeText(item) { const age = currentAge(item); return age ? `${age.years} year${age.years === 1 ? '' : 's'}, ${age.months} month${age.months === 1 ? '' : 's'}, ${age.days} day${age.days === 1 ? '' : 's'}` : 'Age unavailable — birth year not added'; }
function nextBirthdayAge(item) { const next = nextBirthday(item); return next?.hasYear ? next.occurrence.getFullYear() - next.year : null; }
const reminderOffsets = [24 * 3600000, 5 * 3600000, 3 * 3600000, 2 * 3600000, 30 * 60000, 10 * 60000, 0];
function reminderDue(item) { const explicit = Number(item?.fields?.['Due timestamp']); const parsed = new Date(item?.fields?.['Due at'] || '').getTime(); return Number.isFinite(explicit) && explicit > 0 ? explicit : parsed; }
function reminderIsSnoozed(item) { return /^(yes|true|snoozed)$/i.test(String(item?.fields?.Snoozed || '')); }
function reminderRepeat(item) { const value = String(item?.fields?.Repeat || 'none').toLowerCase(); return ['daily', 'weekly', 'monthly', 'yearly'].includes(value) ? value : 'none'; }
function advanceRecurringDue(timestamp, repeat, after = Date.now()) {
  if (!Number.isFinite(Number(timestamp)) || repeat === 'none') return 0; let next = new Date(Number(timestamp)); const originalDay = next.getDate();
  const advance = () => {
    if (repeat === 'daily') next.setDate(next.getDate() + 1);
    else if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') { const month = next.getMonth() + 1; next = new Date(next.getFullYear(), month, Math.min(originalDay, new Date(next.getFullYear(), month + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
    else if (repeat === 'yearly') { const year = next.getFullYear() + 1; next = new Date(year, next.getMonth(), Math.min(originalDay, new Date(year, next.getMonth() + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
  };
  do advance(); while (next.getTime() <= after); return next.getTime();
}
function reminderStatus(item, now = Date.now()) {
  const due = reminderDue(item); const stored = String(item?.fields?.Status || '').toLowerCase(); const completion = String(item?.fields?.Completion || '').toLowerCase();
  if (stored === 'completed') return completion === 'no-response' ? 'no-response' : 'completed';
  if (Number.isFinite(due) && now >= due + 12 * 3600000) return 'no-response';
  if (Number.isFinite(due) && now > due) return 'overdue';
  return 'upcoming';
}
function formatDue(item) { const due = reminderDue(item); return Number.isFinite(due) ? new Date(due).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Due time needed'; }
function dueDistance(item) {
  const due = reminderDue(item); if (!Number.isFinite(due)) return 'No valid due time'; const delta = due - Date.now(); const abs = Math.abs(delta);
  const [value, unit] = abs >= 86400000 ? [Math.round(delta / 86400000), 'day'] : abs >= 3600000 ? [Math.round(delta / 3600000), 'hour'] : [Math.max(delta < 0 ? -1 : 1, Math.round(delta / 60000)), 'minute'];
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(value, unit);
}
function liveCountdownText(timestamp) {
  const due = Number(timestamp); if (!Number.isFinite(due)) return 'Due time needed'; const delta = due - Date.now(); const overdue = delta < 0; let remaining = Math.abs(delta);
  const days = Math.floor(remaining / 86400000); remaining %= 86400000; const hours = Math.floor(remaining / 3600000); remaining %= 3600000; const minutes = Math.floor(remaining / 60000); const seconds = Math.floor((remaining % 60000) / 1000);
  const parts = []; if (days) parts.push(`${days}d`); if (days || hours) parts.push(`${hours}h`); parts.push(`${minutes}m`); if (!days) parts.push(`${seconds}s`);
  return overdue ? `Overdue by ${parts.join(' ')}` : `${parts.join(' ')} left`;
}
function updateReminderCountdowns() { document.querySelectorAll('[data-reminder-countdown]').forEach(node => { node.textContent = node.dataset.reminderCountdown ? `${node.dataset.prefix || ''}${liveCountdownText(node.dataset.reminderCountdown)}` : 'Due time needed'; }); }
function reminderNotificationCount(item) { const due = reminderDue(item); const earliest = Math.max(Number(item.createdAt || Date.now()), Date.now()); return Number.isFinite(due) ? reminderOffsets.filter(offset => due - offset >= earliest).length : 0; }
function localDateTimeValue(timestamp = Date.now() + 3600000) { const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000); return date.toISOString().slice(0, 16); }
function notificationCenterData(now = Date.now()) {
  const upcoming = [];
  reminders().filter(item => !reminderIsSnoozed(item) && !['completed', 'no-response'].includes(reminderStatus(item))).forEach(item => {
    const due = reminderDue(item); if (!Number.isFinite(due)) return;
    [[24 * 3600000, '1 day before'], [5 * 3600000, '5 hours before'], [3 * 3600000, '3 hours before'], [2 * 3600000, '2 hours before'], [30 * 60000, '30 minutes before'], [10 * 60000, '10 minutes before'], [0, 'At due time']].forEach(([offset, label]) => {
      const scheduledAt = due - offset; if (scheduledAt >= now && scheduledAt >= Number(item.createdAt || 0)) upcoming.push({ id: `reminder:${item.id}:${due}:${offset}`, category: 'Reminder', title: item.title, scheduledAt, label });
    });
  });
  memories().filter(item => item.type === 'Birthday').forEach(item => {
    const next = nextBirthday(item, new Date(now)); if (!next) return; const due = next.occurrence.getTime();
    [[48 * 3600000, '2 days before'], [24 * 3600000, '1 day before'], [5 * 3600000, '5 hours before'], [2 * 3600000, '2 hours before'], [0, 'At midnight']].forEach(([offset, label]) => { const scheduledAt = due - offset; if (scheduledAt >= now) upcoming.push({ id: `birthday:${item.id}:${due}:${offset}`, category: 'Birthday', title: item.title, scheduledAt, label }); });
  });
  upcoming.sort((a, b) => a.scheduledAt - b.scheduledAt);
  const sent = notificationRecords().filter(item => { const sentAt = Number(item.fields?.['Sent at'] || 0); return sentAt && now - sentAt <= 14 * 3600000; }).sort((a, b) => Number(b.fields?.['Sent at']) - Number(a.fields?.['Sent at']));
  return { upcoming, sent };
}
function notificationTime(timestamp) { return new Date(Number(timestamp)).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
function notificationRows(rows, sent = false) {
  return rows.map(row => { const category = sent ? row.fields?.Category || 'Reminder' : row.category; const timestamp = sent ? row.fields?.['Sent at'] : row.scheduledAt; return `<article class="notification-row"><span class="notification-kind ${String(category).toLowerCase()}">${icon(category === 'Birthday' ? 'CakeSlice' : 'AlarmClock')}</span><div><strong>${escapeHtml(row.title)}</strong><small>${sent ? 'Sent to Telegram' : escapeHtml(row.label)} · ${notificationTime(timestamp)}</small></div><span class="notification-status ${sent ? 'sent' : ''}">${sent ? 'Sent' : 'Upcoming'}</span></article>`; }).join('');
}
function notificationCenterMarkup() {
  const { upcoming, sent } = notificationCenterData(); const reminderUpcoming = upcoming.filter(item => item.category === 'Reminder'); const birthdayUpcoming = upcoming.filter(item => item.category === 'Birthday');
  const section = (title, rows, isSent = false) => `<section class="notification-section"><div class="notification-section-head"><strong>${title}</strong><span>${rows.length}</span></div>${rows.length ? notificationRows(rows, isSent) : `<p class="notification-empty">Nothing here right now.</p>`}</section>`;
  return `<div class="notification-head"><div><p class="eyebrow">Telegram delivery center</p><h2>Notifications</h2></div><button class="modal-close" id="close-notifications">${icon('X')}</button></div><p class="notification-note">Upcoming delivery windows appear automatically. Sent entries stay for 14 hours, then are securely removed from the vault.</p>${section('Upcoming reminders', reminderUpcoming)}${section('Upcoming birthdays', birthdayUpcoming)}${section('Sent in the last 14 hours', sent, true)}`;
}
function toggleNotificationCenter(force) {
  let popover = document.querySelector('.notification-popover'); const shouldOpen = force ?? !popover;
  if (!shouldOpen) { popover?.remove(); return; }
  if (!popover) { popover = document.createElement('aside'); popover.className = 'notification-popover'; document.body.appendChild(popover); }
  popover.innerHTML = notificationCenterMarkup(); popover.querySelector('#close-notifications').onclick = () => popover.remove();
}
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge'); if (!badge) return; const { upcoming, sent } = notificationCenterData(); const count = upcoming.length + sent.length; badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = count === 0;
  if (document.querySelector('.notification-popover')) toggleNotificationCenter(true);
}
function syncLabel() { return state.status === 'synced' ? 'Synced' : state.status === 'connecting' ? 'Syncing' : state.status === 'loading' ? 'Opening' : 'Offline ready'; }
function updateSyncUi() { const pill = document.querySelector('.sync-pill'); if (pill) pill.innerHTML = `<i class="sync-dot ${state.status === 'synced' ? '' : 'offline'}"></i>${syncLabel()}`; }
function navHtml() { return nav.map(([id, glyph, label]) => `<button class="nav-btn ${state.view === id ? 'active' : ''}" data-view="${id}">${glyph === 'Rhino' ? '<img class="nav-rhino" src="/brand/memoir-rhino-ui.png" alt="">' : icon(glyph)}<span>${label}</span></button>`).join(''); }

function shell() {
  if (state.auth.status !== 'signedIn') { renderAuthGate(); return; }
  document.body.classList.remove('auth-locked');
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <button class="brand" data-view="home"><span class="brand-mark"><img src="/brand/pwa-192.png" alt=""></span><span>memoir</span></button>
      <nav class="nav">${navHtml()}</nav>
      <div class="secure-note"><span class="icon-wrap">${icon('ShieldCheck')}</span><strong>Private by design</strong><p>Values are encrypted before cloud sync. AI sees only your vault structure.</p></div>
      <button class="profile" data-logout title="Sign out"><span class="avatar">MM</span><span><strong>Maaz</strong><small>Sign out securely</small></span>${icon('LogOut')}</button>
    </aside>
    <main class="content">
      <header class="topbar">
        <div class="topbar-copy"><span class="mobile-brand-icon"><img src="/brand/pwa-192.png" alt="Memoir"></span><div><p class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${titleForView()}</h1></div></div>
        <div class="top-actions">
          <div class="global-search"><span>${icon('Search')}</span><input id="global-search" placeholder="Search everything…" autocomplete="off"><span class="key-hint">⌘ K</span></div>
          <span class="sync-pill"><i class="sync-dot ${state.status === 'synced' ? '' : 'offline'}"></i>${syncLabel()}</span>
          <button class="round-btn mobile-search" id="mobile-search-button" title="Search everything">${icon('Search')}</button>
          <button class="round-btn notification-trigger" id="notification-center" title="Notifications" aria-label="Notifications">${icon('BellRing')}<span class="notification-badge" hidden></span></button>
          <button class="round-btn" id="privacy" title="${state.hidden ? 'Reveal values' : 'Hide values'}">${icon(state.hidden ? 'EyeOff' : 'Eye')}</button>
          <button class="round-btn" id="theme" title="Change theme">${icon(state.dark ? 'Sun' : 'Moon')}</button>
          <button class="round-btn mobile-logout" data-logout title="Sign out">${icon('LogOut')}</button>
          <span class="avatar desktop-avatar">MM</span>
        </div>
      </header>
      <section class="view" id="view">${state.status === 'loading' || (state.status === 'connecting' && !state.items.length) ? skeleton() : currentView()}</section>
    </main>
    <nav class="mobile-nav">${navHtml()}</nav>
  </div>`;
  bindShell();
}

function renderAuthGate() {
  if (modal.open) modal.close();
  document.body.classList.add('auth-locked');
  const checking = state.auth.status === 'checking'; const signingIn = state.auth.status === 'signingIn';
  app.innerHTML = `<main class="auth-shell"><section class="auth-card ${checking ? 'auth-checking' : ''}"><div class="auth-brand"><img src="/brand/memoir-rhino-ui.png" alt="Memoir rhino"><span>memoir</span></div>${checking ? `<div class="auth-loader"><span class="auth-pulse"><img src="/brand/memoir-rhino-ui.png" alt=""></span><p>Securing your private vault…</p></div>` : `<div class="auth-copy"><p class="eyebrow">Owner access only</p><h1>Welcome back, Maaz.</h1><p>${escapeHtml(state.auth.message || 'To continue using your private vault, enter your approved email and password.')}</p></div><form class="auth-form" id="auth-form"><label>Email address<input id="auth-email" type="email" autocomplete="username" required value="${escapeHtml(state.auth.email || 'maaz@memo.com')}" spellcheck="false"></label><label>Password<div class="password-control"><input id="auth-password" type="password" autocomplete="current-password" required autofocus><button type="button" id="toggle-auth-password" aria-label="Show password">${icon('Eye')}</button></div></label>${state.authError ? `<div class="auth-error" role="alert">${icon('Circle')}<span>${escapeHtml(state.authError)}</span></div>` : ''}<button class="primary auth-submit" ${signingIn ? 'disabled' : ''}>${signingIn ? '<span class="button-spinner"></span> Verifying…' : `${icon('LockKeyhole')} Sign in securely`}</button></form><div class="auth-trust">${icon('ShieldCheck')}<span>Only the approved Firebase owner can enter. Every session automatically ends after 48 hours.</span></div>`}</section><aside class="auth-visual"><img src="/brand/memoir-rhino-ui.png" alt=""><p class="eyebrow">Private by design</p><h2>Your memory.<br>Your control.</h2><p>Encrypted locally, owner-locked in Firebase, and protected from unauthenticated access.</p></aside></main>`;
  if (!checking) bindAuthGate();
}

function bindAuthGate() {
  document.querySelector('#toggle-auth-password')?.addEventListener('click', event => { const input = document.querySelector('#auth-password'); const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; event.currentTarget.innerHTML = icon(reveal ? 'EyeOff' : 'Eye'); event.currentTarget.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password'); });
  document.querySelector('#auth-form')?.addEventListener('submit', async event => {
    event.preventDefault(); state.authError = '';
    const email = document.querySelector('#auth-email').value.trim(); const password = document.querySelector('#auth-password').value;
    try { await vaultStore.signIn(email, password); }
    catch (error) {
      state.authError = error?.code === 'auth/unauthorized-owner' ? 'This account is not approved for this vault.' : error?.code === 'vault/key-unlock-failed' ? 'Your Firebase password is correct, but it does not match the password used to secure the shared vault key.' : error?.code === 'vault/first-unlock-offline' ? 'Connect to the internet for this device’s first secure unlock.' : /permission-denied/i.test(error?.code || '') ? 'Your password was accepted, but Firestore blocked the owner vault setup. Publish the supplied owner rules and try again.' : /invalid-credential|wrong-password|user-not-found|invalid-email/i.test(error?.code || '') ? 'The email or password is incorrect. Please enter the approved credentials.' : /network-request-failed/i.test(error?.code || '') ? 'Memoir could not reach Firebase. Check your connection and try again.' : 'The password was accepted, but the encrypted vault could not be opened. Please try once more.';
      shell();
    }
  });
}

function skeleton() { return `<section class="vault-opening"><div class="vault-opening-head"><span class="vault-opening-mark"><img src="/brand/memoir-rhino-ui.png" alt=""></span><div><p class="eyebrow">Encrypted cloud vault</p><h2>Loading your memories…</h2><p>Downloading and decrypting this owner’s latest records. Cached memories will appear instantly on future visits.</p></div><span class="opening-live"><i></i> Secure sync</span></div><div class="opening-grid"><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article></div><div class="opening-list">${Array.from({ length: 4 }, () => `<div class="opening-row"><div class="skeleton opening-avatar"></div><div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></div><div class="skeleton opening-action"></div></div>`).join('')}</div></section>`; }
function currentView() { return ({ home: homeView, vault: vaultView, assistant: assistantView, reminders: remindersView, clipboard: clipboardView, birthdays: birthdaysView }[state.view] || homeView)(); }
function memories() { return state.items.filter(item => item.kind !== 'clipboard' && !['Reminder', 'Notification'].includes(item.type)); }
function reminders() { return state.items.filter(item => item.type === 'Reminder'); }
function notificationRecords() { return state.items.filter(item => item.type === 'Notification'); }
function clips() { return state.items.filter(item => item.kind === 'clipboard'); }
function normalizedField(fields, names) { const entries = Object.entries(fields || {}); for (const name of names) { const match = entries.find(([label]) => label.toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase().replace(/[^a-z]/g, '')); if (match) return match[1]; } return ''; }
function cardDetails(fields = {}) {
  return {
    number: normalizedField(fields, ['Card Number', 'Debit Card', 'Debit Card Number', 'Credit Card Number']),
    bank: normalizedField(fields, ['Bank', 'Bank Name']), type: normalizedField(fields, ['Card Type', 'Debit Card Type']),
    holder: normalizedField(fields, ['Card Holder Name', 'Cardholder Name', 'Holder Name']),
    validFrom: normalizedField(fields, ['Valid From']), validThru: normalizedField(fields, ['Valid Thru', 'Expiry']),
    cvv: normalizedField(fields, ['CVV', 'Security Code']),
  };
}
function isCardRecord(item) { return item?.type === 'Finance' && Boolean(cardDetails(allFields(item)).number); }
function paymentCard(title, fields, compact = false) {
  const card = cardDetails(fields); if (!card.number) return '';
  const digits = String(card.number).replace(/\D/g, ''); const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
  const displayNumber = state.hidden ? `•••• •••• •••• ${digits.slice(-4)}` : grouped;
  const theme = ['onyx', 'violet', 'coral'][Array.from(String(title)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3];
  return `<article class="payment-card ${compact ? 'compact' : ''} card-${theme}"><div class="payment-card-glow"></div><div class="payment-card-head"><span>${escapeHtml(card.bank || title)}</span><small>${escapeHtml(card.type || 'Debit card')}</small></div><div class="payment-card-chip"></div><div class="payment-card-number"><span>${escapeHtml(displayNumber)}</span><button data-copy="${escapeHtml(card.number)}" title="Copy card number">${icon('Copy')}</button></div><div class="payment-card-meta">${card.holder ? `<div><small>Card holder</small><strong>${escapeHtml(card.holder)}</strong></div>` : ''}${card.validFrom ? `<div><small>Valid from</small><strong>${escapeHtml(card.validFrom)}</strong></div>` : ''}${card.validThru ? `<div><small>Valid thru</small><strong>${escapeHtml(card.validThru)}</strong></div>` : ''}${card.cvv ? `<div><small>CVV</small><strong>${escapeHtml(state.hidden ? '•••' : card.cvv)}</strong></div>` : ''}</div></article>`;
}

function memoryCard(item) {
  return `<article class="memory-card" data-open="${item.id}" tabindex="0"><span class="icon-wrap ${category(item) === 'Finance' ? 'green' : ''}">${icon(itemIcon(item))}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || Object.keys(allFields(item)).join(' · '))}</p><div class="memory-card-foot"><span class="chip">${escapeHtml(category(item))}</span>${icon('ArrowUpRight')}</div></article>`;
}
function reminderCard(item, compact = false) {
  const status = reminderStatus(item); const snoozed = reminderIsSnoozed(item); const completed = status === 'completed' || status === 'no-response';
  const due = reminderDue(item); const label = status === 'no-response' ? 'Completed · no response' : status === 'completed' ? 'Completed by you' : `<span data-reminder-countdown="${Number.isFinite(due) ? due : ''}" data-prefix="${snoozed ? 'Snoozed · ' : ''}">${snoozed ? 'Snoozed · ' : ''}${liveCountdownText(due)}</span>`;
  const repeat = reminderRepeat(item);
  return `<article class="reminder-card reminder-${status} ${snoozed ? 'is-snoozed' : ''} ${compact ? 'compact' : ''}" data-searchable="${escapeHtml(searchable(item))}"><span class="reminder-accent"></span><div class="reminder-icon">${icon(completed ? 'CircleCheckBig' : snoozed ? 'CirclePause' : 'AlarmClock')}</div><div class="reminder-copy"><div class="reminder-title-line"><h3>${escapeHtml(item.title)}</h3><span class="reminder-state">${completed ? escapeHtml(label) : label}</span></div><p class="reminder-time">${formatDue(item)} · ${reminderNotificationCount(item)} notification${reminderNotificationCount(item) === 1 ? '' : 's'} remaining${repeat !== 'none' ? ` · Repeats ${escapeHtml(repeat)}` : ''}</p>${item.note ? `<p class="reminder-note">${escapeHtml(item.note)}</p>` : ''}</div><div class="reminder-actions">${!completed ? `<button class="icon-btn complete" data-reminder-complete="${item.id}" title="Mark completed">${icon('CircleCheckBig')}</button><button class="icon-btn" data-reminder-snooze="${item.id}" title="${snoozed ? 'Resume notifications' : 'Snooze notifications'}">${icon(snoozed ? 'CirclePlay' : 'CirclePause')}</button>` : status === 'no-response' ? `<button class="icon-btn complete" data-reminder-complete="${item.id}" title="Confirm completed">${icon('CircleCheckBig')}</button>` : ''}<button class="icon-btn" data-reminder-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-reminder-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`;
}
function homeView() {
  const upcomingReminders = reminders().filter(item => reminderStatus(item) === 'upcoming').sort((a, b) => reminderDue(a) - reminderDue(b));
  return `<div class="hero-grid"><section class="hero"><img class="hero-rhino" src="/brand/memoir-rhino-ui.png" alt=""><p class="eyebrow">Your private second brain</p><h2>Everything important, remembered beautifully.</h2><p>Save private details, retrieve only what you need, and never miss a meaningful moment.</p><button class="primary" data-add="memory">${icon('Plus')} Add a memory</button></section>
  <div class="stat-grid"><article class="stat large"><span class="stat-symbol rose">${icon('ShieldCheck')}</span><div><strong>${memories().length}</strong><span>memories kept safe</span></div></article><article class="stat"><span class="stat-symbol violet">${icon('AlarmClock')}</span><div><strong>${upcomingReminders.length}</strong><span>upcoming reminders</span></div></article><article class="stat"><span class="stat-symbol green">${icon('Clipboard')}</span><div><strong>${clips().length}</strong><span>clipboard items</span></div></article></div></div>
  ${upcomingReminders.length ? `<div class="section-head"><h2>Coming up</h2><button class="text-btn" data-view="reminders">All reminders</button></div><div class="dashboard-reminders">${upcomingReminders.slice(0, 3).map(item => reminderCard(item, true)).join('')}</div>` : ''}
  <div class="section-head"><h2>Recently remembered</h2><button class="text-btn" data-view="vault">View everything</button></div>
  ${memories().length ? `<div class="card-grid">${memories().slice(0, 3).map(memoryCard).join('')}</div>` : emptyState('Gem', 'Your vault is ready', 'Add your first memory. No demo records are included.', 'Add memory', 'memory')}`;
}
function vaultRow(item) {
  if (isCardRecord(item)) return `<article class="finance-memory" data-searchable="${escapeHtml(searchable(item))}">${paymentCard(item.title, allFields(item))}<div class="finance-memory-foot"><div><h3>${escapeHtml(item.title)}</h3><p>${Object.keys(allFields(item)).length} encrypted fields · ${escapeHtml(item.note || 'Banking memory')}</p></div><span class="chip">${icon('LockKeyhole')} Protected</span><div class="row-actions"><button class="icon-btn" data-open="${item.id}" title="Open">${icon('ArrowUpRight')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></div></article>`;
  return `<article class="vault-row" data-searchable="${escapeHtml(searchable(item))}"><span class="icon-wrap ${item.type === 'Finance' ? 'green' : ''}">${icon(itemIcon(item))}</span><div class="vault-info"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(category(item))} · ${Object.keys(allFields(item)).length} encrypted fields · ${escapeHtml(item.note || 'No note')}</p></div><span class="chip">${icon('LockKeyhole')} Protected</span><div class="row-actions"><button class="icon-btn" data-open="${item.id}" title="Open">${icon('ArrowUpRight')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`;
}
function vaultView() {
  const list = memories();
  return `<div class="toolbar"><input class="search-input" id="vault-filter" placeholder="Filter titles, notes, fields or values…"><button class="secondary" id="bulk-import">${icon('NotebookText')} Secure import</button><button class="primary" data-add="memory">${icon('Plus')} Add memory</button></div>${list.length ? `<div class="vault-list" id="vault-list">${list.map(vaultRow).join('')}</div>` : emptyState('Gem', 'Nothing saved yet', 'Start with a login, bank record, document, Wi-Fi detail, or anything personal.', 'Add first memory', 'memory')}`;
}
function clipboardView() {
  return `<div class="toolbar"><button class="primary" id="paste-clipboard">${icon('ClipboardPaste')} Paste current clipboard</button><input class="search-input" id="clip-input" placeholder="Or type or paste content here"><button class="secondary" id="save-clip">Save</button></div>${clips().length ? `<div class="vault-list">${clips().map(item => `<article class="vault-row"><span class="icon-wrap violet">${icon('Clipboard')}</span><div class="vault-info"><h3>${escapeHtml(item.title || 'Untitled clip')}</h3><p class="clip-value">${escapeHtml(item.fields?.Content || '')}</p><p>${new Date(item.createdAt).toLocaleString()}</p></div><div class="row-actions"><button class="icon-btn" data-copy="${escapeHtml(item.fields?.Content || '')}" title="Copy">${icon('Copy')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`).join('')}</div>` : emptyState('Clipboard', 'Clipboard vault is empty', 'Paste something, add a useful note, and find it instantly later.', 'Paste clipboard', 'clipboard')}`;
}
function remindersView() {
  const grouped = { upcoming: [], overdue: [], completed: [] };
  reminders().sort((a, b) => reminderDue(a) - reminderDue(b)).forEach(item => { const status = reminderStatus(item); grouped[status === 'completed' || status === 'no-response' ? 'completed' : status].push(item); });
  const active = grouped[state.reminderTab] || grouped.upcoming;
  return `<section class="reminder-hero"><div><p class="eyebrow">Telegram-aware planning</p><h2>Right thing. Right moment.</h2><p>Memoir notifies you 1 day, 5 hours, 3 hours, 2 hours, 30 minutes, 10 minutes, and exactly at the due time. Earlier windows are skipped automatically when a reminder is created late.</p></div><button class="primary" data-add="reminder">${icon('Plus')} Add reminder</button></section>
  <div class="reminder-tabs" role="tablist">${[['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['completed', 'Completed']].map(([id, label]) => `<button class="${state.reminderTab === id ? 'active' : ''}" data-reminder-tab="${id}">${label}<span>${grouped[id].length}</span></button>`).join('')}</div>
  ${active.length ? `<div class="reminder-list">${active.map(item => reminderCard(item)).join('')}</div>` : emptyState('AlarmClock', `No ${state.reminderTab} reminders`, state.reminderTab === 'upcoming' ? 'Add a due date and Memoir will build the smart notification schedule automatically.' : state.reminderTab === 'overdue' ? 'Nothing is waiting for your response.' : 'Completed reminders will collect here.', state.reminderTab === 'upcoming' ? 'Add reminder' : 'Create reminder', 'reminder')}
  <div class="reminder-policy">${icon('ShieldCheck')}<span>After 12 hours without a response, an overdue reminder moves to Completed in red as “no response.” Confirming it later changes the completion to green.</span></div>`;
}
function birthdaysView() {
  const birthdays = memories().filter(item => item.type === 'Birthday').sort((a, b) => (nextBirthday(a)?.occurrence?.getTime() || Infinity) - (nextBirthday(b)?.occurrence?.getTime() || Infinity));
  return `<section class="birthday-hero"><p class="eyebrow">Thoughtful reminders</p><h2>Never miss their moment.</h2><p>Memoir plans Telegram reminders two days before, one day before, five hours before, two hours before, and exactly at midnight.</p><button class="primary" style="margin-top:18px" data-add="birthday">${icon('Plus')} Add birthday</button></section>
  ${birthdays.length ? `<div class="timeline birthday-timeline">${birthdays.map(item => { const next = nextBirthday(item); const nextAge = nextBirthdayAge(item); const when = next?.daysAway === 0 ? 'Today' : next?.daysAway === 1 ? 'Tomorrow' : next ? `In ${next.daysAway} days` : 'Date needed'; return `<article class="timeline-item birthday-item"><div class="birthday-main"><div class="birthday-title-line"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(when)}</span></div><p class="birthday-date">${escapeHtml(formatDate(item.fields?.Date))} · ${escapeHtml(item.fields?.Relation || 'Contact')} · ${escapeHtml(item.note || 'No note')}</p><div class="birthday-age-grid"><div><small>Current age</small><strong>${escapeHtml(currentAgeText(item))}</strong></div><div><small>Next birthday age</small><strong>${nextAge == null ? 'Age unavailable' : escapeHtml(String(nextAge))}</strong></div></div><span class="chip birthday-reminders">${icon('BellRing')} 5 reminders planned</span></div><div class="birthday-actions"><button class="icon-btn" data-birthday-message="${item.id}" title="Generate wish">${icon('WandSparkles')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`; }).join('')}</div>` : emptyState('CakeSlice', 'No birthdays yet', 'Add someone important and Memoir will plan five thoughtful reminders.', 'Add birthday', 'birthday')}`;
}
function assistantView() {
  const messages = state.messages.length ? state.messages.map(renderMessage).join('') : `<div class="message bot"><strong>RHINOUS</strong><p>Your private vault intelligence. Ask for an exact detail, manage memories, or create one or many reminders naturally.</p></div>`;
  return `<div class="assistant-layout"><section class="chat"><div class="chat-head"><img class="assistant-logo" src="/brand/memoir-rhino-ui.png" alt=""><div><strong>Rhinous</strong><small>Private vault intelligence</small></div><button class="chat-clear" id="clear-chat" title="Clear conversation" aria-label="Clear conversation">${icon('Eraser')}</button><div class="provider-switch"><button class="${state.provider === 'gemini' ? 'active' : ''}" data-provider="gemini">Gemini</button><button class="${state.provider === 'mistral' ? 'active' : ''}" data-provider="mistral">Mistral</button></div></div><div class="messages" id="messages">${messages}${state.chatLoading ? chatSkeleton() : ''}</div><form class="chat-form" id="chat-form"><input id="chat-query" autocomplete="off" placeholder="Ask Rhinous about your vault or reminders…"><button class="send" aria-label="Send">${icon('ArrowUp')}</button></form></section>
  <aside class="panel"><p class="eyebrow">Try asking</p><h3>Find it, save it, schedule it</h3><div class="suggestions">${['Remind me to renew my passport tomorrow at 6 PM', 'Add reminders for rent on the 1st at 9 AM and dentist Friday at 4 PM', 'What reminders are due this week?', 'Give me only my EPFO password'].map(text => `<button class="suggestion" data-ask="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}</div><div class="privacy-line">${icon('ShieldCheck')}<span>Secret values stay on your device. Providers receive only record names, field labels, protected placeholders, and privacy-safe conversation context.</span></div></aside></div>`;
}
function renderMessage(message) {
  if (message.role === 'user') return `<div class="message user">${escapeHtml(message.text)}</div>`;
  if (message.fields?.length) {
    const fieldObject = Object.fromEntries(message.fields.map(field => [field.label, field.value])); const card = paymentCard(message.title || 'Saved card', fieldObject, true);
    return `<div class="message bot"><strong>${escapeHtml((message.title || 'Saved information').toUpperCase())}</strong>${message.markdown ? safeMarkdown(message.markdown) : ''}${card}<table class="answer-table"><thead><tr><th>Field</th><th>Value</th><th></th></tr></thead><tbody>${message.fields.map(field => `<tr><td>${escapeHtml(field.label)}</td><td><span class="${state.hidden ? 'blur' : ''}">${escapeHtml(field.value)}</span></td><td><button class="copy-field" data-copy="${escapeHtml(field.value)}" title="Copy">${icon('Copy')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (message.actions?.length) return `<div class="message bot"><strong>${escapeHtml((message.title || 'Review changes').toUpperCase())}</strong>${message.markdown ? safeMarkdown(message.markdown) : ''}<div class="ai-action-list">${message.actions.map(action => `<div class="ai-action"><span>${escapeHtml(action.op)}</span><strong>${escapeHtml(action.title || state.items.find(item => item.id === action.id)?.title || 'Memory')}</strong><small>${escapeHtml(action.type || 'Saved item')} · ${Object.keys(action.fields || {}).length} field${Object.keys(action.fields || {}).length === 1 ? '' : 's'}</small></div>`).join('')}</div></div>`;
  return `<div class="message bot">${message.title ? `<strong>${escapeHtml(message.title.toUpperCase())}</strong>` : ''}${safeMarkdown(message.markdown || message.text || '')}</div>`;
}
function safeMarkdown(text) { return DOMPurify.sanitize(marked.parse(text), { USE_PROFILES: { html: true } }); }
function chatSkeleton() { return `<div class="message bot" style="width:65%"><div class="skeleton" style="height:10px;width:48%;margin-bottom:10px"></div><div class="skeleton" style="height:9px;width:92%;margin-bottom:7px"></div><div class="skeleton" style="height:9px;width:73%"></div></div>`; }
function emptyState(glyph, title, text, action, type) { return `<div class="empty"><span class="icon-wrap">${icon(glyph)}</span><h3>${title}</h3><p>${text}</p><button class="primary" style="margin-top:12px" data-add="${type}">${icon('Plus')} ${action}</button></div>`; }

function bindShell() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => navigate(button.dataset.view));
  document.querySelectorAll('[data-logout]').forEach(button => button.onclick = () => confirmBox('Sign out of Memoir?', 'Your local vault stays encrypted. You will need the approved email and password to enter again.', 'Sign out', 'LogOut', () => vaultStore.signOut()));
  document.querySelector('#privacy').onclick = () => { state.hidden = !state.hidden; toast(state.hidden ? 'Sensitive values hidden' : 'Sensitive values visible'); renderView(); };
  document.querySelector('#theme').onclick = () => { state.dark = !state.dark; document.body.classList.toggle('dark', state.dark); localStorage.setItem('memoir-theme', state.dark ? 'dark' : 'light'); shell(); };
  const global = document.querySelector('#global-search');
  global?.addEventListener('input', event => showGlobalSearch(event.target.value));
  document.querySelector('#mobile-search-button')?.addEventListener('click', openMobileSearch);
  document.querySelector('#notification-center')?.addEventListener('click', () => toggleNotificationCenter());
  document.addEventListener('keydown', shortcutHandler, { once: true });
  bindView();
  updateNotificationBadge();
}
function shortcutHandler(event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#global-search')?.focus(); } document.addEventListener('keydown', shortcutHandler, { once: true }); }
function navigate(viewName) { document.querySelector('.notification-popover')?.remove(); state.view = viewName; state.query = ''; shell(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function renderView() { const node = document.querySelector('#view'); if (node) node.innerHTML = currentView(); bindView(); }

function bindView() {
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => button.dataset.add === 'clipboard' ? pasteClipboard() : button.dataset.add === 'reminder' ? openReminderEditor() : button.dataset.add === 'birthday' ? openBirthdayEditor() : openEditor(null, 'Personal'));
  document.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openDetail(button.dataset.open));
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => confirmEdit(button.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.delete));
  document.querySelectorAll('[data-copy]').forEach(button => button.onclick = () => copyText(button.dataset.copy));
  document.querySelectorAll('[data-provider]').forEach(button => button.onclick = () => { state.provider = button.dataset.provider; localStorage.setItem('memoir-provider', state.provider); renderView(); });
  document.querySelectorAll('[data-ask]').forEach(button => button.onclick = () => askAssistant(button.dataset.ask));
  document.querySelectorAll('[data-birthday-message]').forEach(button => button.onclick = () => generateBirthdayMessage(button.dataset.birthdayMessage));
  document.querySelectorAll('[data-reminder-tab]').forEach(button => button.onclick = () => { state.reminderTab = button.dataset.reminderTab; renderView(); });
  document.querySelectorAll('[data-reminder-complete]').forEach(button => button.onclick = () => completeReminder(button.dataset.reminderComplete));
  document.querySelectorAll('[data-reminder-snooze]').forEach(button => button.onclick = () => toggleReminderSnooze(button.dataset.reminderSnooze));
  document.querySelectorAll('[data-reminder-edit]').forEach(button => button.onclick = () => openReminderEditor(state.items.find(item => item.id === button.dataset.reminderEdit)));
  document.querySelectorAll('[data-reminder-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.reminderDelete));
  document.querySelector('#clear-chat')?.addEventListener('click', () => confirmBox('Clear this conversation?', 'This removes the local Rhinous conversation log. Your saved memories and reminders will not be changed.', 'Clear chat', 'Eraser', () => { state.messages = []; state.assistantLog = []; localStorage.removeItem('memoir-assistant-log'); renderView(); toast('Conversation cleared'); }));
  document.querySelector('#vault-filter')?.addEventListener('input', event => document.querySelectorAll('[data-searchable]').forEach(row => row.hidden = !row.dataset.searchable.includes(event.target.value.toLowerCase())));
  document.querySelector('#paste-clipboard')?.addEventListener('click', pasteClipboard);
  document.querySelector('#bulk-import')?.addEventListener('click', openBulkImporter);
  document.querySelector('#save-clip')?.addEventListener('click', () => { const value = document.querySelector('#clip-input').value; if (value.trim()) openClipEditor(value); else toast('Add something to save'); });
  document.querySelector('#chat-form')?.addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#chat-query'); askAssistant(input.value); input.value = ''; });
  updateReminderCountdowns();
}

function showGlobalSearch(query) {
  document.querySelector('.search-overlay')?.remove();
  if (!query.trim()) return;
  const matches = state.items.filter(item => item.type !== 'Notification' && searchable(item).includes(query.toLowerCase())).slice(0, 12);
  const overlay = document.createElement('div'); overlay.className = 'search-overlay';
  const groups = [['Memories', matches.filter(item => item.kind !== 'clipboard' && item.type !== 'Reminder')], ['Reminders', matches.filter(item => item.type === 'Reminder')], ['Clipboard Vault', matches.filter(item => item.kind === 'clipboard')]];
  overlay.innerHTML = groups.filter(([, rows]) => rows.length).map(([label, rows]) => `<section class="search-section"><p class="search-section-title">${label}</p>${rows.map(item => `<button class="search-result" data-result="${item.id}"><span class="icon-wrap">${icon(itemIcon(item))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(category(item))} · ${escapeHtml(item.note || 'Matched a saved field')}</small></span>${icon('ChevronRight')}</button>`).join('')}</section>`).join('') || `<div class="empty" style="padding:30px"><p>No saved result matches “${escapeHtml(query)}”.</p></div>`;
  document.querySelector('.content').appendChild(overlay);
  overlay.querySelectorAll('[data-result]').forEach(button => button.onclick = () => { const item = state.items.find(row => row.id === button.dataset.result); overlay.remove(); if (item.kind === 'clipboard') navigate('clipboard'); else if (item.type === 'Reminder') navigate('reminders'); else openDetail(item.id); });
}
function openMobileSearch() {
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-inner"><div class="modal-head"><div><p class="eyebrow">Global search</p><h2>Find anything</h2></div><button class="modal-close">${icon('X')}</button></div><input class="search-input" id="mobile-global-input" placeholder="Search titles, notes, fields or values…" autocomplete="off"><div id="mobile-results" class="vault-list" style="margin-top:12px"></div></div>`;
  showModal(); const input = document.querySelector('#mobile-global-input'); input.focus();
  input.oninput = () => {
    const query = input.value.trim().toLowerCase(); const results = query ? state.items.filter(item => item.type !== 'Notification' && searchable(item).includes(query)).slice(0, 12) : [];
    document.querySelector('#mobile-results').innerHTML = results.map(item => `<button class="search-result" data-mobile-result="${item.id}"><span class="icon-wrap">${icon(itemIcon(item))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(category(item))} · ${escapeHtml(item.note || 'Matched a saved field')}</small></span>${icon('ChevronRight')}</button>`).join('') || (query ? `<div class="empty" style="padding:28px"><p>No result found.</p></div>` : '');
    document.querySelectorAll('[data-mobile-result]').forEach(button => button.onclick = () => { const item = state.items.find(row => row.id === button.dataset.mobileResult); closeModal(); if (item.kind === 'clipboard') navigate('clipboard'); else if (item.type === 'Reminder') navigate('reminders'); else openDetail(item.id); });
  };
}

async function copyText(text) { try { await navigator.clipboard.writeText(text); toast('Copied securely'); } catch { toast('Clipboard permission was not granted'); } }
async function pasteClipboard() { try { const value = await navigator.clipboard.readText(); if (!value.trim()) return toast('Clipboard is empty'); openClipEditor(value); } catch { toast('Allow clipboard access, or paste manually'); } }
function openBulkImporter() {
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="bulk-form"><div class="modal-head"><div><p class="eyebrow">On-device encrypted import</p><h2>Import multiple memories</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><p class="import-help">Paste a JSON array of memories. Values are parsed and encrypted in this browser, then synced directly to your owner-only Firebase vault.</p><label>Memory JSON<textarea id="bulk-json" rows="12" required spellcheck="false" placeholder='[{"title":"Example login","type":"Login","fields":{"Username":"...","Password":"..."}}]'></textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('ShieldCheck')} Encrypt and import</button></div></form>`;
  showModal();
  document.querySelector('#bulk-form').onsubmit = async event => {
    event.preventDefault(); const submit = event.submitter;
    try {
      const parsed = JSON.parse(document.querySelector('#bulk-json').value); if (!Array.isArray(parsed) || !parsed.length || parsed.length > 100) throw new Error('Use a JSON array containing 1 to 100 memories.');
      const allowedTypes = new Set(['Login', 'Finance', 'Identity', 'Personal', 'Birthday', 'Wi-Fi']);
      const records = parsed.map(raw => {
        const title = String(raw?.title || '').trim(); if (!title) throw new Error('Every memory needs a title.');
        const existing = state.items.find(item => item.kind !== 'clipboard' && item.title.toLowerCase() === title.toLowerCase());
        const fields = Object.fromEntries(Object.entries(raw?.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields) ? raw.fields : {}).map(([label, value]) => [String(label).slice(0, 100), String(value).slice(0, 5000)]));
        return { ...(existing || {}), kind: 'memory', type: allowedTypes.has(raw.type) ? raw.type : 'Personal', title: title.slice(0, 160), note: String(raw.note || '').slice(0, 2000), fields };
      });
      submit.disabled = true; submit.innerHTML = '<span class="button-spinner"></span> Encrypting and syncing…';
      await withRhinoActivity('Encrypting memories…', () => vaultStore.saveMany(records)); closeModal(); toast(`${records.length} memories imported securely`);
    } catch (error) { submit.disabled = false; submit.innerHTML = `${icon('ShieldCheck')} Encrypt and import`; toast(error?.message || 'The import could not be read'); }
  };
}
function openClipEditor(value, existing = null) {
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="clip-form"><div class="modal-head"><div><p class="eyebrow">Clipboard vault</p><h2>${existing ? 'Edit saved clipboard' : 'Remember this clipboard'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Clipboard content<textarea id="clip-content" rows="5" required>${escapeHtml(value)}</textarea></label><label>Note or meaning<input id="clip-title" placeholder="e.g. Passport application number" value="${escapeHtml(existing?.title || '')}"></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} Save clipboard</button></div></form>`;
  showModal();
  document.querySelector('#clip-form').onsubmit = async event => { event.preventDefault(); await withRhinoActivity(existing ? 'Updating clipboard…' : 'Saving clipboard…', () => vaultStore.save({ ...(existing || {}), kind: 'clipboard', type: 'Clipboard', title: document.querySelector('#clip-title').value.trim() || 'Untitled clip', note: document.querySelector('#clip-title').value.trim(), fields: { Content: document.querySelector('#clip-content').value.trim() } })); closeModal(); toast(existing ? 'Clipboard updated' : 'Clipboard saved'); };
}

function openEditor(item = null, initialType = 'Personal') {
  if (item?.type === 'Reminder' || initialType === 'Reminder') return openReminderEditor(item);
  if (item?.type === 'Birthday' || initialType === 'Birthday') return openBirthdayEditor(item);
  const selected = item?.type || initialType;
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="memory-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit memory' : 'New memory'}</p><h2>${item ? 'Update what matters' : 'Add something important'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Category<select id="memory-type">${Object.keys(fieldMap).filter(type => !['Birthday', 'Reminder'].includes(type)).map(type => `<option ${type === selected ? 'selected' : ''}>${type}</option>`).join('')}</select></label><label>Title<input id="memory-title" required placeholder="e.g. Home Wi-Fi" value="${escapeHtml(item?.title || '')}"></label><div id="dynamic-fields"></div><label>Note<textarea id="memory-note" rows="3" placeholder="Context, reminder, or anything useful">${escapeHtml(item?.note || '')}</textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save changes' : 'Save memory'}</button></div></form>`;
  showModal();
  const renderFields = () => { const type = document.querySelector('#memory-type').value; document.querySelector('#dynamic-fields').innerHTML = `<div class="field-grid">${fieldMap[type].map(name => `<label>${escapeHtml(name)}<input data-field="${escapeHtml(name)}" ${name === 'Date' ? 'type="date"' : ''} value="${escapeHtml(item?.fields?.[name] || '')}"></label>`).join('')}</div>`; };
  renderFields(); document.querySelector('#memory-type').onchange = renderFields;
  document.querySelector('#memory-form').onsubmit = async event => { event.preventDefault(); const fields = {}; document.querySelectorAll('[data-field]').forEach(input => { if (input.value.trim()) fields[input.dataset.field] = input.value.trim(); }); await withRhinoActivity(item ? 'Updating memory…' : 'Saving memory…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: document.querySelector('#memory-type').value, title: document.querySelector('#memory-title').value.trim(), note: document.querySelector('#memory-note').value.trim(), fields })); closeModal(); toast(item ? 'Memory updated instantly' : 'Memory saved securely'); };
}
function openBirthdayEditor(item = null) {
  const parsed = parseBirthday(item?.fields?.Date) || { year: 0, month: '', day: '', hasYear: false };
  const months = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'long' }) }));
  modal.className = 'modal birthday-modal';
  modal.innerHTML = `<form class="modal-inner" id="birthday-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit birthday' : 'New birthday'}</p><h2>${item ? 'Keep their date accurate' : 'Remember their special day'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Name or title<input id="birthday-title" required maxlength="160" placeholder="e.g. Roohi Birthday" value="${escapeHtml(item?.title || '')}"></label><div class="birthday-date-fields"><label>Day <span>Required</span><select id="birthday-day" required><option value="">Day</option>${Array.from({ length: 31 }, (_, index) => `<option value="${index + 1}" ${parsed.day === index + 1 ? 'selected' : ''}>${index + 1}</option>`).join('')}</select></label><label>Month <span>Required</span><select id="birthday-month" required><option value="">Month</option>${months.map(month => `<option value="${month.value}" ${parsed.month === month.value ? 'selected' : ''}>${month.label}</option>`).join('')}</select></label><label>Birth year <span>Optional</span><input id="birthday-year" type="number" inputmode="numeric" min="1900" max="${new Date().getFullYear()}" placeholder="Leave blank" value="${parsed.hasYear ? parsed.year : ''}"></label></div><p class="birthday-year-help">Don’t know the birth year? Leave it blank. Memoir stores the day and month, keeps yearly reminders working, and shows “Age unavailable” instead of guessing.</p><div class="field-grid"><label>Relation<input id="birthday-relation" placeholder="e.g. Sister" value="${escapeHtml(item?.fields?.Relation || '')}"></label><label>Gift idea<input id="birthday-gift" value="${escapeHtml(item?.fields?.['Gift idea'] || '')}"></label></div><label>Wish note<input id="birthday-wish" placeholder="Tone, memory, or message idea" value="${escapeHtml(item?.fields?.['Wish note'] || '')}"></label><label>Note<textarea id="birthday-note" rows="3" placeholder="Anything else worth remembering">${escapeHtml(item?.note || '')}</textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save birthday' : 'Add birthday'}</button></div></form>`;
  showModal();
  document.querySelector('#birthday-form').onsubmit = async event => {
    event.preventDefault(); const day = Number(document.querySelector('#birthday-day').value); const month = Number(document.querySelector('#birthday-month').value); const rawYear = document.querySelector('#birthday-year').value.trim(); const year = rawYear ? Number(rawYear) : 0;
    const validationYear = year || 2000; if (day > new Date(validationYear, month, 0).getDate()) return toast('That day does not exist in the selected month');
    const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const fields = { Date: date };
    const relation = document.querySelector('#birthday-relation').value.trim(); const gift = document.querySelector('#birthday-gift').value.trim(); const wish = document.querySelector('#birthday-wish').value.trim(); if (relation) fields.Relation = relation; if (gift) fields['Gift idea'] = gift; if (wish) fields['Wish note'] = wish;
    await withRhinoActivity(item ? 'Updating birthday…' : 'Saving birthday…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: 'Birthday', title: document.querySelector('#birthday-title').value.trim(), note: document.querySelector('#birthday-note').value.trim(), fields })); closeModal(); toast(item ? 'Birthday updated' : 'Birthday remembered');
  };
}
function normalizeReminderRecord(record) {
  const fields = { ...(record.fields || {}) }; const dueAt = String(fields['Due at'] || '').trim(); const due = Number(fields['Due timestamp']) || new Date(dueAt).getTime();
  if (dueAt && Number.isFinite(due)) fields['Due timestamp'] = String(due);
  fields.Status = String(fields.Status || 'upcoming').toLowerCase() === 'completed' ? 'completed' : 'upcoming';
  fields.Snoozed = /^(yes|true|snoozed)$/i.test(String(fields.Snoozed || '')) ? 'Yes' : 'No';
  fields.Repeat = ['daily', 'weekly', 'monthly', 'yearly'].includes(String(fields.Repeat || '').toLowerCase()) ? String(fields.Repeat).toLowerCase() : 'none';
  return { ...record, kind: 'memory', type: 'Reminder', fields };
}
function openReminderEditor(item = null) {
  const due = reminderDue(item); const dueValue = Number.isFinite(due) ? localDateTimeValue(due) : localDateTimeValue();
  modal.className = 'modal reminder-modal';
  modal.innerHTML = `<form class="modal-inner" id="reminder-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit reminder' : 'New reminder'}</p><h2>${item ? 'Change the timing' : 'What should I remember?'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Reminder title<input id="reminder-title" required maxlength="160" placeholder="e.g. Renew passport" value="${escapeHtml(item?.title || '')}"></label><div class="field-grid"><label>Due date and time<input id="reminder-due" type="datetime-local" required value="${escapeHtml(dueValue)}"></label><label>Repeat<select id="reminder-repeat">${[['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year']].map(([value, label]) => `<option value="${value}" ${reminderRepeat(item) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label>Note<textarea id="reminder-note" rows="3" maxlength="2000" placeholder="Optional context for the notification">${escapeHtml(item?.note || '')}</textarea></label><label class="snooze-control"><input id="reminder-snoozed" type="checkbox" ${reminderIsSnoozed(item) ? 'checked' : ''}><span>${icon('CirclePause')} Pause Telegram notifications until I resume them</span></label><div class="schedule-preview"><strong>${icon('BellRing')} Smart notification schedule</strong><div>${['1 day', '5 hours', '3 hours', '2 hours', '30 min', '10 min', 'Due time'].map(label => `<span>${label}</span>`).join('')}</div><p>Windows that already passed when you create the reminder are skipped automatically. There is no 1-hour notification.</p></div><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save changes' : 'Add reminder'}</button></div></form>`;
  showModal();
  document.querySelector('#reminder-form').onsubmit = async event => {
    event.preventDefault(); const dueInput = document.querySelector('#reminder-due').value; const dueTimestamp = new Date(dueInput).getTime(); if (!Number.isFinite(dueTimestamp)) return toast('Choose a valid due date and time');
    const resetCompletion = !item || dueTimestamp !== reminderDue(item); const fields = { ...(item?.fields || {}), 'Due at': dueInput, 'Due timestamp': String(dueTimestamp), 'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta', Repeat: document.querySelector('#reminder-repeat').value, Status: resetCompletion ? 'upcoming' : (item.fields?.Status || 'upcoming'), Snoozed: document.querySelector('#reminder-snoozed').checked ? 'Yes' : 'No' };
    if (resetCompletion) { delete fields.Completion; delete fields['Completed at']; }
    await withRhinoActivity(item ? 'Updating reminder…' : 'Scheduling reminder…', () => vaultStore.save(normalizeReminderRecord({ ...(item || {}), title: document.querySelector('#reminder-title').value.trim(), note: document.querySelector('#reminder-note').value.trim(), fields }))); closeModal(); state.reminderTab = 'upcoming'; toast(item ? 'Reminder updated' : 'Reminder scheduled');
  };
}
async function completeReminder(id) {
  const item = state.items.find(row => row.id === id); if (!item) return;
  const completedAt = new Date().toISOString(); const repeat = reminderRepeat(item); const nextDue = advanceRecurringDue(reminderDue(item), repeat);
  if (nextDue) {
    await withRhinoActivity('Scheduling next reminder…', () => vaultStore.save(normalizeReminderRecord({ ...item, fields: { ...item.fields, 'Due at': localDateTimeValue(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'user', Snoozed: 'No' } })));
    state.reminderTab = 'upcoming'; renderView(); toast(`Completed · next ${repeat} reminder scheduled`);
  } else {
    await withRhinoActivity('Completing reminder…', () => vaultStore.save(normalizeReminderRecord({ ...item, fields: { ...item.fields, Status: 'completed', Completion: 'user', 'Completed at': completedAt, Snoozed: 'No' } })));
    state.reminderTab = 'completed'; renderView(); toast('Reminder completed');
  }
}
async function toggleReminderSnooze(id) {
  const item = state.items.find(row => row.id === id); if (!item || /^completed$/i.test(String(item.fields?.Status || ''))) return;
  const snoozed = !reminderIsSnoozed(item); await withRhinoActivity(snoozed ? 'Snoozing reminder…' : 'Resuming reminder…', () => vaultStore.save(normalizeReminderRecord({ ...item, fields: { ...item.fields, Snoozed: snoozed ? 'Yes' : 'No' } }))); toast(snoozed ? 'Reminder notifications paused' : 'Reminder notifications resumed');
}
function showModal() { modal.showModal(); modal.querySelector('.modal-close')?.addEventListener('click', closeModal); modal.querySelector('.modal-cancel')?.addEventListener('click', closeModal); }
function closeModal() { modal.close(); }
function confirmEdit(id) { const item = state.items.find(row => row.id === id); confirmBox(`Edit this ${item.type === 'Reminder' ? 'reminder' : item.type === 'Birthday' ? 'birthday' : 'memory'}?`, `You’re about to change “${item.title}”. Your update will replace the current version.`, item.type === 'Reminder' ? 'Edit reminder' : item.type === 'Birthday' ? 'Edit birthday' : 'Edit memory', 'Pencil', () => item.kind === 'clipboard' ? openClipEditor(item.fields.Content, item) : item.type === 'Reminder' ? openReminderEditor(item) : item.type === 'Birthday' ? openBirthdayEditor(item) : openEditor(item)); }
function confirmDelete(id) { const item = state.items.find(row => row.id === id); if (!item) return; confirmBox('Delete this permanently?', `“${item.title}” will be removed from this device and your synced vault. This cannot be undone.`, 'Delete forever', 'Trash2', async () => { await withRhinoActivity('Deleting securely…', () => vaultStore.remove(id)); toast(item.type === 'Reminder' ? 'Reminder deleted' : 'Memory deleted'); }); }
function confirmBox(title, text, action, glyph, callback) {
  modal.className = 'modal confirm';
  modal.innerHTML = `<div class="modal-inner"><span class="confirm-icon">${icon(glyph)}</span><div class="modal-head"><div><p class="eyebrow">Please confirm</p><h2>${escapeHtml(title)}</h2></div></div><p>${escapeHtml(text)}</p><div class="modal-actions"><button class="secondary modal-cancel">No, keep it</button><button class="${glyph === 'Trash2' ? 'danger-btn' : 'primary'} modal-confirm">${icon(glyph)} ${escapeHtml(action)}</button></div></div>`;
  modal.showModal(); modal.querySelector('.modal-cancel').onclick = closeModal; modal.querySelector('.modal-confirm').onclick = () => { closeModal(); callback(); };
}
function openDetail(id) {
  const item = state.items.find(row => row.id === id); if (!item) return;
  state.view = 'vault'; shell();
  document.querySelector('#view').innerHTML = `<section class="detail"><button class="secondary" data-view="vault">${icon('ArrowLeft')} Back to memories</button><div class="detail-head"><span class="icon-wrap">${icon(itemIcon(item))}</span><div><p class="eyebrow">${escapeHtml(category(item))}</p><h2>${escapeHtml(item.title)}</h2></div></div>${isCardRecord(item) ? paymentCard(item.title, allFields(item)) : ''}<div class="detail-fields ${isCardRecord(item) ? 'with-card' : ''}">${Object.entries(allFields(item)).map(([label, value]) => `<div class="detail-field"><div><small>${escapeHtml(label)}</small><strong class="${state.hidden ? 'blur' : ''}">${escapeHtml(value)}</strong></div><button class="icon-btn" data-copy="${escapeHtml(value)}" title="Copy">${icon('Copy')}</button></div>`).join('')}</div><p style="color:var(--muted);font-size:11px">${escapeHtml(item.note || '')}</p><div class="modal-actions" style="justify-content:flex-start"><button class="secondary" data-edit="${item.id}">${icon('Pencil')} Edit</button><button class="ghost" data-delete="${item.id}">${icon('Trash2')} Delete</button></div></section>`;
  bindView(); document.querySelector('[data-view="vault"]').onclick = () => navigate('vault');
}

async function askAssistant(query) {
  if (!query?.trim() || state.chatLoading) return;
  const cleanQuery = query.trim();
  const history = assistantHistory(state.messages);
  const protectedInput = protectPrivateInput(cleanQuery);
  let proposedActions = [];
  state.messages.push({ role: 'user', text: cleanQuery }); state.chatLoading = true; renderView(); scrollChat();
  try {
    const catalog = state.items.filter(item => item.type !== 'Notification').map(item => ({ id: item.id, type: category(item), title: item.title, fieldNames: Object.keys(allFields(item)) }));
    const identityToken = await vaultStore.idToken();
    const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(identityToken ? { Authorization: `Bearer ${identityToken}` } : {}) }, body: JSON.stringify({ provider: state.provider, query: protectedInput.text, catalog, history, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta', now: new Date().toISOString() }) });
    if (!response.ok) throw new Error(await response.text());
    const answer = await response.json();
    const message = buildAssistantMessage(answer, cleanQuery, protectedInput.values);
    proposedActions = message.actions || [];
    state.messages.push(message);
  } catch (error) {
    const fallback = localRoute(cleanQuery);
    state.messages.push(fallback || { role: 'assistant', markdown: `### Offline answer\nI couldn’t reach ${state.provider === 'gemini' ? 'Gemini' : 'Mistral'} and no exact saved field matched your request.` });
  } finally { state.chatLoading = false; persistAssistantLog(); renderView(); scrollChat(); }
  if (proposedActions.length) await confirmAssistantActions(proposedActions);
}
function buildAssistantMessage(answer, query, privateValues = {}) {
  if (answer.kind === 'actions' && answer.actions?.length) {
    const actions = answer.actions.map(action => rehydrateAction(action, privateValues)).filter(Boolean);
    if (actions.length) return { role: 'assistant', title: answer.title || 'Review vault changes', markdown: answer.markdown || 'Review these changes before I apply them.', actions };
  }
  if (answer.kind !== 'lookup' || !answer.matches?.length) return { role: 'assistant', title: answer.title || 'Rhinous', markdown: answer.markdown || answer.message || 'I could not create a response.' };
  const fields = [];
  answer.matches.forEach(match => { const item = state.items.find(row => row.id === match.id); if (!item) return; const requested = match.fields?.length ? match.fields : Object.keys(allFields(item)); requested.forEach(label => { const actual = Object.keys(allFields(item)).find(key => key.toLowerCase() === String(label).toLowerCase()); if (actual) fields.push({ label: actual, value: allFields(item)[actual] }); }); });
  return fields.length ? { role: 'assistant', title: answer.title || 'Saved information', markdown: answer.markdown, fields } : localRoute(query) || { role: 'assistant', markdown: 'I found the record, but not that exact field.' };
}
function protectPrivateInput(input) {
  let text = String(input || ''); const values = {}; let tokenIndex = 0;
  const remember = value => { const token = `[[PRIVATE_${tokenIndex++}]]`; values[token] = String(value).trim(); return token; };
  const knownValues = state.items.flatMap(item => Object.values(allFields(item))).map(String).filter(value => value.trim().length >= 3).sort((a, b) => b.length - a.length);
  knownValues.forEach(value => { if (text.includes(value)) text = text.split(value).join(remember(value)); });
  const isMutation = /\b(add|create|save|remember|edit|update|change|replace|delete|remove|forget)\b/i.test(text);
  const labels = ['debit card number', 'credit card number', 'application number', 'account number', 'document number', 'username / id', 'username', 'atm pin', 'wifi password', 'wi-fi password', 'password', 'passcode', 'security code', 'cvv', 'pin', 'ifsc code', 'expiry', 'network', 'ssid', 'date', 'relation', 'gift idea', 'wish note', 'content', 'value', 'note'];
  const labelPattern = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const labelledValue = new RegExp(`\\b(${labelPattern})\\s*(?:to|is|:|=)\\s*([\\s\\S]*?)(?=(?:\\s*(?:,|;|\\n)\\s*|\\s+and\\s+)(?:${labelPattern})\\s*(?:to|is|:|=)|$)`, 'gi');
  text = text.replace(labelledValue, (_match, label, value) => `${label}: ${/^\\[\\[PRIVATE_\\d+\\]\\]$/.test(value.trim()) ? value.trim() : remember(value)}`);
  if (isMutation) {
    const compactSecret = new RegExp(`\\b(password|passcode|cvv|atm pin|pin)\\s+([^\\s,;]+)`, 'gi');
    text = text.replace(compactSecret, (_match, label, value) => `${label}: ${/^\\[\\[PRIVATE_\\d+\\]\\]$/.test(value.trim()) ? value.trim() : remember(value)}`);
  }
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, value => remember(value));
  text = text.replace(/\b(?:\d[ -]?){8,19}\b/g, value => remember(value));
  return { text, values };
}
function assistantHistory(messages) {
  const live = messages.slice(-12).map(message => {
    if (message.role === 'user') return { role: 'user', text: protectPrivateInput(message.text).text.slice(0, 1200) };
    if (message.fields?.length) return { role: 'assistant', text: `Returned ${message.title || 'a saved record'} fields: ${message.fields.map(field => field.label).join(', ')}. Values stayed on-device.` };
    if (message.actions?.length) return { role: 'assistant', text: `Proposed vault actions: ${message.actions.map(action => `${action.op} ${action.title || action.id}`).join('; ')}` };
    return { role: 'assistant', text: String(message.markdown || message.text || '').slice(0, 1200) };
  });
  return (live.length ? live : state.assistantLog).slice(-12);
}
function loadAssistantLog() { try { const value = JSON.parse(localStorage.getItem('memoir-assistant-log') || '[]'); return Array.isArray(value) ? value.slice(-12) : []; } catch { return []; } }
function persistAssistantLog() { state.assistantLog = assistantHistory(state.messages); localStorage.setItem('memoir-assistant-log', JSON.stringify(state.assistantLog)); }
function rehydrateAction(action, privateValues) {
  if (!action || !['create', 'update', 'delete'].includes(action.op)) return null;
  const restore = value => Object.entries(privateValues).reduce((text, [token, secret]) => text.split(token).join(secret), String(value || ''));
  const fields = Object.fromEntries(Object.entries(action.fields || {}).map(([label, value]) => [restore(label).slice(0, 100), restore(value).slice(0, 4000)]).filter(([label]) => label));
  return { op: action.op, id: String(action.id || ''), type: restore(action.type).slice(0, 40), title: restore(action.title).slice(0, 160), note: restore(action.note).slice(0, 2000), fields };
}
function assistantActionName(action) { return action.title || state.items.find(item => item.id === action.id)?.title || 'Saved memory'; }
async function confirmAssistantActions(actions) {
  modal.className = 'modal confirm ai-confirm';
  modal.innerHTML = `<div class="modal-inner"><img class="assistant-logo confirm-rhino" src="/brand/memoir-rhino-ui.png" alt=""><div class="modal-head"><div><p class="eyebrow">Rhinous prepared ${actions.length} change${actions.length === 1 ? '' : 's'}</p><h2>Review before applying</h2></div></div><div class="ai-review-list">${actions.map(action => `<article><span>${escapeHtml(action.op.toUpperCase())}</span><strong>${escapeHtml(assistantActionName(action))}</strong>${Object.keys(action.fields || {}).length ? `<dl>${Object.entries(action.fields).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}</article>`).join('')}</div><p class="ai-review-note">Nothing changes until you confirm. Secret values shown here remain inside this browser.</p><div class="modal-actions"><button class="secondary modal-cancel">No, cancel</button><button class="primary modal-confirm">${icon('Check')} Apply ${actions.length === 1 ? 'change' : 'changes'}</button></div></div>`;
  modal.showModal();
  const approved = await new Promise(resolve => {
    let settled = false; const finish = value => { if (settled) return; settled = true; resolve(value); };
    modal.querySelector('.modal-cancel').onclick = () => { closeModal(); finish(false); };
    modal.querySelector('.modal-confirm').onclick = () => { closeModal(); finish(true); };
    modal.oncancel = event => { event.preventDefault(); closeModal(); finish(false); };
  });
  if (!approved) { toast('No vault changes were made'); return; }
  let applied = 0;
  await withRhinoActivity(`Applying ${actions.length} Rhinous ${actions.length === 1 ? 'change' : 'changes'}…`, async () => {
    for (const action of actions) {
      if (action.op === 'create') {
        const type = action.type || 'Personal';
        const record = { kind: type === 'Clipboard' ? 'clipboard' : 'memory', type, title: action.title || (type === 'Reminder' ? 'Untitled reminder' : 'Untitled memory'), note: action.note || '', fields: action.fields || {} };
        await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : record); applied += 1;
      } else if (action.op === 'update') {
        const item = state.items.find(row => row.id === action.id); if (!item) continue;
        const type = action.type || item.type;
        const record = { ...item, kind: type === 'Clipboard' ? 'clipboard' : 'memory', type, title: action.title || item.title, note: action.note || item.note || '', fields: { ...allFields(item), ...(action.fields || {}) } };
        await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : record); applied += 1;
      } else if (action.op === 'delete' && state.items.some(row => row.id === action.id)) { await vaultStore.remove(action.id); applied += 1; }
    }
  });
  state.messages.push({ role: 'assistant', markdown: `### Changes applied\n${applied} vault ${applied === 1 ? 'change is' : 'changes are'} saved and queued for encrypted sync.` });
  persistAssistantLog();
  renderView(); scrollChat(); toast(`${applied} vault ${applied === 1 ? 'change' : 'changes'} applied`);
}
function localRoute(query) {
  const needle = query.toLowerCase(); const candidates = state.items.filter(item => item.type !== 'Notification' && (needle.includes(item.title.toLowerCase()) || item.title.toLowerCase().split(/\s+/).some(word => word.length > 3 && needle.includes(word)) || Object.keys(allFields(item)).some(field => needle.includes(field.toLowerCase().replace('number', '').trim()))));
  if (!candidates.length) return null; const item = candidates[0]; let entries = Object.entries(allFields(item)); const exact = entries.filter(([label]) => needle.includes(label.toLowerCase()) || needle.includes(label.toLowerCase().replace('number', '').trim())); if (exact.length) entries = exact; else if (!/(all|details|info|everything|complete)/.test(needle)) entries = entries.slice(0, 1); return { role: 'assistant', title: item.title, markdown: 'Here is exactly what matched your request.', fields: entries.map(([label, value]) => ({ label, value })) };
}
function scrollChat() { requestAnimationFrame(() => { const node = document.querySelector('#messages'); if (node) node.scrollTop = node.scrollHeight; }); }
function generateBirthdayMessage(id) { const item = state.items.find(row => row.id === id); state.view = 'assistant'; shell(); askAssistant(`Write a warm, natural birthday message for the person in my saved birthday record titled "${item.title}". Do not reveal or request any private vault values.`); }

async function logSentNotification({ title, category, scheduledAt, sourceId, deliveryKey }) {
  await vaultStore.save({ kind: 'system', type: 'Notification', title, note: 'Telegram delivery receipt', fields: { Category: category, 'Scheduled at': String(scheduledAt), 'Sent at': String(Date.now()), 'Source id': sourceId, 'Delivery key': deliveryKey, Status: 'sent' } });
}

async function checkBirthdayReminders() {
  if (!navigator.onLine) return; const now = Date.now(); const sent = JSON.parse(localStorage.getItem('memoir-reminders-sent') || '{}'); const offsets = [[48 * 3600000, 'in two days'], [24 * 3600000, 'tomorrow'], [5 * 3600000, 'in five hours'], [2 * 3600000, 'in two hours'], [0, 'today']];
  for (const item of memories().filter(row => row.type === 'Birthday' && row.fields?.Date)) {
    const next = nextBirthday(item, new Date(now)); if (!next) continue; const birthday = next.occurrence.getTime(); const occurrenceKey = next.occurrence.toISOString().slice(0, 10);
    for (const [offset, label] of offsets) { const due = birthday - offset; const key = `birthday:${item.id}:${occurrenceKey}:${offset}`; if (!sent[key] && now >= due && now - due < 10 * 60000) { const name = item.title.replace(/['’]s birthday/i, ''); try { const identityToken = await vaultStore.idToken(); if (!identityToken) continue; const response = await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${identityToken}` }, body: JSON.stringify({ action: 'send', reminderKey: key, text: `🎂 Birthday reminder\n\n${name}'s birthday is ${label}.\n${item.note ? `\n📝 ${item.note}` : ''}\n\nOpen Memoir to prepare a thoughtful wish.` }) }); if (response.ok) { const result = await response.json().catch(() => ({})); sent[key] = Date.now(); localStorage.setItem('memoir-reminders-sent', JSON.stringify(sent)); if (!result.deduplicated) await logSentNotification({ title: item.title, category: 'Birthday', scheduledAt: due, sourceId: item.id, deliveryKey: key }); } } catch { /* retry on next interval */ } } }
  }
}

async function applyTelegramActions() {
  if (state.telegramSyncing || state.auth.status !== 'signedIn' || !navigator.onLine) return;
  state.telegramSyncing = true;
  try {
    const queued = await vaultStore.pullTelegramActions(); const acknowledged = [];
    if (queued.length) await withRhinoActivity('Syncing Telegram changes…', async () => {
      for (const entry of queued) {
        const action = entry?.action; if (!action || !['create', 'update', 'delete'].includes(action.op)) { acknowledged.push(entry.queueId); continue; }
        if (action.op === 'delete') {
          if (state.items.some(item => item.id === action.id)) await vaultStore.remove(action.id);
        } else if (action.op === 'update') {
          const item = state.items.find(row => row.id === action.id); if (!item) continue;
          const type = action.type || item.type; const record = { ...item, type, kind: type === 'Clipboard' ? 'clipboard' : 'memory', title: action.title || item.title, note: action.note || item.note || '', fields: { ...allFields(item), ...(action.fields || {}) } };
          await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : record);
        } else {
          const type = action.type || 'Personal'; const record = { id: entry.queueId, type, kind: type === 'Clipboard' ? 'clipboard' : 'memory', title: action.title || (type === 'Reminder' ? 'Untitled reminder' : 'Untitled memory'), note: action.note || '', fields: action.fields || {} };
          await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : record);
        }
        acknowledged.push(entry.queueId);
      }
    });
    if (acknowledged.length) { await vaultStore.acknowledgeTelegramActions(acknowledged); toast(`${acknowledged.length} Telegram ${acknowledged.length === 1 ? 'change' : 'changes'} synced`); }
  } finally { state.telegramSyncing = false; }
}

async function autoCompleteExpiredReminders() {
  if (state.telegramSyncing || state.auth.status !== 'signedIn') return;
  const expired = reminders().filter(item => reminderStatus(item) === 'no-response' && !/^completed$/i.test(String(item.fields?.Status || '')));
  for (const item of expired) {
    const completedAt = new Date().toISOString(); const repeat = reminderRepeat(item); const nextDue = advanceRecurringDue(reminderDue(item), repeat);
    const fields = nextDue ? { ...item.fields, 'Due at': localDateTimeValue(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'no-response', Snoozed: 'No' } : { ...item.fields, Status: 'completed', Completion: 'no-response', 'Completed at': completedAt, Snoozed: 'No' };
    await vaultStore.save(normalizeReminderRecord({ ...item, fields }));
  }
}

async function purgeExpiredNotifications() {
  const cutoff = Date.now() - 14 * 3600000; const expired = notificationRecords().filter(item => Number(item.fields?.['Sent at'] || 0) < cutoff);
  for (const item of expired) await vaultStore.remove(item.id);
}

let lastRuntimeMirror = 0;
async function runBackgroundAutomation() {
  if (state.auth.status !== 'signedIn') return;
  await autoCompleteExpiredReminders(); await purgeExpiredNotifications();
  if (navigator.onLine) {
    if (Date.now() - lastRuntimeMirror > 5 * 60000) { lastRuntimeMirror = Date.now(); vaultStore.mirrorSnapshot(); }
    try { const token = await vaultStore.idToken(); if (token) await fetch('/api/reminders', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch { /* the next interval retries */ }
    await applyTelegramActions(); await checkBirthdayReminders();
  }
}

vaultStore.subscribe((items, status, session) => {
  const wasSignedIn = state.auth.status === 'signedIn'; state.items = items; state.status = status; state.auth = session || state.auth;
  if (state.auth.status === 'signedIn') state.authError = '';
  if (wasSignedIn && state.auth.status === 'signedIn' && document.querySelector('.shell')) { updateSyncUi(); if (!document.querySelector('.detail')) renderView(); }
  else shell();
  if (state.auth.status === 'signedIn') { updateNotificationBadge(); runBackgroundAutomation(); }
});
shell(); vaultStore.init();
setInterval(runBackgroundAutomation, 30000);
setInterval(updateReminderCountdowns, 1000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
  const blocked = event.key === 'F12' || ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(event.key.toLowerCase())) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'u');
  if (blocked) { event.preventDefault(); event.stopPropagation(); toast('Developer shortcuts are disabled in Memoir'); }
}, true);
