import assert from 'node:assert/strict';
import test from 'node:test';
import { fromSolarHijri, toSolarHijri, isValidGregorian, minDate, maxDate } from '../src/lib/calendar.js';

test('Nowruz, leap days, and local digits convert correctly', () => {
  for (const [gregorian, solar] of [
    ['2024-03-20', '1403-01-01'], ['2025-03-20', '1403-12-30'],
    ['2025-03-21', '1404-01-01'], ['2026-03-20', '1404-12-29'],
    ['2026-03-21', '1405-01-01'], ['2026-09-20', '1405-06-29'],
    ['2024-02-29', '1402-12-10'],
  ]) {
    assert.equal(toSolarHijri(gregorian), solar);
    assert.equal(fromSolarHijri(solar), gregorian);
  }
  assert.equal(fromSolarHijri('۱۴۰۳/۱۲/۳۰'), '2025-03-20');
  assert.equal(fromSolarHijri('١٤٠٥-٠١-٠١'), '2026-03-21');
});

test('impossible, incomplete and out-of-range dates never normalize into another day', () => {
  for (const date of ['', '1404-12-30', '1405-07-31', '1405-13-01', '1405-00-01', '1405-01-00', '1405-1-1', '1405-01-', '9999-01-01']) assert.equal(fromSolarHijri(date), '', date);
  for (const date of ['', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '1799-12-31', '2256-01-01']) assert.equal(isValidGregorian(date), false, date);
  for (const date of [minDate, maxDate]) assert.equal(fromSolarHijri(toSolarHijri(date)), date);
});

test('every supported day round-trips; historical and present-day dates agree with Intl', () => {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let time = Date.parse(minDate); time <= Date.parse(maxDate); time += 86400000) {
    const gregorian = new Date(time).toISOString().slice(0, 10);
    const solar = toSolarHijri(gregorian);
    assert.equal(fromSolarHijri(solar), gregorian, solar);
    // ICU versions use different far-future equinox predictions. The application
    // deliberately uses the same fixed Borkowski rules in JS and PostgreSQL.
    if (gregorian <= '2100-12-31') {
      const parts = Object.fromEntries(formatter.formatToParts(time).map(p => [p.type, p.value]));
      assert.equal(solar, `${parts.year}-${parts.month}-${parts.day}`, gregorian);
    }
  }
});
