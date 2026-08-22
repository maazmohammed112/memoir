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
import Bell from 'lucide/dist/esm/icons/bell.mjs';
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
import Download from 'lucide/dist/esm/icons/download.mjs';
import Ellipsis from 'lucide/dist/esm/icons/ellipsis.mjs';
import Eraser from 'lucide/dist/esm/icons/eraser.mjs';
import Eye from 'lucide/dist/esm/icons/eye.mjs';
import EyeOff from 'lucide/dist/esm/icons/eye-off.mjs';
import ExternalLink from 'lucide/dist/esm/icons/external-link.mjs';
import FileBadge from 'lucide/dist/esm/icons/file-badge.mjs';
import FileText from 'lucide/dist/esm/icons/file-text.mjs';
import Gem from 'lucide/dist/esm/icons/gem.mjs';
import Globe from 'lucide/dist/esm/icons/globe.mjs';
import House from 'lucide/dist/esm/icons/house.mjs';
import ImageIcon from 'lucide/dist/esm/icons/image.mjs';
import Info from 'lucide/dist/esm/icons/info.mjs';
import KeyRound from 'lucide/dist/esm/icons/key-round.mjs';
import Landmark from 'lucide/dist/esm/icons/landmark.mjs';
import LockKeyhole from 'lucide/dist/esm/icons/lock-keyhole.mjs';
import LogOut from 'lucide/dist/esm/icons/log-out.mjs';
import ListTodo from 'lucide/dist/esm/icons/list-todo.mjs';
import Mail from 'lucide/dist/esm/icons/mail.mjs';
import MessageCircle from 'lucide/dist/esm/icons/message-circle.mjs';
import Mic from 'lucide/dist/esm/icons/mic.mjs';
import Minus from 'lucide/dist/esm/icons/minus.mjs';
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
import CloudUpload from 'lucide/dist/esm/icons/cloud-upload.mjs';
import WandSparkles from 'lucide/dist/esm/icons/wand-sparkles.mjs';
import Wifi from 'lucide/dist/esm/icons/wifi.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';
import Zap from 'lucide/dist/esm/icons/zap.mjs';
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
  AlarmClock, AudioLines, ArrowLeft, ArrowUp, ArrowUpRight, BadgeCheck, Bell, BellRing, CakeSlice, Calendar, Camera,
  Check, ChevronRight, Circle, CircleCheckBig, CirclePause, CirclePlay, Clipboard, ClipboardPaste, Clock,
  CloudUpload, Copy, CreditCard, Download, Ellipsis, Eraser, Eye, EyeOff, ExternalLink, FileBadge, FileText, Gem, Globe, House, Image: ImageIcon, Info, KeyRound, Landmark,
  LockKeyhole, LogOut, ListTodo, Mail, MessageCircle, Mic, Minus, NotebookText, Paperclip, Pencil, Plus, ReceiptText, Search,
  Send, Share2, ShieldAlert, ShieldCheck, Sparkles, Trash2, TriangleAlert, UploadCloud: CloudUpload, WandSparkles, Wifi, X, Zap,
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
  provider: localStorage.getItem('memoir-provider') || 'gemini', query: '', selectedMemoryId: null, vaultSection: 'memories', vaultCategory: 'all', guardTab: 'all', generatedPassword: '', generatedPin: '', messages: [], assistantLog: loadAssistantLog(), chatLoading: false, reminderTab: 'upcoming', todoTab: 'active', telegramSyncing: false,
  auth: { status: 'checking', email: '', message: '', profile: null }, authError: '',
  chatAttachments: [], chatAttachment: null, isRecordingVoice: false, plannerSection: 'todos', captureSection: 'audio', lastResolvedItemId: '', assistantReveals: new Set(),
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
  activityDepth += 1;
  let node = document.querySelector('#rhino-activity');
  if (!node) {
    node = document.createElement('div');
    node.id = 'rhino-activity';
    node.className = 'rhino-activity';
    node.innerHTML = `<span><img src="/brand/memoir-rhino-ui.png" alt=""></span><strong></strong><i></i>`;
    document.body.appendChild(node);
  }
  node.querySelector('strong').textContent = label;
  node.classList.add('show');
  try {
    return await task();
  } finally {
    activityDepth = Math.max(0, activityDepth - 1);
    if (!activityDepth) {
      node.classList.remove('show');
      setTimeout(() => { if (!activityDepth) node.remove(); }, 60);
    }
  }
}
function activeProfile() { return state.auth.profile || { name: 'Owner', initials: 'ME', email: state.auth.email || '' }; }
function titleForView() {
  if (state.view === 'vault' && state.vaultSection === 'security') return 'Rhino Guard Security';
  return { home: `Good morning, ${activeProfile().name}`, vault: 'Your memories', assistant: 'Ask Rhinous', planner: 'Plan and complete', capture: 'Capture library', birthdays: 'Meaningful moments' }[state.view] || 'Your memories';
}
function category(item) { return item.kind === 'clipboard' ? 'Clipboard' : item.type || 'Personal'; }
function itemIcon(item) { return typeIcons[category(item)] || 'Gem'; }
function allFields(item) { return item.fields || {}; }
function provenanceOf(item) {
  const source = String(item?.provenance?.source || item?.fields?.['Created via'] || item?.fields?.['Audio Source'] || 'Memoir app');
  const isTelegram = /telegram/i.test(source);
  const isExtension = /extension|chrome/i.test(source);
  return {
    source: isTelegram ? 'Telegram' : isExtension ? 'Chrome Extension' : 'Memoir app',
    createdAt: item?.provenance?.createdAt || item?.fields?.['Created at'] || item?.fields?.['Recorded at'] || new Date(item?.createdAt || Date.now()).toISOString(),
    icon: isTelegram ? 'Telegram' : isExtension ? 'Globe' : 'Rhino',
    domain: item?.provenance?.domain || item?.domain || '',
  };
}
function provenanceBadge(item) {
  const info = provenanceOf(item);
  const badgeClass = info.source === 'Telegram' ? 'telegram' : info.source === 'Chrome Extension' ? 'extension' : 'memoir';
  const iconMarkup = info.source === 'Telegram' ? icon('Telegram') : info.source === 'Chrome Extension' ? icon('Globe') : '<img src="/brand/memoir-rhino-ui.png" alt="">';
  return `<button type="button" class="provenance-badge ${badgeClass}" data-provenance="${item.id}" title="Added via ${escapeHtml(info.source)}${info.domain ? ` (${escapeHtml(info.domain)})` : ''}">${iconMarkup}</button>`;
}
function showProvenance(id) {
  const item = state.items.find(row => row.id === id); if (!item) return; const info = provenanceOf(item); const created = new Date(info.createdAt); const time = Number.isNaN(created.getTime()) ? 'time unavailable' : created.toLocaleString();
  const iconMarkup = info.source === 'Telegram' ? icon('Telegram') : info.source === 'Chrome Extension' ? icon('Globe') : '<img src="/brand/memoir-rhino-ui.png" alt="">';
  modal.className = 'modal confirm'; modal.innerHTML = `<div class="modal-inner"><span class="confirm-icon provenance-confirm">${iconMarkup}</span><div class="modal-head"><div><p class="eyebrow">Creation history</p><h2>Added from ${escapeHtml(info.source)}</h2></div></div><p>“${escapeHtml(item.title)}” was captured on ${escapeHtml(time)} using ${escapeHtml(info.source)}${info.domain ? ` on ${escapeHtml(info.domain)}` : ''}.</p><div class="modal-actions"><button class="primary modal-cancel">Done</button></div></div>`; showModal();
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
  const whatsNewBanner = `
    <section class="notification-section notification-whats-new-banner" id="open-whats-new-from-notif">
      <div class="notification-whats-new-card">
        <div class="whats-new-icon-wrap">
          <img src="/brand/memoir-rhino-ui.png" alt="Rhinous">
        </div>
        <div class="whats-new-copy">
          <span class="chip-mini">NEW RELEASE</span>
          <strong>What's New in Memoir: Vault Intelligence & Attachments</strong>
          <small>Tap to read the full guide & tutorial from Maaz</small>
        </div>
        ${icon('ChevronRight')}
      </div>
    </section>
  `;
  return `<div class="notification-head"><div><p class="eyebrow">Telegram delivery center</p><h2>Notifications</h2></div><button class="modal-close" id="close-notifications">${icon('X')}</button></div><p class="notification-note">Only deliveries due within the next 14 hours appear here. Sent entries stay for the previous 14 hours, then are securely removed from the vault.</p>${whatsNewBanner}${section('Next 14 hours · reminders', reminderUpcoming)}${section('Next 14 hours · birthdays', birthdayUpcoming)}${section('Sent in the last 14 hours', sent, true)}`;
}
function toggleNotificationCenter(force) {
  let popover = document.querySelector('.notification-popover'); const shouldOpen = force ?? !popover;
  if (!shouldOpen) { popover?.remove(); return; }
  if (!popover) { popover = document.createElement('aside'); popover.className = 'notification-popover'; document.body.appendChild(popover); }
  const trigger = document.querySelector('#notification-center'); const triggerRect = trigger?.getBoundingClientRect();
  if (triggerRect) popover.style.setProperty('--notification-top', `${Math.round(triggerRect.bottom + 10)}px`);
  popover.innerHTML = notificationCenterMarkup();
  popover.querySelector('#close-notifications').onclick = () => popover.remove();
  popover.querySelector('#open-whats-new-from-notif')?.addEventListener('click', () => {
    popover.remove();
    showWhatsNewModal();
  });
}
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge'); if (!badge) return; const { upcoming, sent } = notificationCenterData(); const count = upcoming.length + sent.length; badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = count === 0;
  if (document.querySelector('.notification-popover')) toggleNotificationCenter(true);
}

let isAnnouncementOpen = false;

function showWhatsNewModal() {
  const profile = activeProfile();
  isAnnouncementOpen = true;
  modal.className = 'modal whats-new-modal';
  modal.innerHTML = `
    <div class="modal-inner whats-new-container">
      <div class="whats-new-hero">
        <button type="button" class="modal-close whats-new-close" id="whats-new-close-btn" aria-label="Close">${icon('X')}</button>
        <div class="whats-new-badge-pill"><span class="pulse-dot"></span><span>VAULT INTELLIGENCE 2.4</span></div>
        <div class="whats-new-emblem">
          <img src="/brand/pwa-192.png" alt="Memoir">
        </div>
        <h2>What’s New in Memoir</h2>
        <p class="whats-new-subtitle">A major upgrade built for ${escapeHtml(profile?.name || 'you')} — high-resolution attachments, AI retrieval, zero-knowledge privacy, and smart capture.</p>
        <div class="scroll-down-hint">scroll down till down</div>
      </div>

      <div class="whats-new-scroll-body">
        <div class="whats-new-feature-card">
          <div class="feature-card-header">
            <span class="icon-wrap violet">${icon('Paperclip')}</span>
            <div class="feature-title-group">
              <h3>Universal PDF & High-Res Attachments</h3>
              <small>Photos (up to 5) · PDFs (up to 3) across all memories</small>
            </div>
          </div>
          <p>Attach crystal-clear photos (≤ 6 MB each) and PDFs (≤ 10 MB each) to any memory. All files are encrypted on your device with <code>AES-256-GCM</code> before cloud storage.</p>
          
          <div class="feature-steps-list">
            <div class="feature-step-row">
              <span class="step-badge">1</span>
              <div class="step-text">Open or edit any memory and drag & drop your photos or PDFs.</div>
            </div>
            <div class="feature-step-row">
              <span class="step-badge">2</span>
              <div class="step-text">Tap <strong>Save changes</strong>. Your files are encrypted with zero-knowledge keys.</div>
            </div>
            <div class="feature-step-row">
              <span class="step-badge">3</span>
              <div class="step-text">Remove or swap attachments anytime by clicking the delete button on any chip.</div>
            </div>
          </div>

          <div class="feature-callout-pill">
            <span class="callout-icon">${icon('Zap')}</span>
            <div class="callout-text">
              <strong>Instant 0ms Reload:</strong> Decrypted documents are securely cached in local IndexedDB, so viewing them again consumes zero network data.
            </div>
          </div>
        </div>

        <div class="whats-new-feature-card">
          <div class="feature-card-header">
            <span class="icon-wrap coral">${icon('MessageCircle')}</span>
            <div class="feature-title-group">
              <h3>Rhinous In-Chat Document Retrieval</h3>
              <small>Ask Rhinous for your documents & PDFs directly in conversation</small>
            </div>
          </div>
          <p>No need to search through menus. Just ask Rhinous naturally in chat:</p>
          
          <div class="chat-demo-card">
            <div class="chat-demo-bubble user">
              <span>“Can you please give my birth certificate PDF?”</span>
            </div>
            <div class="chat-demo-bubble bot">
              <div class="demo-bot-tag">RHINOUS</div>
              <p>Here is your attached document from vault:</p>
              <div class="demo-doc-chip">
                <span class="demo-doc-icon">${icon('FileText')}</span>
                <div class="demo-doc-meta">
                  <strong>Birth_Certificate.pdf</strong>
                  <small>1.4 MB · Tap to view</small>
                </div>
                <span class="demo-doc-action">${icon('Share2')}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="whats-new-feature-card">
          <div class="feature-card-header">
            <span class="icon-wrap green">${icon('ReceiptText')}</span>
            <div class="feature-title-group">
              <h3>Smart INR (₹) Invoice & Warranty Capture</h3>
              <small>Multimodal AI auto-detects prices, GSTIN & expiry</small>
            </div>
          </div>
          <p>Snap any bill, receipt, or warranty card using the camera in Rhinous. Rhinous extracts prices formatted as <strong>₹XX,XXX.XX (INR)</strong>, vendor names, dates, and warranty periods automatically.</p>
        </div>

        <div class="whats-new-feature-card">
          <div class="feature-card-header">
            <span class="icon-wrap onyx">${icon('ShieldCheck')}</span>
            <div class="feature-title-group">
              <h3>Safe Decryption & Sharing Warnings</h3>
              <small>Protect your private data when exporting outside Memoir</small>
            </div>
          </div>
          <p>Whenever you share or export a decrypted PDF or photo to WhatsApp, Telegram, or device storage, Memoir presents a security warning confirming you intend to share decrypted vault contents.</p>
        </div>

        <div class="whats-new-footer-note">
          <span class="footer-note-icon">${icon('Info')}</span>
          <p><strong>Want to see this tutorial again?</strong> You can reopen this guide anytime by tapping the Notification bell at the top of your vault.</p>
        </div>

        <div class="signature-section">
          <div class="scroll-down-hint bottom">scroll down till down</div>
          <p>Crafted with privacy and love for your vault,</p>
          <div class="handwritten-signature">Maaz</div>
          <small>Memoir Architect & Developer</small>
        </div>

        <div class="whats-new-actions">
          <button type="button" class="primary whats-new-dismiss-btn" id="whats-new-dismiss-btn">${icon('Check')} Got it, Explore Memoir</button>
        </div>
      </div>
    </div>
  `;
  showModal();

  const handleDismiss = () => {
    isAnnouncementOpen = false;
    if (profile?.uid) {
      localStorage.setItem(`memoir-seen-announcement-v2.4-${profile.uid}`, 'true');
    }
    closeModal();
    toast('Welcome to Memoir v2.4!');
  };

  document.querySelector('#whats-new-dismiss-btn')?.addEventListener('click', handleDismiss);
  document.querySelector('#whats-new-close-btn')?.addEventListener('click', handleDismiss);
}

