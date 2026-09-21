-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare supplier uuid; first_purchase uuid; second_purchase uuid; request uuid:=gen_random_uuid(); payment uuid; rejected boolean:=false;
begin
  supplier:=public.mill_post('party','{"kind":"supplier","name":"Aggregate payment test"}',gen_random_uuid());
  first_purchase:=public.mill_post('purchase',jsonb_build_object('party_id',supplier,'date','2026-09-20','raw_type_id',1,'weight',10,'unit_price',10),gen_random_uuid());
  second_purchase:=public.mill_post('purchase',jsonb_build_object('party_id',supplier,'date','2026-09-21','raw_type_id',1,'weight',20,'unit_price',10),gen_random_uuid());
  payment:=public.mill_pay_supplier(supplier,'2026-09-22',150,'cash','','',request);
  assert public.mill_pay_supplier(supplier,'2026-09-22',150,'cash','','',request)=payment,'supplier payment retry is idempotent';
  assert (select paid=100 and remaining=0 from public.mill_invoice_balances where id=first_purchase),'oldest purchase paid first';
  assert (select paid=50 and remaining=150 from public.mill_invoice_balances where id=second_purchase),'remainder applied to next purchase';
  assert (select paid=150 and remaining=150 from public.mill_party_balances where id=supplier),'supplier totals updated';
  begin perform public.mill_pay_supplier(supplier,'2026-09-22',151,'cash','','',gen_random_uuid()); exception when others then rejected:=true; end;
  assert rejected,'overpayment rejected';
  raise notice 'PASS: aggregate supplier payment allocation, totals, overpayment, and idempotency.';
end $$;
rollback;
