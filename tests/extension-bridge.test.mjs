import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Test 1: Extract domain helper logic
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

assert.equal(extractDomain('https://github.com/login'), 'github.com');
assert.equal(extractDomain('https://www.amazon.in/gp/buy'), 'amazon.in');
assert.equal(extractDomain('http://localhost:5173/'), 'localhost');

// Test 2: Web App Memory Filter Group logic
const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const filterSource = source.slice(source.indexOf('function memoryFilterGroup'), source.indexOf('function reminders()'));

const context = {};
vm.createContext(context);
vm.runInContext(`${filterSource}; this.filterGroup = memoryFilterGroup;`, context);

const regularLogin = { id: '1', type: 'Login', title: 'Regular Login', fields: { Password: '123' } };
const extensionLogin = { id: '2', type: 'Login', title: 'GitHub Login', fields: { Password: '123' }, provenance: { source: 'Chrome Extension', domain: 'github.com' } };
const bankCard = { id: '3', type: 'Finance', title: 'SBI Card', fields: { 'ATM PIN': '1234' } };

assert.equal(context.filterGroup(regularLogin), 'logins', 'Regular login should be in logins group');
assert.equal(context.filterGroup(extensionLogin), 'extension', 'Extension captured item should be in extension group');
assert.equal(context.filterGroup(bankCard), 'banks', 'Finance item should be in banks group');

// Test 3: Extension Manifest Validation
const manifest = JSON.parse(fs.readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3, 'Manifest version must be 3');
assert.ok(manifest.permissions.includes('storage'), 'Storage permission required');
assert.ok(manifest.content_scripts.length > 0, 'Content script must be registered');

console.log('Memoir Chrome Extension bridge tests passed successfully.');