function checkWhatsNewAnnouncement() {
  const profile = activeProfile();
  if (!profile || isAnnouncementOpen) return;
  const key = `memoir-seen-announcement-v2.4-${profile.uid}`;
  if (!localStorage.getItem(key)) {
    isAnnouncementOpen = true;
    setTimeout(() => {
      if (modal.open) return;
      showWhatsNewModal();
    }, 450);
  }
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
          <div class="global-search"><span>${icon('Search')}</span><input id="global-search" name="search" aria-label="Search everything" placeholder="Search everything…" autocomplete="off"><span class="key-hint">⌘ K</span></div>
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
  checkWhatsNewAnnouncement();
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
    const resendAt = Number(state.auth.otpResendAt || 0); const resendWaiting = resendAt > Date.now(); const requestsRemaining = Number(state.auth.otpRequestsRemaining ?? 5); const attemptsRemaining = Number(state.auth.otpAttemptsRemaining ?? 3);
    if (deviceLimit) {
      const activeDevices = (state.auth.activeDevices || []).slice(0, 2).map((device, index) => {
        const signedIn = Number(device.verifiedAt || 0); const when = signedIn ? new Date(signedIn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Active session';
        return `<div class="device-session-row"><span class="device-session-number">${index + 1}</span><div><strong>${escapeHtml(device.name || 'Memoir device')}</strong><span>${escapeHtml(when)}</span></div><i>Active</i></div>`;
      }).join('');
      content = `<div class="auth-copy"><p class="eyebrow">Device protection</p><h1>Maximum login reached.</h1><p>Two devices are already using ${escapeHtml(profile.name)}’s Memoir vault.</p></div><section class="device-limit-panel"><div class="device-limit-heading"><span>${icon('LockKeyhole')}</span><div><strong>Two active devices</strong><p>Your OTP is correct. Choose whether to keep those sessions or continue on this device.</p></div></div><div class="device-session-list">${activeDevices}</div><div class="device-limit-warning">${icon('ShieldCheck')}<span>Logging in here immediately signs out both existing devices, even if their 12-hour sessions have not ended.</span></div></section>${error}<button class="primary auth-submit device-takeover" id="replace-devices">${icon('LogOut')} Login here and sign out both</button><div class="auth-secondary-actions"><button type="button" data-back-login>Keep current devices</button><button type="button" data-switch-account>Switch account</button></div><div class="auth-trust">${icon('ShieldCheck')}<span>Memoir permits a maximum of two verified devices per account. Every normal session still expires after 12 hours.</span></div>`;
    } else {
      const verificationNotice = success ? `<div class="otp-result success">${icon('CircleCheckBig')}<div><strong>OTP verified</strong><span>Opening your encrypted vault securely…</span></div></div>` : locked ? `<div class="otp-result locked">${icon('LockKeyhole')}<div><strong>Verification locked</strong><span>Try again in <b data-security-countdown="${lockedUntil}"></b>.</span></div></div>` : denied ? `<div class="otp-result denied">${icon('X')}<div><strong>Incorrect security code</strong><span>${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before a 12-hour lock.</span></div></div>` : '';
      content = `<div class="auth-copy"><p class="eyebrow">Telegram verification</p><h1>${success ? 'Identity confirmed.' : `Check Telegram, ${escapeHtml(profile.name)}.`}</h1><p>${escapeHtml(state.auth.message || 'Enter the 6-digit code sent to your private Telegram account.')}</p></div>${verificationNotice}<form class="auth-form otp-verification ${success ? 'is-success' : denied ? 'is-denied' : status === 'verifyingOtp' ? 'is-verifying' : ''}" id="otp-form"><label>6-digit security code<input id="auth-otp" class="otp-input ${success ? 'verified' : denied ? 'denied' : status === 'verifyingOtp' ? 'verifying' : ''}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required autofocus placeholder="" value="${escapeHtml(state.auth.enteredOtp || '')}" ${success || locked ? `disabled${locked ? ` data-enable-at="${lockedUntil}"` : ''}` : ''}></label>${error}<button class="primary auth-submit" ${status === 'verifyingOtp' || success || locked ? `disabled${locked ? ` data-enable-at="${lockedUntil}"` : ''}` : ''}>${status === 'verifyingOtp' ? '<span class="button-spinner"></span> Verifying securely…' : success ? `${icon('CircleCheckBig')} Verified` : `${icon('ShieldCheck')} Verify and open Memoir`}</button></form><div class="otp-security-meta"><span>Code expires in <strong data-security-countdown="${Number(state.auth.otpExpiresAt || 0)}" data-expired-label="Expired"></strong></span><span>${requestsRemaining} of 5 OTP requests remaining</span></div><div class="auth-secondary-actions"><button type="button" id="resend-otp" data-enable-at="${resendAt}" ${success ? 'data-permanent-disabled="true"' : ''} ${resendWaiting || success ? 'disabled' : ''}><span data-wait-label>${resendWaiting ? `New code in ${securityCountdown(resendAt)}` : 'Send a new code'}</span></button><button type="button" data-back-login ${success ? 'disabled' : ''}>Back to password</button><button type="button" data-switch-account ${success ? 'disabled' : ''}>Switch account</button></div><div class="auth-trust">${icon('ShieldCheck')}<span>Resends require 1:30 min. Five OTP requests lock resends for 4 hours; three incorrect OTPs lock verification for 12 hours.</span></div>`;
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
  
  const otpInput = document.querySelector('#auth-otp');
  const otpForm = document.querySelector('#otp-form');
  if (otpInput) {
    otpInput.addEventListener('input', () => {
      const val = otpInput.value.replace(/\D/g, '').slice(0, 6);
      otpInput.value = val;
      state.auth.enteredOtp = val;

      otpForm?.classList.remove('is-denied');
      otpInput.classList.remove('denied');
      document.querySelector('.auth-card')?.classList.remove('auth-rejected');
      document.querySelector('.otp-result.denied')?.remove();
      document.querySelector('.auth-error')?.remove();

      if (val.length === 6 && !otpInput.disabled) {
        otpInput.classList.add('verifying');
        otpForm?.classList.add('is-verifying');
        otpForm?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });
  }

  document.querySelector('#otp-form')?.addEventListener('submit', async event => {
    event.preventDefault(); state.authError = '';
    const input = document.querySelector('#auth-otp');
    const code = (input?.value || '').replace(/\D/g, '');
    if (code.length !== 6) return;

    input?.classList.add('verifying');
    document.querySelector('#otp-form')?.classList.add('is-verifying');

    try {
      await vaultStore.verifyOtp(code);
      input?.classList.remove('verifying');
      input?.classList.add('verified');
      document.querySelector('#otp-form')?.classList.add('is-success');
      toast('OTP verified — Memoir unlocked', 'success');
    }
    catch (error) {
      input?.classList.remove('verifying');
      input?.classList.add('denied');
      document.querySelector('#otp-form')?.classList.remove('is-verifying');
      document.querySelector('#otp-form')?.classList.add('is-denied');
      state.authError = error?.code === 'auth/device-limit' ? '' : error?.code === 'vault/key-unlock-failed' ? 'The Firebase password cannot unlock this account’s encrypted vault key. Sign in again with the correct password.' : error.message || 'The Telegram code could not be verified.';
      shell();
      setTimeout(() => {
        const inp = document.querySelector('#auth-otp');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }, 80);
    }
  });
  document.querySelector('#replace-devices')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true; event.currentTarget.innerHTML = '<span class="button-spinner"></span> Securing this device…'; state.authError = '';
    try { await vaultStore.replaceActiveDevices(); toast('Logged in here — both earlier devices were signed out', 'success'); }
    catch (error) { state.authError = error.message || 'The existing device sessions could not be replaced.'; shell(); }
  });
  document.querySelector('#resend-otp')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true; state.authError = '';
    try { await vaultStore.resendOtp(); }
    catch (error) { state.authError = error?.code === 'auth/otp-rate-limit' ? `Please wait ${error.retryAfter || 30} seconds before requesting another code.` : error.message || 'A new code could not be sent.'; shell(); }
  });
  document.querySelectorAll('[data-switch-account]').forEach(button => button.addEventListener('click', () => vaultStore.showAccountSelector()));
  document.querySelectorAll('[data-back-login]').forEach(button => button.addEventListener('click', () => vaultStore.signOut('retry')));
}

function skeleton() { return `<section class="vault-opening"><div class="vault-opening-head"><span class="vault-opening-mark"><img src="/brand/memoir-rhino-ui.png" alt=""></span><div><p class="eyebrow">Encrypted cloud vault</p><h2>Loading your memories…</h2><p>Downloading and decrypting this owner’s latest records. Cached memories will appear instantly on future visits.</p></div><span class="opening-live"><i></i> Secure sync</span></div><div class="opening-grid"><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article><article class="opening-card"><div class="skeleton opening-icon"></div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></article></div><div class="opening-list">${Array.from({ length: 4 }, () => `<div class="opening-row"><div class="skeleton opening-avatar"></div><div><div class="skeleton opening-line wide"></div><div class="skeleton opening-line"></div></div><div class="skeleton opening-action"></div></div>`).join('')}</div></section>`; }
function currentView() { return ({ home: homeView, vault: vaultView, guard: guardView, assistant: assistantView, planner: plannerView, capture: captureView, birthdays: birthdaysView }[state.view] || homeView)(); }
function memories() { return state.items.filter(item => item.kind !== 'clipboard' && !['Reminder', 'Notification', 'Todo'].includes(item.type)); }
function vaultMemories() { return memories().filter(item => item.type !== 'Birthday' && item.type !== 'Audio' && !isBrowserCapture(item)); }
function memoryFilterGroup(item) {
  if (item.type === 'Finance') return 'banks';
  if (['Identity', 'Government Document'].includes(item.type)) return 'documents';
  if (item.type === 'Login') return 'logins';
  if (item.type === 'Wi-Fi') return 'wifi';
  return 'notes';
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

const documentDataLabels = new Set(['Document Attachments', 'Attachments']);

function parseItemAttachments(item) {
  try {
    const raw = item?.fields?.['Document Attachments'] || item?.attachments;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(att => ({
      assetId: String(att.assetId || att.id || ''),
      fileName: String(att.fileName || att.name || 'document'),
      mimeType: String(att.mimeType || att.type || 'application/pdf'),
      byteLength: Number(att.byteLength || att.size || 0),
      createdAt: Number(att.createdAt || 0) || Date.now(),
    })).filter(att => att.assetId);
  } catch {
    return [];
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(mimeType = '', fileName = '') {
  return /pdf/i.test(mimeType) || /\.pdf$/i.test(fileName);
}

async function promptSecureShare(assetId, fileName, mimeType) {
  modal.className = 'modal confirm';
  modal.innerHTML = `<div class="modal-inner">
    <div class="confirm-icon">${icon('ShieldAlert')}</div>
    <div class="modal-head"><div><p class="eyebrow">Privacy Warning</p><h2>Share decrypted document?</h2></div></div>
    <p>You are about to export <strong>${escapeHtml(fileName)}</strong> outside Memoir. Anyone with this file will be able to view its contents without entering your vault code.</p>
    <div class="modal-actions">
      <button type="button" class="secondary modal-cancel">Cancel</button>
      <button type="button" class="primary modal-confirm" id="confirm-share-action">${icon('Share2')} Share securely</button>
    </div>
  </div>`;
  showModal();

  modal.querySelector('#confirm-share-action').onclick = async () => {
    closeModal();
    try {
      await withRhinoActivity('Decrypting document for share…', async () => {
        const doc = await vaultStore.getDocument(assetId, mimeType, fileName);
        const file = new File([doc.blob], fileName, { type: doc.mimeType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: fileName,
            text: `Decrypted document from Memoir Vault: ${fileName}`,
            files: [file],
          });
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(doc.blob);
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast(`“${fileName}” downloaded to device`);
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') toast(err.message || 'Share failed');
    }
  };
}

function attachImageZoomControls(imageEl, viewportEl) {
  if (!imageEl || !viewportEl) return;
  let scale = 1;
  let posX = 0;
  let posY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialPinchDistance = 0;
  let initialPinchScale = 1;

  const indicator = document.querySelector('#zoom-level-indicator');

  const updateTransform = (animate = false) => {
    if (animate) {
      imageEl.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
      setTimeout(() => { imageEl.style.transition = 'none'; }, 220);
    } else {
      imageEl.style.transition = 'none';
    }
    imageEl.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
    if (indicator) indicator.textContent = `${Math.round(scale * 100)}%`;
    viewportEl.style.cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
  };

  const setScale = (newScale, animate = true) => {
    const clamped = Math.min(Math.max(newScale, 0.5), 4.5);
    if (clamped <= 1) {
      posX = 0;
      posY = 0;
    }
    scale = clamped;
    updateTransform(animate);
  };

  document.querySelector('#zoom-in-btn')?.addEventListener('click', () => setScale(scale + 0.35, true));
  document.querySelector('#zoom-out-btn')?.addEventListener('click', () => setScale(scale - 0.35, true));
  document.querySelector('#zoom-reset-btn')?.addEventListener('click', () => {
    scale = 1; posX = 0; posY = 0;
    updateTransform(true);
  });

  // Double click / tap to toggle zoom
  let lastTap = 0;
  viewportEl.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 320) {
      if (scale > 1) {
        scale = 1; posX = 0; posY = 0;
      } else {
        scale = 2.2;
      }
      updateTransform(true);
    }
    lastTap = now;
  });

  // Wheel zoom
  viewportEl.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.22 : -0.22;
    setScale(scale + delta, false);
  }, { passive: false });

  // Mouse Drag / Pan
  viewportEl.addEventListener('mousedown', e => {
    if (scale <= 1) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
    updateTransform(false);
    e.preventDefault();
  });

  const onMouseMove = e => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    updateTransform(false);
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      updateTransform(false);
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // Touch Pinch-to-Zoom & Pan (Mobile / Tablet)
  viewportEl.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchScale = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging = true;
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    }
  }, { passive: false });

  viewportEl.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (initialPinchDistance > 0) {
        const factor = currentDist / initialPinchDistance;
        setScale(initialPinchScale * factor, false);
      }
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      posX = e.touches[0].clientX - startX;
      posY = e.touches[0].clientY - startY;
      updateTransform(false);
    }
  }, { passive: false });

  viewportEl.addEventListener('touchend', e => {
    if (e.touches.length < 2) initialPinchDistance = 0;
    if (e.touches.length === 0) isDragging = false;
  });
}

