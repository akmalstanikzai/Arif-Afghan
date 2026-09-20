-- Supplier identity, cheque references, processing lifecycle, and packaged stock.
-- Existing completed records and their historical costs are preserved.
begin;
alter table public.mill_parties add column father_name text not null default '' check(length(father_name)<=160);
alter table public.mill_payments
  add column payment_method text not null default 'cash' check(payment_method in ('cash','cheque')),
  add column cheque_number text not null default '' check(length(cheque_number)<=100),
  add column payment_institution text not null default '' check(length(payment_institution)<=160),
  add constraint mill_payment_reference check((payment_method='cash' and cheque_number='' and payment_institution='') or (payment_method='cheque' and length(trim(cheque_number))>0));
alter table public.mill_batches
  add column status text not null default 'completed' check(status in ('ongoing','completed')),
  add column completed_date date,
  add column completed_date_solar_hijri text generated always as (mill_private.solar_hijri_date(completed_date)) stored,
  add column completed_at timestamptz,
  add column completed_by uuid references auth.users,
  add column completion_notes text not null default '' check(length(completion_notes)<=2000);
update public.mill_batches b set completed_date=e.date,completed_at=e.created_at,completed_by=e.created_by from public.mill_entries e where e.id=b.entry_id;
alter table public.mill_batches add constraint mill_batch_completion check (
  (status='ongoing' and completed_date is null and completed_at is null and completed_by is null)
  or (status='completed' and completed_date is not null and completed_at is not null and completed_by is not null)
);
alter table public.mill_outputs
  add column bag_size numeric(4,1) not null default 0,
  add column bag_mark text not null default '',
  add constraint mill_output_packaging check((bag_size=0 and bag_mark='') or (bag_size in (20,24.5,70) and bag_mark in ('Talha','Mahfooz')));
alter table public.mill_outputs drop constraint mill_outputs_pkey;
alter table public.mill_outputs add primary key(entry_id,product_id,bag_size,bag_mark);
alter table public.mill_sales
  add column bag_size numeric(4,1) not null default 0,
  add column bag_mark text not null default '',
  add constraint mill_sale_packaging check((bag_size=0 and bag_mark='') or (bag_size in (20,24.5,70) and bag_mark in ('Talha','Mahfooz')));

create view public.mill_packaged_stock with (security_invoker=true) as
with variants as (
  select 0::numeric bag_size,''::text bag_mark
  union all select size,mark from unnest(array[20,24.5,70]::numeric[]) size cross join unnest(array['Talha','Mahfooz']) mark
), produced as (
  select o.product_id,o.bag_size,o.bag_mark,
    sum(case when e.kind='processing' then o.weight else 0 end) produced,
    sum(case when e.kind='service' then o.retained else 0 end) service_received
  from public.mill_outputs o join public.mill_entries e on e.id=o.entry_id where e.voided_at is null group by 1,2,3
), sold as (
  select s.product_id,s.bag_size,s.bag_mark,sum(s.weight) sold
  from public.mill_sales s join public.mill_entries e on e.id=s.entry_id where e.voided_at is null group by 1,2,3
), delivered as (
  select s.product_id,s.bag_size,s.bag_mark,sum(d.weight) delivered
  from public.mill_deliveries d join public.mill_entries e on e.id=d.entry_id join public.mill_sales s on s.entry_id=d.sale_id where e.voided_at is null group by 1,2,3
)
select p.id::text||':'||v.bag_size::text||':'||v.bag_mark id,p.id product_id,p.raw_type_id,p.quality,p.name,v.bag_size,v.bag_mark,
  coalesce(o.produced,0) produced,coalesce(o.service_received,0) service_received,coalesce(s.sold,0) sold,coalesce(d.delivered,0) delivered,
  coalesce(s.sold,0)-coalesce(d.delivered,0) reserved,
  coalesce(o.produced,0)+coalesce(o.service_received,0)-coalesce(s.sold,0) available,
  coalesce(o.produced,0)+coalesce(o.service_received,0)-coalesce(d.delivered,0) physical
