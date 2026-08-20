const firebaseConfig = {
  apiKey: 'AIzaSyAVkrZbrhbumrbBz8cAgM1PSW8wxqKM_Zs',
  authDomain: 'personalvault-20c1f.firebaseapp.com',
  projectId: 'personalvault-20c1f',
  storageBucket: 'personalvault-20c1f.firebasestorage.app',
  messagingSenderId: '256886953432',
  appId: '1:256886953432:web:10db422f21939a90f6cead',
  measurementId: 'G-E4CM9P974R',
};

const DB_NAME = 'memoir-encrypted-vault';
const DB_VERSION = 1;
const OWNER_UID = 'uQE6xqhWhQWhOlGmfT2br5HnCEq2';
const OWNER_EMAIL = 'maaz@memo.com';
const SESSION_LENGTH = 48 * 60 * 60 * 1000;
const OWNER_KEY_ID = 'owner-vault-key-v2';
const LEGACY_KEY_ID = 'device-vault-key';
const KEY_DERIVATION_ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let firebaseSdk;
async function loadFirebase() {
  if (firebaseSdk) return firebaseSdk;
  const [app, auth, firestore] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  firebaseSdk = { ...app, ...auth, ...firestore };
  return firebaseSdk;
}

function openLocalDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
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

const bytesToB64 = bytes => btoa(String.fromCharCode(...bytes));
const b64ToBytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function getVaultKey() {
  let key = await idb('keys', 'readonly', store => store.get(OWNER_KEY_ID));
  if (key) return key;
  key = await idb('keys', 'readonly', store => store.get(LEGACY_KEY_ID));
  if (!key) {
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await idb('keys', 'readwrite', store => store.put(key, LEGACY_KEY_ID));
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
async function decrypt(payload) { return decryptWithKey(payload, await getVaultKey()); }

async function deriveWrappingKey(password, salt, iterations = KEY_DERIVATION_ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
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
  session = { status: 'checking', email: OWNER_EMAIL, message: '' };
  uid = null;
  db = null;
  auth = null;
  listener = null;
  connectionPromise = null;
  expiryTimer = null;
  subscribers = new Set();

  subscribe(callback) { this.subscribers.add(callback); return () => this.subscribers.delete(callback); }
  emit() { this.subscribers.forEach(callback => callback(this.items, this.status, this.session)); }

  async init() {
    this.emit();
    try {
      await this.prepareFirebase();
      if (this.auth.authStateReady) await this.auth.authStateReady();
      else await new Promise(resolve => { const stop = this.firebase.onAuthStateChanged(this.auth, () => { stop(); resolve(); }); });
      const user = this.auth.currentUser;
      const passwordGateEstablished = localStorage.getItem('memoir-owner-password-gate') === 'v1';
      const localOwnerKey = await idb('keys', 'readonly', store => store.get(OWNER_KEY_ID));
      if (user && passwordGateEstablished && localOwnerKey && await this.isValidOwnerSession(user)) await this.activateOwner(user);
      else {
        if (user) await this.firebase.signOut(this.auth);
        this.lock(user ? 'For security, your previous session is no longer accepted. Sign in with the approved email and password to continue.' : 'Sign in with your owner email and password to continue.');
      }
    } catch (error) {
      console.warn('Authentication could not be initialized.', error?.code || error?.message);
      this.lock('Memoir could not verify your identity. Check your connection and sign in again.');
    }
    window.addEventListener('online', () => this.connect());
    window.addEventListener('offline', () => { this.status = 'offline'; this.emit(); });
    return this.items;
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

  async isValidOwnerSession(user) {
    if (!user || user.uid !== OWNER_UID || String(user.email || '').toLowerCase() !== OWNER_EMAIL) return false;
    const token = await this.firebase.getIdTokenResult(user);
    const authenticatedAt = new Date(token.authTime).getTime();
    return token.signInProvider === 'password' && Number.isFinite(authenticatedAt) && Date.now() - authenticatedAt < SESSION_LENGTH;
  }

  async activateOwner(user) {
    const token = await this.firebase.getIdTokenResult(user);
    const authenticatedAt = new Date(token.authTime).getTime();
    const expiresAt = authenticatedAt + SESSION_LENGTH;
    this.uid = user.uid;
    this.items = await localList();
    this.status = navigator.onLine ? 'connecting' : 'offline';
    this.session = { status: 'signedIn', email: OWNER_EMAIL, expiresAt, message: '' };
    this.scheduleExpiry(expiresAt);
    this.emit();
    if (navigator.onLine) await this.connect();
  }

  scheduleExpiry(expiresAt) {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.signOut('expired'), Math.max(0, expiresAt - Date.now()));
  }

  lock(message) {
    this.listener?.(); this.listener = null; clearTimeout(this.expiryTimer);
    this.uid = null; this.items = []; this.status = 'locked';
    this.session = { status: 'signedOut', email: OWNER_EMAIL, message };
    this.emit();
  }

  async signIn(email, password) {
    await this.prepareFirebase();
    this.session = { status: 'signingIn', email: OWNER_EMAIL, message: '' }; this.emit();
    try {
      const credential = await this.firebase.signInWithEmailAndPassword(this.auth, String(email || '').trim(), String(password || ''));
      if (credential.user.uid !== OWNER_UID || String(credential.user.email || '').toLowerCase() !== OWNER_EMAIL) {
        await this.firebase.signOut(this.auth); this.lock('This account is not approved for this private vault.');
        const error = new Error('This account is not approved for this private vault.'); error.code = 'auth/unauthorized-owner'; throw error;
      }
      this.uid = credential.user.uid;
      await this.prepareOwnerKey(password);
      localStorage.setItem('memoir-owner-password-gate', 'v1');
      await this.activateOwner(credential.user);
      return credential.user;
    } catch (error) {
      if (this.session.status !== 'signedOut') this.lock('Enter the owner email and password to continue.');
      throw error;
    }
  }

  async prepareOwnerKey(password) {
    if (!navigator.onLine) { const error = new Error('Internet is required to unlock this device for the first time.'); error.code = 'vault/first-unlock-offline'; throw error; }
    const keyRef = this.firebase.doc(this.db, 'users', OWNER_UID);
    const snapshot = await this.firebase.getDoc(keyRef);
    const storedVaultKey = snapshot.exists() ? snapshot.data()?.vaultKey : null;
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
      rawMaster = crypto.getRandomValues(new Uint8Array(32));
      const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
      const wrappingKey = await deriveWrappingKey(password, salt);
      const wrappedKey = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawMaster);
      await this.firebase.setDoc(keyRef, { appName: 'Memoir', ownerEmail: OWNER_EMAIL, storage: 'client-encrypted', vaultKey: { version: 2, algorithm: 'AES-256-GCM', derivation: 'PBKDF2-SHA-256', iterations: KEY_DERIVATION_ITERATIONS, salt: bytesToB64(salt), iv: bytesToB64(iv), wrappedKey: bytesToB64(new Uint8Array(wrappedKey)), createdAt: Date.now() } }, { merge: true });
    }
    const masterKey = await crypto.subtle.importKey('raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    const existingOwnerKey = await idb('keys', 'readonly', store => store.get(OWNER_KEY_ID));
    const legacyKey = await idb('keys', 'readonly', store => store.get(LEGACY_KEY_ID));
    const rows = await idb('records', 'readonly', store => store.getAll());
    for (const row of rows) {
      let item;
      for (const sourceKey of [existingOwnerKey, legacyKey].filter(Boolean)) { try { item = await decryptWithKey(row.payload, sourceKey); break; } catch { /* try the next local key */ } }
      if (!item) continue;
      const payload = await encryptWithKey(item, masterKey);
      await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload }));
      await idb('queue', 'readwrite', store => store.put({ id: item.id, op: 'put', updatedAt: item.updatedAt, payload }));
    }
    await idb('keys', 'readwrite', store => store.put(masterKey, OWNER_KEY_ID));
  }

  async signOut(reason = 'manual') {
    this.listener?.(); this.listener = null;
    localStorage.removeItem('memoir-owner-password-gate');
    try { if (this.auth) await this.firebase.signOut(this.auth); } catch { /* the local gate still locks immediately */ }
    this.lock(reason === 'expired' ? 'Your secure 48-hour session ended. To continue using Memoir, please enter your email and password again.' : 'You signed out securely. Enter your email and password to continue.');
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
      await this.prepareFirebase(); const sdk = this.firebase; const user = this.auth.currentUser;
      if (!await this.isValidOwnerSession(user)) { await this.signOut('expired'); return; }
      this.uid = user.uid;
      await sdk.setDoc(sdk.doc(this.db, 'users', this.uid), {
        appName: 'Memoir', ownerEmail: OWNER_EMAIL, schemaVersion: 1, storage: 'client-encrypted', itemCollection: 'items', lastSeenAt: sdk.serverTimestamp(),
      }, { merge: true });
      await this.reconcileOwnerVault();
      await this.flush();
      this.listen();
      this.mirrorSnapshot();
    } catch (error) {
      console.warn('Cloud sync unavailable; working offline.', error?.code || error?.message);
      this.status = 'offline'; this.emit();
    }
  }

  async reconcileOwnerVault() {
    if (!this.uid || !navigator.onLine) return;
    const ref = this.firebase.collection(this.db, 'users', this.uid, 'items');
    const snapshot = await this.firebase.getDocs(ref);
    const remote = new Map(snapshot.docs.map(item => [item.id, item.data()]));
    const localRows = await idb('records', 'readonly', store => store.getAll());
    const local = new Map(localRows.map(item => [item.id, item]));
    for (const document of snapshot.docs) {
      const data = document.data(); const row = local.get(document.id);
      if (!row || Number(data.updatedAt) >= Number(row.updatedAt)) {
        try { const item = await decrypt(data.payload); await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload: data.payload })); }
        catch { /* this device intentionally cannot open ciphertext created with another device key */ }
      }
    }
    for (const row of localRows) {
      const cloud = remote.get(row.id);
      if (!cloud || Number(row.updatedAt) > Number(cloud.updatedAt)) await idb('queue', 'readwrite', store => store.put({ id: row.id, op: 'put', updatedAt: row.updatedAt, payload: row.payload }));
    }
    this.items = await localList(); this.emit();
  }

  listen() {
    this.listener?.();
    const ref = this.firebase.collection(this.db, 'users', this.uid, 'items');
    this.listener = this.firebase.onSnapshot(ref, { includeMetadataChanges: true }, async snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') { await localRemove(change.doc.id); continue; }
        const remote = change.doc.data();
        const existing = this.items.find(item => item.id === change.doc.id);
        if (!existing || Number(remote.updatedAt) >= Number(existing.updatedAt)) {
          try {
            const item = await decrypt(remote.payload);
            await idb('records', 'readwrite', store => store.put({ id: item.id, updatedAt: item.updatedAt, payload: remote.payload }));
          } catch { /* a device-bound key intentionally cannot decrypt another device */ }
        }
      }
      this.items = await localList();
      this.status = snapshot.metadata.fromCache && !navigator.onLine ? 'offline' : 'synced';
      this.emit();
    }, error => { console.warn('Firestore listener stopped.', error?.code || error?.message); this.status = 'offline'; this.emit(); });
  }

  async save(item) {
    if (this.session.status !== 'signedIn' || this.uid !== OWNER_UID) throw new Error('Owner sign-in is required');
    const now = Date.now();
    const next = { ...item, id: item.id || crypto.randomUUID(), createdAt: item.createdAt || now, updatedAt: now };
    const payload = await localPut(next);
    this.items = [next, ...this.items.filter(row => row.id !== next.id)].sort((a, b) => b.updatedAt - a.updatedAt);
    await idb('queue', 'readwrite', store => store.put({ id: next.id, op: 'put', updatedAt: now, payload }));
    this.emit();
    if (this.uid) await this.flush();
    if (this.uid) this.mirror({ op: 'put', id: next.id, item: next });
    return next;
  }

  async saveMany(records) {
    if (this.session.status !== 'signedIn' || this.uid !== OWNER_UID) throw new Error('Owner sign-in is required');
    const saved = []; const baseTime = Date.now();
    for (const [index, record] of (Array.isArray(records) ? records : []).entries()) {
      const now = baseTime + index; const next = { ...record, id: record.id || crypto.randomUUID(), createdAt: record.createdAt || now, updatedAt: now };
      const payload = await localPut(next);
      await idb('queue', 'readwrite', store => store.put({ id: next.id, op: 'put', updatedAt: now, payload })); saved.push(next);
    }
    this.items = [...saved, ...this.items.filter(item => !saved.some(next => next.id === item.id))].sort((a, b) => b.updatedAt - a.updatedAt);
    this.emit(); await this.flush();
    saved.forEach(item => this.mirror({ op: 'put', id: item.id, item }));
    return saved;
  }

  async remove(id) {
    if (this.session.status !== 'signedIn' || this.uid !== OWNER_UID) throw new Error('Owner sign-in is required');
    await localRemove(id);
    this.items = this.items.filter(item => item.id !== id);
    await idb('queue', 'readwrite', store => store.put({ id, op: 'delete', updatedAt: Date.now() }));
    this.emit();
    if (this.uid) await this.flush();
    if (this.uid) this.mirror({ op: 'delete', id });
  }

  async flush() {
    if (!this.uid || !this.db || !navigator.onLine) return;
    const queue = await idb('queue', 'readonly', store => store.getAll());
    for (const change of queue) {
      const target = this.firebase.doc(this.db, 'users', this.uid, 'items', change.id);
      try {
        if (change.op === 'delete') await this.firebase.deleteDoc(target);
        else await this.firebase.setDoc(target, { payload: change.payload, updatedAt: change.updatedAt, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' });
        await idb('queue', 'readwrite', store => store.delete(change.id));
      } catch (error) { console.warn('Firestore write could not be completed.', error?.code || error?.message); this.status = 'offline'; this.emit(); break; }
    }
    if (this.uid) {
      try { await this.firebase.setDoc(this.firebase.doc(this.db, 'users', this.uid), { itemCount: this.items.length, lastSyncedAt: this.firebase.serverTimestamp() }, { merge: true }); }
      catch (error) { console.warn('Firestore sync metadata could not be updated.', error?.code || error?.message); this.status = 'offline'; this.emit(); }
    }
  }

  async idToken() { return this.auth?.currentUser?.uid === OWNER_UID ? this.auth.currentUser.getIdToken() : null; }

  async mirror(change) {
    try {
      const token = await this.idToken(); if (!token) return;
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(change) });
    } catch { /* optional server mirror is retried on the next edit */ }
  }

  async mirrorSnapshot() {
    try {
      const token = await this.idToken(); if (!token) return;
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ op: 'snapshot', items: this.items }) });
    } catch { /* the encrypted Firebase vault remains the source of truth */ }
  }

  async pullTelegramActions() {
    try {
      const token = await this.idToken(); if (!token) return [];
      const response = await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'pull' }) });
      if (!response.ok) return [];
      return (await response.json()).actions || [];
    } catch { return []; }
  }

  async acknowledgeTelegramActions(queueIds) {
    try {
      const token = await this.idToken(); if (!token || !queueIds?.length) return;
      await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'ack', queueIds }) });
    } catch { /* retrying a mutation is safe because record IDs are stable */ }
  }
}

export const vaultStore = new VaultStore();
