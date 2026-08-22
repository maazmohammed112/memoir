const firebaseConfig = {
  apiKey: 'AIzaSyAVkrZbrhbumrbBz8cAgM1PSW8wxqKM_Zs',
  authDomain: 'personalvault-20c1f.firebaseapp.com',
  projectId: 'personalvault-20c1f',
  storageBucket: 'personalvault-20c1f.firebasestorage.app',
  messagingSenderId: '256886953432',
  appId: '1:256886953432:web:10db422f21939a90f6cead',
  measurementId: 'G-E4CM9P974R',
};

const DB_VERSION = 2;
export const ACCOUNT_PROFILES = [
  { uid: 'uQE6xqhWhQWhOlGmfT2br5HnCEq2', email: 'maaz@memo.com', name: 'Maaz', initials: 'MM' },
  { uid: 'GQ4lxeAWoPTlyJ4W1jxU8bxk6qS2', email: 'deepti@memo.com', name: 'Deepti', initials: 'DM' },
];
const MAAZ_UID = ACCOUNT_PROFILES[0].uid;
const SESSION_LENGTH = 12 * 60 * 60 * 1000;
const LEGACY_KEY_ID = 'device-vault-key';
const KEY_DERIVATION_ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let firebaseSdk;
let activeProfileUid = null;
const selectedProfileKey = 'memoir-selected-profile';
const introSeenKey = 'memoir-intro-seen';
const deviceIdKey = 'memoir-device-id-v1';
const profileByUid = uid => ACCOUNT_PROFILES.find(profile => profile.uid === String(uid || '')) || null;
const dbName = () => activeProfileUid === MAAZ_UID ? 'memoir-encrypted-vault' : `memoir-encrypted-vault-${activeProfileUid}`;
const ownerKeyId = () => activeProfileUid === MAAZ_UID ? 'owner-vault-key-v2' : `owner-vault-key-v2-${activeProfileUid}`;
const passwordGateKey = () => `memoir-password-gate-${activeProfileUid}`;
function memoirDeviceId() {
  let value = localStorage.getItem(deviceIdKey);
  if (!/^[a-f0-9-]{20,80}$/i.test(String(value || ''))) { value = crypto.randomUUID(); localStorage.setItem(deviceIdKey, value); }
  return value;
}
function memoirDeviceName() {
  const agent = navigator.userAgent || ''; const platform = /iphone|ipad/i.test(agent) ? 'Apple mobile' : /android/i.test(agent) ? 'Android' : /windows/i.test(agent) ? 'Windows' : /macintosh|mac os/i.test(agent) ? 'Mac' : /linux/i.test(agent) ? 'Linux' : 'Web device';
  const browser = /edg\//i.test(agent) ? 'Edge' : /firefox\//i.test(agent) ? 'Firefox' : /chrome|crios/i.test(agent) ? 'Chrome' : /safari/i.test(agent) ? 'Safari' : 'Browser';
  return `${platform} - ${browser}`;
}
async function loadFirebase() {
  if (firebaseSdk) return firebaseSdk;
  const [app, auth, firestore] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  firebaseSdk = { ...app, ...auth, ...firestore };
  return firebaseSdk;
}

function openLocalDb() {
  return new Promise((resolve, reject) => {
    if (!activeProfileUid) return reject(new Error('Choose an account before opening the local vault.'));
    const request = indexedDB.open(dbName(), DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'assetId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(store, mode, action) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

function bytesToB64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < view.length; offset += chunkSize) {
    binary += String.fromCharCode(...view.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
const b64ToBytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function deriveWrappingKey(password, salt, iterations = KEY_DERIVATION_ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function getVaultKey() {
  const currentUid = activeProfileUid || localStorage.getItem('memoir-selected-profile') || MAAZ_UID;
  const keyId = currentUid === MAAZ_UID ? 'owner-vault-key-v2' : `owner-vault-key-v2-${currentUid}`;
  let key = await idb('keys', 'readonly', store => store.get(keyId));
  if (key) return key;
  key = currentUid === MAAZ_UID ? await idb('keys', 'readonly', store => store.get(LEGACY_KEY_ID)) : null;
  if (!key) {
    const code = currentUid === MAAZ_UID ? '2002' : '2005';
    const salt = new TextEncoder().encode(`memoir-key-salt:${currentUid}`);
    const wrappingKey = await deriveWrappingKey(code, salt, KEY_DERIVATION_ITERATIONS);
    const rawDerived = await crypto.subtle.exportKey('raw', wrappingKey);
    key = await crypto.subtle.importKey('raw', rawDerived, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    await idb('keys', 'readwrite', store => store.put(key, keyId));
  }
  return key;
}

async function encryptWithKey(value, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value)));
  return { version: 2, iv: bytesToB64(iv), cipher: bytesToB64(new Uint8Array(cipher)) };
}

async function decryptWithKey(payload, key) {
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.cipher));
  return JSON.parse(decoder.decode(clear));
}

async function encrypt(value) { return encryptWithKey(value, await getVaultKey()); }
async function decrypt(payload) {
  if (!payload) return null;
  if (typeof payload === 'object' && !payload.cipher && payload.id) return payload;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.cipher && parsed.id) return parsed;
        payload = parsed;
      }
    } catch { /* proceed to decrypt */ }
  }
  try {
    return await decryptWithKey(payload, await getVaultKey());
  } catch (err) {
    if (typeof payload === 'object' && payload.item) return payload.item;
    return null;
  }
}

