import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isApprovedIdentity, SESSION_LENGTH_MS } from './users.js';

let adminFacadePromise;

export async function getAdmin() {
  if (adminFacadePromise) return adminFacadePromise;
  adminFacadePromise = (async () => {
    const [{ cert, getApps, initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/auth'),
      import('firebase-admin/firestore'),
    ]);
    const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (file ? readFileSync(file, 'utf8') : '');
    let options = { projectId: process.env.FIREBASE_PROJECT_ID || 'personalvault-20c1f' };
    if (raw) {
      let serviceAccount;
      try { serviceAccount = JSON.parse(raw); }
      catch { serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
      options = { credential: cert(serviceAccount), projectId: serviceAccount.project_id || options.projectId };
    }
    const app = getApps().find(item => item.name === 'memoir-admin') || initializeApp(options, 'memoir-admin');
    return { app, auth: () => getAuth(app), firestore: () => getFirestore(app) };
  })().catch(error => {
    adminFacadePromise = undefined;
    throw error;
  });
  return adminFacadePromise;
}

export async function verifyApprovedToken(reqOrToken) {
  const token = typeof reqOrToken === 'string'
    ? reqOrToken
    : String(reqOrToken?.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    const error = new Error('Authentication token is required.');
    error.status = 401;
    error.code = 'auth/token-required';
    throw error;
  }
  const identity = await (await getAdmin()).auth().verifyIdToken(token, true);
  const authenticatedAt = Number(identity.auth_time || 0) * 1000;
  if (!isApprovedIdentity(identity) || !authenticatedAt || Date.now() - authenticatedAt >= SESSION_LENGTH_MS) {
    const error = new Error('This Firebase user is not approved for Memoir.');
    error.status = 403;
    throw error;
  }
  return identity;
}

export function deviceIdFrom(req) { return String(req?.headers?.['x-memoir-device'] || '').trim().slice(0, 120); }
export function deviceNameFrom(req) { return String(req?.headers?.['x-memoir-device-name'] || 'Memoir device').trim().slice(0, 80); }
export function deviceHash(deviceId) { return deviceId ? crypto.createHash('sha256').update(String(deviceId)).digest('hex') : ''; }

export async function verifiedSessionFor(identity, deviceId) {
  const currentDeviceHash = deviceHash(deviceId);
  const firestore = (await getAdmin()).firestore();
  const sessionId = String(identity.auth_time);
  const now = Date.now();

  const parseExpires = (data) => {
    if (!data) return 0;
    if (data.expiresAtMs) return Number(data.expiresAtMs);
    if (typeof data.expiresAt?.toMillis === 'function') return data.expiresAt.toMillis();
    if (data.expiresAt?.seconds) return data.expiresAt.seconds * 1000;
    if (data.expiresAt instanceof Date) return data.expiresAt.getTime();
    if (typeof data.expiresAt === 'string') return new Date(data.expiresAt).getTime() || 0;
    return Number(data.expiresAt || 0);
  };

  const docRef = firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(sessionId);
  const snapshot = await docRef.get().catch(() => null);
  if (snapshot && snapshot.exists) {
    const data = snapshot.data() || {};
    const expiresAt = parseExpires(data);
    if ((!currentDeviceHash || data.deviceHash === currentDeviceHash) && (expiresAt > now || !expiresAt)) {
      return { ...data, expiresAt: expiresAt || now + 12 * 3600 * 1000, expiresAtMs: expiresAt || now + 12 * 3600 * 1000 };
    }
  }

  const allSessions = await firestore.collection('verifiedSessions').doc(identity.uid).collection('sessions').get().catch(() => ({ docs: [] }));
  for (const doc of allSessions.docs) {
    const data = doc.data() || {};
    const expiresAt = parseExpires(data);
    if ((!currentDeviceHash || data.deviceHash === currentDeviceHash) && (expiresAt > now || !expiresAt)) {
      return { ...data, expiresAt: expiresAt || now + 12 * 3600 * 1000, expiresAtMs: expiresAt || now + 12 * 3600 * 1000 };
    }
  }
  return null;
}

export async function verifyOwnerToken(token, deviceId) {
  const identity = await verifyApprovedToken(token);
  const session = await verifiedSessionFor(identity, deviceId);
  if (!session) {
    const error = new Error('A verified Telegram OTP session is required.'); error.status = 401; error.code = 'auth/otp-required'; throw error;
  }
  return identity;
}
