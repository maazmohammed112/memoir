import { deviceIdFrom, getAdmin, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverEncrypt } from '../lib/serverCrypto.js';
import { getRuntimeItems, putRuntimeItem, removeRuntimeItem, replaceRuntimeItems } from '../lib/runtimeVault.js';
import { getUserByCode, getUserByUid } from '../lib/users.js';

const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

export default async function handler(req, res) {
  // Support GET request for pulling current runtime/cloud items
  if (req.method === 'GET') {
    const uid = String(req.query.uid || '').trim();
    const code = String(req.query.code || '').trim();
    let validUid = null;
    if (code) {
      const u = getUserByCode(code);
      if (u) validUid = u.uid;
    }
    if (uid && (!validUid || validUid === uid)) validUid = uid;
    if (!validUid) return res.status(401).json({ error: 'Unauthorized' });
    const items = getRuntimeItems(validUid);
    return res.status(200).json({ ok: true, items });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    let uid = null;
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const body = req.body || {};
    if (token) {
      try {
        const identity = await verifyOwnerToken(token, deviceIdFrom(req));
        uid = identity?.uid;
      } catch (err) {
        console.warn('Identity token verification failed:', err.message);
      }
    }
    if (!uid && body.code) {
      const user = getUserByCode(body.code);
      if (user && (!body.uid || user.uid === body.uid)) {
        uid = user.uid;
      }
    }
    if (!uid && body.uid) {
      const user = getUserByUid(body.uid);
      if (user) uid = user.uid;
    }
    if (!uid) return res.status(401).json({ error: 'Missing or invalid authentication token' });

    if (body.op === 'snapshot') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 1000);
      if (JSON.stringify(items).length > 1000000) return res.status(413).json({ error: 'Snapshot too large' });
      replaceRuntimeItems(uid, items);
      if (hasAdminMirror()) {
        try {
          const admin = await getAdmin();
          const collection = admin.firestore().collection('secureVault').doc(uid).collection('items');
          const existing = await collection.get();
          const incomingIds = new Set(items.map(item => item.id));
          const writes = [];
          existing.docs.filter(doc => !incomingIds.has(doc.id)).forEach(doc => writes.push(() => doc.ref.delete()));
          items.forEach(item => writes.push(() => collection.doc(item.id).set({ payload: serverEncrypt(item), updatedAt: Date.now() })));
          for (let index = 0; index < writes.length; index += 20) await Promise.all(writes.slice(index, index + 20).map(write => write()));
          const chatId = getUserByUid(uid)?.telegramChatId;
          if (chatId) await admin.firestore().collection('telegramLinks').doc(chatId).set({ uid, updatedAt: Date.now() }, { merge: true });
          return res.status(200).json({ ok: true, mirrored: 'firestore' });
        } catch (dbErr) {
          console.warn('Firestore mirror skipped, runtime saved:', dbErr.message);
          return res.status(200).json({ ok: true, mirrored: 'runtime' });
        }
      }
      return res.status(200).json({ ok: true, mirrored: 'runtime' });
    }

    const id = String(body.id || body.item?.id || '');
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(id)) return res.status(400).json({ error: 'Invalid record ID' });

    if (body.op === 'delete') {
      removeRuntimeItem(uid, id);
    } else {
      const serialized = JSON.stringify(body.item || {});
      if (serialized.length > 100000) return res.status(413).json({ error: 'Record too large' });
      putRuntimeItem(uid, body.item);
    }

    if (!hasAdminMirror()) return res.status(200).json({ ok: true, mirrored: 'runtime' });
    try {
      const admin = await getAdmin();
      const ref = admin.firestore().collection('secureVault').doc(uid).collection('items').doc(id);
      if (body.op === 'delete') {
        await ref.delete();
      } else {
        await ref.set({ payload: serverEncrypt(body.item), updatedAt: Date.now() });
      }
      const chatId = getUserByUid(uid)?.telegramChatId;
      if (chatId) await admin.firestore().collection('telegramLinks').doc(chatId).set({ uid, updatedAt: Date.now() }, { merge: true });
      return res.status(200).json({ ok: true, mirrored: 'firestore' });
    } catch (dbErr) {
      console.warn('Firestore single item mirror skipped, runtime saved:', dbErr.message);
      return res.status(200).json({ ok: true, mirrored: 'runtime' });
    }
  } catch (error) {
    console.error('Secure mirror failed:', error?.message);
    return res.status(200).json({ ok: true, mirrored: 'runtime-fallback' });
  }
}