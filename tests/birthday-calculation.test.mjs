import assert from 'node:assert/strict';

function parseBirthday(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '')); if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(year || 2000, month, 0).getDate()) return null;
  return { year, month, day, hasYear: year > 0 };
}
function birthdayAt(year, parts) { return new Date(year, parts.month - 1, Math.min(parts.day, new Date(year, parts.month, 0).getDate())); }
function nextBirthday(item, now = new Date()) {
  const parts = parseBirthday(item?.fields?.Date); if (!parts) return null; const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let occurrence = birthdayAt(today.getFullYear(), parts); if (occurrence < today) occurrence = birthdayAt(today.getFullYear() + 1, parts);
  return { ...parts, occurrence, daysAway: Math.round((occurrence - today) / 86400000) };
}
function currentAge(item, now = new Date()) {
  const parts = parseBirthday(item?.fields?.Date); if (!parts?.hasYear) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const birth = birthdayAt(parts.year, parts); if (birth > today) return null;
  let years = today.getFullYear() - parts.year; let months = today.getMonth() - (parts.month - 1); let days = today.getDate() - parts.day;
  if (days < 0) { months -= 1; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  return { years, months, days };
}
function nextBirthdayAge(item, now = new Date()) { const next = nextBirthday(item, now); return next?.hasYear ? next.occurrence.getFullYear() - next.year : null; }

const deeptiItem = {
  id: 'deepti-bday-1',
  type: 'Birthday',
  title: 'Deepti Birthday',
  fields: { Date: '2005-03-11', Relation: 'Best Friend' }
};

const refDate = new Date('2026-08-26T12:00:00.000Z');
const next = nextBirthday(deeptiItem, refDate);
const nextAge = nextBirthdayAge(deeptiItem, refDate);
const age = currentAge(deeptiItem, refDate);

assert.equal(next.year, 2005);
assert.equal(next.month, 3);
assert.equal(next.day, 11);
assert.equal(next.occurrence.getFullYear(), 2027);
assert.equal(next.occurrence.getMonth(), 2);
assert.equal(next.occurrence.getDate(), 11);
assert.equal(nextAge, 22);
assert.equal(age.years, 21);
assert.equal(next.daysAway, 197);

const todayBash = { fields: { Date: '2000-08-26' } };
const sameDayNext = nextBirthday(todayBash, refDate);
assert.equal(sameDayNext.daysAway, 0);

console.log('On-device birthday calculation tests passed successfully with 100% precision.');
