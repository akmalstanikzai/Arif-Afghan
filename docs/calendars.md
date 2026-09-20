# Gregorian and Solar Hijri dates

Every editable business date has two linked fields. Enter a Gregorian date using
the date input, or type a Solar Hijri (Shamsi/Jalali) date as `YYYY-MM-DD`, for
example `1405-01-01`. Slashes, Persian digits, and Arabic digits are also accepted
in the Solar Hijri field. The other field fills automatically. Clear either field
to clear the selected date. Invalid or incomplete dates cannot be saved.

This applies to purchases, factory processing, contract processing, sales,
expenses, later payments, later deliveries, and history's from/to filters.
History, record details, overview activity, and account creation dates show both
calendar representations with explicit labels in all three interface languages.
The interface language does not determine which calendar you may use.

## Storage and installation

Apply `supabase/migrations/20260920000400_dual_calendar_dates.sql` after the
existing migrations. No hosted database changes were performed automatically.

- `mill_entries.date` remains a PostgreSQL Gregorian `date`.
- `mill_entries.date_solar_hijri` is a **stored generated text column**, formatted
  `YYYY-MM-DD`. PostgreSQL's `date` type cannot represent a Solar Hijri date as
  Solar Hijri, so do not cast this text to a PostgreSQL date.
- Adding the generated column fills it for every existing business record,
  including voided entries. All future inserts derive it automatically, including
  invoice-generated payments and deliveries. No duplicate user input is needed.
- The backend calculates the second value, so a client cannot save inconsistent
  calendar pairs. The frontend sends the converted Gregorian business date to the
  existing `mill_post` API. Filtering, sorting, and payment chronology continue to
  compare that canonical date.
- The ledger, history API, and snapshot recent records expose both columns.
- Authentication and audit timestamps (`created_at`, `voided_at`) remain real
  timestamps; they are not editable business dates. The account creation date is
  displayed in both calendars without changing Supabase's Auth schema.

The frontend can display both calendars before the migration is applied, but
**both dates are persisted only after this migration has been run**.

## Conversion rules

The supported business-date range is 1800-01-01 through 2255-12-31 Gregorian.
The same fixed Borkowski/Jalali year-start arithmetic is used in the frontend and
PostgreSQL, adapted from [jalaali-js](https://github.com/jalaali/jalaali-js).
See `calendar-license.txt`. This is the **Solar** Hijri calendar, not lunar Hijri.
Month numbers are used so Afghan and Iranian month-name conventions do not alter
the meaning. Dates are converted without time zones or daylight-saving offsets.

Modern dates are independently checked against the runtime's Persian calendar.
Far-future equinox predictions differ between calendar implementations: the local
ICU implementation diverges at 2124-03-20. We deliberately use the fixed shared
algorithm for both stored and displayed dates rather than browser-dependent
future-year rules. All 166,550 supported days round-trip and match between JS
and PostgreSQL. Invalid leap days and month lengths are rejected.

If existing business records fall outside the supported range, the migration
fails atomically rather than silently changing or discarding their dates.

## Tests

- `npm test`: conversion vectors, leap days, both digit sets, invalid inputs,
  full-range round trips, present-day independent comparison, translations,
  page renders, and paired date controls.
- `supabase/tests/calendar.sql`: run after all migrations in the disposable
  database used by `workflows.sql`. Tests stored dates, initial payment dates,
  filtered history, validation, and generated-column protection.
- `node supabase/tests/calendar-parity.mjs`: with `MILL_TEST_DATABASE_URL` set to
  the same local `mill_test...` database, tests backfill and compares every
  supported date between the database and frontend.

Existing workflow and concurrency tests also pass with the calendar migration.
