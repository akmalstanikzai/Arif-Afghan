import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { toSolarHijri, minDate, maxDate } from '../../src/lib/calendar.js';

const url = process.env.MILL_TEST_DATABASE_URL;
if (!url) throw new Error('Set MILL_TEST_DATABASE_URL to a disposable local mill_test database.');
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.startsWith('/mill_test')) throw new Error('Only local mill_test databases are allowed.');
const sql = `
begin;
create temporary table calendar_backfill (date date not null);
insert into calendar_backfill values ('2025-03-20'),('2026-03-21');
alter table calendar_backfill add column date_solar_hijri text generated always as (mill_private.solar_hijri_date(date)) stored not null;
do $$ begin
  assert (select date_solar_hijri='1403-12-30' from calendar_backfill where date='2025-03-20');
  assert (select date_solar_hijri='1405-01-01' from calendar_backfill where date='2026-03-21');
end $$;
select (date '${minDate}' + n)::text || ',' || mill_private.solar_hijri_date(date '${minDate}' + n)
from generate_series(0, date '${maxDate}' - date '${minDate}') n;
rollback;
`;
const result = execFileSync(process.env.PSQL_BIN || 'psql', [url, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
const rows = result.trim().split('\n');
for (const row of rows) {
  const [gregorian, solar] = row.trim().split(',');
  assert.equal(solar, toSolarHijri(gregorian), gregorian);
}
assert.equal(rows.length, (Date.parse(maxDate) - Date.parse(minDate)) / 86400000 + 1);
console.log(`PASS: stored-column backfill and ${rows.length} dates agree between PostgreSQL and the frontend.`);
