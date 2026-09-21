begin;

create or replace function public.mill_history(p_kind text default null,p_party uuid default null,p_from date default null,p_to date default null,p_search text default '',p_page integer default 0,p_voided boolean default false,p_category text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; begin
 if not public.mill_is_staff() then raise exception 'You do not have permission to access factory data'; end if;
 if p_page<0 then raise exception 'The page is invalid'; end if;
 with filtered as (
  select * from public.mill_ledger l where (p_kind is null or l.kind=p_kind) and (p_party is null or l.party_id=p_party)
  and (p_from is null or l.date>=p_from) and (p_to is null or l.date<=p_to) and (p_voided or l.voided_at is null)
  and (p_category is null or l.category_id=p_category)
  and (coalesce(p_search,'')='' or
    case when p_kind='purchase'
      then concat_ws(' ',l.party_name,l.father_name) ilike '%'||p_search||'%'
      else concat_ws(' ',l.party_name,l.father_name,l.item_name,l.notes,l.description,l.cheque_number,l.payment_institution,l.seq::text) ilike '%'||p_search||'%'
    end)
 ) select jsonb_build_object('count',(select count(*) from filtered),'total',(select coalesce(sum(total),0) from filtered where voided_at is null),
 'rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select * from filtered order by date desc,seq desc limit 50 offset p_page*50) x)) into result;
 return result;
end $$;

revoke all on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) from public,anon;
grant execute on function public.mill_history(text,uuid,date,date,text,integer,boolean,text) to authenticated;

commit;
