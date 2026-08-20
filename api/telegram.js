import crypto from 'node:crypto';
import { getAdmin, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { getUserByChatId, getUserByUid, listUserProfiles } from '../lib/users.js';
import { telegramRequest } from '../lib/telegramClient.js';
import { routeQuery } from './assistant.js';
import { acknowledgeRuntimeActions, listRuntimeItems, pullRuntimeActions, putRuntimeItem, queueRuntimeActions } from '../lib/runtimeVault.js';

const conversations = new Map();
const pollers = new Map();
const sentMessageKeys = new Set();
const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

export const telegram = (profileOrUid, method, payload) => telegramRequest(profileOrUid, method, payload);

async function loadVault(profile) {
  const runtime = listRuntimeItems(profile.uid); if (runtime.length) return runtime;
  if (!hasAdminMirror()) return [];
  const snapshot = await getAdmin().firestore().collection('secureVault').doc(profile.uid).collection('items').get();
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

async function persistQueuedActions(profile, queued) {
  if (!hasAdminMirror() || !queued.length) return;
  const collection = getAdmin().firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
  await Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt })));
}

async function pullQueuedActions(profile) {
  const runtime = pullRuntimeActions(profile.uid);
  if (!hasAdminMirror()) return runtime;
  const snapshot = await getAdmin().firestore().collection('telegramActionQueue').doc(profile.uid).collection('items').orderBy('createdAt').limit(100).get();
  const persisted = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean);
  const seen = new Set(); return [...runtime, ...persisted].filter(entry => entry?.queueId && !seen.has(entry.queueId) && seen.add(entry.queueId));
}

async function acknowledgeQueuedActions(profile, ids) {
  acknowledgeRuntimeActions(profile.uid, ids);
  if (!hasAdminMirror() || !ids?.length) return;
  const collection = getAdmin().firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
  await Promise.all(ids.slice(0, 100).map(id => collection.doc(String(id)).delete()));
}

async function sendToOwner(profile, text) { return telegram(profile, 'sendMessage', { chat_id: profile.telegramChatId, text: String(text || '').slice(0, 4000) }); }

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

