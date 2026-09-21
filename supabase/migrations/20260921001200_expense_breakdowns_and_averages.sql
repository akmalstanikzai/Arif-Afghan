begin;

create or replace function public.mill_expense_dashboard(p_date date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  solar_date text; solar_month text; solar_year integer;
  week_start date; month_start date; month_end date; year_start date; year_end date;
  first_record date; last_record date; range_start date; range_end date; report_day date;
  summary jsonb; amount numeric; month_key text; year_key text; aggregate_row jsonb;
  day_total numeric := 0; week_total numeric := 0; month_total numeric := 0;
  year_total numeric := 0; all_time_total numeric := 0;
  selected_day jsonb := '{}'::jsonb; week_rows jsonb := '[]'::jsonb; month_rows jsonb := '[]'::jsonb;
  year_map jsonb := '{}'::jsonb; all_time_map jsonb := '{}'::jsonb;
  year_rows jsonb := '[]'::jsonb; all_time_rows jsonb := '[]'::jsonb;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;

  solar_date := mill_private.solar_hijri_date(p_date); solar_month := left(solar_date, 7); solar_year := left(solar_date, 4)::integer;
  week_start := p_date - ((extract(dow from p_date)::integer + 1) % 7);
  month_start := public.mill_solar_month_start(solar_month); month_end := month_start + public.mill_month_days(solar_month) - 1;
  year_start := public.mill_solar_month_start(solar_year::text || '-01'); year_end := public.mill_solar_month_start((solar_year + 1)::text || '-01') - 1;

  select coalesce(min(bounds.first_day), p_date), coalesce(max(bounds.last_day), p_date) into first_record, last_record
  from (
    select min(e.date) first_day, max(e.date) last_day from public.mill_expenses x join public.mill_entries e on e.id=x.entry_id where e.voided_at is null
    union all select min(start_date), max(coalesce(end_date,current_date)) from public.mill_employees
    union all select min(public.mill_solar_month_start(m.solar_month)), max(public.mill_solar_month_start(m.solar_month)+public.mill_month_days(m.solar_month)-1) from public.mill_monthly_expenses m
  ) bounds;
  first_record := least(first_record,p_date); last_record := greatest(last_record,p_date);
  range_start := least(first_record,week_start,month_start,year_start); range_end := greatest(last_record,week_start+6,month_end,year_end);

  for report_day in select d::date from generate_series(range_start,range_end,interval '1 day') days(d) loop
    summary := public.mill_daily_expense_summary(report_day); amount := coalesce((summary->>'total')::numeric,0);
    if report_day=p_date then day_total:=amount; selected_day:=summary; end if;
    if report_day between week_start and week_start+6 then week_total:=week_total+amount; week_rows:=week_rows||jsonb_build_array(summary); end if;
    if report_day between month_start and month_end then month_total:=month_total+amount; month_rows:=month_rows||jsonb_build_array(summary); end if;
    if report_day between year_start and year_end then
      year_total:=year_total+amount; month_key:=left(summary->>'solar_date',7);
      aggregate_row:=coalesce(year_map->month_key,jsonb_build_object('period',month_key,'daily',0,'salary',0,'electricity',0,'total',0,'days',0));
      year_map:=jsonb_set(year_map,array[month_key],jsonb_build_object('period',month_key,'daily',(aggregate_row->>'daily')::numeric+(summary->>'daily')::numeric,'salary',(aggregate_row->>'salary')::numeric+(summary->>'salary')::numeric,'electricity',(aggregate_row->>'electricity')::numeric+(summary->>'electricity')::numeric,'total',(aggregate_row->>'total')::numeric+amount,'days',(aggregate_row->>'days')::integer+1));
    end if;
    if report_day between first_record and last_record then
      all_time_total:=all_time_total+amount; year_key:=left(summary->>'solar_date',4);
      aggregate_row:=coalesce(all_time_map->year_key,jsonb_build_object('period',year_key,'daily',0,'salary',0,'electricity',0,'total',0,'days',0));
      all_time_map:=jsonb_set(all_time_map,array[year_key],jsonb_build_object('period',year_key,'daily',(aggregate_row->>'daily')::numeric+(summary->>'daily')::numeric,'salary',(aggregate_row->>'salary')::numeric+(summary->>'salary')::numeric,'electricity',(aggregate_row->>'electricity')::numeric+(summary->>'electricity')::numeric,'total',(aggregate_row->>'total')::numeric+amount,'days',(aggregate_row->>'days')::integer+1));
    end if;
  end loop;

  select coalesce(jsonb_agg(value order by key),'[]'::jsonb) into year_rows from jsonb_each(year_map);
  select coalesce(jsonb_agg(value order by key),'[]'::jsonb) into all_time_rows from jsonb_each(all_time_map);
  return jsonb_build_object(
    'date',p_date,'solar_date',solar_date,'week_start',week_start,'week_end',week_start+6,'month',solar_month,'year',solar_year,
    'day_total',day_total,'week_total',week_total,'month_total',month_total,'year_total',year_total,'all_time_total',all_time_total,
    'day_average',day_total,'week_average',week_total/7,'month_average',month_total/(month_end-month_start+1),
    'year_average',year_total/(year_end-year_start+1),'all_time_average',all_time_total/(last_record-first_record+1),
    'day_breakdown',jsonb_build_array(selected_day),'week_breakdown',week_rows,'month_breakdown',month_rows,
    'year_breakdown',year_rows,'all_time_breakdown',all_time_rows
  );
end $$;

revoke all on function public.mill_expense_dashboard(date) from public,anon;
grant execute on function public.mill_expense_dashboard(date) to authenticated;

commit;
