import { serverDecrypt, serverEncrypt } from './serverCrypto.js';

function emptyState() {
  return { version: 1, rate: {}, challenges: {}, sessions: {}, updatedAt: 0 };
}

function safeUid(uid) {
  const value = String(uid || '');
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(value)) throw new Error('Invalid authentication state owner.');
  return value;
}

export async function loadAuthState(database, uid) {
  const snapshot = await database.ref(`serverAuth/${safeUid(uid)}`).get();
  if (!snapshot.exists()) return emptyState();
  try {
    const stored = snapshot.val();
    const state = stored?.payload ? serverDecrypt(stored.payload) : null;
    return {
      ...emptyState(),
      ...(state && typeof state === 'object' ? state : {}),
      rate: state?.rate && typeof state.rate === 'object' ? state.rate : {},
      challenges: state?.challenges && typeof state.challenges === 'object' ? state.challenges : {},
      sessions: state?.sessions && typeof state.sessions === 'object' ? state.sessions : {},
    };
  } catch (error) {
    const invalid = new Error('Secure authentication state could not be read.');
    invalid.code = 'auth/state-invalid';
    invalid.status = 503;
    invalid.cause = error;
    throw invalid;
  }
}

export async function saveAuthState(database, uid, state) {
  const updated = { ...emptyState(), ...state, version: 1, updatedAt: Date.now() };
  await database.ref(`serverAuth/${safeUid(uid)}`).set({ payload: serverEncrypt(updated), updatedAt: updated.updatedAt });
  return updated;
}

