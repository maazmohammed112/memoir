import crypto from 'node:crypto';
import { getAdmin, verifyApprovedToken, verifiedSessionFor } from '../lib/firebaseAdmin.js';
import { getUserByUid, SESSION_LENGTH_MS } from '../lib/users.js';
import { telegramRequest } from '../lib/telegramClient.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function secret() {
  const value = process.env.OTP_SECRET || process.env.VAULT_SERVER_KEY;
  if (!value || value.length < 24) { const error = new Error('OTP server secret is not configured'); error.status = 503; throw error; }
  return value;
}

function hash(value) { return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex'); }
function challengeHash(uid, authTime, code) { return hash(`challenge:${uid}:${authTime}:${code}`); }
function codeHash(uid, code) { return hash(`code:${uid}:${code}`); }
function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'hex'); const b = Buffer.from(String(right || ''), 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

async function requestOtp(identity) {
  const profile = getUserByUid(identity.uid);
  if (!profile?.telegramToken || !profile.telegramChatId) { const error = new Error('Telegram OTP is not configured for this account'); error.status = 503; throw error; }
  const firestore = (await getAdmin()).firestore();
  const ref = firestore.collection('otpChallenges').doc(identity.uid).collection('sessions').doc(String(identity.auth_time));
  const previous = await ref.get(); const previousData = previous.data() || {};
  const lastSentAt = typeof previousData.sentAt?.toMillis === 'function' ? previousData.sentAt.toMillis() : Number(previousData.sentAt || 0);
  if (lastSentAt && Date.now() - lastSentAt < OTP_RESEND_MS) {
    const error = new Error('Please wait before requesting another code'); error.status = 429; error.retryAfter = Math.ceil((OTP_RESEND_MS - (Date.now() - lastSentAt)) / 1000); throw error;
  }
  let code; let stableHash;
  do { code = String(crypto.randomInt(100000, 1000000)); stableHash = codeHash(identity.uid, code); }
  while (stableHash === previousData.lastCodeHash);
  const now = Date.now(); const expiresAt = now + OTP_LIFETIME_MS;
  await ref.set({
    hash: challengeHash(identity.uid, identity.auth_time, code), lastCodeHash: stableHash,
    authTime: Number(identity.auth_time), createdAt: new Date(now), expiresAt: new Date(expiresAt),
    attempts: 0, status: 'pending', sentAt: null,
  });
  try {
    await telegramRequest(profile, 'sendMessage', {
      chat_id: profile.telegramChatId,
      text: `🔐 Memoir sign-in code\n\n${code}\n\nThis code is for ${profile.name}'s vault and expires in 5 minutes. Never share it with anyone.`,
    });
    await ref.set({ sentAt: new Date(), status: 'sent' }, { merge: true });
  } catch (error) {
    await ref.set({ status: 'delivery-failed', failedAt: new Date() }, { merge: true });
    const deliveryError = new Error('Open your assigned Telegram bot, tap Start, then request a new sign-in code.');
    deliveryError.status = 424; deliveryError.cause = error; throw deliveryError;
  }
  return { sent: true, expiresAt, retryAfter: OTP_RESEND_MS / 1000 };
}

async function verifyOtp(identity, input) {
  const code = String(input || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(code)) { const error = new Error('Enter the 6-digit code'); error.status = 400; throw error; }
  const firestore = (await getAdmin()).firestore(); const sessionId = String(identity.auth_time);
  const challengeRef = firestore.collection('otpChallenges').doc(identity.uid).collection('sessions').doc(sessionId);
  const sessionRef = firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(sessionId);
  const expiresAt = Math.min(Number(identity.auth_time) * 1000 + SESSION_LENGTH_MS, Date.now() + SESSION_LENGTH_MS);
  const outcome = await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(challengeRef); const data = snapshot.data() || {};
    const challengeExpires = typeof data.expiresAt?.toMillis === 'function' ? data.expiresAt.toMillis() : 0;
    if (!snapshot.exists || data.status !== 'sent' || Number(data.authTime) !== Number(identity.auth_time) || challengeExpires <= Date.now()) return { error: 'This code expired. Request a new one.', status: 400 };
    if (Number(data.attempts || 0) >= MAX_ATTEMPTS) return { error: 'Too many attempts. Request a new code.', status: 429 };
    if (!safeEqual(data.hash, challengeHash(identity.uid, identity.auth_time, code))) {
      transaction.update(challengeRef, { attempts: Number(data.attempts || 0) + 1 });
      return { error: 'The code is incorrect', status: 400 };
    }
    transaction.set(sessionRef, { authTime: Number(identity.auth_time), verifiedAt: new Date(), expiresAt: new Date(expiresAt) });
    transaction.update(challengeRef, { status: 'used', usedAt: new Date(), hash: null });
    return { verified: true };
  });
  if (outcome?.error) { const error = new Error(outcome.error); error.status = outcome.status; throw error; }
  return { verified: true, expiresAt };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing identity token' });
    const identity = await verifyApprovedToken(token); const action = String(req.body?.action || 'status');
    if (action === 'request') return res.status(200).json(await requestOtp(identity));
    if (action === 'verify') return res.status(200).json(await verifyOtp(identity, req.body?.code));
    if (action === 'status') {
      const session = await verifiedSessionFor(identity);
      return res.status(200).json({ verified: Boolean(session), expiresAt: session?.expiresAt || 0 });
    }
    if (action === 'revoke') {
      const sessionId = String(identity.auth_time); const firestore = (await getAdmin()).firestore();
      await Promise.all([
        firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(sessionId).delete().catch(() => {}),
        firestore.collection('otpChallenges').doc(identity.uid).collection('sessions').doc(sessionId).delete().catch(() => {}),
      ]);
      return res.status(200).json({ revoked: true });
    }
    return res.status(400).json({ error: 'Unknown authentication action' });
  } catch (error) {
    const status = Number(error?.status || 503);
    return res.status(status).json({ error: status >= 500 ? 'Secure sign-in is temporarily unavailable' : error.message, retryAfter: error?.retryAfter });
  }
}
