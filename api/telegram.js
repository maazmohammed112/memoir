import crypto from 'node:crypto';
import { getAdmin, OWNER_UID, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { routeQuery } from './assistant.js';
import { acknowledgeRuntimeActions, listRuntimeItems, pullRuntimeActions, putRuntimeItem, queueRuntimeActions } from '../lib/runtimeVault.js';

const conversations = new Map();
let polling = false;
let updateOffset = 0;
const sentMessageKeys = new Set();

export async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) throw new Error('Telegram bot is not configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
  const result = await response.json(); if (!result.ok) throw new Error(result.description || 'Telegram request failed'); return result;
}

async function loadVault() {
  const runtime = listRuntimeItems(OWNER_UID); if (runtime.length) return runtime;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY) return [];
  const snapshot = await getAdmin().firestore().collection('secureVault').doc(OWNER_UID).collection('items').get();
  return snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean);
}

const sensitiveLabel = /password|passcode|\bpin\b|cvv|security code|secret|token|card number|account number|ifsc|transaction password|login password/i;
const financeRecord = item => String(item?.type || '').toLowerCase() === 'finance' || /\bbank\b|credit card|debit card/i.test(`${item?.title || ''} ${item?.note || ''}`);
const cleanTelegramText = text => String(text || '').replace(/[#*_`>~[\]()]/g, '').trim();

export function answerText(route, items) {
  if (route.kind !== 'lookup') return cleanTelegramText(route.markdown || 'I could not find a matching Memoir record.');
  const lines = [String(route.title || 'Memoir result').toUpperCase(), '']; let blocked = false; let returned = false;
  route.matches.forEach(match => {
    const item = items.find(row => row.id === match.id); if (!item) return;
    if (financeRecord(item)) { blocked = true; return; }
    const fields = match.fields?.length ? match.fields : Object.keys(item.fields || {});
    const safeFields = fields.map(field => Object.keys(item.fields || {}).find(key => key.toLowerCase() === String(field).toLowerCase())).filter(Boolean).filter(field => {
      if (sensitiveLabel.test(field)) { blocked = true; return false; } return true;
    });
    if (!safeFields.length) return;
    lines.push(item.title); safeFields.forEach(field => lines.push(`${field}: ${String(item.fields[field])}`)); lines.push(''); returned = true;
  });
  if (blocked) lines.push('Protected information was withheld. Telegram cannot reveal passwords, PINs, CVVs, secrets, card or bank details. Open the Memoir app to view them securely.');
  if (!returned && !blocked) lines.push('No matching non-sensitive information was found.');
  return lines.join('\n').slice(0, 4000);
}

function protectTelegramInput(input, items) {
  let text = String(input || ''); const values = {}; let index = 0;
  const remember = value => { const token = `[[PRIVATE_${index++}]]`; values[token] = String(value).trim(); return token; };
  const known = items.flatMap(item => Object.values(item.fields || {})).map(String).filter(value => value.trim().length >= 3).sort((a, b) => b.length - a.length);
  known.forEach(value => { if (text.includes(value)) text = text.split(value).join(remember(value)); });
  const labels = ['debit card number', 'credit card number', 'account number', 'username / id', 'username', 'atm pin', 'wifi password', 'wi-fi password', 'transaction password', 'login password', 'password', 'passcode', 'security code', 'cvv', 'pin', 'ifsc code', 'extra secret'];
  const pattern = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const labelled = new RegExp(`\\b(${pattern})\\s*(?:to|is|:|=)\\s*([\\s\\S]*?)(?=(?:\\s*(?:,|;|\\n)\\s*|\\s+and\\s+)(?:${pattern})\\s*(?:to|is|:|=)|$)`, 'gi');
  text = text.replace(labelled, (_all, label, value) => `${label}: ${/^\[\[PRIVATE_\d+\]\]$/.test(value.trim()) ? value.trim() : remember(value)}`);
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, value => remember(value));
  text = text.replace(/\b(?:\d[ -]?){8,19}\b/g, value => remember(value));
  return { text, values };
}

function rehydrateActions(actions, privateValues) {
  const restore = value => Object.entries(privateValues).reduce((text, [token, secret]) => text.split(token).join(secret), String(value || ''));
  return (Array.isArray(actions) ? actions : []).map(action => ({
    op: action.op, id: String(action.id || ''), type: restore(action.type).slice(0, 40), title: restore(action.title).slice(0, 160), note: restore(action.note).slice(0, 2000),
    fields: Object.fromEntries(Object.entries(action.fields || {}).map(([label, value]) => [restore(label).slice(0, 100), restore(value).slice(0, 4000)])),
  }));
}

async function persistQueuedActions(queued) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY || !queued.length) return;
  const collection = getAdmin().firestore().collection('telegramActionQueue').doc(OWNER_UID).collection('items');
  await Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt })));
}

