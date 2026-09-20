-- Store both calendar representations of every business date, including old records.
-- The existing date column remains Gregorian for comparisons and indexes.
-- Solar Hijri is a generated stored value: clients cannot save a mismatched pair.
-- Year-start arithmetic: jalaali-js/Borkowski, MIT (docs/calendar-license.txt).
begin;
create or replace function mill_private.solar_year_start(solar_year integer)
returns date language plpgsql immutable strict set search_path = '' as $$
declare
  breaks integer[] := array[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  gy integer := solar_year + 621;
  leaps integer := -14;
  previous integer := -61;
  jump integer;
  n integer;
  i integer;
  gregorian_leaps integer;
begin
  if solar_year < -61 or solar_year >= 3178 then
    raise exception 'Enter a valid date.' using errcode = '22008';
  end if;
  for i in 2..array_length(breaks,1) loop
    jump := breaks[i] - previous;
    exit when solar_year < breaks[i];
    leaps := leaps + (jump / 33) * 8 + (jump % 33) / 4;
    previous := breaks[i];
  end loop;
  n := solar_year - previous;
  leaps := leaps + (n / 33) * 8 + ((n % 33) + 3) / 4;
  if jump % 33 = 4 and jump - n = 4 then leaps := leaps + 1; end if;
  gregorian_leaps := gy / 4 - ((gy / 100 + 1) * 3) / 4 - 150;
  return make_date(gy,3,20 + leaps - gregorian_leaps);
end $$;

create or replace function mill_private.solar_hijri_date(gregorian_date date)
returns text language plpgsql immutable strict set search_path = '' as $$
declare
  y integer := extract(year from gregorian_date)::integer - 621;
  elapsed integer;
  m integer;
  d integer;
begin
  if not isfinite(gregorian_date) or gregorian_date < date '1800-01-01' or gregorian_date > date '2255-12-31' then
    raise exception 'Enter a valid date.' using errcode = '22008';
  end if;
  if gregorian_date < mill_private.solar_year_start(y) then y := y - 1; end if;
  elapsed := gregorian_date - mill_private.solar_year_start(y);
  if elapsed < 186 then
    m := elapsed / 31 + 1; d := elapsed % 31 + 1;
  else
    m := (elapsed - 186) / 30 + 7; d := (elapsed - 186) % 30 + 1;
  end if;
  return lpad(y::text,4,'0') || '-' || lpad(m::text,2,'0') || '-' || lpad(d::text,2,'0');
end $$;
revoke all on function mill_private.solar_year_start(integer) from public,anon,authenticated;
revoke all on function mill_private.solar_hijri_date(date) from public,anon,authenticated;

alter table public.mill_entries add column date_solar_hijri text
  generated always as (mill_private.solar_hijri_date(date)) stored not null;
comment on column public.mill_entries.date is 'Gregorian business date (YYYY-MM-DD).';
comment on column public.mill_entries.date_solar_hijri is 'Stored Solar Hijri equivalent (YYYY-MM-DD), generated from date. Not a PostgreSQL Gregorian date.';

-- The ledger view has a fixed column list even though its original definition
-- used e.*. Append the new column so dependent RPCs retain their existing shape.
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
case when e.kind in ('processing','service') then coalesce(b.input_weight,v.input_weight)-coalesce(outputs.total_output,0) else 0 end wastage,
coalesce(outputs.items,'[]'::jsonb) outputs,
x.category_id,x.description,x.responsible,coalesce(pay.target_id,d.sale_id) target_id,
coalesce(target.kind,'') target_kind,target.seq target_seq,e.date_solar_hijri
from public.mill_entries e
left join public.mill_parties party on party.id=e.party_id
left join public.mill_purchases p on p.entry_id=e.id
left join public.mill_batches b on b.entry_id=e.id
left join public.mill_services v on v.entry_id=e.id
left join public.mill_sales s on s.entry_id=e.id
left join public.mill_payments pay on pay.entry_id=e.id
left join public.mill_deliveries d on d.entry_id=e.id
left join public.mill_expenses x on x.entry_id=e.id
left join public.mill_entries target on target.id=coalesce(pay.target_id,d.sale_id)
left join public.mill_raw_types r on r.id=coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id)
left join public.mill_products product on product.id=s.product_id
left join public.mill_invoice_balances i on i.id=e.id
left join (select o.entry_id,sum(o.weight) total_output,jsonb_agg(jsonb_build_object('product_id',o.product_id,'name',p.name,'weight',o.weight,'retained',o.retained,'fee_price',o.fee_price,'returned',o.weight-o.retained) order by p.quality) items from public.mill_outputs o join public.mill_products p on p.id=o.product_id group by o.entry_id) outputs on outputs.entry_id=e.id;
commit;
