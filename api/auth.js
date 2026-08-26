import crypto from 'node:crypto';
import { loadAuthState, saveAuthState } from '../lib/authState.js';
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
const SERVER_OPERATION_TIMEOUT_MS = 10000;

async function withDeadline(promise, message, timeoutMs = SERVER_OPERATION_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(message);
          error.status = 503;
          error.code = 'auth/service-timeout';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function secret() {
  const value = process.env.OTP_SECRET || process.env.VAULT_SERVER_KEY;
  if (!value || value.length < 24) {
    const error = new Error('OTP server secret is not configured.');
    error.status = 503;
    error.code = 'auth/server-secret-missing';
    throw error;
  }
  return value;
}

function hash(value) { return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex'); }
function challengeHash(uid, authTime, code) { return hash(`challenge:${uid}:${authTime}:${code}`); }
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
  const code = String(input || '').replace(/\D/g, '');
  const profile = /^\d{4}$/.test(code) ? getUserByCode(code) : null;
  if (profile) {
    return { profile: { uid: profile.uid, email: profile.email, name: profile.name, initials: profile.initials } };
  }
  const error = new Error('That private account number is not recognized.');
  error.status = 400;
  error.code = 'auth/invalid-account-code';
  error.remainingAttempts = 3;
  throw error;
}

async function reserveOtpRequest(database, identity) {
  const now = Date.now();
  const state = await withDeadline(loadAuthState(database, identity.uid), 'Reading OTP request limits timed out. Please try again.', 8000);
  const data = state.rate || {};
  let outcome;
  const verifyLockedUntil = Number(data.verifyLockedUntil || 0);
  if (verifyLockedUntil > now) outcome = { error: 'OTP verification is locked for 12 hours after three incorrect codes.', status: 423, code: 'auth/otp-verify-locked', blockedUntil: verifyLockedUntil, remainingAttempts: 0 };
  const existingRequestBlock = Number(data.requestBlockedUntil || 0);
  if (!outcome && existingRequestBlock > now) outcome = { error: 'The maximum of 5 OTP requests was reached. Try again in 4 hours.', status: 429, code: 'auth/otp-request-locked', blockedUntil: existingRequestBlock, remainingRequests: 0 };
  let windowStartedAt = Number(data.requestWindowStartedAt || 0); let requestCount = Number(data.requestCount || 0);
  if (!windowStartedAt || now - windowStartedAt >= OTP_REQUEST_BLOCK_MS) { windowStartedAt = now; requestCount = 0; }
  if (!outcome && requestCount >= OTP_REQUEST_LIMIT) {
    const blockedUntil = now + OTP_REQUEST_BLOCK_MS;
    state.rate = { ...data, requestBlockedUntil: blockedUntil, updatedAt: now };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Saving OTP request lock timed out.', 6000);
    outcome = { error: 'The maximum of 5 OTP requests was reached. Try again in 4 hours.', status: 429, code: 'auth/otp-request-locked', blockedUntil, remainingRequests: 0 };
  }
  const lastRequestAt = Number(data.lastRequestAt || 0);
  if (!outcome && lastRequestAt && now - lastRequestAt < 10000) {
    const nextRequestAt = lastRequestAt + OTP_RESEND_MS;
    outcome = {
      reused: true,
      reservedAt: lastRequestAt,
      remainingRequests: Math.max(0, OTP_REQUEST_LIMIT - Number(data.requestCount || 0)),
      nextRequestAt,
      state,
    };
  }
  if (!outcome && lastRequestAt && now - lastRequestAt < OTP_RESEND_MS) {
    const blockedUntil = lastRequestAt + OTP_RESEND_MS;
    outcome = {
      error: 'Please wait for the resend timer before requesting another Telegram code.',
      status: 429,
      code: 'auth/otp-cooldown',
      blockedUntil,
      remainingRequests: Math.max(0, OTP_REQUEST_LIMIT - Number(data.requestCount || 0)),
    };
  }
  if (!outcome) {
    const nextCount = requestCount + 1; const requestBlockedUntil = nextCount >= OTP_REQUEST_LIMIT ? now + OTP_REQUEST_BLOCK_MS : 0;
    state.rate = { ...data, requestWindowStartedAt: windowStartedAt, requestCount: nextCount, lastRequestAt: now, requestBlockedUntil, updatedAt: now };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Saving OTP request reservation timed out. Please try again.', 8000);
    outcome = {
      reservedAt: now,
      remainingRequests: Math.max(0, OTP_REQUEST_LIMIT - nextCount),
      nextRequestAt: requestBlockedUntil || now + OTP_RESEND_MS,
      previous: { requestWindowStartedAt: Number(data.requestWindowStartedAt || 0), requestCount: Number(data.requestCount || 0), lastRequestAt: Number(data.lastRequestAt || 0), requestBlockedUntil: existingRequestBlock },
      state,
    };
  }
  if (outcome.error) throw rateError(outcome.error, outcome);
  return outcome;
}

async function releaseOtpReservation(database, identity, reservation) {
  await (async () => {
    const state = await withDeadline(loadAuthState(database, identity.uid), 'Reading the OTP reservation timed out.', 4000);
    const data = state.rate || {};
    if (Number(data.lastRequestAt || 0) !== reservation.reservedAt) return;
    state.rate = { ...data, ...reservation.previous, updatedAt: Date.now() };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Releasing the OTP reservation timed out.', 4000);
  })().catch(() => {});
}

async function requestOtp(identity) {
  const profile = getUserByUid(identity.uid);
  if (!profile?.telegramToken || !profile.telegramChatId) { const error = new Error('Telegram OTP is not configured for this account'); error.status = 503; throw error; }
  const admin = await withDeadline(getAdmin(), 'Firebase Admin initialization timed out.');
  const database = admin.database();
  const reservation = await reserveOtpRequest(database, identity);
  const sessionId = String(identity.auth_time);
  if (reservation.reused) {
    const data = reservation.state.challenges?.[sessionId] || {};
    const existingExpiresAt = Number(data.expiresAtMs || 0);
    if (data.status === 'sent' && Number(data.deliveredAtMs || 0) > 0 && existingExpiresAt > Date.now()) {
      return { sent: true, reused: true, expiresAt: existingExpiresAt, nextRequestAt: reservation.nextRequestAt, remainingRequests: reservation.remainingRequests };
    }
    const pending = new Error('Your Telegram code request is still being processed. Please wait a few seconds and try again.');
    pending.status = 409;
    pending.code = 'auth/otp-in-progress';
    pending.blockedUntil = reservation.nextRequestAt;
    throw pending;
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const now = Date.now(); const expiresAt = now + OTP_LIFETIME_MS;
  const challengePayload = {
    hash: challengeHash(identity.uid, identity.auth_time, code),
    authTime: Number(identity.auth_time),
    createdAtMs: now,
    expiresAtMs: expiresAt,
    attempts: 0,
    status: 'prepared',
    preparedAtMs: now,
  };
  const state = reservation.state;
  state.challenges = { ...(state.challenges || {}), [sessionId]: challengePayload };
  state.latestSessionId = sessionId;

  try {
    await withDeadline(saveAuthState(database, identity.uid, state), 'Saving the OTP challenge timed out. Please try again.');
  } catch (error) {
    await releaseOtpReservation(database, identity, reservation);
    throw error;
  }

  try {
    await telegramRequest(profile, 'sendMessage', {
      chat_id: profile.telegramChatId,
      text: `Memoir Sign-in Code\n\n${code}\n\nThis verification code is for ${profile.name}'s vault and expires in 5 minutes. Do not share this code with anyone.`,
    });
    const deliveredAt = Date.now();
    state.challenges[sessionId] = { ...state.challenges[sessionId], status: 'sent', sentAtMs: deliveredAt, deliveredAtMs: deliveredAt };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Recording OTP delivery confirmation timed out.', 5000).catch(error => {
      console.warn('OTP was delivered but delivery confirmation could not be recorded:', error?.message || error);
    });
  } catch (error) {
    console.error('Telegram OTP dispatch failed:', error?.message || error);
    state.challenges[sessionId] = { ...state.challenges[sessionId], status: 'delivery-failed', failedAtMs: Date.now() };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Recording OTP delivery failure timed out.', 4000).catch(() => {});
    await releaseOtpReservation(database, identity, reservation);
    const deliveryError = new Error('Could not deliver code to Telegram. Please check your Telegram connection or tap Start in your Memoir bot.');
    deliveryError.status = 424; deliveryError.code = 'auth/telegram-delivery-failed'; deliveryError.cause = error; throw deliveryError;
  }
  return { sent: true, expiresAt, nextRequestAt: reservation.nextRequestAt, remainingRequests: reservation.remainingRequests };
}

