import { deviceIdFrom, getAdmin, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { listRuntimeItems, markReminderDelivered, putRuntimeItem, queueRuntimeActions, reminderWasDelivered, replaceRuntimeItems } from '../lib/runtimeVault.js';
import { getUserByUid, listUserProfiles } from '../lib/users.js';
import { telegram } from './telegram.js';
import { EXPIRY_NOTIFICATION_OFFSETS, extractItemExpiry } from '../lib/expiryIntelligence.js';


const deliveryReservations = new Set();
const activeSweeps = new Map();
const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

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

async function loadReminderItems(profile) {
  let items = listRuntimeItems(profile.uid);
  if (!items.length && hasAdminMirror()) {
    const snapshot = await (await getAdmin()).firestore().collection('secureVault').doc(profile.uid).collection('items').get();
    items = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean); replaceRuntimeItems(profile.uid, items);
  }
  return items.filter(item => item.type === 'Reminder');
}

const scopedKey = (profile, key) => `${profile.uid}:${key}`;
const deliveryRef = async (profile, key) => (await getAdmin()).firestore().collection('reminderDeliveries').doc(profile.uid).collection('items').doc(key);
async function reserveDelivery(profile, key) {
  const memoryKey = scopedKey(profile, key); if (reminderWasDelivered(memoryKey) || deliveryReservations.has(memoryKey)) return false; deliveryReservations.add(memoryKey);
  if (!hasAdminMirror()) return true;
  try { await (await deliveryRef(profile, key)).create({ status: 'sending', claimedAt: Date.now() }); return true; }
  catch (error) { deliveryReservations.delete(memoryKey); if (error?.code === 6 || /already exists/i.test(error?.message || '')) return false; throw error; }
}
async function finishDelivery(profile, key) {
  const memoryKey = scopedKey(profile, key); markReminderDelivered(memoryKey); deliveryReservations.delete(memoryKey);
  if (hasAdminMirror()) await (await deliveryRef(profile, key)).set({ status: 'sent', deliveredAt: Date.now() }, { merge: true });
}
async function releaseDelivery(profile, key) {
  deliveryReservations.delete(scopedKey(profile, key));
  if (hasAdminMirror()) await (await deliveryRef(profile, key)).delete().catch(() => {});
}

async function queuePersistedAction(profile, action, source) {
  const queued = queueRuntimeActions(profile.uid, [action], source);
  if (hasAdminMirror()) {
    const collection = (await getAdmin()).firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
    await Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt })));
  }
}

