begin;

create or replace function public.mill_expense_averages(p_date date, p_solar_month text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  month_start date; month_end date; report_day date; summary jsonb; amount numeric;
  last_3_total numeric := 0; last_7_total numeric := 0; last_30_total numeric := 0; last_365_total numeric := 0;
  selected_month_total numeric := 0;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;
  if p_solar_month is null or p_solar_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Enter a valid Solar Hijri month';
  end if;

  month_start := public.mill_solar_month_start(p_solar_month);
  month_end := month_start + public.mill_month_days(p_solar_month) - 1;

  for report_day in
    select d::date
    from generate_series(least(p_date - 364, month_start), greatest(p_date, month_end), interval '1 day') days(d)
  loop
    summary := public.mill_daily_expense_summary(report_day);
    amount := coalesce((summary->>'total')::numeric, 0);
    if report_day between p_date - 2 and p_date then last_3_total := last_3_total + amount; end if;
    if report_day between p_date - 6 and p_date then last_7_total := last_7_total + amount; end if;
    if report_day between p_date - 29 and p_date then last_30_total := last_30_total + amount; end if;
    if report_day between p_date - 364 and p_date then last_365_total := last_365_total + amount; end if;
    if report_day between month_start and month_end then selected_month_total := selected_month_total + amount; end if;
  end loop;

  return jsonb_build_object(
    'last_3_average', last_3_total / 3,
    'last_7_average', last_7_total / 7,
    'last_30_average', last_30_total / 30,
    'last_365_average', last_365_total / 365,
    'selected_month', p_solar_month,
    'selected_month_days', month_end - month_start + 1,
    'selected_month_total', selected_month_total,
    'selected_month_average', selected_month_total / (month_end - month_start + 1)
  );
end $$;

revoke all on function public.mill_expense_averages(date,text) from public, anon;
grant execute on function public.mill_expense_averages(date,text) to authenticated;

commit;
