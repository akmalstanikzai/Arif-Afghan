begin;

create table public.mill_employees (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 160),
  father_name text not null default '' check(length(father_name)<=160), contact text not null default '' check(length(contact)<=200),
  role text not null default '' check(length(role)<=160), monthly_salary numeric(18,2) not null check(monthly_salary>0),
  start_date date not null, active boolean not null default true, end_date date,
  created_at timestamptz not null default clock_timestamp(), created_by uuid not null references auth.users,
  check((active and end_date is null) or (not active and end_date is not null and end_date>=start_date))
);
create table public.mill_salary_payments (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.mill_employees,
  solar_month text not null check(solar_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), payment_date date not null,
  amount numeric(18,2) not null check(amount>0), notes text not null default '' check(length(notes)<=500),
  created_at timestamptz not null default clock_timestamp(), created_by uuid not null references auth.users
);
create index on public.mill_salary_payments(employee_id,solar_month);
do $$ declare t text; begin foreach t in array array['mill_employees','mill_salary_payments'] loop
  execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t); execute format('create policy staff_read on public.%I for select to authenticated using ((select public.mill_is_staff()))',t);
end loop; end $$;

create or replace function public.mill_solar_month_start(p_month text) returns date
language plpgsql immutable security definer set search_path='' as $$
declare y integer; m integer; offset_days integer;
begin
  perform public.mill_month_days(p_month); y:=split_part(p_month,'-',1)::integer; m:=split_part(p_month,'-',2)::integer;
  offset_days:=case when m<=6 then (m-1)*31 else 186+(m-7)*30 end;
  return mill_private.solar_year_start(y)+offset_days;
end $$;
revoke all on function public.mill_solar_month_start(text) from public,anon;
grant execute on function public.mill_solar_month_start(text) to authenticated;

create or replace function public.mill_save_employee(p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result_id uuid; prior mill_private.requests%rowtype; salary numeric; started date;
begin
 if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_request_id is null or p_data is null then raise exception 'The request is invalid'; end if;
 update mill_private.write_lock set version=version+1 where id; select * into prior from mill_private.requests where id=p_request_id;
 if found then if prior.actor<>auth.uid() or prior.kind<>'employee' or prior.payload<>p_data then raise exception 'The request ID was already used'; end if; return prior.result; end if;
 if nullif(trim(p_data->>'name'),'') is null then raise exception 'Enter an employee name and positive monthly salary'; end if;
 salary:=mill_private.number(p_data->>'monthly_salary',2); if salary<=0 then raise exception 'Enter an employee name and positive monthly salary'; end if;
 started:=nullif(p_data->>'start_date','')::date; if started is null then raise exception 'Enter a date'; end if;
 result_id:=nullif(p_data->>'id','')::uuid;
 if result_id is null then
  insert into public.mill_employees(name,father_name,contact,role,monthly_salary,start_date,created_by) values(trim(p_data->>'name'),trim(coalesce(p_data->>'father_name','')),coalesce(p_data->>'contact',''),coalesce(p_data->>'role',''),salary,started,auth.uid()) returning id into result_id;
 else
  update public.mill_employees set name=trim(p_data->>'name'),father_name=trim(coalesce(p_data->>'father_name','')),contact=coalesce(p_data->>'contact',''),role=coalesce(p_data->>'role',''),monthly_salary=salary,start_date=started where id=result_id;
  if not found then raise exception 'Employee not found'; end if;
 end if;
 insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'employee',p_data,result_id); return result_id;
end $$;
revoke all on function public.mill_save_employee(jsonb,uuid) from public,anon; grant execute on function public.mill_save_employee(jsonb,uuid) to authenticated;