from public.mill_products p cross join variants v
left join produced o on o.product_id=p.id and o.bag_size=v.bag_size and o.bag_mark=v.bag_mark
left join sold s on s.product_id=p.id and s.bag_size=v.bag_size and s.bag_mark=v.bag_mark
left join delivered d on d.product_id=p.id and d.bag_size=v.bag_size and d.bag_mark=v.bag_mark;
revoke all on public.mill_packaged_stock from public,anon;
grant select on public.mill_packaged_stock to authenticated;

-- Purchase logistics stay in purchase landed cost, never in the expense report.
-- Retain historical processing expenses; new lifecycle batches carry zero expenses.
create or replace view public.mill_expense_report with (security_invoker=true) as
select c.id,c.name,coalesce(x.amount,0) amount from public.mill_expense_categories c
left join (select x.category_id,sum(x.amount) amount from public.mill_expenses x join public.mill_entries e on e.id=x.entry_id where e.voided_at is null group by x.category_id) x on x.category_id=c.id
union all select 'processing','Processing expenses',sum(b.expenses) from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where e.voided_at is null having sum(b.expenses)>0;

create or replace function mill_private.save_outputs(entry uuid,raw smallint,input numeric,outputs jsonb,is_service boolean)
returns numeric language plpgsql set search_path = '' as $$
declare row_data jsonb; product smallint; q numeric; retained numeric; price numeric; total numeric:=0; fee numeric:=0; size numeric; mark text;
begin
  if jsonb_typeof(outputs) is distinct from 'array' or jsonb_array_length(outputs)<4 or jsonb_array_length(outputs)>28 then raise exception 'Enter the weight for all four qualities'; end if;
  for row_data in select value from jsonb_array_elements(outputs) loop
    product:=(row_data->>'product_id')::smallint;
    if not exists(select 1 from public.mill_products where id=product and raw_type_id=raw) then raise exception 'The selected product does not match the rice type'; end if;
    q:=mill_private.number(row_data->>'weight');
    retained:=case when is_service then mill_private.number(row_data->>'retained') else 0 end;
    price:=case when is_service then mill_private.number(row_data->>'fee_price',4) else 0 end;
    size:=coalesce(nullif(row_data->>'bag_size',''),'0')::numeric;
    mark:=coalesce(row_data->>'bag_mark','');
    if not ((size=0 and mark='') or (size in (20,24.5,70) and mark in ('Talha','Mahfooz'))) then raise exception 'Select a valid bag size and mark.'; end if;
    if retained>0 and price<=0 then raise exception 'Enter the agreed price for received rice'; end if;
    if exists(select 1 from public.mill_outputs o where o.entry_id=entry and o.product_id=product and o.bag_size=size and o.bag_mark=mark) then raise exception 'Each grade and packaging combination must appear only once.'; end if;
    insert into public.mill_outputs(entry_id,product_id,weight,retained,fee_price,bag_size,bag_mark) values(entry,product,q,retained,price,size,mark);
    total:=total+q; fee:=fee+retained*price;
  end loop;
  if (select count(distinct product_id) from public.mill_outputs where entry_id=entry)<>4 then raise exception 'Enter the weight for all four qualities'; end if;
  if total<=0 or total>input then raise exception 'Total output must be positive and no greater than input weight'; end if;
  return fee;
end $$;
revoke all on function mill_private.save_outputs(uuid,smallint,numeric,jsonb,boolean) from public,anon,authenticated;

create or replace function mill_private.payment_details(entry uuid,data jsonb)
returns void language plpgsql set search_path = '' as $$
declare method text:=coalesce(nullif(data->>'payment_method',''),'cash');
begin
  if method not in ('cash','cheque') then raise exception 'Select a valid payment method.'; end if;
  if method='cheque' and nullif(trim(data->>'cheque_number'),'') is null then raise exception 'Enter a cheque number.'; end if;
  update public.mill_payments set payment_method=method,
    cheque_number=case when method='cheque' then trim(data->>'cheque_number') else '' end,
    payment_institution=case when method='cheque' then trim(coalesce(data->>'payment_institution','')) else '' end
  where entry_id=entry;
end $$;
revoke all on function mill_private.payment_details(uuid,jsonb) from public,anon,authenticated;