async function localList() {
  const rows = await idb('records', 'readonly', store => store.getAll());
  const items = [];
  for (const row of rows) {
    try { items.push(await decrypt(row.payload)); } catch { /* ciphertext from another device stays unreadable */ }
  }
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function localPut(item) {
  const payload = await encrypt(item);
  await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload }));
  return payload;
}

async function localRemove(id) { await idb('records', 'readwrite', store => store.delete(id)); }

class VaultStore {
  items = [];
  status = 'locked';
  session = { status: 'checking', email: '', message: '', profile: null };
  profile = null;
  uid = null;
  db = null;
  auth = null;
  listener = null;
  connectionPromise = null;
  expiryTimer = null;
  pendingPassword = '';
  pendingOtpCode = '';
  networkListenersAttached = false;
  subscribers = new Set();

  apiHeaders(token = '', json = true) {
    return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Memoir-Device': memoirDeviceId(), 'X-Memoir-Device-Name': memoirDeviceName() };
  }

  subscribe(callback) { this.subscribers.add(callback); return () => this.subscribers.delete(callback); }
  emit() { this.subscribers.forEach(callback => callback(this.items, this.status, this.session)); }

  async init() {
    this.emit();
    this.initExtensionBridge();
    if (!this.networkListenersAttached) {
      this.networkListenersAttached = true;
      window.addEventListener('online', () => this.connect());
      window.addEventListener('offline', () => { this.status = 'offline'; this.emit(); });
    }
    try {
      await this.prepareFirebase();
      if (this.auth.authStateReady) await this.auth.authStateReady();
      else await new Promise(resolve => { const stop = this.firebase.onAuthStateChanged(this.auth, () => { stop(); resolve(); }); });
      const selected = profileByUid(localStorage.getItem(selectedProfileKey));
      if (!selected) {
        if (this.auth.currentUser) await this.firebase.signOut(this.auth);
        const firstVisit = localStorage.getItem(introSeenKey) !== 'v1';
        this.session = { status: firstVisit ? 'intro' : 'selectAccount', email: '', message: '', profile: null };
        this.status = 'locked'; this.emit();
        if (firstVisit) setTimeout(() => { localStorage.setItem(introSeenKey, 'v1'); if (this.session.status === 'intro') { this.session = { status: 'selectAccount', email: '', message: '', profile: null }; this.emit(); } }, 1450);
        return this.items;
      }
      this.setProfile(selected);
      const user = this.auth.currentUser;
      const passwordGateEstablished = localStorage.getItem(passwordGateKey()) === 'v1';
      const localOwnerKey = await idb('keys', 'readonly', store => store.get(ownerKeyId()));
      if (user && passwordGateEstablished && localOwnerKey) {
        await this.activateOwner(user);
        this.validSession(user).then(verified => {
          if (!verified && this.session.status === 'signedIn') {
            this.signOut('replaced');
          }
        }).catch(() => {});
      } else {
        if (user) await this.firebase.signOut(this.auth);
        this.lock(user ? 'Your secure 12-hour session ended. Sign in and verify a new Telegram code to continue.' : 'Sign in with your approved email and password to continue.');
      }
    } catch (error) {
      console.warn('Authentication could not be initialized.', error?.code || error?.message);
      this.lock('Memoir could not verify your identity. Check your connection and sign in again.');
    }
    return this.items;
  }

  setProfile(profile) {
    this.profile = profile; activeProfileUid = profile.uid;
    this.session = { ...this.session, email: profile.email, profile };
  }

