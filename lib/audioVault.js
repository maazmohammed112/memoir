import crypto from 'node:crypto';
import { getAdmin } from './firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from './serverCrypto.js';
import { isR2Configured, r2Request } from './r2Storage.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const CHUNK_CHARACTERS = 240000;

export function cleanAudioBase64(value) {
  return String(value || '').replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
}

function audioCollection(admin, uid) {
  return admin.firestore().collection('secureAudio').doc(uid).collection('items');
}

export async function saveAudioAsset(uid, { data, mimeType = 'audio/ogg', fileName = 'voice-memo', source = 'app', createdAt = Date.now() }) {
  const base64 = cleanAudioBase64(data);
  if (!base64 || !/^[a-z0-9+/]+={0,2}$/i.test(base64)) throw new Error('The audio file is not valid base64 data');
  const byteLength = Buffer.byteLength(base64, 'base64');
  if (!byteLength || byteLength > MAX_AUDIO_BYTES) throw new Error('Audio files must be 25 MB or smaller');

  const admin = await getAdmin();
  const assetId = crypto.randomUUID();
  const encryptedPayload = JSON.stringify(serverEncrypt(base64));

  if (isR2Configured()) {
    try {
      const r2Key = `voice-memos/${uid}/${assetId}`;
      const res = await r2Request('PUT', r2Key, Buffer.from(encryptedPayload, 'utf8'), {
        'content-type': 'application/json',
      });
      if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);

      const root = audioCollection(admin, uid).doc(assetId);
      await root.set({
        storage: 'r2',
        r2Key,
        mimeType: String(mimeType).slice(0, 100),
        fileName: String(fileName).slice(0, 240),
        source: String(source).slice(0, 40),
        byteLength,
        createdAt: Number(createdAt) || Date.now(),
      });

      return { assetId, storage: 'r2', mimeType, fileName, source, createdAt, byteLength };
    } catch (r2Err) {
      console.warn('R2 voice memo upload failed, using Firestore fallback:', r2Err?.message);
    }
  }

  // Firestore chunked fallback
  const root = audioCollection(admin, uid).doc(assetId);
  const chunks = [];
  for (let offset = 0; offset < base64.length; offset += CHUNK_CHARACTERS) chunks.push(base64.slice(offset, offset + CHUNK_CHARACTERS));

  await root.set({
    storage: 'firestore',
    payload: serverEncrypt({ mimeType: String(mimeType).slice(0, 100), fileName: String(fileName).slice(0, 240), source: String(source).slice(0, 40), createdAt: Number(createdAt) || Date.now(), byteLength, chunkCount: chunks.length }),
    createdAt: Number(createdAt) || Date.now(),
    chunkCount: chunks.length,
  });
  const chunkCollection = root.collection('chunks');
  for (let index = 0; index < chunks.length; index += 10) {
    await Promise.all(chunks.slice(index, index + 10).map((chunk, batchIndex) => {
      const chunkIndex = index + batchIndex;
      return chunkCollection.doc(String(chunkIndex).padStart(5, '0')).set({ index: chunkIndex, payload: serverEncrypt({ data: chunk }) });
    }));
  }
  return { assetId, storage: 'firestore', mimeType, fileName, source, createdAt, byteLength };
}

export async function loadAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) throw new Error('Invalid audio asset ID');
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const metadataSnapshot = await root.get();
  if (!metadataSnapshot.exists) return null;
  const rawMeta = metadataSnapshot.data();

  if (rawMeta.storage === 'r2' && rawMeta.r2Key && isR2Configured()) {
    try {
      const res = await r2Request('GET', rawMeta.r2Key);
      if (res.ok) {
        const encryptedText = await res.text();
        const base64 = serverDecrypt(JSON.parse(encryptedText));
        return { ...rawMeta, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
      }
    } catch (r2Err) {
      console.warn('R2 load failed, checking fallback:', r2Err?.message);
    }
  }

  // Firestore fallback loading
  const metadata = rawMeta.payload ? serverDecrypt(rawMeta.payload) : rawMeta;
  const chunksSnapshot = await root.collection('chunks').orderBy('index').get();
  const base64 = chunksSnapshot.docs.map(doc => serverDecrypt(doc.data().payload).data || '').join('');
  if (!base64) throw new Error('The encrypted audio asset is incomplete or unavailable');
  return { ...metadata, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
}

export async function deleteAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) return false;
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const doc = await root.get();
  if (doc.exists) {
    const data = doc.data();
    if (data.storage === 'r2' && data.r2Key && isR2Configured()) {
      try { await r2Request('DELETE', data.r2Key); } catch { /* ignore */ }
    }
  }
  const chunks = await root.collection('chunks').get();
  for (let index = 0; index < chunks.docs.length; index += 100) {
    await Promise.all(chunks.docs.slice(index, index + 100).map(item => item.ref.delete()));
  }
  await root.delete();
  return true;
}
