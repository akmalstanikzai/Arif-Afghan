-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare process uuid; payload jsonb;
begin
 process:=public.mill_start_contract_process('{"customer_name":"Contract customer","father_name":"Father","date":"2026-09-20","raw_type_id":1,"input_weight":100,"factory_percentage":10}',gen_random_uuid());
 assert (select process_source='contract' and processing_status='ongoing' and party_name='Contract customer' from public.mill_ledger where id=process),'ongoing contract is labeled and carries inline customer';
 assert (select quantity=0 from public.mill_raw_stock where id=1),'customer rice never enters or consumes factory raw stock';
 payload:=jsonb_build_object('id',process,'date','2026-09-21','outputs','[{"product_id":11,"weight":40,"bag_size":0,"bag_mark":""},{"product_id":12,"weight":30,"bag_size":0,"bag_mark":""},{"product_id":13,"weight":20,"bag_size":0,"bag_mark":""},{"product_id":14,"weight":10,"bag_size":0,"bag_mark":""}]'::jsonb);
 perform public.mill_complete_contract_process(payload,gen_random_uuid());
 assert (select service_received=4 and available=4 from public.mill_product_stock where id=11),'factory percentage enters processed inventory';
 assert (select sum((item->>'retained')::numeric)=10 and sum((item->>'returned')::numeric)=90 from public.mill_ledger l cross join lateral jsonb_array_elements(l.outputs)item where l.id=process),'factory and customer shares split by percentage';
 raise notice 'PASS: inline customer, ongoing contract label, factory share inventory, and customer return.';
end $$;
rollback;
