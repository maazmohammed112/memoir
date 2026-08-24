import { deviceIdFrom, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { deleteVaultItem, linkTelegramChat, readDecryptedVaultItems, replaceVaultSnapshot, writeVaultItem } from '../lib/realtimeVault.js';
import { getUserByUid } from '../lib/users.js';

export default async function handler(req, res) {
  // Authenticated pull for the current owner. RTDB is the primary source.
  if (req.method === 'GET') {
    try {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const identity = await verifyOwnerToken(token, deviceIdFrom(req));
      const requestedUid = String(req.query.uid || identity.uid).trim();
      if (requestedUid !== identity.uid) return res.status(403).json({ error: 'Owner isolation check failed.' });
      const items = await readDecryptedVaultItems(identity.uid);
      return res.status(200).json({ ok: true, source: 'realtime-database', items: items || [] });
    } catch (err) {
      console.warn('GET /api/sync failed:', err.message);
      return res.status(err?.status || 503).json({ ok: false, error: err?.message || 'Vault sync is temporarily unavailable.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const body = req.body || {};
    const identity = await verifyOwnerToken(token, deviceIdFrom(req));
    const uid = identity.uid;

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
    return res.status(error?.status || 503).json({ ok: false, error: error?.message || 'Secure sync is temporarily unavailable.' });
  }
}
