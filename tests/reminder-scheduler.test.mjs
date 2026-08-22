import assert from 'node:assert/strict';
import { getZonedParts, isSchedulerAuthorized, nextBirthdayOccurrence } from '../api/reminders.js';

const timeZone = 'Asia/Calcutta';
const midday = Date.parse('2026-08-22T12:00:00+05:30');

assert.deepEqual(
  Object.fromEntries(Object.entries(getZonedParts(midday, timeZone)).filter(([key]) => ['year', 'month', 'day', 'hour', 'minute'].includes(key))),
  { year: 2026, month: 8, day: 22, hour: 12, minute: 0 },
);

assert.equal(
  nextBirthdayOccurrence({ fields: { Date: '0000-08-22' } }, midday, timeZone)?.timestamp,
  Date.parse('2026-08-22T00:00:00+05:30'),
  'A birthday later on the same calendar day must not roll into next year',
);

assert.equal(
  nextBirthdayOccurrence({ fields: { Date: '1995-08-21' } }, midday, timeZone)?.timestamp,
  Date.parse('2027-08-21T00:00:00+05:30'),
  'A birthday whose calendar day has passed must use next year',
);

assert.equal(
  nextBirthdayOccurrence({ fields: { Date: '1996-02-29' } }, Date.parse('2026-03-01T12:00:00+05:30'), timeZone)?.timestamp,
  Date.parse('2027-02-28T00:00:00+05:30'),
  'Leap-day birthdays must remain valid in non-leap years',
);

assert.equal(isSchedulerAuthorized({ headers: { authorization: 'Bearer correct-secret' } }, { CRON_SECRET: 'correct-secret' }), true);
assert.equal(isSchedulerAuthorized({ headers: { authorization: 'Bearer wrong-secret' } }, { CRON_SECRET: 'correct-secret' }), false);
assert.equal(isSchedulerAuthorized({ headers: { 'x-vercel-cron': '1' } }, { CRON_SECRET: 'correct-secret' }), false, 'A spoofable cron header must not authorize a sweep');
assert.equal(isSchedulerAuthorized({ headers: {} }, {}), false, 'The production scheduler must fail closed when CRON_SECRET is missing');

console.log('Reminder scheduler tests passed.');