async function openDocumentViewer(assetId, fileName, mimeType) {
  const isPdfDoc = isPdf(mimeType, fileName);
  modal.className = 'modal document-viewer-modal-wrap';
  modal.innerHTML = `<div class="modal-inner document-viewer-modal">
    <div class="document-viewer-head">
      <div class="document-viewer-top-row">
        <div class="document-viewer-title">
          <span class="doc-type-badge ${isPdfDoc ? 'pdf' : 'image'}">${icon(isPdfDoc ? 'FileText' : 'Image')}</span>
          <div class="doc-title-text">
            <strong title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</strong>
            <small>${isPdfDoc ? 'PDF Document' : 'High-Res Photo'} · Encrypted in Vault</small>
          </div>
        </div>
        <button type="button" class="modal-close doc-close-btn" id="doc-viewer-close-btn" aria-label="Close">${icon('X')}</button>
      </div>

      <div class="document-viewer-toolbar-row">
        <div class="doc-zoom-controls" id="doc-zoom-controls" style="${isPdfDoc ? 'display:none;' : ''}">
          <button type="button" class="doc-zoom-btn" id="zoom-out-btn" title="Zoom Out" aria-label="Zoom Out">${icon('Minus')}</button>
          <span class="zoom-level-text" id="zoom-level-indicator">100%</span>
          <button type="button" class="doc-zoom-btn" id="zoom-in-btn" title="Zoom In" aria-label="Zoom In">${icon('Plus')}</button>
          <button type="button" class="doc-zoom-btn reset-btn" id="zoom-reset-btn" title="Reset to Fit">Fit</button>
        </div>
        <div class="doc-share-actions">
          <button type="button" class="doc-action-icon-btn" id="doc-share-btn" title="Share file" aria-label="Share">${icon('Share2')}</button>
          <button type="button" class="doc-action-icon-btn" id="doc-download-btn" title="Download file" aria-label="Download">${icon('Download')}</button>
        </div>
      </div>
    </div>
    <div class="document-viewer-body" id="doc-viewer-content">
      <div class="doc-loading-spinner">
        <div class="rhino-pulse-ring">
          <img src="/brand/memoir-rhino-ui.png" class="upload-rhino-spinner" alt="">
        </div>
        <strong>Retrieving and Decrypting Document…</strong>
        <p>Safely fetching from your encrypted vault storage. Please wait a moment.</p>
      </div>
    </div>
  </div>`;
  showModal();

  document.querySelector('#doc-viewer-close-btn')?.addEventListener('click', closeModal);

  try {
    const doc = await vaultStore.getDocument(assetId, mimeType, fileName);
    const objectUrl = URL.createObjectURL(doc.blob);
    const container = document.querySelector('#doc-viewer-content');
    if (!container) return;

    if (isPdfDoc) {
      container.innerHTML = `<iframe src="${objectUrl}#toolbar=1" class="pdf-frame" title="${escapeHtml(fileName)}"></iframe>`;
    } else {
      container.innerHTML = `
        <div class="image-zoom-viewport" id="image-zoom-viewport">
          <img src="${objectUrl}" alt="${escapeHtml(fileName)}" class="doc-preview-image" id="zoomable-preview-img">
          <div class="zoom-hint-overlay">Pinch or scroll to zoom · Drag to pan</div>
        </div>
      `;
      const img = container.querySelector('#zoomable-preview-img');
      const viewport = container.querySelector('#image-zoom-viewport');
      attachImageZoomControls(img, viewport);
    }

    document.querySelector('#doc-download-btn').onclick = () => {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast(`“${fileName}” downloaded`);
    };

    document.querySelector('#doc-share-btn').onclick = () => {
      closeModal();
      promptSecureShare(assetId, fileName, mimeType);
    };
  } catch (err) {
    const container = document.querySelector('#doc-viewer-content');
    if (container) {
      container.innerHTML = `<div class="doc-loading-spinner" style="color:var(--danger)">
        <p>Could not open document: ${escapeHtml(err.message || 'Decryption failed')}</p>
      </div>`;
    }
  }
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
  const guardAudit = auditVaultSecurity(state.items, activeProfile());
  const guardBannerHtml = guardAudit.allVulnerabilities.length ? `
    <article class="guard-stat-card ${guardAudit.hasCritical ? 'alert' : 'warning'}" style="margin:16px 0;cursor:pointer" data-view="guard">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="icon-wrap ${guardAudit.hasCritical ? 'rose' : 'coral'}" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none">${icon(guardAudit.hasCritical ? 'ShieldAlert' : 'ShieldCheck')}</span>
          <div>
            <strong style="font-size:13px;color:var(--ink)">Rhino Guard: ${guardAudit.score}% Security Health (${guardAudit.grade.split(' ')[0]})</strong>
            <p style="margin:2px 0 0;font-size:11px;color:var(--muted)">${guardAudit.allVulnerabilities.length} credential vulnerabilit${guardAudit.allVulnerabilities.length === 1 ? 'y' : 'ies'} found (reused passwords, weak PINs, or personal leaks).</p>
          </div>
        </div>
        <button type="button" class="text-btn" data-view="guard" style="flex:none">Audit Vault &rarr;</button>
      </div>
    </article>
  ` : '';
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

  const extensionItems = state.items.filter(isBrowserCapture);
  const extensionBannerHtml = `
    <article class="guard-stat-card warning" style="margin:16px 0;cursor:pointer;border-color:rgba(16,185,129,0.3);background:linear-gradient(135deg,rgba(16,185,129,0.06),var(--surface))" data-view="extension">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="icon-wrap green" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none">${icon('Globe')}</span>
          <div>
            <strong style="font-size:13px;color:var(--ink)">Chrome Extension & Browser Captures (${extensionItems.length})</strong>
            <p style="margin:2px 0 0;font-size:11px;color:var(--muted)">${extensionItems.length ? `${extensionItems.length} synced passwords, ACK numbers & application IDs from your browser.` : 'No browser captures yet. Install Memoir extension to auto-capture logins & application tokens.'}</p>
          </div>
        </div>
        <button type="button" class="text-btn" data-view="extension" style="flex:none">Open Captures &rarr;</button>
      </div>
    </article>
  `;

  const normalMemories = vaultMemories();
  return `<div class="hero-grid"><section class="hero"><img class="hero-rhino" src="/brand/memoir-rhino-ui.png" alt=""><p class="eyebrow">Your private second brain</p><h2>Everything important, remembered beautifully.</h2><p>Save private details, retrieve only what you need, and never miss a meaningful moment.</p><button class="primary" data-add="memory">${icon('Plus')} Add a memory</button></section>
  <div class="stat-grid"><article class="stat large" data-view="vault" style="cursor:pointer"><span class="stat-symbol rose">${icon('ShieldCheck')}</span><div><strong>${normalMemories.length}</strong><span>memories kept safe</span></div></article><article class="stat" data-view="extension" style="cursor:pointer"><span class="stat-symbol green">${icon('Globe')}</span><div><strong>${extensionItems.length}</strong><span>browser captures</span></div></article><article class="stat" data-view="reminders" style="cursor:pointer"><span class="stat-symbol violet">${icon('AlarmClock')}</span><div><strong>${upcomingReminders.length}</strong><span>upcoming reminders</span></div></article></div></div>
  ${extensionBannerHtml}
  ${guardBannerHtml}
  ${expiriesHtml}
  ${upcomingReminders.length ? `<div class="section-head"><h2>Coming up</h2><button class="text-btn" data-view="reminders">All reminders</button></div><div class="dashboard-reminders">${upcomingReminders.slice(0, 3).map(item => reminderCard(item, true)).join('')}</div>` : ''}
  <div class="section-head"><h2>Recently remembered</h2><button class="text-btn" data-view="vault">View everything</button></div>
  ${normalMemories.length ? `<div class="card-grid">${normalMemories.slice(0, 3).map(memoryCard).join('')}</div>` : emptyState('Gem', 'Your vault is ready', 'Add your first memory. No demo records are included.', 'Add memory', 'memory')}`;
}

function auditVaultSecurity(items, profile) {
  const ownerName = String(profile?.name || '').trim().toLowerCase();
  const ownerEmail = String(profile?.email || '').trim().toLowerCase();
  const emailUser = ownerEmail.split('@')[0] || '';
  const ownerCode = String(profile?.code || '').trim();
  const ownerYears = ownerName.includes('maaz') ? ['2002', '02'] : ownerName.includes('deepti') ? ['1995', '2005', '95', '05'] : ['2002', '2005'];

  const passwordMap = new Map();
  const pinMap = new Map();
  const weakItems = [];
  const personalInfoItems = [];
  const cardIssues = [];
  let totalCredentials = 0;

  const relevantItems = (Array.isArray(items) ? items : []).filter(item => item.type !== 'Notification' && item.type !== 'Audio' && item.type !== 'Todo');

  relevantItems.forEach(item => {
    const fields = item.fields || {};
    Object.entries(fields).forEach(([label, value]) => {
      const val = String(value || '').trim();
      if (!val || /\[\[PRIVATE_\d+\]\]/.test(val)) return;

      const isPassword = /password|passcode|secret/i.test(label);
      const isPin = /\bpin\b|atm pin|upi pin/i.test(label);
      const isCvv = /\bcvv\b|security code/i.test(label);

      if (isPassword || isPin || isCvv) totalCredentials += 1;

      // 1. Password checks
      if (isPassword && val.length > 0) {
        if (!passwordMap.has(val)) passwordMap.set(val, []);
        passwordMap.get(val).push({ item, label, value: val });

        const isShort = val.length < 8;
        const onlyNumbers = /^\d+$/.test(val);
        const onlyLetters = /^[a-zA-Z]+$/.test(val);
        const commonDict = /^(password|admin|123456|12345678|qwerty|welcome|iloveyou|letmein|pass123)$/i.test(val);

        if (isShort || onlyNumbers || onlyLetters || commonDict) {
          let reason = isShort ? 'Password is too short (less than 8 characters)' : onlyNumbers ? 'Contains only numbers' : onlyLetters ? 'Contains only letters with no symbols or digits' : 'Easily guessable dictionary word';
          weakItems.push({ id: item.id, item, label, value: val, reason, type: 'Password', severity: isShort || commonDict ? 'critical' : 'high' });
        }

        const lowerVal = val.toLowerCase();
        let personalReason = '';
        if (ownerName && ownerName.length >= 3 && lowerVal.includes(ownerName)) {
          personalReason = `Password contains your name "${profile.name}"`;
        } else if (emailUser && emailUser.length >= 3 && lowerVal.includes(emailUser)) {
          personalReason = `Password contains your email username "${emailUser}"`;
        } else if (ownerCode && lowerVal.includes(ownerCode)) {
          personalReason = `Password contains your 4-digit Memoir vault code (${ownerCode})`;
        } else if (ownerYears.some(y => y.length === 4 && lowerVal.includes(y))) {
          personalReason = `Password contains personal birth year (${ownerYears.find(y => y.length === 4 && lowerVal.includes(y))})`;
        }

        if (personalReason) {
          personalInfoItems.push({ id: item.id, item, label, value: val, reason: personalReason, type: 'Password', severity: 'high' });
        }
      }

      // 2. PIN checks
      if (isPin && val.length > 0) {
        if (!pinMap.has(val)) pinMap.set(val, []);
        pinMap.get(val).push({ item, label, value: val });

        const sequential = /^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)$/.test(val);
        const repeated = /^(\d)\1+$/.test(val);
        const patternPin = /^(1212|2580|1379|1990|1995|2000|2002|2005|2024|2025|2026)$/.test(val);

        if (sequential || repeated || patternPin || val.length < 4) {
          const reason = sequential ? 'Sequential digits (1234/4321)' : repeated ? 'Repeated digits (e.g. 1111/0000)' : val.length < 4 ? 'Too short for standard ATM/UPI PIN' : 'Easily guessable pattern / birth year';
          weakItems.push({ id: item.id, item, label, value: val, reason, type: 'PIN', severity: sequential || repeated ? 'critical' : 'high' });
        }

        if (ownerCode && val === ownerCode) {
          personalInfoItems.push({ id: item.id, item, label, value: val, reason: `ATM PIN matches your Memoir vault passcode (${ownerCode})`, type: 'PIN', severity: 'critical' });
        } else if (ownerYears.some(y => val.includes(y))) {
          personalInfoItems.push({ id: item.id, item, label, value: val, reason: `ATM PIN matches your birth year (${ownerYears.find(y => val.includes(y))})`, type: 'PIN', severity: 'high' });
        }
      }
    });

    if (item.type === 'Finance' && (fields['Debit card number'] || fields['Card number'] || /card/i.test(item.title))) {
      const hasCvv = Boolean(fields.CVV || fields['Security code']);
      const hasExpiry = Boolean(fields.Expiry || fields['Valid thru'] || fields['Expiry date']);
      if (!hasCvv) cardIssues.push({ id: item.id, item, reason: 'Missing CVV / Security code on saved card', type: 'Card', severity: 'medium' });
      if (!hasExpiry) cardIssues.push({ id: item.id, item, reason: 'Missing expiration date on saved card', type: 'Card', severity: 'medium' });
    }
  });

  const reusedPasswords = [];
  passwordMap.forEach((instances) => {
    if (instances.length > 1) {
      const isBankOrGov = instances.some(i => i.item.type === 'Finance' || /bank|sbi|hdfc|icici|epfo|gov|tax|mail|gmail/i.test(i.item.title));
      reusedPasswords.push({
        type: 'Reused Password',
        count: instances.length,
        items: instances.map(i => i.item),
        labels: instances.map(i => `${i.item.title} (${i.label})`),
        severity: isBankOrGov ? 'critical' : 'high',
        reason: isBankOrGov ? `CRITICAL: Password reused across essential accounts (${instances.map(i => i.item.title).join(', ')})` : `Exact same password reused across ${instances.length} accounts`,
      });
    }
  });

  const reusedPins = [];
  pinMap.forEach((instances) => {
    if (instances.length > 1) {
      reusedPins.push({
        type: 'Reused PIN',
        count: instances.length,
        items: instances.map(i => i.item),
        labels: instances.map(i => `${i.item.title} (${i.label})`),
        severity: 'critical',
        reason: `Same ATM / UPI PIN used across multiple cards (${instances.map(i => i.item.title).join(', ')})`,
      });
    }
  });

  let score = 100;
  reusedPasswords.forEach(r => score -= (r.severity === 'critical' ? 14 : 9));
  reusedPins.forEach(() => score -= 14);
  weakItems.forEach(w => score -= (w.severity === 'critical' ? 10 : 6));
  personalInfoItems.forEach(p => score -= (p.severity === 'critical' ? 12 : 7));
  cardIssues.forEach(() => score -= 4);

  score = Math.max(12, Math.min(100, Math.round(score)));

  const grade = score >= 90 ? 'A+ Fortified' : score >= 75 ? 'B+ Good' : score >= 55 ? 'C Needs Attention' : 'D High Risk';
  const gradeColor = score >= 90 ? '#10b981' : score >= 75 ? '#06b6d4' : score >= 55 ? '#f59e0b' : '#ef4444';

  const allVulnerabilities = [
    ...reusedPasswords.map(r => ({ ...r, category: 'reused' })),
    ...reusedPins.map(r => ({ ...r, category: 'reused' })),
    ...weakItems.map(w => ({ ...w, category: 'weak' })),
    ...personalInfoItems.map(p => ({ ...p, category: 'personal' })),
    ...cardIssues.map(c => ({ ...c, category: 'card' })),
  ];

  return {
    score, grade, gradeColor, totalCredentials,
    reusedPasswords, reusedPins, weakItems, personalInfoItems, cardIssues,
    allVulnerabilities,
    hasCritical: allVulnerabilities.some(v => v.severity === 'critical'),
  };
}

function generateStrongSecret(type = 'password', length = 18) {
  const crypt = typeof crypto !== 'undefined' ? crypto : (typeof globalThis !== 'undefined' ? globalThis.crypto : null);
  if (type === 'pin') {
    const digits = '0123456789';
    let pin = '';
    const pinLen = length === 6 ? 6 : 4;
    do {
      pin = '';
      const array = new Uint8Array(pinLen);
      if (crypt?.getRandomValues) crypt.getRandomValues(array);
      else for (let i = 0; i < pinLen; i++) array[i] = Math.floor(Math.random() * 256);
      for (let i = 0; i < pinLen; i++) pin += digits[array[i] % 10];
    } while (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|1111|0000|2222|3333|4444|5555|6666|7777|8888|9999)$/.test(pin));
    return pin;
  }
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+-=[]{};:,.<>?';
  let result = '';
  const bytes = new Uint8Array(length);
  if (crypt?.getRandomValues) crypt.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < length; i++) result += chars[bytes[i] % chars.length];
  return result;
}

