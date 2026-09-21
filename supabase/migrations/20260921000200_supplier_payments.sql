begin;

create or replace function public.mill_pay_supplier(
  p_party uuid,
  p_date date,
  p_amount numeric,
  p_payment_method text,
  p_cheque_number text,
  p_payment_institution text,
  p_request_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  payment_id uuid;
  amount_left numeric(18,2);
  applied numeric(18,2);
  total_owed numeric(18,2);
  purchase_row record;
  prior mill_private.requests%rowtype;
  request_payload jsonb;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_request_id is null or p_date is null or p_amount is null then raise exception 'The request is invalid'; end if;
  if p_amount <= 0 or p_amount<>round(p_amount,2) then raise exception 'Payment must be positive and no greater than the remaining balance'; end if;
  if not exists(select 1 from public.mill_parties where id=p_party and kind='supplier' and deleted_at is null) then raise exception 'Supplier not found'; end if;

  request_payload:=jsonb_build_object(
    'party_id',p_party,'date',p_date,'amount',p_amount,'payment_method',p_payment_method,
    'cheque_number',coalesce(p_cheque_number,''),'payment_institution',coalesce(p_payment_institution,'')
  );
  update mill_private.write_lock set version=version+1 where id;
  select * into prior from mill_private.requests where id=p_request_id;
  if found then
    if prior.actor<>auth.uid() or prior.kind<>'supplier_payment' or prior.payload<>request_payload then raise exception 'The request ID was already used'; end if;
    return prior.result;
  end if;

  select coalesce(sum(i.remaining),0) into total_owed
  from public.mill_invoice_balances i
  join public.mill_entries e on e.id=i.id
  where e.party_id=p_party and e.kind='purchase' and e.voided_at is null and i.remaining>0;
  if p_amount>total_owed then raise exception 'Payment must be positive and no greater than the remaining balance'; end if;

  amount_left:=round(p_amount,2);
  for purchase_row in
    select i.id,i.remaining,e.date
    from public.mill_invoice_balances i
    join public.mill_entries e on e.id=i.id
    where e.party_id=p_party and e.kind='purchase' and e.voided_at is null and i.remaining>0
    order by e.date,e.seq
  loop
    exit when amount_left<=0;
    if p_date<purchase_row.date then raise exception 'The payment or delivery date cannot be before the record date'; end if;
    applied:=least(amount_left,purchase_row.remaining);
    insert into public.mill_entries(kind,date,party_id,notes,created_by)
      values('payment',p_date,p_party,'',auth.uid()) returning id into payment_id;
    insert into public.mill_payments(entry_id,target_id,amount)
      values(payment_id,purchase_row.id,applied);
    perform mill_private.payment_details(payment_id,jsonb_build_object(
      'payment_method',coalesce(p_payment_method,'cash'),
      'cheque_number',coalesce(p_cheque_number,''),
      'payment_institution',coalesce(p_payment_institution,'')
    ));
    if result_id is null then result_id:=payment_id; end if;
    amount_left:=amount_left-applied;
  end loop;

  insert into mill_private.requests(id,actor,kind,payload,result)
    values(p_request_id,auth.uid(),'supplier_payment',request_payload,result_id);
  return result_id;
end;
$$;

revoke all on function public.mill_pay_supplier(uuid,date,numeric,text,text,text,uuid) from public,anon;
grant execute on function public.mill_pay_supplier(uuid,date,numeric,text,text,text,uuid) to authenticated;

commit;
