import crypto from 'node:crypto';
import { deviceIdFrom, getAdmin, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { getUserByChatId, getUserByUid, listUserProfiles } from '../lib/users.js';
import { telegramRequest } from '../lib/telegramClient.js';
import { saveAudioAsset } from '../lib/audioVault.js';
import { routeQuery } from './assistant.js';
import { acknowledgeRuntimeActions, listRuntimeItems, pullRuntimeActions, putRuntimeItem, queueRuntimeActions } from '../lib/runtimeVault.js';

import { generateMorningBriefing, generateEveningReview, getZonedParts } from './reminders.js';
const conversations = new Map();
const pollers = new Map();
const sentMessageKeys = new Set();
const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

import { readDecryptedVaultItems } from '../lib/realtimeVault.js';

export const telegram = (profileOrUid, method, payload) => telegramRequest(profileOrUid, method, payload);

async function loadVault(profile) {
  return readDecryptedVaultItems(profile.uid);
}

const cleanTelegramText = text => String(text || '').replace(/[#*_`>~[\]()]/g, '').trim();

export function answerText(route, items) {
  if (route.kind !== 'lookup' || !route.matches?.length) {
    const clean = cleanTelegramText(route.markdown || 'I could not find a matching Memoir record.');
    return clean.replace(/\[\[PRIVATE_\d+\]\]/g, '').replace(/\(to be displayed [^)]+\)/gi, '').trim() || 'I could not find a matching record in your vault.';
  }

  const lines = [String(route.title || 'Memoir Vault Result').toUpperCase(), ''];
  let returned = false;

  route.matches.forEach(match => {
    const item = items.find(row => row.id === match.id);
    if (!item) return;
    const itemFields = item.fields || {};
    const requested = match.fields?.length ? match.fields : Object.keys(itemFields);
    const validFields = requested.map(field => Object.keys(itemFields).find(key => key.toLowerCase() === String(field).toLowerCase())).filter(Boolean);

    if (!validFields.length && !item.note) return;

    lines.push(`${item.title} (${item.type || 'Memory'})`);

    if (validFields.includes('Date') && item.type === 'Birthday' && itemFields.Date) {
      const rawDate = String(itemFields.Date).trim();
      const parts = rawDate.split('-').map(Number);
      const year = parts.length === 3 && parts[0] > 0 ? parts[0] : null;
      const month = parts.length === 3 ? parts[1] : parts[0];
      const day = parts.length === 3 ? parts[2] : parts[1];
      if (month && day) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedDate = `${monthNames[month]} ${day}${year ? `, ${year}` : ''}`;
        lines.push(`• Date: ${formattedDate} (${rawDate})`);
      } else {
        lines.push(`• Date: ${rawDate}`);
      }
    }

    validFields.forEach(field => {
      if (item.type === 'Birthday' && field === 'Date') return;
      if (['Audio Recording', 'Audio Asset ID', 'Audio MIME type', 'Audio File name'].includes(field)) return;
      lines.push(`• ${field}: ${String(itemFields[field])}`);
    });

    if (item.note && (!match.fields?.length || match.fields.length > 2)) {
      lines.push(`• Note: ${String(item.note).slice(0, 500)}`);
    }
    lines.push('');
    returned = true;
  });

  if (!returned) lines.push('No matching information was found in your vault.');
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
  if (!queued.length) return;
  try {
    const admin = await getAdmin();
    const updates = {};
    queued.forEach(entry => {
      updates[`telegramActionQueue/${profile.uid}/${entry.queueId}`] = { payload: serverEncrypt(entry), createdAt: entry.createdAt };
    });
    await admin.database().ref().update(updates);
    const collection = admin.firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
    Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt }).catch(() => {}))).catch(() => {});
  } catch (err) {
    console.warn('Persist queued actions fallback:', err.message);
  }
}

