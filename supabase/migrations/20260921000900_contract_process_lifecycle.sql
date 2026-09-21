begin;

alter table public.mill_batches add column process_source text not null default 'factory' check(process_source in ('factory','contract'));
alter table public.mill_batches add column factory_percentage numeric(7,4) check((process_source='factory' and factory_percentage is null) or (process_source='contract' and factory_percentage>0 and factory_percentage<=100));

create or replace view public.mill_raw_stock with (security_invoker=true) as
select r.id,r.name,coalesce(p.weight,0)-coalesce(b.weight,0) quantity,coalesce(p.cost,0)-coalesce(b.cost,0) value,
case when coalesce(p.weight,0)-coalesce(b.weight,0)>0 then (coalesce(p.cost,0)-coalesce(b.cost,0))/(coalesce(p.weight,0)-coalesce(b.weight,0)) else 0 end average_cost,
coalesce(b.in_process,0) in_process,case when coalesce(p.weight,0)>0 then coalesce(p.purchase_amount,0)/p.weight else 0 end purchase_price_per_kg
from public.mill_raw_types r
left join (select p.raw_type_id,sum(p.weight) weight,sum(p.total_cost) cost,sum(p.base_amount) purchase_amount from public.mill_purchases p join public.mill_entries e on e.id=p.entry_id where e.voided_at is null group by p.raw_type_id)p on p.raw_type_id=r.id
left join (select b.raw_type_id,sum(b.input_weight) weight,sum(b.raw_cost) cost,sum(case when b.status='ongoing' then b.input_weight else 0 end) in_process from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where e.voided_at is null and e.kind='processing' group by b.raw_type_id)b on b.raw_type_id=r.id;

create or replace view public.mill_ledger with (security_invoker=true) as
select e.id,e.seq,e.kind,e.date,e.party_id,e.notes,e.created_at,e.created_by,e.voided_at,e.voided_by,e.void_reason,party.name party_name,coalesce(r.name,product.name,'') item_name,
coalesce(p.weight,b.input_weight,v.input_weight,s.weight,d.weight,0) weight,coalesce(i.total,p.base_amount,s.total,v.charge,x.amount,pay.amount,b.raw_cost+b.expenses,0) total,
coalesce(i.paid,0) paid,coalesce(i.remaining,0) remaining,coalesce(i.rice_payment,0) rice_payment,coalesce(i.delivered,0) delivered,coalesce(i.pending,0) pending,
coalesce(p.unit_price,s.unit_price,0) unit_price,coalesce(p.logistics,0) logistics,coalesce(p.total_cost,b.raw_cost+b.expenses,0) total_cost,
coalesce(b.expenses,0) processing_expenses,coalesce(b.raw_cost,0) raw_cost,coalesce(outputs.total_output,0) total_output,
case when e.kind='service' or (e.kind='processing' and b.status='completed') then coalesce(b.input_weight,v.input_weight)-coalesce(outputs.total_output,0) else 0 end wastage,
coalesce(outputs.items,'[]'::jsonb) outputs,x.category_id,x.description,x.responsible,coalesce(pay.target_id,d.sale_id) target_id,
coalesce(target.kind,'') target_kind,target.seq target_seq,e.date_solar_hijri,party.father_name,
coalesce(pay.payment_method,'') payment_method,coalesce(pay.cheque_number,'') cheque_number,coalesce(pay.payment_institution,'') payment_institution,
coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id) raw_type_id,b.status processing_status,b.completed_date,b.completed_date_solar_hijri,b.completion_notes,
coalesce(s.bag_size,del_sale.bag_size,0) bag_size,coalesce(s.bag_mark,del_sale.bag_mark,'') bag_mark,
coalesce((select jsonb_agg(jsonb_build_object('id',pe.id,'seq',pe.seq,'date',pe.date,'date_solar_hijri',pe.date_solar_hijri,'amount',pp.amount,'payment_method',pp.payment_method,'cheque_number',pp.cheque_number,'payment_institution',pp.payment_institution,'voided_at',pe.voided_at) order by pe.seq) from public.mill_payments pp join public.mill_entries pe on pe.id=pp.entry_id where pp.target_id=e.id),'[]'::jsonb) payments,
b.process_source,b.factory_percentage
from public.mill_entries e left join public.mill_parties party on party.id=e.party_id left join public.mill_purchases p on p.entry_id=e.id
left join public.mill_batches b on b.entry_id=e.id left join public.mill_services v on v.entry_id=e.id left join public.mill_sales s on s.entry_id=e.id
left join public.mill_payments pay on pay.entry_id=e.id left join public.mill_deliveries d on d.entry_id=e.id left join public.mill_sales del_sale on del_sale.entry_id=d.sale_id
left join public.mill_expenses x on x.entry_id=e.id left join public.mill_entries target on target.id=coalesce(pay.target_id,d.sale_id)
left join public.mill_raw_types r on r.id=coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id) left join public.mill_products product on product.id=s.product_id
left join public.mill_invoice_balances i on i.id=e.id
left join (select o.entry_id,sum(o.weight) total_output,jsonb_agg(jsonb_build_object('product_id',o.product_id,'name',p.name,'weight',o.weight,'retained',o.retained,'fee_price',o.fee_price,'returned',o.weight-o.retained,'bag_size',o.bag_size,'bag_mark',o.bag_mark,'bags',case when o.bag_size>0 then o.weight/o.bag_size else null end) order by p.quality) items from public.mill_outputs o join public.mill_products p on p.id=o.product_id group by o.entry_id) outputs on outputs.entry_id=e.id;

