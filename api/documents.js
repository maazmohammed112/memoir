import { deviceIdFrom, verifyOwnerToken } from '../lib/firebaseAdmin.js';
import { deleteVaultDocument, loadVaultDocument, saveVaultDocument } from '../lib/r2Storage.js';

function bearer(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

export default async function handler(req, res) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Missing identity token' });
    const identity = await verifyOwnerToken(token, deviceIdFrom(req));

    if (req.method === 'POST') {
      const body = req.body || {};
      const saved = await saveVaultDocument(identity.uid, {
        data: body.data,
        mimeType: body.mimeType || 'application/pdf',
        fileName: body.fileName || 'document',
        source: 'app',
        createdAt: body.createdAt || Date.now(),
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({ ok: true, ...saved });
    }

    if (req.method === 'GET') {
      const asset = await loadVaultDocument(identity.uid, req.query?.id);
      if (!asset) return res.status(404).json({ error: 'Document not found' });
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', String(asset.data.length));
      return res.status(200).send(asset.data);
    }

    if (req.method === 'DELETE') {
      await deleteVaultDocument(identity.uid, req.query?.id || req.body?.id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Document vault request failed:', error?.message);
    const status = /50 MB|invalid document/i.test(error?.message || '') ? 400 : Number(error?.status || 503);
    return res.status(status).json({ error: status === 400 ? error.message : 'The encrypted document vault is temporarily unavailable' });
  }
}
