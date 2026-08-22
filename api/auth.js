import crypto from 'node:crypto';
import { deviceHash, deviceIdFrom, deviceNameFrom, getAdmin, verifyApprovedToken, verifiedSessionFor } from '../lib/firebaseAdmin.js';
import { getUserByCode, getUserByUid, SESSION_LENGTH_MS } from '../lib/users.js';
import { telegramRequest } from '../lib/telegramClient.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes validity
const OTP_RESEND_MS = 90 * 1000; // 1:30 min (90s) cooldown
const OTP_REQUEST_LIMIT = 5; // 5 requests maximum
const OTP_REQUEST_BLOCK_MS = 4 * 60 * 60 * 1000; // 4 hours lock after 5 requests
const OTP_VERIFY_LIMIT = 3; // 3 wrong attempts maximum
const OTP_VERIFY_LOCK_MS = 12 * 60 * 60 * 1000; // 12 hours lock after 3 wrong OTPs
const ACCOUNT_CODE_LIMIT = 3;
const ACCOUNT_CODE_LOCK_MS = 4 * 60 * 60 * 1000;

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
function rateError(message, { status = 429, code = 'auth/otp-rate-limit', blockedUntil = 0, retryAfter = 0, remainingAttempts, remainingRequests, activeDevices } = {}) {
  const error = new Error(message); error.status = status; error.code = code; error.blockedUntil = Number(blockedUntil || 0);
  error.retryAfter = Number(retryAfter || (error.blockedUntil ? Math.ceil((error.blockedUntil - Date.now()) / 1000) : 0));
  if (remainingAttempts !== undefined) error.remainingAttempts = remainingAttempts;
  if (remainingRequests !== undefined) error.remainingRequests = remainingRequests;
  if (activeDevices !== undefined) error.activeDevices = activeDevices;
  return error;
}
function accountFingerprint(req) {
  const forwarded = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return hash(`account-code:${forwarded}:${String(req.headers['user-agent'] || '').slice(0, 300)}`);
}

async function selectAccount(req, input) {
  const firestore = (await getAdmin()).firestore(); const now = Date.now();
  const ref = firestore.collection('accountCodeRateLimits').doc(accountFingerprint(req));
  const code = String(input || '').replace(/\D/g, ''); const profile = /^\d{4}$/.test(code) ? getUserByCode(code) : null;
  const outcome = await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref); const data = snapshot.data() || {};
    const lockedUntil = Number(data.lockedUntil || 0);
    if (lockedUntil > now) return { error: 'Account selection is temporarily locked after three incorrect attempts.', status: 423, code: 'auth/account-code-locked', blockedUntil: lockedUntil, remainingAttempts: 0 };
    if (profile) {
      if (snapshot.exists) transaction.delete(ref);
      return { profile: { uid: profile.uid, email: profile.email, name: profile.name, initials: profile.initials } };
    }
    const failures = lockedUntil && lockedUntil <= now ? 1 : Number(data.failures || 0) + 1;
    const nextLockedUntil = failures >= ACCOUNT_CODE_LIMIT ? now + ACCOUNT_CODE_LOCK_MS : 0;
    transaction.set(ref, { failures, lockedUntil: nextLockedUntil, lastAttemptAt: now }, { merge: true });
    return {
      error: nextLockedUntil ? 'Three incorrect account numbers were entered. Account selection is locked for 4 hours.' : 'That private account number is not recognized.',
      status: nextLockedUntil ? 423 : 400,
      code: nextLockedUntil ? 'auth/account-code-locked' : 'auth/invalid-account-code',
      blockedUntil: nextLockedUntil,
      remainingAttempts: Math.max(0, ACCOUNT_CODE_LIMIT - failures),
    };
  });
  if (outcome.error) throw rateError(outcome.error, outcome);
  return outcome;
}

