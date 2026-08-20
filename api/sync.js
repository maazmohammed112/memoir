import { getAdmin, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { serverEncrypt } from '../lib/serverCrypto.js';
import { putRuntimeItem, removeRuntimeItem, replaceRuntimeItems } from '../lib/runtimeVault.js';
import { getUserByUid } from '../lib/users.js';

const hasAdminMirror = () => Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_FILE) && process.env.VAULT_SERVER_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing identity token' });
    const identity = await verifyOwnerToken(token); const body = req.body || {};
    if (body.op === 'snapshot') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 1000);
      if (JSON.stringify(items).length > 1000000) return res.status(413).json({ error: 'Snapshot too large' });
      replaceRuntimeItems(identity.uid, items);
      if (hasAdminMirror()) {
        const admin = await getAdmin(); const collection = admin.firestore().collection('secureVault').doc(identity.uid).collection('items'); const existing = await collection.get();
        const incomingIds = new Set(items.map(item => item.id)); const writes = [];
        existing.docs.filter(doc => !incomingIds.has(doc.id)).forEach(doc => writes.push(() => doc.ref.delete()));
        items.forEach(item => writes.push(() => collection.doc(item.id).set({ payload: serverEncrypt(item), updatedAt: Date.now() })));
        for (let index = 0; index < writes.length; index += 20) await Promise.all(writes.slice(index, index + 20).map(write => write()));
        const chatId = getUserByUid(identity.uid)?.telegramChatId; if (chatId) await admin.firestore().collection('telegramLinks').doc(chatId).set({ uid: identity.uid, updatedAt: Date.now() }, { merge: true });
        return res.status(200).json({ ok: true, mirrored: 'firestore' });
      }
      return res.status(200).json({ ok: true, mirrored: 'runtime' });
    }
    const id = String(body.id || body.item?.id || ''); if (!/^[a-zA-Z0-9-]{8,100}$/.test(id)) return res.status(400).json({ error: 'Invalid record ID' });
    if (body.op === 'delete') removeRuntimeItem(identity.uid, id);
    else { const serialized = JSON.stringify(body.item || {}); if (serialized.length > 100000) return res.status(413).json({ error: 'Record too large' }); putRuntimeItem(identity.uid, body.item); }

    if (!hasAdminMirror()) return res.status(200).json({ ok: true, mirrored: 'runtime' });
    const admin = await getAdmin(); const ref = admin.firestore().collection('secureVault').doc(identity.uid).collection('items').doc(id);
    if (body.op === 'delete') await ref.delete();
    else await ref.set({ payload: serverEncrypt(body.item), updatedAt: Date.now() });
    const chatId = getUserByUid(identity.uid)?.telegramChatId;
    if (chatId) await admin.firestore().collection('telegramLinks').doc(chatId).set({ uid: identity.uid, updatedAt: Date.now() }, { merge: true });
    return res.status(200).json({ ok: true, mirrored: 'firestore' });
  } catch (error) { console.error('Secure mirror failed:', error?.message); return res.status(Number(error?.status || 503)).json({ error: error?.status === 403 ? 'This user is not approved for the vault' : 'Secure server mirror is not configured yet' }); }
}