create or replace view public.mill_party_balances with (security_invoker=true) as
select p.id,p.kind,p.name,p.contact,p.active,p.created_at,coalesce(b.total,0) total,coalesce(b.paid,0) paid,coalesce(b.rice_payment,0) rice_payment,coalesce(b.remaining,0) remaining,
coalesce(b.purchased_weight,0) purchased_weight,coalesce(b.delivered,0) delivered,coalesce(b.pending,0) pending,coalesce(b.sales_total,0) sales_total,coalesce(b.service_total,0) service_total,p.father_name
from public.mill_parties p left join (
select party_id,sum(total) total,sum(paid) paid,sum(rice_payment) rice_payment,sum(remaining) remaining,
sum(purchased_weight) purchased_weight,sum(delivered) delivered,sum(pending) pending,
sum(case when kind='sale' then total else 0 end) sales_total,sum(case when kind='service' then total else 0 end) service_total
from public.mill_invoice_balances group by party_id) b on b.party_id=p.id;

create or replace view public.mill_raw_stock with (security_invoker=true) as
select r.id,r.name,
  coalesce(p.weight,0)-coalesce(b.weight,0) quantity,
  coalesce(p.cost,0)-coalesce(b.cost,0) value,
  case when coalesce(p.weight,0)-coalesce(b.weight,0)>0
    then (coalesce(p.cost,0)-coalesce(b.cost,0))/(coalesce(p.weight,0)-coalesce(b.weight,0)) else 0 end average_cost,coalesce(b.in_process,0) in_process
from public.mill_raw_types r
left join (select p.raw_type_id,sum(p.weight) weight,sum(p.total_cost) cost from public.mill_purchases p join public.mill_entries e on e.id=p.entry_id where e.voided_at is null group by p.raw_type_id) p on p.raw_type_id=r.id
left join (select b.raw_type_id,sum(b.input_weight) weight,sum(b.raw_cost) cost,sum(case when b.status='ongoing' then b.input_weight else 0 end) in_process from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where e.voided_at is null group by b.raw_type_id) b on b.raw_type_id=r.id;

create or replace view public.mill_ledger with (security_invoker=true) as
select e.id,e.seq,e.kind,e.date,e.party_id,e.notes,e.created_at,e.created_by,e.voided_at,e.voided_by,e.void_reason,party.name party_name,coalesce(r.name,product.name,'') item_name,
coalesce(p.weight,b.input_weight,v.input_weight,s.weight,d.weight,0) weight,
coalesce(i.total,p.base_amount,s.total,v.charge,x.amount,pay.amount,b.raw_cost+b.expenses,0) total,
coalesce(i.paid,0) paid,coalesce(i.remaining,0) remaining,coalesce(i.rice_payment,0) rice_payment,
coalesce(i.delivered,0) delivered,coalesce(i.pending,0) pending,
coalesce(p.unit_price,s.unit_price,0) unit_price,coalesce(p.logistics,0) logistics,
coalesce(p.total_cost,b.raw_cost+b.expenses,0) total_cost,
coalesce(b.expenses,0) processing_expenses,coalesce(b.raw_cost,0) raw_cost,
coalesce(outputs.total_output,0) total_output,
case when e.kind='service' or (e.kind='processing' and b.status='completed') then coalesce(b.input_weight,v.input_weight)-coalesce(outputs.total_output,0) else 0 end wastage,
coalesce(outputs.items,'[]'::jsonb) outputs,
x.category_id,x.description,x.responsible,coalesce(pay.target_id,d.sale_id) target_id,
coalesce(target.kind,'') target_kind,target.seq target_seq,e.date_solar_hijri,party.father_name,
coalesce(pay.payment_method,'') payment_method,coalesce(pay.cheque_number,'') cheque_number,coalesce(pay.payment_institution,'') payment_institution,
coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id) raw_type_id,b.status processing_status,b.completed_date,b.completed_date_solar_hijri,b.completion_notes,
coalesce(s.bag_size,del_sale.bag_size,0) bag_size,coalesce(s.bag_mark,del_sale.bag_mark,'') bag_mark,
coalesce((select jsonb_agg(jsonb_build_object('id',pe.id,'seq',pe.seq,'date',pe.date,'date_solar_hijri',pe.date_solar_hijri,'amount',pp.amount,'payment_method',pp.payment_method,'cheque_number',pp.cheque_number,'payment_institution',pp.payment_institution,'voided_at',pe.voided_at) order by pe.seq) from public.mill_payments pp join public.mill_entries pe on pe.id=pp.entry_id where pp.target_id=e.id),'[]'::jsonb) payments
from public.mill_entries e
left join public.mill_parties party on party.id=e.party_id
left join public.mill_purchases p on p.entry_id=e.id
left join public.mill_batches b on b.entry_id=e.id
left join public.mill_services v on v.entry_id=e.id
left join public.mill_sales s on s.entry_id=e.id
left join public.mill_payments pay on pay.entry_id=e.id
left join public.mill_deliveries d on d.entry_id=e.id
left join public.mill_sales del_sale on del_sale.entry_id=d.sale_id
left join public.mill_expenses x on x.entry_id=e.id
left join public.mill_entries target on target.id=coalesce(pay.target_id,d.sale_id)
left join public.mill_raw_types r on r.id=coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id)
left join public.mill_products product on product.id=s.product_id
left join public.mill_invoice_balances i on i.id=e.id
left join (select o.entry_id,sum(o.weight) total_output,jsonb_agg(jsonb_build_object('product_id',o.product_id,'name',p.name,'weight',o.weight,'retained',o.retained,'fee_price',o.fee_price,'returned',o.weight-o.retained,'bag_size',o.bag_size,'bag_mark',o.bag_mark,'bags',case when o.bag_size>0 then o.weight/o.bag_size else null end) order by p.quality) items from public.mill_outputs o join public.mill_products p on p.id=o.product_id group by o.entry_id) outputs on outputs.entry_id=e.id;

