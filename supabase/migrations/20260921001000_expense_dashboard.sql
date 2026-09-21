begin;

create or replace function mill_private.expense_total_between(p_start date, p_end date)
returns numeric
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum((public.mill_daily_expense_summary(d::date)::jsonb ->> 'total')::numeric), 0)
  from generate_series(p_start, p_end, interval '1 day') as days(d);
$$;
revoke all on function mill_private.expense_total_between(date, date) from public, anon, authenticated;

create or replace function public.mill_expense_dashboard(p_date date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  solar_date text;
  solar_month text;
  solar_year integer;
  week_start date;
  month_start date;
  month_end date;
  year_start date;
  year_end date;
  first_record date;
  last_record date;
  day_rows jsonb;
begin
  if not public.mill_is_staff() then
    raise exception 'You do not have permission to access factory data';
  end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;

  solar_date := mill_private.solar_hijri_date(p_date);
  solar_month := left(solar_date, 7);
  solar_year := left(solar_date, 4)::integer;
  week_start := p_date - ((extract(dow from p_date)::integer + 1) % 7);
  month_start := public.mill_solar_month_start(solar_month);
  month_end := month_start + public.mill_month_days(solar_month) - 1;
  year_start := public.mill_solar_month_start(solar_year::text || '-01');
  year_end := public.mill_solar_month_start((solar_year + 1)::text || '-01') - 1;

  select coalesce(min(bounds.first_day), p_date), coalesce(max(bounds.last_day), p_date)
    into first_record, last_record
  from (
    select min(e.date) first_day, max(e.date) last_day
      from public.mill_expenses x join public.mill_entries e on e.id = x.entry_id
      where e.voided_at is null
    union all
    select min(start_date), max(coalesce(end_date, current_date)) from public.mill_employees
    union all
    select min(public.mill_solar_month_start(solar_month)),
           max(public.mill_solar_month_start(solar_month) + public.mill_month_days(solar_month) - 1)
      from public.mill_monthly_expenses
  ) bounds;

  first_record := least(first_record, p_date);
  last_record := greatest(last_record, p_date);

  select coalesce(jsonb_agg(summary order by d), '[]'::jsonb) into day_rows
  from (
    select d::date d, public.mill_daily_expense_summary(d::date) summary
    from generate_series(month_start, month_end, interval '1 day') days(d)
  ) daily_rows;

  return jsonb_build_object(
    'date', p_date,
    'solar_date', solar_date,
    'week_start', week_start,
    'week_end', week_start + 6,
    'month', solar_month,
    'year', solar_year,
    'day_total', (public.mill_daily_expense_summary(p_date) ->> 'total')::numeric,
    'week_total', mill_private.expense_total_between(week_start, week_start + 6),
    'month_total', mill_private.expense_total_between(month_start, month_end),
    'year_total', mill_private.expense_total_between(year_start, year_end),
    'all_time_total', mill_private.expense_total_between(first_record, last_record),
    'days', day_rows
  );
end $$;

revoke all on function public.mill_expense_dashboard(date) from public, anon;
grant execute on function public.mill_expense_dashboard(date) to authenticated;

commit;
