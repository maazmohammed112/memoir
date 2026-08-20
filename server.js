import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import assistant from './api/assistant.js';
import auth from './api/auth.js';
import telegram, { startTelegramPolling } from './api/telegram.js';
import sync from './api/sync.js';
import reminders, { runReminderSweep } from './api/reminders.js';

dotenv.config({ path: '.env.local', override: true });
const server = express();
server.disable('x-powered-by');
server.use(express.json({ limit: '256kb' }));
server.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
server.post('/api/assistant', assistant);
server.post('/api/auth', auth);
server.post('/api/telegram', telegram);
server.post('/api/sync', sync);
server.post('/api/reminders', reminders);
server.get('/api/reminders', reminders);
server.get('/api/health', (_req, res) => res.json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY), mistral: Boolean(process.env.MISTRAL_API_KEY), telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN || process.env.MAAZ_TELEGRAM_BOT_TOKEN || process.env.DEEPTI_TELEGRAM_BOT_TOKEN), telegramPolling: Boolean((process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) || (process.env.MAAZ_TELEGRAM_BOT_TOKEN && process.env.MAAZ_TELEGRAM_CHAT_ID) || (process.env.DEEPTI_TELEGRAM_BOT_TOKEN && process.env.DEEPTI_TELEGRAM_CHAT_ID)), secureMirror: Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY) }));
server.listen(Number(process.env.PORT || 8787), () => {
  console.log(`Memoir API ready on http://localhost:${process.env.PORT || 8787}`);
  startTelegramPolling().catch(error => console.warn('Telegram polling could not start:', error?.message));
  setInterval(() => runReminderSweep().catch(error => console.warn('Reminder check paused:', error?.message)), 30000);
});
