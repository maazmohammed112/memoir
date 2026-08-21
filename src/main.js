import './styles.css';
import './brand.css';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import ArrowLeft from 'lucide/dist/esm/icons/arrow-left.mjs';
import ArrowUp from 'lucide/dist/esm/icons/arrow-up.mjs';
import ArrowUpRight from 'lucide/dist/esm/icons/arrow-up-right.mjs';
import AlarmClock from 'lucide/dist/esm/icons/alarm-clock.mjs';
import AudioLines from 'lucide/dist/esm/icons/audio-lines.mjs';
import BadgeCheck from 'lucide/dist/esm/icons/badge-check.mjs';
import BellRing from 'lucide/dist/esm/icons/bell-ring.mjs';
import CakeSlice from 'lucide/dist/esm/icons/cake-slice.mjs';
import Calendar from 'lucide/dist/esm/icons/calendar.mjs';
import Camera from 'lucide/dist/esm/icons/camera.mjs';
import Check from 'lucide/dist/esm/icons/check.mjs';
import CircleCheckBig from 'lucide/dist/esm/icons/circle-check-big.mjs';
import CirclePause from 'lucide/dist/esm/icons/circle-pause.mjs';
import CirclePlay from 'lucide/dist/esm/icons/circle-play.mjs';
import ChevronRight from 'lucide/dist/esm/icons/chevron-right.mjs';
import Circle from 'lucide/dist/esm/icons/circle.mjs';
import Clipboard from 'lucide/dist/esm/icons/clipboard.mjs';
import ClipboardPaste from 'lucide/dist/esm/icons/clipboard-paste.mjs';
import Clock from 'lucide/dist/esm/icons/clock.mjs';
import Copy from 'lucide/dist/esm/icons/copy.mjs';
import CreditCard from 'lucide/dist/esm/icons/credit-card.mjs';
import Ellipsis from 'lucide/dist/esm/icons/ellipsis.mjs';
import Eraser from 'lucide/dist/esm/icons/eraser.mjs';
import Eye from 'lucide/dist/esm/icons/eye.mjs';
import EyeOff from 'lucide/dist/esm/icons/eye-off.mjs';
import ExternalLink from 'lucide/dist/esm/icons/external-link.mjs';
import FileBadge from 'lucide/dist/esm/icons/file-badge.mjs';
import FileText from 'lucide/dist/esm/icons/file-text.mjs';
import Gem from 'lucide/dist/esm/icons/gem.mjs';
import House from 'lucide/dist/esm/icons/house.mjs';
import KeyRound from 'lucide/dist/esm/icons/key-round.mjs';
import Landmark from 'lucide/dist/esm/icons/landmark.mjs';
import LockKeyhole from 'lucide/dist/esm/icons/lock-keyhole.mjs';
import LogOut from 'lucide/dist/esm/icons/log-out.mjs';
import ListTodo from 'lucide/dist/esm/icons/list-todo.mjs';
import Mail from 'lucide/dist/esm/icons/mail.mjs';
import MessageCircle from 'lucide/dist/esm/icons/message-circle.mjs';
import Mic from 'lucide/dist/esm/icons/mic.mjs';
import NotebookText from 'lucide/dist/esm/icons/notebook-text.mjs';
import Paperclip from 'lucide/dist/esm/icons/paperclip.mjs';
import Pencil from 'lucide/dist/esm/icons/pencil.mjs';
import Plus from 'lucide/dist/esm/icons/plus.mjs';
import Search from 'lucide/dist/esm/icons/search.mjs';
import ReceiptText from 'lucide/dist/esm/icons/receipt-text.mjs';
import Send from 'lucide/dist/esm/icons/send.mjs';
import Share2 from 'lucide/dist/esm/icons/share-2.mjs';
import ShieldAlert from 'lucide/dist/esm/icons/shield-alert.mjs';
import ShieldCheck from 'lucide/dist/esm/icons/shield-check.mjs';
import Sparkles from 'lucide/dist/esm/icons/sparkles.mjs';
import Trash2 from 'lucide/dist/esm/icons/trash-2.mjs';
import TriangleAlert from 'lucide/dist/esm/icons/triangle-alert.mjs';
import WandSparkles from 'lucide/dist/esm/icons/wand-sparkles.mjs';
import Wifi from 'lucide/dist/esm/icons/wifi.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';
import { vaultStore } from './store.js';

const nav = [
  ['home', 'House', 'Home'], ['vault', 'Gem', 'Memories'], ['assistant', 'Rhino', 'Rhinous'],
  ['planner', 'ListTodo', 'Planner'], ['capture', 'AudioLines', 'Capture'], ['birthdays', 'CakeSlice', 'Birthdays'],
];
const typeIcons = { Login: 'KeyRound', Finance: 'Landmark', Identity: 'BadgeCheck', 'Government Document': 'FileBadge', Personal: 'NotebookText', Audio: 'AudioLines', Todo: 'ListTodo', Birthday: 'CakeSlice', Reminder: 'AlarmClock', Notification: 'BellRing', 'Wi-Fi': 'Wifi', Clipboard: 'Clipboard' };
const customBrandIcons = {
  WhatsApp: '<path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.42 1.02 2.59.13.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29"/>',
  Telegram: '<path fill="currentColor" d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.693c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>',
  Instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
};
const iconSet = {
  AlarmClock, AudioLines, ArrowLeft, ArrowUp, ArrowUpRight, BadgeCheck, BellRing, CakeSlice, Calendar, Camera,
  Check, ChevronRight, Circle, CircleCheckBig, CirclePause, CirclePlay, Clipboard, ClipboardPaste, Clock,
  Copy, CreditCard, Ellipsis, Eraser, Eye, EyeOff, ExternalLink, FileBadge, FileText, Gem, House, KeyRound, Landmark,
  LockKeyhole, LogOut, ListTodo, Mail, MessageCircle, Mic, NotebookText, Paperclip, Pencil, Plus, ReceiptText, Search,
  Send, Share2, ShieldAlert, ShieldCheck, Sparkles, Trash2, TriangleAlert, WandSparkles, Wifi, X,
};

const fieldMap = {
  Login: ['Username / ID', 'Password'], Finance: ['Account number', 'IFSC code', 'Debit card number', 'Expiry', 'CVV', 'ATM PIN'],
  Identity: ['Document number', 'Document type', 'Issued by', 'Expiry date', 'Soft copy link'],
  'Government Document': ['Document number', 'Reference number', 'Issued by', 'Issued date', 'Expiry date', 'Soft copy link'],
  Personal: ['Value'], Audio: ['Audio Transcript', 'Recorded at'], Todo: ['Todo items', 'Status'], Birthday: ['Date', 'Relation', 'Gift idea', 'Wish note'], 'Wi-Fi': ['Network', 'Password'],
  Reminder: ['Due at', 'Status', 'Snoozed'],
};
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const toastNode = document.querySelector('#toast');
const state = {
  view: 'home', items: [], status: 'loading', hidden: true,
  provider: localStorage.getItem('memoir-provider') || 'gemini', query: '', selectedMemoryId: null, vaultCategory: 'all', messages: [], assistantLog: loadAssistantLog(), chatLoading: false, reminderTab: 'upcoming', todoTab: 'active', telegramSyncing: false,
  auth: { status: 'checking', email: '', message: '', profile: null }, authError: '',
  chatAttachment: null, isRecordingVoice: false, plannerSection: 'todos', captureSection: 'audio', lastResolvedItemId: '', assistantReveals: new Set(),
};

marked.setOptions({ gfm: true, breaks: true });
localStorage.removeItem('memoir-theme');
document.body.classList.remove('dark');

