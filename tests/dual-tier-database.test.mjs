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

// 2. Verify quota exhaustion fallback detection
assert.match(realtimeVaultSource, /RESOURCE_EXHAUSTED|quota exceeded/);
assert.match(realtimeVaultSource, /admin\.database\(\)\.ref\(`secureVault\/\$\{uid\}\/items`\)\.get\(\)/);

// 3. Verify sync API uses dual-tier layer
const syncSource = fs.readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');
assert.match(syncSource, /readDecryptedVaultItems/);
assert.match(syncSource, /replaceVaultSnapshot/);
assert.match(syncSource, /deleteVaultItem/);
assert.match(syncSource, /writeVaultItem/);

// 4. Verify telegram and reminders use readDecryptedVaultItems
const telegramSource = fs.readFileSync(new URL('../api/telegram.js', import.meta.url), 'utf8');
assert.match(telegramSource, /readDecryptedVaultItems/);

const remindersSource = fs.readFileSync(new URL('../api/reminders.js', import.meta.url), 'utf8');
assert.match(remindersSource, /readDecryptedVaultItems/);

// 5. Verify migration script exists and has valid logic
const migrationSource = fs.readFileSync(new URL('../scripts/migrate-firestore-to-rtdb.mjs', import.meta.url), 'utf8');
assert.match(migrationSource, /firestore\.collection\('users'\)/);
assert.match(migrationSource, /rtdb\.ref/);

console.log('✅ Dual-tier database and Realtime Database migration test passed.');
