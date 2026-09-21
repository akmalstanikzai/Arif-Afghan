begin;

create or replace view public.mill_raw_stock with (security_invoker=true) as
select r.id,r.name,
  coalesce(p.weight,0)-coalesce(b.weight,0) quantity,
  coalesce(p.cost,0)-coalesce(b.cost,0) value,
  case when coalesce(p.weight,0)-coalesce(b.weight,0)>0
    then (coalesce(p.cost,0)-coalesce(b.cost,0))/(coalesce(p.weight,0)-coalesce(b.weight,0)) else 0 end average_cost,
  coalesce(b.in_process,0) in_process,
  case when coalesce(p.weight,0)>0 then coalesce(p.purchase_amount,0)/p.weight else 0 end purchase_price_per_kg
from public.mill_raw_types r
left join (
  select p.raw_type_id,sum(p.weight) weight,sum(p.total_cost) cost,sum(p.base_amount) purchase_amount
  from public.mill_purchases p join public.mill_entries e on e.id=p.entry_id
  where e.voided_at is null group by p.raw_type_id
) p on p.raw_type_id=r.id
left join (
  select b.raw_type_id,sum(b.input_weight) weight,sum(b.raw_cost) cost,
    sum(case when b.status='ongoing' then b.input_weight else 0 end) in_process
  from public.mill_batches b join public.mill_entries e on e.id=b.entry_id
  where e.voided_at is null group by b.raw_type_id
) b on b.raw_type_id=r.id;

commit;
