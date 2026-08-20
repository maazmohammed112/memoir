import crypto from 'node:crypto';
import { getAdmin } from '../lib/firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from '../lib/serverCrypto.js';
import { getUserByUid, listUserProfiles } from '../lib/users.js';
import { listRuntimeItems, queueRuntimeActions } from '../lib/runtimeVault.js';

const SENSITIVE_PATTERNS = /password|passcode|\bpin\b|cvv|security code|secret|token|card number|account number|ifsc|transaction password|login password|net banking|atm|passport|aadhaar|pan card|license number|govt id|social security/i;

const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

function getAppTimezone() {
  return process.env.APP_TIMEZONE || 'Asia/Calcutta';
}

function resolveUser(alexaUserId) {
  const maazAlexaId = process.env.ALEXA_ALLOWED_USER_ID_MAAZ;
  const deeptiAlexaId = process.env.ALEXA_ALLOWED_USER_ID_DEEPTI;

  if (alexaUserId) {
    if (deeptiAlexaId && alexaUserId === deeptiAlexaId) {
      return getUserByUid('GQ4lxeAWoPTlyJ4W1jxU8bxk6qS2');
    }
    if (maazAlexaId && alexaUserId === maazAlexaId) {
      return getUserByUid('uQE6xqhWhQWhOlGmfT2br5HnCEq2');
    }
  }

  // Default to Maaz (primary owner) if allowed or during initial dev configuration
  return getUserByUid(process.env.VAULT_OWNER_UID || 'uQE6xqhWhQWhOlGmfT2br5HnCEq2');
}

async function loadVaultItems(profile) {
  const runtime = listRuntimeItems(profile.uid);
  if (runtime.length) return runtime;
  if (!hasAdminMirror()) return [];
  try {
    const snapshot = await (await getAdmin()).firestore().collection('secureVault').doc(profile.uid).collection('items').get();
    return snapshot.docs.map(doc => {
      try { return serverDecrypt(doc.data().payload); }
      catch { return null; }
    }).filter(Boolean);
  } catch (error) {
    console.warn('[Alexa] Could not load vault mirror:', error?.message);
    return [];
  }
}

async function persistQueuedAction(profile, action) {
  const queued = queueRuntimeActions(profile.uid, [action], 'alexa');
  if (hasAdminMirror() && queued.length) {
    try {
      const collection = (await getAdmin()).firestore().collection('telegramActionQueue').doc(profile.uid).collection('items');
      await Promise.all(queued.map(entry => collection.doc(entry.queueId).set({ payload: serverEncrypt(entry), createdAt: entry.createdAt })));
    } catch (error) {
      console.warn('[Alexa] Could not persist action:', error?.message);
    }
  }
  return queued;
}

function getUpcomingBirthdays(items) {
  const birthdays = items.filter(item => String(item.type || '').toLowerCase() === 'birthday');
  if (!birthdays.length) return 'You have no birthdays saved in Memoir.';

  const now = new Date();
  const currentYear = now.getFullYear();

  const formatted = birthdays.map(item => {
    const rawDate = item.fields?.['Date of birth'] || item.fields?.['Date'] || item.fields?.['Birthday'] || '';
    const match = String(rawDate).match(/(\d{4})?-?(\d{2})-(\d{2})/);
    if (!match) return null;
    const year = match[1] && match[1] !== '0000' ? parseInt(match[1], 10) : null;
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);

    let nextBirthday = new Date(currentYear, month, day);
    if (nextBirthday.getTime() < new Date(currentYear, now.getMonth(), now.getDate()).getTime()) {
      nextBirthday = new Date(currentYear + 1, month, day);
    }

    const diffDays = Math.round((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const nextAge = year ? nextBirthday.getFullYear() - year : null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];

    return {
      title: item.title,
      diffDays,
      dateString: `${monthName} ${day}`,
      nextAge,
      note: item.note,
    };
  }).filter(Boolean).sort((a, b) => a.diffDays - b.diffDays);

  if (!formatted.length) return 'You have no upcoming birthdays in Memoir.';

  const nextThree = formatted.slice(0, 3);
  const speechParts = nextThree.map(b => {
    if (b.diffDays === 0) return `Today is ${b.title}'s birthday${b.nextAge ? `, turning ${b.nextAge}` : ''}!`;
    if (b.diffDays === 1) return `Tomorrow is ${b.title}'s birthday${b.nextAge ? `, turning ${b.nextAge}` : ''}.`;
    if (b.diffDays <= 30) return `${b.title}'s birthday is in ${b.diffDays} days on ${b.dateString}${b.nextAge ? `, turning ${b.nextAge}` : ''}.`;
    return `${b.title}'s birthday is on ${b.dateString}.`;
  });

  return `Here are your upcoming birthdays: ${speechParts.join(' ')}`;
}

