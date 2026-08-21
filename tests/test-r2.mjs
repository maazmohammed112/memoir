import { isR2Configured, r2Request } from '../lib/r2Storage.js';

console.log('Testing R2 configuration...');
console.log('isR2Configured:', isR2Configured());

async function runTest() {
  try {
    const testKey = `test-health-${Date.now()}.txt`;
    const testContent = Buffer.from('Memoir R2 Storage Connection Verified!', 'utf8');

    console.log(`1. Uploading test file ${testKey} to R2...`);
    const putRes = await r2Request('PUT', testKey, testContent, {
      'content-type': 'text/plain',
    });
    console.log('PUT Status:', putRes.status, putRes.statusText);
    if (!putRes.ok) {
      const txt = await putRes.text();
      console.error('PUT Error details:', txt);
      return;
    }

    console.log('2. Downloading test file from R2...');
    const getRes = await r2Request('GET', testKey);
    console.log('GET Status:', getRes.status, getRes.statusText);
    const body = await getRes.text();
    console.log('Downloaded Content:', body);

    console.log('3. Deleting test file from R2...');
    const delRes = await r2Request('DELETE', testKey);
    console.log('DELETE Status:', delRes.status, delRes.statusText);

    console.log('🎉 Cloudflare R2 connection test completed successfully!');
  } catch (err) {
    console.error('R2 test error:', err);
  }
}

runTest();
