import { getAdmin } from '../lib/firebaseAdmin.js';
import { telegramRequest } from '../lib/telegramClient.js';
import { listUserProfiles } from '../lib/users.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const basic = {
    ok: true,
    service: 'memoir-api',
    runtime: process.version,
  };
  if (String(req.query?.deep || '') !== '1') return res.status(200).json(basic);

  const expected = String(process.env.CRON_SECRET || '');
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || supplied !== expected) return res.status(403).json({ error: 'Invalid diagnostic token' });

  const profiles = listUserProfiles();
  const checks = { firebase: false, users: {}, telegram: {} };
  try {
    const admin = await getAdmin();
    const records = await Promise.all(profiles.map(profile => admin.auth().getUser(profile.uid)));
    checks.firebase = records.every((record, index) => record.email?.toLowerCase() === profiles[index].email);
    profiles.forEach((profile, index) => { checks.users[profile.uid] = Boolean(records[index]); });
  } catch (error) {
    console.error('Firebase diagnostic failed:', error?.message);
  }

  await Promise.all(profiles.map(async profile => {
    if (!profile.telegramToken || !profile.telegramChatId) {
      checks.telegram[profile.uid] = { configured: false, bot: false, chat: false };
      return;
    }
    let bot = false; let chat = false;
    try { bot = Boolean((await telegramRequest(profile, 'getMe', {}))?.ok); } catch (error) { console.error(`${profile.name} Telegram bot diagnostic failed:`, error?.message); }
    try { chat = Boolean((await telegramRequest(profile, 'getChat', { chat_id: profile.telegramChatId }))?.ok); } catch (error) { console.error(`${profile.name} Telegram chat diagnostic failed:`, error?.message); }
    checks.telegram[profile.uid] = { configured: true, bot, chat };
  }));

  return res.status(checks.firebase ? 200 : 503).json({ ...basic, ok: checks.firebase, checks });
}