function getUpcomingReminders(items) {
  const reminders = items.filter(item => String(item.type || '').toLowerCase() === 'reminder');
  const activeReminders = reminders.filter(item => {
    const status = String(item.fields?.Status || '').toLowerCase();
    return status !== 'completed' && status !== 'dismissed';
  });

  if (!activeReminders.length) return 'You have no active reminders in Memoir.';

  const now = Date.now();
  const sorted = activeReminders.map(item => {
    const explicit = Number(item.fields?.['Due timestamp']);
    const timestamp = Number.isFinite(explicit) && explicit > 0 ? explicit : new Date(item.fields?.['Due at'] || '').getTime();
    return { item, timestamp };
  }).filter(r => Number.isFinite(r.timestamp)).sort((a, b) => a.timestamp - b.timestamp);

  if (!sorted.length) return 'You have no scheduled reminders.';

  const speechList = sorted.slice(0, 4).map(({ item, timestamp }) => {
    const diffHours = (timestamp - now) / (1000 * 60 * 60);
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: getAppTimezone() });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: getAppTimezone() });

    if (diffHours < 0) return `${item.title}, which was due ${dateStr} at ${timeStr}.`;
    if (diffHours < 24) return `${item.title} today at ${timeStr}.`;
    return `${item.title} on ${dateStr} at ${timeStr}.`;
  });

  return `You have ${sorted.length} active reminder${sorted.length > 1 ? 's' : ''}: ${speechList.join(' ')}`;
}

async function handleAddReminder(profile, { title, dueAt, note }) {
  if (!title) return 'Please specify what you would like to be reminded about.';

  const id = crypto.randomUUID();
  const timestamp = dueAt ? new Date(dueAt).getTime() : Date.now() + 60 * 60 * 1000;
  const isoDue = new Date(timestamp).toISOString();

  const reminderItem = {
    id,
    type: 'Reminder',
    title: title.trim(),
    note: note ? String(note).trim() : '',
    fields: {
      'Due at': isoDue,
      'Due timestamp': timestamp,
      Status: 'pending',
      Repeat: 'none',
      Snoozed: 'no',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await persistQueuedAction(profile, { op: 'create', ...reminderItem });

  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: getAppTimezone() });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: getAppTimezone() });

  return `I have added a reminder to ${title} for ${dateStr} at ${timeStr}.`;
}

async function handleSnoozeReminder(profile, items, titleQuery) {
  const reminders = items.filter(item => String(item.type || '').toLowerCase() === 'reminder');
  const active = reminders.filter(item => String(item.fields?.Status || '').toLowerCase() !== 'completed');
  if (!active.length) return 'You have no active reminders to snooze.';

  let target = active[0];
  if (titleQuery) {
    const q = String(titleQuery).toLowerCase();
    const match = active.find(r => r.title.toLowerCase().includes(q));
    if (match) target = match;
  }

  const currentDue = Number(target.fields?.['Due timestamp']) || new Date(target.fields?.['Due at'] || '').getTime() || Date.now();
  const newDue = currentDue + 30 * 60 * 1000;
  const updatedItem = {
    ...target,
    fields: {
      ...target.fields,
      'Due at': new Date(newDue).toISOString(),
      'Due timestamp': newDue,
      Snoozed: 'yes',
    },
    updatedAt: Date.now(),
  };

  await persistQueuedAction(profile, { op: 'update', ...updatedItem });
  return `Snoozed reminder "${target.title}" for 30 minutes.`;
}

async function handleCompleteReminder(profile, items, titleQuery) {
  const reminders = items.filter(item => String(item.type || '').toLowerCase() === 'reminder');
  const active = reminders.filter(item => String(item.fields?.Status || '').toLowerCase() !== 'completed');
  if (!active.length) return 'You have no active reminders to complete.';

  let target = active[0];
  if (titleQuery) {
    const q = String(titleQuery).toLowerCase();
    const match = active.find(r => r.title.toLowerCase().includes(q));
    if (match) target = match;
  }

  const updatedItem = {
    ...target,
    fields: {
      ...target.fields,
      Status: 'completed',
      CompletedAt: Date.now(),
    },
    updatedAt: Date.now(),
  };

  await persistQueuedAction(profile, { op: 'update', ...updatedItem });
  return `Marked "${target.title}" as completed.`;
}

