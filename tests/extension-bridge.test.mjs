import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getUserByCode } from '../lib/users.js';

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
assert.equal(extractDomain('https://ajsk.karnataka.gov.in/'), 'ajsk.karnataka.gov.in');

// Test 2: Web App Memory Filter Group logic
const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const filterSource = source.slice(source.indexOf('function memoryFilterGroup'), source.indexOf('function reminders()'));
const isBrowserCaptureSource = source.slice(source.indexOf('function isBrowserCapture'), source.indexOf('function browserCapturesView()'));

const context = {};
vm.createContext(context);
vm.runInContext(`${isBrowserCaptureSource}; ${filterSource}; this.filterGroup = memoryFilterGroup; this.isBrowserCapture = isBrowserCapture;`, context);

const regularLogin = { id: '1', type: 'Login', title: 'Regular Login', fields: { Password: '123' } };
const extensionLogin = { id: '2', type: 'Login', title: 'GitHub Login', fields: { Password: '123' }, provenance: { source: 'Chrome Extension', domain: 'github.com' } };
const ackDocument = { id: '3', type: 'Government Document', title: 'AJSK ACK Number', fields: { 'Document number': 'RD1218185132439' }, provenance: { source: 'Chrome Extension', domain: 'ajsk.karnataka.gov.in' } };
const bankCard = { id: '4', type: 'Finance', title: 'SBI Card', fields: { 'ATM PIN': '1234' } };

assert.equal(context.filterGroup(regularLogin), 'logins');
assert.equal(context.isBrowserCapture(extensionLogin), true);
assert.equal(context.isBrowserCapture(ackDocument), true);
assert.equal(context.isBrowserCapture(regularLogin), false);
assert.equal(context.filterGroup(bankCard), 'banks');

// Test 3: Extension Manifest Validation
const manifest = JSON.parse(fs.readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.web_accessible_resources.length > 0);

// Test 4: Extension Authentication Code mapping
const maazUser = getUserByCode('2002');
assert.ok(maazUser);
assert.equal(maazUser.name, 'Maaz');
assert.equal(maazUser.uid, 'uQE6xqhWhQWhOlGmfT2br5HnCEq2');

console.log('Memoir Chrome Extension bridge & sync tests passed successfully.');