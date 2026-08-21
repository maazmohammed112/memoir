import assert from 'node:assert/strict';

delete process.env.GEMINI_API_KEY;
delete process.env.MISTRAL_API_KEY;

const { routeQuery } = await import(`../api/assistant.js?audio-fallback-test=${Date.now()}`);

const result = await routeQuery({
  provider: 'gemini',
  query: 'Save this voice memo',
  audio: { data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=', mimeType: 'audio/wav' },
  catalog: [], history: [], timezone: 'Asia/Calcutta', now: '2026-08-21T12:00:00.000Z',
});

assert.equal(result.kind, 'actions');
assert.equal(result.actions.length, 1);
assert.equal(result.actions[0].type, 'Audio');
assert.equal(result.actions[0].fields['Audio Transcript'], 'No transcript available');
assert.match(result.actions[0].fields['Transcription status'], /Audio only/i);
assert.match(result.actions[0].title, /Voice Memo/i);

console.log('Audio fallback creates a durable Audio memory without inventing a transcript.');
