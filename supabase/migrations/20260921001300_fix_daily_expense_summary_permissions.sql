begin;

create or replace function public.mill_daily_expense_summary(p_date date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  month_value text;
  daily_value numeric;
  electricity_value numeric;
  salary_value numeric;
  days integer;
begin
  if not public.mill_is_staff() then
    raise exception 'You do not have permission to access factory data';
  end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;

  month_value := left(mill_private.solar_hijri_date(p_date), 7);
  days := public.mill_month_days(month_value);

  select coalesce(sum(x.amount), 0) into daily_value
  from public.mill_expenses x
  join public.mill_entries e on e.id = x.entry_id
  where e.date = p_date and e.voided_at is null;

  select coalesce(sum(m.amount / days), 0) into electricity_value
  from public.mill_monthly_expenses m
  where m.solar_month = month_value and m.category_id = 'electricity';

  select coalesce(sum(e.monthly_salary / days), 0) into salary_value
  from public.mill_employees e
  where e.start_date <= p_date and (e.end_date is null or e.end_date >= p_date);

  return jsonb_build_object(
    'date', p_date,
    'solar_date', mill_private.solar_hijri_date(p_date),
    'daily', daily_value,
    'salary', salary_value,
    'electricity', electricity_value,
    'fixed', salary_value + electricity_value,
    'total', daily_value + salary_value + electricity_value
  );
end $$;

revoke all on function public.mill_daily_expense_summary(date) from public, anon;
grant execute on function public.mill_daily_expense_summary(date) to authenticated;

commit;
