begin;

create or replace function public.mill_update_purchase(p_id uuid,p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  parent public.mill_entries%rowtype;
  prior mill_private.requests%rowtype;
  supplier uuid;
  entry_date date;
  raw smallint;
  quantity numeric;
  price numeric;
  expense numeric;
  payment_total numeric;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_id is null or p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'The request is invalid'; end if;
  update mill_private.write_lock set version=version+1 where id;
  select * into prior from mill_private.requests where id=p_request_id;
  if found then
    if prior.actor<>auth.uid() or prior.kind<>'purchase_update' or prior.payload<>p_data or prior.result<>p_id then raise exception 'The request ID was already used'; end if;
    return prior.result;
  end if;

  select * into parent from public.mill_entries where id=p_id and kind='purchase' and voided_at is null;
  if not found then raise exception 'Active record not found'; end if;
  supplier:=nullif(p_data->>'party_id','')::uuid;
  if not exists(select 1 from public.mill_parties where id=supplier and kind='supplier' and deleted_at is null) then raise exception 'Select a valid supplier or customer'; end if;
  entry_date:=nullif(p_data->>'date','')::date;
  if entry_date is null then raise exception 'Enter a date'; end if;
  raw:=(p_data->>'raw_type_id')::smallint;
  quantity:=mill_private.number(p_data->>'weight');
  price:=mill_private.number(p_data->>'unit_price',4);
  expense:=mill_private.number(p_data->>'logistics',2);
  if quantity<=0 then raise exception 'Weight must be greater than zero'; end if;

  select coalesce(sum(p.amount),0) into payment_total
  from public.mill_payments p join public.mill_entries e on e.id=p.entry_id
  where p.target_id=p_id and e.voided_at is null;
  if payment_total>round(quantity*price,2) then raise exception 'Existing payments exceed the updated purchase total'; end if;
  if exists(select 1 from public.mill_payments p join public.mill_entries e on e.id=p.entry_id where p.target_id=p_id and e.voided_at is null and e.date<entry_date) then raise exception 'The purchase date cannot be after an existing payment date'; end if;

  update public.mill_entries set date=entry_date,party_id=supplier,notes=coalesce(p_data->>'notes','') where id=p_id;
  update public.mill_purchases set raw_type_id=raw,weight=quantity,unit_price=price,logistics=expense where entry_id=p_id;
  if exists(select 1 from public.mill_raw_stock where quantity<0 or value< -0.000001) then raise exception 'The updated purchase would make raw inventory negative'; end if;

  insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'purchase_update',p_data,p_id);
  return p_id;
end;
$$;

revoke all on function public.mill_update_purchase(uuid,jsonb,uuid) from public,anon;
grant execute on function public.mill_update_purchase(uuid,jsonb,uuid) to authenticated;

commit;
