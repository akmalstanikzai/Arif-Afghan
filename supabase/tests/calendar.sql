-- Run in the same disposable database as workflows.sql, after all migrations.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare entry uuid; payment uuid; supplier uuid; rejected boolean := false;
begin
  supplier := public.mill_post('party','{"kind":"supplier","name":"Calendar test"}',gen_random_uuid());
  entry := public.mill_post('purchase',jsonb_build_object('date','2025-03-20','party_id',supplier,'raw_type_id',1,'weight',10,'unit_price',10,'paid',20),gen_random_uuid());
  assert (select date = date '2025-03-20' and date_solar_hijri = '1403-12-30' from public.mill_entries where id=entry), 'both business dates stored';
  assert (select date_solar_hijri = '1403-12-30' from public.mill_ledger where id=entry), 'ledger exposes Solar Hijri';
  select p.entry_id into payment from public.mill_payments p where target_id=entry;
  assert (select date_solar_hijri = '1403-12-30' from public.mill_entries where id=payment), 'automatic initial payments also save both dates';
  assert (public.mill_history('purchase',supplier,'2025-03-20','2025-03-20')->'rows'->0->>'date_solar_hijri') = '1403-12-30', 'history API returns both dates';
  assert (public.mill_history('purchase',supplier,'2025-03-21','2025-03-21')->>'count')::integer = 0, 'date filter remains exact';
  begin
    perform public.mill_post('expense','{"date":"2025-02-29","category_id":"food","description":"invalid","amount":1}',gen_random_uuid());
  exception when datetime_field_overflow then rejected := true; end;
  assert rejected, 'invalid Gregorian leap day rejected';
end $$;
reset role;
do $$ begin
  assert mill_private.solar_hijri_date(date '2024-03-20') = '1403-01-01';
  assert mill_private.solar_hijri_date(date '2025-03-21') = '1404-01-01';
  assert mill_private.solar_hijri_date(date '2026-03-20') = '1404-12-29';
  assert mill_private.solar_hijri_date(date '2026-03-21') = '1405-01-01';
  -- Even an owner cannot override a generated value with a conflicting date.
  begin
    update public.mill_entries set date_solar_hijri = '1400-01-01';
    raise exception 'Expected generated-column protection';
  exception when generated_always then null; end;
end $$;
rollback;
