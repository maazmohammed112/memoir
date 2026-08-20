import crypto from 'node:crypto';

function key() {
  if (!process.env.VAULT_SERVER_KEY || process.env.VAULT_SERVER_KEY.length < 24) throw new Error('VAULT_SERVER_KEY must contain at least 24 characters');
  return crypto.createHash('sha256').update(process.env.VAULT_SERVER_KEY).digest();
}
export function serverEncrypt(value) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), cipher: encrypted.toString('base64'), version: 1 };
}
export function serverDecrypt(payload) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.cipher, 'base64')), decipher.final()]).toString('utf8'));
}
