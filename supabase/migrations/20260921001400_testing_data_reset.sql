begin;

create or replace function public.mill_clear_testing_data(p_confirmation text)
returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare
  new_version bigint;
begin
  if not public.mill_is_staff() then
    raise exception 'You do not have permission to access factory data';
  end if;
  if p_confirmation is distinct from 'CLEAR ALL DATA' then
    raise exception 'Data reset confirmation is invalid';
  end if;

  lock table mill_private.write_lock in exclusive mode;
  truncate table
    mill_private.requests,
    public.mill_salary_payments,
    public.mill_employees,
    public.mill_monthly_expenses,
    public.mill_deliveries,
    public.mill_payments,
    public.mill_outputs,
    public.mill_expenses,
    public.mill_sales,
    public.mill_services,
    public.mill_batches,
    public.mill_purchases,
    public.mill_entries,
    public.mill_parties
  restart identity;

  update mill_private.write_lock set version = version + 1 where id returning version into new_version;
  return new_version;
end $$;

revoke all on function public.mill_clear_testing_data(text) from public, anon;
grant execute on function public.mill_clear_testing_data(text) to authenticated;

commit;
