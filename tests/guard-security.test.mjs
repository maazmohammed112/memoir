import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const guardSource = source.slice(source.indexOf('function auditVaultSecurity'), source.indexOf('function vaultRow'));

const context = {
  activeProfile: () => ({ name: 'Maaz', email: 'maaz@memo.com', code: '2002' }),
  typeIcons: {},
  icon: () => '',
  escapeHtml: s => s,
  state: {},
};

vm.createContext(context);
vm.runInContext(`${guardSource}; this.audit = auditVaultSecurity; this.generate = generateStrongSecret;`, context);

// Test 1: Reused Passwords & PINs
const mockItems = [
  { id: '1', type: 'Login', title: 'EPFO', fields: { 'Username / ID': 'maaz123', Password: 'SharedPassword@123' } },
  { id: '2', type: 'Finance', title: 'SBI NetBanking', fields: { 'Username / ID': 'maaz_sbi', Password: 'SharedPassword@123' } },
  { id: '3', type: 'Finance', title: 'SBI Debit Card', fields: { 'Debit card number': '4532 1111 2222 3333', 'ATM PIN': '1234', CVV: '456', Expiry: '08/28' } },
  { id: '4', type: 'Finance', title: 'HDFC Debit Card', fields: { 'Debit card number': '4532 9999 8888 7777', 'ATM PIN': '1234', CVV: '789', Expiry: '12/29' } },
  { id: '5', type: 'Login', title: 'Netflix', fields: { 'Username / ID': 'maaz@memo.com', Password: 'MaazPassword' } },
];

const maazProfile = { name: 'Maaz', email: 'maaz@memo.com', code: '2002' };
const maazAudit = context.audit(mockItems, maazProfile);

assert.ok(maazAudit.reusedPasswords.length >= 1, 'Should detect reused password between EPFO and SBI');
assert.ok(maazAudit.reusedPins.length >= 1, 'Should detect reused ATM PIN 1234 between SBI and HDFC cards');
assert.ok(maazAudit.weakItems.some(w => w.value === '1234'), 'Should detect 1234 as a sequential weak PIN');
assert.ok(maazAudit.personalInfoItems.some(p => p.item.title === 'Netflix'), 'Should detect Maaz name in Netflix password');
assert.ok(maazAudit.score < 70, 'Vault with multiple vulnerabilities should have reduced score');

// Test 2: User Isolation (Deepti profile should NOT flag "Maaz" as personal leak, but flag "Deepti")
const deeptiProfile = { name: 'Deepti', email: 'deepti@memo.com', code: '2005' };
const deeptiAudit = context.audit([
  { id: 'd1', type: 'Login', title: 'Amazon', fields: { Password: 'DeeptiSecret@123' } },
  { id: 'd2', type: 'Login', title: 'Flipkart', fields: { Password: 'MaazSecret@123' } },
], deeptiProfile);

assert.ok(deeptiAudit.personalInfoItems.some(p => p.item.title === 'Amazon'), 'Deepti profile should detect Deepti in password');
assert.ok(!deeptiAudit.personalInfoItems.some(p => p.item.title === 'Flipkart'), 'Deepti profile should NOT detect Maaz as a personal leak for Deepti');

// Test 3: Password & PIN Generator
const strongPwd = context.generate('password', 20);
assert.equal(strongPwd.length, 20, 'Generated password should match requested length');

const strongPin = context.generate('pin', 4);
assert.equal(strongPin.length, 4, 'Generated PIN should be 4 digits');
assert.ok(!/^(0123|1234|0000|1111)$/.test(strongPin), 'Generated PIN must not be sequential or repeated');

console.log('Rhino Guard security tests passed successfully.');
