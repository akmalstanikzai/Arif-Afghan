-- Run only in the disposable test database after bootstrap and migrations.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare supplier uuid; customer uuid; purchase uuid; batch uuid; sale uuid; service uuid; payment uuid; delivery uuid; request uuid:=gen_random_uuid(); payload jsonb; n numeric; count_before bigint; rejected boolean;
begin
 supplier:=public.mill_post('party','{"kind":"supplier","name":"تأمین‌کننده آزمایشی"}',gen_random_uuid());
 customer:=public.mill_post('party','{"kind":"customer","name":"مشتری آزمایشی"}',gen_random_uuid());
 payload:=jsonb_build_object('party_id',supplier,'date','2026-09-20','raw_type_id',1,'weight',1000,'unit_price',50,'logistics',1000,'paid',10000);
 purchase:=public.mill_post('purchase',payload,request);
 assert public.mill_post('purchase',payload,request)=purchase, 'idempotent retry';
 assert (select quantity=1000 and value=51000 from public.mill_raw_stock where id=1), 'raw purchase stock and landed cost';
 assert (select total=50000 and paid=10000 and remaining=40000 from public.mill_party_balances where id=supplier), 'logistics excluded from supplier payable';
 batch:=public.mill_post('processing','{"date":"2026-09-20","raw_type_id":1,"input_weight":600,"expenses":2400,"outputs":[{"product_id":11,"weight":300},{"product_id":12,"weight":120},{"product_id":13,"weight":60},{"product_id":14,"weight":20}]}',gen_random_uuid());
 assert (select quantity=400 and value=20400 from public.mill_raw_stock where id=1), 'weighted average raw consumption';
 assert (select total_cost=33000 and total_output=500 and wastage=100 from public.mill_ledger where id=batch), 'batch costing and loss';
 sale:=public.mill_post('sale',jsonb_build_object('date','2026-09-20','party_id',customer,'product_id',11,'weight',200,'unit_price',80,'paid',6000,'delivered',50),gen_random_uuid());
 assert (select available=100 and physical=250 and reserved=150 from public.mill_product_stock where id=11), 'sale vs physical delivery';
 assert (select remaining=10000 from public.mill_invoice_balances where id=sale), 'customer balance';
 service:=public.mill_post('service',jsonb_build_object('date','2026-09-20','party_id',customer,'raw_type_id',1,'input_weight',100,'charge',1000,'paid',200,'outputs','[{"product_id":11,"weight":60,"retained":5,"fee_price":100},{"product_id":12,"weight":20},{"product_id":13,"weight":10},{"product_id":14,"weight":0}]'::jsonb),gen_random_uuid());
 assert (select quantity=400 from public.mill_raw_stock where id=1), 'service never consumes own raw';
 assert (select available=105 and physical=255 and reserved=150 and service_received=5 from public.mill_product_stock where id=11), 'only retained service rice enters own stock';
 assert (select total=17000 and paid=6200 and rice_payment=500 and remaining=10300 and pending=150 from public.mill_party_balances where id=customer), 'mixed service settlement';
 payment:=public.mill_post('payment',jsonb_build_object('date','2026-09-20','target_id',sale,'amount',1000),gen_random_uuid());
 delivery:=public.mill_post('delivery',jsonb_build_object('date','2026-09-20','target_id',sale,'weight',75),gen_random_uuid());
 assert (select remaining=9000 and pending=75 from public.mill_invoice_balances where id=sale), 'later cash and delivery';
 perform public.mill_post('expense','{"date":"2026-09-20","category_id":"electricity","description":"برق آزمایشی","amount":500}',gen_random_uuid());
 assert (select sum(amount)=2900 from public.mill_expense_report), 'expenses counted once';
 select count(*) into count_before from public.mill_entries;
 rejected:=false; begin perform public.mill_post('sale',jsonb_build_object('date','2026-09-20','party_id',customer,'product_id',11,'weight',106,'unit_price',80),gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected, 'overselling rejected';
 assert (select count(*)=count_before from public.mill_entries), 'failed sale rolls back header';
 rejected:=false; begin perform public.mill_post('purchase',jsonb_build_object('date','2026-09-20','party_id',supplier,'raw_type_id',1,'weight',100,'unit_price',10,'paid',1001),gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected and (select count(*)=count_before from public.mill_entries), 'late failure rolls back inventory and initial payment';
 rejected:=false; begin perform public.mill_post('processing','{"date":"2026-09-20","raw_type_id":1,"input_weight":500,"outputs":[{"product_id":11,"weight":300},{"product_id":12,"weight":0},{"product_id":13,"weight":0},{"product_id":14,"weight":0}]}',gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected and (select count(*)=count_before from public.mill_entries), 'raw overdraw rolls back outputs';
 rejected:=false; begin perform public.mill_post('delivery',jsonb_build_object('date','2026-09-20','target_id',sale,'weight',76),gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected, 'overdelivery rejected';
 rejected:=false; begin perform public.mill_post('void',jsonb_build_object('id',sale,'reason','آزمایش'),gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected, 'cannot void invoice with active payments and deliveries';
 rejected:=false; begin perform public.mill_post('void',jsonb_build_object('id',batch,'reason','آزمایش'),gen_random_uuid()); exception when others then rejected:=true; end;
 assert rejected, 'cannot void consumed processed inventory';
 perform public.mill_post('void',jsonb_build_object('id',delivery,'reason','تصحیح وزن'),gen_random_uuid());
 assert (select reserved=150 and physical=255 from public.mill_product_stock where id=11), 'delivery reversal restores physical stock only';
 perform public.mill_post('void',jsonb_build_object('id',payment,'reason','تصحیح مبلغ'),gen_random_uuid());
 assert (select remaining=10000 from public.mill_invoice_balances where id=sale), 'payment reversal restores balance';
 rejected:=false; begin update public.mill_sales set weight=1 where entry_id=sale; exception when insufficient_privilege then rejected:=true; end;
 assert rejected, 'direct mutation denied';
 assert (public.mill_snapshot()->'summary'->>'sales')::numeric=16000, 'snapshot summary';
 assert public.mill_snapshot()->'summary' = jsonb_build_object(
   'purchases',50000,'sales',16000,'service_charges',1000,'received',6200,
   'supplier_paid',10000,'receivable',10300,'payable',40000,'rice_payment',500,
   'expenses',2900,'processing_count',1,'processing_input',600,'processing_output',500,
   'wastage',100,'service_count',1,'service_input',100,'service_output',90,'service_wastage',10
 ), 'all dashboard totals match purchases, processing, service, cash, and reversals';
 assert (public.mill_history('sale',customer)->>'count')::integer=1, 'filtered history';
 raise notice 'PASS: purchase -> raw -> processing -> processed -> sale -> payment -> delivery; service rice/cash/balance; reversals; rollback; RLS mutation protection.';
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare rejected boolean:=false; begin
 assert (select count(*)=0 from public.mill_entries), 'non-staff cannot read';
 begin perform public.mill_snapshot(); exception when others then rejected:=true; end;
 assert rejected, 'non-staff RPC denied';
end $$;
set local role anon;
do $$ declare rejected boolean:=false; begin
 begin perform public.mill_snapshot(); exception when insufficient_privilege then rejected:=true; end;
 assert rejected, 'anonymous RPC denied';
end $$;
rollback;