function icon(name, className = '') {
  if (customBrandIcons[name]) {
    return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${customBrandIcons[name]}</svg>`;
  }
  const item = iconSet[name] || Circle;
  const nodes = item.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([key]) => key !== 'key').map(([key, value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${String(value).replace(/"/g, '&quot;')}"`).join(' ')}/>`).join('');
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
}

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function toast(text, tone = '') { toastNode.textContent = text; toastNode.classList.toggle('success', tone === 'success'); toastNode.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => toastNode.classList.remove('show', 'success'), 2400); }
function securityCountdown(timestamp) {
  let remaining = Math.max(0, Number(timestamp || 0) - Date.now());
  const hours = Math.floor(remaining / 3600000); remaining %= 3600000; const minutes = Math.floor(remaining / 60000); const seconds = Math.floor((remaining % 60000) / 1000);
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s` : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function updateSecurityCountdowns() {
  document.querySelectorAll('[data-security-countdown]').forEach(node => {
    const remaining = Number(node.dataset.securityCountdown || 0) - Date.now();
    node.textContent = remaining > 0 ? securityCountdown(node.dataset.securityCountdown) : (node.dataset.expiredLabel || 'Ready');
  });
  document.querySelectorAll('[data-enable-at]').forEach(node => {
    if (node.dataset.permanentDisabled === 'true') { node.disabled = true; return; }
    const waiting = Number(node.dataset.enableAt || 0) > Date.now(); node.disabled = waiting;
    const label = node.querySelector('[data-wait-label]'); if (label) label.textContent = waiting ? `New code in ${securityCountdown(node.dataset.enableAt)}` : 'Send a new code';
  });
}
let activityDepth = 0;
async function withRhinoActivity(label, task) {
  const started = Date.now(); activityDepth += 1; let node = document.querySelector('#rhino-activity');
  if (!node) { node = document.createElement('div'); node.id = 'rhino-activity'; node.className = 'rhino-activity'; node.innerHTML = `<span><img src="/brand/memoir-rhino-ui.png" alt=""></span><strong></strong><i></i>`; document.body.appendChild(node); }
  node.querySelector('strong').textContent = label; requestAnimationFrame(() => node.classList.add('show'));
  try { return await task(); }
  finally { await new Promise(resolve => setTimeout(resolve, Math.max(0, 320 - (Date.now() - started)))); activityDepth = Math.max(0, activityDepth - 1); if (!activityDepth) { node.classList.remove('show'); setTimeout(() => { if (!activityDepth) node.remove(); }, 220); } }
}
function activeProfile() { return state.auth.profile || { name: 'Owner', initials: 'ME', email: state.auth.email || '' }; }
function titleForView() { return { home: `Good morning, ${activeProfile().name}`, vault: 'Your memories', assistant: 'Ask Rhinous', planner: 'Plan and complete', capture: 'Capture library', birthdays: 'Meaningful moments' }[state.view]; }
function category(item) { return item.kind === 'clipboard' ? 'Clipboard' : item.type || 'Personal'; }
function itemIcon(item) { return typeIcons[category(item)] || 'Gem'; }
function allFields(item) { return item.fields || {}; }
function provenanceOf(item) {
  const source = String(item?.provenance?.source || item?.fields?.['Created via'] || item?.fields?.['Audio Source'] || 'Memoir app');
  const isTelegram = /telegram/i.test(source);
  return { source: isTelegram ? 'Telegram' : 'Memoir app', createdAt: item?.provenance?.createdAt || item?.fields?.['Created at'] || item?.fields?.['Recorded at'] || new Date(item?.createdAt || Date.now()).toISOString(), icon: isTelegram ? 'Telegram' : 'Rhino' };
}
function provenanceBadge(item) { const info = provenanceOf(item); return `<button type="button" class="provenance-badge ${info.source === 'Telegram' ? 'telegram' : 'memoir'}" data-provenance="${item.id}" title="Where this was created">${info.icon === 'Telegram' ? icon('Telegram') : '<img src="/brand/memoir-rhino-ui.png" alt="">'}</button>`; }
function showProvenance(id) {
  const item = state.items.find(row => row.id === id); if (!item) return; const info = provenanceOf(item); const created = new Date(info.createdAt); const time = Number.isNaN(created.getTime()) ? 'time unavailable' : created.toLocaleString();
  modal.className = 'modal confirm'; modal.innerHTML = `<div class="modal-inner"><span class="confirm-icon provenance-confirm">${info.source === 'Telegram' ? icon('Telegram') : '<img src="/brand/memoir-rhino-ui.png" alt="">'}</span><div class="modal-head"><div><p class="eyebrow">Creation history</p><h2>Added from ${escapeHtml(info.source)}</h2></div></div><p>“${escapeHtml(item.title)}” was added on ${escapeHtml(time)} using ${escapeHtml(info.source)}.</p><div class="modal-actions"><button class="primary modal-cancel">Done</button></div></div>`; showModal();
}
function safeExternalLink(value) { try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
function externalLinkButton(value, label = 'Open secure link') {
  const url = safeExternalLink(value);
  return url ? `<a class="icon-btn link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon('ExternalLink')}</a>` : '';
}
function fieldInputAttributes(name) {
  if (/^(issued date|expiry date|purchase date)$/i.test(name)) return 'type="date"';
  if (/link$/i.test(name)) return 'type="url" inputmode="url" placeholder="https://drive.google.com/…"';
  if (/number|\bid\b|imei|eid|pin|cvv/i.test(name)) return 'type="text" inputmode="numeric"';
  return 'type="text"';
}
function memoryFieldInput(name, value = '') { return `<label>${escapeHtml(name)}<input data-field="${escapeHtml(name)}" ${fieldInputAttributes(name)} value="${escapeHtml(value)}"></label>`; }
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
  const upcoming = []; const windowEnd = now + 14 * 3600000;
  reminders().filter(item => !reminderIsSnoozed(item) && !['completed', 'no-response'].includes(reminderStatus(item))).forEach(item => {
    const due = reminderDue(item); if (!Number.isFinite(due)) return;
    [[24 * 3600000, '1 day before'], [5 * 3600000, '5 hours before'], [3 * 3600000, '3 hours before'], [2 * 3600000, '2 hours before'], [30 * 60000, '30 minutes before'], [10 * 60000, '10 minutes before'], [0, 'At due time']].forEach(([offset, label]) => {
      const scheduledAt = due - offset; if (scheduledAt >= now && scheduledAt <= windowEnd && scheduledAt >= Number(item.createdAt || 0)) upcoming.push({ id: `reminder:${item.id}:${due}:${offset}`, category: 'Reminder', title: item.title, scheduledAt, label });
    });
  });
  memories().filter(item => item.type === 'Birthday').forEach(item => {
    const next = nextBirthday(item, new Date(now)); if (!next) return; const due = next.occurrence.getTime();
    [[48 * 3600000, '2 days before'], [24 * 3600000, '1 day before'], [5 * 3600000, '5 hours before'], [2 * 3600000, '2 hours before'], [0, 'At midnight']].forEach(([offset, label]) => { const scheduledAt = due - offset; if (scheduledAt >= now && scheduledAt <= windowEnd) upcoming.push({ id: `birthday:${item.id}:${due}:${offset}`, category: 'Birthday', title: item.title, scheduledAt, label }); });
  });
  upcoming.sort((a, b) => a.scheduledAt - b.scheduledAt);
  const sent = notificationRecords().filter(item => { const sentAt = Number(item.fields?.['Sent at'] || 0); return sentAt && sentAt <= now && now - sentAt <= 14 * 3600000; }).sort((a, b) => Number(b.fields?.['Sent at']) - Number(a.fields?.['Sent at']));
  return { upcoming, sent };
}
function notificationTime(timestamp) { return new Date(Number(timestamp)).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
function notificationRows(rows, sent = false) {
  return rows.map(row => { const category = sent ? row.fields?.Category || 'Reminder' : row.category; const timestamp = sent ? row.fields?.['Sent at'] : row.scheduledAt; return `<article class="notification-row"><span class="notification-kind ${String(category).toLowerCase()}">${icon(category === 'Birthday' ? 'CakeSlice' : 'AlarmClock')}</span><div><strong>${escapeHtml(row.title)}</strong><small>${sent ? 'Sent to Telegram' : escapeHtml(row.label)} · ${notificationTime(timestamp)}</small></div><span class="notification-status ${sent ? 'sent' : ''}">${sent ? 'Sent' : 'Upcoming'}</span></article>`; }).join('');
}
function notificationCenterMarkup() {
  const { upcoming, sent } = notificationCenterData(); const reminderUpcoming = upcoming.filter(item => item.category === 'Reminder'); const birthdayUpcoming = upcoming.filter(item => item.category === 'Birthday');
  const section = (title, rows, isSent = false) => `<section class="notification-section"><div class="notification-section-head"><strong>${title}</strong><span>${rows.length}</span></div>${rows.length ? notificationRows(rows, isSent) : `<p class="notification-empty">Nothing here right now.</p>`}</section>`;
  return `<div class="notification-head"><div><p class="eyebrow">Telegram delivery center</p><h2>Notifications</h2></div><button class="modal-close" id="close-notifications">${icon('X')}</button></div><p class="notification-note">Only deliveries due within the next 14 hours appear here. Sent entries stay for the previous 14 hours, then are securely removed from the vault.</p>${section('Next 14 hours · reminders', reminderUpcoming)}${section('Next 14 hours · birthdays', birthdayUpcoming)}${section('Sent in the last 14 hours', sent, true)}`;
}
function toggleNotificationCenter(force) {
  let popover = document.querySelector('.notification-popover'); const shouldOpen = force ?? !popover;
  if (!shouldOpen) { popover?.remove(); return; }
  if (!popover) { popover = document.createElement('aside'); popover.className = 'notification-popover'; document.body.appendChild(popover); }
  const trigger = document.querySelector('#notification-center'); const triggerRect = trigger?.getBoundingClientRect();
  if (triggerRect) popover.style.setProperty('--notification-top', `${Math.round(triggerRect.bottom + 10)}px`);
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
  const profile = activeProfile();
  document.body.classList.remove('auth-locked');
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <button class="brand" data-view="home"><span class="brand-mark"><img src="/brand/pwa-192.png" alt=""></span><span>memoir</span></button>
      <nav class="nav">${navHtml()}</nav>
      <div class="secure-note"><span class="icon-wrap">${icon('ShieldCheck')}</span><strong>Private by design</strong><p>Values are encrypted before cloud sync. AI sees only your vault structure.</p></div>
      <button class="profile" data-logout title="Sign out"><span class="avatar">${escapeHtml(profile.initials)}</span><span><strong>${escapeHtml(profile.name)}</strong><small>Sign out securely</small></span>${icon('LogOut')}</button>
    </aside>
    <main class="content ${state.view === 'assistant' ? 'assistant-content' : ''}">
      <header class="topbar">
        <div class="topbar-copy"><span class="mobile-brand-icon"><img src="/brand/pwa-192.png" alt="Memoir"></span><div><p class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${titleForView()}</h1></div></div>
        <div class="top-actions">
          <div class="global-search"><span>${icon('Search')}</span><input id="global-search" placeholder="Search everything…" autocomplete="off"><span class="key-hint">⌘ K</span></div>
          <span class="sync-pill"><i class="sync-dot ${state.status === 'synced' ? '' : 'offline'}"></i>${syncLabel()}</span>
          <button class="header-rhino-runner" id="header-rhino-assistant" title="Open Rhinous" aria-label="Open Rhinous assistant"><span class="rhino-track" aria-hidden="true"></span><span class="header-rhino-launch" aria-hidden="true"><img src="/brand/memoir-rhino-ui.png" alt=""></span><i></i><i></i><i></i></button>
          <button class="round-btn mobile-search" id="mobile-search-button" title="Search everything">${icon('Search')}</button>
          <button class="round-btn notification-trigger" id="notification-center" title="Notifications" aria-label="Notifications">${icon('BellRing')}<span class="notification-badge" hidden></span></button>
          <button class="round-btn" id="privacy" title="${state.hidden ? 'Reveal values' : 'Hide values'}">${icon(state.hidden ? 'EyeOff' : 'Eye')}</button>
          <button class="round-btn mobile-logout" data-logout title="Sign out">${icon('LogOut')}</button>
          <span class="avatar desktop-avatar">${escapeHtml(profile.initials)}</span>
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
  const status = state.auth.status; const loading = ['checking', 'intro'].includes(status); const selecting = status === 'selectAccount'; const otp = ['otpPending', 'verifyingOtp', 'otpSuccess', 'deviceLimit'].includes(status); const profile = activeProfile();
  const error = state.authError ? `<div class="auth-error" role="alert">${icon('Circle')}<span>${escapeHtml(state.authError)}</span></div>` : '';
  let content;
  if (loading) content = `<div class="auth-loader auth-intro"><span class="auth-pulse"><img src="/brand/memoir-rhino-ui.png" alt=""></span><strong>${status === 'intro' ? 'Memoir' : 'Securing your private vault…'}</strong><p>${status === 'intro' ? 'Your memory. Your control.' : 'Checking this device’s private session.'}</p></div>`;
  else if (selecting) {
    const lockedUntil = Number(state.auth.accountCodeLockedUntil || 0); const locked = lockedUntil > Date.now(); const remaining = state.auth.accountCodeAttemptsRemaining;
    const lockNotice = locked ? `<div class="auth-lock-notice">${icon('LockKeyhole')}<span>Account selection locked. Try again in <strong data-security-countdown="${lockedUntil}"></strong>.</span></div>` : Number.isFinite(remaining) && remaining < 3 ? `<div class="auth-attempts">${remaining} secure attempt${remaining === 1 ? '' : 's'} remaining</div>` : '';
    content = `<div class="auth-copy"><p class="eyebrow">Private account</p><h1>Enter your vault number.</h1><p>${escapeHtml(state.auth.message || 'Use the private 4-digit number assigned to your Memoir account.')}</p></div><form class="auth-form account-code-form ${locked ? 'is-locked' : ''}" id="account-code-form"><label>4-digit account number<input id="account-code" class="account-code-input" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" required autofocus placeholder="••••" ${locked ? `disabled data-enable-at="${lockedUntil}"` : ''}></label>${lockNotice}${error}<button class="primary auth-submit" ${locked ? `disabled data-enable-at="${lockedUntil}"` : ''}>${icon('KeyRound')} Continue securely</button></form><div class="auth-trust">${icon('ShieldCheck')}<span>Three incorrect account numbers lock selection for 4 hours. Your Firebase password and Telegram OTP are still required.</span></div>`;
  }
  else if (otp) {
    const deviceLimit = status === 'deviceLimit';
    const success = status === 'otpSuccess'; const denied = state.auth.verificationState === 'error'; const lockedUntil = Number(state.auth.otpVerifyLockedUntil || 0); const locked = lockedUntil > Date.now();
    const resendAt = Number(state.auth.otpResendAt || 0); const resendWaiting = resendAt > Date.now(); const requestsRemaining = Number(state.auth.otpRequestsRemaining ?? 0); const attemptsRemaining = Number(state.auth.otpAttemptsRemaining ?? 3);
    if (deviceLimit) {
      const activeDevices = (state.auth.activeDevices || []).slice(0, 2).map((device, index) => {
        const signedIn = Number(device.verifiedAt || 0); const when = signedIn ? new Date(signedIn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Active session';
        return `<div class="device-session-row"><span class="device-session-number">${index + 1}</span><div><strong>${escapeHtml(device.name || 'Memoir device')}</strong><span>${escapeHtml(when)}</span></div><i>Active</i></div>`;
      }).join('');
      content = `<div class="auth-copy"><p class="eyebrow">Device protection</p><h1>Maximum login reached.</h1><p>Two devices are already using ${escapeHtml(profile.name)}’s Memoir vault.</p></div><section class="device-limit-panel"><div class="device-limit-heading"><span>${icon('LockKeyhole')}</span><div><strong>Two active devices</strong><p>Your OTP is correct. Choose whether to keep those sessions or continue on this device.</p></div></div><div class="device-session-list">${activeDevices}</div><div class="device-limit-warning">${icon('ShieldCheck')}<span>Logging in here immediately signs out both existing devices, even if their 12-hour sessions have not ended.</span></div></section>${error}<button class="primary auth-submit device-takeover" id="replace-devices">${icon('LogOut')} Login here and sign out both</button><div class="auth-secondary-actions"><button type="button" data-back-login>Keep current devices</button><button type="button" data-switch-account>Switch account</button></div><div class="auth-trust">${icon('ShieldCheck')}<span>Memoir permits a maximum of two verified devices per account. Every normal session still expires after 12 hours.</span></div>`;
    } else {
      const verificationNotice = success ? `<div class="otp-result success">${icon('CircleCheckBig')}<div><strong>OTP verified</strong><span>Opening your encrypted vault securely…</span></div></div>` : locked ? `<div class="otp-result locked">${icon('LockKeyhole')}<div><strong>Verification locked</strong><span>Try again in <b data-security-countdown="${lockedUntil}"></b>.</span></div></div>` : denied ? `<div class="otp-result denied">${icon('X')}<div><strong>Incorrect security code</strong><span>${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before a 4-hour lock.</span></div></div>` : '';
      content = `<div class="auth-copy"><p class="eyebrow">Telegram verification</p><h1>${success ? 'Identity confirmed.' : `Check Telegram, ${escapeHtml(profile.name)}.`}</h1><p>${escapeHtml(state.auth.message || 'Enter the 6-digit code sent to your private Telegram account.')}</p></div>${verificationNotice}<form class="auth-form otp-verification ${success ? 'is-success' : denied ? 'is-denied' : ''}" id="otp-form"><label>6-digit security code<input id="auth-otp" class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required autofocus placeholder="000000" ${success || locked ? `disabled${locked ? ` data-enable-at="${lockedUntil}"` : ''}` : ''}></label>${error}<button class="primary auth-submit" ${status === 'verifyingOtp' || success || locked ? `disabled${locked ? ` data-enable-at="${lockedUntil}"` : ''}` : ''}>${status === 'verifyingOtp' ? '<span class="button-spinner"></span> Verifying securely…' : success ? `${icon('CircleCheckBig')} Verified` : `${icon('ShieldCheck')} Verify and open Memoir`}</button></form><div class="otp-security-meta"><span>Code expires in <strong data-security-countdown="${Number(state.auth.otpExpiresAt || 0)}" data-expired-label="Expired"></strong></span><span>${requestsRemaining} of 3 OTP requests remaining</span></div><div class="auth-secondary-actions"><button type="button" id="resend-otp" data-enable-at="${resendAt}" ${success ? 'data-permanent-disabled="true"' : ''} ${resendWaiting || success ? 'disabled' : ''}><span data-wait-label>${resendWaiting ? `New code in ${securityCountdown(resendAt)}` : 'Send a new code'}</span></button><button type="button" data-back-login ${success ? 'disabled' : ''}>Back to password</button><button type="button" data-switch-account ${success ? 'disabled' : ''}>Switch account</button></div><div class="auth-trust">${icon('ShieldCheck')}<span>Resends require 2 minutes. Three OTP requests lock resends for 12 hours; three incorrect OTPs lock verification for 4 hours.</span></div>`;
    }
  }
  else content = `<div class="auth-copy"><p class="eyebrow">${escapeHtml(profile.name)} · private access</p><h1>Welcome back, ${escapeHtml(profile.name)}.</h1><p>${escapeHtml(state.auth.message || 'Enter your approved Firebase password. A private Telegram code will be required next.')}</p></div><form class="auth-form" id="auth-form"><label>Email address<input id="auth-email" type="email" autocomplete="username" readonly required value="${escapeHtml(profile.email)}" spellcheck="false"></label><label>Password<div class="password-control"><input id="auth-password" type="password" autocomplete="current-password" required autofocus><button type="button" id="toggle-auth-password" aria-label="Show password">${icon('Eye')}</button></div></label>${error}<button class="primary auth-submit" ${status === 'signingIn' ? 'disabled' : ''}>${status === 'signingIn' ? '<span class="button-spinner"></span> Sending Telegram code…' : `${icon('LockKeyhole')} Continue securely`}</button></form><div class="auth-secondary-actions"><button type="button" data-switch-account>${icon('ArrowLeft')} Switch account</button></div><div class="auth-trust">${icon('ShieldCheck')}<span>Email, password, and a user-specific Telegram OTP are required. Every session ends after 12 hours.</span></div>`;
  app.innerHTML = `<main class="auth-shell"><section class="auth-card ${loading ? 'auth-checking' : ''} ${status === 'otpSuccess' ? 'auth-verified' : state.auth.verificationState === 'error' ? 'auth-rejected' : ''}"><div class="auth-brand"><img src="/brand/memoir-rhino-ui.png" alt="Memoir rhino"><span>memoir</span></div>${content}</section><aside class="auth-visual"><img src="/brand/memoir-rhino-ui.png" alt=""><p class="eyebrow">Private by design</p><h2>Your memory.<br>Your control.</h2><p>Each account has its own encrypted browser vault, Firebase collection, AI context, reminders, and Telegram channel.</p></aside></main>`;
  if (!loading) { bindAuthGate(); updateSecurityCountdowns(); }
}

function bindAuthGate() {
  document.querySelector('#account-code-form')?.addEventListener('submit', async event => {
    event.preventDefault(); state.authError = '';
    try { await vaultStore.selectAccount(document.querySelector('#account-code').value); }
    catch (error) { state.authError = `${error.message || 'That account number is not recognized.'}${Number.isFinite(error.remainingAttempts) && error.remainingAttempts > 0 ? ` ${error.remainingAttempts} attempt${error.remainingAttempts === 1 ? '' : 's'} remaining.` : ''}`; shell(); }
  });
  document.querySelector('#toggle-auth-password')?.addEventListener('click', event => { const input = document.querySelector('#auth-password'); const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; event.currentTarget.innerHTML = icon(reveal ? 'EyeOff' : 'Eye'); event.currentTarget.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password'); });
  document.querySelector('#auth-form')?.addEventListener('submit', async event => {
    event.preventDefault(); state.authError = '';
    const email = document.querySelector('#auth-email').value.trim(); const password = document.querySelector('#auth-password').value;
    try { await vaultStore.signIn(email, password); }
    catch (error) {
      state.authError = error?.code === 'auth/unauthorized-owner' ? 'This Firebase login does not belong to the selected private account.' : /invalid-credential|wrong-password|user-not-found|invalid-email/i.test(error?.code || '') ? 'The password is incorrect. Please enter the approved Firebase password.' : error?.code === 'auth/otp-rate-limit' ? `Please wait ${error.retryAfter || 30} seconds before requesting another code.` : /network-request-failed/i.test(error?.code || '') ? 'Memoir could not reach Firebase. Check your connection and try again.' : error.message || 'Secure sign-in could not be completed.';
      shell();
    }
  });
  document.querySelector('#otp-form')?.addEventListener('submit', async event => {
    event.preventDefault(); state.authError = '';
    try { await vaultStore.verifyOtp(document.querySelector('#auth-otp').value); toast('OTP verified — Memoir unlocked', 'success'); }
    catch (error) { state.authError = error?.code === 'auth/device-limit' ? '' : error?.code === 'vault/key-unlock-failed' ? 'The Firebase password cannot unlock this account’s encrypted vault key. Sign in again with the correct password.' : error.message || 'The Telegram code could not be verified.'; shell(); }
  });
  document.querySelector('#replace-devices')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true; event.currentTarget.innerHTML = '<span class="button-spinner"></span> Securing this device…'; state.authError = '';
    try { await vaultStore.replaceActiveDevices(); toast('Logged in here — both earlier devices were signed out', 'success'); }
    catch (error) { state.authError = error.message || 'The existing device sessions could not be replaced.'; shell(); }
  });
  document.querySelector('#auth-otp')?.addEventListener('input', event => {
    event.currentTarget.closest('.otp-verification')?.classList.remove('is-denied');
    document.querySelector('.auth-card')?.classList.remove('auth-rejected'); document.querySelector('.otp-result.denied')?.remove(); document.querySelector('.auth-error')?.remove();
  }, { once: true });
  document.querySelector('#resend-otp')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true; state.authError = '';
    try { await vaultStore.resendOtp(); }
    catch (error) { state.authError = error?.code === 'auth/otp-rate-limit' ? `Please wait ${error.retryAfter || 30} seconds before requesting another code.` : error.message || 'A new code could not be sent.'; shell(); }
  });
  document.querySelectorAll('[data-switch-account]').forEach(button => button.addEventListener('click', () => vaultStore.showAccountSelector()));
  document.querySelectorAll('[data-back-login]').forEach(button => button.addEventListener('click', () => vaultStore.signOut('retry')));
}

function skeleton() { return `<section class="vault-opening"><div class="vault-opening-head"><span class="vault-opening-mark"><img src="/brand/memoir-rhino-ui.png" alt=""></span><div><p class="eyebrow">Encrypted cloud vault</p><h2>Loading your memories…</h2><p>Downloading and decrypting this owner’s latest records. Cached memories will appear instantly on future visits.</p></div><span class="opening-live"><i></i> Secure sync</span></div><div class="opening-grid"><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article></div><div class="opening-list">${Array.from({ length: 4 }, () => `<div class="opening-row"><div class="skeleton opening-avatar"></div><div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></div><div class="skeleton opening-action"></div></div>`).join('')}</div></section>`; }
function currentView() { return ({ home: homeView, vault: vaultView, assistant: assistantView, planner: plannerView, capture: captureView, birthdays: birthdaysView }[state.view] || homeView)(); }
function memories() { return state.items.filter(item => item.kind !== 'clipboard' && !['Reminder', 'Notification', 'Todo'].includes(item.type)); }
function vaultMemories() { return memories().filter(item => item.type !== 'Birthday' && item.type !== 'Audio'); }
function memoryFilterGroup(item) {
  if (item.type === 'Finance') return 'banks';
  if (['Identity', 'Government Document'].includes(item.type)) return 'documents';
  if (item.type === 'Login') return 'logins';
  if (item.type === 'Wi-Fi') return 'wifi';
  return 'personal';
}
function reminders() { return state.items.filter(item => item.type === 'Reminder'); }
function todoLists() { return state.items.filter(item => item.type === 'Todo'); }
function notificationRecords() { return state.items.filter(item => item.type === 'Notification'); }
function clips() { return state.items.filter(item => item.kind === 'clipboard'); }
const audioDataLabels = new Set(['Audio Recording', 'Voice Note', 'Voice Recording']);
const audioMetadataLabels = new Set(['Audio Asset ID', 'Audio MIME type', 'Audio File name', 'Audio Source']);
function audioAttachment(item) {
  const fields = allFields(item);
  const assetId = String(fields['Audio Asset ID'] || '').trim();
  const legacyEntry = Object.entries(fields).find(([label, value]) => audioDataLabels.has(label) && String(value || '').trim());
  if (!assetId && !legacyEntry) return null;
  return {
    assetId,
    data: legacyEntry?.[1] || '',
    mimeType: fields['Audio MIME type'] || String(legacyEntry?.[1] || '').match(/^data:([^;]+);base64,/i)?.[1] || 'audio/webm',
    fileName: fields['Audio File name'] || 'Voice memo',
    source: fields['Audio Source'] || 'Memoir app',
    transcript: fields['Audio Transcript'] || '',
    recordedAt: fields['Recorded at'] || item.createdAt,
  };
}
function audioMemories() { return memories().filter(item => audioAttachment(item)).sort((a, b) => { const aTime = new Date(audioAttachment(a)?.recordedAt || a.createdAt || 0).getTime() || 0; const bTime = new Date(audioAttachment(b)?.recordedAt || b.createdAt || 0).getTime() || 0; return bTime - aTime; }); }
function safeLegacyAudio(value) {
  const source = String(value || '').trim();
  if (/^data:audio\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(source)) return source.replace(/\s+/g, '');
  if (/^[a-z0-9+/=\s]+$/i.test(source) && source.length > 16) return `data:audio/webm;base64,${source.replace(/\s+/g, '')}`;
  return '';
}
function audioPlayerMarkup(attachment, title = 'Voice memo') {
  if (!attachment) return '';
  const legacy = safeLegacyAudio(attachment.data);
  return `<div class="voice-memo-player audio-player-card">
    <div class="voice-memo-head"><span class="icon-wrap violet">${icon('AudioLines')}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(attachment.source || 'Encrypted audio memory')}</small></div></div>
    <audio controls preload="metadata" ${legacy ? `src="${escapeHtml(legacy)}"` : ''} ${attachment.assetId ? `data-audio-asset="${escapeHtml(attachment.assetId)}"` : ''}></audio>
    ${attachment.assetId ? '<span class="audio-load-state">Loading encrypted recording…</span>' : ''}
  </div>`;
}
function normalizedField(fields, names) { const entries = Object.entries(fields || {}); for (const name of names) { const match = entries.find(([label]) => label.toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase().replace(/[^a-z]/g, '')); if (match) return match[1]; } return ''; }
function cardDetails(fields = {}) {
  return {
    number: normalizedField(fields, ['Card Number', 'Debit Card', 'Debit Card Number', 'Credit Card Number']),
    bank: normalizedField(fields, ['Bank', 'Bank Name']), type: normalizedField(fields, ['Card Type', 'Debit Card Type']),
    holder: normalizedField(fields, ['Card Holder Name', 'Cardholder Name', 'Holder Name']),
    validFrom: normalizedField(fields, ['Valid From']), validThru: normalizedField(fields, ['Valid Thru', 'Expiry', 'Expiry Date']),
    cvv: normalizedField(fields, ['CVV', 'Security Code']),
  };
}
function isCardRecord(item) { return item?.type === 'Finance' && Boolean(cardDetails(allFields(item)).number); }

