export const SESSION_LENGTH_MS = 12 * 60 * 60 * 1000;

const definitions = [
  {
    code: '2002',
    uid: 'uQE6xqhWhQWhOlGmfT2br5HnCEq2',
    email: 'maaz@memo.com',
    name: 'Maaz',
    initials: 'MM',
    telegramTokenEnv: 'MAAZ_TELEGRAM_BOT_TOKEN',
    telegramChatEnv: 'MAAZ_TELEGRAM_CHAT_ID',
    telegramWebhookEnv: 'MAAZ_TELEGRAM_WEBHOOK_SECRET',
    legacyTelegram: true,
  },
  {
    code: '2005',
    uid: 'GQ4lxeAWoPTlyJ4W1jxU8bxk6qS2',
    email: 'deepti@memo.com',
    name: 'Deepti',
    initials: 'DM',
    telegramTokenEnv: 'DEEPTI_TELEGRAM_BOT_TOKEN',
    telegramChatEnv: 'DEEPTI_TELEGRAM_CHAT_ID',
    telegramWebhookEnv: 'DEEPTI_TELEGRAM_WEBHOOK_SECRET',
  },
];

export const PUBLIC_USERS = definitions.map(({ telegramTokenEnv, telegramChatEnv, telegramWebhookEnv, legacyTelegram, ...profile }) => profile);

export function listUserProfiles() {
  return definitions.map(definition => ({
    ...definition,
    telegramToken: process.env[definition.telegramTokenEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_BOT_TOKEN : '') || '',
    telegramChatId: String(process.env[definition.telegramChatEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_CHAT_ID : '') || ''),
    telegramWebhookSecret: process.env[definition.telegramWebhookEnv] || (definition.legacyTelegram ? process.env.TELEGRAM_WEBHOOK_SECRET : '') || '',
  }));
}

export function getUserByUid(uid) { return listUserProfiles().find(profile => profile.uid === String(uid || '')) || null; }
export function getUserByEmail(email) { return listUserProfiles().find(profile => profile.email === String(email || '').trim().toLowerCase()) || null; }
export function getUserByCode(code) { return listUserProfiles().find(profile => profile.code === String(code || '').trim()) || null; }
export function getUserByChatId(chatId) { return listUserProfiles().find(profile => profile.telegramChatId && profile.telegramChatId === String(chatId || '')) || null; }

export function isApprovedIdentity(identity) {
  const profile = getUserByUid(identity?.uid);
  return Boolean(profile
    && profile.email === String(identity?.email || '').toLowerCase()
    && identity?.firebase?.sign_in_provider === 'password');
}