async function verifyOtp(identity, input, { deviceId, deviceName, replaceDevices = false } = {}) {
  const code = String(input || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(code)) { const error = new Error('Enter the complete 6-digit code.'); error.status = 400; error.code = 'auth/otp-invalid-format'; throw error; }
  const admin = await withDeadline(getAdmin(), 'Firebase Admin initialization timed out.'); const sessionId = String(identity.auth_time); const now = Date.now();
  const database = admin.database(); const currentDeviceHash = deviceHash(deviceId);
  const expiresAt = Math.min(Number(identity.auth_time) * 1000 + SESSION_LENGTH_MS, now + SESSION_LENGTH_MS);
  const state = await withDeadline(loadAuthState(database, identity.uid), 'OTP verification data lookup timed out. Please try again.', 10000);
  const data = state.challenges?.[sessionId] || {};
  const rate = state.rate || {};
  const verifyLockedUntil = Number(rate.verifyLockedUntil || 0);
  if (verifyLockedUntil > now) throw rateError('OTP entry is locked for 12 hours after three incorrect attempts.', { status: 423, code: 'auth/otp-verify-locked', blockedUntil: verifyLockedUntil, remainingAttempts: 0 });

  const challengeExpires = Number(data.expiresAtMs || 0);
  if (!data.status || data.status === 'used' || challengeExpires <= now) {
    throw rateError('This code expired (5-minute limit). Request a new one when the resend timer finishes.', { status: 400, code: 'auth/otp-expired' });
  }

  const isMatch = data.hash && safeEqual(data.hash, challengeHash(identity.uid, identity.auth_time, code));

  if (!isMatch) {
    const previousFailures = verifyLockedUntil && verifyLockedUntil <= now ? 0 : Number(rate.verifyFailureCount || 0);
    const failures = previousFailures + 1;
    const lockedUntil = failures >= OTP_VERIFY_LIMIT ? now + OTP_VERIFY_LOCK_MS : 0;
    state.rate = { ...rate, verifyFailureCount: failures, verifyLockedUntil: lockedUntil, lastVerifyFailureAt: now, updatedAt: now };
    state.challenges[sessionId] = { ...data, attempts: Number(data.attempts || 0) + 1 };
    await withDeadline(saveAuthState(database, identity.uid, state), 'Saving OTP verification result timed out.', 8000);
    throw rateError(
      lockedUntil ? 'Three incorrect OTPs were entered. OTP verification is locked for 12 hours.' : 'That Telegram code is incorrect.',
      { status: lockedUntil ? 423 : 400, code: lockedUntil ? 'auth/otp-verify-locked' : 'auth/otp-incorrect', blockedUntil: lockedUntil, remainingAttempts: Math.max(0, OTP_VERIFY_LIMIT - failures) },
    );
  }
  const activeSessions = Object.entries(state.sessions || {}).filter(([, session]) => Number(session?.expiresAtMs || 0) > now && session?.deviceHash);
  const sameDevice = activeSessions.filter(([, session]) => session.deviceHash === currentDeviceHash);
  const otherDevices = activeSessions.filter(([, session]) => session.deviceHash !== currentDeviceHash);
  if (otherDevices.length >= 2 && !replaceDevices) {
    throw rateError('You have reached the maximum of two active devices.', {
      status: 409, code: 'auth/device-limit',
      activeDevices: otherDevices.slice(0, 2).map(([, session]) => ({ name: String(session?.deviceName || 'Memoir device').slice(0, 80), verifiedAt: Number(session?.verifiedAtMs || 0) })),
    });
  }
  for (const [id, session] of Object.entries(state.sessions || {})) {
    const remove = id !== sessionId && (Number(session?.expiresAtMs || 0) <= now || !session?.deviceHash || sameDevice.some(([currentId]) => currentId === id) || (replaceDevices && otherDevices.some(([currentId]) => currentId === id)));
    if (remove) delete state.sessions[id];
  }
  state.rate = { ...rate, verifyFailureCount: 0, verifyLockedUntil: 0, verifiedAt: now, updatedAt: now };
  const verifiedSession = { authTime: Number(identity.auth_time), deviceHash: currentDeviceHash, deviceName, verifiedAtMs: now, expiresAtMs: expiresAt };
  state.sessions[sessionId] = verifiedSession;
  state.challenges[sessionId] = { ...data, status: 'used', usedAtMs: now, hash: null };
  await withDeadline(saveAuthState(database, identity.uid, state), 'Completing OTP verification timed out. Please try again.', 10000);
  const mirrorRef = admin.firestore().collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(sessionId);
  await withDeadline(mirrorRef.set({ ...verifiedSession, verifiedAt: new Date(now), expiresAt: new Date(expiresAt) }), 'Firestore session mirror timed out.', 2500).catch(error => {
    console.warn('OTP session is active in Realtime Database; Firestore mirror is deferred:', error?.code || error?.message || error);
  });
  return { verified: true, expiresAt };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const traceId = crypto.randomBytes(4).toString('hex');
  const startedAt = Date.now();
  res.setHeader('X-Memoir-Auth-Trace', traceId);
  try {
    const action = String(req.body?.action || 'status');
    if (action === 'select-account') return res.status(200).json(await selectAccount(req, req.body?.code));
    const deviceId = deviceIdFrom(req); const deviceName = deviceNameFrom(req);
    if (!deviceId) return res.status(400).json({ error: 'This browser could not create a secure device identity.', code: 'auth/device-required' });
    if (action === 'status') {
      try {
        const identity = await verifyApprovedToken(req);
        const session = await withDeadline(verifiedSessionFor(identity, deviceId), 'Secure session verification timed out.').catch(() => null);
        const expiresAt = Number(session?.expiresAt || session?.expiresAtMs || 0);
        if (session && expiresAt > Date.now()) {
          const mirrorRef = (await getAdmin()).firestore().collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(String(identity.auth_time));
          await withDeadline(mirrorRef.set({ ...session, authTime: Number(identity.auth_time), expiresAt: new Date(expiresAt) }, { merge: true }), 'Firestore session mirror timed out.', 2000).catch(() => {});
        }
        return res.status(200).json({ verified: Boolean(session), expiresAt });
      } catch {
        return res.status(200).json({ verified: false, expiresAt: 0 });
      }
    }
    const identity = await verifyApprovedToken(req);
    if (action === 'request') {
      const result = await requestOtp(identity);
      console.info(`[auth:${traceId}] OTP delivered in ${Date.now() - startedAt}ms`);
      return res.status(200).json(result);
    }
    if (action === 'verify') return res.status(200).json(await verifyOtp(identity, req.body?.code, { deviceId, deviceName, replaceDevices: Boolean(req.body?.replaceDevices) }));
    if (action === 'revoke') {
      try {
        const admin = await getAdmin();
        const sessionId = String(identity.auth_time);
        const state = await loadAuthState(admin.database(), identity.uid);
        delete state.sessions[sessionId];
        await saveAuthState(admin.database(), identity.uid, state);
        await withDeadline(admin.firestore().collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(sessionId).delete(), 'Firestore session removal timed out.', 1500).catch(() => {});
      } catch { /* proceed */ }
      return res.status(200).json({ revoked: true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error(`[auth:${traceId}] failed after ${Date.now() - startedAt}ms:`, error?.code || error?.message || error);
    const quotaExhausted = Number(error?.code) === 8 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(error?.message || '');
    const isAuthError = error.code?.startsWith?.('auth/') || /token|unauthorized|approved|expired/i.test(error.message || '');
    const status = error.status || (quotaExhausted ? 503 : isAuthError ? 401 : 500);
    return res.status(status).json({
      error: quotaExhausted ? 'The secure Firebase service is temporarily busy. Please wait a few minutes and try again.' : error.message || 'Secure request failed',
      code: quotaExhausted ? 'auth/service-busy' : error.code || (isAuthError ? 'auth/invalid-token' : 'auth/unknown'),
      retryAfter: error.retryAfter,
      blockedUntil: error.blockedUntil,
      remainingAttempts: error.remainingAttempts,
      remainingRequests: error.remainingRequests,
      activeDevices: error.activeDevices,
    });
  }
}
