import crypto from 'node:crypto';
import { serverDecrypt, serverEncrypt } from './serverCrypto.js';
import { getAdmin } from './firebaseAdmin.js';

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

function documentCollection(admin, uid) {
  return admin.firestore().collection('secureDocuments').doc(uid).collection('items');
}

function documentRealtimeRef(admin, uid, assetId) {
  return admin.database().ref(`secureDocuments/${uid}/items/${assetId}`);
}

function r2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'memoir-vault',
    region: 'auto',
  };
}

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export async function r2Request(method, key, body = null, extraHeaders = {}) {
  const { accountId, accessKeyId, secretAccessKey, bucketName, region } = r2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 is not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.');
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeURIComponent(bucketName)}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const payloadHash = body ? hash(body) : hash('');

  const headers = {
    host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    ...extraHeaders,
  };

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(name => `${name.toLowerCase()}:${String(headers[name]).trim()}\n`)
    .join('');

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(name => name.toLowerCase())
    .join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${endpoint}${canonicalUri}`, {
    method,
    headers: {
      ...headers,
      Authorization: authorizationHeader,
    },
    body: body || undefined,
  });

  return response;
}

export async function saveVaultDocument(uid, { data, mimeType = 'application/pdf', fileName = 'document', source = 'app', createdAt = Date.now() }) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data || '').replace(/^data:[^,]*;base64,/i, ''), 'base64');
  if (!buffer.length) throw new Error('File data is empty');
  if (buffer.length > 50 * 1024 * 1024) throw new Error('File size exceeds 50 MB limit');

  const assetId = crypto.randomUUID();
  const encryptedPayload = JSON.stringify(serverEncrypt(buffer.toString('base64')));

  if (isR2Configured()) {
    try {
      const r2Key = `vault-assets/${uid}/${assetId}`;
      const res = await r2Request('PUT', r2Key, Buffer.from(encryptedPayload, 'utf8'), {
        'content-type': 'application/json',
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Cloudflare R2 upload failed (${res.status}): ${errText}`);
      }

      const admin = await getAdmin();
      const metadata = {
        storage: 'r2',
        r2Key,
        mimeType: String(mimeType).slice(0, 100),
        fileName: String(fileName).slice(0, 240),
        source: String(source).slice(0, 40),
        byteLength: buffer.length,
        createdAt: Number(createdAt) || Date.now(),
      };
      await documentRealtimeRef(admin, uid, assetId).set(metadata);
      documentCollection(admin, uid).doc(assetId).set(metadata)
        .catch(error => console.warn('Firestore document metadata mirror skipped:', error?.message || error));

      return { assetId, storage: 'r2', mimeType, fileName, byteLength: buffer.length };
    } catch (r2Err) {
      console.warn('R2 document upload failed, falling back to Realtime Database:', r2Err?.message);
    }
  }

  const admin = await getAdmin();
  const CHUNK_SIZE = 240000;
  const base64 = buffer.toString('base64');
  const chunks = [];
  for (let offset = 0; offset < base64.length; offset += CHUNK_SIZE) chunks.push(base64.slice(offset, offset + CHUNK_SIZE));

  const metadata = {
    storage: 'rtdb',
    mimeType: String(mimeType).slice(0, 100),
    fileName: String(fileName).slice(0, 240),
    source: String(source).slice(0, 40),
    byteLength: buffer.length,
    chunkCount: chunks.length,
    createdAt: Number(createdAt) || Date.now(),
  };
  const stored = {
    ...metadata,
    chunks: Object.fromEntries(chunks.map((chunk, index) => [
      `chunk_${String(index).padStart(5, '0')}`,
      { index, payload: serverEncrypt({ data: chunk }) },
    ])),
  };
  await documentRealtimeRef(admin, uid, assetId).set(stored);
  documentCollection(admin, uid).doc(assetId).set(metadata)
    .catch(error => console.warn('Firestore document metadata mirror skipped:', error?.message || error));

  return { assetId, storage: 'rtdb', mimeType, fileName, byteLength: buffer.length };
}

export async function loadVaultDocument(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) throw new Error('Invalid document asset ID');
  const admin = await getAdmin();
  const docRef = documentCollection(admin, uid).doc(String(assetId));
  const realtimeSnapshot = await documentRealtimeRef(admin, uid, String(assetId)).get().catch(() => null);
  let meta = realtimeSnapshot?.exists() ? realtimeSnapshot.val() : null;
  if (!meta) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) return null;
    meta = snapshot.data();
  }

  if (meta.storage === 'r2' && meta.r2Key && isR2Configured()) {
    try {
      const res = await r2Request('GET', meta.r2Key);
      if (res.ok) {
        const encryptedText = await res.text();
        const base64 = serverDecrypt(JSON.parse(encryptedText));
        return {
          ...meta,
          assetId: String(assetId),
          data: Buffer.from(base64, 'base64'),
        };
      }
    } catch (r2Err) {
      console.warn('R2 load failed, checking fallback:', r2Err?.message);
    }
  }

  const realtimeChunks = Object.values(meta.chunks || {}).sort((left, right) => Number(left?.index || 0) - Number(right?.index || 0));
  if (realtimeChunks.length) {
    const base64 = realtimeChunks.map(chunk => serverDecrypt(chunk.payload).data || '').join('');
    if (!base64) throw new Error('The encrypted document asset is incomplete or unavailable');
    return { ...meta, assetId: String(assetId), data: Buffer.from(base64, 'base64') };
  }

  // Firestore recovery for assets that have not yet been copied into RTDB.
  const chunksSnap = await docRef.collection('chunks').orderBy('index').get();
  const base64 = chunksSnap.docs.map(doc => serverDecrypt(doc.data().payload).data || '').join('');
  return {
    ...meta,
    assetId: String(assetId),
    data: Buffer.from(base64, 'base64'),
  };
}

export async function deleteVaultDocument(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) return false;
  const admin = await getAdmin();
  const docRef = documentCollection(admin, uid).doc(String(assetId));
  const realtimeRef = documentRealtimeRef(admin, uid, String(assetId));
  const realtimeSnapshot = await realtimeRef.get().catch(() => null);
  const firestoreSnapshot = realtimeSnapshot?.exists() ? null : await docRef.get().catch(() => null);
  const meta = realtimeSnapshot?.exists() ? realtimeSnapshot.val() : firestoreSnapshot?.data?.();
  if (!meta) return false;
  if (meta.storage === 'r2' && meta.r2Key && isR2Configured()) {
    try { await r2Request('DELETE', meta.r2Key); } catch { /* ignore */ }
  }
  await realtimeRef.remove();
  docRef.delete().catch(() => {});
  return true;
}

