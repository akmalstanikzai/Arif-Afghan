# Supabase backend

The frontend calls three functions: `mill_snapshot`, `mill_history`, and
`mill_post`. Tables are readable by active staff through RLS, with writes allowed
only through the checked transaction function. See
[the requirements map](../docs/backend-requirements.md) for each table's purpose.

## Apply in Supabase

**Latest update:** after 001–004, apply `20260920000500_processing_payments_packaging.sql`
for supplier father names, cheques, process start/completion, packaged inventory,
and purchase-only transport costs. This migration has not been run against
PostgreSQL in this task because server-start permission was declined. See
[workflow details and tests](../docs/processing-and-stock.md).


**Existing installation:** if the first two migrations are already applied, run
`migrations/20260920000300_simplify_snapshot.sql` if it is not yet applied, then
`migrations/20260920000400_dual_calendar_dates.sql`. If the first three are already
applied, run 004 followed by 005. If 001–004 are already applied, run only 005. The calendar migration stores and backfills the Solar Hijri
equivalent for every business date. See [calendar details](../docs/calendars.md).

**New installation:** run these files in order:

1. `20260920000100_mill_schema.sql`
2. `20260920000200_mill_operations.sql`
3. `20260920000300_simplify_snapshot.sql`
4. `20260920000400_dual_calendar_dates.sql`
5. `20260920000500_processing_payments_packaging.sql`

Do not rerun the first two files over existing tables. These files represent the
repository baseline; the hosted schema was not inspected. If you have made
separate hosted changes, compare them before applying a replacement function.
No migration in this refactor has been applied to your hosted project.

After creating the confirmed account in Supabase Auth, enable staff access:

```sql
insert into public.mill_staff(user_id)
select id from auth.users where email = 'staff@example.com'
on conflict (user_id) do update set active = true;
```

Use the actual staff email. The frontend must use only the project URL and public
publishable/anon key, never a service-role key. Keep environment files ignored.

## Local database checks

Use a disposable local database named `mill_test...`; never run the bootstrap or
test fixtures against production. `bootstrap.sql` creates minimal Auth roles and
users for plain PostgreSQL, and therefore belongs in a fresh isolated cluster.
Apply bootstrap, all migrations in filename order, then `tests/workflows.sql` and `tests/calendar.sql`
using `psql -v ON_ERROR_STOP=1`. Workflow fixtures roll back automatically.

Set `MILL_TEST_DATABASE_URL` to that local test database, then run
`node supabase/tests/concurrency.mjs`. This test commits disposable fixture data
and verifies concurrent sales, payments, deliveries, and duplicate retries. Also
run `node supabase/tests/calendar-parity.mjs` to check backfill and all 166,550
supported dates against the frontend conversion.

Migrations 001–004 were tested with PostgreSQL 18 locally, including the full
workflow and concurrency checks. A hosted Supabase smoke test remains necessary
after you apply it.

## Future changes

Save every database change as a new timestamped SQL migration. Never rewrite
applied migrations. If Edge Functions are introduced, keep their source in
`supabase/functions/<name>/index.ts` and shared code in `_shared`. No Edge Functions
are needed or deployed by the current app.