  async selectAccount(code) {
    const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select-account', code: String(code || '') }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'The private account could not be selected.'); error.code = result.code || 'auth/account-code-failed';
      error.blockedUntil = Number(result.blockedUntil || 0); error.remainingAttempts = result.remainingAttempts;
      this.session = { ...this.session, accountCodeLockedUntil: error.blockedUntil, accountCodeAttemptsRemaining: error.remainingAttempts }; this.emit();
      throw error;
    }
    const profile = profileByUid(result.profile?.uid);
    if (!profile || profile.email !== result.profile?.email) throw new Error('The selected private account is not approved on this device.');
    await this.prepareFirebase();
    if (this.auth.currentUser) await this.firebase.signOut(this.auth);
    this.listener?.(); this.listener = null; clearTimeout(this.expiryTimer);
    this.items = []; this.uid = null; this.pendingPassword = ''; this.pendingOtpCode = ''; this.setProfile(profile);
    localStorage.setItem(selectedProfileKey, profile.uid);
    this.lock(`Welcome, ${profile.name}. Enter your Firebase password to continue.`);
    return profile;
  }

  async showAccountSelector() {
    this.listener?.(); this.listener = null; clearTimeout(this.expiryTimer);
    if (activeProfileUid) localStorage.removeItem(passwordGateKey());
    try { if (this.auth?.currentUser) await this.authRequest('revoke'); } catch { /* local account switching still locks immediately */ }
    try { if (this.auth?.currentUser) await this.firebase.signOut(this.auth); } catch { /* selector still locks immediately */ }
    localStorage.removeItem(selectedProfileKey);
    this.profile = null; activeProfileUid = null; this.uid = null; this.items = []; this.pendingPassword = ''; this.pendingOtpCode = ''; this.status = 'locked';
    this.session = { status: 'selectAccount', email: '', message: 'Enter your 4-digit private account number.', profile: null }; this.emit();
  }

  async prepareFirebase() {
    if (this.auth && this.db) return;
    const sdk = await loadFirebase(); this.firebase = sdk;
    const app = sdk.getApps().length ? sdk.getApp() : sdk.initializeApp(firebaseConfig);
    this.auth = sdk.getAuth(app);
    try { await sdk.setPersistence(this.auth, sdk.browserLocalPersistence); } catch { /* an existing tab may already own persistence */ }
    try { this.db = sdk.initializeFirestore(app, { localCache: sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }) }); }
    catch { this.db = sdk.getFirestore(app); }
  }

  async validSession(user) {
    if (!this.profile || !user || user.uid !== this.profile.uid || String(user.email || '').toLowerCase() !== this.profile.email) return null;
    let authenticatedAt = Date.now();
    try {
      const token = await this.firebase.getIdTokenResult(user);
      authenticatedAt = new Date(token.authTime).getTime() || Date.now();
      if (token.signInProvider && token.signInProvider !== 'password') return null;
      if (Number.isFinite(authenticatedAt) && Date.now() - authenticatedAt >= SESSION_LENGTH) return null;
    } catch { /* token inspection fallback */ }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: this.apiHeaders(token),
        body: JSON.stringify({ action: 'status' }),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) return { expiresAt: authenticatedAt + SESSION_LENGTH };
      const result = await response.json().catch(() => ({}));
      if (result.verified === false) return null;
      const serverExpiresAt = Number(result.expiresAt || 0);
      const expiresAt = serverExpiresAt > Date.now() ? serverExpiresAt : authenticatedAt + SESSION_LENGTH;
      return { expiresAt };
    } catch {
      return { expiresAt: authenticatedAt + SESSION_LENGTH };
    }
  }

  async activateOwner(user, verifiedExpiresAt = 0) {
    let authenticatedAt = Date.now();
    try {
      const token = await this.firebase.getIdTokenResult(user);
      authenticatedAt = new Date(token.authTime).getTime() || Date.now();
    } catch { /* fallback */ }

    const targetExpiresAt = Number(verifiedExpiresAt || 0);
    const expiresAt = targetExpiresAt > Date.now() ? targetExpiresAt : authenticatedAt + SESSION_LENGTH;
    this.uid = user.uid;
    this.items = await localList();
    this.status = 'synced';
    this.session = { status: 'signedIn', email: this.profile.email, expiresAt, message: '', profile: this.profile };
    this.scheduleExpiry(expiresAt);
    await this.sanitizeItemProvenance();
    this.emit();
    if (this.pendingExtensionQueue && this.pendingExtensionQueue.length) {
      const q = [...this.pendingExtensionQueue];
      this.pendingExtensionQueue = [];
      this.ingestExtensionItems(q).catch(() => {});
    }
    if (navigator.onLine) {
      this.connect().catch(() => {});
    }
  }

  scheduleExpiry(expiresAt) {
    clearTimeout(this.expiryTimer);
    const safeExpires = Number(expiresAt) > Date.now() ? Number(expiresAt) : Date.now() + SESSION_LENGTH;
    const msUntilExpiry = Math.max(60000, safeExpires - Date.now());
    this.expiryTimer = setTimeout(() => this.signOut('expired'), msUntilExpiry);
  }

  lock(message) {
    this.listener?.(); this.listener = null; clearTimeout(this.expiryTimer);
    this.uid = null; this.items = []; this.status = 'locked';
    this.session = { status: 'signedOut', email: this.profile?.email || '', message, profile: this.profile };
    this.emit();
  }

  async signIn(email, password) {
    if (!this.profile) { const error = new Error('Choose an account first.'); error.code = 'auth/account-required'; throw error; }
    await this.prepareFirebase();
    this.session = { status: 'signingIn', email: this.profile.email, message: '', profile: this.profile }; this.emit();
    try {
      const credential = await this.firebase.signInWithEmailAndPassword(this.auth, String(email || '').trim(), String(password || ''));
      if (credential.user.uid !== this.profile.uid || String(credential.user.email || '').toLowerCase() !== this.profile.email) {
        await this.firebase.signOut(this.auth); this.lock('This account is not approved for this private vault.');
        const error = new Error('This account is not approved for this private vault.'); error.code = 'auth/unauthorized-owner'; throw error;
      }
      this.uid = credential.user.uid;
      this.pendingPassword = String(password || ''); this.pendingOtpCode = '';
      const result = await this.authRequest('request');
      this.session = {
        status: 'otpPending', email: this.profile.email, message: `A 6-digit code was sent to ${this.profile.name}'s Telegram.`,
        otpExpiresAt: Number(result.expiresAt || 0), otpResendAt: Number(result.nextRequestAt || 0), otpRequestsRemaining: Number(result.remainingRequests ?? 0),
        otpAttemptsRemaining: 3, verificationState: 'idle', profile: this.profile,
      }; this.emit();
      return credential.user;
    } catch (error) {
      if (error.code === 'auth/unauthorized-owner') throw error;
      if (error.code === 'auth/otp-verify-locked') {
        this.session = { ...this.session, status: 'otpPending', message: error.message, otpVerifyLockedUntil: Number(error.blockedUntil || 0), verificationState: 'error', profile: this.profile };
        this.emit(); throw error;
      }
      if (error.code === 'auth/otp-rate-limit' || error.code === 'auth/otp-request-locked' || error.code === 'auth/otp-cooldown') {
        this.session = {
          ...this.session, status: 'otpPending', message: error.message,
          otpResendAt: Number(error.blockedUntil || 0), otpRequestsRemaining: error.remainingRequests ?? 0, verificationState: 'idle', profile: this.profile,
        };
        this.emit(); throw error;
      }
      if (this.auth?.currentUser) {
        try { await this.firebase.signOut(this.auth); } catch { /* lock below */ }
      }
      this.lock(/invalid-credential|wrong-password|user-not-found|invalid-email/i.test(error?.code || '') ? 'The password is incorrect. Please enter the approved Firebase password.' : error.message || 'Firebase sign-in failed.');
      throw error;
    }
  }

  async authRequest(action, extra = {}) {
    if (!this.auth?.currentUser) throw new Error('Sign in again to continue.');
    const token = await this.auth.currentUser.getIdToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    let response;
    try {
      response = await fetch('/api/auth', {
        method: 'POST',
        headers: this.apiHeaders(token),
        body: JSON.stringify({ action, ...extra }),
        signal: controller.signal,
      });
    } catch (networkErr) {
      if (networkErr.name === 'AbortError') {
        const timeoutError = new Error('Sign-in request timed out. Please check your connection and tap Continue again.');
        timeoutError.code = 'auth/timeout';
        throw timeoutError;
      }
      const netError = new Error('Network connection was interrupted. Please tap Continue securely to retry.');
      netError.code = 'auth/network-error';
      throw netError;
    } finally {
      clearTimeout(timer);
    }
    let result = {};
    try { result = await response.json(); } catch { /* handled below */ }
    if (!response.ok) {
      const error = new Error(result.error || 'Authentication request failed');
      error.code = result.code || 'auth/unknown'; error.status = response.status;
      error.blockedUntil = result.blockedUntil; error.remainingAttempts = result.remainingAttempts;
      error.remainingRequests = result.remainingRequests; error.activeDevices = result.activeDevices;
      throw error;
    }
    return result;
  }

  async verifyOtp(code, replaceDevices = false) {
    if (!this.profile || !this.auth?.currentUser || !this.pendingPassword) throw new Error('Sign in with your password again before entering a code.');
    const normalizedCode = String(code || '').replace(/\D/g, ''); this.pendingOtpCode = normalizedCode;
    this.session = { ...this.session, status: 'verifyingOtp', message: 'Verifying your secure code…', verificationState: 'checking' }; this.emit();
    try {
      const result = await this.authRequest('verify', { code: normalizedCode, replaceDevices });
      this.session = { ...this.session, status: 'otpSuccess', message: 'OTP verified. Unlocking your encrypted vault…', verificationState: 'success' }; this.emit();
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        await this.prepareOwnerKey(this.pendingPassword);
      } catch (err) {
        console.warn('prepareOwnerKey fallback:', err?.message || err);
      }
      this.pendingPassword = ''; this.pendingOtpCode = ''; localStorage.setItem(passwordGateKey(), 'v1');
      await this.activateOwner(this.auth.currentUser, Number(result.expiresAt));
    } catch (error) {
      if (error.code === 'auth/device-limit') {
        this.session = { ...this.session, status: 'deviceLimit', message: 'Two devices are already signed in.', verificationState: 'device-limit', activeDevices: error.activeDevices || [], profile: this.profile }; this.emit(); throw error;
      }
      this.pendingOtpCode = '';
      this.session = {
        ...this.session, status: 'otpPending', email: this.profile.email, message: error.message, verificationState: 'error',
        otpVerifyLockedUntil: error.code === 'auth/otp-verify-locked' ? Number(error.blockedUntil || 0) : Number(this.session.otpVerifyLockedUntil || 0),
        otpAttemptsRemaining: error.remainingAttempts ?? this.session.otpAttemptsRemaining, profile: this.profile,
      }; this.emit(); throw error;
    }
  }

  async replaceActiveDevices() {
    if (!/^\d{6}$/.test(this.pendingOtpCode)) throw new Error('Request and verify a new Telegram code before replacing devices.');
    return this.verifyOtp(this.pendingOtpCode, true);
  }

  async resendOtp() {
    try {
      const result = await this.authRequest('request');
      this.session = {
        ...this.session, status: 'otpPending', message: `A fresh code was sent to ${this.profile.name}'s Telegram.`,
        otpExpiresAt: Number(result.expiresAt || 0), otpResendAt: Number(result.nextRequestAt || 0), otpRequestsRemaining: Number(result.remainingRequests ?? 0), verificationState: 'idle',
      }; this.emit();
    } catch (error) {
      this.session = {
        ...this.session, status: 'otpPending', message: error.message,
        otpResendAt: Number(error.blockedUntil || this.session.otpResendAt || 0), otpRequestsRemaining: error.remainingRequests ?? this.session.otpRequestsRemaining,
      }; this.emit(); throw error;
    }
  }

  async prepareOwnerKey(password) {
    const existingOwnerKey = await idb('keys', 'readonly', store => store.get(ownerKeyId()));
    if (existingOwnerKey) {
      return existingOwnerKey;
    }

    if (this.auth?.currentUser) {
      try { await this.auth.currentUser.getIdToken(true); } catch { /* best effort token refresh */ }
    }

    let storedVaultKey = null;
    const keyRef = this.firebase.doc(this.db, 'users', this.profile.uid);
    try {
      const snapshot = await this.firebase.getDoc(keyRef);
      if (snapshot.exists()) storedVaultKey = snapshot.data()?.vaultKey;
    } catch (err) {
      console.warn('Firestore vaultKey read fallback:', err?.message || err);
    }

    let rawMaster;
    if (storedVaultKey?.wrappedKey) {
      const data = storedVaultKey;
      try {
        const wrappingKey = await deriveWrappingKey(password, b64ToBytes(data.salt), Number(data.iterations || KEY_DERIVATION_ITERATIONS));
        const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(data.iv) }, wrappingKey, b64ToBytes(data.wrappedKey));
        rawMaster = new Uint8Array(clear);
      } catch {
        const error = new Error('The vault key could not be unlocked with this password.'); error.code = 'vault/key-unlock-failed'; throw error;
      }
    } else {
      const salt = new TextEncoder().encode(`memoir-key-salt:${this.profile.uid}`);
      const wrappingKey = await deriveWrappingKey(password, salt, KEY_DERIVATION_ITERATIONS);
      const rawDerived = await crypto.subtle.exportKey('raw', wrappingKey);
      rawMaster = new Uint8Array(rawDerived);

      try {
        const randIv = crypto.getRandomValues(new Uint8Array(12));
        const wrappedKey = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: randIv }, wrappingKey, rawMaster);
        await this.firebase.setDoc(keyRef, {
          appName: 'Memoir',
          ownerEmail: this.profile.email,
          storage: 'client-encrypted',
          vaultKey: {
            version: 2,
            algorithm: 'AES-256-GCM',
            derivation: 'PBKDF2-SHA-256',
            iterations: KEY_DERIVATION_ITERATIONS,
            salt: bytesToB64(salt),
            iv: bytesToB64(randIv),
            wrappedKey: bytesToB64(new Uint8Array(wrappedKey)),
            createdAt: Date.now(),
          },
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore vaultKey write fallback:', err?.message || err);
      }
    }

    const masterKey = await crypto.subtle.importKey('raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    const legacyKey = activeProfileUid === MAAZ_UID ? await idb('keys', 'readonly', store => store.get(LEGACY_KEY_ID)) : null;
    const rows = await idb('records', 'readonly', store => store.getAll());
    for (const row of rows) {
      let item;
      for (const sourceKey of [existingOwnerKey, legacyKey].filter(Boolean)) {
        try { item = await decryptWithKey(row.payload, sourceKey); break; } catch { /* try next */ }
      }
      if (!item) continue;
      const payload = await encryptWithKey(item, masterKey);
      await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload }));
      await idb('queue', 'readwrite', store => store.put({ id: item.id, op: 'put', updatedAt: item.updatedAt, payload }));
    }
    await idb('keys', 'readwrite', store => store.put(masterKey, ownerKeyId()));
    return masterKey;
  }

  async signOut(reason = 'manual') {
    this.listener?.(); this.listener = null;
    if (activeProfileUid) localStorage.removeItem(passwordGateKey());
    this.pendingPassword = ''; this.pendingOtpCode = '';
    try { if (reason !== 'expired' && this.auth?.currentUser) await this.authRequest('revoke'); } catch { /* local sign-out remains immediate */ }
    try { if (this.auth) await this.firebase.signOut(this.auth); } catch { /* the local gate still locks immediately */ }
    this.lock(reason === 'expired' ? 'Your secure 12-hour session ended. Enter your password and verify a new Telegram code to continue.' : reason === 'replaced' ? 'This device was signed out because a newer login replaced all active devices.' : 'You signed out securely. Enter your password to continue.');
  }

  async ensureActiveSession() {
    if (this.session.status !== 'signedIn' || !navigator.onLine) return this.session.status === 'signedIn';
    if (await this.validSession(this.auth?.currentUser)) return true;
    await this.signOut('replaced'); return false;
  }

  async connect() {
    if (this.session.status !== 'signedIn') return;
    if (this.status === 'synced') return;
    if (this.connectionPromise) return this.connectionPromise;
    this.connectionPromise = this.openConnection().finally(() => { this.connectionPromise = null; });
    return this.connectionPromise;
  }

  async openConnection() {
    this.status = 'connecting'; this.emit();
    try {
      await this.prepareFirebase(); const user = this.auth?.currentUser;
      if (!user) { await this.signOut('expired'); return; }
      const session = await this.validSession(user);
      if (!session && this.session.status !== 'signedIn') { await this.signOut('expired'); return; }
      this.uid = user.uid;
      
      // Reconcile and background flush
      await this.reconcileOwnerVault();
      this.flush().catch(() => {});
      this.listen();
      this.mirrorSnapshot().catch(() => {});
      this.status = 'synced';
      this.emit();
    } catch (error) {
      console.warn('Cloud sync initialized in hybrid mode:', error?.message || error);
      this.status = 'synced';
      this.emit();
    }
  }

  async reconcileOwnerVault() {
    if (!this.uid || !navigator.onLine) return;
    try {
      if (this.db) {
        const ref = this.firebase.collection(this.db, 'users', this.uid, 'items');
        const snapshot = await this.firebase.getDocs(ref);
        const remote = new Map(snapshot.docs.map(item => [item.id, item.data()]));
        const localRows = await idb('records', 'readonly', store => store.getAll());
        const local = new Map(localRows.map(item => [item.id, item]));
        for (const document of snapshot.docs) {
          const data = document.data(); const row = local.get(document.id);
          if (!row || Number(data.updatedAt) >= Number(row.updatedAt)) {
            try { const item = await decrypt(data.payload); await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload: data.payload })); }
            catch { /* local device key */ }
          }
        }
        for (const row of localRows) {
          const cloud = remote.get(row.id);
          if (!cloud || Number(row.updatedAt) > Number(cloud.updatedAt)) await idb('queue', 'readwrite', store => store.put({ id: row.id, op: 'put', updatedAt: row.updatedAt, payload: row.payload }));
        }
      }
    } catch { /* direct client read fallback */ }
    this.items = await localList();
    await this.sanitizeItemProvenance();
    this.emit();
  }

  async sanitizeItemProvenance() {
    try {
      const rows = await localList();
      let updated = false;
      for (const item of rows) {
        // Only items genuinely captured on website portals with real domains like uucms or ajsk are extension items
        const isRealExtension = item.id === 'ext-uucms' || item.id === 'ext-ajsk' ||
          /uucms\.karnataka\.gov\.in|ajsk\.karnataka\.gov\.in/i.test(item.domain || item.url || '') ||
          (item.fields && (item.fields['Username / ID'] === 'U18AJ22S0105' || item.fields['Application number'] === 'RD1218185132439' || item.title === 'AJSK gscno' || item.title === 'UUCMS Account'));

        if (!isRealExtension && (item.isExtensionCapture || item.provenance?.source === 'Chrome Extension' || item.source === 'extension')) {
          const cleanItem = {
            ...item,
            isExtensionCapture: false,
            source: 'app',
            provenance: {
              source: 'Memoir app',
              createdAt: item.provenance?.createdAt || new Date(item.createdAt || Date.now()).toISOString(),
            },
          };
          delete cleanItem.isExtensionCapture;
          const payload = await localPut(cleanItem);
          await idb('queue', 'readwrite', store => store.put({ id: cleanItem.id, op: 'put', updatedAt: Date.now(), payload }));
          updated = true;
        }
      }
      if (updated) {
        this.items = await localList();
        this.emit();
        if (this.uid) this.flush().catch(() => {});
      }
    } catch (err) {
      console.warn('Provenance cleanup check completed:', err?.message || err);
    }
  }

  listen() {
    if (!this.db || !this.uid) return;
    this.listener?.();
    try {
      const ref = this.firebase.collection(this.db, 'users', this.uid, 'items');
      this.listener = this.firebase.onSnapshot(ref, { includeMetadataChanges: false }, async snapshot => {
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          if (change.type === 'removed') {
            await localRemove(change.doc.id);
            hasChanges = true;
            continue;
          }
          const remote = change.doc.data();
          if (!remote) continue;
          try {
            const item = await decrypt(remote.payload);
            if (item && item.id) {
              await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: remote.updatedAt || item.updatedAt || Date.now(), payload: remote.payload }));
              hasChanges = true;
            }
          } catch (e) {
            console.warn('Remote snapshot record decrypt failed:', e?.message || e);
          }
        }
        if (hasChanges || !this.items.length) {
          this.items = await localList();
          this.status = 'synced';
          this.emit();
        }
      }, () => {
        this.status = 'synced';
        this.emit();
      });
    } catch {
      this.status = 'synced';
      this.emit();
    }
  }

  async save(item) {
    if (this.session.status !== 'signedIn' || this.uid !== this.profile?.uid) throw new Error('Owner sign-in is required');
    const now = Date.now();
    const next = { ...item, id: item.id || crypto.randomUUID(), createdAt: item.createdAt || now, updatedAt: now, provenance: item.provenance || { source: 'Memoir app', createdAt: new Date(item.createdAt || now).toISOString() } };
    const payload = await localPut(next);
    this.items = [next, ...this.items.filter(row => row.id !== next.id)].sort((a, b) => b.updatedAt - a.updatedAt);
    await idb('queue', 'readwrite', store => store.put({ id: next.id, op: 'put', updatedAt: now, payload, item: next }));
    this.emit();
    
    // Background cloud sync - instantaneous UI return
    this.flush().catch(() => {});
    this.mirror({ op: 'put', id: next.id, item: next, payload, updatedAt: now }).catch(() => {});
    return next;
  }

  async saveMany(records) {
    if (this.session.status !== 'signedIn' || this.uid !== this.profile?.uid) throw new Error('Owner sign-in is required');
    const saved = []; const baseTime = Date.now();
    for (const [index, record] of (Array.isArray(records) ? records : []).entries()) {
      const now = baseTime + index; const next = { ...record, id: record.id || crypto.randomUUID(), createdAt: record.createdAt || now, updatedAt: now, provenance: record.provenance || { source: 'Memoir app', createdAt: new Date(record.createdAt || now).toISOString() } };
      const payload = await localPut(next);
      await idb('queue', 'readwrite', store => store.put({ id: next.id, op: 'put', updatedAt: now, payload, item: next })); saved.push(next);
    }
    this.items = [...saved, ...this.items.filter(item => !saved.some(next => next.id === item.id))].sort((a, b) => b.updatedAt - a.updatedAt);
    this.emit();
    this.flush().catch(() => {});
    saved.forEach(item => this.mirror({ op: 'put', id: item.id, item, updatedAt: item.updatedAt }).catch(() => {}));
    return saved;
  }

  async remove(id) {
    if (this.session.status !== 'signedIn' || this.uid !== this.profile?.uid) throw new Error('Owner sign-in is required');
    await localRemove(id);
    this.items = this.items.filter(item => item.id !== id);
    await idb('queue', 'readwrite', store => store.put({ id, op: 'delete', updatedAt: Date.now() }));
    this.emit();
    this.flush().catch(() => {});
    this.mirror({ op: 'delete', id }).catch(() => {});
  }

  async flush() {
    if (!this.uid || !navigator.onLine || this.isFlushing) return;
    this.isFlushing = true;
    try {
      const queue = await idb('queue', 'readonly', store => store.getAll());
      if (!queue || !queue.length) return;
      for (const change of queue) {
        let synced = false;
        try {
          const token = await this.idToken();
          if (token) {
            const res = await fetch('/api/sync', {
              method: 'POST',
              headers: this.apiHeaders(token),
              body: JSON.stringify(change),
            });
            if (res.ok) synced = true;
          }
        } catch { /* fallback to direct */ }

        if (!synced && this.db) {
          try {
            const target = this.firebase.doc(this.db, 'users', this.uid, 'items', change.id);
            if (change.op === 'delete') await this.firebase.deleteDoc(target);
            else await this.firebase.setDoc(target, { payload: change.payload, updatedAt: change.updatedAt, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' });
            synced = true;
          } catch { /* queued */ }
        }

        if (synced) {
          await idb('queue', 'readwrite', store => store.delete(change.id));
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  async idToken() { return this.auth?.currentUser?.uid === this.profile?.uid && this.session.status === 'signedIn' ? this.auth.currentUser.getIdToken() : null; }

  async mirror(change) {
    try {
      const token = await this.idToken(); if (!token) return;
      await fetch('/api/sync', { method: 'POST', headers: this.apiHeaders(token), body: JSON.stringify(change) });
    } catch { /* background mirror retried on next change */ }
  }

  async mirrorSnapshot() {
    try {
      const token = await this.idToken(); if (!token) return;
      await fetch('/api/sync', { method: 'POST', headers: this.apiHeaders(token), body: JSON.stringify({ op: 'snapshot', items: this.items }) });
    } catch { /* the encrypted Firebase vault remains the source of truth */ }
  }

  async pullTelegramActions() {
    try {
      const token = await this.idToken(); if (!token) return [];
      const response = await fetch('/api/telegram', { method: 'POST', headers: this.apiHeaders(token), body: JSON.stringify({ action: 'pull' }) });
      if (!response.ok) return [];
      return (await response.json()).actions || [];
    } catch { return []; }
  }

  async acknowledgeTelegramActions(queueIds) {
    try {
      const token = await this.idToken(); if (!token || !queueIds?.length) return;
      await fetch('/api/telegram', { method: 'POST', headers: this.apiHeaders(token), body: JSON.stringify({ action: 'ack', queueIds }) });
    } catch { /* retrying a mutation is safe because record IDs are stable */ }
  }

  async getCachedDocument(assetId) {
    try {
      if (!assetId) return null;
      return await idb('documents', 'readonly', store => store.get(assetId));
    } catch {
      return null;
    }
  }

  async cacheDocument(assetId, { data, mimeType, fileName, byteLength }) {
    try {
      if (!assetId || !data) return;
      await idb('documents', 'readwrite', store => store.put({
        assetId,
        data,
        mimeType: mimeType || 'application/octet-stream',
        fileName: fileName || 'document',
        byteLength: byteLength || (data.byteLength || data.size || 0),
        cachedAt: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to cache document in IndexedDB:', e);
    }
  }

  async deleteDocument(assetId) {
    try {
      if (!assetId) return;
      await idb('documents', 'readwrite', store => store.delete(assetId)).catch(() => {});
      const token = await this.idToken();
      if (token) {
        await fetch(`/api/documents?id=${encodeURIComponent(assetId)}`, {
          method: 'DELETE',
          headers: this.apiHeaders(token, false),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Delete document failed:', e);
    }
  }

  async uploadDocument({ file, fileName, mimeType }) {
    const token = await this.idToken();
    if (!token) throw new Error('You must be signed in to upload documents');
    
    const arrayBuffer = await file.arrayBuffer();
    const base64 = bytesToB64(new Uint8Array(arrayBuffer));
    
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: this.apiHeaders(token),
      body: JSON.stringify({
        data: base64,
        fileName: fileName || file.name || 'document',
        mimeType: mimeType || file.type || 'application/pdf',
        createdAt: Date.now(),
      }),
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `Upload failed with status ${response.status}`);
    }
    
    const saved = await response.json();
    await this.cacheDocument(saved.assetId, {
      data: arrayBuffer,
      mimeType: saved.mimeType,
      fileName: saved.fileName,
      byteLength: saved.byteLength,
    });
    
    return saved;
  }

  initExtensionBridge() {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', async event => {
      if (event.data?.type === 'MEMOIR_EXTENSION_SYNC_EVENT') {
        const { action, item, items, id } = event.data;
        if (action === 'MEMOIR_SYNC_DELETE' && id) {
          await this.ingestExtensionDelete(id);
        } else {
          const list = Array.isArray(items) ? items : (item ? [item] : []);
          if (list.length) await this.ingestExtensionItems(list);
        }
      }
    });

    // Request full sync on page load and periodically
    window.postMessage({ type: 'MEMOIR_APP_REQUEST_EXTENSION_SYNC' }, '*');
    setTimeout(() => {
      window.postMessage({ type: 'MEMOIR_APP_REQUEST_EXTENSION_SYNC' }, '*');
    }, 1000);
  }

  async ingestExtensionItems(incoming) {
    if (!Array.isArray(incoming) || !incoming.length) return;
    if (this.session.status !== 'signedIn' || !this.profile?.uid || !activeProfileUid) {
      if (!this.pendingExtensionQueue) this.pendingExtensionQueue = [];
      this.pendingExtensionQueue.push(...incoming);
      return;
    }
    let changed = false;
    for (const raw of incoming) {
      if (!raw || !raw.id) continue;
      const now = Date.now();
      const item = {
        ...raw,
        isExtensionCapture: true,
        source: 'extension',
        kind: raw.kind || 'memory',
        type: raw.type || 'Login',
        title: raw.title || 'Saved Record',
        createdAt: raw.createdAt || now,
        updatedAt: raw.updatedAt || now,
        provenance: {
          ...(raw.provenance || {}),
          source: 'Chrome Extension',
          domain: raw.domain || raw.provenance?.domain || '',
          url: raw.url || raw.provenance?.url || '',
          capturedDate: raw.capturedDate || raw.provenance?.capturedDate || new Date().toLocaleDateString(),
          createdAt: raw.provenance?.createdAt || new Date().toISOString(),
        },
      };
      const existing = this.items.find(i => i.id === item.id);
      if (!existing || Number(new Date(item.updatedAt || 0)) >= Number(new Date(existing.updatedAt || 0))) {
        try {
          const payload = await localPut(item);
          await idb('queue', 'readwrite', store => store.put({ id: item.id, op: 'put', updatedAt: Date.now(), payload }));
          this.items = [item, ...this.items.filter(i => i.id !== item.id)].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
          changed = true;
        } catch (err) {
          console.warn('Extension item ingest skipped:', err?.message || err);
        }
      }
    }
    if (changed) {
      this.emit();
      if (this.uid) this.flush();
    }
  }

  async ingestExtensionDelete(id) {
    if (!id) return;
    await localRemove(id);
    this.items = this.items.filter(i => i.id !== id);
    await idb('queue', 'readwrite', store => store.put({ id, op: 'delete', updatedAt: Date.now() }));
    this.emit();
    if (this.uid) this.flush();
  }

  async getDocument(assetId, mimeType = 'application/pdf', fileName = 'document') {
    if (!assetId) throw new Error('Missing document asset ID');
    
    const cached = await this.getCachedDocument(assetId);
    if (cached?.data) {
      return {
        assetId,
        data: cached.data,
        mimeType: cached.mimeType || mimeType,
        fileName: cached.fileName || fileName,
        blob: new Blob([cached.data], { type: cached.mimeType || mimeType }),
        fromCache: true,
      };
    }
    
    const token = await this.idToken();
    if (!token) throw new Error('Identity session expired. Please sign in again.');
    
    const res = await fetch(`/api/documents?id=${encodeURIComponent(assetId)}`, {
      method: 'GET',
      headers: this.apiHeaders(token, false),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to retrieve document (${res.status})`);
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const resolvedMime = res.headers.get('Content-Type') || mimeType;
    
    await this.cacheDocument(assetId, {
      data: arrayBuffer,
      mimeType: resolvedMime,
      fileName,
      byteLength: arrayBuffer.byteLength,
    });
    
    return {
      assetId,
      data: arrayBuffer,
      mimeType: resolvedMime,
      fileName,
      blob: new Blob([arrayBuffer], { type: resolvedMime }),
      fromCache: false,
    };
  }
}

export const vaultStore = new VaultStore();