async function pullQueuedActions(profile) {
  const runtime = pullRuntimeActions(profile.uid);
  try {
    const admin = await getAdmin();
    let entries = [];
    const rtdbSnap = await admin.database().ref(`telegramActionQueue/${profile.uid}`).get().catch(() => null);
    if (rtdbSnap && rtdbSnap.exists()) {
      entries = Object.values(rtdbSnap.val() || {}).map(item => {
        try { return typeof item === 'object' && item.payload ? serverDecrypt(item.payload) : item; } catch { return item; }
      }).filter(Boolean);
    } else {
      const snapshot = await admin.firestore().collection('telegramActionQueue').doc(profile.uid).collection('items').orderBy('createdAt').limit(100).get().catch(() => ({ docs: [] }));
      entries = snapshot.docs.map(doc => { try { return serverDecrypt(doc.data().payload); } catch { return null; } }).filter(Boolean);
    }
    const seen = new Set();
    return [...runtime, ...entries].filter(entry => entry?.queueId && !seen.has(entry.queueId) && seen.add(entry.queueId));
  } catch {
    return runtime;
  }
}

async function acknowledgeQueuedActions(profile, ids) {
  acknowledgeRuntimeActions(profile.uid, ids);
  if (!ids?.length) return;
  try {
    const admin = await getAdmin();
    const updates = {};
    ids.forEach(id => { updates[`telegramActionQueue/${profile.uid}/${id}`] = null; });
    await admin.database().ref().update(updates).catch(() => {});
    const collection = admin.firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
    Promise.all(ids.slice(0, 100).map(id => collection.doc(String(id)).delete().catch(() => {}))).catch(() => {});
  } catch {}
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
  const data = String(callback.data || '');
  const cosMatch = /^m:cos-(done|tmr|dismiss):([a-zA-Z0-9-]{8,100})$/.exec(data);
  const remMatch = /^m:(done|snooze):([a-zA-Z0-9-]{8,100}):(\d{10,15})$/.exec(data);

  if (cosMatch) {
    const [, action, id] = cosMatch;
    const items = await loadVault(profile);
    const item = items.find(row => row.id === id && row.type === 'Reminder');
    if (!item) return telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'This reminder was not found.', show_alert: false });

    const now = Date.now();
    let fields;
    let toastText = '';

    if (action === 'done') {
      fields = { ...(item.fields || {}), Status: 'completed', Completion: 'user', 'Completed at': new Date(now).toISOString(), Snoozed: 'No' };
      toastText = `Marked "${item.title}" completed!`;
    } else if (action === 'tmr') {
      const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(tomorrow);
      const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
      const tmrIso = `${obj.year}-${obj.month}-${obj.day}T10:00`;
      const tmrTimestamp = new Date(`${obj.year}-${obj.month}-${obj.day}T10:00:00+05:30`).getTime();
      fields = { ...(item.fields || {}), 'Due at': tmrIso, 'Due timestamp': String(tmrTimestamp), Status: 'upcoming', Snoozed: 'No' };
      toastText = `Rescheduled to tomorrow at 10:00 AM!`;
    } else if (action === 'dismiss') {
      fields = { ...(item.fields || {}), Status: 'completed', Completion: 'dismissed', 'Completed at': new Date(now).toISOString(), Snoozed: 'No' };
      toastText = 'Dismissed.';
    }

    const updated = { ...item, fields, updatedAt: now };
    putRuntimeItem(profile.uid, updated);
    const queued = queueRuntimeActions(profile.uid, [{ op: 'update', id: item.id, type: 'Reminder', title: item.title, note: item.note || '', fields }], 'telegram-chief-of-staff');
    await persistQueuedActions(profile, queued);
    await telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: toastText, show_alert: false });
    return;
  }

  if (!remMatch) return telegram(profile, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'This Memoir action is no longer available.' });
  const [, action, id, dueValue] = remMatch; const items = await loadVault(profile); const item = items.find(row => row.id === id && row.type === 'Reminder'); const originalDue = Number(dueValue);
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
  try { await (await getAdmin()).firestore().collection('telegramMessageDeliveries').doc(profile.uid).collection('items').doc(id).create({ key: String(key).slice(0, 300), claimedAt: Date.now() }); return { claimed: true, id, uid: profile.uid }; }
  catch (error) { if (error?.code === 6 || /already exists/i.test(error?.message || '')) return { claimed: false, id }; sentMessageKeys.delete(id); throw error; }
}