const EXPIRY_NOTIFICATION_OFFSETS = [
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

function parseExpiryDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
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
  const ymdMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10), 23, 59, 59).getTime();
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10), 23, 59, 59).getTime();
  }
  const parsed = new Date(str).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatRemainingTime(expiryTimestamp, now = Date.now()) {
  const diffMs = expiryTimestamp - now;
  if (diffMs <= 0) {
    const daysAgo = Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000));
    return { text: daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo}d ago`, isCritical: true, isExpired: true, monthsRemaining: 0, daysRemaining: 0 };
  }
  const totalDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const monthsRemaining = diffMs / (30 * 24 * 60 * 60 * 1000);
  const isCritical = monthsRemaining <= 5.0;
  const expDate = new Date(expiryTimestamp);
  const nowDate = new Date(now);
  let years = expDate.getFullYear() - nowDate.getFullYear();
  let months = expDate.getMonth() - nowDate.getMonth();
  let days = expDate.getDate() - nowDate.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(expDate.getFullYear(), expDate.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  let text = '';
  if (years > 0) text = `${years} yr${months > 0 ? ` ${months} mo` : ''} left`;
  else if (months > 0) text = `${months} mo${days > 0 ? ` ${days} d` : ''} left`;
  else text = `${totalDays} day${totalDays === 1 ? '' : 's'} left`;
  return { text, isCritical, isExpired: false, monthsRemaining, daysRemaining: totalDays };
}

function extractItemExpiry(item, now = Date.now()) {
  if (!item || !item.fields) return null;
  const fields = allFields(item);
  const fieldEntries = Object.entries(fields);
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
  const title = String(item.title || '');
  const type = String(item.type || '');
  const cardEntry = fieldEntries.find(([k]) => /\b(card\s*number|debit|credit|account|number)\b/i.test(k));
  const cardNum = cardEntry ? String(cardEntry[1] || '') : '';
  const isCard = isCardRecord(item) || /card/i.test(type) || /card/i.test(title) || Boolean(cardNum) || type === 'Finance';
  let last4 = '';
  if (cardNum) { const d = String(cardNum).replace(/\D/g, ''); if (d.length >= 4) last4 = d.slice(-4); }
  if (!last4) { const m = title.match(/(\d{4})/); if (m) last4 = m[1]; }
  const bankEntry = fieldEntries.find(([k]) => /^(bank|bank\s*name|issuer|provider)$/i.test(k.trim()));
  const bank = bankEntry ? String(bankEntry[1] || '') : '';
  const docEntry = fieldEntries.find(([k]) => /^(document\s*number|passport\s*number|license\s*number|policy\s*number|id\s*number|doc\s*#)$/i.test(k.trim()));
  const docNum = docEntry ? String(docEntry[1] || '') : '';
  return { item, itemId: item.id, title: item.title, type: item.type, expiryField: expiryEntry[0], rawExpiry, expiryTimestamp: timestamp, status, isCard, last4, bank, docNum };
}


function expiringMemories() {
  return state.items.filter(item => item.type !== 'Notification' && item.type !== 'Reminder').map(item => extractItemExpiry(item)).filter(Boolean).sort((a, b) => a.expiryTimestamp - b.expiryTimestamp);
}

function criticalExpiringMemories() {
  return expiringMemories().filter(e => e.status.isCritical);
}

function paymentCard(title, fields, compact = false) {
  const card = cardDetails(fields); if (!card.number) return '';
  const digits = String(card.number).replace(/\D/g, ''); const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
  const displayNumber = state.hidden ? `•••• •••• •••• ${digits.slice(-4)}` : grouped;
  const theme = ['onyx', 'violet', 'coral'][Array.from(String(title)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3];
  const expiryInfo = extractItemExpiry({ title, fields, type: 'Finance' });
  const expiryBadge = expiryInfo ? `<span class="card-expiry-tag ${expiryInfo.status.isCritical ? 'critical' : ''}">${expiryInfo.status.isCritical ? icon('ShieldAlert') : icon('Calendar')} ${escapeHtml(expiryInfo.status.text)}</span>` : '';
  return `<article class="payment-card ${compact ? 'compact' : ''} card-${theme}"><div class="payment-card-glow"></div><div class="payment-card-head"><span>${escapeHtml(card.bank || title)}</span>${expiryBadge || `<small>${escapeHtml(card.type || 'Debit card')}</small>`}</div><div class="payment-card-chip"></div><div class="payment-card-number"><span>${escapeHtml(displayNumber)}</span><button data-copy="${escapeHtml(card.number)}" title="Copy card number">${icon('Copy')}</button></div><div class="payment-card-meta">${card.holder ? `<div><small>Card holder</small><strong>${escapeHtml(card.holder)}</strong></div>` : ''}${card.validFrom ? `<div><small>Valid from</small><strong>${escapeHtml(card.validFrom)}</strong></div>` : ''}${card.validThru ? `<div><small>Valid thru</small><strong>${escapeHtml(card.validThru)}</strong></div>` : ''}${card.cvv ? `<div><small>CVV</small><strong>${escapeHtml(state.hidden ? '•••' : card.cvv)}</strong></div>` : ''}</div></article>`;
}

function memoryCard(item) {
  const expiryInfo = extractItemExpiry(item);
  const expiryChip = expiryInfo ? `<span class="chip expiry-chip ${expiryInfo.status.isCritical ? 'critical' : ''}">${expiryInfo.status.isCritical ? icon('ShieldAlert') : icon('Calendar')} ${escapeHtml(expiryInfo.status.text)}</span>` : '';
  return `<article class="memory-card" data-open="${item.id}" tabindex="0"><div class="memory-card-origin"><span class="icon-wrap ${category(item) === 'Finance' ? 'green' : ''}">${icon(itemIcon(item))}</span>${provenanceBadge(item)}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || Object.keys(allFields(item)).join(' · '))}</p><div class="memory-card-foot"><span class="chip">${escapeHtml(category(item))}</span>${expiryChip}<div class="card-action-triggers"><button type="button" class="icon-btn-mini" data-share="${item.id}" title="Share fields">${icon('Share2')}</button><span class="card-open-arrow">${icon('ArrowUpRight')}</span></div></div></article>`;
}
function reminderCard(item, compact = false) {
  const status = reminderStatus(item); const snoozed = reminderIsSnoozed(item); const completed = status === 'completed' || status === 'no-response';
  const due = reminderDue(item); const label = status === 'no-response' ? 'Completed · no response' : status === 'completed' ? 'Completed by you' : `<span data-reminder-countdown="${Number.isFinite(due) ? due : ''}" data-prefix="${snoozed ? 'Snoozed · ' : ''}">${snoozed ? 'Snoozed · ' : ''}${liveCountdownText(due)}</span>`;
  const repeat = reminderRepeat(item);
  return `<article class="reminder-card reminder-${status} ${snoozed ? 'is-snoozed' : ''} ${compact ? 'compact' : ''}" data-searchable="${escapeHtml(searchable(item))}"><span class="reminder-accent"></span><div class="reminder-icon">${icon(completed ? 'CircleCheckBig' : snoozed ? 'CirclePause' : 'AlarmClock')}</div><div class="reminder-copy"><div class="reminder-title-line"><h3>${escapeHtml(item.title)}</h3><span class="reminder-state">${completed ? escapeHtml(label) : label}</span></div><p class="reminder-time">${formatDue(item)} · ${reminderNotificationCount(item)} notification${reminderNotificationCount(item) === 1 ? '' : 's'} remaining${repeat !== 'none' ? ` · Repeats ${escapeHtml(repeat)}` : ''}</p>${item.note ? `<p class="reminder-note">${escapeHtml(item.note)}</p>` : ''}</div><div class="reminder-actions">${!completed ? `<button class="icon-btn complete" data-reminder-complete="${item.id}" title="Mark completed">${icon('CircleCheckBig')}</button><button class="icon-btn" data-reminder-snooze="${item.id}" title="${snoozed ? 'Resume notifications' : 'Snooze notifications'}">${icon(snoozed ? 'CirclePlay' : 'CirclePause')}</button>` : status === 'no-response' ? `<button class="icon-btn complete" data-reminder-complete="${item.id}" title="Confirm completed">${icon('CircleCheckBig')}</button>` : ''}<button class="icon-btn" data-reminder-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-reminder-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`;
}
function homeView() {
  const upcomingReminders = reminders().filter(item => reminderStatus(item) === 'upcoming').sort((a, b) => reminderDue(a) - reminderDue(b));
  const criticalExpiries = criticalExpiringMemories();
  const expiriesHtml = criticalExpiries.length ? `
    <div class="section-head"><h2 style="color:var(--danger)">Expiring soon (under 5 months)</h2><button class="text-btn" data-view="vault">View all</button></div>
    <div class="dashboard-expiries">${criticalExpiries.map(exp => `
      <article class="expiry-card" data-open="${exp.itemId}" tabindex="0">
        <div class="expiry-card-main">
          <span class="icon-wrap ${exp.isCard ? 'green' : 'violet'}">${icon(exp.isCard ? 'CreditCard' : 'FileText')}</span>
          <div>
            <h3>${escapeHtml(exp.title)}</h3>
            <p>${escapeHtml(exp.isCard ? (exp.bank ? exp.bank + ' · ' : '') + (exp.last4 ? '•••• ' + exp.last4 : 'Card') : (exp.docNum ? 'Doc #' + exp.docNum : exp.type))}</p>
          </div>
        </div>
        <div class="expiry-card-foot">
          <span class="chip expiry-chip critical">${icon('ShieldAlert')} ${escapeHtml(exp.status.text)}</span>
          <div class="card-action-triggers"><button type="button" class="icon-btn-mini" data-share="${exp.itemId}" title="Share fields">${icon('Share2')}</button><span class="card-open-arrow">${icon('ArrowUpRight')}</span></div>
        </div>
      </article>
    `).join('')}</div>` : '';

  return `<div class="hero-grid"><section class="hero"><img class="hero-rhino" src="/brand/memoir-rhino-ui.png" alt=""><p class="eyebrow">Your private second brain</p><h2>Everything important, remembered beautifully.</h2><p>Save private details, retrieve only what you need, and never miss a meaningful moment.</p><button class="primary" data-add="memory">${icon('Plus')} Add a memory</button></section>
  <div class="stat-grid"><article class="stat large"><span class="stat-symbol rose">${icon('ShieldCheck')}</span><div><strong>${memories().length}</strong><span>memories kept safe</span></div></article><article class="stat"><span class="stat-symbol violet">${icon('AlarmClock')}</span><div><strong>${upcomingReminders.length}</strong><span>upcoming reminders</span></div></article><article class="stat"><span class="stat-symbol green">${icon('Clipboard')}</span><div><strong>${clips().length}</strong><span>clipboard items</span></div></article></div></div>
  ${expiriesHtml}
  ${upcomingReminders.length ? `<div class="section-head"><h2>Coming up</h2><button class="text-btn" data-view="reminders">All reminders</button></div><div class="dashboard-reminders">${upcomingReminders.slice(0, 3).map(item => reminderCard(item, true)).join('')}</div>` : ''}
  <div class="section-head"><h2>Recently remembered</h2><button class="text-btn" data-view="vault">View everything</button></div>
  ${memories().length ? `<div class="card-grid">${memories().slice(0, 3).map(memoryCard).join('')}</div>` : emptyState('Gem', 'Your vault is ready', 'Add your first memory. No demo records are included.', 'Add memory', 'memory')}`;
}
function vaultRow(item) {
  const filterGroup = memoryFilterGroup(item);
  const expiryInfo = extractItemExpiry(item);
  const expiryChip = expiryInfo ? `<span class="chip expiry-chip ${expiryInfo.status.isCritical ? 'critical' : ''}">${expiryInfo.status.isCritical ? icon('ShieldAlert') : icon('Calendar')} ${escapeHtml(expiryInfo.status.text)}</span>` : '';
  if (isCardRecord(item)) return `<article class="finance-memory" data-filter-group="${filterGroup}" data-searchable="${escapeHtml(searchable(item))}">${paymentCard(item.title, allFields(item))}<div class="finance-memory-foot"><div><h3>${escapeHtml(item.title)}</h3><p>${Object.keys(allFields(item)).length} encrypted fields · ${escapeHtml(item.note || 'Banking memory')}</p></div>${provenanceBadge(item)}${expiryChip}<span class="chip">${icon('LockKeyhole')} Protected</span><div class="row-actions"><button class="icon-btn" data-open="${item.id}" title="Open">${icon('ArrowUpRight')}</button><button class="icon-btn" data-share="${item.id}" title="Share fields">${icon('Share2')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></div></article>`;
  return `<article class="vault-row" data-filter-group="${filterGroup}" data-searchable="${escapeHtml(searchable(item))}"><span class="icon-wrap ${item.type === 'Finance' ? 'green' : ''}">${icon(itemIcon(item))}</span><div class="vault-info"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(category(item))} · ${Object.keys(allFields(item)).length} encrypted fields · ${escapeHtml(item.note || 'No note')}</p></div>${provenanceBadge(item)}${expiryChip}<span class="chip">${icon('LockKeyhole')} Protected</span><div class="row-actions"><button class="icon-btn" data-open="${item.id}" title="Open">${icon('ArrowUpRight')}</button><button class="icon-btn" data-share="${item.id}" title="Share fields">${icon('Share2')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`;
}


function detailMarkup(item) {
  const fields = allFields(item);
  const attachment = audioAttachment(item);
  const audioPlayer = audioPlayerMarkup(attachment, 'Voice Memo Audio');

  const displayFields = Object.entries(fields).filter(([k]) => !audioDataLabels.has(k) && !audioMetadataLabels.has(k));

  const backLabel = state.view === 'audio' ? 'Back to audio' : 'Back to memories';
  return `<section class="detail"><button class="secondary" id="back-to-memories">${icon('ArrowLeft')} ${backLabel}</button><div class="detail-head"><span class="icon-wrap">${icon(itemIcon(item))}</span><div><p class="eyebrow">${escapeHtml(category(item))}</p><h2>${escapeHtml(item.title)}</h2></div>${provenanceBadge(item)}</div>${isCardRecord(item) ? paymentCard(item.title, fields) : ''}${audioPlayer}<div class="detail-fields ${isCardRecord(item) ? 'with-card' : ''}">${displayFields.map(([label, value]) => `<div class="detail-field"><div><small>${escapeHtml(label)}</small><strong class="${state.hidden ? 'blur' : ''}">${escapeHtml(value)}</strong></div><span class="field-actions">${externalLinkButton(value, `Open ${label}`)}<button class="icon-btn" data-copy="${escapeHtml(value)}" title="Copy">${icon('Copy')}</button></span></div>`).join('')}</div><p style="color:var(--muted);font-size:11px">${escapeHtml(item.note || '')}</p><div class="modal-actions" style="justify-content:flex-start"><button class="secondary" data-share="${item.id}">${icon('Share2')} Share</button>${attachment ? `<button class="secondary" data-audio-retry="${item.id}">${icon('AudioLines')} Transcribe again</button><button class="secondary" data-audio-transcript-edit="${item.id}">${icon('Pencil')} Edit transcript</button>` : `<button class="secondary" data-edit="${item.id}">${icon('Pencil')} Edit</button>`}<button class="ghost" data-delete="${item.id}">${icon('Trash2')} Delete</button></div></section>`;
}

function vaultView() {
  const selected = state.items.find(item => item.id === state.selectedMemoryId);
  if (selected && selected.type !== 'Birthday') return detailMarkup(selected);
  state.selectedMemoryId = null;
  const all = vaultMemories();
  const filters = [['all', 'All'], ['banks', 'Banks'], ['documents', 'Documents'], ['logins', 'Logins'], ['wifi', 'Wi-Fi'], ['personal', 'Personal']];
  const counts = Object.fromEntries(filters.map(([id]) => [id, id === 'all' ? all.length : all.filter(item => memoryFilterGroup(item) === id).length]));
  const availableFilters = filters.filter(([id]) => id === 'all' || counts[id]);
  if (!availableFilters.some(([id]) => id === state.vaultCategory)) state.vaultCategory = 'all';
  const list = state.vaultCategory === 'all' ? all : all.filter(item => memoryFilterGroup(item) === state.vaultCategory);
  const filterBar = `<div class="memory-filters" role="tablist" aria-label="Filter memories by category">${availableFilters.map(([id, label]) => `<button type="button" role="tab" aria-selected="${state.vaultCategory === id}" class="${state.vaultCategory === id ? 'active' : ''}" data-vault-category="${id}"><span>${escapeHtml(label)}</span><b>${counts[id]}</b></button>`).join('')}</div>`;
  const empty = all.length ? emptyState('Search', `No ${filters.find(([id]) => id === state.vaultCategory)?.[1] || ''} memories`, 'Choose another category or add a new memory.', 'Add memory', 'memory') : emptyState('Gem', 'Nothing saved yet', 'Start with a login, bank record, document, Wi-Fi detail, or anything personal.', 'Add first memory', 'memory');
  return `<div class="toolbar"><input class="search-input" id="vault-filter" placeholder="Filter titles, notes, fields or values…"><button class="secondary" id="bulk-import">${icon('NotebookText')} Secure import</button><button class="primary" data-add="memory">${icon('Plus')} Add memory</button></div>${filterBar}${list.length ? `<div class="vault-list" id="vault-list">${list.map(vaultRow).join('')}</div>` : empty}`;
}
function audioView() {
  const selected = state.items.find(item => item.id === state.selectedMemoryId);
  if (selected && audioAttachment(selected)) return detailMarkup(selected);
  state.selectedMemoryId = null;
  const records = audioMemories();
  return `<section class="audio-hero"><div><p class="eyebrow">Encrypted voice library</p><h2>Every recording, ready to replay.</h2><p>Record in Memoir or send a Telegram voice note. Audio and transcripts stay isolated to this account.</p></div><button class="primary" id="audio-upload-main">${icon('Plus')} Upload audio</button></section>
  <input type="file" id="audio-upload-input-main" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac" hidden>
  ${records.length ? `<div class="audio-grid">${records.map(item => { const attachment = audioAttachment(item); const recorded = attachment?.recordedAt ? new Date(attachment.recordedAt) : new Date(item.createdAt); const validDate = !Number.isNaN(recorded.getTime()); const status = String(item.fields?.['Transcription status'] || ''); const needsRetry = !/^completed|edited/i.test(status); return `<article class="audio-memory-card">${audioPlayerMarkup(attachment, item.title)}<div class="audio-memory-copy"><span>${validDate ? escapeHtml(recorded.toLocaleString()) : 'Recording date unavailable'}</span><b class="transcription-state ${needsRetry ? 'pending' : 'ready'}">${escapeHtml(status || 'Saved')}</b><p>${escapeHtml(attachment?.transcript || item.note || 'No transcript available')}</p></div><div class="audio-card-footer">${provenanceBadge(item)}<div class="row-actions"><button class="icon-btn" data-open="${item.id}" data-open-view="audio" title="Open details">${icon('ArrowUpRight')}</button>${needsRetry ? `<button class="icon-btn" data-audio-retry="${item.id}" title="Try transcription again">${icon('AudioLines')}</button>` : ''}<button class="icon-btn" data-audio-transcript-edit="${item.id}" title="Edit transcript">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></div></article>`; }).join('')}</div>` : emptyState('AudioLines', 'No audio memories yet', 'Record in Rhinous, upload an audio file, or send a Telegram voice note.', 'Upload audio', 'audio-upload')}`;
}

function parseTodoItems(item) {
  try {
    const parsed = JSON.parse(String(item?.fields?.['Todo items'] || '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, index) => ({ id: String(row?.id || `${item.id}-${index}`), text: String(row?.text || '').slice(0, 240), done: Boolean(row?.done), amount: row?.amount === '' || row?.amount == null ? '' : Math.max(0, Number(row.amount) || 0) })).filter(row => row.text);
  } catch { return []; }
}
function todoItemsFromFields(fields) { try { const rows = JSON.parse(String(fields?.['Todo items'] || '[]')); return Array.isArray(rows) ? rows.map(row => String(row?.text || '').trim()).filter(Boolean) : []; } catch { return splitTodoInput(fields?.['Todo items']); } }
function todoTotal(item) { return parseTodoItems(item).reduce((sum, row) => sum + (row.amount === '' ? 0 : Number(row.amount) || 0), 0); }
function todoStatus(item) { return String(item?.fields?.Status || 'active').toLowerCase() === 'completed' ? 'completed' : 'active'; }
function todoCurrency(value) { return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`; }
function todoCard(item) {
  const rows = parseTodoItems(item); const completed = todoStatus(item) === 'completed'; const done = rows.filter(row => row.done).length; const total = todoTotal(item); const closed = String(item.fields?.Closed || '').toLowerCase() === 'yes';
  return `<article class="todo-card ${completed ? 'is-completed' : ''}">
    <div class="todo-card-head"><div><span class="todo-kicker">${completed ? 'Completed list' : closed ? 'Totalled list' : 'Active list'}</span><h3>${escapeHtml(item.title)}</h3><p>${done} of ${rows.length} completed${total ? ` · ${todoCurrency(total)}` : ''}</p></div><div class="todo-head-actions">${provenanceBadge(item)}${!completed ? `<button class="icon-btn" data-todo-edit="${item.id}" title="Edit list">${icon('Pencil')}</button>` : ''}<button class="icon-btn" data-todo-receipt="${item.id}" title="View receipt">${icon('ReceiptText')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete list">${icon('Trash2')}</button></div></div>
    <div class="todo-progress"><i style="width:${rows.length ? Math.round(done / rows.length * 100) : 0}%"></i></div>
    <div class="todo-items">${rows.map(row => `<div class="todo-item ${row.done ? 'done' : ''}" data-todo-row="${row.id}"><button class="todo-check" data-todo-toggle="${item.id}" data-row-id="${row.id}" title="${row.done ? 'Mark not done' : 'Mark done'}">${icon(row.done ? 'CircleCheckBig' : 'Circle')}</button><span>${escapeHtml(row.text)}</span><label class="todo-amount"><b>₹</b><input type="number" min="0" step="0.01" inputmode="decimal" placeholder="Amount" value="${row.amount === '' ? '' : escapeHtml(row.amount)}" data-todo-amount="${item.id}" data-row-id="${row.id}" ${completed ? 'disabled' : ''}></label>${!completed ? `<button class="todo-mini" data-todo-edit-row="${item.id}" data-row-id="${row.id}" title="Edit item">${icon('Pencil')}</button><button class="todo-mini danger" data-todo-delete-row="${item.id}" data-row-id="${row.id}" title="Delete item">${icon('Trash2')}</button>` : ''}</div>`).join('')}</div>
    <div class="todo-total"><span>Total amount</span><strong>${todoCurrency(total)}</strong></div>
    <div class="todo-card-actions">${!completed ? `<button class="secondary" data-todo-add-row="${item.id}">${icon('Plus')} Add item</button><button class="secondary" data-todo-close="${item.id}">${icon('ReceiptText')} Close & total</button><button class="primary" data-todo-complete="${item.id}">${icon('CircleCheckBig')} Complete list</button>` : `<button class="primary" data-todo-receipt="${item.id}">${icon('Share2')} Share receipt</button>`}</div>
  </article>`;
}
function todosView() {
  const grouped = { active: todoLists().filter(item => todoStatus(item) === 'active'), completed: todoLists().filter(item => todoStatus(item) === 'completed') };
  const active = grouped[state.todoTab] || grouped.active;
  return `<section class="todo-hero"><div><p class="eyebrow">Lists that add themselves up</p><h2>Plan it. Tick it. Share the total.</h2><p>Create groceries, errands, packing lists, or anything else. Add optional amounts and generate a clean receipt without AI.</p></div><button class="primary" data-add="todo">${icon('Plus')} New to-do list</button></section>
  <div class="todo-tabs">${[['active', 'Active'], ['completed', 'Completed']].map(([id, label]) => `<button class="${state.todoTab === id ? 'active' : ''}" data-todo-tab="${id}">${label}<span>${grouped[id].length}</span></button>`).join('')}</div>
  ${active.length ? `<div class="todo-grid">${active.map(todoCard).join('')}</div>` : emptyState('ListTodo', `No ${state.todoTab} lists`, state.todoTab === 'active' ? 'Create a list and separate items with commas or new lines.' : 'Finished lists and their receipts stay available here.', 'Create to-do list', 'todo')}`;
}
function normalizeTodoRecord(record) {
  const fields = { ...(record.fields || {}) }; let rows;
  try { rows = JSON.parse(String(fields['Todo items'] || '[]')); } catch { rows = splitTodoInput(fields['Todo items']).map(text => ({ text })); }
  if (!Array.isArray(rows)) rows = [];
  rows = rows.map(row => ({ id: String(row?.id || crypto.randomUUID()), text: String(row?.text || '').trim().slice(0, 240), done: Boolean(row?.done), amount: row?.amount === '' || row?.amount == null ? '' : Math.max(0, Number(row.amount) || 0) })).filter(row => row.text).slice(0, 200);
  fields['Todo items'] = JSON.stringify(rows); fields.Status = String(fields.Status || 'active').toLowerCase() === 'completed' ? 'completed' : 'active'; fields.Currency = fields.Currency || 'INR';
  return { ...record, kind: 'memory', type: 'Todo', fields };
}
function clipboardView() {
  return `<div class="toolbar"><button class="primary" id="paste-clipboard">${icon('ClipboardPaste')} Paste current clipboard</button><input class="search-input" id="clip-input" placeholder="Or type or paste content here"><button class="secondary" id="save-clip">Save</button></div>${clips().length ? `<div class="vault-list">${clips().map(item => `<article class="vault-row"><span class="icon-wrap violet">${icon('Clipboard')}</span><div class="vault-info"><h3>${escapeHtml(item.title || 'Untitled clip')}</h3><p class="clip-value">${escapeHtml(item.fields?.Content || '')}</p><p>${new Date(item.createdAt).toLocaleString()}</p></div><div class="row-actions"><button class="icon-btn" data-copy="${escapeHtml(item.fields?.Content || '')}" title="Copy">${icon('Copy')}</button><button class="icon-btn" data-share="${item.id}" title="Share clip">${icon('Share2')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`).join('')}</div>` : emptyState('Clipboard', 'Clipboard vault is empty', 'Paste something, add a useful note, and find it instantly later.', 'Paste clipboard', 'clipboard')}`;
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
function workspaceSwitch(kind, active, options) {
  return `<div class="workspace-switch" role="tablist" aria-label="${kind}">${options.map(([id, glyph, label, detail]) => `<button type="button" role="tab" aria-selected="${active === id}" class="${active === id ? 'active' : ''}" data-workspace-kind="${kind}" data-workspace-section="${id}"><span>${icon(glyph)}</span><b>${label}</b><small>${detail}</small></button>`).join('')}</div>`;
}
function plannerView() {
  const switcher = workspaceSwitch('planner', state.plannerSection, [['todos', 'ListTodo', 'To-do lists', 'Lists, totals and receipts'], ['reminders', 'AlarmClock', 'Reminders', 'Due dates and Telegram alerts']]);
  return `${switcher}<div class="workspace-body">${state.plannerSection === 'reminders' ? remindersView() : todosView()}</div>`;
}
function captureView() {
  const switcher = workspaceSwitch('capture', state.captureSection, [['audio', 'AudioLines', 'Audio', 'Recordings and transcripts'], ['clipboard', 'Clipboard', 'Clipboard', 'Quick saved snippets']]);
  return `${switcher}<div class="workspace-body">${state.captureSection === 'clipboard' ? clipboardView() : audioView()}</div>`;
}
function birthdaysView() {
  const birthdays = memories().filter(item => item.type === 'Birthday').sort((a, b) => (nextBirthday(a)?.occurrence?.getTime() || Infinity) - (nextBirthday(b)?.occurrence?.getTime() || Infinity));
  return `<section class="birthday-hero"><p class="eyebrow">Thoughtful reminders</p><h2>Never miss their moment.</h2><p>Memoir plans Telegram reminders two days before, one day before, five hours before, two hours before, and exactly at midnight.</p><button class="primary" style="margin-top:18px" data-add="birthday">${icon('Plus')} Add birthday</button></section>
  ${birthdays.length ? `<div class="timeline birthday-timeline">${birthdays.map(item => { const next = nextBirthday(item); const nextAge = nextBirthdayAge(item); const when = next?.daysAway === 0 ? 'Today' : next?.daysAway === 1 ? 'Tomorrow' : next ? `In ${next.daysAway} days` : 'Date needed'; return `<article class="timeline-item birthday-item"><div class="birthday-main"><div class="birthday-title-line"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(when)}</span></div><p class="birthday-date">${escapeHtml(formatDate(item.fields?.Date))} · ${escapeHtml(item.fields?.Relation || 'Contact')} · ${escapeHtml(item.note || 'No note')}</p><div class="birthday-age-grid"><div><small>Current age</small><strong>${escapeHtml(currentAgeText(item))}</strong></div><div><small>Next birthday age</small><strong>${nextAge == null ? 'Age unavailable' : escapeHtml(String(nextAge))}</strong></div></div><span class="chip birthday-reminders">${icon('BellRing')} 5 reminders planned</span></div><div class="birthday-actions"><button class="icon-btn" data-birthday-message="${item.id}" title="Generate wish">${icon('WandSparkles')}</button><button class="icon-btn" data-share="${item.id}" title="Share details">${icon('Share2')}</button><button class="icon-btn" data-edit="${item.id}" title="Edit">${icon('Pencil')}</button><button class="icon-btn danger" data-delete="${item.id}" title="Delete">${icon('Trash2')}</button></div></article>`; }).join('')}</div>` : emptyState('CakeSlice', 'No birthdays yet', 'Add someone important and Memoir will plan five thoughtful reminders.', 'Add birthday', 'birthday')}`;
}

function assistantView() {
  const messages = state.messages.length ? state.messages.map(renderMessage).join('') : `<div class="message bot"><strong>RHINOUS</strong><p>Your private vault intelligence. Ask for an exact detail, manage memories, capture warranties/documents from photos, or transcribe voice notes naturally.</p></div>`;
  const attachmentMarkup = state.chatAttachment ? `
    <div class="chat-attachment-bar">
      ${state.chatAttachment.kind === 'audio' ? `<span class="attachment-audio-icon">${icon('AudioLines')}</span>` : `<img src="${state.chatAttachment.previewUrl}" alt="Preview">`}
      <span>${state.chatAttachment.kind === 'audio' ? 'Audio · ' : 'Image · '}${escapeHtml(state.chatAttachment.name || 'Captured document')}</span>
      <button type="button" id="chat-remove-attachment" title="Remove attachment">${icon('X')}</button>
    </div>` : '';
  const voiceIndicator = state.isRecordingVoice ? `
    <div class="chat-voice-indicator">
      <span class="voice-pulse-dot"></span>
      <span>🎙️ Listening… Speak your note, warranty, or reminder</span>
    </div>` : '';

  return `<div class="assistant-layout"><section class="chat"><div class="chat-head"><img class="assistant-logo" src="/brand/memoir-rhino-ui.png" alt=""><div><strong>Rhinous</strong><small>Private vault intelligence</small></div><button class="chat-clear" id="clear-chat" title="Clear conversation" aria-label="Clear conversation">${icon('Eraser')}</button><div class="provider-switch"><button class="${state.provider === 'gemini' ? 'active' : ''}" data-provider="gemini">Gemini</button><button class="${state.provider === 'mistral' ? 'active' : ''}" data-provider="mistral">Mistral</button></div></div><div class="messages" id="messages">${messages}${state.chatLoading ? chatSkeleton() : ''}</div>${attachmentMarkup}${voiceIndicator}<form class="chat-form" id="chat-form"><input type="file" id="chat-camera-input" accept="image/*" capture="environment" hidden><input type="file" id="chat-upload-input" accept="image/*" hidden><input type="file" id="chat-audio-input" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac" hidden><div class="chat-input-row"><button type="button" class="chat-media-btn" id="chat-camera-btn" title="Snap photo of document/warranty">${icon('Camera')}</button><button type="button" class="chat-media-btn" id="chat-upload-btn" title="Upload image or invoice">${icon('Paperclip')}</button><button type="button" class="chat-media-btn" id="chat-audio-upload-btn" title="Upload an audio recording">${icon('AudioLines')}</button><button type="button" class="chat-media-btn ${state.isRecordingVoice ? 'recording' : ''}" id="chat-voice-btn" title="Record a voice memo">${icon('Mic')}</button><input id="chat-query" autocomplete="off" placeholder="${state.chatAttachment ? 'Add notes or tap Send to extract…' : 'Ask Rhinous or dictate memory/reminder…'}"><button class="send" aria-label="Send">${icon('ArrowUp')}</button></div></form></section>
  <aside class="panel"><p class="eyebrow">Smart Multi-Modal</p><h3>Capture, snap & transcribe</h3><div class="suggestions">${['📸 Snap a warranty card or invoice to auto-extract fields', '🎙️ Dictate: “Remember my appliance warranty with 2 years validity”', 'Remind me to renew my passport tomorrow at 6 PM', 'Give me only my EPFO password'].map(text => `<button class="suggestion" data-ask="${escapeHtml(text.replace(/^[📸🎙️]\s*/, ''))}">${escapeHtml(text)}</button>`).join('')}</div><div class="privacy-line">${icon('ShieldCheck')}<span>Smart Capture extracts structured records on device. Credentials stay encrypted in your isolated vault.</span></div></aside></div>`;
}

function renderMessage(message, messageIndex = 0) {
  if (message.role === 'user') return `<div class="message user">${escapeHtml(message.text)}</div>`;
  if (message.fields?.length || message.audios?.length) {
    const fields = message.fields || []; const fieldObject = Object.fromEntries(fields.map(field => [field.label, field.value])); const card = paymentCard(message.title || 'Saved card', fieldObject, true);
    return `<div class="message bot"><strong>${escapeHtml((message.title || 'Saved information').toUpperCase())}</strong>${message.markdown ? safeMarkdown(message.markdown) : ''}${card}${(message.audios || []).map(audio => audioPlayerMarkup(audio, audio.title || 'Voice memo')).join('')}${fields.length ? `<table class="answer-table"><thead><tr><th>Field</th><th>Value</th><th></th></tr></thead><tbody>${fields.map((field, fieldIndex) => { const revealKey = `${messageIndex}:${fieldIndex}`; const visible = !state.hidden || state.assistantReveals.has(revealKey); return `<tr><td>${escapeHtml(field.label)}</td><td><span class="assistant-value ${visible ? 'visible' : 'protected'}">${visible ? escapeHtml(field.value) : '••••••••'}</span></td><td><span class="field-actions">${externalLinkButton(field.value, `Open ${field.label}`)}<button class="copy-field" data-ai-reveal="${revealKey}" title="${visible ? 'Hide value' : 'Reveal value'}" aria-label="${visible ? 'Hide value' : 'Reveal value'}">${icon(visible ? 'Eye' : 'EyeOff')}</button><button class="copy-field" data-copy="${escapeHtml(field.value)}" title="Copy">${icon('Copy')}</button></span></td></tr>`; }).join('')}</tbody></table>` : ''}</div>`;
  }
  if (message.actions?.length) {
    const isSmartCapture = message.actions.some(a => a.fields && (a.fields['Audio Transcript'] || a.fields['Expiry date'] || a.fields['Serial'] || a.fields['Brand'] || a.fields['Model']));
    return `<div class="message bot">${isSmartCapture ? '<span class="smart-capture-badge">Smart Capture Extracted</span>' : ''}<strong>${escapeHtml((message.title || 'Review changes').toUpperCase())}</strong>${message.markdown ? safeMarkdown(message.markdown) : ''}<div class="ai-action-list">${message.actions.map(action => { const visibleCount = Object.keys(action.fields || {}).filter(label => !audioDataLabels.has(label) && !audioMetadataLabels.has(label)).length; const todoPreview = action.type === 'Todo' ? todoItemsFromFields(action.fields) : []; return `<div class="ai-action"><span>${escapeHtml(action.op)}</span><strong>${escapeHtml(action.title || state.items.find(item => item.id === action.id)?.title || 'Memory')}</strong><small>${escapeHtml(action.type || 'Saved item')} · ${action.type === 'Todo' ? `${todoPreview.length} item${todoPreview.length === 1 ? '' : 's'}` : `${visibleCount} detail${visibleCount === 1 ? '' : 's'}`}${action.fields?.['Audio Asset ID'] ? ' · encrypted audio attached' : ''}</small>${todoPreview.length ? `<ul class="ai-todo-preview">${todoPreview.map(text => `<li>${icon('Circle')}<span>${escapeHtml(text)}</span></li>`).join('')}</ul>` : ''}${action.fields?.['Audio Transcript'] ? `<div class="transcript-box"><strong>${icon('Mic')} Audio Transcript</strong><p>${escapeHtml(action.fields['Audio Transcript'])}</p></div>` : ''}</div>`; }).join('')}</div></div>`;
  }
  return `<div class="message bot">${message.title ? `<strong>${escapeHtml(message.title.toUpperCase())}</strong>` : ''}${safeMarkdown(message.markdown || message.text || '')}${message.retryAudioId ? `<button class="secondary ai-retry-audio" data-audio-retry="${escapeHtml(message.retryAudioId)}">${icon('AudioLines')} Try transcription again</button>` : ''}</div>`;
}

function safeMarkdown(text) { return DOMPurify.sanitize(marked.parse(text), { USE_PROFILES: { html: true } }); }
function chatSkeleton() { return `<div class="message bot" style="width:65%"><div class="skeleton" style="height:10px;width:48%;margin-bottom:10px"></div><div class="skeleton" style="height:9px;width:92%;margin-bottom:7px"></div><div class="skeleton" style="height:9px;width:73%"></div></div>`; }
function emptyState(glyph, title, text, action, type) { return `<div class="empty"><span class="icon-wrap">${icon(glyph)}</span><h3>${title}</h3><p>${text}</p><button class="primary" style="margin-top:12px" data-add="${type}">${icon('Plus')} ${action}</button></div>`; }

function bindShell() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => navigate(button.dataset.view));
  document.querySelectorAll('[data-logout]').forEach(button => button.onclick = () => confirmBox('Sign out of Memoir?', 'Your local vault stays encrypted. You will need the approved email and password to enter again.', 'Sign out', 'LogOut', () => vaultStore.signOut()));
  document.querySelector('#privacy').onclick = event => { state.hidden = !state.hidden; event.currentTarget.innerHTML = icon(state.hidden ? 'EyeOff' : 'Eye'); event.currentTarget.title = state.hidden ? 'Reveal values' : 'Hide values'; toast(state.hidden ? 'Sensitive values hidden' : 'Sensitive values visible'); renderView(); };
  const global = document.querySelector('#global-search');
  global?.addEventListener('input', event => showGlobalSearch(event.target.value));
  document.querySelector('#mobile-search-button')?.addEventListener('click', openMobileSearch);
  document.querySelector('#notification-center')?.addEventListener('click', () => toggleNotificationCenter());
  document.querySelector('#header-rhino-assistant')?.addEventListener('click', () => navigate('assistant'));
  document.addEventListener('keydown', shortcutHandler, { once: true });
  bindView();
  updateNotificationBadge();
}
function shortcutHandler(event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#global-search')?.focus(); } document.addEventListener('keydown', shortcutHandler, { once: true }); }
function navigate(viewName) {
  document.querySelector('.notification-popover')?.remove();
  if (viewName === 'todos' || viewName === 'reminders') { state.plannerSection = viewName; viewName = 'planner'; }
  if (viewName === 'audio' || viewName === 'clipboard') { state.captureSection = viewName; viewName = 'capture'; }
  state.view = viewName; state.query = ''; state.selectedMemoryId = null; shell(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderView() { const node = document.querySelector('#view'); if (node) node.innerHTML = currentView(); bindView(); }

function bindView() {
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => button.dataset.add === 'clipboard' ? pasteClipboard() : button.dataset.add === 'reminder' ? openReminderEditor() : button.dataset.add === 'birthday' ? openBirthdayEditor() : button.dataset.add === 'todo' ? openTodoEditor() : button.dataset.add === 'audio-upload' ? document.querySelector('#audio-upload-input-main')?.click() : openEditor(null, 'Personal'));
  document.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openDetail(button.dataset.open, button.dataset.openView || 'vault'));
  document.querySelector('#back-to-memories')?.addEventListener('click', () => { state.selectedMemoryId = null; renderView(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => confirmEdit(button.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.delete));
  document.querySelectorAll('[data-copy]').forEach(button => button.onclick = () => copyText(button.dataset.copy));
  document.querySelectorAll('[data-provider]').forEach(button => button.onclick = () => { state.provider = button.dataset.provider; localStorage.setItem('memoir-provider', state.provider); renderView(); });
  document.querySelectorAll('[data-ai-reveal]').forEach(button => button.onclick = () => { const key = button.dataset.aiReveal; if (state.assistantReveals.has(key)) state.assistantReveals.delete(key); else state.assistantReveals.add(key); renderView(); });
  document.querySelectorAll('[data-workspace-section]').forEach(button => button.onclick = () => { const key = button.dataset.workspaceKind === 'planner' ? 'plannerSection' : 'captureSection'; state[key] = button.dataset.workspaceSection; state.selectedMemoryId = null; renderView(); });
  document.querySelectorAll('[data-ask]').forEach(button => button.onclick = () => askAssistant(button.dataset.ask));
  document.querySelectorAll('[data-birthday-message]').forEach(button => button.onclick = () => generateBirthdayMessage(button.dataset.birthdayMessage));
  document.querySelectorAll('[data-reminder-tab]').forEach(button => button.onclick = () => { state.reminderTab = button.dataset.reminderTab; renderView(); });
  document.querySelectorAll('[data-vault-category]').forEach(button => button.onclick = () => { state.vaultCategory = button.dataset.vaultCategory; renderView(); });
  document.querySelectorAll('[data-reminder-complete]').forEach(button => button.onclick = () => completeReminder(button.dataset.reminderComplete));
  document.querySelectorAll('[data-reminder-snooze]').forEach(button => button.onclick = () => toggleReminderSnooze(button.dataset.reminderSnooze));
  document.querySelectorAll('[data-reminder-edit]').forEach(button => button.onclick = () => openReminderEditor(state.items.find(item => item.id === button.dataset.reminderEdit)));
  document.querySelectorAll('[data-reminder-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.reminderDelete));
  document.querySelectorAll('[data-todo-tab]').forEach(button => button.onclick = () => { state.todoTab = button.dataset.todoTab; renderView(); });
  document.querySelectorAll('[data-todo-edit]').forEach(button => button.onclick = () => openTodoEditor(state.items.find(item => item.id === button.dataset.todoEdit)));
  document.querySelectorAll('[data-todo-toggle]').forEach(button => button.onclick = () => toggleTodoRow(button.dataset.todoToggle, button.dataset.rowId));
  document.querySelectorAll('[data-todo-amount]').forEach(input => input.onchange = () => updateTodoAmount(input.dataset.todoAmount, input.dataset.rowId, input.value));
  document.querySelectorAll('[data-todo-edit-row]').forEach(button => button.onclick = () => editTodoRow(button.dataset.todoEditRow, button.dataset.rowId));
  document.querySelectorAll('[data-todo-delete-row]').forEach(button => button.onclick = () => deleteTodoRow(button.dataset.todoDeleteRow, button.dataset.rowId));
  document.querySelectorAll('[data-todo-add-row]').forEach(button => button.onclick = () => addTodoRow(button.dataset.todoAddRow));
  document.querySelectorAll('[data-todo-close]').forEach(button => button.onclick = () => closeTodo(button.dataset.todoClose));
  document.querySelectorAll('[data-todo-complete]').forEach(button => button.onclick = () => completeTodo(button.dataset.todoComplete));
  document.querySelectorAll('[data-todo-receipt]').forEach(button => button.onclick = () => openTodoReceipt(button.dataset.todoReceipt));
  document.querySelectorAll('[data-audio-retry]').forEach(button => button.onclick = () => retryAudioTranscription(button.dataset.audioRetry));
  document.querySelectorAll('[data-audio-transcript-edit]').forEach(button => button.onclick = () => editAudioTranscript(button.dataset.audioTranscriptEdit));
  document.querySelectorAll('[data-provenance]').forEach(button => button.onclick = event => { event.stopPropagation(); showProvenance(button.dataset.provenance); });
  document.querySelectorAll('[data-share]').forEach(button => button.onclick = event => { event.stopPropagation(); openShareModal(button.dataset.share); });
  document.querySelector('#clear-chat')?.addEventListener('click', () => confirmBox('Clear this conversation?', 'This removes the local Rhinous conversation log. Your saved memories and reminders will not be changed.', 'Clear chat', 'Eraser', () => { state.messages = []; state.assistantLog = []; localStorage.removeItem(assistantLogKey()); renderView(); toast('Conversation cleared'); }));

  document.querySelector('#vault-filter')?.addEventListener('input', event => document.querySelectorAll('[data-searchable]').forEach(row => row.hidden = !row.dataset.searchable.includes(event.target.value.toLowerCase())));
  document.querySelector('#paste-clipboard')?.addEventListener('click', pasteClipboard);
  document.querySelector('#bulk-import')?.addEventListener('click', openBulkImporter);
  document.querySelector('#save-clip')?.addEventListener('click', () => { const value = document.querySelector('#clip-input').value; if (value.trim()) openClipEditor(value); else toast('Add something to save'); });

  document.querySelector('#chat-camera-btn')?.addEventListener('click', () => document.querySelector('#chat-camera-input')?.click());
  document.querySelector('#chat-camera-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (file) {
      toast('Processing photo…');
      try {
        state.chatAttachment = await compressImageFile(file);
        renderView();
      } catch (err) {
        toast('Could not process photo');
      }
    }
  });

  document.querySelector('#chat-upload-btn')?.addEventListener('click', () => document.querySelector('#chat-upload-input')?.click());
  document.querySelector('#chat-upload-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (file) {
      toast('Processing document…');
      try {
        state.chatAttachment = await compressImageFile(file);
        renderView();
      } catch (err) {
        toast('Could not process document');
      }
    }
  });

  document.querySelector('#chat-audio-upload-btn')?.addEventListener('click', () => document.querySelector('#chat-audio-input')?.click());
  document.querySelector('#chat-audio-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (file) await handleAudioFile(file, 'Memoir upload');
  });
  document.querySelector('#audio-upload-main')?.addEventListener('click', () => document.querySelector('#audio-upload-input-main')?.click());
  document.querySelector('#audio-upload-input-main')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.view = 'assistant'; shell();
    await handleAudioFile(file, 'Memoir upload');
  });

  document.querySelector('#chat-remove-attachment')?.addEventListener('click', () => {
    state.chatAttachment = null;
    renderView();
  });

  document.querySelector('#chat-voice-btn')?.addEventListener('click', toggleVoiceRecording);

  document.querySelector('#chat-form')?.addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#chat-query'); askAssistant(input.value); input.value = ''; });
  hydrateAudioPlayers();
  updateReminderCountdowns();
}


