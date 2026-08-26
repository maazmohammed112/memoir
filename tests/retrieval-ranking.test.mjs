import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const resolverSource = source.slice(source.indexOf('const lookupStopWords'), source.indexOf('function localRoute'));
const items = [
  { id: 'wifi', type: 'Wi-Fi', title: 'Home Wi-Fi', fields: { Network: 'Home', Password: 'wifi-secret' } },
  { id: 'epfo', type: 'Login', title: 'EPFO', fields: { Username: 'uan', Password: 'epfo-secret' } },
  { id: 'deepti', type: 'Birthday', title: 'Deepti Birthday', fields: { Date: '2005-03-17', Relation: 'Friend' } },
];
const context = {
  state: { items, lastResolvedItemId: 'epfo' },
  allFields: item => item.fields || {},
  category: item => item.type,
};
vm.createContext(context);
vm.runInContext(`${resolverSource}
this.score = (index, query) => recordLookupScore(state.items[index], normalizedLookupText(query), lookupTokens(query));`, context);

assert.ok(context.score(0, 'wifi password?') > context.score(1, 'wifi password?'), 'Explicit Wi-Fi identity must outrank previous EPFO context');
assert.equal(context.score(1, 'wifi password?'), 0, 'A shared Password field must not qualify EPFO for a Wi-Fi request');
assert.ok(context.score(1, 'only the password') >= 75, 'An explicit follow-up may use the last resolved record');
assert.ok(context.score(2, 'deepti?') >= 40, 'A distinctive saved title must resolve directly');

console.log('Rhinous retrieval keeps explicit record identity above shared fields and follow-up context.');