create or replace function public.mill_delete_employee(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 update public.mill_employees set active=false,end_date=current_date where id=p_id and active; if not found then raise exception 'Employee not found'; end if; return p_id; end $$;
revoke all on function public.mill_delete_employee(uuid) from public,anon; grant execute on function public.mill_delete_employee(uuid) to authenticated;

create or replace function public.mill_pay_employee_salary(p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result_id uuid; prior mill_private.requests%rowtype; employee uuid; month_value text; amount_value numeric; salary_value numeric; paid_value numeric;
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_request_id is null or p_data is null then raise exception 'The request is invalid'; end if;
 update mill_private.write_lock set version=version+1 where id; select * into prior from mill_private.requests where id=p_request_id;
 if found then if prior.actor<>auth.uid() or prior.kind<>'salary_payment' or prior.payload<>p_data then raise exception 'The request ID was already used'; end if; return prior.result; end if;
 employee:=nullif(p_data->>'employee_id','')::uuid; select monthly_salary into salary_value from public.mill_employees where id=employee; if not found then raise exception 'Employee not found'; end if;
 month_value:=p_data->>'solar_month'; perform public.mill_month_days(month_value); amount_value:=mill_private.number(p_data->>'amount',2);
 select coalesce(sum(amount),0) into paid_value from public.mill_salary_payments where employee_id=employee and solar_month=month_value;
 if amount_value<=0 or amount_value>salary_value-paid_value then raise exception 'Salary payment must be positive and no greater than the remaining salary'; end if;
 insert into public.mill_salary_payments(employee_id,solar_month,payment_date,amount,notes,created_by) values(employee,month_value,(p_data->>'date')::date,amount_value,coalesce(p_data->>'notes',''),auth.uid()) returning id into result_id;
 insert into mill_private.requests(id,actor,kind,payload,result) values(p_request_id,auth.uid(),'salary_payment',p_data,result_id); return result_id; end $$;
revoke all on function public.mill_pay_employee_salary(jsonb,uuid) from public,anon; grant execute on function public.mill_pay_employee_salary(jsonb,uuid) to authenticated;

create or replace function public.mill_salary_snapshot(p_month text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; month_start date; month_end date;
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 month_start:=public.mill_solar_month_start(p_month); month_end:=month_start+public.mill_month_days(p_month)-1;
 with rows as (select e.*,coalesce(p.paid,0) paid,greatest(e.monthly_salary-coalesce(p.paid,0),0) remaining from public.mill_employees e left join (select employee_id,sum(amount) paid from public.mill_salary_payments where solar_month=p_month group by employee_id)p on p.employee_id=e.id where e.start_date<=month_end and (e.end_date is null or e.end_date>=month_start))
 select jsonb_build_object('employees',coalesce(jsonb_agg(rows order by name),'[]'::jsonb),'salary_total',coalesce(sum(monthly_salary),0),'paid_total',coalesce(sum(paid),0),'remaining_total',coalesce(sum(remaining),0),
 'payments',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'employee_name',e.name,'payment_date',p.payment_date,'amount',p.amount,'notes',p.notes) order by p.payment_date desc,p.created_at desc),'[]'::jsonb) from public.mill_salary_payments p join public.mill_employees e on e.id=p.employee_id where p.solar_month=p_month)) into result from rows; return result; end $$;
revoke all on function public.mill_salary_snapshot(text) from public,anon; grant execute on function public.mill_salary_snapshot(text) to authenticated;

create or replace function public.mill_daily_expense_summary(p_date date) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare month_value text; daily_value numeric; electricity_value numeric; salary_value numeric; days integer;
begin if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if; if p_date is null then raise exception 'Enter a valid date'; end if;
 month_value:=left(mill_private.solar_hijri_date(p_date),7); days:=public.mill_month_days(month_value);
 select coalesce(sum(x.amount),0) into daily_value from public.mill_expenses x join public.mill_entries e on e.id=x.entry_id where e.date=p_date and e.voided_at is null;
 select coalesce(sum(m.amount/days),0) into electricity_value from public.mill_monthly_expenses m where m.solar_month=month_value and m.category_id='electricity';
 select coalesce(sum(e.monthly_salary/days),0) into salary_value from public.mill_employees e where e.start_date<=p_date and (e.end_date is null or e.end_date>=p_date);
 return jsonb_build_object('date',p_date,'solar_date',mill_private.solar_hijri_date(p_date),'daily',daily_value,'salary',salary_value,'electricity',electricity_value,'fixed',salary_value+electricity_value,'total',daily_value+salary_value+electricity_value); end $$;
revoke all on function public.mill_daily_expense_summary(date) from public,anon; grant execute on function public.mill_daily_expense_summary(date) to authenticated;

commit;