create or replace function public.mill_post(p_kind text,p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid; party uuid; target uuid; raw smallint; prod smallint; entry_date date;
  q numeric; price numeric; amount numeric; expense numeric; available numeric; stock_value numeric;
  fee_value numeric:=0;
  prior mill_private.requests%rowtype; parent public.mill_entries%rowtype;
  balance public.mill_invoice_balances%rowtype; parent_raw smallint; batch public.mill_batches%rowtype; size numeric; mark text;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'The request is invalid'; end if;
  -- Updating a singleton lock serializes writers and also detects stale repeatable-read snapshots.
  update mill_private.write_lock set version=version+1 where id;
  select * into prior from mill_private.requests where id=p_request_id;
  if found then
    if prior.actor<>auth.uid() or prior.kind<>p_kind or prior.payload<>p_data then raise exception 'The request ID was already used'; end if;
    return prior.result;
  end if;
  if p_kind='party' then
    if coalesce(p_data->>'kind','') not in ('supplier','customer') then raise exception 'The party type is invalid'; end if;
    if nullif(trim(p_data->>'name'),'') is null then raise exception 'Enter a name'; end if;
    result_id:=nullif(p_data->>'id','')::uuid;
    if result_id is null then
      insert into public.mill_parties(kind,name,contact,father_name) values(p_data->>'kind',trim(p_data->>'name'),coalesce(p_data->>'contact',''),trim(coalesce(p_data->>'father_name',''))) returning id into result_id;
    else
      update public.mill_parties set father_name=trim(coalesce(p_data->>'father_name',father_name)),name=trim(p_data->>'name'),contact=coalesce(p_data->>'contact',''),active=coalesce((p_data->>'active')::boolean,true) where id=result_id and kind=p_data->>'kind';
      if not found then raise exception 'Party not found'; end if;
    end if;
  elsif p_kind='processing_start' then
    entry_date:=nullif(p_data->>'date','')::date;
    if entry_date is null then raise exception 'Enter a date'; end if;
    raw:=(p_data->>'raw_type_id')::smallint;
    q:=mill_private.number(p_data->>'input_weight');
    select quantity,value into available,stock_value from public.mill_raw_stock where id=raw;
    if available is null or q<=0 or q>available then raise exception 'There is not enough raw rice inventory'; end if;
    insert into public.mill_entries(kind,date,notes,created_by) values('processing',entry_date,coalesce(p_data->>'notes',''),auth.uid()) returning id into result_id;
    insert into public.mill_batches(entry_id,raw_type_id,input_weight,expenses,raw_cost,status)
      values(result_id,raw,q,0,case when q=available then stock_value else round(stock_value*q/available,8) end,'ongoing');
  elsif p_kind='processing_complete' then
    result_id:=nullif(p_data->>'id','')::uuid;
    select * into parent from public.mill_entries where id=result_id and kind='processing' and voided_at is null;
    if not found then raise exception 'Active record not found'; end if;
    select * into batch from public.mill_batches where entry_id=result_id and status='ongoing';
    if not found then raise exception 'This process is no longer ongoing.'; end if;
    entry_date:=nullif(p_data->>'date','')::date;
    if entry_date is null or entry_date<parent.date then raise exception 'Completion date cannot be before the start date.'; end if;
    perform mill_private.save_outputs(result_id,batch.raw_type_id,batch.input_weight,p_data->'outputs',false);
    update public.mill_batches set status='completed',completed_date=entry_date,completed_at=clock_timestamp(),completed_by=auth.uid(),completion_notes=coalesce(p_data->>'notes','') where entry_id=result_id;
  elsif p_kind='void' then
    result_id:=(p_data->>'id')::uuid;
    select * into parent from public.mill_entries where id=result_id and voided_at is null;
    if not found then raise exception 'Active record not found'; end if;
    if nullif(trim(p_data->>'reason'),'') is null then raise exception 'Enter a void reason'; end if;
    if exists(select 1 from public.mill_payments p join public.mill_entries e on e.id=p.entry_id where p.target_id=result_id and e.voided_at is null)
      or exists(select 1 from public.mill_deliveries d join public.mill_entries e on e.id=d.entry_id where d.sale_id=result_id and e.voided_at is null) then
      raise exception 'Void the related payments and deliveries first';
    end if;
    select raw_type_id into parent_raw from public.mill_purchases where entry_id=result_id;
    if parent.kind='processing' then select raw_type_id into parent_raw from public.mill_batches where entry_id=result_id; end if;
    if parent.kind in ('purchase','processing') and exists(select 1 from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where b.raw_type_id=parent_raw and e.seq>parent.seq and e.voided_at is null) then
      raise exception 'Void later processing batches for this rice type first to preserve cost';
    end if;
    update public.mill_entries set voided_at=clock_timestamp(),voided_by=auth.uid(),void_reason=trim(p_data->>'reason') where id=result_id;
    if exists(select 1 from public.mill_raw_stock where quantity<0 or value< -0.000001)
      or exists(select 1 from public.mill_product_stock ps where ps.available<0 or ps.physical<0 or ps.reserved<0)
      or exists(select 1 from public.mill_packaged_stock pkg where pkg.available<0 or pkg.physical<0 or pkg.reserved<0) then
      raise exception 'Voiding this record would make inventory negative; void dependent transactions first';
    end if;
  else
    if p_kind not in ('purchase','processing','service','sale','payment','delivery','expense') then raise exception 'The transaction type is invalid'; end if;
    entry_date:=nullif(p_data->>'date','')::date;
    if entry_date is null then raise exception 'Enter a date'; end if;
    party:=nullif(p_data->>'party_id','')::uuid;
    if p_kind in ('purchase','sale','service') then
      if not exists(select 1 from public.mill_parties where id=party and active and kind=case when p_kind='purchase' then 'supplier' else 'customer' end) then raise exception 'Select a valid supplier or customer'; end if;
    elsif p_kind in ('payment','delivery') then
      target:=nullif(p_data->>'target_id','')::uuid;
      select * into parent from public.mill_entries where id=target and voided_at is null;
      if not found or parent.kind not in ('purchase','sale','service') or (p_kind='delivery' and parent.kind<>'sale') then raise exception 'The related record is invalid'; end if;
      if entry_date<parent.date then raise exception 'The payment or delivery date cannot be before the record date'; end if;
      party:=parent.party_id;
      select * into balance from public.mill_invoice_balances where id=target;
    else party:=null;
    end if;
    insert into public.mill_entries(kind,date,party_id,notes,created_by) values(p_kind,entry_date,party,coalesce(p_data->>'notes',''),auth.uid()) returning id into result_id;
    if p_kind='purchase' then
      raw:=(p_data->>'raw_type_id')::smallint;
      q:=mill_private.number(p_data->>'weight'); price:=mill_private.number(p_data->>'unit_price',4); expense:=mill_private.number(p_data->>'logistics',2);
      insert into public.mill_purchases(entry_id,raw_type_id,weight,unit_price,logistics) values(result_id,raw,q,price,expense);
    elsif p_kind in ('processing','service') then
      raw:=(p_data->>'raw_type_id')::smallint;
      q:=mill_private.number(p_data->>'input_weight');
      fee_value:=mill_private.save_outputs(result_id,raw,q,p_data->'outputs',p_kind='service');
      if p_kind='processing' then
        select quantity,value into available,stock_value from public.mill_raw_stock where id=raw;
        if q<=0 or q>available then raise exception 'There is not enough raw rice inventory'; end if;
        expense:=mill_private.number(p_data->>'expenses',2);
        insert into public.mill_batches(entry_id,raw_type_id,input_weight,expenses,raw_cost,completed_date,completed_at,completed_by) values(result_id,raw,q,expense,case when q=available then stock_value else round(stock_value*q/available,8) end,entry_date,clock_timestamp(),auth.uid());
      else
        amount:=mill_private.number(p_data->>'charge',2);
        if round(fee_value,2)>amount then raise exception 'The value of received rice exceeds the processing charge'; end if;
        insert into public.mill_services(entry_id,raw_type_id,input_weight,charge) values(result_id,raw,q,amount);
      end if;
    elsif p_kind='sale' then
      prod:=(p_data->>'product_id')::smallint; q:=mill_private.number(p_data->>'weight'); price:=mill_private.number(p_data->>'unit_price',4);
      size:=coalesce(nullif(p_data->>'bag_size',''),'0')::numeric; mark:=coalesce(p_data->>'bag_mark','');
      select ps.available into available from public.mill_packaged_stock ps where ps.product_id=prod and ps.bag_size=size and ps.bag_mark=mark;
      if available is null or q<=0 or q>available then raise exception 'There is not enough available inventory'; end if;
      insert into public.mill_sales(entry_id,product_id,weight,unit_price,bag_size,bag_mark) values(result_id,prod,q,price,size,mark);
    elsif p_kind='payment' then
      amount:=mill_private.number(p_data->>'amount',2);
      if amount<=0 or amount>balance.remaining then raise exception 'Payment must be positive and no greater than the remaining balance'; end if;
      insert into public.mill_payments(entry_id,target_id,amount) values(result_id,target,amount);
      perform mill_private.payment_details(result_id,p_data);
    elsif p_kind='delivery' then
      q:=mill_private.number(p_data->>'weight');
      if q<=0 or q>balance.pending then raise exception 'Delivery weight exceeds the remaining amount or is invalid'; end if;
      insert into public.mill_deliveries values(result_id,target,q);
    elsif p_kind='expense' then
      amount:=mill_private.number(p_data->>'amount',2);
      insert into public.mill_expenses values(result_id,p_data->>'category_id',trim(p_data->>'description'),coalesce(p_data->>'responsible',''),amount);
    end if;
    -- Initial cash and collection are posted inside the same transaction as the invoice.
    if p_kind in ('purchase','sale','service') then
      amount:=mill_private.number(p_data->>'paid',2);
      select * into balance from public.mill_invoice_balances where id=result_id;
      if amount>balance.remaining then raise exception 'Payment exceeds the remaining balance'; end if;
      if amount>0 then
        insert into public.mill_entries(kind,date,party_id,notes,created_by) values('payment',entry_date,party,'Payment recorded with invoice',auth.uid()) returning id into target;
        insert into public.mill_payments(entry_id,target_id,amount) values(target,result_id,amount);
        perform mill_private.payment_details(target,p_data);
      end if;
      if p_kind='sale' then
        q:=mill_private.number(p_data->>'delivered');
        if q>balance.pending then raise exception 'Delivery exceeds the sale weight'; end if;
        if q>0 then
          insert into public.mill_entries(kind,date,party_id,notes,created_by) values('delivery',entry_date,party,'Delivery recorded with sale',auth.uid()) returning id into target;
          insert into public.mill_deliveries values(target,result_id,q);
        end if;
      end if;
    end if;
  end if;
  insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),p_kind,p_data,result_id);
  return result_id;
