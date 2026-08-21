import crypto from 'node:crypto';
import { getAdmin } from './firebaseAdmin.js';
import { serverDecrypt, serverEncrypt } from './serverCrypto.js';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
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
  if (!byteLength || byteLength > MAX_AUDIO_BYTES) throw new Error('Audio files must be 8 MB or smaller');

  const admin = await getAdmin();
  const assetId = crypto.randomUUID();
  const root = audioCollection(admin, uid).doc(assetId);
  const chunks = [];
  for (let offset = 0; offset < base64.length; offset += CHUNK_CHARACTERS) chunks.push(base64.slice(offset, offset + CHUNK_CHARACTERS));

  await root.set({
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
  return { assetId, mimeType, fileName, source, createdAt, byteLength };
}

export async function loadAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) throw new Error('Invalid audio asset ID');
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const [metadataSnapshot, chunksSnapshot] = await Promise.all([root.get(), root.collection('chunks').orderBy('index').get()]);
  if (!metadataSnapshot.exists) return null;
  const metadata = serverDecrypt(metadataSnapshot.data().payload);
  const base64 = chunksSnapshot.docs.map(doc => serverDecrypt(doc.data().payload).data || '').join('');
  if (!base64 || chunksSnapshot.size !== Number(metadata.chunkCount || 0)) throw new Error('The encrypted audio asset is incomplete');
  return { ...metadata, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
}

export async function deleteAudioAsset(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) return false;
  const admin = await getAdmin();
  const root = audioCollection(admin, uid).doc(String(assetId));
  const chunks = await root.collection('chunks').get();
  for (let index = 0; index < chunks.docs.length; index += 100) {
    await Promise.all(chunks.docs.slice(index, index + 100).map(doc => doc.ref.delete()));
  }
  await root.delete();
  return true;
}
