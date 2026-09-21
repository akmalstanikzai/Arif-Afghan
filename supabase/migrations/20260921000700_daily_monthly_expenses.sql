begin;

create table public.mill_monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  solar_month text not null check(solar_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category_id text not null check(category_id in ('salary','electricity')),
  description text not null default '' check(length(description)<=500),
  responsible text not null default '' check(length(responsible)<=160),
  amount numeric(18,2) not null check(amount>0),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null references auth.users
);
create index on public.mill_monthly_expenses(solar_month,category_id);
alter table public.mill_monthly_expenses enable row level security;
revoke all on public.mill_monthly_expenses from anon,authenticated;
grant select on public.mill_monthly_expenses to authenticated;
create policy staff_read on public.mill_monthly_expenses for select to authenticated using ((select public.mill_is_staff()));

create or replace function public.mill_month_days(p_month text) returns integer
language plpgsql immutable security definer set search_path='' as $$
declare y integer; m integer;
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Enter a valid Solar Hijri month'; end if;
  y:=split_part(p_month,'-',1)::integer; m:=split_part(p_month,'-',2)::integer;
  if y<1178 or y>1634 then raise exception 'Enter a valid Solar Hijri month'; end if;
  if m<=6 then return 31; elsif m<=11 then return 30; end if;
  return mill_private.solar_year_start(y+1)-mill_private.solar_year_start(y)-336;
end $$;
revoke all on function public.mill_month_days(text) from public,anon;
grant execute on function public.mill_month_days(text) to authenticated;

create or replace function public.mill_save_monthly_expense(p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result_id uuid; prior mill_private.requests%rowtype; month_value text; category text; amount_value numeric;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'The request is invalid'; end if;
  update mill_private.write_lock set version=version+1 where id;
  select * into prior from mill_private.requests where id=p_request_id;
  if found then
    if prior.actor<>auth.uid() or prior.kind<>'monthly_expense' or prior.payload<>p_data then raise exception 'The request ID was already used'; end if;
    return prior.result;
  end if;
  month_value:=p_data->>'solar_month'; perform public.mill_month_days(month_value);
  category:=p_data->>'category_id';
  if category not in ('salary','electricity') then raise exception 'Select salary or electricity'; end if;
  amount_value:=mill_private.number(p_data->>'amount',2);
  if amount_value<=0 then raise exception 'Enter a valid month and positive amount'; end if;
  insert into public.mill_monthly_expenses(solar_month,category_id,description,responsible,amount,created_by)
  values(month_value,category,trim(coalesce(p_data->>'description','')),trim(coalesce(p_data->>'responsible','')),amount_value,auth.uid()) returning id into result_id;
  insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'monthly_expense',p_data,result_id);
  return result_id;
end $$;
revoke all on function public.mill_save_monthly_expense(jsonb,uuid) from public,anon;
grant execute on function public.mill_save_monthly_expense(jsonb,uuid) to authenticated;

create or replace function public.mill_delete_monthly_expense(p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  delete from public.mill_monthly_expenses where id=p_id;
  if not found then raise exception 'Active record not found'; end if;
  return p_id;
end $$;
revoke all on function public.mill_delete_monthly_expense(uuid) from public,anon;
grant execute on function public.mill_delete_monthly_expense(uuid) to authenticated;

create or replace function public.mill_monthly_expense_list() returns jsonb
language sql stable security invoker set search_path='' as $$
  select case when public.mill_is_staff() then coalesce(jsonb_agg(x order by x.solar_month desc,x.created_at desc),'[]'::jsonb) else '[]'::jsonb end
  from (select m.*,m.amount/public.mill_month_days(m.solar_month) daily_amount from public.mill_monthly_expenses m) x;
$$;
revoke all on function public.mill_monthly_expense_list() from public,anon;
grant execute on function public.mill_monthly_expense_list() to authenticated;

create or replace function public.mill_daily_expense_summary(p_date date) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare month_value text; daily_value numeric; fixed_value numeric;
begin
  if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
  if p_date is null then raise exception 'Enter a valid date'; end if;
  month_value:=left(mill_private.solar_hijri_date(p_date),7);
  select coalesce(sum(x.amount),0) into daily_value from public.mill_expenses x join public.mill_entries e on e.id=x.entry_id where e.date=p_date and e.voided_at is null;
  select coalesce(sum(m.amount/public.mill_month_days(m.solar_month)),0) into fixed_value from public.mill_monthly_expenses m where m.solar_month=month_value;
  return jsonb_build_object('date',p_date,'solar_date',mill_private.solar_hijri_date(p_date),'daily',daily_value,'fixed',fixed_value,'total',daily_value+fixed_value);
end $$;
revoke all on function public.mill_daily_expense_summary(date) from public,anon;
grant execute on function public.mill_daily_expense_summary(date) to authenticated;

commit;