end $$;
revoke all on function public.mill_post(text,jsonb,uuid) from public,anon;
grant execute on function public.mill_post(text,jsonb,uuid) to authenticated;

create or replace function public.mill_snapshot() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not public.mill_is_staff() then
    raise exception 'You do not have permission to access factory data';
  end if;
  select jsonb_build_object(
    'raw_stock', (select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_raw_stock x),
    'products', (select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_product_stock x),
    'packaged_stock',(select coalesce(jsonb_agg(x order by x.product_id,x.bag_size,x.bag_mark),'[]'::jsonb) from public.mill_packaged_stock x),
    'ongoing_processes',(select coalesce(jsonb_agg(x order by x.seq),'[]'::jsonb) from public.mill_ledger x where x.processing_status='ongoing' and x.voided_at is null),
    'parties', (select coalesce(jsonb_agg(x order by x.name),'[]'::jsonb) from public.mill_party_balances x),
    'expense_categories', (select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_expense_categories x),
    'expenses', (select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_expense_report x),
    'recent', (select coalesce(jsonb_agg(x order by x.seq desc),'[]'::jsonb) from (select * from public.mill_ledger order by seq desc limit 12) x),
    'summary', accounts.totals || production.totals || jsonb_build_object(
      'expenses', (select coalesce(sum(amount),0) from public.mill_expense_report)
    )
  ) into result
  from (
    select jsonb_build_object(
      'purchases', coalesce(sum(total) filter (where kind='purchase'),0),
      'sales', coalesce(sum(total) filter (where kind='sale'),0),
      'service_charges', coalesce(sum(total) filter (where kind='service'),0),
      'received', coalesce(sum(paid) filter (where kind in ('sale','service')),0),
      'supplier_paid', coalesce(sum(paid) filter (where kind='purchase'),0),
      'receivable', coalesce(sum(remaining) filter (where kind in ('sale','service')),0),
      'payable', coalesce(sum(remaining) filter (where kind='purchase'),0),
      'rice_payment', coalesce(sum(rice_payment) filter (where kind='service'),0)
    ) totals from public.mill_invoice_balances
  ) accounts
  cross join (
    select jsonb_build_object(
      'processing_count', count(*) filter (where e.kind='processing'),
      'processing_input', coalesce(sum(b.input_weight) filter (where e.kind='processing'),0),
      'processing_output', coalesce(sum(o.weight) filter (where e.kind='processing'),0),
      'wastage', coalesce(sum(b.input_weight-coalesce(o.weight,0)) filter (where e.kind='processing'),0),
      'service_count', count(*) filter (where e.kind='service'),
      'service_input', coalesce(sum(s.input_weight) filter (where e.kind='service'),0),
      'service_output', coalesce(sum(o.weight) filter (where e.kind='service'),0),
      'service_wastage', coalesce(sum(s.input_weight-coalesce(o.weight,0)) filter (where e.kind='service'),0)
    ) totals
    from public.mill_entries e
    left join public.mill_batches b on b.entry_id=e.id
    left join public.mill_services s on s.entry_id=e.id
    left join (select entry_id,sum(weight) weight from public.mill_outputs group by entry_id) o on o.entry_id=e.id
    where e.voided_at is null and (e.kind='service' or (e.kind='processing' and b.status='completed'))
  ) production;
  return result;
