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

function audioRealtimeRef(admin, uid, assetId) {
  return admin.database().ref(`secureAudio/${uid}/items/${assetId}`);
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

      const metadata = {
        storage: 'r2',
        r2Key,
        mimeType: String(mimeType).slice(0, 100),
        fileName: String(fileName).slice(0, 240),
        source: String(source).slice(0, 40),
        byteLength,
        createdAt: Number(createdAt) || Date.now(),
      };
      await audioRealtimeRef(admin, uid, assetId).set(metadata);
      audioCollection(admin, uid).doc(assetId).set(metadata).catch(error => console.warn('Firestore audio metadata mirror skipped:', error?.message || error));

      return { assetId, storage: 'r2', mimeType, fileName, source, createdAt, byteLength };
    } catch (r2Err) {
      console.warn('R2 voice memo upload failed, using Realtime Database fallback:', r2Err?.message);
    }
  }

  // RTDB chunked fallback when R2 is unavailable.
  const chunks = [];
  for (let offset = 0; offset < base64.length; offset += CHUNK_CHARACTERS) chunks.push(base64.slice(offset, offset + CHUNK_CHARACTERS));
  const metadata = {
    storage: 'rtdb',
    payload: serverEncrypt({ mimeType: String(mimeType).slice(0, 100), fileName: String(fileName).slice(0, 240), source: String(source).slice(0, 40), createdAt: Number(createdAt) || Date.now(), byteLength, chunkCount: chunks.length }),
    createdAt: Number(createdAt) || Date.now(),
    chunkCount: chunks.length,
    chunks: Object.fromEntries(chunks.map((chunk, index) => [`chunk_${String(index).padStart(5, '0')}`, { index, payload: serverEncrypt({ data: chunk }) }])),
  };
  await audioRealtimeRef(admin, uid, assetId).set(metadata);
  audioCollection(admin, uid).doc(assetId).set({
    storage: metadata.storage,
    payload: metadata.payload,
    createdAt: metadata.createdAt,
    chunkCount: metadata.chunkCount,
  }).catch(error => console.warn('Firestore audio metadata mirror skipped:', error?.message || error));
  return { assetId, storage: 'rtdb', mimeType, fileName, source, createdAt, byteLength };
}

export async function loadAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) throw new Error('Invalid audio asset ID');
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const realtimeSnapshot = await audioRealtimeRef(admin, uid, String(assetId)).get().catch(() => null);
  let rawMeta = realtimeSnapshot?.exists() ? realtimeSnapshot.val() : null;
  if (!rawMeta) {
    const metadataSnapshot = await root.get();
    if (!metadataSnapshot.exists) return null;
    rawMeta = metadataSnapshot.data();
  }

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

  // RTDB chunks are primary for non-R2 legacy assets.
  const metadata = rawMeta.payload ? serverDecrypt(rawMeta.payload) : rawMeta;
  const realtimeChunks = Object.values(rawMeta.chunks || {}).sort((left, right) => Number(left?.index || 0) - Number(right?.index || 0));
  if (realtimeChunks.length) {
    const base64 = realtimeChunks.map(chunk => serverDecrypt(chunk.payload).data || '').join('');
    if (!base64) throw new Error('The encrypted audio asset is incomplete or unavailable');
    return { ...metadata, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
  }

  // Firestore recovery for assets not yet present in RTDB.
  const chunksSnapshot = await root.collection('chunks').orderBy('index').get();
  const base64 = chunksSnapshot.docs.map(doc => serverDecrypt(doc.data().payload).data || '').join('');
  if (!base64) throw new Error('The encrypted audio asset is incomplete or unavailable');
  return { ...metadata, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
}

export async function deleteAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) return false;
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const realtimeRef = audioRealtimeRef(admin, uid, String(assetId));
  const realtimeSnapshot = await realtimeRef.get().catch(() => null);
  const firestoreSnapshot = realtimeSnapshot?.exists() ? null : await root.get().catch(() => null);
  const data = realtimeSnapshot?.exists() ? realtimeSnapshot.val() : firestoreSnapshot?.data?.();
  if (data?.storage === 'r2' && data.r2Key && isR2Configured()) {
    try { await r2Request('DELETE', data.r2Key); } catch { /* ignore */ }
  }
  await realtimeRef.remove();
  root.delete().catch(() => {});
  return true;
}