function guardView() {
  const profile = activeProfile();
  const audit = auditVaultSecurity(state.items, profile);
  const currentTab = state.guardTab || 'all';

  let filtered = [];
  if (currentTab === 'all') filtered = audit.allVulnerabilities;
  else if (currentTab === 'reused') filtered = audit.allVulnerabilities.filter(v => v.category === 'reused');
  else if (currentTab === 'weak') filtered = audit.allVulnerabilities.filter(v => v.category === 'weak');
  else if (currentTab === 'personal') filtered = audit.allVulnerabilities.filter(v => v.category === 'personal');
  else if (currentTab === 'card') filtered = audit.allVulnerabilities.filter(v => v.category === 'card');

  if (!state.generatedPassword) state.generatedPassword = generateStrongSecret('password', 18);
  if (!state.generatedPin) state.generatedPin = generateStrongSecret('pin', 4);

  const gradeLetter = audit.grade.charAt(0);
  const gradeStatus = audit.score >= 90 ? 'Fortified & Pristine' : audit.score >= 75 ? 'Good Protection' : audit.score >= 55 ? 'Needs Attention' : 'High Vulnerability Risk';
  const gradeExplanation = audit.score >= 90
    ? `Your vault credentials follow top-tier security standards with zero reused passwords or weak PINs.`
    : audit.score >= 75
    ? `Overall solid security with minor recommendations. Update flagged items to reach Grade A+.`
    : audit.score >= 55
    ? `Moderate vulnerability risks detected. You have reused passwords or easily guessable secrets.`
    : `Critical security risks detected. Essential banking or email accounts share identical passwords or guessable PINs. Update them below to secure your vault.`;

  const issuesMarkup = filtered.length ? filtered.map(vuln => {
    const isReused = vuln.category === 'reused';
    const firstItem = isReused ? vuln.items[0] : vuln.item;

    if (isReused) {
      return `
        <article class="guard-issue-card reused-cluster">
          <div class="guard-issue-head">
            <span class="guard-issue-icon ${vuln.severity}">${icon('KeyRound')}</span>
            <div class="guard-issue-title-wrap">
              <div class="guard-issue-top-line">
                <span class="guard-severity-tag ${vuln.severity}">${escapeHtml(vuln.severity.toUpperCase())}</span>
                <span class="guard-type-tag">Reused Secret (${vuln.count} Accounts)</span>
              </div>
              <strong>${escapeHtml(vuln.reason)}</strong>
              <p>A single data breach in one service exposes all ${vuln.count} accounts simultaneously.</p>
            </div>
          </div>
          <div class="guard-affected-list">
            <div class="guard-affected-list-head">
              <span>AFFECTED ACCOUNTS (${vuln.items.length})</span>
              <small>Update each with a unique password</small>
            </div>
            ${vuln.items.map(it => `
              <div class="guard-account-row">
                <div class="guard-account-info">
                  <span class="icon-wrap ${it.type === 'Finance' ? 'green' : 'violet'}">${icon(itemIcon(it))}</span>
                  <div>
                    <strong>${escapeHtml(it.title)}</strong>
                    <small>${escapeHtml(category(it))}</small>
                  </div>
                </div>
                <button type="button" class="secondary mini-action-btn" data-edit="${it.id}">
                  ${icon('Pencil')} <span>Update</span>
                </button>
              </div>
            `).join('')}
          </div>
        </article>
      `;
    }

    return `
      <article class="guard-issue-card">
        <div class="guard-issue-head">
          <span class="guard-issue-icon ${vuln.severity}">${icon(vuln.severity === 'critical' ? 'ShieldAlert' : 'TriangleAlert')}</span>
          <div class="guard-issue-title-wrap">
            <div class="guard-issue-top-line">
              <span class="guard-severity-tag ${vuln.severity}">${escapeHtml(vuln.severity.toUpperCase())}</span>
              <span class="guard-type-tag">${escapeHtml(vuln.type || 'Security')}</span>
            </div>
            <strong>${escapeHtml(vuln.reason)}</strong>
            <p>Found in: <strong>${escapeHtml(vuln.item?.title || 'Vault Record')}</strong> (${escapeHtml(category(vuln.item))})</p>
          </div>
        </div>
        <div class="guard-card-footer">
          <span class="guard-suggestion-text">💡 Suggestion: Use a unique 16+ character password or high-entropy PIN.</span>
          <button type="button" class="primary mini-action-btn" data-edit="${firstItem.id}">
            ${icon('Pencil')} <span>Update in Vault</span>
          </button>
        </div>
      </article>
    `;
  }).join('') : `
    <div class="empty">
      <span class="icon-wrap" style="color:var(--emerald)">${icon('ShieldCheck')}</span>
      <h3>No vulnerabilities in this category</h3>
      <p>Your saved credentials and PINs in this category follow strong security best practices.</p>
    </div>
  `;

  return `
    <div class="guard-layout">
      <section class="guard-hero">
        <div class="guard-score-box">
          <div class="guard-gauge">
            <svg viewBox="0 0 100 100" class="guard-gauge-svg">
              <circle cx="50" cy="50" r="42" class="guard-gauge-bg"/>
              <circle cx="50" cy="50" r="42" class="guard-gauge-fill" stroke-dasharray="264" stroke-dashoffset="${264 - (264 * audit.score) / 100}" style="stroke: ${audit.gradeColor}"/>
            </svg>
            <div class="guard-gauge-label">
              <strong>${audit.score}%</strong>
              <small>Grade ${gradeLetter}</small>
            </div>
          </div>
          <div class="guard-hero-text">
            <div class="guard-badge"><span class="icon-wrap">${icon('ShieldCheck')}</span><span>Rhino Guard Active</span></div>
            <h2>Vault Vulnerability & Credential Intelligence</h2>
            <p>Real-time on-device cryptographic audit of passwords, ATM PINs, CVVs, and personal identity leaks for <strong>${escapeHtml(profile.name)}</strong>.</p>
            <div class="guard-grade-banner ${audit.score < 55 ? 'critical' : audit.score < 75 ? 'warning' : 'good'}">
              <span class="icon-wrap ${audit.score < 55 ? 'rose' : audit.score < 75 ? 'coral' : 'green'}">${icon(audit.score < 55 ? 'ShieldAlert' : 'ShieldCheck')}</span>
              <p><strong>Grade ${gradeLetter} (${gradeStatus}):</strong> ${escapeHtml(gradeExplanation)}</p>
            </div>
          </div>
        </div>
        <div class="guard-stats-row">
          <div class="guard-stat-card"><span class="stat-num">${audit.totalCredentials}</span><span class="stat-desc">Credentials Audited</span></div>
          <div class="guard-stat-card ${audit.reusedPasswords.length + audit.reusedPins.length > 0 ? 'alert' : ''}"><span class="stat-num">${audit.reusedPasswords.length + audit.reusedPins.length}</span><span class="stat-desc">Reused Secrets</span></div>
          <div class="guard-stat-card ${audit.weakItems.length > 0 ? 'warning' : ''}"><span class="stat-num">${audit.weakItems.length}</span><span class="stat-desc">Weak Secrets</span></div>
          <div class="guard-stat-card ${audit.personalInfoItems.length > 0 ? 'warning' : ''}"><span class="stat-num">${audit.personalInfoItems.length}</span><span class="stat-desc">Name/Year Leaks</span></div>
        </div>
      </section>

      <section class="guard-generator-card">
        <div class="guard-generator-head">
          <div class="guard-gen-title-block">
            <span class="icon-wrap cyan">${icon('WandSparkles')}</span>
            <div>
              <p class="eyebrow">Smart Generator</p>
              <h3>Cryptographic Password & ATM PIN Generator</h3>
            </div>
          </div>
        </div>
        <div class="guard-generator-grid">
          <div class="guard-gen-block">
            <div class="guard-gen-block-head">
              <div>
                <strong>Strong Password</strong>
                <small>18 characters · High entropy</small>
              </div>
              <button type="button" class="guard-pill-btn" id="guard-refresh-pwd">
                ${icon('WandSparkles')} <span>Regenerate</span>
              </button>
            </div>
            <div class="guard-output-box">
              <code class="guard-output-code">${escapeHtml(state.generatedPassword)}</code>
              <button type="button" class="guard-copy-btn" data-copy="${escapeHtml(state.generatedPassword)}" title="Copy strong password">
                ${icon('Copy')} <span>Copy</span>
              </button>
            </div>
          </div>
          <div class="guard-gen-block">
            <div class="guard-gen-block-head">
              <div>
                <strong>Secure ATM / UPI PIN</strong>
                <small>4 digits · Non-sequential</small>
              </div>
              <button type="button" class="guard-pill-btn" id="guard-refresh-pin">
                ${icon('WandSparkles')} <span>Regenerate</span>
              </button>
            </div>
            <div class="guard-output-box">
              <code class="guard-output-code">${escapeHtml(state.generatedPin)}</code>
              <button type="button" class="guard-copy-btn" data-copy="${escapeHtml(state.generatedPin)}" title="Copy secure PIN">
                ${icon('Copy')} <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="guard-tab-bar">
        <button class="guard-tab-btn ${currentTab === 'all' ? 'active' : ''}" data-guard-tab="all">
          <span>All Issues</span><span class="guard-tab-badge">${audit.allVulnerabilities.length}</span>
        </button>
        <button class="guard-tab-btn ${currentTab === 'reused' ? 'active' : ''}" data-guard-tab="reused">
          <span>Reused Secrets</span><span class="guard-tab-badge">${audit.reusedPasswords.length + audit.reusedPins.length}</span>
        </button>
        <button class="guard-tab-btn ${currentTab === 'weak' ? 'active' : ''}" data-guard-tab="weak">
          <span>Weak & Guessable</span><span class="guard-tab-badge">${audit.weakItems.length}</span>
        </button>
        <button class="guard-tab-btn ${currentTab === 'personal' ? 'active' : ''}" data-guard-tab="personal">
          <span>Personal Leaks</span><span class="guard-tab-badge">${audit.personalInfoItems.length}</span>
        </button>
        <button class="guard-tab-btn ${currentTab === 'card' ? 'active' : ''}" data-guard-tab="card">
          <span>Card Audits</span><span class="guard-tab-badge">${audit.cardIssues.length}</span>
        </button>
      </div>

      <div class="guard-issues-grid">
        ${issuesMarkup}
      </div>
    </div>
  `;
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
  const documents = parseItemAttachments(item);
  const documentsMarkup = documents.length ? `
    <div class="document-attachments-section">
      <h4>${icon('Paperclip')} Attached Documents (${documents.length})</h4>
      <div class="document-attachments-grid">
        ${documents.map(att => {
          const isPdfDoc = isPdf(att.mimeType, att.fileName);
          return `
            <div class="doc-card" data-doc-view="${escapeHtml(att.assetId)}" data-doc-name="${escapeHtml(att.fileName)}" data-doc-mime="${escapeHtml(att.mimeType)}">
              <div class="doc-card-icon ${isPdfDoc ? 'pdf' : 'image'}">
                ${icon(isPdfDoc ? 'FileText' : 'Image')}
              </div>
              <div class="doc-card-meta">
                <strong>${escapeHtml(att.fileName)}</strong>
                <small>${formatFileSize(att.byteLength)} · ${isPdfDoc ? 'PDF Document' : 'Image'}</small>
              </div>
              <div class="doc-card-actions">
                <button type="button" class="icon-btn-mini" data-doc-share="${escapeHtml(att.assetId)}" data-doc-name="${escapeHtml(att.fileName)}" data-doc-mime="${escapeHtml(att.mimeType)}" title="Share securely">${icon('Share2')}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const displayFields = Object.entries(fields).filter(([k]) => !audioDataLabels.has(k) && !audioMetadataLabels.has(k) && !documentDataLabels.has(k));

  const provenance = item?.provenance || {};
  const isExtensionItem = /extension|chrome/i.test(String(provenance.source || item?.fields?.['Created via'] || '')) || Boolean(item.domain || item.url);
  const browserBox = isExtensionItem ? `
    <div class="browser-provenance-box">
      <div class="browser-provenance-head">
        <span class="icon-wrap green">${icon('Globe')}</span>
        <div>
          <strong>Captured via Chrome Extension</strong>
          <p>${escapeHtml(provenance.capturedDate ? `${provenance.capturedDate} at ${provenance.capturedTime || ''}` : (provenance.createdAt ? new Date(provenance.createdAt).toLocaleString() : 'Recent browser capture'))}${item.domain ? ` · ${escapeHtml(item.domain)}` : ''}</p>
        </div>
        ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="primary-btn-mini">${icon('ExternalLink')} Visit Page</a>` : ''}
      </div>
      ${item.pageTitle || provenance.pageTitle ? `<div class="browser-provenance-page"><small>Page:</small> <span>${escapeHtml(item.pageTitle || provenance.pageTitle)}</span></div>` : ''}
    </div>
  ` : '';

  const backLabel = state.view === 'audio' ? 'Back to audio' : 'Back to memories';
  return `<section class="detail"><button class="secondary" id="back-to-memories">${icon('ArrowLeft')} ${backLabel}</button><div class="detail-head"><span class="icon-wrap">${icon(itemIcon(item))}</span><div><p class="eyebrow">${escapeHtml(category(item))}</p><h2>${escapeHtml(item.title)}</h2></div>${provenanceBadge(item)}</div>${browserBox}${isCardRecord(item) ? paymentCard(item.title, fields) : ''}${audioPlayer}<div class="detail-fields ${isCardRecord(item) ? 'with-card' : ''}">${displayFields.map(([label, value]) => `<div class="detail-field"><div><small>${escapeHtml(label)}</small><strong class="${state.hidden ? 'blur' : ''}">${escapeHtml(value)}</strong></div><span class="field-actions">${externalLinkButton(value, `Open ${label}`)}<button class="icon-btn" data-copy="${escapeHtml(value)}" title="Copy">${icon('Copy')}</button></span></div>`).join('')}</div>${documentsMarkup}<p style="color:var(--muted);font-size:11px">${escapeHtml(item.note || '')}</p><div class="modal-actions" style="justify-content:flex-start"><button class="secondary" data-share="${item.id}">${icon('Share2')} Share</button>${attachment ? `<button class="secondary" data-audio-retry="${item.id}">${icon('AudioLines')} Transcribe again</button><button class="secondary" data-audio-transcript-edit="${item.id}">${icon('Pencil')} Edit transcript</button>` : `<button class="secondary" data-edit="${item.id}">${icon('Pencil')} Edit</button>`}<button class="ghost" data-delete="${item.id}">${icon('Trash2')} Delete</button></div></section>`;
}

function isBrowserCapture(item) {
  if (!item) return false;
  if (item.isExtensionCapture === true || item.capturedBy === 'extension' || item.source === 'extension') return true;
  const provSource = String(item?.provenance?.source || '').toLowerCase();
  if (provSource === 'chrome extension' || provSource === 'extension') return true;
  const createdVia = String(item?.fields?.['Created via'] || '').toLowerCase();
  if (createdVia === 'memoir chrome extension' || createdVia === 'chrome extension') return true;
  return false;
}

function browserCapturesView() {
  const allCaptures = state.items.filter(isBrowserCapture);
  const domains = Array.from(new Set(allCaptures.map(i => i.domain || (i.url ? new URL(i.url).hostname.replace(/^www\./i, '') : '')).filter(Boolean)));
  
  const extCategory = state.extCategory || 'all';
  const filterList = [
    ['all', 'All'],
    ['gov', 'Government'],
    ['logins', 'Logins'],
    ['finance', 'Cards'],
    ['identity', 'Identity'],
    ['personal', 'Notes'],
  ];

  let filtered = allCaptures;
  if (extCategory === 'gov') filtered = allCaptures.filter(i => i.type === 'Government Document' || /ack|application|challan|reg/i.test(i.title + JSON.stringify(i.fields || {})));
  else if (extCategory === 'logins') filtered = allCaptures.filter(i => i.type === 'Login');
  else if (extCategory === 'finance') filtered = allCaptures.filter(i => i.type === 'Finance');
  else if (extCategory === 'identity') filtered = allCaptures.filter(i => i.type === 'Identity');
  else if (extCategory === 'personal') filtered = allCaptures.filter(i => i.type === 'Personal');

  const filterBar = `<div class="memory-filters" role="tablist" aria-label="Filter browser captures">${filterList.map(([id, label]) => {
    const count = id === 'all' ? allCaptures.length : (
      id === 'gov' ? allCaptures.filter(i => i.type === 'Government Document' || /ack|application|challan|reg/i.test(i.title + JSON.stringify(i.fields || {}))).length :
      id === 'logins' ? allCaptures.filter(i => i.type === 'Login').length :
      id === 'finance' ? allCaptures.filter(i => i.type === 'Finance').length :
      id === 'identity' ? allCaptures.filter(i => i.type === 'Identity').length :
      allCaptures.filter(i => i.type === 'Personal').length
    );
    return `<button type="button" role="tab" aria-selected="${extCategory === id}" class="${extCategory === id ? 'active' : ''}" data-ext-category="${id}"><span>${escapeHtml(label)}</span><b>${count}</b></button>`;
  }).join('')}</div>`;

  const heroHtml = `
    <div class="ext-hero-card">
      <div class="ext-hero-content">
        <span class="icon-wrap green">${icon('Globe')}</span>
        <div>
          <p class="eyebrow">Chrome Extension Sync</p>
          <h2>Browser Captures & Autofill</h2>
          <p>Encrypted records, application numbers, passwords, and references captured across the web.</p>
        </div>
      </div>
      <div class="ext-hero-stats">
        <div class="ext-stat-pill"><strong>${allCaptures.length}</strong><span>Captured</span></div>
        <div class="ext-stat-pill"><strong>${domains.length}</strong><span>Portals</span></div>
      </div>
    </div>
  `;

  const toolbar = `
    <div class="toolbar">
      <input class="search-input" id="ext-filter" name="ext-filter" aria-label="Search browser captures" placeholder="Search application numbers, ACK tokens, passwords, or domains…">
      <button class="primary" data-add="memory">${icon('Plus')} Add memory</button>
    </div>
  `;

  return `
    ${heroHtml}
    ${toolbar}
    ${filterBar}
    ${filtered.length ? `<div class="vault-list" id="ext-vault-list">${filtered.map(vaultRow).join('')}</div>` : emptyState('Globe', 'No browser captures found', 'Capture logins, ACK tokens, or applications on any site using the Memoir Chrome Extension.', 'Add memory', 'memory')}
  `;
}

function vaultView() {
  const selected = state.items.find(item => item.id === state.selectedMemoryId);
  if (selected && selected.type !== 'Birthday') return detailMarkup(selected);
  state.selectedMemoryId = null;
  const guardAudit = auditVaultSecurity(state.items, activeProfile());
  const allCaptures = state.items.filter(isBrowserCapture);
  const switcher = workspaceSwitch('vault', state.vaultSection || 'memories', [
    ['memories', 'Gem', 'All Memories', 'Vault items, documents & logins'],
    ['extension', 'Globe', 'Browser Captures', `${allCaptures.length} synced web items`],
    ['security', 'ShieldCheck', 'Rhino Guard', `${guardAudit.score}% Health · ${guardAudit.allVulnerabilities.length ? `${guardAudit.allVulnerabilities.length} alerts` : 'Secure'}`],
  ]);
  if (state.vaultSection === 'security') {
    return `${switcher}<div class="workspace-body">${guardView()}</div>`;
  }
  if (state.vaultSection === 'extension') {
    return `${switcher}<div class="workspace-body">${browserCapturesView()}</div>`;
  }
  const all = vaultMemories();
  const filters = [['all', 'All'], ['banks', 'Banks'], ['documents', 'Documents'], ['logins', 'Logins'], ['wifi', 'Wi-Fi'], ['notes', 'Notes']];
  const counts = Object.fromEntries(filters.map(([id]) => [id, id === 'all' ? all.length : all.filter(item => memoryFilterGroup(item) === id).length]));
  const availableFilters = filters.filter(([id]) => id === 'all' || counts[id]);
  if (!availableFilters.some(([id]) => id === state.vaultCategory)) state.vaultCategory = 'all';
  const list = state.vaultCategory === 'all' ? all : all.filter(item => memoryFilterGroup(item) === state.vaultCategory);
  const filterBar = `<div class="memory-filters" role="tablist" aria-label="Filter memories by category">${availableFilters.map(([id, label]) => `<button type="button" role="tab" aria-selected="${state.vaultCategory === id}" class="${state.vaultCategory === id ? 'active' : ''}" data-vault-category="${id}"><span>${escapeHtml(label)}</span><b>${counts[id]}</b></button>`).join('')}</div>`;
  const empty = all.length ? emptyState('Search', `No ${filters.find(([id]) => id === state.vaultCategory)?.[1] || ''} memories`, 'Choose another category or add a new memory.', 'Add memory', 'memory') : emptyState('Gem', 'Nothing saved yet', 'Start with a login, bank record, document, Wi-Fi detail, or anything personal.', 'Add first memory', 'memory');
  return `${switcher}<div class="workspace-body"><div class="toolbar"><input class="search-input" id="vault-filter" name="vault-filter" aria-label="Filter memories" placeholder="Filter titles, notes, fields or values…"><button class="secondary" id="bulk-import">${icon('NotebookText')} Secure import</button><button class="primary" data-add="memory">${icon('Plus')} Add memory</button></div>${filterBar}${list.length ? `<div class="vault-list" id="vault-list">${list.map(vaultRow).join('')}</div>` : empty}</div>`;
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
    <div class="todo-card-actions">${!completed ? `<button class="secondary" data-todo-add-row="${item.id}">${icon('Plus')} Add item</button>${closed ? `<button class="secondary" data-todo-receipt="${item.id}">${icon('ReceiptText')} View receipt</button>` : `<button class="secondary" data-todo-close="${item.id}">${icon('ReceiptText')} Close & total</button>`}<button class="primary" data-todo-complete="${item.id}">${icon('CircleCheckBig')} Complete list</button>` : `<button class="primary" data-todo-receipt="${item.id}">${icon('Share2')} Share receipt</button>`}</div>
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
  const attachments = Array.isArray(state.chatAttachments) ? state.chatAttachments : (state.chatAttachment ? [state.chatAttachment] : []);
  const attachmentMarkup = attachments.length ? `
    <div class="chat-attachments-list">
      ${attachments.map((att, idx) => `
        <div class="chat-attachment-chip" data-attachment-id="${escapeHtml(att.id || String(idx))}">
          ${att.kind === 'audio' ? `<span class="attachment-audio-icon">${icon('AudioLines')}</span>` : (att.isPdf || att.mimeType === 'application/pdf' || String(att.name || '').toLowerCase().endsWith('.pdf')) ? `<span class="attachment-doc-icon pdf">${icon('FileText')}</span>` : `<img src="${escapeHtml(att.previewUrl || '')}" alt="Preview">`}
          <span class="attachment-chip-name">${escapeHtml(att.name || (att.kind === 'audio' ? 'Voice memo' : `Image ${idx + 1}`))}</span>
          <button type="button" class="chat-chip-remove" data-remove-attachment="${escapeHtml(att.id || String(idx))}" title="Remove this file">${icon('X')}</button>
        </div>
      `).join('')}
    </div>` : '';
  const voiceIndicator = state.isRecordingVoice ? `
    <div class="chat-voice-indicator">
      <span class="voice-pulse-dot"></span>
      <span>Listening… Speak your note, warranty, or reminder</span>
    </div>` : '';

  const placeholderText = attachments.length ? `Notes for ${attachments.length} attachment${attachments.length > 1 ? 's' : ''} or tap Send to extract…` : 'Ask Rhinous or dictate memory/reminder…';

  return `<div class="assistant-layout"><section class="chat"><div class="chat-head"><img class="assistant-logo" src="/brand/memoir-rhino-ui.png" alt=""><div><strong>Rhinous</strong><small>Private vault intelligence</small></div><button class="chat-clear" id="clear-chat" title="Clear conversation" aria-label="Clear conversation">${icon('Eraser')}</button><div class="provider-switch"><button class="${state.provider === 'gemini' ? 'active' : ''}" data-provider="gemini">Gemini</button><button class="${state.provider === 'mistral' ? 'active' : ''}" data-provider="mistral">Mistral</button></div></div><div class="messages" id="messages">${messages}${state.chatLoading ? chatSkeleton() : ''}</div>${attachmentMarkup}${voiceIndicator}<form class="chat-form" id="chat-form"><input type="file" id="chat-camera-input" accept="image/*" capture="environment" multiple hidden><input type="file" id="chat-upload-input" accept="image/*,application/pdf" multiple hidden><input type="file" id="chat-audio-input" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac" hidden><div class="chat-input-row"><button type="button" class="chat-media-btn" id="chat-camera-btn" title="Snap photo of document/warranty (up to 5)">${icon('Camera')}</button><button type="button" class="chat-media-btn" id="chat-upload-btn" title="Upload images or invoices (up to 5)">${icon('Paperclip')}</button><button type="button" class="chat-media-btn" id="chat-audio-upload-btn" title="Upload an audio recording">${icon('AudioLines')}</button><button type="button" class="chat-media-btn ${state.isRecordingVoice ? 'recording' : ''}" id="chat-voice-btn" title="Record a voice memo">${icon('Mic')}</button><input id="chat-query" name="chat-query" aria-label="Ask Rhinous assistant" autocomplete="off" placeholder="${escapeHtml(placeholderText)}"><button class="send" aria-label="Send">${icon('ArrowUp')}</button></div></form></section>
  <aside class="panel"><p class="eyebrow">Smart Multi-Modal</p><h3>Capture, snap & transcribe</h3><div class="suggestions">${['Snap up to 5 warranty cards/invoices to auto-extract', 'Dictate: “Remember my appliance warranty with 2 years validity”', 'Remind me to renew my passport tomorrow at 6 PM', 'Give me only my EPFO password'].map(text => `<button class="suggestion" data-ask="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}</div><div class="privacy-line">${icon('ShieldCheck')}<span>Smart Capture extracts structured records on device. Credentials stay encrypted in your isolated vault.</span></div></aside></div>`;
}

function renderMessage(message, messageIndex = 0) {
  if (message.role === 'user') return `<div class="message user">${escapeHtml(message.text)}</div>`;
  if (message.fields?.length || message.audios?.length || message.documents?.length) {
    const fields = message.fields || []; const fieldObject = Object.fromEntries(fields.map(field => [field.label, field.value]));
    const showCard = fields.length >= 3 && fieldObject['Card number'];
    const card = showCard ? paymentCard(message.title || 'Saved card', fieldObject, true) : '';
    const docsMarkup = (message.documents || []).length ? `
      <div class="ai-documents-list">
        ${message.documents.map(doc => {
          const isPdfDoc = isPdf(doc.mimeType, doc.fileName);
          return `
            <div class="ai-doc-chip" data-doc-view="${escapeHtml(doc.assetId)}" data-doc-name="${escapeHtml(doc.fileName)}" data-doc-mime="${escapeHtml(doc.mimeType)}">
              <span class="icon-wrap ${isPdfDoc ? 'coral' : 'violet'}">${icon(isPdfDoc ? 'FileText' : 'Image')}</span>
              <div class="ai-doc-info">
                <strong>${escapeHtml(doc.fileName)}</strong>
                <small>${formatFileSize(doc.byteLength)} · ${isPdfDoc ? 'PDF Document' : 'Image'} · Tap to open</small>
              </div>
              <button type="button" class="icon-btn-mini" data-doc-share="${escapeHtml(doc.assetId)}" data-doc-name="${escapeHtml(doc.fileName)}" data-doc-mime="${escapeHtml(doc.mimeType)}" title="Share securely">${icon('Share2')}</button>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';
    return `<div class="message bot"><strong>${escapeHtml((message.title || 'Saved information').toUpperCase())}</strong>${message.markdown ? safeMarkdown(message.markdown) : ''}${card}${(message.audios || []).map(audio => audioPlayerMarkup(audio, audio.title || 'Voice memo')).join('')}${docsMarkup}${fields.length ? `<table class="answer-table"><thead><tr><th>Field</th><th>Value</th><th></th></tr></thead><tbody>${fields.map(field => `<tr><td><strong>${escapeHtml(field.label)}</strong></td><td><span class="assistant-value visible">${escapeHtml(field.value)}</span></td><td><span class="field-actions">${externalLinkButton(field.value, `Open ${field.label}`)}<button class="copy-field" data-copy="${escapeHtml(field.value)}" title="Copy ${escapeHtml(field.label)}" aria-label="Copy ${escapeHtml(field.label)}">${icon('Copy')}</button></span></td></tr>`).join('')}</tbody></table>` : ''}</div>`;
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
  if (viewName === 'guard' || viewName === 'security') { state.vaultSection = 'security'; viewName = 'vault'; }
  else if (viewName === 'extension' || viewName === 'captures' || viewName === 'browser-captures') { state.vaultSection = 'extension'; viewName = 'vault'; }
  else if (viewName === 'memories') { state.vaultSection = 'memories'; viewName = 'vault'; }
  if (viewName === 'todos' || viewName === 'reminders') { state.plannerSection = viewName; viewName = 'planner'; }
  if (viewName === 'audio' || viewName === 'clipboard') { state.captureSection = viewName; viewName = 'capture'; }
  state.view = viewName; state.query = ''; state.selectedMemoryId = null; shell(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderView() { const node = document.querySelector('#view'); if (node) node.innerHTML = currentView(); bindView(); }

function bindView() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => navigate(button.dataset.view));
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => button.dataset.add === 'clipboard' ? pasteClipboard() : button.dataset.add === 'reminder' ? openReminderEditor() : button.dataset.add === 'birthday' ? openBirthdayEditor() : button.dataset.add === 'todo' ? openTodoEditor() : button.dataset.add === 'audio-upload' ? document.querySelector('#audio-upload-input-main')?.click() : openEditor(null, 'Personal'));
  document.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openDetail(button.dataset.open, button.dataset.openView || 'vault'));
  document.querySelector('#back-to-memories')?.addEventListener('click', () => { state.selectedMemoryId = null; renderView(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => confirmEdit(button.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.delete));
  document.querySelectorAll('[data-copy]').forEach(button => button.onclick = () => copyText(button.dataset.copy));
  document.querySelectorAll('[data-provider]').forEach(button => button.onclick = () => { state.provider = button.dataset.provider; localStorage.setItem('memoir-provider', state.provider); renderView(); });
  document.querySelectorAll('[data-ai-reveal]').forEach(button => button.onclick = () => { const key = button.dataset.aiReveal; if (state.assistantReveals.has(key)) state.assistantReveals.delete(key); else state.assistantReveals.add(key); renderView(); });
  document.querySelectorAll('[data-workspace-section]').forEach(button => button.onclick = () => {
    const kind = button.dataset.workspaceKind;
    const key = kind === 'planner' ? 'plannerSection' : kind === 'vault' ? 'vaultSection' : 'captureSection';
    state[key] = button.dataset.workspaceSection;
    state.selectedMemoryId = null;
    renderView();
  });
  document.querySelectorAll('[data-ask]').forEach(button => button.onclick = () => askAssistant(button.dataset.ask));
  document.querySelectorAll('[data-birthday-message]').forEach(button => button.onclick = () => generateBirthdayMessage(button.dataset.birthdayMessage));
  document.querySelectorAll('[data-reminder-tab]').forEach(button => button.onclick = () => { state.reminderTab = button.dataset.reminderTab; renderView(); });
  document.querySelectorAll('[data-vault-category]').forEach(button => button.onclick = () => { state.vaultCategory = button.dataset.vaultCategory; renderView(); });
  document.querySelectorAll('[data-ext-category]').forEach(button => button.onclick = () => { state.extCategory = button.dataset.extCategory; renderView(); });
  const extFilter = document.querySelector('#ext-filter');
  if (extFilter) {
    extFilter.addEventListener('input', () => {
      const q = extFilter.value.toLowerCase().trim();
      document.querySelectorAll('#ext-vault-list .vault-row').forEach(row => {
        const text = (row.dataset.searchable || '').toLowerCase();
        row.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }
  document.querySelectorAll('[data-reminder-complete]').forEach(button => button.onclick = () => completeReminder(button.dataset.reminderComplete));
  document.querySelectorAll('[data-reminder-snooze]').forEach(button => button.onclick = () => toggleReminderSnooze(button.dataset.reminderSnooze));
  document.querySelectorAll('[data-reminder-edit]').forEach(button => button.onclick = () => openReminderEditor(state.items.find(item => item.id === button.dataset.reminderEdit)));
  document.querySelectorAll('[data-reminder-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.reminderDelete));
  document.querySelectorAll('[data-todo-tab]').forEach(button => button.onclick = () => { state.todoTab = button.dataset.todoTab; renderView(); });
  document.querySelectorAll('[data-todo-edit]').forEach(button => button.onclick = () => openTodoEditor(state.items.find(item => item.id === button.dataset.todoEdit)));
  document.querySelectorAll('[data-todo-toggle]').forEach(button => button.onclick = () => toggleTodoRow(button.dataset.todoToggle, button.dataset.rowId));
  document.querySelectorAll('[data-todo-amount]').forEach(input => {
    input.oninput = () => updateTodoAmount(input.dataset.todoAmount, input.dataset.rowId, input.value, false);
    input.onchange = () => updateTodoAmount(input.dataset.todoAmount, input.dataset.rowId, input.value, true);
    input.onblur = () => updateTodoAmount(input.dataset.todoAmount, input.dataset.rowId, input.value, true);
  });
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
  document.querySelectorAll('[data-doc-view]').forEach(el => {
    el.onclick = event => {
      if (event.target.closest('[data-doc-share]')) return;
      openDocumentViewer(el.dataset.docView, el.dataset.docName, el.dataset.docMime);
    };
  });
  document.querySelectorAll('[data-doc-share]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      promptSecureShare(button.dataset.docShare, button.dataset.docName, button.dataset.docMime);
    };
  });
  document.querySelectorAll('[data-guard-tab]').forEach(button => button.onclick = () => { state.guardTab = button.dataset.guardTab; renderView(); });
  document.querySelector('#guard-refresh-pwd')?.addEventListener('click', () => { state.generatedPassword = generateStrongSecret('password', 18); renderView(); });
  document.querySelector('#guard-refresh-pin')?.addEventListener('click', () => { state.generatedPin = generateStrongSecret('pin', 4); renderView(); });
  document.querySelector('#clear-chat')?.addEventListener('click', () => confirmBox('Clear this conversation?', 'This removes the local Rhinous conversation log. Your saved memories and reminders will not be changed.', 'Clear chat', 'Eraser', () => { state.messages = []; state.assistantLog = []; localStorage.removeItem(assistantLogKey()); renderView(); toast('Conversation cleared'); }));

  document.querySelector('#vault-filter')?.addEventListener('input', event => document.querySelectorAll('[data-searchable]').forEach(row => row.hidden = !row.dataset.searchable.includes(event.target.value.toLowerCase())));
  document.querySelector('#paste-clipboard')?.addEventListener('click', pasteClipboard);
  document.querySelector('#bulk-import')?.addEventListener('click', openBulkImporter);
  document.querySelector('#save-clip')?.addEventListener('click', () => { const value = document.querySelector('#clip-input').value; if (value.trim()) openClipEditor(value); else toast('Add something to save'); });

  document.querySelector('#chat-camera-btn')?.addEventListener('click', () => document.querySelector('#chat-camera-input')?.click());
  document.querySelector('#chat-camera-input')?.addEventListener('change', async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const current = Array.isArray(state.chatAttachments) ? state.chatAttachments : [];
    const availableSlots = 5 - current.length;
    if (availableSlots <= 0) return toast('Maximum of 5 attachments reached. Remove one to add more.');
    const toProcess = files.slice(0, availableSlots);
    toast(`Processing ${toProcess.length} photo${toProcess.length > 1 ? 's' : ''}…`);
    for (const file of toProcess) {
      try {
        const compressed = await compressImageFile(file);
        current.push({
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          kind: 'image',
          ...compressed,
        });
      } catch (err) {
        console.error('Error processing camera photo:', err);
      }
    }
    state.chatAttachments = current;
    event.target.value = '';
    renderView();
  });

  document.querySelector('#chat-upload-btn')?.addEventListener('click', () => document.querySelector('#chat-upload-input')?.click());
  document.querySelector('#chat-upload-input')?.addEventListener('change', async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const current = Array.isArray(state.chatAttachments) ? state.chatAttachments : [];
    const availableSlots = 5 - current.length;
    if (availableSlots <= 0) return toast('Maximum of 5 attachments reached. Remove one to add more.');
    const toProcess = files.slice(0, availableSlots);
    toast(`Processing ${toProcess.length} file${toProcess.length > 1 ? 's' : ''}…`);
    for (const file of toProcess) {
      try {
        const compressed = await compressImageFile(file);
        current.push({
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          kind: 'image',
          ...compressed,
        });
      } catch (err) {
        console.error('Error processing file upload:', err);
      }
    }
    state.chatAttachments = current;
    event.target.value = '';
    renderView();
  });

  document.querySelectorAll('[data-remove-attachment]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      const id = button.dataset.removeAttachment;
      const current = Array.isArray(state.chatAttachments) ? state.chatAttachments : [];
      state.chatAttachments = current.filter(att => att.id !== id);
      state.chatAttachment = null;
      renderView();
    };
  });

  document.querySelector('#chat-remove-attachment')?.addEventListener('click', () => {
    state.chatAttachments = [];
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

function smartTodoTitleFromText(text) {
  const lower = String(text || '').toLowerCase();
  if (/tomato|potato|onion|milk|bread|butter|vegetable|fruit|rice|dal|cheese|egg|snack|paneer|curd|oil|sugar|salt|grocery/i.test(lower)) return 'Grocery Shopping';
  if (/medicine|tablet|syrup|paracetamol|bandage|drops|pharma|capsule|ointment|crocin|dolo/i.test(lower)) return 'Pharmacy Run';
  if (/laptop|charger|mouse|keyboard|cable|monitor|usb|headphone|ram|ssd|phone|adapter/i.test(lower)) return 'Tech Gear';
  if (/pack|passport|visa|clothes|luggage|ticket|boarding|hotel|travel|trip|suitcase/i.test(lower)) return 'Travel Packing';
  if (/clean|wash|laundry|mop|dust|vacuum|garage|dishes|broom|detergent/i.test(lower)) return 'Home Chores';
  if (/pr|bug|test|deploy|review|meeting|roadmap|docs|design|sprint|standup/i.test(lower)) return 'Work Tasks';
  if (/book|notebook|pen|pencil|notes|assignment|exam|quiz|stationery/i.test(lower)) return 'Study Supplies';
  if (/buy|purchase|order|shop|gift|shirt|shoes|dress|jeans/i.test(lower)) return 'Buy Items';
  return 'Personal Tasks';
}

function splitTodoInput(value) {
  return String(value || '').split(/[,\n]+/).map(text => text.trim()).filter(Boolean).slice(0, 200);
}
function openTodoEditor(item = null) {
  modal.className = 'modal todo-modal';
  const existingText = item ? parseTodoItems(item).map(row => row.text).join('\n') : '';
  modal.innerHTML = `<form class="modal-inner" id="todo-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit list' : 'New to-do list'}</p><h2>${item ? 'Update your list' : 'What are you planning?'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>List title<input id="todo-title" required maxlength="160" placeholder="e.g. Buy Items" value="${escapeHtml(item?.title || '')}"></label><label>Items<textarea id="todo-items-input" rows="7" required placeholder="Tomato 2 kg, potato, coriander&#10;Separate items with commas or new lines">${escapeHtml(existingText)}</textarea></label><p class="todo-form-help">Every comma or new line becomes a separate checkable item. Amounts are optional and can be added later.</p><div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save list' : 'Create list'}</button></div></form>`;
  showModal();

  const titleInput = document.querySelector('#todo-title');
  const itemsTextarea = document.querySelector('#todo-items-input');
  if (!item && itemsTextarea && titleInput) {
    itemsTextarea.addEventListener('input', () => {
      if (!titleInput.dataset.userEdited) {
        const val = itemsTextarea.value.trim();
        if (val) titleInput.value = smartTodoTitleFromText(val);
      }
    });
    titleInput.addEventListener('input', () => {
      titleInput.dataset.userEdited = 'true';
    });
  }

  document.querySelector('#todo-form').onsubmit = async event => {
    event.preventDefault(); const names = splitTodoInput(document.querySelector('#todo-items-input').value); if (!names.length) return toast('Add at least one list item');
    const previous = item ? parseTodoItems(item) : []; const rows = names.map((text, index) => { const match = previous.find(row => row.text.toLowerCase() === text.toLowerCase()) || previous[index]; return { id: match?.id || crypto.randomUUID(), text, done: Boolean(match?.done), amount: match?.amount ?? '' }; });
    const fields = { ...(item?.fields || {}), 'Todo items': JSON.stringify(rows), Status: item?.fields?.Status || 'active', Currency: 'INR' };
    await withRhinoActivity(item ? 'Updating to-do list…' : 'Creating to-do list…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: 'Todo', title: document.querySelector('#todo-title').value.trim() || 'Buy Items', note: item?.note || '', fields }));
    closeModal(); state.todoTab = 'active'; state.plannerSection = 'todos'; state.view = 'planner'; renderView(); toast(item ? 'To-do list updated' : 'To-do list created');
  };
}
async function saveTodoRows(item, rows, extraFields = {}) {
  return vaultStore.save({ ...item, fields: { ...item.fields, ...extraFields, 'Todo items': JSON.stringify(rows) } });
}

function refreshTodoCardDom(itemId) {
  const item = state.items.find(row => row.id === itemId);
  if (!item) return;
  const rows = parseTodoItems(item);
  const done = rows.filter(row => row.done).length;
  const total = todoTotal(item);

  const card = document.querySelector(`[data-todo-edit="${itemId}"]`)?.closest('.todo-card') ||
               document.querySelector(`[data-todo-toggle="${itemId}"]`)?.closest('.todo-card') ||
               document.querySelector(`[data-todo-amount="${itemId}"]`)?.closest('.todo-card');
  if (!card) return;

  const headP = card.querySelector('.todo-card-head p');
  if (headP) headP.textContent = `${done} of ${rows.length} completed${total ? ` · ${todoCurrency(total)}` : ''}`;

  const progressI = card.querySelector('.todo-progress i');
  if (progressI) progressI.style.width = `${rows.length ? Math.round(done / rows.length * 100) : 0}%`;

  const totalStrong = card.querySelector('.todo-total strong');
  if (totalStrong) totalStrong.textContent = todoCurrency(total);
}

async function toggleTodoRow(itemId, rowId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  const rows = parseTodoItems(item);
  const row = rows.find(entry => entry.id === rowId);
  if (!row) return;
  row.done = !row.done;

  const rowEl = document.querySelector(`.todo-item[data-todo-row="${rowId}"]`);
  if (rowEl) {
    rowEl.classList.toggle('done', row.done);
    const checkBtn = rowEl.querySelector('.todo-check');
    if (checkBtn) {
      checkBtn.innerHTML = icon(row.done ? 'CircleCheckBig' : 'Circle');
      checkBtn.title = row.done ? 'Mark not done' : 'Mark done';
    }
  }
  item.fields = { ...item.fields, 'Todo items': JSON.stringify(rows) };
  refreshTodoCardDom(itemId);

  await saveTodoRows(item, rows);
}

const todoDebounceTimers = new Map();
function updateTodoAmount(itemId, rowId, value, shouldSave = true) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  const rows = parseTodoItems(item);
  const row = rows.find(entry => entry.id === rowId);
  if (!row) return;
  row.amount = value === '' ? '' : Math.max(0, Number(value) || 0);
  item.fields = { ...item.fields, 'Todo items': JSON.stringify(rows) };
  refreshTodoCardDom(itemId);

  if (shouldSave) {
    clearTimeout(todoDebounceTimers.get(rowId));
    todoDebounceTimers.set(rowId, setTimeout(async () => {
      await saveTodoRows(item, rows);
      todoDebounceTimers.delete(rowId);
    }, 200));
  }
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
  const logo = typeof window !== 'undefined' && window.Image ? new window.Image() : document.createElement('img'); logo.src = '/brand/memoir-rhino-ui.png'; await logo.decode().catch(() => {});
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, width, height);
  const header = ctx.createLinearGradient(0, 0, width, 0); header.addColorStop(0, '#ff6b60'); header.addColorStop(.55, '#f32e8b'); header.addColorStop(1, '#a64add'); ctx.fillStyle = header; ctx.fillRect(0, 0, width, 12);
  ctx.globalAlpha = .055; ctx.strokeStyle = '#7a635d'; for (let y = 34; y < height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); } ctx.globalAlpha = 1;
  if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 42, 43, 76, 76);
  ctx.fillStyle = '#171417'; ctx.font = '800 39px system-ui'; ctx.fillText('memoir', 134, 83); ctx.fillStyle = '#8b8085'; ctx.font = '700 14px system-ui'; ctx.letterSpacing = '2px'; ctx.fillText('PRIVATE LIST RECEIPT', 136, 108); ctx.letterSpacing = '0px';
  const receiptDate = new Date(item.fields?.['Closed at'] || item.fields?.['Completed at'] || Date.now()); ctx.textAlign = 'right'; ctx.fillStyle = '#6f666a'; ctx.font = '600 17px system-ui'; ctx.fillText(activeProfile().name, width - 42, 71); ctx.font = '500 15px system-ui'; ctx.fillText(receiptDate.toLocaleString('en-IN'), width - 42, 99); ctx.textAlign = 'left';
  ctx.fillStyle = '#171417'; ctx.font = '800 31px system-ui'; ctx.fillText(item.title.slice(0, 48), 42, 171); ctx.fillStyle = '#8b8085'; ctx.font = '600 16px system-ui'; ctx.fillText(`${rows.filter(row => row.done).length} of ${rows.length} items completed`, 42, 201);
  ctx.setLineDash([7, 7]); ctx.strokeStyle = '#d9cdd1'; ctx.beginPath(); ctx.moveTo(42, 229); ctx.lineTo(width - 42, 229); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#9a8d92'; ctx.font = '700 13px system-ui'; ctx.fillText('ITEM', 42, 260); ctx.textAlign = 'right'; ctx.fillText('AMOUNT', width - 42, 260); ctx.textAlign = 'left';
  let y = 305; rows.forEach((row, index) => { ctx.save(); if (index % 2 === 0) { ctx.fillStyle = '#f8f2ee'; ctx.fillRect(30, y - 34, width - 60, 45); } ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = row.done ? '#6f686c' : '#171417'; ctx.font = '600 20px system-ui'; const label = `${String(index + 1).padStart(2, '0')}  ${row.done ? '✓' : '○'}  ${String(row.text || 'Untitled item')}`; ctx.fillText(label.slice(0, 56), 42, y); if (row.amount !== '') { ctx.textAlign = 'right'; ctx.font = '800 20px system-ui'; ctx.fillText(todoCurrency(row.amount), width - 42, y); } ctx.restore(); y += lineHeight; });
  ctx.setLineDash([7, 7]); ctx.strokeStyle = '#d9cdd1'; ctx.beginPath(); ctx.moveTo(42, y - 22); ctx.lineTo(width - 42, y - 22); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#171417'; ctx.font = '800 29px system-ui'; ctx.fillText('TOTAL', 42, y + 27); ctx.textAlign = 'right'; ctx.fillText(todoCurrency(todoTotal(item)), width - 42, y + 27); ctx.textAlign = 'left';
  ctx.fillStyle = '#9a9095'; ctx.font = '600 15px system-ui'; ctx.fillText('Encrypted, organised and shared from Memoir', 42, height - 46); ctx.textAlign = 'right'; ctx.fillText(`RECEIPT · ${String(item.id || '').slice(-8).toUpperCase()}`, width - 42, height - 46); ctx.textAlign = 'left';
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
}
async function openTodoReceipt(itemId) {
  const item = state.items.find(row => row.id === itemId); if (!item) return;
  const blob = await todoReceiptBlob(item);
  if (!blob) return toast('Receipt could not be generated');
  const url = URL.createObjectURL(blob);
  modal.className = 'modal receipt-modal';
  modal.innerHTML = `
    <div class="modal-inner">
      <div class="modal-head">
        <div>
          <p class="eyebrow">Memoir paper receipt</p>
          <h2>${escapeHtml(item.title)}</h2>
        </div>
        <button type="button" class="modal-close" aria-label="Close">${icon('X')}</button>
      </div>
      <div class="receipt-printer">
        <div class="printer-body">
          <img src="/brand/memoir-rhino-ui.png" alt="">
          <span><b>MEMOIR</b><small>RECEIPT READY</small></span>
        </div>
        <div class="printer-slot"></div>
        <div class="receipt-paper">
          <img src="${url}" alt="Generated receipt preview">
        </div>
      </div>
      <div class="receipt-actions">
        <button class="secondary" id="receipt-copy-text">${icon('Copy')} Copy text</button>
        <button class="secondary" id="receipt-copy-image">${icon('ReceiptText')} Copy image</button>
        <button class="primary" id="receipt-share">${icon('Share2')} Share receipt</button>
      </div>
    </div>
  `;
  showModal();
  modal.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
  document.querySelector('#receipt-copy-text').onclick = () => copyText(todoReceiptText(item));
  document.querySelector('#receipt-copy-image').onclick = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Receipt image copied');
    } catch {
      toast('Image copying is not supported here. Use Share receipt.');
    }
  };
  document.querySelector('#receipt-share').onclick = async () => {
    const file = new File([blob], `memoir-${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: item.title, text: `Memoir to-do receipt · ${todoCurrency(todoTotal(item))}`, files: [file] });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      toast('Receipt image downloaded');
    }
  };
}


function openEditor(item = null, initialType = 'Personal') {
  if (item?.type === 'Reminder' || initialType === 'Reminder') return openReminderEditor(item);
  if (item?.type === 'Birthday' || initialType === 'Birthday') return openBirthdayEditor(item);
  const selected = item?.type || initialType;
  let pendingAttachments = parseItemAttachments(item);

  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-inner" id="memory-form"><div class="modal-head"><div><p class="eyebrow">${item ? 'Edit memory' : 'New memory'}</p><h2>${item ? 'Update what matters' : 'Add something important'}</h2></div><button type="button" class="modal-close">${icon('X')}</button></div><label>Category<select id="memory-type">${Object.keys(fieldMap).filter(type => !['Birthday', 'Reminder', 'Audio', 'Todo'].includes(type)).map(type => `<option ${type === selected ? 'selected' : ''}>${type}</option>`).join('')}</select></label><label>Title<input id="memory-title" required placeholder="e.g. Home Wi-Fi" value="${escapeHtml(item?.title || '')}"></label><div id="dynamic-fields"></div><label>Note<textarea id="memory-note" rows="3" placeholder="Context, reminder, or anything useful">${escapeHtml(item?.note || '')}</textarea></label>
  <div class="document-attachments-section">
    <h4>${icon('Paperclip')} Attached Documents & Photos (<span id="att-count">${pendingAttachments.length}</span>/8)</h4>
    <div class="attachment-chips-list" id="editor-attachment-chips"></div>
    <div class="uploading-progress-banner" id="editor-upload-banner" style="display:none">
      <div class="rhino-pulse-ring">
        <img src="/brand/memoir-rhino-ui.png" class="upload-rhino-spinner" alt="">
      </div>
      <div class="uploading-copy">
        <strong>Encrypting & Securing Document…</strong>
        <p>Encrypting with AES-256-GCM and saving into your private vault. Please wait…</p>
      </div>
    </div>
    <div class="attachment-dropzone" id="editor-dropzone">
      <input type="file" id="editor-file-input" multiple accept="image/*,application/pdf" hidden>
      ${icon('UploadCloud')}
      <span>Click or drag images / PDFs here</span>
      <small>Up to 5 images (≤ 6 MB each) · Up to 3 PDFs (≤ 10 MB each)</small>
    </div>
  </div>
  <div class="modal-actions"><button type="button" class="secondary modal-cancel">Cancel</button><button class="primary">${icon('Check')} ${item ? 'Save changes' : 'Save memory'}</button></div></form>`;
  showModal();

  const renderAttachmentChips = () => {
    const chipsContainer = document.querySelector('#editor-attachment-chips');
    const countEl = document.querySelector('#att-count');
    if (countEl) countEl.textContent = pendingAttachments.length;
    if (!chipsContainer) return;
    chipsContainer.innerHTML = pendingAttachments.map(att => {
      const isPdfDoc = isPdf(att.mimeType, att.fileName);
      return `
        <span class="attachment-chip" data-att-id="${escapeHtml(att.assetId)}">
          ${icon(isPdfDoc ? 'FileText' : 'Image')}
          <span>${escapeHtml(att.fileName)} (${formatFileSize(att.byteLength)})</span>
          <button type="button" data-remove-att="${escapeHtml(att.assetId)}" title="Remove attachment" aria-label="Remove attachment">${icon('X')}</button>
        </span>
      `;
    }).join('');

    chipsContainer.querySelectorAll('[data-remove-att]').forEach(btn => {
      btn.onclick = event => {
        event.stopPropagation();
        event.preventDefault();
        const idToRemove = btn.dataset.removeAtt;
        pendingAttachments = pendingAttachments.filter(att => att.assetId !== idToRemove);
        renderAttachmentChips();
        toast('Attachment removed');
      };
    });
  };
  renderAttachmentChips();

  const dropzone = document.querySelector('#editor-dropzone');
  const fileInput = document.querySelector('#editor-file-input');
  if (dropzone && fileInput) {
    dropzone.onclick = () => fileInput.click();
    dropzone.ondragover = e => { e.preventDefault(); dropzone.classList.add('dragover'); };
    dropzone.ondragleave = () => dropzone.classList.remove('dragover');
    dropzone.ondrop = async e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.length) await handleFiles(e.dataTransfer.files);
    };
    fileInput.onchange = async e => {
      if (e.target.files?.length) await handleFiles(e.target.files);
    };
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    let imageCount = pendingAttachments.filter(a => !isPdf(a.mimeType, a.fileName)).length;
    let pdfCount = pendingAttachments.filter(a => isPdf(a.mimeType, a.fileName)).length;
    const uploadBanner = document.querySelector('#editor-upload-banner');

    for (const file of files) {
      const isPdfFile = isPdf(file.type, file.name);
      if (isPdfFile) {
        if (pdfCount >= 3) { toast('Maximum 3 PDFs allowed per memory'); continue; }
        if (file.size > 10 * 1024 * 1024) { toast(`“${file.name}” is too large (max 10 MB for PDF)`); continue; }
        pdfCount++;
      } else if (file.type.startsWith('image/')) {
        if (imageCount >= 5) { toast('Maximum 5 images allowed per memory'); continue; }
        if (file.size > 6 * 1024 * 1024) { toast(`“${file.name}” is too large (max 6 MB for images)`); continue; }
        imageCount++;
      } else {
        toast(`“${file.name}” is not an image or PDF`);
        continue;
      }

      try {
        if (uploadBanner) uploadBanner.style.display = 'flex';
        await withRhinoActivity('Encrypting & saving to vault…', async () => {
          const saved = await vaultStore.uploadDocument({ file, fileName: file.name, mimeType: file.type });
          pendingAttachments.push(saved);
          renderAttachmentChips();
          toast(`“${file.name}” encrypted & attached`);
        });
      } catch (uploadErr) {
        console.error('Upload failed:', uploadErr);
        toast(`Could not attach “${file.name}”: ${uploadErr.message || 'Upload error'}`);
      } finally {
        if (uploadBanner) uploadBanner.style.display = 'none';
      }
    }
    if (fileInput) fileInput.value = '';
  }

  const renderFields = () => {
    const type = document.querySelector('#memory-type').value;
    const names = [...new Set([...(fieldMap[type] || []), ...Object.keys(item?.fields || {})])].filter(n => !documentDataLabels.has(n));
    document.querySelector('#dynamic-fields').innerHTML = `<div class="field-grid">${names.map(name => memoryFieldInput(name, item?.fields?.[name] || '')).join('')}</div><div id="custom-memory-fields"></div><button type="button" class="ghost add-custom-field" id="add-custom-field">${icon('Plus')} Add custom field</button>${type === 'Government Document' || type === 'Identity' ? `<p class="document-field-help">${icon('ShieldCheck')} Add an HTTPS Google Drive, OneDrive, or other private cloud link. Memoir stores the link as an encrypted field and Rhinous can retrieve it by document name.</p>` : ''}`;
    document.querySelector('#add-custom-field').onclick = () => document.querySelector('#custom-memory-fields').insertAdjacentHTML('beforeend', `<div class="custom-memory-field"><label>Field name<input data-custom-label maxlength="100" placeholder="e.g. Application number"></label><label>Field value<input data-custom-value maxlength="5000" placeholder="Enter the protected value"></label></div>`);
  };
  renderFields(); document.querySelector('#memory-type').onchange = renderFields;
  document.querySelector('#memory-form').onsubmit = async event => {
    event.preventDefault();
    const fields = {};
    document.querySelectorAll('[data-field]').forEach(input => { if (input.value.trim()) fields[input.dataset.field] = input.value.trim(); });
    document.querySelectorAll('.custom-memory-field').forEach(row => {
      const label = row.querySelector('[data-custom-label]').value.trim();
      const value = row.querySelector('[data-custom-value]').value.trim();
      if (label && value) fields[label.slice(0, 100)] = value.slice(0, 5000);
    });
    if (pendingAttachments.length) {
      fields['Document Attachments'] = JSON.stringify(pendingAttachments);
    } else {
      delete fields['Document Attachments'];
    }
    await withRhinoActivity(item ? 'Updating memory…' : 'Saving memory…', () => vaultStore.save({ ...(item || {}), kind: 'memory', type: document.querySelector('#memory-type').value, title: document.querySelector('#memory-title').value.trim(), note: document.querySelector('#memory-note').value.trim(), fields }));
    closeModal();
    toast(item ? 'Memory updated instantly' : 'Memory saved securely');
  };
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
function showModal() {
  if (modal.open) {
    try { modal.close(); } catch {}
  }
  modal.showModal();
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = closeModal;
  });
  modal.querySelectorAll('.modal-cancel').forEach(btn => {
    btn.onclick = closeModal;
  });
}
function closeModal() {
  try { modal.close(); } catch {}
  modal.className = 'modal';
  modal.innerHTML = '';
}
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

