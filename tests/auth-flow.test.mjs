import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACCOUNT_PROFILES,
  accountProfileByCode,
  accountProfileByEmail,
  accountProfileByUid,
  profileMatchesUser,
} from '../lib/accountProfiles.js';
import { getUserByCode, getUserByUid } from '../lib/users.js';

assert.equal(ACCOUNT_PROFILES.length, 2);
assert.equal(new Set(ACCOUNT_PROFILES.map(profile => profile.uid)).size, 2);
assert.equal(new Set(ACCOUNT_PROFILES.map(profile => profile.email)).size, 2);
assert.equal(new Set(ACCOUNT_PROFILES.map(profile => profile.code)).size, 2);

const maaz = accountProfileByCode('20-02');
const deepti = accountProfileByCode('2005');
assert.equal(maaz?.name, 'Maaz');
assert.equal(deepti?.name, 'Deepti');
assert.equal(accountProfileByUid(deepti.uid), deepti);
assert.equal(accountProfileByEmail(' DEEPTI@MEMO.COM '), deepti);
assert.equal(profileMatchesUser(maaz, { uid: maaz.uid, email: 'MAAZ@MEMO.COM' }), true);
assert.equal(profileMatchesUser(maaz, { uid: deepti.uid, email: maaz.email }), false);
assert.equal(getUserByCode('2005')?.uid, deepti.uid);
assert.equal(getUserByUid(maaz.uid)?.code, '2002');

const storeSource = fs.readFileSync(new URL('../src/store.js', import.meta.url), 'utf8');
assert.doesNotMatch(storeSource, /DEEPTI_UID/);
assert.match(storeSource, /const localProfile = accountProfileByCode\(raw\)/);
assert.match(storeSource, /if \(!this\.firebaseReadyPromise\)/);
assert.match(storeSource, /if \(!profileMatchesUser\(this\.profile, user\)\) return null/);
assert.match(storeSource, /if \(!session\) \{ await this\.signOut\('expired'\)/);
assert.doesNotMatch(storeSource, /return \{ expiresAt: authenticatedAt \+ SESSION_LENGTH \}/);
assert.equal((storeSource.match(/action: 'select-account', code: raw/g) || []).length, 1);

const authApiSource = fs.readFileSync(new URL('../api/auth.js', import.meta.url), 'utf8');
assert.match(authApiSource, /code: 'auth\/otp-cooldown'/);
assert.match(authApiSource, /if \(reservation\.reused\)/);
assert.doesNotMatch(authApiSource, /verified: true, fallback: true/);
assert.doesNotMatch(authApiSource, /^\s*code,\s*$/m);
assert.doesNotMatch(authApiSource, /lastCodeHash/);
assert.match(authApiSource, /quotaExhausted \? 'auth\/service-busy'/);
assert.match(authApiSource, /async function withDeadline/);
assert.match(authApiSource, /await reserveOtpRequest/);
assert.match(authApiSource, /await withDeadline\(saveAuthState/);
assert.match(authApiSource, /status: 'prepared'/);
assert.match(authApiSource, /deliveredAtMs/);
assert.match(authApiSource, /admin\.database\(\)/);
assert.doesNotMatch(authApiSource, /memoir-master-production-key/);
const requestOtpSource = authApiSource.slice(authApiSource.indexOf('async function requestOtp'), authApiSource.indexOf('async function verifyOtp'));
assert.ok(requestOtpSource.indexOf('await withDeadline(saveAuthState') < requestOtpSource.indexOf("await telegramRequest(profile, 'sendMessage'"));
assert.doesNotMatch(requestOtpSource, /Promise\.allSettled/);
assert.doesNotMatch(authApiSource, /runTransaction/);
assert.match(authApiSource, /OTP verification data lookup timed out/);

const firebaseAdminSource = fs.readFileSync(new URL('../lib/firebaseAdmin.js', import.meta.url), 'utf8');
assert.match(firebaseAdminSource, /verifyIdToken\(token, true\)/);
assert.match(firebaseAdminSource, /loadAuthState\(admin\.database\(\)/);

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.ok((mainSource.match(/dataset\.submitting === 'true'/g) || []).length >= 3);

const extensionSource = fs.readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');
assert.match(extensionSource, /if \(!isMemoirApp\) \{\s*initAutofillAndBadges\(\)/);
assert.match(extensionSource, /memoir-inline-save-btn[\s\S]*forEach\(element => element\.remove\(\)\)/);
assert.match(extensionSource, /function sendMessageSafely/);
assert.equal((extensionSource.match(/chrome\.runtime\.sendMessage/g) || []).length, 1);

const stylesSource = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(stylesSource, /\.memoir-inline-save-btn,[\s\S]*display: none !important/);

console.log('Memoir account isolation, OTP, session, and extension auth regressions passed.');
