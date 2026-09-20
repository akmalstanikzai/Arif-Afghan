-- Preserve the public API and all records. Compute dashboard totals from their
-- source tables instead of repeatedly expanding the full transaction ledger.
begin;
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
    where e.voided_at is null and e.kind in ('processing','service')
  ) production;
  return result;
end $$;
revoke all on function public.mill_snapshot() from public,anon;
grant execute on function public.mill_snapshot() to authenticated;
commit;