function showGlobalSearch(query) {
  document.querySelector('.search-overlay')?.remove();
  if (!query.trim()) return;
  const matches = state.items.filter(item => item.type !== 'Notification' && searchable(item).includes(query.toLowerCase())).slice(0, 12);
  const overlay = document.createElement('div'); overlay.className = 'search-overlay';
  const groups = [['Memories', matches.filter(item => item.kind !== 'clipboard' && !['Reminder', 'Birthday', 'Audio', 'Todo'].includes(item.type) && !audioAttachment(item))], ['Audio', matches.filter(item => item.type === 'Audio' || audioAttachment(item))], ['To-do Lists', matches.filter(item => item.type === 'Todo')], ['Birthdays', matches.filter(item => item.type === 'Birthday')], ['Reminders', matches.filter(item => item.type === 'Reminder')], ['Clipboard Vault', matches.filter(item => item.kind === 'clipboard')]];
  overlay.innerHTML = groups.filter(([, rows]) => rows.length).map(([label, rows]) => `<section class="search-section"><p class="search-section-title">${label}</p>${rows.map(item => `<button class="search-result" data-result="${item.id}"><span class="icon-wrap">${icon(itemIcon(item))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(category(item))} · ${escapeHtml(item.note || 'Matched a saved field')}</small></span>${icon('ChevronRight')}</button>`).join('')}</section>`).join('') || `<div class="empty" style="padding:30px"><p>No saved result matches “${escapeHtml(query)}”.</p></div>`;
  document.querySelector('.content').appendChild(overlay);
  overlay.querySelectorAll('[data-result]').forEach(button => button.onclick = () => { const item = state.items.find(row => row.id === button.dataset.result); overlay.remove(); if (item.kind === 'clipboard') navigate('clipboard'); else if (item.type === 'Reminder') navigate('reminders'); else if (item.type === 'Todo') navigate('todos'); else if (item.type === 'Birthday') navigate('birthdays'); else if (item.type === 'Audio' || audioAttachment(item)) openDetail(item.id, 'audio'); else openDetail(item.id); });
}
function openMobileSearch() {
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-inner"><div class="modal-head"><div><p class="eyebrow">Global search</p><h2>Find anything</h2></div><button class="modal-close">${icon('X')}</button></div><input class="search-input" id="mobile-global-input" placeholder="Search titles, notes, fields or values…" autocomplete="off"><div id="mobile-results" class="vault-list" style="margin-top:12px"></div></div>`;
  showModal(); const input = document.querySelector('#mobile-global-input'); input.focus();
  input.oninput = () => {
    const query = input.value.trim().toLowerCase(); const results = query ? state.items.filter(item => item.type !== 'Notification' && searchable(item).includes(query)).slice(0, 12) : [];
    document.querySelector('#mobile-results').innerHTML = results.map(item => `<button class="search-result" data-mobile-result="${item.id}"><span class="icon-wrap">${icon(itemIcon(item))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(category(item))} · ${escapeHtml(item.note || 'Matched a saved field')}</small></span>${icon('ChevronRight')}</button>`).join('') || (query ? `<div class="empty" style="padding:28px"><p>No result found.</p></div>` : '');
    document.querySelectorAll('[data-mobile-result]').forEach(button => button.onclick = () => { const item = state.items.find(row => row.id === button.dataset.mobileResult); closeModal(); if (item.kind === 'clipboard') navigate('clipboard'); else if (item.type === 'Reminder') navigate('reminders'); else if (item.type === 'Todo') navigate('todos'); else if (item.type === 'Birthday') navigate('birthdays'); else if (item.type === 'Audio' || audioAttachment(item)) openDetail(item.id, 'audio'); else openDetail(item.id); });
  };
}

