begin;

-- The overview calls mill_private.solar_hijri_date, which authenticated users
-- cannot execute directly. The function itself still checks mill_is_staff().
alter function public.mill_salary_overview(integer, date) security definer;
alter function public.mill_salary_overview(integer, date) set search_path = '';

revoke all on function public.mill_salary_overview(integer, date) from public, anon;
grant execute on function public.mill_salary_overview(integer, date) to authenticated;

commit;
