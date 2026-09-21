-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.mill_parties(kind,name) values ('supplier','Reset test supplier');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare version_after bigint;
begin
  perform public.mill_save_employee('{"name":"Reset employee","monthly_salary":"3100","start_date":"2026-03-21"}',gen_random_uuid());
  perform public.mill_save_monthly_expense('{"solar_month":"1405-01","category_id":"electricity","amount":"620"}',gen_random_uuid());
  version_after := public.mill_clear_testing_data('CLEAR ALL DATA');
  assert version_after > 0, 'reset advances the shared data version';
  assert not exists(select 1 from public.mill_parties), 'parties cleared';
  assert not exists(select 1 from public.mill_employees), 'employees cleared';
  assert not exists(select 1 from public.mill_monthly_expenses), 'monthly expenses cleared';
  assert exists(select 1 from public.mill_raw_types), 'fixed rice catalog preserved';
  assert exists(select 1 from public.mill_products), 'fixed product catalog preserved';
  assert exists(select 1 from public.mill_staff where user_id=auth.uid()), 'staff access preserved';
  raise notice 'PASS: testing reset clears user-entered data and preserves access and fixed catalogs.';
end $$;
rollback;
