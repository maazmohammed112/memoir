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
  const encryptedPayload = serverEncrypt(buffer.toString('base64'));

  if (isR2Configured()) {
    const r2Key = `vault-assets/${uid}/${assetId}`;
    const res = await r2Request('PUT', r2Key, Buffer.from(encryptedPayload, 'utf8'), {
      'content-type': 'application/octet-stream',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 upload failed (${res.status}): ${errText}`);
    }

    const admin = await getAdmin();
    await admin.firestore().collection('secureDocuments').doc(uid).collection('items').doc(assetId).set({
      storage: 'r2',
      r2Key,
      mimeType: String(mimeType).slice(0, 100),
      fileName: String(fileName).slice(0, 240),
      source: String(source).slice(0, 40),
      byteLength: buffer.length,
      createdAt: Number(createdAt) || Date.now(),
    });

    return { assetId, storage: 'r2', mimeType, fileName, byteLength: buffer.length };
  } else {
    const admin = await getAdmin();
    const docRef = admin.firestore().collection('secureDocuments').doc(uid).collection('items').doc(assetId);
    const CHUNK_SIZE = 240000;
    const base64 = buffer.toString('base64');
    const chunks = [];
    for (let offset = 0; offset < base64.length; offset += CHUNK_SIZE) chunks.push(base64.slice(offset, offset + CHUNK_SIZE));

    await docRef.set({
      storage: 'firestore',
      mimeType: String(mimeType).slice(0, 100),
      fileName: String(fileName).slice(0, 240),
      source: String(source).slice(0, 40),
      byteLength: buffer.length,
      chunkCount: chunks.length,
      createdAt: Number(createdAt) || Date.now(),
    });

    const chunkColl = docRef.collection('chunks');
    for (let i = 0; i < chunks.length; i += 10) {
      await Promise.all(chunks.slice(i, i + 10).map((chunk, bIdx) => {
        const cIdx = i + bIdx;
        return chunkColl.doc(String(cIdx).padStart(5, '0')).set({
          index: cIdx,
          payload: serverEncrypt({ data: chunk }),
        });
      }));
    }

    return { assetId, storage: 'firestore', mimeType, fileName, byteLength: buffer.length };
  }
}

export async function loadVaultDocument(uid, assetId) {
  if (!/^[a-f0-9-]{20,80}$/i.test(String(assetId || ''))) throw new Error('Invalid document asset ID');
  const admin = await getAdmin();
  const docRef = admin.firestore().collection('secureDocuments').doc(uid).collection('items').doc(String(assetId));
  const snapshot = await docRef.get();
  if (!snapshot.exists) return null;
  const meta = snapshot.data();

  if (meta.storage === 'r2' && meta.r2Key) {
    const res = await r2Request('GET', meta.r2Key);
    if (!res.ok) throw new Error(`Cloudflare R2 download failed (${res.status})`);
    const encryptedText = await res.text();
    const base64 = serverDecrypt(encryptedText);
    return {
      ...meta,
      assetId: String(assetId),
      data: Buffer.from(base64, 'base64'),
    };
  } else {
    const chunksSnap = await docRef.collection('chunks').orderBy('index').get();
    const base64 = chunksSnap.docs.map(doc => serverDecrypt(doc.data().payload).data || '').join('');
    if (!base64) throw new Error('Document data could not be decrypted');
    return {
      ...meta,
      assetId: String(assetId),
      data: Buffer.from(base64, 'base64'),
    };
  }
}