create or replace function public.mill_start_contract_process(p_data jsonb,p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; customer uuid; prior mill_private.requests%rowtype; q numeric; percentage numeric; raw smallint; entry_date date;
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_request_id is null or p_data is null then raise exception 'The request is invalid'; end if; update mill_private.write_lock set version=version+1 where id;
 select * into prior from mill_private.requests where id=p_request_id; if found then if prior.actor<>auth.uid() or prior.kind<>'contract_start' or prior.payload<>p_data then raise exception 'The request ID was already used'; end if; return prior.result; end if;
 if nullif(trim(p_data->>'customer_name'),'') is null or nullif(trim(p_data->>'father_name'),'') is null then raise exception 'Enter customer details, rice weight, and a factory percentage between 0 and 100'; end if;
 q:=mill_private.number(p_data->>'input_weight'); percentage:=mill_private.number(p_data->>'factory_percentage',4); if q<=0 or percentage<=0 or percentage>100 then raise exception 'Enter customer details, rice weight, and a factory percentage between 0 and 100'; end if;
 raw:=(p_data->>'raw_type_id')::smallint; if not exists(select 1 from public.mill_raw_types where id=raw) then raise exception 'Select a raw rice type'; end if;
 entry_date:=(p_data->>'date')::date;
 insert into public.mill_parties(kind,name,father_name,contact) values('customer',trim(p_data->>'customer_name'),trim(p_data->>'father_name'),coalesce(p_data->>'contact','')) returning id into customer;
 insert into public.mill_entries(kind,date,party_id,notes,created_by) values('service',entry_date,customer,coalesce(p_data->>'notes',''),auth.uid()) returning id into result_id;
 insert into public.mill_batches(entry_id,raw_type_id,input_weight,expenses,raw_cost,status,process_source,factory_percentage) values(result_id,raw,q,0,0,'ongoing','contract',percentage);
 insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'contract_start',p_data,result_id); return result_id; end $$;
revoke all on function public.mill_start_contract_process(jsonb,uuid) from public,anon; grant execute on function public.mill_start_contract_process(jsonb,uuid) to authenticated;

create or replace function public.mill_complete_contract_process(p_data jsonb,p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; prior mill_private.requests%rowtype; batch public.mill_batches%rowtype; parent public.mill_entries%rowtype; row_data jsonb; product smallint; q numeric; retained numeric; total numeric:=0; size numeric; mark text; entry_date date;
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_request_id is null or p_data is null then raise exception 'The request is invalid'; end if; update mill_private.write_lock set version=version+1 where id;
 select * into prior from mill_private.requests where id=p_request_id; if found then if prior.actor<>auth.uid() or prior.kind<>'contract_complete' or prior.payload<>p_data then raise exception 'The request ID was already used'; end if; return prior.result; end if;
 result_id:=(p_data->>'id')::uuid; select * into parent from public.mill_entries where id=result_id and kind='service' and voided_at is null; if not found then raise exception 'Active record not found'; end if;
 select * into batch from public.mill_batches where entry_id=result_id and status='ongoing' and process_source='contract'; if not found then raise exception 'This process is no longer ongoing.'; end if;
 entry_date:=(p_data->>'date')::date; if entry_date<parent.date then raise exception 'Completion date cannot be before the start date.'; end if;
 if jsonb_typeof(p_data->'outputs') is distinct from 'array' or jsonb_array_length(p_data->'outputs')<4 or jsonb_array_length(p_data->'outputs')>28 then raise exception 'Enter the weight for all four qualities'; end if;
 for row_data in select value from jsonb_array_elements(p_data->'outputs') loop product:=(row_data->>'product_id')::smallint; if not exists(select 1 from public.mill_products where id=product and raw_type_id=batch.raw_type_id) then raise exception 'The selected product does not match the rice type'; end if;
  q:=mill_private.number(row_data->>'weight'); retained:=round(q*batch.factory_percentage/100,3); size:=coalesce(nullif(row_data->>'bag_size',''),'0')::numeric; mark:=coalesce(row_data->>'bag_mark','');
  if not ((size=0 and mark='') or (size in (20,24.5,70) and mark in ('Talha','Mahfooz'))) then raise exception 'Select a valid bag size and mark.'; end if;
  if exists(select 1 from public.mill_outputs where entry_id=result_id and product_id=product and bag_size=size and bag_mark=mark) then raise exception 'Each grade and packaging combination must appear only once.'; end if;
  insert into public.mill_outputs(entry_id,product_id,weight,retained,fee_price,bag_size,bag_mark) values(result_id,product,q,retained,0,size,mark); total:=total+q;
 end loop;
 if (select count(distinct product_id) from public.mill_outputs where entry_id=result_id)<>4 then raise exception 'Enter the weight for all four qualities'; end if;
 if total<=0 or total>batch.input_weight then raise exception 'Total output must be positive and no greater than input weight'; end if;
 insert into public.mill_services(entry_id,raw_type_id,input_weight,charge) values(result_id,batch.raw_type_id,batch.input_weight,0);
 update public.mill_batches set status='completed',completed_date=entry_date,completed_at=clock_timestamp(),completed_by=auth.uid(),completion_notes=coalesce(p_data->>'notes','') where entry_id=result_id;
 insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'contract_complete',p_data,result_id); return result_id; end $$;
revoke all on function public.mill_complete_contract_process(jsonb,uuid) from public,anon; grant execute on function public.mill_complete_contract_process(jsonb,uuid) to authenticated;

commit;
