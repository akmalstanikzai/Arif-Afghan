begin;

-- One compact payroll ledger powers the year view and the overdue reminder.
-- A salary becomes overdue only after day 30 of its Solar Hijri month.
create or replace function public.mill_salary_overview(p_year integer, p_as_of date default current_date)
returns jsonb
language plpgsql stable security invoker set search_path=''
as $$
declare result jsonb; current_solar text; first_solar text; first_index integer; current_index integer;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_year < 1178 or p_year > 1634 or p_as_of is null then raise exception 'Enter a valid Solar Hijri month'; end if;
  current_solar := left(mill_private.solar_hijri_date(p_as_of), 7);
  select left(mill_private.solar_hijri_date(min(start_date)), 7) into first_solar from public.mill_employees;
  first_index := case when first_solar is null then 0 else split_part(first_solar,'-',1)::integer * 12 + split_part(first_solar,'-',2)::integer - 1 end;
  current_index := split_part(current_solar,'-',1)::integer * 12 + split_part(current_solar,'-',2)::integer - 1;

  with year_months as (
    select format('%s-%s', p_year, lpad(m::text,2,'0')) as solar_month,
      public.mill_solar_month_start(format('%s-%s',p_year,lpad(m::text,2,'0'))) as month_start
    from generate_series(1,12) as months(m)
  ), ledger as (
    select ym.solar_month, ym.month_start, ym.month_start + public.mill_month_days(ym.solar_month) - 1 as month_end,
      count(e.id) as employee_count, coalesce(sum(e.monthly_salary),0) as salary_total,
      coalesce(sum(coalesce(pay.paid,0)),0) as paid_total,
      coalesce(sum(greatest(e.monthly_salary-coalesce(pay.paid,0),0)),0) as remaining_total
    from year_months ym
    left join public.mill_employees e on e.start_date <= ym.month_start + public.mill_month_days(ym.solar_month) - 1
      and (e.end_date is null or e.end_date >= ym.month_start)
    left join lateral (select sum(amount) as paid from public.mill_salary_payments p where p.employee_id=e.id and p.solar_month=ym.solar_month) pay on true
    group by ym.solar_month, ym.month_start
  ), overdue_months as (
    select i, format('%s-%s', i/12, lpad((i%12+1)::text,2,'0')) as solar_month
    from generate_series(first_index,current_index) as month_indexes(i) where first_index > 0
  ), overdue as (
    select om.solar_month, e.id as employee_id, e.name as employee_name, e.monthly_salary,
      coalesce(pay.paid,0) as paid, greatest(e.monthly_salary-coalesce(pay.paid,0),0) as remaining
    from overdue_months om
    cross join lateral (select public.mill_solar_month_start(om.solar_month) as month_start) ms
    join public.mill_employees e on e.start_date <= ms.month_start + public.mill_month_days(om.solar_month)-1
      and (e.end_date is null or e.end_date >= ms.month_start)
    left join lateral (select sum(amount) as paid from public.mill_salary_payments p where p.employee_id=e.id and p.solar_month=om.solar_month) pay on true
    where p_as_of >= ms.month_start + 30 and coalesce(pay.paid,0) < e.monthly_salary
  )
  select jsonb_build_object(
    'year',p_year,'current_month',current_solar,
    'months',(select coalesce(jsonb_agg(jsonb_build_object(
      'month',solar_month,'employee_count',employee_count,'salary_total',salary_total,'paid_total',paid_total,'remaining_total',remaining_total,
      'status',case when employee_count=0 then 'none' when remaining_total=0 then 'paid'
        when p_as_of>=month_start+30 then 'overdue' when paid_total>0 then 'partial' else 'unpaid' end
    ) order by solar_month),'[]'::jsonb) from ledger),
    'overdue_items',(select coalesce(jsonb_agg(jsonb_build_object('month',solar_month,'employee_id',employee_id,'employee_name',employee_name,'monthly_salary',monthly_salary,'paid',paid,'remaining',remaining) order by solar_month,employee_name),'[]'::jsonb) from overdue),
    'overdue_total',(select coalesce(sum(remaining),0) from overdue)
  ) into result;
  return result;
end $$;

revoke all on function public.mill_salary_overview(integer,date) from public,anon;
grant execute on function public.mill_salary_overview(integer,date) to authenticated;

commit;