async function reserveOtpRequest(firestore, identity) {
  const now = Date.now(); const ref = firestore.collection('authRateLimits').doc(identity.uid);
  const outcome = await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref); const data = snapshot.data() || {};
    const verifyLockedUntil = Number(data.verifyLockedUntil || 0);
    if (verifyLockedUntil > now) return { error: 'OTP verification is locked for 12 hours after three incorrect codes.', status: 423, code: 'auth/otp-verify-locked', blockedUntil: verifyLockedUntil, remainingAttempts: 0 };
    const existingRequestBlock = Number(data.requestBlockedUntil || 0);
    if (existingRequestBlock > now) return { error: 'The maximum of 5 OTP requests was reached. Try again in 4 hours.', status: 429, code: 'auth/otp-request-locked', blockedUntil: existingRequestBlock, remainingRequests: 0 };
    const lastRequestAt = Number(data.lastRequestAt || 0);
    if (lastRequestAt && now - lastRequestAt < OTP_RESEND_MS) {
      const nextRequestAt = lastRequestAt + OTP_RESEND_MS;
      return { error: 'A new OTP can be requested after 1:30 minutes.', status: 429, code: 'auth/otp-cooldown', blockedUntil: nextRequestAt, remainingRequests: Math.max(0, OTP_REQUEST_LIMIT - Number(data.requestCount || 0)) };
    }
    let windowStartedAt = Number(data.requestWindowStartedAt || 0); let requestCount = Number(data.requestCount || 0);
    if (!windowStartedAt || now - windowStartedAt >= OTP_REQUEST_BLOCK_MS) { windowStartedAt = now; requestCount = 0; }
    if (requestCount >= OTP_REQUEST_LIMIT) {
      const blockedUntil = now + OTP_REQUEST_BLOCK_MS;
      transaction.set(ref, { requestBlockedUntil: blockedUntil, updatedAt: now }, { merge: true });
      return { error: 'The maximum of 5 OTP requests was reached. Try again in 4 hours.', status: 429, code: 'auth/otp-request-locked', blockedUntil, remainingRequests: 0 };
    }
    const nextCount = requestCount + 1; const requestBlockedUntil = nextCount >= OTP_REQUEST_LIMIT ? now + OTP_REQUEST_BLOCK_MS : 0;
    transaction.set(ref, { requestWindowStartedAt: windowStartedAt, requestCount: nextCount, lastRequestAt: now, requestBlockedUntil, updatedAt: now }, { merge: true });
    return {
      reservedAt: now,
      remainingRequests: Math.max(0, OTP_REQUEST_LIMIT - nextCount),
      nextRequestAt: requestBlockedUntil || now + OTP_RESEND_MS,
      previous: { requestWindowStartedAt: Number(data.requestWindowStartedAt || 0), requestCount: Number(data.requestCount || 0), lastRequestAt, requestBlockedUntil: existingRequestBlock },
      ref,
    };
  });
  if (outcome.error) throw rateError(outcome.error, outcome);
  return outcome;
}

async function releaseOtpReservation(firestore, reservation) {
  await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(reservation.ref); const data = snapshot.data() || {};
    if (Number(data.lastRequestAt || 0) !== reservation.reservedAt) return;
    transaction.set(reservation.ref, { ...reservation.previous, updatedAt: Date.now() }, { merge: true });
  }).catch(() => {});
}

