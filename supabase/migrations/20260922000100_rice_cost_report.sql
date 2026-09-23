begin;

create or replace function public.mill_rice_cost_report(p_date date, p_period text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  start_day date;
  end_day date;
  solar_date text;
  solar_month text;
  solar_year integer;
  report_day date;
  day_summary jsonb;
  expense_total numeric := 0;
  day_count integer;
  result_rows jsonb;
  output_total numeric;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;
  if p_period not in ('day','week','month','year') then raise exception 'The period is invalid.'; end if;

  solar_date := mill_private.solar_hijri_date(p_date);
  solar_month := left(solar_date, 7);
  solar_year := left(solar_date, 4)::integer;

  if p_period = 'day' then
    start_day := p_date; end_day := p_date;
  elsif p_period = 'week' then
    start_day := p_date - ((extract(dow from p_date)::integer + 1) % 7); end_day := start_day + 6;
  elsif p_period = 'month' then
    start_day := public.mill_solar_month_start(solar_month); end_day := start_day + public.mill_month_days(solar_month) - 1;
  else
    start_day := public.mill_solar_month_start(solar_year::text || '-01'); end_day := public.mill_solar_month_start((solar_year + 1)::text || '-01') - 1;
  end if;

  day_count := end_day - start_day + 1;
  for report_day in select d::date from generate_series(start_day, end_day, interval '1 day') days(d) loop
    day_summary := public.mill_daily_expense_summary(report_day);
    expense_total := expense_total + coalesce((day_summary->>'total')::numeric, 0);
  end loop;

  with purchase_costs as (
    select p.raw_type_id, sum(p.total_cost) / nullif(sum(p.weight), 0) raw_price
    from public.mill_purchases p
    join public.mill_entries e on e.id = p.entry_id
    where e.voided_at is null and e.date between start_day and end_day
    group by p.raw_type_id
  ), produced as (
    select product.id product_id, sum(o.weight) output_weight
    from public.mill_outputs o
    join public.mill_products product on product.id = o.product_id
    join public.mill_entries e on e.id = o.entry_id
    join public.mill_batches b on b.entry_id = e.id
    where e.voided_at is null and e.kind = 'processing' and b.process_source = 'factory'
      and b.status = 'completed' and b.completed_date between start_day and end_day
    group by product.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', product.id,
    'raw_type_id', raw.id,
    'raw_name', raw.name,
    'quality', product.quality,
    'raw_price', costs.raw_price,
    'output_weight', coalesce(produced.output_weight, 0)
  ) order by raw.id, product.quality), '[]'::jsonb), coalesce(sum(produced.output_weight), 0)
  into result_rows, output_total
  from public.mill_products product
  join public.mill_raw_types raw on raw.id = product.raw_type_id
  left join purchase_costs costs on costs.raw_type_id = raw.id
  left join produced on produced.product_id = product.id;

  return jsonb_build_object(
    'period', p_period,
    'start_date', start_day,
    'end_date', end_day,
    'start_solar_date', mill_private.solar_hijri_date(start_day),
    'end_solar_date', mill_private.solar_hijri_date(end_day),
    'days', day_count,
    'total_expenses', expense_total,
    'average_daily_expense', expense_total / day_count,
    'total_output_weight', output_total,
    'rows', result_rows
  );
end $$;

revoke all on function public.mill_rice_cost_report(date, text) from public, anon;
grant execute on function public.mill_rice_cost_report(date, text) to authenticated;

commit;
