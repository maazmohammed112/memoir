import { getAdmin, OWNER_UID, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { listRuntimeItems, markReminderDelivered, putRuntimeItem, queueRuntimeActions, reminderWasDelivered, replaceRuntimeItems } from '../lib/runtimeVault.js';
import { telegram } from './telegram.js';

const deliveryReservations = new Set();
let activeSweep = null;

export const REMINDER_OFFSETS = [
  [24 * 60 * 60 * 1000, '1 day'],
  [5 * 60 * 60 * 1000, '5 hours'],
  [3 * 60 * 60 * 1000, '3 hours'],
  [2 * 60 * 60 * 1000, '2 hours'],
  [30 * 60 * 1000, '30 minutes'],
  [10 * 60 * 1000, '10 minutes'],
  [0, 'now'],
];

function dueTimestamp(item) {
  const explicit = Number(item?.fields?.['Due timestamp']); if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const parsed = new Date(item?.fields?.['Due at'] || '').getTime(); return Number.isFinite(parsed) ? parsed : 0;
}
function isSnoozed(item) { return /^(yes|true|snoozed)$/i.test(String(item?.fields?.Snoozed || '')); }
function isCompleted(item) { return /^completed$/i.test(String(item?.fields?.Status || '')); }
function repeatValue(item) { const value = String(item?.fields?.Repeat || 'none').toLowerCase(); return ['daily', 'weekly', 'monthly', 'yearly'].includes(value) ? value : 'none'; }
function advanceDue(timestamp, repeat, after = Date.now()) {
  if (!timestamp || repeat === 'none') return 0; let next = new Date(timestamp); const originalDay = next.getDate();
  const advance = () => {
    if (repeat === 'daily') next.setDate(next.getDate() + 1);
    else if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') { const month = next.getMonth() + 1; next = new Date(next.getFullYear(), month, Math.min(originalDay, new Date(next.getFullYear(), month + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
    else if (repeat === 'yearly') { const year = next.getFullYear() + 1; next = new Date(year, next.getMonth(), Math.min(originalDay, new Date(year, next.getMonth() + 1, 0).getDate()), next.getHours(), next.getMinutes()); }
  };
  do advance(); while (next.getTime() <= after); return next.getTime();
}
function localDueString(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

async function loadReminderItems() {
  let items = listRuntimeItems(OWNER_UID);
  if (!items.length && process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAULT_SERVER_KEY) {
    const snapshot = await getAdmin().firestore().collection('secureVault').doc(OWNER_UID).collection('items').get();
    items = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean); replaceRuntimeItems(OWNER_UID, items);
  }
  return items.filter(item => item.type === 'Reminder');
}

const deliveryRef = key => getAdmin().firestore().collection('reminderDeliveries').doc(OWNER_UID).collection('items').doc(key);
async function reserveDelivery(key) {
  if (reminderWasDelivered(key) || deliveryReservations.has(key)) return false; deliveryReservations.add(key);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAULT_SERVER_KEY) return true;
  try { await deliveryRef(key).create({ status: 'sending', claimedAt: Date.now() }); return true; }
  catch (error) { deliveryReservations.delete(key); if (error?.code === 6 || /already exists/i.test(error?.message || '')) return false; throw error; }
}
async function finishDelivery(key) {
  markReminderDelivered(key); deliveryReservations.delete(key);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAULT_SERVER_KEY) await deliveryRef(key).set({ status: 'sent', deliveredAt: Date.now() }, { merge: true });
}
async function releaseDelivery(key) {
  deliveryReservations.delete(key);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAULT_SERVER_KEY) await deliveryRef(key).delete().catch(() => {});
}

async function queuePersistedAction(action, source) {
  const queued = queueRuntimeActions(OWNER_UID, [action], source);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAULT_SERVER_KEY) {
    const collection = getAdmin().firestore().collection('telegramActionQueue').doc(OWNER_UID).collection('items');
    await Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt })));
  }
}

