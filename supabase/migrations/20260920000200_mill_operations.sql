begin;
create or replace function mill_private.number(value text, decimals integer default 3) returns numeric
language plpgsql immutable set search_path = '' as $$
declare n numeric; begin
  n:=coalesce(nullif(value,''),'0')::numeric;
  if n::text in ('NaN','Infinity','-Infinity') or n<0 or n>1000000000000 then raise exception 'The entered value is invalid'; end if;
  return round(n,decimals);
exception when invalid_text_representation then raise exception 'Please enter a valid number';
end $$;

create or replace function public.mill_post(p_kind text,p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid; party uuid; target uuid; raw smallint; prod smallint; entry_date date;
  q numeric; price numeric; amount numeric; expense numeric; available numeric; stock_value numeric;
  total_output numeric:=0; fee_value numeric:=0; retained numeric; output_weight numeric;
  row_data jsonb; prior mill_private.requests%rowtype; parent public.mill_entries%rowtype;
  balance public.mill_invoice_balances%rowtype; parent_raw smallint;
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
      insert into public.mill_parties(kind,name,contact) values(p_data->>'kind',trim(p_data->>'name'),coalesce(p_data->>'contact','')) returning id into result_id;
    else
      update public.mill_parties set name=trim(p_data->>'name'),contact=coalesce(p_data->>'contact',''),active=coalesce((p_data->>'active')::boolean,true) where id=result_id and kind=p_data->>'kind';
      if not found then raise exception 'Party not found'; end if;
    end if;
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
      or exists(select 1 from public.mill_product_stock ps where ps.available<0 or ps.physical<0 or ps.reserved<0) then
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
      if jsonb_typeof(p_data->'outputs') is distinct from 'array' or jsonb_array_length(p_data->'outputs')<>4 then raise exception 'Enter the weight for all four qualities'; end if;
      for row_data in select value from jsonb_array_elements(p_data->'outputs') loop
        prod:=(row_data->>'product_id')::smallint;
        if not exists(select 1 from public.mill_products where id=prod and raw_type_id=raw) then raise exception 'The selected product does not match the rice type'; end if;
        output_weight:=mill_private.number(row_data->>'weight');
        retained:=case when p_kind='service' then mill_private.number(row_data->>'retained') else 0 end;
        price:=case when p_kind='service' then mill_private.number(row_data->>'fee_price',4) else 0 end;
        if retained>0 and price<=0 then raise exception 'Enter the agreed price for received rice'; end if;
        insert into public.mill_outputs(entry_id,product_id,weight,retained,fee_price) values(result_id,prod,output_weight,retained,price);
        total_output:=total_output+output_weight; fee_value:=fee_value+retained*price;
      end loop;
      if total_output<=0 or total_output>q then raise exception 'Total output must be positive and no greater than input weight'; end if;
      if p_kind='processing' then
        select quantity,value into available,stock_value from public.mill_raw_stock where id=raw;
        if q<=0 or q>available then raise exception 'There is not enough raw rice inventory'; end if;
        expense:=mill_private.number(p_data->>'expenses',2);
        insert into public.mill_batches(entry_id,raw_type_id,input_weight,expenses,raw_cost) values(result_id,raw,q,expense,case when q=available then stock_value else round(stock_value*q/available,8) end);
      else
        amount:=mill_private.number(p_data->>'charge',2);
        if round(fee_value,2)>amount then raise exception 'The value of received rice exceeds the processing charge'; end if;
        insert into public.mill_services(entry_id,raw_type_id,input_weight,charge) values(result_id,raw,q,amount);
      end if;
    elsif p_kind='sale' then
      prod:=(p_data->>'product_id')::smallint; q:=mill_private.number(p_data->>'weight'); price:=mill_private.number(p_data->>'unit_price',4);
      select ps.available into available from public.mill_product_stock ps where ps.id=prod;
      if available is null or q<=0 or q>available then raise exception 'There is not enough available inventory'; end if;
      insert into public.mill_sales(entry_id,product_id,weight,unit_price) values(result_id,prod,q,price);
    elsif p_kind='payment' then
      amount:=mill_private.number(p_data->>'amount',2);
      if amount<=0 or amount>balance.remaining then raise exception 'Payment must be positive and no greater than the remaining balance'; end if;
      insert into public.mill_payments values(result_id,target,amount);
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
        insert into public.mill_payments values(target,result_id,amount);
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
revoke all on all functions in schema mill_private from public,anon,authenticated;

create or replace function public.mill_snapshot() returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; begin
 if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 select jsonb_build_object(
  'raw_stock',(select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_raw_stock x),
  'products',(select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) from public.mill_product_stock x),
  'parties',(select coalesce(jsonb_agg(x order by x.name),'[]'::jsonb) from public.mill_party_balances x),
  'expense_categories',(select jsonb_agg(x order by x.id) from public.mill_expense_categories x),
  'expenses',(select jsonb_agg(x) from public.mill_expense_report x),
  'recent',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select * from public.mill_ledger order by seq desc limit 12) x),
  'summary',jsonb_build_object(
    'purchases',(select coalesce(sum(total),0) from public.mill_invoice_balances where kind='purchase'),
    'sales',(select coalesce(sum(total),0) from public.mill_invoice_balances where kind='sale'),
    'service_charges',(select coalesce(sum(total),0) from public.mill_invoice_balances where kind='service'),
    'received',(select coalesce(sum(paid),0) from public.mill_invoice_balances where kind in ('sale','service')),
    'supplier_paid',(select coalesce(sum(paid),0) from public.mill_invoice_balances where kind='purchase'),
    'receivable',(select coalesce(sum(remaining),0) from public.mill_invoice_balances where kind in ('sale','service')),
    'payable',(select coalesce(sum(remaining),0) from public.mill_invoice_balances where kind='purchase'),
    'rice_payment',(select coalesce(sum(rice_payment),0) from public.mill_invoice_balances where kind='service'),
    'expenses',(select coalesce(sum(amount),0) from public.mill_expense_report),
    'processing_count',(select count(*) from public.mill_ledger where kind='processing' and voided_at is null),
    'processing_input',(select coalesce(sum(weight),0) from public.mill_ledger where kind='processing' and voided_at is null),
    'processing_output',(select coalesce(sum(total_output),0) from public.mill_ledger where kind='processing' and voided_at is null),
    'wastage',(select coalesce(sum(wastage),0) from public.mill_ledger where kind='processing' and voided_at is null),
    'service_count',(select count(*) from public.mill_ledger where kind='service' and voided_at is null),
    'service_input',(select coalesce(sum(weight),0) from public.mill_ledger where kind='service' and voided_at is null),
    'service_output',(select coalesce(sum(total_output),0) from public.mill_ledger where kind='service' and voided_at is null),
    'service_wastage',(select coalesce(sum(wastage),0) from public.mill_ledger where kind='service' and voided_at is null)
  )
 ) into result;
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
  and (coalesce(p_search,'')='' or concat_ws(' ',l.party_name,l.item_name,l.notes,l.description,l.seq::text) ilike '%'||p_search||'%')
 ) select jsonb_build_object('count',(select count(*) from filtered),'total',(select coalesce(sum(total),0) from filtered where voided_at is null),
 'rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select * from filtered order by date desc,seq desc limit 50 offset p_page*50) x)) into result;
 return result;
end $$;
revoke all on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) from public,anon;
grant execute on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) to authenticated;
commit;