async function requestOtp(identity) {
  const profile = getUserByUid(identity.uid);
  if (!profile?.telegramToken || !profile.telegramChatId) { const error = new Error('Telegram OTP is not configured for this account'); error.status = 503; throw error; }
  const firestore = (await getAdmin()).firestore(); const reservation = await reserveOtpRequest(firestore, identity);
  const ref = firestore.collection('otpChallenges').doc(identity.uid).collection('sessions').doc(String(identity.auth_time));
  const rootRef = firestore.collection('otpChallenges').doc(identity.uid);
  const previous = await ref.get(); const previousData = previous.data() || {};
  let code; let stableHash;
  do { code = String(crypto.randomInt(100000, 1000000)); stableHash = codeHash(identity.uid, code); }
  while (stableHash === previousData.lastCodeHash);
  const now = Date.now(); const expiresAt = now + OTP_LIFETIME_MS;
  const challengePayload = {
    hash: challengeHash(identity.uid, identity.auth_time, code),
    lastCodeHash: stableHash,
    code,
    authTime: Number(identity.auth_time),
    createdAt: new Date(now),
    createdAtMs: now,
    expiresAt: new Date(expiresAt),
    expiresAtMs: expiresAt,
    attempts: 0,
    status: 'sent',
    sentAt: new Date(now),
  };
  
  const batch = firestore.batch();
  batch.set(ref, challengePayload);
  batch.set(rootRef, { latestSessionId: String(identity.auth_time), ...challengePayload });
  await batch.commit();

  try {
    await telegramRequest(profile, 'sendMessage', {
      chat_id: profile.telegramChatId,
      text: `Memoir Sign-in Code\n\n${code}\n\nThis verification code is for ${profile.name}'s vault and expires in 5 minutes. Do not share this code with anyone.`,
    });
  } catch (error) {
    await ref.set({ status: 'delivery-failed', failedAt: new Date() }, { merge: true });
    await rootRef.set({ status: 'delivery-failed', failedAt: new Date() }, { merge: true });
    await releaseOtpReservation(firestore, reservation);
    const deliveryError = new Error('Open your assigned Telegram bot, tap Start, then request a new sign-in code.');
    deliveryError.status = 424; deliveryError.cause = error; throw deliveryError;
  }
  return { sent: true, expiresAt, nextRequestAt: reservation.nextRequestAt, remainingRequests: reservation.remainingRequests };
}