async function copyText(text) { try { await navigator.clipboard.writeText(text); toast('Copied securely'); } catch { toast('Clipboard permission was not granted'); } }
const audioObjectUrls = new Map();
async function hydrateAudioPlayers() {
  const players = [...document.querySelectorAll('audio[data-audio-asset]')].filter(player => !player.dataset.audioLoading);
  if (!players.length) return;
  const token = await vaultStore.idToken();
  if (!token) return;
  players.forEach(async player => {
    const assetId = player.dataset.audioAsset; player.dataset.audioLoading = 'true';
    const status = player.parentElement?.querySelector('.audio-load-state');
    try {
      let objectUrl = audioObjectUrls.get(assetId);
      if (!objectUrl) {
        const response = await fetch(`/api/audio?id=${encodeURIComponent(assetId)}`, { headers: vaultStore.apiHeaders(token, false) });
        if (!response.ok) throw new Error('Audio unavailable');
        objectUrl = URL.createObjectURL(await response.blob()); audioObjectUrls.set(assetId, objectUrl);
      }
      player.src = objectUrl; player.load(); if (status) status.textContent = 'Encrypted recording ready';
    } catch { if (status) status.textContent = 'Recording could not be loaded. Check your connection and session.'; }
  });
}
async function deleteAudioAssetForItem(item) {
  const assetId = audioAttachment(item)?.assetId;
  if (!assetId) return;
  try {
    const token = await vaultStore.idToken(); if (!token) return;
    await fetch(`/api/audio?id=${encodeURIComponent(assetId)}`, { method: 'DELETE', headers: vaultStore.apiHeaders(token, false) });
    const objectUrl = audioObjectUrls.get(assetId); if (objectUrl) URL.revokeObjectURL(objectUrl); audioObjectUrls.delete(assetId);
  } catch { /* deleting the memory remains available even if attachment cleanup is retried later */ }
}
async function pasteClipboard() { try { const value = await navigator.clipboard.readText(); if (!value.trim()) return toast('Clipboard is empty'); openClipEditor(value); } catch { toast('Allow clipboard access, or paste manually'); } }
function openBulkImporter() {
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="bulk-form"><div class="modal-head"><div><p class="eyebrow">On-device encrypted import</p><h2>Import multiple memories</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><p class="import-help">Paste a JSON array of memories. Values are parsed and encrypted in this browser, then synced directly to your owner-only Firebase vault.</p><label>Memory JSON<textarea id="bulk-json" rows="12" required spellcheck="false" placeholder='[{"title":"Example login","type":"Login","fields":{"Username":"...","Password":"..."}}]'></textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('ShieldCheck')} Encrypt and import</button></div></form>`;
  showModal();
  document.querySelector('#bulk-form').onsubmit = async event => {
    event.preventDefault(); const submit = event.submitter;
    try {
      const parsed = JSON.parse(document.querySelector('#bulk-json').value); if (!Array.isArray(parsed) || !parsed.length || parsed.length > 100) throw new Error('Use a JSON array containing 1 to 100 memories.');
      const allowedTypes = new Set(['Login', 'Finance', 'Identity', 'Government Document', 'Personal', 'Birthday', 'Wi-Fi']);
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

function splitTodoInput(value) {
  return String(value || '').split(/[,\n]+/).map(text => text.trim()).filter(Boolean).slice(0, 200);
}
function openTodoEditor(item = null) {
  modal.className = 'modal todo-modal';
  const existingText = item ? parseTodoItems(item).map(row => row.text).join('\n') : '';
  modal.innerHTML = `<form class="modal-inner" id="todo-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit list' : 'New to-do list'}</p><h2>${item ? 'Update your list' : 'What are you planning?'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>List title<input id="todo-title" required maxlength="160" placeholder="e.g. Grocery shopping" value="${escapeHtml(item?.title || '')}"></label><label>Items<textarea id="todo-items-input" rows="7" required placeholder="Tomato 2 kg, potato, coriander&#10;Separate items with commas or new lines">${escapeHtml(existingText)}</textarea></label><p class="todo-form-help">Every comma or new line becomes a separate checkable item. Amounts are optional and can be added later.</p><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save list' : 'Create list'}</button></div></form>`;
  showModal();
  document.querySelector('#todo-form').onsubmit = async event => {
    event.preventDefault(); const names = splitTodoInput(document.querySelector('#todo-items-input').value); if (!names.length) return toast('Add at least one list item');
    const previous = item ? parseTodoItems(item) : []; const rows = names.map((text, index) => { const match = previous.find(row => row.text.toLowerCase() === text.toLowerCase()) || previous[index]; return { id: match?.id || crypto.randomUUID(), text, done: Boolean(match?.done), amount: match?.amount ?? '' }; });
    const fields = { ...(item?.fields || {}), 'Todo items': JSON.stringify(rows), Status: item?.fields?.Status || 'active', Currency: 'INR' };
    await withRhinoActivity(item ? 'Updating to-do list…' : 'Creating to-do list…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: 'Todo', title: document.querySelector('#todo-title').value.trim(), note: item?.note || '', fields }));
    closeModal(); state.todoTab = 'active'; state.plannerSection = 'todos'; state.view = 'planner'; renderView(); toast(item ? 'To-do list updated' : 'To-do list created');
  };
}
async function saveTodoRows(item, rows, extraFields = {}) {
  return vaultStore.save({ ...item, fields: { ...item.fields, ...extraFields, 'Todo items': JSON.stringify(rows) } });
}
async function toggleTodoRow(itemId, rowId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return; const rows = parseTodoItems(item); const row = rows.find(entry => entry.id === rowId); if (!row) return; row.done = !row.done;
  await saveTodoRows(item, rows); renderView();
}
async function updateTodoAmount(itemId, rowId, value) {
  const item = state.items.find(row => row.id === itemId); if (!item) return; const rows = parseTodoItems(item); const row = rows.find(entry => entry.id === rowId); if (!row) return; row.amount = value === '' ? '' : Math.max(0, Number(value) || 0);
  await saveTodoRows(item, rows); renderView();
}
function editTodoRow(itemId, rowId) {
  const item = state.items.find(row => row.id === itemId); const row = parseTodoItems(item).find(entry => entry.id === rowId); if (!item || !row) return;
  modal.className = 'modal confirm'; modal.innerHTML = `<form class="modal-inner" id="todo-row-form"><div class="modal-head"><div><p class="eyebrow">List item</p><h2>Edit this item</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Item name<input id="todo-row-name" required maxlength="240" value="${escapeHtml(row.text)}"></label><label>Amount (optional)<input id="todo-row-amount" type="number" min="0" step="0.01" inputmode="decimal" value="${row.amount === '' ? '' : escapeHtml(row.amount)}"></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} Save item</button></div></form>`; showModal();
  document.querySelector('#todo-row-form').onsubmit = async event => { event.preventDefault(); const rows = parseTodoItems(item); const target = rows.find(entry => entry.id === rowId); target.text = document.querySelector('#todo-row-name').value.trim(); const amount = document.querySelector('#todo-row-amount').value; target.amount = amount === '' ? '' : Math.max(0, Number(amount) || 0); await saveTodoRows(item, rows); closeModal(); renderView(); toast('List item updated'); };
}
function addTodoRow(itemId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  modal.className = 'modal confirm'; modal.innerHTML = `<form class="modal-inner" id="todo-row-form"><div class="modal-head"><div><p class="eyebrow">Add item</p><h2>What else do you need?</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Item name<input id="todo-row-name" required maxlength="240" autofocus></label><label>Amount (optional)<input id="todo-row-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Plus')} Add item</button></div></form>`; showModal();
  document.querySelector('#todo-row-form').onsubmit = async event => { event.preventDefault(); const amount = document.querySelector('#todo-row-amount').value; const rows = [...parseTodoItems(item), { id: crypto.randomUUID(), text: document.querySelector('#todo-row-name').value.trim(), done: false, amount: amount === '' ? '' : Math.max(0, Number(amount) || 0) }]; await saveTodoRows(item, rows); closeModal(); renderView(); toast('Item added'); };
}
function deleteTodoRow(itemId, rowId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return; const row = parseTodoItems(item).find(entry => entry.id === rowId);
  confirmBox('Delete this list item?', `“${row?.text || 'This item'}” will be removed from the list.`, 'Delete item', 'Trash2', async () => { await saveTodoRows(item, parseTodoItems(item).filter(entry => entry.id !== rowId)); renderView(); toast('List item deleted'); });
}
function closeTodo(itemId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  confirmBox('Close and calculate this list?', `Memoir will lock in the current ${todoCurrency(todoTotal(item))} total. You can still adjust or complete the list afterward.`, 'Close & total', 'ReceiptText', async () => { await saveTodoRows(item, parseTodoItems(item), { Closed: 'Yes', 'Closed at': new Date().toISOString(), Total: String(todoTotal(item)) }); renderView(); openTodoReceipt(itemId); });
}
function completeTodo(itemId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  confirmBox('Complete this to-do list?', 'The list will move to Completed. Its receipt and sharing options remain available.', 'Complete list', 'CircleCheckBig', async () => { await saveTodoRows(item, parseTodoItems(item), { Status: 'completed', Closed: 'Yes', 'Completed at': new Date().toISOString(), Total: String(todoTotal(item)) }); state.todoTab = 'completed'; renderView(); toast('To-do list completed', 'success'); });
}
function todoReceiptText(item) {
  const rows = parseTodoItems(item); const date = new Date(item.fields?.['Closed at'] || item.fields?.['Completed at'] || Date.now()).toLocaleString('en-IN');
  return [`MEMOIR · ${activeProfile().name}`, item.title, date, '', ...rows.map((row, index) => `${String(index + 1).padStart(2, '0')}. ${row.done ? '✓' : '○'} ${row.text}${row.amount === '' ? '' : ` — ${todoCurrency(row.amount)}`}`), '', `TOTAL — ${todoCurrency(todoTotal(item))}`, '', 'Created securely with Memoir'].join('\n');
}
async function todoReceiptBlob(item) {
  const rows = parseTodoItems(item); const width = 900; const lineHeight = 54; const height = 440 + rows.length * lineHeight; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
  const logo = new Image(); logo.src = '/brand/memoir-rhino-ui.png'; await logo.decode().catch(() => {});
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, width, height);
  const header = ctx.createLinearGradient(0, 0, width, 0); header.addColorStop(0, '#ff6b60'); header.addColorStop(.55, '#f32e8b'); header.addColorStop(1, '#a64add'); ctx.fillStyle = header; ctx.fillRect(0, 0, width, 12);
  ctx.globalAlpha = .055; ctx.strokeStyle = '#7a635d'; for (let y = 34; y < height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); } ctx.globalAlpha = 1;
  if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 42, 43, 76, 76);
  ctx.fillStyle = '#171417'; ctx.font = '800 39px system-ui'; ctx.fillText('memoir', 134, 83); ctx.fillStyle = '#8b8085'; ctx.font = '700 14px system-ui'; ctx.letterSpacing = '2px'; ctx.fillText('PRIVATE LIST RECEIPT', 136, 108); ctx.letterSpacing = '0px';
  const receiptDate = new Date(item.fields?.['Closed at'] || item.fields?.['Completed at'] || Date.now()); ctx.textAlign = 'right'; ctx.fillStyle = '#6f666a'; ctx.font = '600 17px system-ui'; ctx.fillText(activeProfile().name, width - 42, 71); ctx.font = '500 15px system-ui'; ctx.fillText(receiptDate.toLocaleString('en-IN'), width - 42, 99); ctx.textAlign = 'left';
  ctx.fillStyle = '#171417'; ctx.font = '800 31px system-ui'; ctx.fillText(item.title.slice(0, 48), 42, 171); ctx.fillStyle = '#8b8085'; ctx.font = '600 16px system-ui'; ctx.fillText(`${rows.filter(row => row.done).length} of ${rows.length} items completed`, 42, 201);
  ctx.setLineDash([7, 7]); ctx.strokeStyle = '#d9cdd1'; ctx.beginPath(); ctx.moveTo(42, 229); ctx.lineTo(width - 42, 229); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#9a8d92'; ctx.font = '700 13px system-ui'; ctx.fillText('ITEM', 42, 260); ctx.textAlign = 'right'; ctx.fillText('AMOUNT', width - 42, 260); ctx.textAlign = 'left';
  let y = 305; rows.forEach((row, index) => { if (index % 2 === 0) { ctx.fillStyle = '#f8f2ee'; ctx.roundRect(30, y - 34, width - 60, 45, 10); ctx.fill(); } ctx.fillStyle = row.done ? '#6f686c' : '#171417'; ctx.font = '600 20px system-ui'; const label = `${String(index + 1).padStart(2, '0')}  ${row.done ? '✓' : '○'}  ${row.text}`; ctx.fillText(label.slice(0, 56), 42, y); if (row.amount !== '') { ctx.textAlign = 'right'; ctx.font = '800 20px system-ui'; ctx.fillText(todoCurrency(row.amount), width - 42, y); ctx.textAlign = 'left'; } y += lineHeight; });
  ctx.setLineDash([7, 7]); ctx.strokeStyle = '#d9cdd1'; ctx.beginPath(); ctx.moveTo(42, y - 22); ctx.lineTo(width - 42, y - 22); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#171417'; ctx.font = '800 29px system-ui'; ctx.fillText('TOTAL', 42, y + 27); ctx.textAlign = 'right'; ctx.fillText(todoCurrency(todoTotal(item)), width - 42, y + 27); ctx.textAlign = 'left';
  ctx.fillStyle = '#9a9095'; ctx.font = '600 15px system-ui'; ctx.fillText('Encrypted, organised and shared from Memoir', 42, height - 46); ctx.textAlign = 'right'; ctx.fillText(`RECEIPT · ${String(item.id || '').slice(-8).toUpperCase()}`, width - 42, height - 46); ctx.textAlign = 'left';
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
}
async function openTodoReceipt(itemId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return; const blob = await withRhinoActivity('Printing your receipt…', () => todoReceiptBlob(item)); if (!blob) return toast('Receipt could not be generated'); const url = URL.createObjectURL(blob);
  modal.className = 'modal receipt-modal'; modal.innerHTML = `<div class="modal-inner"><div class="modal-head"><div><p class="eyebrow">Memoir paper receipt</p><h2>${escapeHtml(item.title)}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><div class="receipt-printer"><div class="printer-body"><img src="/brand/memoir-rhino-ui.png" alt=""><span><b>MEMOIR</b><small>PRINTING RECEIPT</small></span><i></i><em></em></div><div class="printer-slot"></div><div class="receipt-paper"><img src="${url}" alt="Generated receipt preview"></div></div><div class="receipt-actions"><button class="secondary" id="receipt-copy-text">${icon('Copy')} Copy text</button><button class="secondary" id="receipt-copy-image">${icon('ReceiptText')} Copy image</button><button class="primary" id="receipt-share">${icon('Share2')} Share receipt</button></div></div>`; showModal(); modal.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
  document.querySelector('#receipt-copy-text').onclick = () => copyText(todoReceiptText(item));
  document.querySelector('#receipt-copy-image').onclick = async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Receipt image copied'); } catch { toast('Image copying is not supported here. Use Share receipt.'); } };
  document.querySelector('#receipt-share').onclick = async () => { const file = new File([blob], `memoir-${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, { type: 'image/png' }); if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: item.title, text: `Memoir to-do receipt · ${todoCurrency(todoTotal(item))}`, files: [file] }); else { const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); toast('Receipt image downloaded'); } };
}

function openEditor(item = null, initialType = 'Personal') {
  if (item?.type === 'Reminder' || initialType === 'Reminder') return openReminderEditor(item);
  if (item?.type === 'Birthday' || initialType === 'Birthday') return openBirthdayEditor(item);
  const selected = item?.type || initialType;
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="memory-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit memory' : 'New memory'}</p><h2>${item ? 'Update what matters' : 'Add something important'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Category<select id="memory-type">${Object.keys(fieldMap).filter(type => !['Birthday', 'Reminder', 'Audio', 'Todo'].includes(type)).map(type => `<option ${type === selected ? 'selected' : ''}>${type}</option>`).join('')}</select></label><label>Title<input id="memory-title" required placeholder="e.g. Home Wi-Fi" value="${escapeHtml(item?.title || '')}"></label><div id="dynamic-fields"></div><label>Note<textarea id="memory-note" rows="3" placeholder="Context, reminder, or anything useful">${escapeHtml(item?.note || '')}</textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save changes' : 'Save memory'}</button></div></form>`;
  showModal();
  const renderFields = () => {
    const type = document.querySelector('#memory-type').value;
    const names = [...new Set([...(fieldMap[type] || []), ...Object.keys(item?.fields || {})])];
    document.querySelector('#dynamic-fields').innerHTML = `<div class="field-grid">${names.map(name => memoryFieldInput(name, item?.fields?.[name] || '')).join('')}</div><div id="custom-memory-fields"></div><button type="button" class="ghost add-custom-field" id="add-custom-field">${icon('Plus')} Add custom field</button>${type === 'Government Document' || type === 'Identity' ? `<p class="document-field-help">${icon('ShieldCheck')} Add an HTTPS Google Drive, OneDrive, or other private cloud link. Memoir stores the link as an encrypted field and Rhinous can retrieve it by document name.</p>` : ''}`;
    document.querySelector('#add-custom-field').onclick = () => document.querySelector('#custom-memory-fields').insertAdjacentHTML('beforeend', `<div class="custom-memory-field"><label>Field name<input data-custom-label maxlength="100" placeholder="e.g. Application number"></label><label>Field value<input data-custom-value maxlength="5000" placeholder="Enter the protected value"></label></div>`);
  };
  renderFields(); document.querySelector('#memory-type').onchange = renderFields;
  document.querySelector('#memory-form').onsubmit = async event => { event.preventDefault(); const fields = {}; document.querySelectorAll('[data-field]').forEach(input => { if (input.value.trim()) fields[input.dataset.field] = input.value.trim(); }); document.querySelectorAll('.custom-memory-field').forEach(row => { const label = row.querySelector('[data-custom-label]').value.trim(); const value = row.querySelector('[data-custom-value]').value.trim(); if (label && value) fields[label.slice(0, 100)] = value.slice(0, 5000); }); await withRhinoActivity(item ? 'Updating memory…' : 'Saving memory…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: document.querySelector('#memory-type').value, title: document.querySelector('#memory-title').value.trim(), note: document.querySelector('#memory-note').value.trim(), fields })); closeModal(); toast(item ? 'Memory updated instantly' : 'Memory saved securely'); };
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
  const fields = { ...(record.fields || {}) };
  let dueAt = String(fields['Due at'] || '').trim();
  let due = Number(fields['Due timestamp']) || new Date(dueAt).getTime();
  const repeat = ['daily', 'weekly', 'monthly', 'yearly'].includes(String(fields.Repeat || '').toLowerCase()) ? String(fields.Repeat).toLowerCase() : 'none';
  const now = Date.now();
  if (Number.isFinite(due) && repeat !== 'none' && due <= now) {
    due = advanceRecurringDue(due, repeat, now);
    dueAt = localDateTimeValue(due);
    fields['Due at'] = dueAt;
  }
  if (dueAt && Number.isFinite(due)) fields['Due timestamp'] = String(due);
  fields.Status = String(fields.Status || 'upcoming').toLowerCase() === 'completed' ? 'completed' : 'upcoming';
  fields.Snoozed = /^(yes|true|snoozed)$/i.test(String(fields.Snoozed || '')) ? 'Yes' : 'No';
  fields.Repeat = repeat;
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
function confirmDelete(id) { const item = state.items.find(row => row.id === id); if (!item) return; confirmBox('Delete this permanently?', `“${item.title}” will be removed from this device and your synced vault. This cannot be undone.`, 'Delete forever', 'Trash2', async () => { await withRhinoActivity('Deleting securely…', async () => { await deleteAudioAssetForItem(item); await vaultStore.remove(id); }); toast(item.type === 'Reminder' ? 'Reminder deleted' : item.type === 'Audio' ? 'Audio memory deleted' : 'Memory deleted'); }); }
function confirmBox(title, text, action, glyph, callback) {
  modal.className = 'modal confirm';
  modal.innerHTML = `<div class="modal-inner"><span class="confirm-icon">${icon(glyph)}</span><div class="modal-head"><div><p class="eyebrow">Please confirm</p><h2>${escapeHtml(title)}</h2></div></div><p>${escapeHtml(text)}</p><div class="modal-actions"><button class="secondary modal-cancel">No, keep it</button><button class="${glyph === 'Trash2' ? 'danger-btn' : 'primary'} modal-confirm">${icon(glyph)} ${escapeHtml(action)}</button></div></div>`;
  modal.showModal(); modal.querySelector('.modal-cancel').onclick = closeModal; modal.querySelector('.modal-confirm').onclick = () => { closeModal(); callback(); };
}
function openDetail(id, viewName = 'vault') {
  const item = state.items.find(row => row.id === id); if (!item) return;
  if (item.type === 'Birthday') { navigate('birthdays'); return; }
  if (viewName === 'audio' || item.type === 'Audio') { state.view = 'capture'; state.captureSection = 'audio'; }
  else state.view = 'vault';
  state.selectedMemoryId = id; shell(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isSecretField(key) {
  const k = String(key || '').toLowerCase().trim();
  return /password|passcode|\bpin\b|cvv|security code|atm pin|transaction pin|secret|private key/i.test(k);
}

function formatShareText(item, selectedFields, includeNote = false) {
  const senderName = activeProfile()?.name || 'Maaz';
  const lines = [
    `Shared via Memoir (${senderName})`,
    '',
    `${item.title}`,
  ];

  selectedFields.forEach(([label, value]) => {
    lines.push(`• ${label}: ${value}`);
  });

  if (includeNote && item.note) {
    lines.push('', `Note: ${item.note}`);
  }

  lines.push('', 'Verified with Memoir Vault');
  return lines.join('\n');
}

function openShareModal(id) {
  const item = state.items.find(row => row.id === id);
  if (!item) return;

  const entries = Object.entries(allFields(item));
  const shareableEntries = entries.filter(([label]) => !isSecretField(label) && !audioDataLabels.has(label) && !audioMetadataLabels.has(label));
  const hasHiddenSecrets = entries.some(([label]) => isSecretField(label));
  const initialFields = [...shareableEntries];
  let includeNote = Boolean(item.note);

  modal.className = 'modal share-modal';

  const renderModalContent = () => {
    const previewText = formatShareText(item, initialFields, includeNote);
    modal.innerHTML = `
      <div class="modal-inner">
        <div class="modal-head">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="icon-wrap ${category(item) === 'Finance' ? 'green' : 'violet'}">${icon(itemIcon(item))}</span>
            <div>
              <p class="eyebrow">Selective Secure Share</p>
              <h2>${escapeHtml(item.title)}</h2>
            </div>
          </div>
          <button type="button" class="modal-close" aria-label="Close">${icon('X')}</button>
        </div>

        <p style="font-size:11.5px;color:var(--muted);margin:10px 0 8px;line-height:1.45">
          Select the exact fields you want to share. ${hasHiddenSecrets ? '<span style="color:var(--green);font-weight:600">Confidential credentials (passwords, PINs, CVVs) are automatically excluded.</span>' : ''}
        </p>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.06em">Available Fields (${shareableEntries.length})</small>
          <div style="display:flex;gap:8px">
            <button type="button" class="text-btn" id="share-select-all" style="font-size:10px">Select all</button>
            <button type="button" class="text-btn" id="share-clear-all" style="font-size:10px;color:var(--muted)">Clear</button>
          </div>
        </div>

        <div class="share-field-list">
          ${shareableEntries.map(([label, value], idx) => `
            <label class="share-field-item">
              <input type="checkbox" class="share-field-checkbox" data-index="${idx}" ${initialFields.some(([l]) => l === label) ? 'checked' : ''}>
              <div>
                <strong>${escapeHtml(label)}</strong>
                <small class="${state.hidden ? 'blur' : ''}">${escapeHtml(value)}</small>
              </div>
            </label>
          `).join('')}
          ${item.note ? `
            <label class="share-field-item">
              <input type="checkbox" id="share-include-note" ${includeNote ? 'checked' : ''}>
              <div>
                <strong>Record Note</strong>
                <small>${escapeHtml(item.note)}</small>
              </div>
            </label>
          ` : ''}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between">
          <small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.06em">Message Preview</small>
          <span style="font-size:10px;color:var(--muted)"><span id="share-count">${initialFields.length}</span> field${initialFields.length === 1 ? '' : 's'} selected</span>
        </div>

        <pre class="share-preview-box" id="share-preview-box">${escapeHtml(previewText)}</pre>

        <div class="share-warning-banner">
          ${icon('ShieldAlert')}
          <div>
            <strong>Security verification</strong><br>
            Please verify the recipient before sharing sensitive account or identity details. Memoir will format and send only the checkboxes you selected.
          </div>
        </div>

        <div class="share-platform-grid">
          <button type="button" class="platform-btn whatsapp" data-platform="whatsapp">
            ${icon('WhatsApp')} WhatsApp
          </button>
          <button type="button" class="platform-btn telegram" data-platform="telegram">
            ${icon('Telegram')} Telegram
          </button>
          <button type="button" class="platform-btn gmail" data-platform="gmail">
            ${icon('Mail')} Gmail / Mail
          </button>
          <button type="button" class="platform-btn instagram" data-platform="instagram">
            ${icon('Instagram')} Instagram
          </button>
          <button type="button" class="platform-btn copy" data-platform="copy">
            ${icon('Copy')} Copy text
          </button>
          ${navigator.share ? `
            <button type="button" class="platform-btn native" data-platform="native">
              ${icon('Share2')} System share
            </button>
          ` : ''}
        </div>
      </div>
    `;


    modal.querySelector('.modal-close').onclick = closeModal;

    const updatePreview = () => {
      const selected = [];
      modal.querySelectorAll('.share-field-checkbox:checked').forEach(cb => {
        const idx = Number(cb.dataset.index);
        if (shareableEntries[idx]) selected.push(shareableEntries[idx]);
      });
      const incNote = modal.querySelector('#share-include-note')?.checked || false;
      const text = formatShareText(item, selected, incNote);
      modal.querySelector('#share-preview-box').textContent = text;
      modal.querySelector('#share-count').textContent = selected.length;
      return { selected, incNote, text };
    };

    modal.querySelectorAll('.share-field-checkbox, #share-include-note').forEach(input => {
      input.onchange = updatePreview;
    });

    modal.querySelector('#share-select-all').onclick = () => {
      modal.querySelectorAll('.share-field-checkbox').forEach(cb => cb.checked = true);
      if (modal.querySelector('#share-include-note')) modal.querySelector('#share-include-note').checked = true;
      updatePreview();
    };

    modal.querySelector('#share-clear-all').onclick = () => {
      modal.querySelectorAll('.share-field-checkbox').forEach(cb => cb.checked = false);
      if (modal.querySelector('#share-include-note')) modal.querySelector('#share-include-note').checked = false;
      updatePreview();
    };

    modal.querySelectorAll('[data-platform]').forEach(btn => {
      btn.onclick = async () => {
        const { selected, text } = updatePreview();
        if (!selected.length && !(modal.querySelector('#share-include-note')?.checked && item.note)) {
          return toast('Select at least one field to share');
        }
        const platform = btn.dataset.platform;
        closeModal();
        await executeShare(platform, text, item.title);
      };
    });
  };

  renderModalContent();
  showModal();
}

async function executeShare(platform, text, itemTitle) {
  const encoded = encodeURIComponent(text);
  if (platform === 'whatsapp') {
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
    toast('Forwarding to WhatsApp…');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank', 'noopener,noreferrer');
    toast('Forwarding to Telegram…');
  } else if (platform === 'gmail' || platform === 'mail') {
    const subject = encodeURIComponent(`${itemTitle} (via Memoir)`);
    window.open(`mailto:?subject=${subject}&body=${encoded}`, '_blank');
    toast('Opening Email client…');
  } else if (platform === 'instagram') {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied details! Opening Instagram…');
    } catch {
      toast('Opening Instagram…');
    }
    setTimeout(() => {
      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
    }, 400);
  } else if (platform === 'native') {
    if (navigator.share) {
      try {
        await navigator.share({ title: itemTitle, text });
        toast('Shared successfully');
      } catch (err) {
        if (err?.name !== 'AbortError') {
          await navigator.clipboard.writeText(text);
          toast('Copied details to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast('Copied details to clipboard');
    }
  } else if (platform === 'copy') {
    await navigator.clipboard.writeText(text);
    toast('Copied formatted details to clipboard');
  }
}


let speechRecognizer = null;

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          data: dataUrl,
          mimeType: 'image/jpeg',
          name: file.name,
          previewUrl: dataUrl,
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let voiceTranscript = '';
let recordingStartedAt = 0;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('The file could not be read'));
    reader.readAsDataURL(file);
  });
}

async function prepareAudioAttachment(file, source = 'Memoir app') {
  if (!file || (!String(file.type || '').startsWith('audio/') && !/\.(m4a|mp3|wav|ogg|webm|aac)$/i.test(file.name || ''))) throw new Error('Choose a supported audio recording');
  if (Number(file.size || 0) > 3 * 1024 * 1024) throw new Error('For reliable secure sync, app uploads must be 3 MB or smaller');
  const data = await readFileAsDataUrl(file);
  const identityToken = await vaultStore.idToken();
  if (!identityToken) throw new Error('Sign in again before uploading audio');
  const response = await fetch('/api/audio', {
    method: 'POST', headers: vaultStore.apiHeaders(identityToken),
    body: JSON.stringify({ data, mimeType: file.type || 'audio/webm', fileName: file.name || 'voice-memo.webm', createdAt: recordingStartedAt || Date.now() }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The encrypted audio upload could not be completed');
  return { kind: 'audio', data, mimeType: file.type || 'audio/webm', name: file.name || 'Voice memo', assetId: result.assetId, source, createdAt: recordingStartedAt || Date.now(), previewUrl: '' };
}

async function persistPendingAudio(attachment, browserTranscript = '') {
  const recorded = new Date(attachment.createdAt || Date.now());
  const record = await vaultStore.save({
    kind: 'memory', type: 'Audio', title: `Voice Memo · ${recorded.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
    note: browserTranscript || 'Audio saved securely. Transcription is being prepared.',
    provenance: { source: attachment.source?.toLowerCase().includes('telegram') ? 'Telegram' : 'Memoir app', createdAt: recorded.toISOString() },
    fields: {
      'Audio Asset ID': attachment.assetId, 'Audio MIME type': attachment.mimeType || 'audio/webm', 'Audio File name': attachment.name || 'Voice memo',
      'Audio Source': attachment.source || 'Memoir app', 'Recorded at': recorded.toISOString(), 'Audio Transcript': browserTranscript || 'Awaiting transcription',
      'Transcription status': browserTranscript ? 'Browser transcript · review suggested' : 'Awaiting transcription',
    },
  });
  attachment.recordId = record.id;
  return record;
}

async function handleAudioFile(file, source = 'Memoir app') {
  try {
    toast('Encrypting audio for secure sync…');
    state.chatAttachment = await prepareAudioAttachment(file, source);
    await persistPendingAudio(state.chatAttachment);
    renderView();
    await askAssistant('Transcribe this voice memo and save it as an audio memory');
  } catch (error) {
    toast(error?.message || 'The audio file could not be processed');
  }
}

function openMicrophonePermissionModal(permissionState = 'prompt') {
  const blocked = permissionState === 'denied';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-inner">
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="icon-wrap violet">${icon('Mic')}</span>
          <div>
            <p class="eyebrow">Voice Recording</p>
            <h2>Microphone Access</h2>
          </div>
        </div>
        <button type="button" class="modal-close">${icon('X')}</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:14px 0;line-height:1.5">${blocked ? 'Microphone access is currently blocked for this site. Open the browser site settings, change Microphone to Allow, then return and try again. You can upload an existing audio file instead.' : 'Memoir needs microphone access only while you record. Tap below and choose Allow in the browser permission prompt.'}</p>
      <div class="permission-guide">${icon(blocked ? 'TriangleAlert' : 'ShieldCheck')}<span>${blocked ? 'Browser menu → Site settings → Microphone → Allow' : 'Your recording is encrypted and stored only in your isolated Memoir audio vault.'}</span></div>
      <div class="modal-actions">
        <button type="button" class="secondary" id="btn-upload-audio-fallback">${icon('AudioLines')} Upload audio</button>
        <button type="button" class="primary" id="btn-allow-mic-start">${icon('Mic')} ${blocked ? 'Try microphone again' : 'Allow and record'}</button>
      </div>
    </div>
  `;
  showModal();

  document.querySelector('#btn-allow-mic-start').onclick = async () => {
    closeModal();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startLiveVoiceSession(stream);
    } catch (err) {
      console.warn('Microphone permission grant failed:', err?.name);
      toast(err?.name === 'NotAllowedError' ? 'Microphone is blocked. Allow it in this site’s browser settings, then try again.' : 'The microphone could not be opened on this device.');
    }
  };
  document.querySelector('#btn-upload-audio-fallback').onclick = () => { closeModal(); document.querySelector('#chat-audio-input')?.click(); };
}

async function toggleVoiceRecording() {
  if (state.isRecordingVoice) {
    stopVoiceRecording();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Microphone is not supported in this browser.');
    return;
  }

  let permissionState = 'prompt';
  try { permissionState = (await navigator.permissions?.query({ name: 'microphone' }))?.state || 'prompt'; } catch { /* Safari does not expose microphone permission state */ }
  if (permissionState !== 'granted') return openMicrophonePermissionModal(permissionState);
  try { startLiveVoiceSession(await navigator.mediaDevices.getUserMedia({ audio: true })); }
  catch (err) { console.warn('Microphone could not start:', err?.name); openMicrophonePermissionModal(err?.name === 'NotAllowedError' ? 'denied' : 'prompt'); }
}

function startLiveVoiceSession(stream) {
  state.isRecordingVoice = true;
  mediaStream = stream;
  recordingStartedAt = Date.now();
  voiceTranscript = '';
  renderView();

  try {
    audioChunks = [];
    const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(type => window.MediaRecorder?.isTypeSupported?.(type));
    mediaRecorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => { if (event.data?.size) audioChunks.push(event.data); };
    mediaRecorder.onstop = async () => {
      const mimeType = mediaRecorder?.mimeType || audioChunks[0]?.type || 'audio/webm';
      const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      mediaRecorder = null; audioChunks = [];
      try {
        const file = new File([blob], `voice-memo-${new Date(recordingStartedAt).toISOString().replace(/[:.]/g, '-')}.${extension}`, { type: mimeType });
        state.chatAttachment = await prepareAudioAttachment(file, 'Memoir recording');
        await persistPendingAudio(state.chatAttachment, voiceTranscript);
        renderView();
        await askAssistant(voiceTranscript ? `Save this audio memory. Browser transcript: ${voiceTranscript}` : 'Transcribe this voice memo and save it as an audio memory');
      } catch (error) { toast(error?.message || 'The recording could not be saved'); }
      finally { mediaStream?.getTracks().forEach(track => track.stop()); mediaStream = null; recordingStartedAt = 0; }
    };
    mediaRecorder.start(500);
  } catch (error) {
    console.error('Audio recorder failed:', error);
    state.isRecordingVoice = false; stream.getTracks().forEach(track => track.stop()); mediaStream = null; renderView();
    return toast('This browser cannot create an audio recording. Use Upload audio instead.');
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    try {
      speechRecognizer = new SpeechRecognition();
      speechRecognizer.continuous = true;
      speechRecognizer.interimResults = true;
      speechRecognizer.lang = 'en-US';

      speechRecognizer.onstart = () => {
        toast('Listening… Speak your note, warranty, or reminder');
      };

      speechRecognizer.onresult = event => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const input = document.querySelector('#chat-query');
        if (input) {
          if (final.trim()) voiceTranscript = `${voiceTranscript} ${final}`.trim();
          input.value = (voiceTranscript || interim).trim();
        }
      };

      speechRecognizer.onerror = event => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast(`Voice input: ${event.error}`);
        }
      };

      speechRecognizer.onend = () => { speechRecognizer = null; };

      speechRecognizer.start();
    } catch (err) {
      console.warn('Live speech preview was unavailable; the audio recorder is still active:', err);
    }
  }
  toast('Recording voice memo… Tap the microphone again to finish');
}

function stopVoiceRecording() {
  state.isRecordingVoice = false;
  if (speechRecognizer) {
    try { speechRecognizer.stop(); } catch {}
    speechRecognizer = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch {}
  } else if (mediaStream) {
    try { mediaStream.getTracks().forEach(track => track.stop()); } catch {}
    mediaStream = null;
  }
  renderView();
}

async function updateAudioTranscriptEverywhere(audioItem, transcript, status = 'Completed') {
  if (!audioItem) return;
  const clean = String(transcript || '').trim();
  const fields = { ...audioItem.fields, 'Audio Transcript': clean || 'No transcript available', 'Transcription status': status };
  const updatedAudio = await vaultStore.save({ ...audioItem, note: clean || audioItem.note || 'Audio saved without a transcript.', fields });
  const linked = reminders().filter(item => String(item.fields?.['Source audio ID'] || '') === audioItem.id || (audioItem.fields?.['Audio Asset ID'] && (item.fields?.['Audio Asset ID'] === audioItem.fields['Audio Asset ID'] || item.fields?.['Source audio asset ID'] === audioItem.fields['Audio Asset ID'])));
  for (const reminder of linked) await vaultStore.save(normalizeReminderRecord({ ...reminder, note: clean || reminder.note, fields: { ...reminder.fields, 'Audio Transcript': clean || 'No transcript available' } }));
  return updatedAudio;
}

function editAudioTranscript(id) {
  const item = state.items.find(row => row.id === id); if (!item) return;
  modal.className = 'modal'; modal.innerHTML = `<form class="modal-inner" id="audio-transcript-form"><div class="modal-head"><div><p class="eyebrow">Audio transcript</p><h2>Correct the transcript</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><p class="todo-form-help">Changes also update reminders created from this voice memo.</p><label>Transcript<textarea id="audio-transcript-text" rows="9" required>${escapeHtml(audioAttachment(item)?.transcript === 'Awaiting transcription' ? '' : audioAttachment(item)?.transcript || '')}</textarea></label><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} Save transcript</button></div></form>`; showModal();
  document.querySelector('#audio-transcript-form').onsubmit = async event => { event.preventDefault(); const transcript = document.querySelector('#audio-transcript-text').value.trim(); await withRhinoActivity('Updating transcript and reminder…', () => updateAudioTranscriptEverywhere(item, transcript, 'Edited by user')); closeModal(); renderView(); toast('Transcript updated everywhere', 'success'); };
}

async function retryAudioTranscription(id) {
  const item = state.items.find(row => row.id === id); const attachment = audioAttachment(item); if (!item || !attachment?.assetId) return toast('This recording is not available for transcription retry');
  try {
    await withRhinoActivity('Preparing audio for transcription…', async () => {
      const token = await vaultStore.idToken(); const response = await fetch(`/api/audio?id=${encodeURIComponent(attachment.assetId)}`, { headers: vaultStore.apiHeaders(token, false) }); if (!response.ok) throw new Error('The encrypted recording could not be loaded');
      const blob = await response.blob(); const data = await readFileAsDataUrl(new File([blob], attachment.fileName || 'voice-memo', { type: attachment.mimeType || blob.type || 'audio/webm' }));
      state.chatAttachment = { kind: 'audio', data, mimeType: attachment.mimeType || blob.type || 'audio/webm', name: attachment.fileName || 'Voice memo', assetId: attachment.assetId, source: attachment.source, createdAt: attachment.recordedAt || item.createdAt, recordId: item.id };
    });
    state.view = 'assistant'; shell(); await askAssistant('Retry transcription for this saved audio memory');
  } catch (error) { toast(error?.message || 'Transcription retry could not start'); }
}



async function askAssistant(query) {
  const attachment = state.chatAttachment;
  state.chatAttachment = null;
  const isImageOrVoice = Boolean(attachment);

  if ((!query?.trim() && !isImageOrVoice) || state.chatLoading) return;
  const cleanQuery = (query || (attachment ? 'Extract details from this document/image' : '')).trim();
  const history = assistantHistory(state.messages);
  const protectedInput = protectPrivateInput(cleanQuery);
  let proposedActions = [];

  const userMessageText = attachment ? `${attachment.kind === 'audio' ? 'Audio' : 'Image'} attached: ${attachment.name || (attachment.kind === 'audio' ? 'Voice memo' : 'Document image')} ${cleanQuery !== 'Extract details from this document/image' ? cleanQuery : ''}` : cleanQuery;
  state.messages.push({ role: 'user', text: userMessageText.trim() });
  state.chatLoading = true;
  renderView();
  scrollChat();

  try {
    const localLookupRequested = !attachment && isSavedLookupRequest(cleanQuery);
    const localAnswer = localLookupRequested ? localRoute(cleanQuery) : null;
    if (localLookupRequested) {
      state.messages.push(localAnswer || { role: 'assistant', title: 'Which saved memory?', markdown: 'I will not guess when private records could overlap. Please include the saved title or owner, for example **Home Wi-Fi password** or **EPFO password**.' });
      return;
    }
    const catalog = state.items.filter(item => item.type !== 'Notification').map(item => ({ id: item.id, type: category(item), title: item.title, fieldNames: Object.keys(allFields(item)) }));
    const identityToken = await vaultStore.idToken();
    const payload = {
      provider: attachment ? 'gemini' : state.provider,
      query: protectedInput.text,
      catalog,
      history,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta',
      now: new Date().toISOString(),
    };
    if (attachment?.kind === 'audio') {
      payload.audio = {
        data: attachment.data,
        mimeType: attachment.mimeType || 'audio/webm',
      };
    } else if (attachment) {
      payload.image = {
        data: attachment.data,
        mimeType: attachment.mimeType || 'image/jpeg',
      };
    }
    const response = await fetch('/api/assistant', { method: 'POST', headers: vaultStore.apiHeaders(identityToken), body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(await response.text());
    const answer = await response.json();
    const message = buildAssistantMessage(answer, cleanQuery, protectedInput.values);
    if (attachment?.kind === 'audio') {
      const transcript = String(answer.audioTranscript || '').trim();
      const audioItem = state.items.find(item => item.id === attachment.recordId);
      const audioAction = message.actions?.find(action => action.type === 'Audio');
      const reliableTranscript = transcript || (audioAction?.fields?.['Audio Transcript'] && !/^(no transcript|awaiting)/i.test(audioAction.fields['Audio Transcript']) ? audioAction.fields['Audio Transcript'] : '');
      if (audioItem) {
        const updated = await updateAudioTranscriptEverywhere(audioItem, reliableTranscript, reliableTranscript ? 'Completed' : 'Audio only · transcription unavailable');
        if (audioAction?.title) await vaultStore.save({ ...updated, title: audioAction.title, note: reliableTranscript || updated.note });
      }
      message.actions = (message.actions || []).filter(action => action.type !== 'Audio').map(action => action.type === 'Reminder' ? { ...action, fields: { ...(action.fields || {}), 'Audio Transcript': reliableTranscript || 'No transcript available', 'Source audio ID': attachment.recordId || '', 'Created via': attachment.source || 'Memoir app' } } : action);
      message.title = reliableTranscript ? 'Audio saved and transcribed' : 'Audio saved · transcription available later';
      message.markdown = reliableTranscript ? 'The encrypted recording is already in Audio. Review any reminder prepared from the transcript below.' : 'The recording is safely stored. The AI transcription service is currently unavailable or could not understand the speech. Use **Try transcription again** from Audio after limits reset.';
      if (!reliableTranscript) message.retryAudioId = attachment.recordId;
    }
    proposedActions = message.actions || [];
    state.messages.push(message);
  } catch (error) {
    if (attachment?.kind === 'audio') {
      const audioItem = state.items.find(item => item.id === attachment.recordId);
      if (audioItem) await updateAudioTranscriptEverywhere(audioItem, '', 'Awaiting transcription · retry available');
      state.messages.push({ role: 'assistant', title: 'Audio saved safely', markdown: 'The recording is already visible in Audio. Transcription could not run because the selected AI is unavailable or its limit was reached. You can retry later without recording again.', retryAudioId: attachment.recordId });
    } else {
      const fallback = localRoute(cleanQuery);
      state.messages.push(fallback || { role: 'assistant', markdown: `### Assistant response\nI couldn’t process this capture request: ${error?.message || 'Check your network connection'}.` });
    }
  } finally {
    state.chatLoading = false;
    persistAssistantLog();
    renderView();
    scrollChat();
  }
  if (proposedActions.length) await confirmAssistantActions(proposedActions);
}

function buildAssistantMessage(answer, query, privateValues = {}) {
  if (answer.kind === 'actions' && answer.actions?.length) {
    const actions = answer.actions.map(action => rehydrateAction(action, privateValues)).filter(Boolean);
    if (actions.length) return { role: 'assistant', title: answer.title || 'Review vault changes', markdown: answer.markdown || 'Review these changes before I apply them.', actions };
  }
  if (answer.kind !== 'lookup' || !answer.matches?.length) return { role: 'assistant', title: answer.title || 'Rhinous', markdown: answer.markdown || answer.message || 'I could not create a response.' };
  const fields = []; const audios = []; let firstResolvedId = '';
  answer.matches.forEach(match => {
    const item = state.items.find(row => row.id === match.id); if (!item) return;
    if (!firstResolvedId) firstResolvedId = item.id;
    const attachment = audioAttachment(item); if (attachment) audios.push({ ...attachment, title: item.title });
    const requested = match.fields?.length ? match.fields : Object.keys(allFields(item));
    requested.forEach(label => { const actual = Object.keys(allFields(item)).find(key => key.toLowerCase() === String(label).toLowerCase()); if (actual && !audioDataLabels.has(actual) && !audioMetadataLabels.has(actual)) fields.push({ label: actual, value: allFields(item)[actual] }); });
  });
  if (firstResolvedId) state.lastResolvedItemId = firstResolvedId;
  return fields.length || audios.length ? { role: 'assistant', title: answer.title || 'Saved information', markdown: answer.markdown, fields, audios } : localRoute(query) || { role: 'assistant', markdown: 'I found the record, but not that exact field.' };
}
function protectPrivateInput(input) {
  let text = String(input || ''); const values = {}; let tokenIndex = 0;
  const remember = value => { const token = `[[PRIVATE_${tokenIndex++}]]`; values[token] = String(value).trim(); return token; };
  const knownValues = state.items.flatMap(item => Object.values(allFields(item))).map(String).filter(value => value.trim().length >= 3).sort((a, b) => b.length - a.length);
  knownValues.forEach(value => { if (text.includes(value)) text = text.split(value).join(remember(value)); });
  const isMutation = /\b(add|create|save|remember|edit|update|change|replace|delete|remove|forget)\b/i.test(text);
  const labels = ['debit card number', 'credit card number', 'application number', 'account number', 'document number', 'reference number', 'soft copy link', 'drive link', 'eid', 'imei', 'imei2', 'username / id', 'username', 'atm pin', 'wifi password', 'wi-fi password', 'password', 'passcode', 'security code', 'cvv', 'pin', 'ifsc code', 'expiry date', 'expiry', 'issued date', 'purchase date', 'network', 'ssid', 'date', 'relation', 'gift idea', 'wish note', 'content', 'value', 'note'];
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
function assistantLogKey(uid = localStorage.getItem('memoir-selected-profile')) { return `memoir-assistant-log-${uid || 'unselected'}`; }
function loadAssistantLog(uid) { try { const value = JSON.parse(localStorage.getItem(assistantLogKey(uid)) || '[]'); return Array.isArray(value) ? value.slice(-12) : []; } catch { return []; } }
function persistAssistantLog() { state.assistantLog = assistantHistory(state.messages); localStorage.setItem(assistantLogKey(state.auth.profile?.uid), JSON.stringify(state.assistantLog)); }
function rehydrateAction(action, privateValues) {
  if (!action || !['create', 'update', 'delete'].includes(action.op)) return null;
  const restore = value => Object.entries(privateValues).reduce((text, [token, secret]) => text.split(token).join(secret), String(value || ''));
  const fields = Object.fromEntries(Object.entries(action.fields || {}).map(([label, value]) => [restore(label).slice(0, 100), restore(value).slice(0, 4000)]).filter(([label]) => label));
  return { op: action.op, id: String(action.id || ''), type: restore(action.type).slice(0, 40), title: restore(action.title).slice(0, 160), note: restore(action.note).slice(0, 2000), fields };
}
function assistantActionName(action) { return action.title || state.items.find(item => item.id === action.id)?.title || 'Saved memory'; }
async function confirmAssistantActions(actions) {
  modal.className = 'modal confirm ai-confirm';
  modal.innerHTML = `<div class="modal-inner"><img class="assistant-logo confirm-rhino" src="/brand/memoir-rhino-ui.png" alt=""><div class="modal-head"><div><p class="eyebrow">Rhinous prepared ${actions.length} change${actions.length === 1 ? '' : 's'}</p><h2>Review before applying</h2></div></div><div class="ai-review-list">${actions.map(action => { const todoPreview = action.type === 'Todo' ? todoItemsFromFields(action.fields) : []; const visibleFields = Object.entries(action.fields || {}).filter(([label]) => !audioDataLabels.has(label) && !audioMetadataLabels.has(label) && !(action.type === 'Todo' && label === 'Todo items')); return `<article><span>${escapeHtml(action.op.toUpperCase())}</span><strong>${escapeHtml(assistantActionName(action))}</strong>${action.fields?.['Audio Asset ID'] ? `<div class="audio-review-badge">${icon('AudioLines')} Encrypted audio attached</div>` : ''}${todoPreview.length ? `<ul class="ai-todo-preview">${todoPreview.map(text => `<li>${icon('Circle')}<span>${escapeHtml(text)}</span></li>`).join('')}</ul>` : ''}${visibleFields.length ? `<dl>${visibleFields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}</article>`; }).join('')}</div><p class="ai-review-note">Nothing changes until you confirm. Secret values shown here remain inside this browser.</p><div class="modal-actions"><button class="secondary modal-cancel">No, cancel</button><button class="primary modal-confirm">${icon('Check')} Apply ${actions.length === 1 ? 'change' : 'changes'}</button></div></div>`;
  modal.showModal();
  const approved = await new Promise(resolve => {
    let settled = false; const finish = value => { if (settled) return; settled = true; resolve(value); };
    modal.querySelector('.modal-cancel').onclick = () => { closeModal(); finish(false); };
    modal.querySelector('.modal-confirm').onclick = () => { closeModal(); finish(true); };
    modal.oncancel = event => { event.preventDefault(); closeModal(); finish(false); };
  });
  if (!approved) { await Promise.all(actions.map(action => deleteAudioAssetForItem({ fields: action.fields || {} }))); toast('No vault changes were made'); return; }
  let applied = 0;
  await withRhinoActivity(`Applying ${actions.length} Rhinous ${actions.length === 1 ? 'change' : 'changes'}…`, async () => {
    for (const action of actions) {
      if (action.op === 'create') {
        const type = action.type || 'Personal';
        const record = { kind: type === 'Clipboard' ? 'clipboard' : 'memory', type, title: action.title || (type === 'Reminder' ? 'Untitled reminder' : 'Untitled memory'), note: action.note || '', fields: action.fields || {} };
        await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : type === 'Todo' ? normalizeTodoRecord(record) : record); applied += 1;
      } else if (action.op === 'update') {
        const item = state.items.find(row => row.id === action.id); if (!item) continue;
        const type = action.type || item.type;
        const record = { ...item, kind: type === 'Clipboard' ? 'clipboard' : 'memory', type, title: action.title || item.title, note: action.note || item.note || '', fields: { ...allFields(item), ...(action.fields || {}) } };
        await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : type === 'Todo' ? normalizeTodoRecord(record) : record); applied += 1;
      } else if (action.op === 'delete' && state.items.some(row => row.id === action.id)) { const item = state.items.find(row => row.id === action.id); await deleteAudioAssetForItem(item); await vaultStore.remove(action.id); applied += 1; }
    }
  });
  state.messages.push({ role: 'assistant', markdown: `### Changes applied\n${applied} vault ${applied === 1 ? 'change is' : 'changes are'} saved and queued for encrypted sync.` });
  persistAssistantLog();
  renderView(); scrollChat(); toast(`${applied} vault ${applied === 1 ? 'change' : 'changes'} applied`);
}
const lookupStopWords = new Set(['a', 'an', 'and', 'are', 'can', 'could', 'for', 'from', 'give', 'get', 'have', 'here', 'info', 'information', 'is', 'me', 'my', 'of', 'only', 'please', 'show', 'tell', 'that', 'the', 'this', 'to', 'what', 'whats', 'with']);
const genericRecordWords = new Set(['account', 'audio', 'bank', 'birthday', 'card', 'credential', 'details', 'document', 'home', 'info', 'login', 'memory', 'password', 'reminder', 'todo', 'vault', 'wifi']);
function normalizedLookupText(value) { return String(value || '').toLowerCase().replace(/wi[ -]?fi/g, 'wifi').replace(/[^a-z0-9]+/g, ' ').trim(); }
function lookupTokens(value) { return normalizedLookupText(value).split(/\s+/).filter(token => token.length > 1 && !lookupStopWords.has(token)); }
function isSavedLookupRequest(query) {
  const text = normalizedLookupText(query);
  if (/\b(add|change|complete|create|delete|draft|edit|forget|generate|make|mark|remove|remember|save|schedule|set|update|wish|write)\b/.test(text)) return false;
  const namedRecord = state.items.some(item => lookupTokens(item.title).some(token => token.length > 3 && !genericRecordWords.has(token) && text.includes(token)) || normalizedLookupText(item.title) && text.includes(normalizedLookupText(item.title)));
  const exactFieldRequest = /\b(password|passcode|username|user id|wifi|birthday|pin|cvv|card number|account number|document number|application number|reference number|ifsc|soft copy|drive link|expiry|valid thru)\b/.test(text);
  return namedRecord || exactFieldRequest;
}
function fieldIntentPatterns(needle) {
  const patterns = [];
  if (/\b(password|passcode)\b/.test(needle)) patterns.push(/password|passcode/i);
  if (/\b(username|user id|login id)\b/.test(needle)) patterns.push(/username|user id|login id/i);
  if (/\b(cvv|security code)\b/.test(needle)) patterns.push(/cvv|security code/i);
  if (/\b(atm pin)\b/.test(needle)) patterns.push(/atm pin/i);
  else if (/\b(transaction pin)\b/.test(needle)) patterns.push(/transaction pin/i);
  else if (/\bpin\b/.test(needle)) patterns.push(/(^|\s)pin|atm pin|transaction pin/i);
  if (/\b(debit card number|debit card)\b/.test(needle)) patterns.push(/debit card number|card number/i);
  else if (/\b(credit card number|credit card)\b/.test(needle)) patterns.push(/credit card number|card number/i);
  else if (/\bcard number\b/.test(needle)) patterns.push(/card number/i);
  if (/\baccount number\b/.test(needle)) patterns.push(/account number/i);
  if (/\b(ifsc|ifc code)\b/.test(needle)) patterns.push(/ifsc|ifc code/i);
  if (/\b(link|soft copy|drive)\b/.test(needle)) patterns.push(/link|soft copy/i);
  if (/\b(expiry|expires|valid thru)\b/.test(needle)) patterns.push(/expiry|valid thru/i);
  if (/\b(document number|reference number|application number)\b/.test(needle)) patterns.push(/document number|reference number|application number/i);
  if (/\b(date|birthday)\b/.test(needle)) patterns.push(/^date$|birth/i);
  return patterns;
}
function recordLookupScore(item, needle, queryTokens) {
  const title = normalizedLookupText(item.title); const titleTokens = lookupTokens(item.title); const note = normalizedLookupText(item.note); const type = normalizedLookupText(category(item));
  let score = 0; let identityMatches = 0; let genericMatches = 0;
  if (title && needle.includes(title)) { score += 220; identityMatches += 3; }
  titleTokens.forEach(token => {
    if (!needle.includes(token)) return;
    const weight = genericRecordWords.has(token) ? 12 : 52;
    score += weight; if (!genericRecordWords.has(token)) identityMatches += 1; else genericMatches += 1;
  });
  if (!identityMatches && genericMatches >= 2) identityMatches = 1;
  queryTokens.forEach(token => { if (note.includes(token) && !genericRecordWords.has(token)) { score += 10; identityMatches += .25; } });
  if ((needle.includes('wifi') && type.includes('wifi')) || (needle.includes('birthday') && type.includes('birthday')) || (needle.includes('audio') && type.includes('audio'))) score += 28;
  if (fieldIntentPatterns(needle).some(pattern => Object.keys(allFields(item)).some(label => pattern.test(label)))) score += 10;
  if (!identityMatches && item.id === state.lastResolvedItemId && /\b(only|it|that|same|its|password|pin|cvv|number|details|info)\b/.test(needle)) score += 75;
  if (!identityMatches && item.id !== state.lastResolvedItemId) return 0;
  return score;
}
function localRoute(query) {
  const needle = normalizedLookupText(query); const queryTokens = lookupTokens(query);
  const ranked = state.items.filter(item => item.type !== 'Notification').map(item => ({ item, score: recordLookupScore(item, needle, queryTokens) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length || ranked[0].score < 40) return null;
  if (ranked[1] && ranked[0].score - ranked[1].score < 8 && ranked[0].item.id !== state.lastResolvedItemId) {
    return { role: 'assistant', title: 'Choose the exact memory', markdown: `I found more than one possible match: **${ranked.slice(0, 3).map(row => row.item.title).join('**, **')}**. Please include the exact title so I never expose the wrong record.` };
  }
  const item = ranked[0].item; let entries = Object.entries(allFields(item)); const patterns = fieldIntentPatterns(needle);
  if (patterns.length) {
    const exact = entries.filter(([label]) => patterns.some(pattern => pattern.test(label)));
    if (exact.length) entries = exact;
  } else if (!/(all|details|info|everything|complete|full)/.test(needle) && item.type !== 'Birthday') {
    entries = entries.slice(0, 1);
  }
  const attachment = audioAttachment(item);
  entries = entries.filter(([label]) => !audioDataLabels.has(label) && !audioMetadataLabels.has(label));
  state.lastResolvedItemId = item.id;
  return { role: 'assistant', title: item.title, markdown: `Matched **${item.title}** in your encrypted vault. Values were resolved only on this device.`, fields: entries.map(([label, value]) => ({ label, value })), ...(attachment ? { audios: [{ ...attachment, title: item.title }] } : {}) };
}
function scrollChat() { requestAnimationFrame(() => { const node = document.querySelector('#messages'); if (node) node.scrollTop = node.scrollHeight; }); }
function generateBirthdayMessage(id) { const item = state.items.find(row => row.id === id); state.view = 'assistant'; shell(); askAssistant(`Write a warm, natural birthday message for the person in my saved birthday record titled "${item.title}". Do not reveal or request any private vault values.`); }

async function logSentNotification({ title, category, scheduledAt, sourceId, deliveryKey }) {
  await vaultStore.save({ kind: 'system', type: 'Notification', title, note: 'Telegram delivery receipt', fields: { Category: category, 'Scheduled at': String(scheduledAt), 'Sent at': String(Date.now()), 'Source id': sourceId, 'Delivery key': deliveryKey, Status: 'sent' } });
}

async function checkBirthdayReminders() {
  if (!navigator.onLine) return; const now = Date.now(); const sentKey = `memoir-reminders-sent-${state.auth.profile?.uid || 'unknown'}`; const sent = JSON.parse(localStorage.getItem(sentKey) || '{}'); const offsets = [[48 * 3600000, 'in two days'], [24 * 3600000, 'tomorrow'], [5 * 3600000, 'in five hours'], [2 * 3600000, 'in two hours'], [0, 'today']];
  for (const item of memories().filter(row => row.type === 'Birthday' && row.fields?.Date)) {
    const next = nextBirthday(item, new Date(now)); if (!next) continue; const birthday = next.occurrence.getTime(); const occurrenceKey = next.occurrence.toISOString().slice(0, 10);
    for (const [offset, label] of offsets) { const due = birthday - offset; const key = `birthday:${item.id}:${occurrenceKey}:${offset}`; if (!sent[key] && now >= due && now - due < 10 * 60000) { const name = item.title.replace(/['’]s birthday/i, ''); try { const identityToken = await vaultStore.idToken(); if (!identityToken) continue; const response = await fetch('/api/telegram', { method: 'POST', headers: vaultStore.apiHeaders(identityToken), body: JSON.stringify({ action: 'send', reminderKey: key, text: `🎂 Birthday reminder\n\n${name}'s birthday is ${label}.\n${item.note ? `\n📝 ${item.note}` : ''}\n\nOpen Memoir to prepare a thoughtful wish.` }) }); if (response.ok) { const result = await response.json().catch(() => ({})); sent[key] = Date.now(); localStorage.setItem(sentKey, JSON.stringify(sent)); if (!result.deduplicated) await logSentNotification({ title: item.title, category: 'Birthday', scheduledAt: due, sourceId: item.id, deliveryKey: key }); } } catch { /* retry on next interval */ } } }
  }
}

async function checkExpiryReminders() {
  if (!navigator.onLine || state.auth.status !== 'signedIn') return;
  const now = Date.now();
  const sentKey = `memoir-expiry-sent-${state.auth.profile?.uid || 'unknown'}`;
  const sent = JSON.parse(localStorage.getItem(sentKey) || '{}');
  const expList = expiringMemories();

  for (const exp of expList) {
    const due = exp.expiryTimestamp;
    if (!due) continue;

    for (const [offset, label] of EXPIRY_NOTIFICATION_OFFSETS) {
      const sendAt = due - offset;
      const key = `expiry:${exp.itemId}:${offset}`;

      if (now < sendAt) continue;
      const grace = 24 * 60 * 60 * 1000;
      if (now - sendAt > grace) continue;

      if (!sent[key]) {
        try {
          const identityToken = await vaultStore.idToken();
          if (!identityToken) continue;

          const expiryDateFormatted = new Date(due).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Calcutta',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          let messageText = '';
          if (exp.isCard) {
            const cardDesc = exp.bank ? `${exp.bank} ${exp.title}` : exp.title;
            const endingText = exp.last4 ? ` (ending in ${exp.last4})` : '';
            messageText = `💳 Card Expiry Alert\n\nYour ${cardDesc}${endingText} is expiring in ${label} (${expiryDateFormatted}).\n\nOpen Memoir to review or request a replacement card from your bank.`;
          } else {
            const docDesc = exp.docNum ? ` (Doc #${exp.docNum})` : '';
            messageText = `📄 Document Expiry Alert\n\nYour ${exp.title}${docDesc} is expiring in ${label} on ${expiryDateFormatted}.\n\nOpen Memoir to check renewal requirements or schedule an appointment.`;
          }

          const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: vaultStore.apiHeaders(identityToken),
            body: JSON.stringify({ action: 'send', reminderKey: key, text: messageText }),
          });

          if (response.ok) {
            sent[key] = Date.now();
            localStorage.setItem(sentKey, JSON.stringify(sent));
            await logSentNotification({
              title: `${exp.title} Expiry Alert`,
              category: exp.isCard ? 'Finance' : 'Document',
              scheduledAt: sendAt,
              sourceId: exp.itemId,
              deliveryKey: key,
            });
          }
        } catch { /* retry on next interval */ }
      }
    }
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
        if (action.fields?.['Audio Recording'] && !action.fields?.['Audio Asset ID']) {
          const token = await vaultStore.idToken(); const dataUrl = String(action.fields['Audio Recording']); const mimeType = dataUrl.match(/^data:([^;,]+)/i)?.[1] || 'audio/ogg';
          const response = await fetch('/api/audio', { method: 'POST', headers: vaultStore.apiHeaders(token), body: JSON.stringify({ data: dataUrl, mimeType, fileName: `telegram-voice-${entry.queueId}.ogg`, createdAt: Date.now() }) });
          const saved = await response.json().catch(() => ({})); if (!response.ok || !saved.assetId) throw new Error(saved.error || 'Telegram audio migration failed');
          delete action.fields['Audio Recording']; action.fields['Audio Asset ID'] = saved.assetId; action.fields['Audio MIME type'] = mimeType; action.fields['Audio File name'] = `telegram-voice-${entry.queueId}.ogg`; action.fields['Audio Source'] = 'Telegram';
        }
        if (action.op === 'delete') {
          if (state.items.some(item => item.id === action.id)) await vaultStore.remove(action.id);
        } else if (action.op === 'update') {
          const item = state.items.find(row => row.id === action.id); if (!item) continue;
          const type = action.type || item.type; const record = { ...item, type, kind: type === 'Clipboard' ? 'clipboard' : 'memory', title: action.title || item.title, note: action.note || item.note || '', provenance: item.provenance || { source: 'Telegram', createdAt: new Date(item.createdAt || Date.now()).toISOString() }, fields: { ...allFields(item), ...(action.fields || {}) } };
          await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : type === 'Todo' ? normalizeTodoRecord(record) : record);
        } else {
          const type = action.type || 'Personal'; const record = { id: entry.queueId, type, kind: type === 'Clipboard' ? 'clipboard' : 'memory', title: action.title || (type === 'Reminder' ? 'Untitled reminder' : 'Untitled memory'), note: action.note || '', provenance: { source: 'Telegram', createdAt: new Date().toISOString() }, fields: action.fields || {} };
          await vaultStore.save(type === 'Reminder' ? normalizeReminderRecord(record) : type === 'Todo' ? normalizeTodoRecord(record) : record);
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
  if (navigator.onLine && !await vaultStore.ensureActiveSession()) return;
  await autoCompleteExpiredReminders(); await purgeExpiredNotifications();
  if (navigator.onLine) {
    if (Date.now() - lastRuntimeMirror > 5 * 60000) { lastRuntimeMirror = Date.now(); vaultStore.mirrorSnapshot(); }
    try { const token = await vaultStore.idToken(); if (token) await fetch('/api/reminders', { method: 'POST', headers: vaultStore.apiHeaders(token, false) }); } catch { /* the next interval retries */ }
    await applyTelegramActions(); await checkBirthdayReminders(); await checkExpiryReminders();
  }
}


let currentProfileUid = localStorage.getItem('memoir-selected-profile') || '';
vaultStore.subscribe((items, status, session) => {
  const wasSignedIn = state.auth.status === 'signedIn'; state.items = items; state.status = status; state.auth = session || state.auth;
  const nextProfileUid = state.auth.profile?.uid || '';
  if (nextProfileUid !== currentProfileUid) { currentProfileUid = nextProfileUid; state.messages = []; state.assistantLog = nextProfileUid ? loadAssistantLog(nextProfileUid) : []; }
  if (state.auth.status === 'signedIn') state.authError = '';
  if (wasSignedIn && state.auth.status === 'signedIn' && document.querySelector('.shell')) { updateSyncUi(); if (!document.querySelector('.detail')) renderView(); }
  else shell();
  if (state.auth.status === 'signedIn') { updateNotificationBadge(); runBackgroundAutomation(); }
});
shell(); vaultStore.init();
setInterval(runBackgroundAutomation, 30000);
setInterval(updateReminderCountdowns, 1000);
setInterval(updateSecurityCountdowns, 1000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
