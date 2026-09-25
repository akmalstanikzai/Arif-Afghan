-- Test only, on a disposable database after all migrations. Rolls back all fixtures.
begin;
insert into public.mill_staff(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare employee uuid; summary jsonb; salaries jsonb; overview jsonb;
begin
 employee:=public.mill_save_employee('{"name":"Employee test","monthly_salary":"3100","start_date":"2026-03-21"}',gen_random_uuid());
 perform public.mill_pay_employee_salary(jsonb_build_object('employee_id',employee,'solar_month','1405-01','date','2026-03-25','amount',1000),gen_random_uuid());
 salaries:=public.mill_salary_snapshot('1405-01');
 assert (salaries->>'salary_total')::numeric=3100 and (salaries->>'paid_total')::numeric=1000 and (salaries->>'remaining_total')::numeric=2100,'salary assignment and payment balance';
 assert jsonb_array_length(salaries->'payments')=1,'salary payment history';
 overview:=public.mill_salary_overview(1405,'2026-04-21');
 assert jsonb_array_length(overview->'months')=12,'all twelve Solar Hijri months are returned';
 assert (overview->>'overdue_total')::numeric=2100,'remaining salary is warned after the thirtieth day';
 assert overview->'months'->0->>'status'='overdue','partially paid past month is overdue';
 summary:=public.mill_daily_expense_summary('2026-03-21');
 assert (summary->>'salary')::numeric=100 and (summary->>'total')::numeric=100,'monthly salary allocated across every day';
 perform public.mill_delete_employee(employee);
 raise notice 'PASS: employee salary, partial payment, remaining balance, history, and daily allocation.';
end $$;
rollback;