async function pullQueuedActions() {
  const runtime = pullRuntimeActions(OWNER_UID);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY) return runtime;
  const snapshot = await getAdmin().firestore().collection('telegramActionQueue').doc(OWNER_UID).collection('items').orderBy('createdAt').limit(100).get();
  const persisted = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean);
  const seen = new Set(); return [...runtime, ...persisted].filter(entry => entry?.queueId && !seen.has(entry.queueId) && seen.add(entry.queueId));
}

async function acknowledgeQueuedActions(ids) {
  acknowledgeRuntimeActions(OWNER_UID, ids);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY || !ids?.length) return;
  const collection = getAdmin().firestore().collection('telegramActionQueue').doc(OWNER_UID).collection('items');
  await Promise.all(ids.slice(0, 100).map(id => collection.doc(String(id)).delete()));
}

async function sendToOwner(text) { return telegram('sendMessage', { chat_id: String(process.env.TELEGRAM_CHAT_ID || ''), text: String(text || '').slice(0, 4000) }); }

function telegramDue(item) { const explicit = Number(item?.fields?.['Due timestamp']); return Number.isFinite(explicit) && explicit > 0 ? explicit : new Date(item?.fields?.['Due at'] || '').getTime(); }
function telegramRepeat(item) { const value = String(item?.fields?.Repeat || 'none').toLowerCase(); return ['daily', 'weekly', 'monthly', 'yearly'].includes(value) ? value : 'none'; }
function nextTelegramDue(timestamp, repeat, after = Date.now()) {
  if (!timestamp || repeat === 'none') return 0; let next = new Date(timestamp); const originalDay = next.getDate();
  const advance = () => {
    if (repeat === 'daily') next.setDate(next.getDate() + 1);
    else if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') { const month = next.getMonth() + 1; next = new Date(next.getFullYear(), month, Math.min(originalDay, new Date(next.getFullYear(), month + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
    else if (repeat === 'yearly') { const year = next.getFullYear() + 1; next = new Date(year, next.getMonth(), Math.min(originalDay, new Date(year, next.getMonth() + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
  };
  do advance(); while (next.getTime() <= after); return next.getTime();
}
function telegramLocalDateTime(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp)); const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

async function handleReminderCallback(callback) {
  const allowedChat = String(process.env.TELEGRAM_CHAT_ID || ''); if (String(callback?.message?.chat?.id) !== allowedChat) return;
  const match = /^m:(done|snooze):([a-zA-Z0-9-]{8,100}):(\d{10,15})$/.exec(String(callback.data || ''));
  if (!match) return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'This Memoir action is no longer available.' });
  const [, action, id, dueValue] = match; const items = await loadVault(); const item = items.find(row => row.id === id && row.type === 'Reminder'); const originalDue = Number(dueValue);
  if (!item || Math.abs(telegramDue(item) - originalDue) > 1000) return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'This reminder was already updated.', show_alert: false });
  const now = Date.now(); let fields;
  if (action === 'snooze') {
    const snoozedUntil = now + 30 * 60000; fields = { ...(item.fields || {}), 'Due at': telegramLocalDateTime(snoozedUntil), 'Due timestamp': String(snoozedUntil), Status: 'upcoming', Snoozed: 'No', 'Snoozed at': new Date(now).toISOString() };
  } else {
    const repeat = telegramRepeat(item); const nextDue = nextTelegramDue(originalDue, repeat, now); const completedAt = new Date(now).toISOString();
    fields = nextDue ? { ...(item.fields || {}), 'Due at': telegramLocalDateTime(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'user', Snoozed: 'No' } : { ...(item.fields || {}), Status: 'completed', Completion: 'user', 'Completed at': completedAt, Snoozed: 'No' };
  }
  const updated = { ...item, fields, updatedAt: now }; putRuntimeItem(OWNER_UID, updated); const queued = queueRuntimeActions(OWNER_UID, [{ op: 'update', id: item.id, type: 'Reminder', title: item.title, note: item.note || '', fields }], 'telegram-button'); await persistQueuedActions(queued);
  await telegram('answerCallbackQuery', { callback_query_id: callback.id, text: action === 'snooze' ? 'Snoozed for 30 minutes.' : telegramRepeat(item) === 'none' ? 'Marked completed.' : `Completed. The next ${telegramRepeat(item)} reminder is scheduled.`, show_alert: false });
  await telegram('editMessageReplyMarkup', { chat_id: allowedChat, message_id: callback.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
}

export async function claimMessageKey(key) {
  if (!key) return { claimed: true, id: '' }; const id = crypto.createHash('sha256').update(String(key)).digest('hex');
  if (sentMessageKeys.has(id)) return { claimed: false, id }; sentMessageKeys.add(id);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY) return { claimed: true, id };
  try { await getAdmin().firestore().collection('telegramMessageDeliveries').doc(OWNER_UID).collection('items').doc(id).create({ key: String(key).slice(0, 300), claimedAt: Date.now() }); return { claimed: true, id }; }
  catch (error) { if (error?.code === 6 || /already exists/i.test(error?.message || '')) return { claimed: false, id }; sentMessageKeys.delete(id); throw error; }
}

async function releaseMessageKey(claim) {
  if (!claim?.id) return; sentMessageKeys.delete(claim.id);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAULT_SERVER_KEY) await getAdmin().firestore().collection('telegramMessageDeliveries').doc(OWNER_UID).collection('items').doc(claim.id).delete().catch(() => {});
}

