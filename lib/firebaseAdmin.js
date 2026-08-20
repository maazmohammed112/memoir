import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { isApprovedIdentity, SESSION_LENGTH_MS } from './users.js';

let adminFacade;

export function getAdmin() {
  if (adminFacade) return adminFacade;
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
  adminFacade = { app, auth: () => getAuth(app), firestore: () => getFirestore(app) };
  return adminFacade;
}

export async function verifyApprovedToken(token) {
  const identity = await getAdmin().auth().verifyIdToken(token, true);
  const authenticatedAt = Number(identity.auth_time || 0) * 1000;
  if (!isApprovedIdentity(identity) || !authenticatedAt || Date.now() - authenticatedAt >= SESSION_LENGTH_MS) {
    const error = new Error('This Firebase user is not approved for Memoir.'); error.status = 403; throw error;
  }
  return identity;
}

export async function verifiedSessionFor(identity) {
  const snapshot = await getAdmin().firestore().collection('verifiedSessions').doc(identity.uid).collection('sessions').doc(String(identity.auth_time)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const expiresAt = typeof data.expiresAt?.toMillis === 'function' ? data.expiresAt.toMillis() : Number(data.expiresAt || 0);
  return Number(data.authTime || 0) === Number(identity.auth_time || 0) && expiresAt > Date.now() ? { ...data, expiresAt } : null;
}

export async function verifyOwnerToken(token) {
  const identity = await verifyApprovedToken(token);
  const session = await verifiedSessionFor(identity);
  if (!session) {
    const error = new Error('A verified Telegram OTP session is required.'); error.status = 401; error.code = 'auth/otp-required'; throw error;
  }
  return identity;
}