async function verifyOtp(identity, input, { deviceId, deviceName, replaceDevices = false } = {}) {
  const code = String(input || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(code)) { const error = new Error('Enter the complete 6-digit code.'); error.status = 400; error.code = 'auth/otp-invalid-format'; throw error; }
  const firestore = (await getAdmin()).firestore(); const sessionId = String(identity.auth_time); const now = Date.now();
  const challengeRef = firestore.collection('otpChallenges').doc(identity.uid).collection('sessions').doc(sessionId);
  const rootRef = firestore.collection('otpChallenges').doc(identity.uid);
  const sessionsRef = firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions');
  const sessionRef = sessionsRef.doc(sessionId); const currentDeviceHash = deviceHash(deviceId);
  const rateRef = firestore.collection('authRateLimits').doc(identity.uid);
  const expiresAt = Math.min(Number(identity.auth_time) * 1000 + SESSION_LENGTH_MS, now + SESSION_LENGTH_MS);
  const outcome = await firestore.runTransaction(async transaction => {
    const [challengeSnapshot, rootSnapshot, rateSnapshot, sessionsSnapshot] = await Promise.all([
      transaction.get(challengeRef),
      transaction.get(rootRef),
      transaction.get(rateRef),
      transaction.get(sessionsRef),
    ]);
    let data = challengeSnapshot.data() || rootSnapshot.data() || {};
    const rate = rateSnapshot.data() || {};
    const verifyLockedUntil = Number(rate.verifyLockedUntil || 0);
    if (verifyLockedUntil > now) return { error: 'OTP entry is locked for 12 hours after three incorrect attempts.', status: 423, code: 'auth/otp-verify-locked', blockedUntil: verifyLockedUntil, remainingAttempts: 0 };
    
    const targetDocRef = challengeSnapshot.exists ? challengeRef : rootRef;
    const challengeExpires = Number(data.expiresAtMs || (typeof data.expiresAt?.toMillis === 'function' ? data.expiresAt.toMillis() : 0));
    if (!data.status || data.status === 'used' || challengeExpires <= now) {
      return { error: 'This code expired (5-minute limit). Request a new one when the resend timer finishes.', status: 400, code: 'auth/otp-expired' };
    }

    const isMatch = (data.code && String(data.code) === code) ||
                    (data.hash && safeEqual(data.hash, challengeHash(identity.uid, data.authTime || identity.auth_time, code))) ||
                    (data.hash && safeEqual(data.hash, challengeHash(identity.uid, identity.auth_time, code)));

    if (!isMatch) {
      const previousFailures = verifyLockedUntil && verifyLockedUntil <= now ? 0 : Number(rate.verifyFailureCount || 0);
      const failures = previousFailures + 1;
      const lockedUntil = failures >= OTP_VERIFY_LIMIT ? now + OTP_VERIFY_LOCK_MS : 0;
      transaction.set(rateRef, { verifyFailureCount: failures, verifyLockedUntil: lockedUntil, lastVerifyFailureAt: now, updatedAt: now }, { merge: true });
      transaction.update(targetDocRef, { attempts: Number(data.attempts || 0) + 1 });
      return {
        error: lockedUntil ? 'Three incorrect OTPs were entered. OTP verification is locked for 12 hours.' : 'That Telegram code is incorrect.',
        status: lockedUntil ? 423 : 400,
        code: lockedUntil ? 'auth/otp-verify-locked' : 'auth/otp-incorrect',
        blockedUntil: lockedUntil,
        remainingAttempts: Math.max(0, OTP_VERIFY_LIMIT - failures),
      };
    }
    const activeSessions = sessionsSnapshot.docs.filter(document => {
      const session = document.data() || {}; const sessionExpires = typeof session.expiresAt?.toMillis === 'function' ? session.expiresAt.toMillis() : Number(session.expiresAt || 0);
      return sessionExpires > now && session.deviceHash;
    });
    const sameDevice = activeSessions.filter(document => document.data()?.deviceHash === currentDeviceHash);
    const otherDevices = activeSessions.filter(document => document.data()?.deviceHash !== currentDeviceHash);
    if (otherDevices.length >= 2 && !replaceDevices) {
      return {
        error: 'You have reached the maximum of two active devices.', status: 409, code: 'auth/device-limit',
        activeDevices: otherDevices.slice(0, 2).map(document => ({ name: String(document.data()?.deviceName || 'Memoir device').slice(0, 80), verifiedAt: Number(document.data()?.verifiedAtMs || 0) })),
      };
    }
    sessionsSnapshot.docs.filter(document => {
      const session = document.data() || {}; const sessionExpires = typeof session.expiresAt?.toMillis === 'function' ? session.expiresAt.toMillis() : Number(session.expiresAt || 0);
      return document.id !== sessionId && (sessionExpires <= now || !session.deviceHash || sameDevice.some(current => current.id === document.id) || (replaceDevices && otherDevices.some(current => current.id === document.id)));
    }).forEach(document => transaction.delete(document.ref));
    transaction.set(rateRef, { verifyFailureCount: 0, verifyLockedUntil: 0, verifiedAt: now, updatedAt: now }, { merge: true });
    transaction.set(sessionRef, { authTime: Number(identity.auth_time), deviceHash: currentDeviceHash, deviceName, verifiedAt: new Date(), verifiedAtMs: now, expiresAt: new Date(expiresAt) });
    transaction.update(challengeRef, { status: 'used', usedAt: new Date(), hash: null });
    transaction.set(rootRef, { status: 'used', usedAt: new Date(), hash: null }, { merge: true });
    return { verified: true };
  });
  if (outcome.error) throw rateError(outcome.error, outcome);
  return { verified: true, expiresAt };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const action = String(req.body?.action || 'status');
    if (action === 'select-account') return res.status(200).json(await selectAccount(req, req.body?.code));
    const deviceId = deviceIdFrom(req); const deviceName = deviceNameFrom(req);
    if (!deviceId) return res.status(400).json({ error: 'This browser could not create a secure device identity.', code: 'auth/device-required' });
    const identity = await verifyApprovedToken(req);
    if (action === 'status') {
      const session = await verifiedSessionFor(identity, deviceId);
      return res.status(200).json({ verified: Boolean(session), expiresAt: session?.expiresAtMs || 0 });
    }
    if (action === 'request') return res.status(200).json(await requestOtp(identity));
    if (action === 'verify') return res.status(200).json(await verifyOtp(identity, req.body?.code, { deviceId, deviceName, replaceDevices: Boolean(req.body?.replaceDevices) }));
    if (action === 'revoke') {
      const firestore = (await getAdmin()).firestore();
      const current = await verifiedSessionFor(identity, deviceId);
      if (current?.id) await firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(current.id).delete();
      return res.status(200).json({ revoked: true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Secure request failed',
      code: error.code || 'auth/unknown',
      retryAfter: error.retryAfter,
      blockedUntil: error.blockedUntil,
      remainingAttempts: error.remainingAttempts,
      remainingRequests: error.remainingRequests,
      activeDevices: error.activeDevices,
    });
  }
}