async function handleReminderCallback(profile, callback) {
  const allowedChat = profile.telegramChatId; if (String(callback?.message?.chat?.id) !== allowedChat) return;
  const match = /^m:(done|snooze):([a-zA-Z0-9-]{8,100}):(\d{10,15})$/.exec(String(callback.data || ''));
  if (!match) return telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'This Memoir action is no longer available.' });
  const [, action, id, dueValue] = match; const items = await loadVault(profile); const item = items.find(row => row.id === id && row.type === 'Reminder'); const originalDue = Number(dueValue);
  if (!item || Math.abs(telegramDue(item) - originalDue) > 1000) return telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'This reminder was already updated.', show_alert: false });
  const now = Date.now(); let fields;
  if (action === 'snooze') {
    const snoozedUntil = now + 30 * 60000; fields = { ...(item.fields || {}), 'Due at': telegramLocalDateTime(snoozedUntil), 'Due timestamp': String(snoozedUntil), Status: 'upcoming', Snoozed: 'No', 'Snoozed at': new Date(now).toISOString() };
  } else {
    const repeat = telegramRepeat(item); const nextDue = nextTelegramDue(originalDue, repeat, now); const completedAt = new Date(now).toISOString();
    fields = nextDue ? { ...(item.fields || {}), 'Due at': telegramLocalDateTime(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'user', Snoozed: 'No' } : { ...(item.fields || {}), Status: 'completed', Completion: 'user', 'Completed at': completedAt, Snoozed: 'No' };
  }
  const updated = { ...item, fields, updatedAt: now }; putRuntimeItem(profile.uid, updated); const queued = queueRuntimeActions(profile.uid, [{ op: 'update', id: item.id, type: 'Reminder', title: item.title, note: item.note || '', fields }], 'telegram-button'); await persistQueuedActions(profile, queued);
  await telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: action === 'snooze' ? 'Snoozed for 30 minutes.' : telegramRepeat(item) === 'none' ? 'Marked completed.' : `Completed. The next ${telegramRepeat(item)} reminder is scheduled.`, show_alert: false });
  await telegram(profile, 'editMessageReplyMarkup', { chat_id: allowedChat, message_id: callback.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
}

export async function claimMessageKey(profile, key) {
  if (!key) return { claimed: true, id: '', uid: profile.uid }; const id = crypto.createHash('sha256').update(`${profile.uid}:${String(key)}`).digest('hex');
  if (sentMessageKeys.has(id)) return { claimed: false, id }; sentMessageKeys.add(id);
  if (!hasAdminMirror()) return { claimed: true, id, uid: profile.uid };
  try { await getAdmin().firestore().collection('telegramMessageDeliveries').doc(profile.uid).collection('items').doc(id).create({ key: String(key).slice(0, 300), claimedAt: Date.now() }); return { claimed: true, id, uid: profile.uid }; }
  catch (error) { if (error?.code === 6 || /already exists/i.test(error?.message || '')) return { claimed: false, id }; sentMessageKeys.delete(id); throw error; }
}

async function releaseMessageKey(claim) {
  if (!claim?.id) return; sentMessageKeys.delete(claim.id);
  if (hasAdminMirror()) await getAdmin().firestore().collection('telegramMessageDeliveries').doc(claim.uid).collection('items').doc(claim.id).delete().catch(() => {});
}

export async function processTelegramUpdate(update, profile = getUserByChatId(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id)) {
  if (!profile) return;
  if (update?.callback_query) return handleReminderCallback(profile, update.callback_query);
  const message = update?.message; const allowedChat = profile.telegramChatId;
  if (!message?.text || String(message.chat?.id) !== allowedChat) return;
  const query = String(message.text).trim();
  if (/^\/start\b/i.test(query)) return sendToOwner(profile, 'Memoir is connected to your isolated vault. I can find non-sensitive notes, birthdays and reminders, and queue changes. Passwords, PINs, CVVs and banking information are never revealed in Telegram.');
  if (/^\/help\b/i.test(query)) return sendToOwner(profile, 'Try: “What reminders are due today?”, “Add a reminder to renew my passport tomorrow at 6 PM”, or “Save a note titled Flight booking reference with value …”. Use the Memoir app to retrieve protected credentials or banking details.');
  const items = await loadVault(profile);
  if (!items.length) return sendToOwner(profile, 'Memoir is connected, but this account’s safe catalog is not loaded yet. Open the signed-in Memoir app once so its encrypted Telegram bridge can sync.');
  const catalog = items.map(item => ({ id: item.id, type: item.type, title: item.title, fieldNames: Object.keys(item.fields || {}) }));
  const protectedInput = protectTelegramInput(query, items); const history = conversations.get(allowedChat) || [];
  const provider = process.env.TELEGRAM_AI_PROVIDER === 'mistral' ? 'mistral' : 'gemini';
  const route = await routeQuery({ provider, query: protectedInput.text, catalog, history, timezone: process.env.APP_TIMEZONE || 'Asia/Calcutta' });
  let responseText;
  if (route.kind === 'actions' && route.actions?.length) {
    const actions = rehydrateActions(route.actions, protectedInput.values); const queued = queueRuntimeActions(profile.uid, actions, 'telegram'); await persistQueuedActions(profile, queued);
    responseText = `${route.title || 'Memoir update'}\n\n${actions.length} ${actions.length === 1 ? 'change has' : 'changes have'} been queued securely. Memoir will encrypt and sync ${actions.length === 1 ? 'it' : 'them'} when the signed-in app is online.`;
  } else responseText = answerText(route, items);
  const nextHistory = [...history, { role: 'user', text: protectedInput.text.slice(0, 1200) }, { role: 'assistant', text: cleanTelegramText(responseText).slice(0, 1200) }].slice(-12);
  conversations.set(allowedChat, nextHistory);
  return sendToOwner(profile, responseText);
}

export async function startTelegramPolling() {
  const profiles = listUserProfiles().filter(profile => profile.telegramToken && profile.telegramChatId && !pollers.has(profile.uid));
  await Promise.all(profiles.map(async profile => {
    const webhook = await telegram(profile, 'getWebhookInfo', {}); if (webhook.result?.url) return;
    const state = { active: true, offset: 0 }; pollers.set(profile.uid, state);
    void (async () => {
      while (state.active) {
        try {
          const updates = await telegram(profile, 'getUpdates', { offset: state.offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
          for (const update of updates.result || []) { state.offset = Math.max(state.offset, Number(update.update_id) + 1); await processTelegramUpdate(update, profile); }
        } catch (error) { console.warn(`${profile.name} Telegram polling paused:`, error?.message); await new Promise(resolve => setTimeout(resolve, 5000)); }
      }
    })();
  }));
}

export function stopTelegramPolling() { pollers.forEach(state => { state.active = false; }); pollers.clear(); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    if (['send', 'pull', 'ack'].includes(body.action)) {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Missing identity token' });
      const identity = await verifyOwnerToken(token);
      const profile = getUserByUid(identity.uid); if (!profile) return res.status(403).json({ error: 'This user is not approved for Memoir' });
      if (body.action === 'send') {
        const claim = await claimMessageKey(profile, String(body.reminderKey || '')); if (!claim.claimed) return res.status(200).json({ ok: true, deduplicated: true });
        try { await telegram(profile, 'sendMessage', { chat_id: profile.telegramChatId, text: String(body.text || '').slice(0, 4000) }); return res.status(200).json({ ok: true, deduplicated: false }); }
        catch (error) { await releaseMessageKey(claim); throw error; }
      }
      if (body.action === 'pull') return res.status(200).json({ ok: true, actions: await pullQueuedActions(profile) });
      await acknowledgeQueuedActions(profile, body.queueIds); return res.status(200).json({ ok: true });
    }
    const profile = getUserByChatId(body?.message?.chat?.id || body?.callback_query?.message?.chat?.id);
    if (!profile?.telegramWebhookSecret) return res.status(503).json({ error: 'Telegram webhook is not configured for this account' });
    if (req.headers['x-telegram-bot-api-secret-token'] !== profile.telegramWebhookSecret) return res.status(403).json({ error: 'Invalid webhook signature' });
    await processTelegramUpdate(body, profile); return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram request failed:', error?.message);
    return res.status(Number(error?.status || 503)).json({ error: error?.status === 403 ? 'This user is not approved for the vault' : 'Telegram bridge is unavailable' });
  }
}
