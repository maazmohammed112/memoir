import { getAdmin } from './firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from './serverCrypto.js';
import { listRuntimeItems, putRuntimeItem, removeRuntimeItem, replaceRuntimeItems } from './runtimeVault.js';

function isQuotaExhausted(error) {
  if (!error) return false;
  return Number(error.code) === 8 ||
    /RESOURCE_EXHAUSTED|quota exceeded|quota-exhausted|deadline exceeded|service unavailable/i.test(error.message || '');
}

const hasPrivateToken = value => /\[\[PRIVATE_\d+\]\]/.test(String(value ?? ''));
function mergeRecoveredItem(current, candidate) {
  if (!current) return candidate;
  if (!candidate) return current;
  const newer = Number(candidate.updatedAt || 0) >= Number(current.updatedAt || 0) ? candidate : current;
  const older = newer === candidate ? current : candidate;
  const fields = { ...(newer.fields || {}) };
  for (const [label, value] of Object.entries(older.fields || {})) if (!(label in fields) || (hasPrivateToken(fields[label]) && !hasPrivateToken(value))) fields[label] = value;
  return { ...newer, fields };
}
function decryptCandidates(docs, map) {
  for (const doc of docs) try { const item = serverDecrypt(doc?.payload); if (item?.id) map.set(item.id, mergeRecoveredItem(map.get(item.id), item)); } catch { /* client-key ciphertext remains private */ }
}

/**
 * Write a single vault item to Realtime Database and attempt best-effort mirror to Firestore.
 */
