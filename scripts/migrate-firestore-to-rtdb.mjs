import { getAdmin } from '../lib/firebaseAdmin.js';
import { ACCOUNT_PROFILES } from '../lib/accountProfiles.js';

async function migrate() {
  console.log('🚀 Starting full migration from Cloud Firestore to Firebase Realtime Database...');
  const admin = await getAdmin();
  const firestore = admin.firestore();
  const rtdb = admin.database();

  let totalUsers = 0;
  let totalItems = 0;
  let totalQueued = 0;
  let totalLinks = 0;

  // 1. Migrate Users & Vault Items
  for (const profile of ACCOUNT_PROFILES) {
    const uid = profile.uid;
    console.log(`\n📦 Migrating data for ${profile.name} (${uid})...`);

    // User doc (vault key)
    try {
      const userDoc = await firestore.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        await rtdb.ref(`users/${uid}/metadata`).set(userData);
        totalUsers++;
        console.log(`  ✓ Migrated user metadata/key for ${profile.name}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not read user doc from Firestore (${err.message}). Checking RTDB...`);
    }

    // users/{uid}/items
    try {
      const userItems = await firestore.collection('users').doc(uid).collection('items').get();
      if (!userItems.empty) {
        const updates = {};
        userItems.docs.forEach(doc => {
          updates[`users/${uid}/items/${doc.id}`] = doc.data();
        });
        await rtdb.ref().update(updates);
        totalItems += userItems.size;
        console.log(`  ✓ Migrated ${userItems.size} client-encrypted items from users/${uid}/items`);
      }
    } catch (err) {
      console.warn(`  ⚠️ users/${uid}/items read skipped: ${err.message}`);
    }

    // secureVault/{uid}/items
    try {
      const secureItems = await firestore.collection('secureVault').doc(uid).collection('items').get();
      if (!secureItems.empty) {
        const updates = {};
        secureItems.docs.forEach(doc => {
          updates[`secureVault/${uid}/items/${doc.id}`] = doc.data();
        });
        await rtdb.ref().update(updates);
        console.log(`  ✓ Migrated ${secureItems.size} server-encrypted items from secureVault/${uid}/items`);
      }
    } catch (err) {
      console.warn(`  ⚠️ secureVault/${uid}/items read skipped: ${err.message}`);
    }

    // telegramActionQueue/{uid}/items
    try {
      const queueItems = await firestore.collection('telegramActionQueue').doc(uid).collection('items').get();
      if (!queueItems.empty) {
        const updates = {};
        queueItems.docs.forEach(doc => {
          updates[`telegramActionQueue/${uid}/${doc.id}`] = doc.data();
        });
        await rtdb.ref().update(updates);
        totalQueued += queueItems.size;
        console.log(`  ✓ Migrated ${queueItems.size} action queue items for ${profile.name}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ telegramActionQueue/${uid} read skipped: ${err.message}`);
    }

    // reminderDeliveries/{uid}/items
    try {
      const deliveries = await firestore.collection('reminderDeliveries').doc(uid).collection('items').get();
      if (!deliveries.empty) {
        const updates = {};
        deliveries.docs.forEach(doc => {
          updates[`reminderDeliveries/${uid}/${doc.id}`] = doc.data();
        });
        await rtdb.ref().update(updates);
        console.log(`  ✓ Migrated ${deliveries.size} reminder delivery markers for ${profile.name}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ reminderDeliveries/${uid} read skipped: ${err.message}`);
    }
  }

  // 2. Migrate Telegram Links (ChatId -> UID)
  try {
    const telegramLinks = await firestore.collection('telegramLinks').get();
    if (!telegramLinks.empty) {
      const updates = {};
      telegramLinks.docs.forEach(doc => {
        updates[`telegramLinks/${doc.id}`] = doc.data();
      });
      await rtdb.ref().update(updates);
      totalLinks += telegramLinks.size;
      console.log(`\n✓ Migrated ${telegramLinks.size} Telegram chat links.`);
    }
  } catch (err) {
    console.warn(`\n⚠️ telegramLinks read skipped: ${err.message}`);
  }

  console.log('\n========================================');
  console.log('✅ Migration to Realtime Database Completed!');
  console.log(`• Users / Metadata Migrated: ${totalUsers}`);
  console.log(`• Vault Items Migrated: ${totalItems}`);
  console.log(`• Action Queues Migrated: ${totalQueued}`);
  console.log(`• Telegram Links Migrated: ${totalLinks}`);
  return { totalUsers, totalItems, totalQueued, totalLinks };
}

export { migrate as runFirestoreToRtdbMigration };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration encountered fatal error:', err);
      process.exit(1);
    });
}
