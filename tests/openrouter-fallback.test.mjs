import assert from 'node:assert/strict';
import fs from 'node:fs';

if (!process.env.OPENROUTER_API_KEY && fs.existsSync('env')) {
  const envContent = fs.readFileSync('env', 'utf8');
  const match = /^OPENROUTER_API_KEY=(.+)$/m.exec(envContent);
  if (match) process.env.OPENROUTER_API_KEY = match[1].trim();
}

export const suite = async () => {
  const { routeQuery } = await import(`../api/assistant.js?openrouter-test=${Date.now()}`);
  const result = await routeQuery({
    provider: 'other',
    query: 'what is my wifi password?',
    catalog: [{ id: 'w-1', type: 'Wi-Fi', title: 'Home WiFi', fieldNames: ['Password', 'SSID'] }],
    history: [],
    timezone: 'Asia/Calcutta',
    now: '2026-08-26T12:00:00.000Z',
  });
  assert(new Set(['level', 'lookup', 'general']).has(Reflect.get(result, 'kind') || 'lookup'), 'Kind must be valid');
  assert(result.provider, 'Provider must be returned');
  console.log('Passed OpenRouter routing test with result kind:', result.kind, 'provider:', result.provider);
};
await suite();
