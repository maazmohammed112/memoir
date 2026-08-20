import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminFacade;
export const OWNER_UID = process.env.VAULT_OWNER_UID || 'uQE6xqhWhQWhOlGmfT2br5HnCEq2';

export function getAdmin() {
  if (adminFacade) return adminFacade;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
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

export async function verifyOwnerToken(token) {
  const identity = await getAdmin().auth().verifyIdToken(token);
  const authenticatedAt = Number(identity.auth_time || 0) * 1000;
  if (identity.uid !== OWNER_UID || String(identity.email || '').toLowerCase() !== 'maaz@memo.com' || identity.firebase?.sign_in_provider !== 'password' || !authenticatedAt || Date.now() - authenticatedAt >= 48 * 60 * 60 * 1000) {
    const error = new Error('This Firebase user is not approved for the vault.'); error.status = 403; throw error;
  }
  return identity;
}