export async function processTelegramUpdate(update) {
  if (update?.callback_query) return handleReminderCallback(update.callback_query);
  const message = update?.message; const allowedChat = String(process.env.TELEGRAM_CHAT_ID || '');
  if (!message?.text || String(message.chat?.id) !== allowedChat) return;
  const query = String(message.text).trim();
  if (/^\/start\b/i.test(query)) return sendToOwner('Memoir is connected. I can find non-sensitive notes, birthdays and reminders, and I can queue additions or changes. Passwords, PINs, CVVs and all banking information are never revealed in Telegram.');
  if (/^\/help\b/i.test(query)) return sendToOwner('Try: “What reminders are due today?”, “Add a reminder to renew my passport tomorrow at 6 PM”, or “Save a note titled Flight booking reference with value …”. Use the Memoir app to retrieve protected credentials or banking details.');
  const items = await loadVault();
  if (!items.length) return sendToOwner('Memoir is connected, but its safe catalog is not loaded yet. Open the signed-in Memoir app once so the encrypted vault can establish the Telegram bridge.');
  const catalog = items.map(item => ({ id: item.id, type: item.type, title: item.title, fieldNames: Object.keys(item.fields || {}) }));
  const protectedInput = protectTelegramInput(query, items); const history = conversations.get(allowedChat) || [];
  const provider = process.env.TELEGRAM_AI_PROVIDER === 'mistral' ? 'mistral' : 'gemini';
  const route = await routeQuery({ provider, query: protectedInput.text, catalog, history, timezone: process.env.APP_TIMEZONE || 'Asia/Calcutta' });
  let responseText;
  if (route.kind === 'actions' && route.actions?.length) {
    const actions = rehydrateActions(route.actions, protectedInput.values); const queued = queueRuntimeActions(OWNER_UID, actions, 'telegram'); await persistQueuedActions(queued);
    responseText = `${route.title || 'Memoir update'}\n\n${actions.length} ${actions.length === 1 ? 'change has' : 'changes have'} been queued securely. Memoir will encrypt and sync ${actions.length === 1 ? 'it' : 'them'} when the signed-in app is online.`;
  } else responseText = answerText(route, items);
  const nextHistory = [...history, { role: 'user', text: protectedInput.text.slice(0, 1200) }, { role: 'assistant', text: cleanTelegramText(responseText).slice(0, 1200) }].slice(-12);
  conversations.set(allowedChat, nextHistory);
  return sendToOwner(responseText);
}

export async function startTelegramPolling() {
  if (polling || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  const webhook = await telegram('getWebhookInfo', {}); if (webhook.result?.url) return;
  polling = true;
  while (polling) {
    try {
      const updates = await telegram('getUpdates', { offset: updateOffset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const update of updates.result || []) { updateOffset = Math.max(updateOffset, Number(update.update_id) + 1); await processTelegramUpdate(update); }
    } catch (error) { console.warn('Telegram polling paused:', error?.message); await new Promise(resolve => setTimeout(resolve, 5000)); }
  }
}

export function stopTelegramPolling() { polling = false; }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {}; const allowedChat = String(process.env.TELEGRAM_CHAT_ID || '');
    if (['send', 'pull', 'ack'].includes(body.action)) {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Missing identity token' });
      const identity = await verifyOwnerToken(token);
      if (body.action === 'send') {
        const claim = await claimMessageKey(String(body.reminderKey || '')); if (!claim.claimed) return res.status(200).json({ ok: true, deduplicated: true });
        try { await telegram('sendMessage', { chat_id: allowedChat, text: String(body.text || '').slice(0, 4000) }); return res.status(200).json({ ok: true, deduplicated: false }); }
        catch (error) { await releaseMessageKey(claim); throw error; }
      }
      if (body.action === 'pull') return res.status(200).json({ ok: true, actions: await pullQueuedActions() });
      await acknowledgeQueuedActions(body.queueIds); return res.status(200).json({ ok: true });
    }
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Telegram webhook secret is not configured' });
    if (req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(403).json({ error: 'Invalid webhook signature' });
    await processTelegramUpdate(body); return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram request failed:', error?.message);
    return res.status(Number(error?.status || 503)).json({ error: error?.status === 403 ? 'This user is not approved for the vault' : 'Telegram bridge is unavailable' });
  }
}
