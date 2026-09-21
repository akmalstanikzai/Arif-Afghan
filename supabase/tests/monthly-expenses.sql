-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare expense_id uuid; summary jsonb;
begin
  assert public.mill_month_days('1405-01')=31,'first six Solar Hijri months have 31 days';
  assert public.mill_month_days('1405-07')=30,'months seven through eleven have 30 days';
  expense_id:=public.mill_save_monthly_expense('{"solar_month":"1405-01","category_id":"salary","amount":"3100","description":"Monthly payroll"}',gen_random_uuid());
  assert expense_id is not null,'monthly expense saved';
  summary:=public.mill_daily_expense_summary('2026-03-21');
  assert (summary->>'fixed')::numeric=100 and (summary->>'total')::numeric=100,'monthly expense allocated evenly to each day';
  perform public.mill_delete_monthly_expense(expense_id);
  assert jsonb_array_length(public.mill_monthly_expense_list())=0,'monthly expense deleted';
  raise notice 'PASS: Solar Hijri month lengths and daily fixed-expense allocation.';
end $$;
rollback;
