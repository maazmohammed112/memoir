import assert from 'node:assert/strict';
import fs from 'node:fs';

// 1. Verify realtimeVault.js exports all essential dual-tier methods
const realtimeVaultSource = fs.readFileSync(new URL('../lib/realtimeVault.js', import.meta.url), 'utf8');
assert.match(realtimeVaultSource, /export async function writeVaultItem/);
assert.match(realtimeVaultSource, /export async function deleteVaultItem/);
assert.match(realtimeVaultSource, /export async function replaceVaultSnapshot/);
assert.match(realtimeVaultSource, /export async function readDecryptedVaultItems/);
assert.match(realtimeVaultSource, /export async function enqueueTelegramAction/);
assert.match(realtimeVaultSource, /export async function pullTelegramActionQueue/);
assert.match(realtimeVaultSource, /export async function acknowledgeTelegramActionQueue/);
assert.match(realtimeVaultSource, /export async function linkTelegramChat/);

// 2. Verify RTDB is the primary vault and snapshot synchronization is merge-only.
assert.match(realtimeVaultSource, /RESOURCE_EXHAUSTED|quota exceeded/);
assert.match(realtimeVaultSource, /admin\.database\(\)\.ref\(`secureVault\/\$\{uid\}\/items`\)\.get\(\)/);
const readFunctionSource = realtimeVaultSource.slice(realtimeVaultSource.indexOf('export async function readDecryptedVaultItems'));
assert.ok(
  readFunctionSource.indexOf("ref(`secureVault/${uid}/items`).get()") < readFunctionSource.indexOf("collection('secureVault')"),
  'RTDB read must occur before Firestore recovery',
);
assert.match(realtimeVaultSource, /Snapshot sync never deletes records/);
assert.doesNotMatch(realtimeVaultSource, /secureRef\.set\(secureObj\)/);

// 3. Verify sync API uses dual-tier layer
const syncSource = fs.readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');
assert.match(syncSource, /readDecryptedVaultItems/);
assert.match(syncSource, /replaceVaultSnapshot/);
assert.match(syncSource, /deleteVaultItem/);
assert.match(syncSource, /writeVaultItem/);
assert.match(syncSource, /verifyOwnerToken/);
assert.doesNotMatch(syncSource, /op === 'migrate'/);
assert.doesNotMatch(syncSource, /guest-offline/);

const serverSource = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
assert.match(serverSource, /server\.get\('\/api\/sync', sync\)/);

// 4. Verify telegram and reminders use readDecryptedVaultItems
const telegramSource = fs.readFileSync(new URL('../api/telegram.js', import.meta.url), 'utf8');
assert.match(telegramSource, /readDecryptedVaultItems/);

const remindersSource = fs.readFileSync(new URL('../api/reminders.js', import.meta.url), 'utf8');
assert.match(remindersSource, /readDecryptedVaultItems/);

// 5. Verify migration script exists and has valid logic
const migrationSource = fs.readFileSync(new URL('../scripts/migrate-firestore-to-rtdb.mjs', import.meta.url), 'utf8');
assert.match(migrationSource, /source: 'users'/);
assert.match(migrationSource, /firestore\.collection\(descriptor\.source\)/);
assert.match(migrationSource, /rtdb\.ref/);
for (const collection of ['secureVault', 'secureAudio', 'secureDocuments', 'verifiedSessions', 'reminderDeliveries']) {
  assert.match(migrationSource, new RegExp(collection));
}
assert.match(migrationSource, /fingerprint/);
assert.match(migrationSource, /report\.verified = true/);

const audioSource = fs.readFileSync(new URL('../lib/audioVault.js', import.meta.url), 'utf8');
assert.match(audioSource, /secureAudio\/\$\{uid\}\/items\/\$\{assetId\}/);
assert.match(audioSource, /storage: 'rtdb'/);

const documentSource = fs.readFileSync(new URL('../lib/r2Storage.js', import.meta.url), 'utf8');
assert.match(documentSource, /secureDocuments\/\$\{uid\}\/items\/\$\{assetId\}/);
assert.match(documentSource, /storage: 'rtdb'/);

const rulesSource = fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8');
const rules = JSON.parse(rulesSource).rules;
for (const path of ['users', 'secureVault', 'secureAudio', 'secureDocuments', 'serverAuth', 'verifiedSessions', 'migrationStatus']) {
  assert.equal(rules[path]['.read'], false, `${path} must be server-only`);
  assert.equal(rules[path]['.write'], false, `${path} must be server-only`);
}

console.log('✅ Dual-tier database and Realtime Database migration test passed.');