function formatShareText(item, selectedFields, includeNote = false, selectedAttachments = []) {
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

  if (selectedAttachments && selectedAttachments.length) {
    lines.push('', `Attached Files (${selectedAttachments.length}):`);
    selectedAttachments.forEach(att => {
      lines.push(`  - ${att.fileName} (${formatFileSize(att.byteLength)})`);
    });
  }

  lines.push('', 'Verified with Memoir Vault');
  return lines.join('\n');
}

function openShareModal(id) {
  const item = state.items.find(row => row.id === id);
  if (!item) return;

  const entries = Object.entries(allFields(item));
  const shareableEntries = entries.filter(([label]) => !isSecretField(label) && !audioDataLabels.has(label) && !audioMetadataLabels.has(label) && !documentDataLabels.has(label));
  const attachments = parseItemAttachments(item);
  const hasHiddenSecrets = entries.some(([label]) => isSecretField(label));
  const initialFields = [...shareableEntries];
  const initialAttachments = [...attachments];
  let includeNote = Boolean(item.note);

  modal.className = 'modal share-modal';

  const renderModalContent = () => {
    const previewText = formatShareText(item, initialFields, includeNote, initialAttachments);
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
          Select the exact fields and attached files you want to share. ${hasHiddenSecrets ? '<span style="color:var(--green);font-weight:600">Confidential credentials (passwords, PINs, CVVs) are automatically excluded.</span>' : ''}
        </p>

        ${attachments.length ? `
          <div class="share-section-heading">
            <small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.06em">Attached Documents & Images (${attachments.length})</small>
            <span class="share-badge-hint">Decrypted on share</span>
          </div>
          <div class="share-attachments-list">
            ${attachments.map((att, idx) => `
              <label class="share-attachment-row">
                <input type="checkbox" class="share-attachment-checkbox" data-att-index="${idx}" ${initialAttachments.some(a => a.assetId === att.assetId) ? 'checked' : ''}>
                <span class="share-doc-icon ${isPdf(att.mimeType, att.fileName) ? 'pdf' : 'image'}">
                  ${icon(isPdf(att.mimeType, att.fileName) ? 'FileText' : 'Image')}
                </span>
                <div class="share-doc-info">
                  <strong>${escapeHtml(att.fileName)}</strong>
                  <small>${formatFileSize(att.byteLength)} · ${isPdf(att.mimeType, att.fileName) ? 'PDF Document' : 'Photo'}</small>
                </div>
              </label>
            `).join('')}
          </div>
        ` : ''}

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
          <span style="font-size:10px;color:var(--muted)"><span id="share-count">${initialFields.length + initialAttachments.length}</span> item${(initialFields.length + initialAttachments.length) === 1 ? '' : 's'} selected</span>
        </div>

        <pre class="share-preview-box" id="share-preview-box">${escapeHtml(previewText)}</pre>

        <div class="share-warning-banner">
          ${icon('ShieldAlert')}
          <div>
            <strong>Security verification</strong><br>
            Please verify the recipient before sharing sensitive details or decrypted files. Memoir will decrypt and forward only the items you selected.
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
      const selectedAtts = [];
      modal.querySelectorAll('.share-attachment-checkbox:checked').forEach(cb => {
        const idx = Number(cb.dataset.attIndex);
        if (attachments[idx]) selectedAtts.push(attachments[idx]);
      });
      const incNote = modal.querySelector('#share-include-note')?.checked || false;
      const text = formatShareText(item, selected, incNote, selectedAtts);
      modal.querySelector('#share-preview-box').textContent = text;
      modal.querySelector('#share-count').textContent = selected.length + selectedAtts.length;
      return { selected, incNote, selectedAtts, text };
    };

    modal.querySelectorAll('.share-field-checkbox, .share-attachment-checkbox, #share-include-note').forEach(input => {
      input.onchange = updatePreview;
    });

    modal.querySelector('#share-select-all').onclick = () => {
      modal.querySelectorAll('.share-field-checkbox, .share-attachment-checkbox').forEach(cb => cb.checked = true);
      if (modal.querySelector('#share-include-note')) modal.querySelector('#share-include-note').checked = true;
      updatePreview();
    };

    modal.querySelector('#share-clear-all').onclick = () => {
      modal.querySelectorAll('.share-field-checkbox, .share-attachment-checkbox').forEach(cb => cb.checked = false);
      if (modal.querySelector('#share-include-note')) modal.querySelector('#share-include-note').checked = false;
      updatePreview();
    };

    modal.querySelectorAll('[data-platform]').forEach(btn => {
      btn.onclick = async () => {
        const { selected, selectedAtts, text } = updatePreview();
        if (!selected.length && !selectedAtts.length && !(modal.querySelector('#share-include-note')?.checked && item.note)) {
          return toast('Select at least one field or attached file to share');
        }
        const platform = btn.dataset.platform;
        closeModal();
        await executeShare(platform, text, item.title, selectedAtts);
      };
    });
  };

  renderModalContent();
  showModal();
}