function handleSafeLookup(items, query) {
  if (!query || !query.trim()) return 'What information would you like me to look up in Memoir?';

  const q = query.toLowerCase().trim();

  // Voice security guard - strictly block sensitive inquiries
  if (SENSITIVE_PATTERNS.test(q)) {
    return 'That information is protected and cannot be spoken through Alexa. Please open Memoir securely to view it.';
  }

  const matches = items.filter(item => {
    const title = String(item.title || '').toLowerCase();
    const type = String(item.type || '').toLowerCase();
    const note = String(item.note || '').toLowerCase();
    const fieldKeys = Object.keys(item.fields || {}).map(k => k.toLowerCase());
    return title.includes(q) || type.includes(q) || note.includes(q) || fieldKeys.some(k => k.includes(q));
  });

  if (!matches.length) {
    return `I couldn't find any non-sensitive information matching "${query}" in Memoir.`;
  }

  const match = matches[0];
  const isFinance = String(match.type || '').toLowerCase() === 'finance' || /\bbank\b|card/i.test(`${match.title} ${match.note}`);
  if (isFinance) {
    return 'Financial records are protected and cannot be spoken through Alexa. Please open Memoir securely to view them.';
  }

  const safeLines = [];
  if (match.title) safeLines.push(`Found ${match.title}.`);
  if (match.note && !SENSITIVE_PATTERNS.test(match.note)) {
    safeLines.push(`Note: ${match.note}.`);
  }

  Object.entries(match.fields || {}).forEach(([key, val]) => {
    if (!SENSITIVE_PATTERNS.test(key) && !SENSITIVE_PATTERNS.test(String(val))) {
      safeLines.push(`${key}: ${val}.`);
    }
  });

  if (!safeLines.length) {
    return 'That record contains protected information that cannot be spoken through Alexa. Please open Memoir securely to view it.';
  }

  return safeLines.join(' ').slice(0, 500);
}

export default async function alexaHandler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', speak: 'Method Not Allowed' });
  }

  const configuredSecret = process.env.ALEXA_BRIDGE_SECRET;
  const incomingSecret = req.headers['x-alexa-bridge-secret'] || req.body?.bridgeSecret;

  if (configuredSecret && incomingSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized bridge request', speak: 'Unauthorized access to Memoir.' });
  }

  const configuredSkillId = process.env.ALEXA_SKILL_ID;
  const incomingSkillId = req.body?.skillId;
  if (configuredSkillId && incomingSkillId && incomingSkillId !== configuredSkillId) {
    return res.status(403).json({ error: 'Invalid Skill ID', speak: 'Invalid Alexa skill ID.' });
  }

  const alexaUserId = String(req.body?.userId || req.headers['x-alexa-user-id'] || '').trim();
  const profile = resolveUser(alexaUserId);

  if (!profile) {
    console.warn('[Alexa] Unrecognized Alexa user ID:', alexaUserId);
    return res.status(403).json({
      error: 'Unrecognized Alexa Account',
      speak: 'Your Amazon account is not connected to a Memoir vault. Please configure your Alexa User ID in Memoir.',
      alexaUserId,
    });
  }

  const intent = String(req.body?.intent || '').trim();
  const query = String(req.body?.query || req.body?.slots?.Query?.value || '').trim();
  const title = String(req.body?.title || req.body?.slots?.ReminderTitle?.value || '').trim();
  const dueAt = req.body?.dueAt || req.body?.slots?.DueAt?.value;

  console.log(`[Alexa] Intent: "${intent}" for User: ${profile.name} (${profile.uid}), AlexaUserId: ${alexaUserId.slice(0, 20)}...`);

  try {
    const items = await loadVaultItems(profile);

    let speech = '';
    switch (intent) {
      case 'UpcomingBirthdaysIntent':
      case 'birthdays':
        speech = getUpcomingBirthdays(items);
        break;

      case 'UpcomingRemindersIntent':
      case 'reminders':
        speech = getUpcomingReminders(items);
        break;

      case 'AddReminderIntent':
      case 'add_reminder':
        speech = await handleAddReminder(profile, { title: title || query, dueAt });
        break;

      case 'SnoozeReminderIntent':
      case 'snooze_reminder':
        speech = await handleSnoozeReminder(profile, items, title || query);
        break;

      case 'CompleteReminderIntent':
      case 'complete_reminder':
        speech = await handleCompleteReminder(profile, items, title || query);
        break;

      case 'AskSafeInfoIntent':
      case 'lookup':
      case 'query':
        speech = handleSafeLookup(items, query || title);
        break;

      case 'LaunchRequest':
        speech = `Welcome to Rhino Memoir for ${profile.name}. You can ask for upcoming birthdays, today's reminders, safe notes, or to add a reminder. What would you like to do?`;
        break;

      default:
        speech = query ? handleSafeLookup(items, query) : `Rhino Memoir is ready. Ask for birthdays, reminders, or safe notes.`;
    }

    return res.status(200).json({
      ok: true,
      speak: speech,
      reprompt: 'Can I help you with anything else in Memoir?',
      user: profile.name,
    });
  } catch (error) {
    console.error('[Alexa] Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      speak: 'Sorry, I had trouble accessing your Memoir vault. Please try again later.',
    });
  }
}