async function sendReminder(item, label, due) {
  const dueText = new Date(due).toLocaleString('en-IN', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', dateStyle: 'medium', timeStyle: 'short' });
  const when = label === 'now' ? 'is due now' : `is due in ${label}`;
  const text = `⏰ Memoir reminder\n\n${item.title} ${when}.\nDue: ${dueText}${item.note ? `\nNote: ${String(item.note).slice(0, 800)}` : ''}\n\nOpen Memoir to mark it complete or snooze it.`;
  await telegram('sendMessage', { chat_id: String(process.env.TELEGRAM_CHAT_ID || ''), text: text.slice(0, 4000), reply_markup: { inline_keyboard: [[{ text: '✅ Done', callback_data: `m:done:${item.id}:${due}` }, { text: '⏰ Snooze 30m', callback_data: `m:snooze:${item.id}:${due}` }]] } });
}

async function performReminderSweep(now = Date.now()) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return { checked: 0, delivered: 0, autoCompleted: 0 };
  const reminders = await loadReminderItems();
  let delivered = 0; let autoCompleted = 0;
  for (const item of reminders) {
    const due = dueTimestamp(item); if (!due || isCompleted(item)) continue;
    if (now >= due + 12 * 60 * 60 * 1000) {
      const completionKey = `${item.id}:${due}:no-response`;
      if (await reserveDelivery(completionKey)) {
        try {
        const completedAt = new Date(now).toISOString(); const repeat = repeatValue(item); const nextDue = advanceDue(due, repeat, now);
        const fields = nextDue ? { ...(item.fields || {}), 'Due at': localDueString(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'no-response', Snoozed: 'No' } : { ...(item.fields || {}), Status: 'completed', Completion: 'no-response', 'Completed at': completedAt, Snoozed: 'No' };
        const next = { ...item, fields, updatedAt: now }; putRuntimeItem(OWNER_UID, next);
        await queuePersistedAction({ op: 'update', id: item.id, type: 'Reminder', title: item.title, note: item.note || '', fields }, 'reminder-engine');
        await finishDelivery(completionKey); autoCompleted += 1;
        } catch (error) { await releaseDelivery(completionKey); throw error; }
      }
      continue;
    }
    if (isSnoozed(item)) continue;
    for (const [offset, label] of REMINDER_OFFSETS) {
      const sendAt = due - offset; const key = `${item.id}:${due}:${offset}`;
      if (Number(item.createdAt || 0) > sendAt || now < sendAt) continue;
      const grace = offset === 0 ? 10 * 60 * 1000 : 65 * 60 * 1000;
      if (!await reserveDelivery(key)) continue;
      if (now - sendAt > grace) { await finishDelivery(key); continue; }
      try {
        await sendReminder(item, label, due);
        await queuePersistedAction({ op: 'create', type: 'Notification', title: item.title, note: 'Telegram delivery receipt', fields: { Category: 'Reminder', 'Scheduled at': String(sendAt), 'Sent at': String(Date.now()), 'Source id': item.id, 'Delivery key': key, Status: 'sent' } }, 'notification-engine');
        await finishDelivery(key); delivered += 1;
      }
      catch (error) { await releaseDelivery(key); throw error; }
    }
  }
  return { checked: reminders.length, delivered, autoCompleted };
}

export function runReminderSweep(now = Date.now()) {
  if (activeSweep) return activeSweep;
  activeSweep = performReminderSweep(now).finally(() => { activeSweep = null; }); return activeSweep;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Missing identity token' });
      await verifyOwnerToken(token); return res.status(200).json({ ok: true, ...(await runReminderSweep()) });
    }
    if (req.method === 'GET') {
      const secret = String(process.env.CRON_SECRET || ''); const authorization = String(req.headers.authorization || '');
      if (!secret || authorization !== `Bearer ${secret}`) return res.status(403).json({ error: 'Invalid scheduler token' });
      return res.status(200).json({ ok: true, ...(await runReminderSweep()) });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('Reminder sweep failed:', error?.message); return res.status(503).json({ error: 'Reminder delivery is temporarily unavailable' }); }
}