end $$;
revoke all on function public.mill_snapshot() from public,anon;
grant execute on function public.mill_snapshot() to authenticated;

create or replace function public.mill_history(p_kind text default null,p_party uuid default null,p_from date default null,p_to date default null,p_search text default '',p_page integer default 0,p_voided boolean default false,p_category text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; begin
 if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_page<0 then raise exception 'The page is invalid'; end if;
 with filtered as (
  select * from public.mill_ledger l where (p_kind is null or l.kind=p_kind) and (p_party is null or l.party_id=p_party)
  and (p_from is null or l.date>=p_from) and (p_to is null or l.date<=p_to) and (p_voided or l.voided_at is null)
  and (p_category is null or l.category_id=p_category)
  and (coalesce(p_search,'')='' or concat_ws(' ',l.party_name,l.father_name,l.item_name,l.notes,l.description,l.cheque_number,l.payment_institution,l.seq::text) ilike '%'||p_search||'%')
 ) select jsonb_build_object('count',(select count(*) from filtered),'total',(select coalesce(sum(total),0) from filtered where voided_at is null),
 'rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select * from filtered order by date desc,seq desc limit 50 offset p_page*50) x)) into result;
 return result;
end $$;
revoke all on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) from public,anon;
grant execute on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) to authenticated;
commit;
