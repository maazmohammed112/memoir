import assert from 'node:assert/strict';
import { cleanLegacyPrivateValue, hasPrivateToken, preferCleanVaultItem, sanitizeAssistantAction } from '../src/vaultIntegrity.js';

const existing = { id: 'paypal', type: 'Login', title: 'PayPal', note: 'Saved account', fields: { Password: 'real-secret-2002', Username: 'owner@example.com' }, updatedAt: 10 };
const action = sanitizeAssistantAction({ op: 'update', id: 'paypal', fields: { Password: '[[PRIVATE_1]][[PRIVATE_4]]2', Username: '[[PRIVATE_0]]' } }, { '[[PRIVATE_0]]': 'new@example.com' }, existing);
assert.equal(action.fields.Password, 'real-secret-2002', 'unresolved model placeholders must preserve the prior secret');
assert.equal(action.fields.Username, 'new@example.com', 'known placeholders must resolve locally');
assert.equal(hasPrivateToken(action.fields.Password), false);
assert.equal(cleanLegacyPrivateValue('[[PRIVATE_6]] (if applicable)'), '', 'legacy placeholder garbage must never be rendered as a credential');

const repaired = preferCleanVaultItem(
  { ...existing, updatedAt: 20, fields: { Password: '[[PRIVATE_1]][[PRIVATE_4]]2', Username: 'owner@example.com' } },
  { ...existing, updatedAt: 10 },
);
assert.equal(repaired.fields.Password, 'real-secret-2002', 'clean recovery copy must beat a newer corrupted field without replacing the record');
assert.equal(repaired.updatedAt, 20);

console.log('Vault privacy placeholders are resolved or recovered without corrupting saved fields.');