async function sendReminder(profile, item, label, due) {
  const dueText = new Date(due).toLocaleString('en-IN', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', dateStyle: 'medium', timeStyle: 'short' });
  const when = label === 'now' ? 'is due now' : `is due in ${label}`;
  const text = `Memoir Reminder\n\n${item.title} ${when}.\nDue: ${dueText}${item.note ? `\nNote: ${String(item.note).slice(0, 800)}` : ''}\n\nOpen Memoir to mark it complete or snooze it.`;
  await telegram(profile, 'sendMessage', { chat_id: profile.telegramChatId, text: text.slice(0, 4000), reply_markup: { inline_keyboard: [[{ text: 'Done', callback_data: `m:done:${item.id}:${due}` }, { text: 'Snooze 30m', callback_data: `m:snooze:${item.id}:${due}` }]] } });
}

async function performReminderSweep(profile, now = Date.now()) {
  if (!profile?.telegramToken || !profile.telegramChatId) return { checked: 0, delivered: 0, autoCompleted: 0 };
  const reminders = await loadReminderItems(profile);
  let delivered = 0; let autoCompleted = 0;
  for (const item of reminders) {
    const due = dueTimestamp(item); if (!due || isCompleted(item)) continue;
    if (now >= due + 12 * 60 * 60 * 1000) {
      const completionKey = `${item.id}:${due}:no-response`;
      if (await reserveDelivery(profile, completionKey)) {
        try {
        const completedAt = new Date(now).toISOString(); const repeat = repeatValue(item); const nextDue = advanceDue(due, repeat, now);
        const fields = nextDue ? { ...(item.fields || {}), 'Due at': localDueString(nextDue), 'Due timestamp': String(nextDue), Status: 'upcoming', Completion: '', 'Completed at': '', 'Last completed at': completedAt, 'Last completion': 'no-response', Snoozed: 'No' } : { ...(item.fields || {}), Status: 'completed', Completion: 'no-response', 'Completed at': completedAt, Snoozed: 'No' };
        const next = { ...item, fields, updatedAt: now }; putRuntimeItem(profile.uid, next);
        await queuePersistedAction(profile, { op: 'update', id: item.id, type: 'Reminder', title: item.title, note: item.note || '', fields }, 'reminder-engine');
        await finishDelivery(profile, completionKey); autoCompleted += 1;
        } catch (error) { await releaseDelivery(profile, completionKey); throw error; }
      }
      continue;
    }
    if (isSnoozed(item)) continue;
    for (const [offset, label] of REMINDER_OFFSETS) {
      const sendAt = due - offset; const key = `${item.id}:${due}:${offset}`;
      if (Number(item.createdAt || 0) > sendAt || now < sendAt) continue;
      const grace = offset === 0 ? 10 * 60 * 1000 : 65 * 60 * 1000;
      if (!await reserveDelivery(profile, key)) continue;
      if (now - sendAt > grace) { await finishDelivery(profile, key); continue; }
      try {
        await sendReminder(profile, item, label, due);
        await queuePersistedAction(profile, { op: 'create', type: 'Notification', title: item.title, note: 'Telegram delivery receipt', fields: { Category: 'Reminder', 'Scheduled at': String(sendAt), 'Sent at': String(Date.now()), 'Source id': item.id, 'Delivery key': key, Status: 'sent' } }, 'notification-engine');
        await finishDelivery(profile, key); delivered += 1;
      }
      catch (error) { await releaseDelivery(profile, key); throw error; }
    }
  }
  return { checked: reminders.length, delivered, autoCompleted };
}

async function sendExpiryNotification(profile, exp, label, expiryTimestamp) {
  const expiryDateFormatted = new Date(expiryTimestamp).toLocaleDateString('en-IN', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let text = '';
  if (exp.isCard) {
    const cardDesc = exp.bank ? `${exp.bank} ${exp.title}` : exp.title;
    const endingText = exp.last4 ? ` (ending in ${exp.last4})` : '';
    text = `Card Expiry Alert\n\nYour ${cardDesc}${endingText} is expiring in ${label} (${expiryDateFormatted}).\n\nOpen Memoir to review or request a replacement card from your bank.`;
  } else {
    const docDesc = exp.docNum ? ` (Doc #${exp.docNum})` : '';
    text = `Document Expiry Alert\n\nYour ${exp.title}${docDesc} is expiring in ${label} on ${expiryDateFormatted}.\n\nOpen Memoir to check renewal requirements or schedule an appointment.`;
  }

  await telegram(profile, 'sendMessage', {
    chat_id: profile.telegramChatId,
    text: text.slice(0, 4000),
  });
}

async function performExpirySweep(profile, now = Date.now()) {
  if (!profile?.telegramToken || !profile.telegramChatId) return { checked: 0, delivered: 0 };
  let items = listRuntimeItems(profile.uid);
  if (!items.length && hasAdminMirror()) {
    const snapshot = await (await getAdmin()).firestore().collection('secureVault').doc(profile.uid).collection('items').get();
    items = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean);
    replaceRuntimeItems(profile.uid, items);
  }

  const expiring = items.map(item => extractItemExpiry(item, now)).filter(Boolean);
  let delivered = 0;

  for (const exp of expiring) {
    const due = exp.expiryTimestamp;
    if (!due) continue;

    for (const [offset, label] of EXPIRY_NOTIFICATION_OFFSETS) {
      const sendAt = due - offset;
      const key = `expiry:${exp.itemId}:${offset}`;

      if (now < sendAt) continue;
      const grace = 24 * 60 * 60 * 1000;
      if (now - sendAt > grace) continue;

      if (!await reserveDelivery(profile, key)) continue;

      try {
        await sendExpiryNotification(profile, exp, label, due);
        await queuePersistedAction(profile, {
          op: 'create',
          type: 'Notification',
          title: `${exp.title} Expiry Alert`,
          note: `Telegram expiry notice (${label})`,
          fields: {
            Category: exp.isCard ? 'Finance' : 'Document',
            'Scheduled at': String(sendAt),
            'Sent at': String(Date.now()),
            'Source id': exp.itemId,
            'Delivery key': key,
            Status: 'sent',
          },
        }, 'notification-engine');
        await finishDelivery(profile, key);
        delivered += 1;
      } catch (error) {
        await releaseDelivery(profile, key);
        console.warn('Expiry notification failed:', error?.message);
      }
    }
  }

  return { checked: expiring.length, delivered };
}

export async function runReminderSweep(now = Date.now(), targetUid = '') {
  const profiles = targetUid ? [getUserByUid(targetUid)].filter(Boolean) : listUserProfiles();
  const results = await Promise.all(profiles.map(async profile => {
    if (activeSweeps.has(profile.uid)) return activeSweeps.get(profile.uid);
    const sweep = Promise.all([
      performReminderSweep(profile, now),
      performExpirySweep(profile, now),
    ]).then(([remindersResult, expiryResult]) => ({
      checked: remindersResult.checked + expiryResult.checked,
      delivered: remindersResult.delivered + expiryResult.delivered,
      autoCompleted: remindersResult.autoCompleted,
    })).finally(() => activeSweeps.delete(profile.uid));

    activeSweeps.set(profile.uid, sweep);
    return sweep;
  }));

  return results.reduce((total, result) => ({
    checked: total.checked + result.checked,
    delivered: total.delivered + result.delivered,
    autoCompleted: total.autoCompleted + (result.autoCompleted || 0),
  }), { checked: 0, delivered: 0, autoCompleted: 0 });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Missing identity token' });
      const identity = await verifyOwnerToken(token, deviceIdFrom(req)); return res.status(200).json({ ok: true, ...(await runReminderSweep(Date.now(), identity.uid)) });
    }
    if (req.method === 'GET') {
      const secret = String(process.env.CRON_SECRET || ''); const authorization = String(req.headers.authorization || '');
      if (!secret || authorization !== `Bearer ${secret}`) return res.status(403).json({ error: 'Invalid scheduler token' });
      return res.status(200).json({ ok: true, ...(await runReminderSweep()) });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('Reminder sweep failed:', error?.message); return res.status(503).json({ error: 'Reminder delivery is temporarily unavailable' }); }
}

