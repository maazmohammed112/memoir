import { ACCOUNT_PROFILES, accountProfileByCode, accountProfileByEmail, accountProfileByUid } from './accountProfiles.js';

export const SESSION_LENGTH_MS = 12 * 60 * 60 * 1000;

const telegramDefinitions = {
  '2002': {
    telegramTokenEnv: 'MAAZ_TELEGRAM_BOT_TOKEN',
    telegramChatEnv: 'MAAZ_TELEGRAM_CHAT_ID',
    telegramWebhookEnv: 'MAAZ_TELEGRAM_WEBHOOK_SECRET',
    legacyTelegram: true,
  },
  '2005': {
    telegramTokenEnv: 'DEEPTI_TELEGRAM_BOT_TOKEN',
    telegramChatEnv: 'DEEPTI_TELEGRAM_CHAT_ID',
    telegramWebhookEnv: 'DEEPTI_TELEGRAM_WEBHOOK_SECRET',
  },
};

const definitions = ACCOUNT_PROFILES.map(profile => ({ ...profile, ...telegramDefinitions[profile.code] }));

export const PUBLIC_USERS = definitions.map(({ telegramTokenEnv, telegramChatEnv, telegramWebhookEnv, legacyTelegram, ...profile }) => profile);

export function listUserProfiles() {
  return definitions.map(definition => ({
    ...definition,
    telegramToken: process.env[definition.telegramTokenEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_BOT_TOKEN : '') || '',
    telegramChatId: String(process.env[definition.telegramChatEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_CHAT_ID : '') || ''),
    telegramWebhookSecret: process.env[definition.telegramWebhookEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_WEBHOOK_SECRET : '') || '',
  }));
}

export function getUserByUid(uid) { const approved = accountProfileByUid(uid); return approved ? listUserProfiles().find(profile => profile.uid === approved.uid) || null : null; }
export function getUserByEmail(email) { const approved = accountProfileByEmail(email); return approved ? listUserProfiles().find(profile => profile.uid === approved.uid) || null : null; }
export function getUserByCode(code) { const approved = accountProfileByCode(code); return approved ? listUserProfiles().find(profile => profile.uid === approved.uid) || null : null; }
export function getUserByChatId(chatId) { return listUserProfiles().find(profile => profile.telegramChatId && profile.telegramChatId === String(chatId || '')) || null; }

export function isApprovedIdentity(identity) {
  const profile = getUserByUid(identity?.uid);
  return Boolean(profile
    && profile.email === String(identity?.email || '').toLowerCase()
    && identity?.firebase?.sign_in_provider === 'password');
}
