-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  dashboard jsonb;
begin
  perform public.mill_save_employee(
    '{"name":"Dashboard employee","monthly_salary":"3100","start_date":"2026-03-21"}',
    gen_random_uuid()
  );
  perform public.mill_save_monthly_expense(
    '{"solar_month":"1405-01","category_id":"electricity","amount":"620","description":"Dashboard electricity"}',
    gen_random_uuid()
  );

  dashboard := public.mill_expense_dashboard('2026-03-21');
  assert (dashboard->>'day_total')::numeric = 120, 'day includes 100 salary and 20 electricity';
  assert (dashboard->>'week_total')::numeric = 840, 'Saturday-Friday week includes seven allocated days';
  assert (dashboard->>'month_total')::numeric = 3720, 'month includes complete salary and electricity';
  assert (dashboard->>'week_average')::numeric = 120, 'weekly average is calculated per calendar day';
  assert (dashboard->>'month_average')::numeric = 120, 'monthly average is calculated per calendar day';
  assert jsonb_array_length(dashboard->'day_breakdown') = 1, 'daily breakdown has the selected day';
  assert jsonb_array_length(dashboard->'week_breakdown') = 7, 'weekly breakdown has every day including Friday';
  assert jsonb_array_length(dashboard->'month_breakdown') = 31, 'selected Solar Hijri month has one row per day';
  assert jsonb_array_length(dashboard->'year_breakdown') = 12, 'yearly breakdown has every Solar Hijri month';
  assert ((dashboard->'month_breakdown'->0)->>'solar_date') = '1405-01-01', 'daily report uses Solar Hijri dates';
  raise notice 'PASS: daily, weekly, monthly, yearly/all-time dashboard structure and fixed-cost allocation.';
end $$;
rollback;
