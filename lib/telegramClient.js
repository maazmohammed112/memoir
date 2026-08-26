import { getUserByUid } from './users.js';

export async function telegramRequest(profileOrUid, method, payload) {
  const profile = typeof profileOrUid === 'string' ? getUserByUid(profileOrUid) : profileOrUid;
  if (!profile?.telegramToken || !profile?.telegramChatId) throw new Error(`Telegram is not configured for ${profile?.name || 'this account'}`);
  const timeoutMs = (typeof payload?.timeout === 'number' && payload.timeout > 0) ? (payload.timeout + 10) * 1000 : 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://api.telegram.org/bot${profile.telegramToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Telegram request failed');
    return result;
  } finally {
    clearTimeout(timer);
  }
}
