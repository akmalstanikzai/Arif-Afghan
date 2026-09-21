begin;

alter table public.mill_parties
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users;

alter table public.mill_parties add constraint mill_parties_delete_audit
  check ((deleted_at is null and deleted_by is null) or (deleted_at is not null and deleted_by is not null));

create or replace view public.mill_party_balances with (security_invoker=true) as
select p.id,p.kind,p.name,p.contact,p.active,p.created_at,
coalesce(b.total,0) total,coalesce(b.paid,0) paid,coalesce(b.rice_payment,0) rice_payment,coalesce(b.remaining,0) remaining,
coalesce(b.purchased_weight,0) purchased_weight,coalesce(b.delivered,0) delivered,coalesce(b.pending,0) pending,coalesce(b.sales_total,0) sales_total,coalesce(b.service_total,0) service_total,p.father_name
from public.mill_parties p left join (
select party_id,sum(total) total,sum(paid) paid,sum(rice_payment) rice_payment,sum(remaining) remaining,
sum(purchased_weight) purchased_weight,sum(delivered) delivered,sum(pending) pending,
sum(case when kind='sale' then total else 0 end) sales_total,sum(case when kind='service' then total else 0 end) service_total
from public.mill_invoice_balances group by party_id) b on b.party_id=p.id
where p.deleted_at is null;

create or replace function public.mill_delete_party(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_id is null then raise exception 'Supplier not found'; end if;
  update mill_private.write_lock set version=version+1 where id;
  update public.mill_parties
    set active=false,deleted_at=clock_timestamp(),deleted_by=auth.uid()
    where id=p_id and kind='supplier' and deleted_at is null;
  if not found then raise exception 'Supplier not found'; end if;
  return p_id;
end;
$$;

revoke all on function public.mill_delete_party(uuid) from public,anon;
grant execute on function public.mill_delete_party(uuid) to authenticated;

commit;