async function releaseMessageKey(claim) {
  if (!claim?.id) return; sentMessageKeys.delete(claim.id);
  if (hasAdminMirror()) await (await getAdmin()).firestore().collection('telegramMessageDeliveries').doc(claim.uid).collection('items').doc(claim.id).delete().catch(() => {});
}

async function downloadTelegramFile(profile, fileId) {
  const fileInfo = await telegram(profile, 'getFile', { file_id: fileId });
  const filePath = fileInfo?.result?.file_path;
  if (!filePath) throw new Error('Could not get file path from Telegram');
  const token = profile.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download Telegram file: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

async function processTelegramUpdateOnce(update, profile = getUserByChatId(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id)) {
  if (!profile) return;
  if (update?.callback_query) return handleReminderCallback(profile, update.callback_query);
  const message = update?.message; const allowedChat = profile.telegramChatId;
  if (!message || String(message.chat?.id) !== allowedChat) return;

  let query = String(message.text || message.caption || '').trim();
  let imagePayload = null;
  let audioPayload = null;
  let audioAsset = null;

  if (message.photo?.length) {
    try {
      const bestPhoto = message.photo[message.photo.length - 1];
      const base64Data = await downloadTelegramFile(profile, bestPhoto.file_id);
      imagePayload = { data: base64Data, mimeType: 'image/jpeg' };
      if (!query) query = 'Extract warranty, invoice, receipt, card or document details from this image';
      await sendToOwner(profile, 'Analyzing image with Smart Capture…');
    } catch (err) {
      console.error('Error downloading Telegram photo:', err);
      return sendToOwner(profile, 'Could not download the photo from Telegram.');
    }
  } else if (message.voice || message.audio) {
    try {
      const audioObj = message.voice || message.audio;
      const base64Data = await downloadTelegramFile(profile, audioObj.file_id);
      audioPayload = { data: base64Data, mimeType: audioObj.mime_type || 'audio/ogg' };
      try {
        audioAsset = await saveAudioAsset(profile.uid, {
          data: base64Data,
          mimeType: audioPayload.mimeType,
          fileName: audioObj.file_name || `telegram-voice-${message.message_id || Date.now()}.ogg`,
          source: 'telegram',
          createdAt: Number(message.date || 0) * 1000 || Date.now(),
        });
      } catch (assetError) {
        console.warn('Encrypted audio asset storage was unavailable; using the legacy attachment path:', assetError?.message);
      }
      if (!query) query = 'Transcribe this voice memo and extract memory or reminder details into JSON';
      await sendToOwner(profile, 'Voice memo received.\n\nRhinous is transcribing and securing it now. This can take 1–2 minutes—please relax; it will appear automatically in your Memoir Audio tab when ready.');
    } catch (err) {
      console.error('Error downloading Telegram audio:', err);
      return sendToOwner(profile, 'Could not download the voice note from Telegram.');
    }
  } else if (!query) {
    return;
  }

  if (/^\/(test|ping)\b/i.test(query)) {
    return sendToOwner(profile, `⚡ Memoir Bot is online!\n\nConnected to vault: ${profile.name} (${profile.email})\nChat ID: ${profile.telegramChatId}\nTimezone: ${process.env.APP_TIMEZONE || 'Asia/Calcutta'}\nReady for daily briefings, reminders, credentials, and image capture.`);
  }

  if (/^\/(briefing|summary|today)\b/i.test(query)) {
    const allItems = await loadVault(profile);
    const zonedNow = getZonedParts(Date.now(), process.env.APP_TIMEZONE || 'Asia/Calcutta');
    const briefing = zonedNow.hour >= 18 ? generateEveningReview(profile, allItems, zonedNow) : generateMorningBriefing(profile, allItems, zonedNow);
    return telegram(profile, 'sendMessage', {
      chat_id: profile.telegramChatId,
      text: briefing.text,
      reply_markup: briefing.reply_markup,
    });
  }

  if (/^\/(reminders|todo|tasks)\b/i.test(query)) {
    const allItems = await loadVault(profile);
    const zonedNow = getZonedParts(Date.now(), process.env.APP_TIMEZONE || 'Asia/Calcutta');
    const briefing = generateMorningBriefing(profile, allItems, zonedNow);
    return telegram(profile, 'sendMessage', {
      chat_id: profile.telegramChatId,
      text: briefing.text,
      reply_markup: briefing.reply_markup,
    });
  }

  if (/^\/(guard|security|audit)\b/i.test(query)) {
    const allItems = await loadVault(profile);
    const relevantItems = allItems.filter(item => item.type !== 'Notification' && item.type !== 'Audio');
    const passwordMap = new Map();
    const pinMap = new Map();
    let totalCreds = 0;
    let weakCount = 0;
    let personalCount = 0;
    const ownerName = String(profile.name || '').toLowerCase();
    const ownerCode = String(profile.code || '');

    relevantItems.forEach(item => {
      Object.entries(item.fields || {}).forEach(([label, value]) => {
        const val = String(value || '').trim();
        if (!val) return;
        const isPwd = /password|passcode/i.test(label);
        const isPin = /\bpin\b|atm pin/i.test(label);
        if (isPwd || isPin) totalCreds += 1;
        if (isPwd) {
          if (!passwordMap.has(val)) passwordMap.set(val, []);
          passwordMap.get(val).push(item.title);
          if (val.length < 8 || /^\d+$/.test(val) || /^[a-zA-Z]+$/.test(val)) weakCount += 1;
          if ((ownerName && val.toLowerCase().includes(ownerName)) || (ownerCode && val.includes(ownerCode))) personalCount += 1;
        }
        if (isPin) {
          if (!pinMap.has(val)) pinMap.set(val, []);
          pinMap.get(val).push(item.title);
          if (/^(0123|1234|2345|3456|4567|5678|6789|1111|0000|2222)$/.test(val) || val.length < 4) weakCount += 1;
          if (ownerCode && val === ownerCode) personalCount += 1;
        }
      });
    });

    let reusedCount = 0;
    passwordMap.forEach(instances => { if (instances.length > 1) reusedCount += 1; });
    pinMap.forEach(instances => { if (instances.length > 1) reusedCount += 1; });

    let score = Math.max(15, 100 - (reusedCount * 15) - (weakCount * 8) - (personalCount * 10));
    const grade = score >= 90 ? 'A+ Fortified' : score >= 75 ? 'B+ Good' : score >= 55 ? 'C Needs Attention' : 'D High Risk';

    return sendToOwner(profile, `🛡️ RHINO GUARD SECURITY AUDIT\n\nOwner: ${profile.name}\nSecurity Health: ${score}% (${grade})\n\n• Credentials Audited: ${totalCreds}\n• Reused Secrets: ${reusedCount}\n• Weak / Short Secrets: ${weakCount}\n• Name / Vault Code Leaks: ${personalCount}\n\nOpen Memoir web app to view the complete interactive breakdown and 1-tap password generator.`);
  }

  if (/^\/start\b/i.test(query)) return sendToOwner(profile, `Memoir is connected to your isolated vault, ${profile.name}! I can find notes, passwords, birthdays and reminders, or give your daily briefing. Try /briefing, /reminders, /guard, /test, or send photos of documents and voice memos.`);
  if (/^\/help\b/i.test(query)) return sendToOwner(profile, 'Try:\n• /briefing — Today’s morning/evening briefing\n• /reminders — Active reminders & tasks\n• /guard — Rhino Guard password & PIN security audit\n• /test — Check Telegram connection\n• “What is my Wi-Fi password?”\n• “When is Deepti’s birthday?”\n• Send photos or voice notes to capture them!');
  const items = await loadVault(profile);
  if (!items.length && !imagePayload && !audioPayload) return sendToOwner(profile, 'Memoir is connected, but this account’s safe catalog is not loaded yet. Open the signed-in Memoir app once so its encrypted Telegram bridge can sync.');
  const catalog = items.map(item => ({ id: item.id, type: item.type, title: item.title, fieldNames: Object.keys(item.fields || {}) }));
  const protectedInput = protectTelegramInput(query, items); const history = conversations.get(allowedChat) || [];
  const provider = imagePayload || audioPayload ? 'gemini' : (process.env.TELEGRAM_AI_PROVIDER === 'mistral' ? 'mistral' : 'gemini');
  let route;
  try {
    route = await routeQuery({ provider, query: protectedInput.text, image: imagePayload, audio: audioPayload, catalog, history, timezone: process.env.APP_TIMEZONE || 'Asia/Calcutta', now: Number(message.date || 0) ? new Date(Number(message.date) * 1000).toISOString() : new Date().toISOString() });
  } catch (error) {
    if (!audioPayload) throw error;
    const recordedAt = Number(message.date || 0) * 1000 || Date.now();
    const recordedLabel = new Date(recordedAt).toLocaleString('en-IN', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    route = { kind: 'actions', title: 'Audio saved without transcript', markdown: 'The audio was preserved, but a reliable transcript could not be produced.', actions: [{ op: 'create', type: 'Audio', title: `Voice Memo · ${recordedLabel}`, note: 'Audio saved. No transcript is available because the recording could not be understood clearly.', fields: { 'Recorded at': new Date(recordedAt).toISOString(), 'Audio Transcript': 'No transcript available', 'Transcription status': 'Audio only · transcription unavailable' } }] };
  }
  let responseText;
  if (route.kind === 'actions' && route.actions?.length) {
    let actions = rehydrateActions(route.actions, protectedInput.values);
    if (audioPayload?.data) {
      const recordedAt = Number(message.date || 0) * 1000 || Date.now();
      const transcript = cleanTelegramText(route.audioTranscript || actions.find(act => act.fields?.['Audio Transcript'])?.fields?.['Audio Transcript'] || '');
      let audioAction = actions.find(act => act.type === 'Audio');
      if (!audioAction) {
        const recordedLabel = new Date(recordedAt).toLocaleString('en-IN', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        audioAction = { op: 'create', id: '', type: 'Audio', title: transcript ? (transcript.length > 50 ? `${transcript.slice(0, 47)}…` : transcript) : `Voice Memo · ${recordedLabel}`, note: transcript || 'Audio saved. Transcription can be retried later.', fields: { 'Recorded at': new Date(recordedAt).toISOString(), 'Audio Transcript': transcript || 'No transcript available', 'Transcription status': transcript ? 'Completed' : 'Awaiting transcription · retry available' } };
        actions = [audioAction, ...actions];
      }
      actions.forEach(act => {
        if (!act.fields) act.fields = {};
        if (act === audioAction) {
          if (audioAsset?.assetId) {
            act.fields['Audio Asset ID'] = audioAsset.assetId;
            act.fields['Audio MIME type'] = audioAsset.mimeType;
            act.fields['Audio File name'] = audioAsset.fileName;
            act.fields['Audio Source'] = 'Telegram';
          } else act.fields['Audio Recording'] = `data:${audioPayload.mimeType};base64,${audioPayload.data}`;
        } else {
          act.fields['Audio Transcript'] = transcript || act.fields['Audio Transcript'] || 'No transcript available';
          if (audioAsset?.assetId) act.fields['Source audio asset ID'] = audioAsset.assetId;
          act.fields['Created via'] = 'Telegram';
        }
      });
    }
    const queued = queueRuntimeActions(profile.uid, actions, 'telegram'); await persistQueuedActions(profile, queued);
    const summaryLines = actions.map(act => {
      const fieldList = Object.entries(act.fields || {}).filter(([k]) => !['Audio Recording', 'Audio Asset ID', 'Audio MIME type', 'Audio File name'].includes(k)).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      return `${act.title} (${act.type})\n${fieldList}`;
    }).join('\n\n');
    const isAudioCapture = Boolean(audioPayload?.data);
    const isFinanceCapture = actions.some(act => act.type === 'Finance' || /invoice|bill|receipt|order/i.test(act.title) || act.fields?.['Amount (INR)'] || act.fields?.Amount);
    const captureKicker = isFinanceCapture ? 'Smart Capture · Invoice & Amount Saved' : isAudioCapture ? 'Smart Capture · Voice Memo Saved' : 'Smart Capture Saved to Vault';
    const captureFooter = isAudioCapture ? 'The audio and transcript were saved securely. Memoir will sync them to your Audio tab automatically.' : 'Encrypted and queued for your Memoir Vault. Open the Memoir app to sync.';
    responseText = `${captureKicker}\n\n${summaryLines}\n\n${captureFooter}`;
  } else if (audioPayload?.data) {
    const transcript = cleanTelegramText(route.audioTranscript || '');
    const recordedAt = Number(message.date || 0) * 1000 || Date.now();
    const recordedLabel = new Date(recordedAt).toLocaleString('en-IN', { timeZone: process.env.APP_TIMEZONE || 'Asia/Calcutta', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const fallbackAction = {
      op: 'create',
      type: 'Audio',
      title: transcript.length > 50 ? transcript.slice(0, 47) + '…' : (transcript || `Voice Memo · ${recordedLabel}`),
      note: transcript || 'Audio saved. No transcript is available because the recording could not be understood clearly.',
      fields: {
        ...(audioAsset?.assetId ? { 'Audio Asset ID': audioAsset.assetId, 'Audio MIME type': audioAsset.mimeType, 'Audio File name': audioAsset.fileName, 'Audio Source': 'Telegram' } : { 'Audio Recording': `data:${audioPayload.mimeType};base64,${audioPayload.data}` }),
        'Audio Transcript': transcript,
        'Transcription status': transcript && transcript !== query ? 'Completed' : 'Audio only · speech unclear',
        'Recorded at': new Date(recordedAt).toISOString(),
      },
    };
    const queued = queueRuntimeActions(profile.uid, [fallbackAction], 'telegram');
    await persistQueuedActions(profile, queued);
    responseText = `Voice Note Saved to Vault\n\n${fallbackAction.title}\n• Audio recording attached and playable in Memoir\n• ${transcript ? `Transcript: ${transcript}` : 'No transcript was available because the speech was unclear'}\n\nIt will appear in the Audio tab.`;
  } else responseText = answerText(route, items);

  const nextHistory = [...history, { role: 'user', text: protectedInput.text.slice(0, 1200) }, { role: 'assistant', text: cleanTelegramText(responseText).slice(0, 1200) }].slice(-12);
  conversations.set(allowedChat, nextHistory);
  return sendToOwner(profile, responseText);
}

export async function processTelegramUpdate(update, profile = getUserByChatId(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id)) {
  if (!profile) return;
  const telegramUpdateId = update?.update_id ?? update?.callback_query?.id ?? update?.message?.message_id;
  const claim = await claimMessageKey(profile, telegramUpdateId == null ? '' : `incoming:${telegramUpdateId}`);
  if (!claim.claimed) return;
  try {
    return await processTelegramUpdateOnce(update, profile);
  } catch (error) {
    await releaseMessageKey(claim);
    throw error;
  }
}


export async function startTelegramPolling() {
  const profiles = listUserProfiles().filter(profile => profile.telegramToken && profile.telegramChatId && !pollers.has(profile.uid));
  await Promise.all(profiles.map(async profile => {
    const webhook = await telegram(profile, 'getWebhookInfo', {}); if (webhook.result?.url) return;
    const state = { active: true, offset: 0, retryDelayMs: 5000 }; pollers.set(profile.uid, state);
    void (async () => {
      while (state.active) {
        try {
          const updates = await telegram(profile, 'getUpdates', { offset: state.offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
          for (const update of updates.result || []) { state.offset = Math.max(state.offset, Number(update.update_id) + 1); await processTelegramUpdate(update, profile); }
          state.retryDelayMs = 5000;
        } catch (error) {
          const quotaExhausted = Number(error?.code) === 8 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(error?.message || '');
          state.retryDelayMs = quotaExhausted ? Math.min(Math.max(state.retryDelayMs * 2, 60000), 5 * 60 * 1000) : 5000;
          console.warn(`${profile.name} Telegram polling paused for ${Math.round(state.retryDelayMs / 1000)}s:`, error?.message);
          await new Promise(resolve => setTimeout(resolve, state.retryDelayMs));
        }
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
      let identity;
      try {
        identity = await verifyOwnerToken(token, deviceIdFrom(req));
      } catch (authErr) {
        if (authErr?.status === 401 || authErr?.code === 'auth/otp-required') {
          if (body.action === 'pull') return res.status(200).json({ ok: true, actions: [] });
          if (body.action === 'ack') return res.status(200).json({ ok: true });
          return res.status(200).json({ ok: true, skipped: 'unverified-session' });
        }
        throw authErr;
      }
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
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || 'Telegram bridge is unavailable', code: error?.code || 'telegram/failed' });
  }
}