export async function writeVaultItem(uid, item, clientPayload = '') {
  if (!uid || !item?.id) return;
  const id = String(item.id);
  const now = Number(item.updatedAt || Date.now());
  const encServerPayload = serverEncrypt(item);
  const payloadToStore = clientPayload || encServerPayload;

  // In-memory runtime cache
  putRuntimeItem(uid, item);

  try {
    const admin = await getAdmin();
    const db = admin.database();

    // 1. Primary write to Realtime Database (metered by storage/transfer, not per-operation quotas)
    const rtdbUpdates = {
      [`secureVault/${uid}/items/${id}`]: { payload: encServerPayload, updatedAt: now },
      [`users/${uid}/items/${id}`]: { payload: payloadToStore, updatedAt: now, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' },
    };
    await db.ref().update(rtdbUpdates);

    // 2. Best-effort asynchronous mirror to Firestore
    try {
      const firestore = admin.firestore();
      const userRef = firestore.collection('users').doc(uid).collection('items').doc(id);
      const secureRef = firestore.collection('secureVault').doc(uid).collection('items').doc(id);
      await Promise.all([
        userRef.set({ payload: payloadToStore, updatedAt: now, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' }),
        secureRef.set({ payload: encServerPayload, updatedAt: now }),
      ]);
    } catch (fsErr) {
      if (isQuotaExhausted(fsErr)) {
        console.warn(`Firestore quota exhausted during item write (${id}). RTDB write succeeded.`);
      } else {
        console.warn(`Firestore mirror write failed (${id}):`, fsErr.message);
      }
    }
  } catch (err) {
    console.error(`Database write failed for item ${id}:`, err.message);
    throw err;
  }
}

/**
 * Delete a vault item from Realtime Database and mirror to Firestore.
 */
export async function deleteVaultItem(uid, id) {
  if (!uid || !id) return;
  removeRuntimeItem(uid, id);

  try {
    const admin = await getAdmin();
    const db = admin.database();

    // 1. Primary delete from Realtime Database
    const rtdbUpdates = {
      [`secureVault/${uid}/items/${id}`]: null,
      [`users/${uid}/items/${id}`]: null,
    };
    await db.ref().update(rtdbUpdates);

    // 2. Best-effort asynchronous Firestore delete
    try {
      const firestore = admin.firestore();
      const userRef = firestore.collection('users').doc(uid).collection('items').doc(id);
      const secureRef = firestore.collection('secureVault').doc(uid).collection('items').doc(id);
      await Promise.all([
        userRef.delete().catch(() => {}),
        secureRef.delete().catch(() => {}),
      ]);
    } catch (fsErr) {
      console.warn(`Firestore delete mirror skipped for ${id}:`, fsErr.message);
    }
  } catch (err) {
    console.error(`Database delete failed for item ${id}:`, err.message);
    throw err;
  }
}

/**
 * Replace entire vault snapshot in Realtime Database and mirror to Firestore.
 */
export async function replaceVaultSnapshot(uid, items) {
  if (!uid) return;
  const list = (Array.isArray(items) ? items : []).slice(0, 1000);
  if (!list.length) return;
  replaceRuntimeItems(uid, list);

  try {
    const admin = await getAdmin();
    const db = admin.database();

    // 1. Merge into RTDB. Snapshot sync never deletes records; explicit delete operations do.
    const rtdbUpdates = {};
    list.forEach(item => {
      if (!item?.id) return;
      const enc = serverEncrypt(item);
      const now = Number(item.updatedAt || Date.now());
      rtdbUpdates[`secureVault/${uid}/items/${item.id}`] = { payload: enc, updatedAt: now };
      rtdbUpdates[`users/${uid}/items/${item.id}`] = { payload: enc, updatedAt: now, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' };
    });
    await db.ref().update(rtdbUpdates);

    // 2. Best-effort mirror to Firestore
    try {
      const firestore = admin.firestore();
      const secureCol = firestore.collection('secureVault').doc(uid).collection('items');
      const userCol = firestore.collection('users').doc(uid).collection('items');
      const writes = [];

      list.forEach(item => {
        if (!item?.id) return;
        const enc = serverEncrypt(item);
        const now = Number(item.updatedAt || Date.now());
        writes.push(() => secureCol.doc(item.id).set({ payload: enc, updatedAt: now }));
        writes.push(() => userCol.doc(item.id).set({ payload: enc, updatedAt: now, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' }));
      });

      for (let index = 0; index < writes.length; index += 20) {
        await Promise.all(writes.slice(index, index + 20).map(w => w()));
      }
    } catch (fsErr) {
      console.warn('Firestore snapshot mirror skipped:', fsErr.message);
    }
  } catch (err) {
    console.error(`Database snapshot replacement failed for ${uid}:`, err.message);
    throw err;
  }
}

/**
 * Read all decrypted vault items for a user.
 * Realtime Database is primary; Firestore is a recovery source only when RTDB is empty.
 */
export async function readDecryptedVaultItems(uid) {
  if (!uid) return [];
  const runtimeList = listRuntimeItems(uid);

  try {
    const admin = await getAdmin();
    const itemsMap = new Map((runtimeList || []).filter(item => item?.id).map(item => [item.id, item]));
    const rawDocs = [];

    // 1. Fast primary read from Realtime Database.
    try {
      const [secureSnapshot, userSnapshot] = await Promise.all([admin.database().ref(`secureVault/${uid}/items`).get(), admin.database().ref(`users/${uid}/items`).get()]);
      for (const snapshot of [secureSnapshot, userSnapshot]) if (snapshot.exists()) rawDocs.push(...Object.entries(snapshot.val() || {}).map(([id, data]) => ({ ...(data || {}), id })));
    } catch (rtdbError) {
      console.warn(`Realtime Database vault read failed for ${uid}:`, rtdbError?.message || rtdbError);
    }

    decryptCandidates(rawDocs, itemsMap);
    let recoveryNeeded = !rawDocs.length || Array.from(itemsMap.values()).some(item => Object.values(item.fields || {}).some(hasPrivateToken));
    try { recoveryNeeded ||= !(await admin.database().ref(`migrationStatus/${uid}/firestoreVaultRecoveredAt`).get()).exists(); } catch { recoveryNeeded = true; }
    let recoveryCompleted = false;
    if (recoveryNeeded) {
      try {
        const firestore = admin.firestore();
        const [secureSnapshot, userSnapshot] = await Promise.all([firestore.collection('secureVault').doc(uid).collection('items').get(), firestore.collection('users').doc(uid).collection('items').get()]);
        decryptCandidates([...(secureSnapshot?.docs || []).map(document => ({ ...document.data(), id: document.id })), ...(userSnapshot?.docs || []).map(document => ({ ...document.data(), id: document.id }))], itemsMap);
        recoveryCompleted = true;
      } catch (firestoreError) {
        if (isQuotaExhausted(firestoreError)) console.warn(`Firestore recovery read quota is exhausted for ${uid}.`);
        else console.warn(`Firestore recovery read failed for ${uid}:`, firestoreError?.message || firestoreError);
      }
    }

    const items = Array.from(itemsMap.values());
    items.forEach(item => putRuntimeItem(uid, item));
    if (recoveryCompleted && items.length) {
      const updates = { [`migrationStatus/${uid}/firestoreVaultRecoveredAt`]: Date.now() };
      for (const item of items) { const payload = serverEncrypt(item); updates[`secureVault/${uid}/items/${item.id}`] = { payload, updatedAt: Number(item.updatedAt || Date.now()) }; }
      await admin.database().ref().update(updates).catch(() => {});
    }
    if (items.length > 0) return items.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return runtimeList || [];
  } catch (err) {
    console.warn(`Dual-tier read fallback encountered error: ${err.message}. Returning runtime items.`);
    return runtimeList || [];
  }
}

/**
 * Action queue operations in Realtime Database with Firestore mirroring.
 */
export async function enqueueTelegramAction(uid, action, source = 'telegram') {
  if (!uid || !action) return null;
  const queueId = crypto.randomUUID();
  const item = { queueId, source, createdAt: Date.now(), action: structuredClone(action) };

  try {
    const admin = await getAdmin();
    await admin.database().ref(`telegramActionQueue/${uid}/${queueId}`).set(item);

    // Best-effort Firestore mirror
    admin.firestore().collection('telegramActionQueue').doc(uid).collection('items').doc(queueId).set(item).catch(() => {});
  } catch (err) {
    console.warn('Action enqueue failed, falling back to runtime queue:', err.message);
  }
  return item;
}

export async function pullTelegramActionQueue(uid) {
  if (!uid) return [];
  try {
    const admin = await getAdmin();
    // Try Realtime Database primary
    const snapshot = await admin.database().ref(`telegramActionQueue/${uid}`).get();
    if (snapshot.exists()) {
      const data = snapshot.val() || {};
      return Object.values(data).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    // Secondary: Firestore
    const fsSnapshot = await admin.firestore().collection('telegramActionQueue').doc(uid).collection('items').orderBy('createdAt').limit(100).get().catch(() => ({ docs: [] }));
    return fsSnapshot.docs.map(doc => doc.data());
  } catch {
    return [];
  }
}

export async function acknowledgeTelegramActionQueue(uid, ids) {
  if (!uid || !Array.isArray(ids) || !ids.length) return;
  try {
    const admin = await getAdmin();
    const updates = {};
    ids.forEach(id => { updates[`telegramActionQueue/${uid}/${id}`] = null; });
    await admin.database().ref().update(updates);

    // Secondary: Firestore
    const fsCol = admin.firestore().collection('telegramActionQueue').doc(uid).collection('items');
    ids.forEach(id => fsCol.doc(id).delete().catch(() => {}));
  } catch (err) {
    console.warn('Acknowledge queue failed:', err.message);
  }
}

/**
 * Telegram link association (chatId -> uid mapping) in Realtime Database & Firestore.
 */
export async function linkTelegramChat(chatId, uid) {
  if (!chatId || !uid) return;
  try {
    const admin = await getAdmin();
    await admin.database().ref(`telegramLinks/${chatId}`).set({ uid, updatedAt: Date.now() });
    admin.firestore().collection('telegramLinks').doc(String(chatId)).set({ uid, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('Telegram link save failed:', err.message);
  }
}