async function executeShare(platform, text, itemTitle, selectedAttachments = []) {
  const encoded = encodeURIComponent(text);

  let files = [];
  if (selectedAttachments && selectedAttachments.length > 0) {
    await withRhinoActivity('Decrypting attachments for share…', async () => {
      for (const att of selectedAttachments) {
        try {
          const doc = await vaultStore.getDocument(att.assetId, att.mimeType, att.fileName);
          files.push(new File([doc.blob], att.fileName, { type: doc.mimeType }));
        } catch (e) {
          console.warn('Could not decrypt attachment for share', att.fileName, e);
        }
      }
    });
  }

  // If System Share or if device supports Web Share with Files
  if (platform === 'native' || (files.length > 0 && navigator.canShare && navigator.canShare({ files }))) {
    if (navigator.share) {
      try {
        const shareData = { title: itemTitle, text };
        if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
          shareData.files = files;
        }
        await navigator.share(shareData);
        toast('Shared successfully');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
  }

  // If there are files and sharing to a web URL platform (e.g. WhatsApp / Telegram web):
  // Since browsers cannot directly attach local files into external URLs,
  // we download the decrypted files to the device so the user can easily attach them in the chat.
  if (files.length > 0) {
    files.forEach(file => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  if (platform === 'whatsapp') {
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
    toast(files.length ? 'Decrypted files saved to device & forwarded to WhatsApp' : 'Forwarding to WhatsApp…');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank', 'noopener,noreferrer');
    toast(files.length ? 'Decrypted files saved to device & forwarded to Telegram' : 'Forwarding to Telegram…');
  } else if (platform === 'gmail' || platform === 'mail') {
    const subject = encodeURIComponent(`${itemTitle} (via Memoir)`);
    window.open(`mailto:?subject=${subject}&body=${encoded}`, '_blank');
    toast(files.length ? 'Decrypted files saved to device & opening Email…' : 'Opening Email client…');
  } else if (platform === 'instagram') {
    try {
      await navigator.clipboard.writeText(text);
      toast(files.length ? 'Decrypted files saved & details copied! Opening Instagram…' : 'Copied details! Opening Instagram…');
    } catch {
      toast('Opening Instagram…');
    }
    setTimeout(() => {
      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
    }, 400);
  } else if (platform === 'copy') {
    await navigator.clipboard.writeText(text);
    toast(files.length ? 'Decrypted files saved to device & details copied to clipboard' : 'Copied formatted details to clipboard');
  }
}


async function decompressPdfStream(uint8Bytes) {
  if (!uint8Bytes || uint8Bytes.length < 2) return '';
  
  // 1. Try 'deflate' (standard zlib/flate) with safe Response wrapper
  try {
    const stream = new Blob([uint8Bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder('latin1').decode(new Uint8Array(buffer));
  } catch {}

  // 2. Try 'deflate-raw' (raw deflate without header)
  try {
    const stream = new Blob([uint8Bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder('latin1').decode(new Uint8Array(buffer));
  } catch {}

  // 3. Fallback: uncompressed raw bytes
  try {
    return new TextDecoder('latin1').decode(uint8Bytes);
  } catch {
    return '';
  }
}

function cleanPdfString(str) {
  return String(str || '')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\d{3}/g, m => String.fromCharCode(parseInt(m.slice(1), 8)))
    .trim();
}

async function extractLocalPdfText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const rawBytes = new Uint8Array(arrayBuffer);
    const rawString = new TextDecoder('latin1').decode(rawBytes);
    const textPieces = [];

    // Find stream objects with text content
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    const streamPromises = [];
    let count = 0;

    while ((match = streamRegex.exec(rawString)) !== null && count < 60) {
      const streamContent = match[1];
      if (streamContent.length > 10) {
        const streamBytes = new Uint8Array(streamContent.length);
        for (let i = 0; i < streamContent.length; i++) {
          streamBytes[i] = streamContent.charCodeAt(i);
        }
        streamPromises.push(decompressPdfStream(streamBytes));
        count++;
      }
    }

    const decompressedStreams = await Promise.all(streamPromises);

    for (const decompressed of decompressedStreams) {
      if (!decompressed) continue;
      const btRegex = /BT([\s\S]*?)ET/g;
      let btMatch;
      while ((btMatch = btRegex.exec(decompressed)) !== null) {
        const block = btMatch[1];
        const tjRegex = /\((.*?)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          const cleaned = cleanPdfString(tjMatch[1]);
          if (cleaned) textPieces.push(cleaned);
        }

        const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let arrMatch;
        while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
          const inner = arrMatch[1];
          const itemRegex = /\((.*?)\)/g;
          let itemMatch;
          const lineParts = [];
          while ((itemMatch = itemRegex.exec(inner)) !== null) {
            const cleaned = cleanPdfString(itemMatch[1]);
            if (cleaned) lineParts.push(cleaned);
          }
          if (lineParts.length) textPieces.push(lineParts.join(' '));
        }

        const quoteRegex = /\((.*?)\)\s*['"]/g;
        let qMatch;
        while ((qMatch = quoteRegex.exec(block)) !== null) {
          const cleaned = cleanPdfString(qMatch[1]);
          if (cleaned) textPieces.push(cleaned);
        }
      }
    }

    if (!textPieces.length) {
      const uncompressedTj = /\((.*?)\)\s*Tj/g;
      let simpleMatch;
      while ((simpleMatch = uncompressedTj.exec(rawString)) !== null) {
        const cleaned = cleanPdfString(simpleMatch[1]);
        if (cleaned.length > 2 && !textPieces.includes(cleaned)) textPieces.push(cleaned);
      }
    }

    return textPieces.join('\n').trim();
  } catch (err) {
    console.warn('Local PDF extraction handled gracefully:', err?.message || err);
    return '';
  }
}

async function compressImageFile(file) {
  if (!file) throw new Error('No file provided');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const extractedText = await extractLocalPdfText(file);
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve({
        data: String(reader.result || ''),
        mimeType: 'application/pdf',
        name: file.name,
        previewUrl: '',
        isPdf: true,
        extractedText: extractedText || '',
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({
        data: String(reader.result || ''),
        mimeType: file.type || 'application/octet-stream',
        name: file.name,
        previewUrl: '',
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = typeof window !== 'undefined' && window.Image ? new window.Image() : document.createElement('img');
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          data: dataUrl,
          mimeType: 'image/jpeg',
          name: file.name,
          previewUrl: dataUrl,
        });
      };
      img.onerror = () => {
        resolve({
          data: String(e.target.result || ''),
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          previewUrl: String(e.target.result || ''),
        });
      };
      img.src = String(e.target.result || '');
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
  const attachments = Array.isArray(state.chatAttachments) && state.chatAttachments.length ? [...state.chatAttachments] : (state.chatAttachment ? [state.chatAttachment] : []);
  state.chatAttachments = [];
  state.chatAttachment = null;
  const audioAtt = attachments.find(a => a.kind === 'audio');
  const imageAtts = attachments.filter(a => a.kind !== 'audio');
  const hasAttachments = attachments.length > 0;

  if ((!query?.trim() && !hasAttachments) || state.chatLoading) return;
  const cleanQuery = (query || (hasAttachments ? 'Extract and structure details from the attached document(s)/image(s)' : '')).trim();
  const history = assistantHistory(state.messages);
  const protectedInput = protectPrivateInput(cleanQuery);
  let proposedActions = [];

  let userMessageText = cleanQuery;
  if (audioAtt) {
    userMessageText = `Audio attached: ${audioAtt.name || 'Voice memo'} ${cleanQuery !== 'Extract and structure details from the attached document(s)/image(s)' ? cleanQuery : ''}`;
  } else if (imageAtts.length) {
    const names = imageAtts.map(a => a.name || 'document').join(', ');
    const isDefaultQuery = cleanQuery === 'Extract and structure details from the attached document(s)/image(s)';
    userMessageText = isDefaultQuery ? `Attached ${imageAtts.length} document/photo${imageAtts.length > 1 ? 's' : ''}: ${names}` : `${cleanQuery}\n(${imageAtts.length} attachment${imageAtts.length > 1 ? 's' : ''}: ${names})`;
  }

  state.messages.push({ role: 'user', text: userMessageText.trim() });
  state.chatLoading = true;
  renderView();
  scrollChat();

  if (!hasAttachments && /\b(security audit|password health|rhino guard|audit vault|audit my passwords|reused password|weak password|weak pin|atm pin safe)\b/i.test(cleanQuery)) {
    const audit = auditVaultSecurity(state.items, activeProfile());
    let auditMsg = `### 🛡️ Rhino Guard Security Audit (${audit.score}% · ${audit.grade})\n\n`;
    auditMsg += `I analyzed **${audit.totalCredentials} credentials & PINs** on your device:\n\n`;
    auditMsg += `• **Health Score**: ${audit.score}/100 (${audit.grade})\n`;
    auditMsg += `• **Reused Secrets**: ${audit.reusedPasswords.length + audit.reusedPins.length} detected\n`;
    auditMsg += `• **Weak / Guessable**: ${audit.weakItems.length} detected\n`;
    auditMsg += `• **Personal Info / Name Leaks**: ${audit.personalInfoItems.length} detected\n\n`;
    if (audit.allVulnerabilities.length) {
      auditMsg += `**Key Vulnerabilities Detected:**\n`;
      audit.allVulnerabilities.slice(0, 4).forEach(v => {
        auditMsg += `• **${v.severity.toUpperCase()}**: ${v.reason}\n`;
      });
      auditMsg += `\n*Tap the **Guard** tab in the sidebar/menu for the full interactive breakdown, affected accounts list, and 1-tap fixes.*`;
    } else {
      auditMsg += `🎉 **Pristine security!** No reused passwords, weak PINs, or personal identity leaks were found in your vault.`;
    }
    state.messages.push({ role: 'assistant', title: 'RHINO GUARD SECURITY AUDIT', markdown: auditMsg });
    state.chatLoading = false;
    renderView();
    scrollChat();
    return;
  }

  try {
    const catalog = state.items.filter(item => item.type !== 'Notification').map(item => {
      const prov = item?.provenance || {};
      const extraDetails = [item.domain, prov.domain, prov.pageTitle, item.note].filter(Boolean).join(' · ');
      return {
        id: item.id,
        type: category(item),
        title: extraDetails ? `${item.title} (${extraDetails})` : item.title,
        fieldNames: Object.keys(allFields(item)),
      };
    });
    const identityToken = await vaultStore.idToken();
    const payload = {
      provider: hasAttachments ? 'gemini' : state.provider,
      query: protectedInput.text,
      catalog,
      history,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta',
      now: new Date().toISOString(),
    };
    if (audioAtt) {
      payload.audio = {
        data: audioAtt.data,
        mimeType: audioAtt.mimeType || 'audio/webm',
      };
    } else if (imageAtts.length) {
      payload.images = imageAtts.map(att => ({
        data: att.data,
        mimeType: att.mimeType || 'image/jpeg',
        name: att.name || 'document',
        extractedText: att.extractedText || '',
      }));
      payload.image = payload.images[0];
      const docTexts = imageAtts.filter(a => a.extractedText).map(a => `[DOCUMENT: ${a.name}]\n${a.extractedText}`);
      if (docTexts.length) payload.documentText = docTexts.join('\n\n');
    }
    const response = await fetch('/api/assistant', { method: 'POST', headers: vaultStore.apiHeaders(identityToken), body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(await response.text());
    const answer = await response.json();
    const message = buildAssistantMessage(answer, cleanQuery, protectedInput.values);
    if (audioAtt) {
      const transcript = String(answer.audioTranscript || '').trim();
      const audioItem = state.items.find(item => item.id === audioAtt.recordId);
      const audioAction = message.actions?.find(action => action.type === 'Audio');
      const reliableTranscript = transcript || (audioAction?.fields?.['Audio Transcript'] && !/^(no transcript|awaiting)/i.test(audioAction.fields['Audio Transcript']) ? audioAction.fields['Audio Transcript'] : '');
      if (audioItem) {
        const updated = await updateAudioTranscriptEverywhere(audioItem, reliableTranscript, reliableTranscript ? 'Completed' : 'Audio only · transcription unavailable');
        if (audioAction?.title) await vaultStore.save({ ...updated, title: audioAction.title, note: reliableTranscript || updated.note });
      }
      message.actions = (message.actions || []).filter(action => action.type !== 'Audio').map(action => action.type === 'Reminder' ? { ...action, fields: { ...(action.fields || {}), 'Audio Transcript': reliableTranscript || 'No transcript available', 'Source audio ID': audioAtt.recordId || '', 'Created via': audioAtt.source || 'Memoir app' } } : action);
      message.title = reliableTranscript ? 'Audio saved and transcribed' : 'Audio saved · transcription available later';
      message.markdown = reliableTranscript ? 'The encrypted recording is already in Audio. Review any reminder prepared from the transcript below.' : 'The recording is safely stored. The AI transcription service is currently unavailable or could not understand the speech. Use **Try transcription again** from Audio after limits reset.';
      if (!reliableTranscript) message.retryAudioId = audioAtt.recordId;
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
      state.messages.push(fallback || { role: 'assistant', markdown: `### Assistant response\nI couldn’t process this request: ${error?.message || 'Check your network connection'}.` });
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
  if (answer.kind !== 'lookup' || !answer.matches?.length) {
    const cleanMarkdown = String(answer.markdown || answer.message || 'I could not create a response.').replace(/\[\[PRIVATE_\d+\]\]/g, '').replace(/\(to be displayed [^)]+\)/gi, '').trim();
    return { role: 'assistant', title: answer.title || 'Rhinous', markdown: cleanMarkdown };
  }
  const fields = []; const audios = []; const documents = []; const resolvedTitles = []; let firstResolvedId = '';
  answer.matches.forEach(match => {
    const item = state.items.find(row => row.id === match.id); if (!item) return;
    if (!firstResolvedId) firstResolvedId = item.id;
    resolvedTitles.push(item.title);
    const attachment = audioAttachment(item); if (attachment) audios.push({ ...attachment, title: item.title });
    const docs = parseItemAttachments(item); if (docs.length) documents.push(...docs);
    const itemAllFields = allFields(item);
    const requested = match.fields?.length ? match.fields : Object.keys(itemAllFields);
    requested.forEach(label => {
      const actual = Object.keys(itemAllFields).find(key => key.toLowerCase() === String(label).toLowerCase());
      if (actual && !audioDataLabels.has(actual) && !audioMetadataLabels.has(actual) && !documentDataLabels.has(actual)) {
        let val = itemAllFields[actual];
        fields.push({ label: actual, value: val });
      }
    });
  });
  if (firstResolvedId) state.lastResolvedItemId = firstResolvedId;
  const cleanMarkdown = String(answer.markdown || '').replace(/\[\[PRIVATE_\d+\]\]/g, '').replace(/\(to be displayed [^)]+\)/gi, '').trim();
  return fields.length || audios.length || documents.length ? { role: 'assistant', title: resolvedTitles.length === 1 ? resolvedTitles[0] : (answer.title || 'Saved information'), markdown: cleanMarkdown, fields, audios, documents } : localRoute(query) || { role: 'assistant', markdown: 'I found the record, but not that exact field.' };
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
  let score = 0; let identityMatches = 0; let genericMatches = 0; let contextualMatch = false;
  if (title && (needle === title || new RegExp(`\\b${title}\\b`).test(needle))) { score += 220; identityMatches += 3; }
  titleTokens.forEach(token => {
    const isWordMatch = queryTokens.includes(token) || new RegExp(`\\b${token}\\b`).test(needle);
    if (!isWordMatch) return;
    const weight = genericRecordWords.has(token) ? 12 : 52;
    score += weight; if (!genericRecordWords.has(token)) identityMatches += 1; else genericMatches += 1;
  });
  if (!identityMatches && genericMatches >= 2) identityMatches = 1;
  queryTokens.forEach(token => { if (new RegExp(`\\b${token}\\b`).test(note) && !genericRecordWords.has(token)) { score += 10; identityMatches += .25; } });
  const explicitCategory = (needle.includes('wifi') && type.includes('wifi')) || (needle.includes('birthday') && type.includes('birthday')) || (needle.includes('audio') && type.includes('audio'));
  if (explicitCategory) { score += 42; identityMatches += 1; }
  if (fieldIntentPatterns(needle).some(pattern => Object.keys(allFields(item)).some(label => pattern.test(label)))) score += 10;
  if (!identityMatches && item.id === state.lastResolvedItemId && /\b(only|it|that|same|its|one)\b/.test(needle)) { score += 75; contextualMatch = true; }
  if (!identityMatches && !contextualMatch) return 0;
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
  const requestedFields = entries.map(([label]) => label);
  return { role: 'assistant', title: item.title, markdown: `Matched **${item.title}** in your encrypted vault. Values were resolved only on this device.`, fields: entries.map(([label, value]) => ({ label, value })), ...(attachment ? { audios: [{ ...attachment, title: item.title }] } : {}), _lookupHint: { id: item.id, fields: requestedFields } };
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
    for (const [offset, label] of offsets) { const due = birthday - offset; const key = `birthday:${item.id}:${occurrenceKey}:${offset}`; if (!sent[key] && now >= due && now - due < 10 * 60000) { const name = item.title.replace(/['’]s birthday/i, ''); try { const identityToken = await vaultStore.idToken(); if (!identityToken) continue; const response = await fetch('/api/telegram', { method: 'POST', headers: vaultStore.apiHeaders(identityToken), body: JSON.stringify({ action: 'send', reminderKey: key, text: `Birthday reminder\n\n${name}'s birthday is ${label}.\n${item.note ? `\nNote: ${item.note}` : ''}\n\nOpen Memoir to prepare a thoughtful wish.` }) }); if (response.ok) { const result = await response.json().catch(() => ({})); sent[key] = Date.now(); localStorage.setItem(sentKey, JSON.stringify(sent)); if (!result.deduplicated) await logSentNotification({ title: item.title, category: 'Birthday', scheduledAt: due, sourceId: item.id, deliveryKey: key }); } } catch { /* retry on next interval */ } } }
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
            messageText = `Card Expiry Alert\n\nYour ${cardDesc}${endingText} is expiring in ${label} (${expiryDateFormatted}).\n\nOpen Memoir to review or request a replacement card from your bank.`;
          } else {
            const docDesc = exp.docNum ? ` (Doc #${exp.docNum})` : '';
            messageText = `Document Expiry Alert\n\nYour ${exp.title}${docDesc} is expiring in ${label} on ${expiryDateFormatted}.\n\nOpen Memoir to check renewal requirements or schedule an appointment.`;
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
    await applyTelegramActions();
  }
}


let currentProfileUid = localStorage.getItem('memoir-selected-profile') || '';
vaultStore.subscribe((items, status, session) => {
  const wasSignedIn = state.auth.status === 'signedIn'; state.items = items; state.status = status; state.auth = session || state.auth;
  const nextProfileUid = state.auth.profile?.uid || '';
  if (nextProfileUid !== currentProfileUid) { currentProfileUid = nextProfileUid; state.messages = []; state.assistantLog = nextProfileUid ? loadAssistantLog(nextProfileUid) : []; }
  if (state.auth.status === 'signedIn') state.authError = '';
  if (wasSignedIn && state.auth.status === 'signedIn' && document.querySelector('.shell')) {
    updateSyncUi();
    const isEditingTodo = document.activeElement && (document.activeElement.matches('[data-todo-amount], input, textarea') || document.activeElement.closest('.todo-card'));
    if (!document.querySelector('.detail') && !isEditingTodo) renderView();
  }
  else shell();
  if (state.auth.status === 'signedIn') { updateNotificationBadge(); runBackgroundAutomation(); }
});
shell(); vaultStore.init();
setInterval(runBackgroundAutomation, 30000);
setInterval(updateReminderCountdowns, 1000);
setInterval(updateSecurityCountdowns, 1000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
