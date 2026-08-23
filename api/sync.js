import { deviceIdFrom, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { deleteVaultItem, linkTelegramChat, readDecryptedVaultItems, replaceVaultSnapshot, writeVaultItem } from '../lib/realtimeVault.js';
import { getUserByCode, getUserByUid } from '../lib/users.js';

export default async function handler(req, res) {
  // Support GET request for pulling current items (reads from Firestore with automatic RTDB fallback)
  if (req.method === 'GET') {
    try {
      const op = String(req.query.op || '').trim();
      if (op === 'migrate') {
        const { runFirestoreToRtdbMigration } = await import('../scripts/migrate-firestore-to-rtdb.mjs');
        const result = await runFirestoreToRtdbMigration();
        return res.status(200).json({ ok: true, migrated: result });
      }

      const uid = String(req.query.uid || '').trim();
      const code = String(req.query.code || '').trim();
      let validUid = null;
      if (code) {
        const u = getUserByCode(code);
        if (u) validUid = u.uid;
      }
      if (uid && (!validUid || validUid === uid)) validUid = uid;
      if (!validUid) return res.status(200).json({ ok: true, items: [] });
      const items = await readDecryptedVaultItems(validUid);
      return res.status(200).json({ ok: true, items: items || [] });
    } catch (err) {
      console.warn('GET /api/sync fallback:', err.message);
      return res.status(200).json({ ok: true, items: [] });
    }
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
    if (!uid) return res.status(200).json({ ok: true, mirrored: 'guest-offline' });

    const chatId = getUserByUid(uid)?.telegramChatId;
    if (chatId) await linkTelegramChat(chatId, uid);

    if (body.op === 'snapshot') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 1000);
      if (JSON.stringify(items).length > 1000000) return res.status(413).json({ error: 'Snapshot too large' });
      await replaceVaultSnapshot(uid, items);
      return res.status(200).json({ ok: true, mirrored: 'realtime-database' });
    }

    const id = String(body.id || body.item?.id || '');
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(id)) return res.status(400).json({ error: 'Invalid record ID' });

    if (body.op === 'delete') {
      await deleteVaultItem(uid, id);
      return res.status(200).json({ ok: true, mirrored: 'realtime-database' });
    }

    const item = body.item || { id, updatedAt: body.updatedAt || Date.now() };
    const serialized = JSON.stringify(item);
    if (serialized.length > 100000) return res.status(413).json({ error: 'Record too large' });

    await writeVaultItem(uid, item, body.payload);
    return res.status(200).json({ ok: true, mirrored: 'realtime-database' });
  } catch (error) {
    console.error('Secure sync failed:', error?.message);
    return res.status(200).json({ ok: true, mirrored: 'runtime-fallback' });
  }
}