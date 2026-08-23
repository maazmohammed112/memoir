import { getAdmin } from './firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from './serverCrypto.js';
import { listRuntimeItems, putRuntimeItem, removeRuntimeItem, replaceRuntimeItems } from './runtimeVault.js';

function isQuotaExhausted(error) {
  if (!error) return false;
  return Number(error.code) === 8 ||
    /RESOURCE_EXHAUSTED|quota exceeded|quota-exhausted|deadline exceeded|service unavailable/i.test(error.message || '');
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

    // 1. Primary write to Realtime Database (Unlimited operations, no daily caps)
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
  if (list.length > 0) {
    replaceRuntimeItems(uid, list);
  }

  try {
    const admin = await getAdmin();
    const db = admin.database();

    // If incoming snapshot is empty, don't wipe existing RTDB data
    if (list.length === 0) {
      const existing = await db.ref(`secureVault/${uid}/items`).get().catch(() => null);
      if (existing && existing.exists() && Object.keys(existing.val() || {}).length > 0) {
        console.warn(`Preserving existing RTDB data for ${uid}; skipping empty snapshot overwrite.`);
        return;
      }
    }

    // 1. Primary write to Realtime Database
    const secureObj = {};
    const usersObj = {};
    list.forEach(item => {
      if (!item?.id) return;
      const enc = serverEncrypt(item);
      const now = Number(item.updatedAt || Date.now());
      secureObj[item.id] = { payload: enc, updatedAt: now };
      usersObj[item.id] = { payload: enc, updatedAt: now, encryption: 'AES-256-GCM', recordType: 'encrypted-vault-item' };
    });

    await db.ref(`secureVault/${uid}/items`).set(secureObj);
    await db.ref(`users/${uid}/items`).set(usersObj);

    // 2. Best-effort mirror to Firestore
    try {
      const firestore = admin.firestore();
      const secureCol = firestore.collection('secureVault').doc(uid).collection('items');
      const userCol = firestore.collection('users').doc(uid).collection('items');
      const existingSecure = await secureCol.get().catch(() => ({ docs: [] }));
      const existingUser = await userCol.get().catch(() => ({ docs: [] }));
      const incomingIds = new Set(list.map(i => i.id));
      const writes = [];

      existingSecure.docs.filter(doc => !incomingIds.has(doc.id)).forEach(doc => writes.push(() => secureCol.doc(doc.id).delete().catch(() => {})));
      existingUser.docs.filter(doc => !incomingIds.has(doc.id)).forEach(doc => writes.push(() => userCol.doc(doc.id).delete().catch(() => {})));

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
 * Tries Firestore first; automatically falls back to Realtime Database on quota exhaustion / error.
 */
export async function readDecryptedVaultItems(uid) {
  if (!uid) return [];
  const runtimeList = listRuntimeItems(uid);

  try {
    const admin = await getAdmin();
    let rawDocs = [];

    // 1. Attempt read from Firestore secureVault
    try {
      const snapshot = await admin.firestore().collection('secureVault').doc(uid).collection('items').get();
      if (snapshot && !snapshot.empty) {
        rawDocs.push(...snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }
    } catch (fsErr) {
      if (isQuotaExhausted(fsErr) || fsErr.code === 8) {
        console.warn(`Firestore read quota exhausted for ${uid}. Seamlessly falling back to Realtime Database.`);
      } else {
        console.warn(`Firestore read failed (${fsErr.message}), reading from Realtime Database.`);
      }
    }

    // 2. Read from Realtime Database secureVault
    try {
      const rtdbSnapshot = await admin.database().ref(`secureVault/${uid}/items`).get();
      if (rtdbSnapshot.exists()) {
        const val = rtdbSnapshot.val() || {};
        Object.entries(val).forEach(([id, data]) => {
          rawDocs.push({ ...(data || {}), id });
        });
      }
    } catch (rtdbErr) {
      console.warn('RTDB secureVault read fallback:', rtdbErr.message);
    }

    // 3. Check users collection in Realtime Database if still empty
    if (!rawDocs.length) {
      try {
        const userSnap = await admin.database().ref(`users/${uid}/items`).get();
        if (userSnap.exists()) {
          const val = userSnap.val() || {};
          Object.entries(val).forEach(([id, data]) => {
            rawDocs.push({ ...(data || {}), id });
          });
        }
      } catch {}
    }

    const itemsMap = new Map();
    for (const doc of rawDocs) {
      const payload = doc?.payload;
      if (!payload) continue;
      try {
        const decrypted = serverDecrypt(payload);
        if (decrypted && decrypted.id) {
          itemsMap.set(decrypted.id, decrypted);
          putRuntimeItem(uid, decrypted);
        }
      } catch { /* client-only key encryption */ }
    }

    const items = Array.from(itemsMap.values());
    if (items.length > 0) return items;
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
