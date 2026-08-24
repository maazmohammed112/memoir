import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getAdmin } from '../lib/firebaseAdmin.js';
import { ACCOUNT_PROFILES } from '../lib/accountProfiles.js';

const OWNER_COLLECTIONS = [
  { source: 'users', target: 'users', subcollection: 'items', nested: [] },
  { source: 'secureVault', target: 'secureVault', subcollection: 'items', nested: [] },
  { source: 'secureAudio', target: 'secureAudio', subcollection: 'items', nested: ['chunks'] },
  { source: 'secureDocuments', target: 'secureDocuments', subcollection: 'items', nested: ['chunks'] },
  { source: 'telegramActionQueue', target: 'telegramActionQueue', subcollection: 'items', nested: [] },
  { source: 'reminderDeliveries', target: 'reminderDeliveries', subcollection: 'items', nested: [] },
  { source: 'telegramMessageDeliveries', target: 'telegramMessageDeliveries', subcollection: 'items', nested: [] },
  { source: 'verifiedSessions', target: 'verifiedSessions', subcollection: 'sessions', nested: [] },
];

function jsonValue(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, jsonValue(nested)]));
  return String(value);
}

function fingerprint(value) {
  const stable = input => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === 'object') return Object.fromEntries(Object.keys(input).sort().map(key => [key, stable(input[key])]));
    return input;
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function itemPath(collection, uid, id) {
  return ['telegramActionQueue', 'reminderDeliveries', 'telegramMessageDeliveries'].includes(collection)
    ? `${collection}/${uid}/${id}`
    : collection === 'verifiedSessions'
      ? `${collection}/${uid}/sessions/${id}`
    : `${collection}/${uid}/items/${id}`;
}

async function migrateOwnerCollection({ firestore, rtdb, uid, descriptor }) {
  const sourceRef = firestore.collection(descriptor.source).doc(uid).collection(descriptor.subcollection);
  const sourceSnapshot = await sourceRef.get();
  const updates = {};
  const expected = new Map();

  for (const document of sourceSnapshot.docs) {
    const normalized = jsonValue(document.data());
    const path = itemPath(descriptor.target, uid, document.id);

    for (const nestedName of descriptor.nested) {
      const nestedSnapshot = await document.ref.collection(nestedName).get();
      if (!nestedSnapshot.empty) {
        normalized[nestedName] = {};
        for (const nestedDocument of nestedSnapshot.docs) {
          const nestedValue = jsonValue(nestedDocument.data());
          normalized[nestedName][`chunk_${nestedDocument.id}`] = nestedValue;
        }
      }
    }
    updates[path] = normalized;
    expected.set(path, fingerprint(normalized));
  }

  if (Object.keys(updates).length) await rtdb.ref().update(updates);

  const mismatches = [];
  for (const [path, expectedHash] of expected) {
    const copied = await rtdb.ref(path).get();
    if (!copied.exists() || fingerprint(jsonValue(copied.val())) !== expectedHash) mismatches.push(path);
  }
  if (mismatches.length) throw new Error(`${descriptor.source} verification failed for ${mismatches.length} path(s)`);

  return { documents: sourceSnapshot.size, paths: expected.size };
}

async function migrateRootCollection({ firestore, rtdb, name }) {
  const snapshot = await firestore.collection(name).get();
  const updates = {};
  for (const document of snapshot.docs) updates[`${name}/${document.id}`] = jsonValue(document.data());
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
  const destination = await rtdb.ref(name).get();
  const destinationIds = new Set(Object.keys(destination.val() || {}));
  const missing = snapshot.docs.filter(document => !destinationIds.has(document.id));
  if (missing.length) throw new Error(`${name} verification failed for ${missing.length} document(s)`);
  return snapshot.size;
}

export async function runFirestoreToRtdbMigration() {
  const admin = await getAdmin();
  const firestore = admin.firestore();
  const rtdb = admin.database();
  const startedAt = Date.now();
  const report = { version: 2, startedAt, owners: {}, rootCollections: {}, verified: false };

  for (const profile of ACCOUNT_PROFILES) {
    const ownerReport = {};
    for (const descriptor of OWNER_COLLECTIONS) {
      ownerReport[descriptor.source] = await migrateOwnerCollection({ firestore, rtdb, uid: profile.uid, descriptor });
    }
    report.owners[profile.uid] = { name: profile.name, ...ownerReport };
  }

  for (const name of ['telegramLinks']) report.rootCollections[name] = await migrateRootCollection({ firestore, rtdb, name });

  report.verified = true;
  report.finishedAt = Date.now();
  report.durationMs = report.finishedAt - startedAt;
  await rtdb.ref('migrationStatus/firestoreToRtdbV2').set(report);
  return report;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  runFirestoreToRtdbMigration()
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed without deleting Firestore data:', error?.message || error);
      process.exit(1);
    });
}
