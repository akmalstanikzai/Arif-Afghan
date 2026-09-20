-- One shared mill. All writes go through checked RPCs; no client-side stock totals.
begin;
create schema if not exists mill_private;
revoke all on schema mill_private from public,anon,authenticated;

create table public.mill_staff (
  user_id uuid primary key references auth.users(id),
  active boolean not null default true
);
create function public.mill_is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.mill_staff where user_id = auth.uid() and active);
$$;
revoke all on function public.mill_is_staff() from public;
grant execute on function public.mill_is_staff() to authenticated;

create table public.mill_raw_types (id smallint primary key, name text not null unique);
insert into public.mill_raw_types values (1,'Kainat'),(2,'Lok'),(3,'Sorakha Zarai'),(4,'Shalongei'),(5,'Peshawari');
create table public.mill_products (
  id smallint primary key,
  raw_type_id smallint not null references public.mill_raw_types,
  quality smallint not null check (quality between 1 and 4),
  name text not null unique,
  unique(raw_type_id,quality)
);
insert into public.mill_products
select (r.id*10+q.id)::smallint,r.id,q.id::smallint,r.name||' '||q.name
from public.mill_raw_types r cross join (values (1,'Premium'),(2,'Medium'),(3,'Lower Medium'),(4,'Broken')) q(id,name);
create table public.mill_expense_categories (id text primary key, name text not null);
insert into public.mill_expense_categories values ('salary','Salary'),('electricity','Electricity'),('food','Food'),('transport','Transport'),('maintenance','Maintenance'),('other','Other expenses');
create table public.mill_parties (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('supplier','customer')),
  name text not null check(length(trim(name)) between 1 and 160),
  contact text not null default '' check(length(contact)<=200),
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);
create index on public.mill_parties(kind,name);
create table public.mill_entries (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  kind text not null check(kind in ('purchase','processing','service','sale','payment','delivery','expense')),
  date date not null,
  party_id uuid references public.mill_parties,
  notes text not null default '' check(length(notes)<=2000),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null references auth.users,
  voided_at timestamptz,
  voided_by uuid references auth.users,
  void_reason text,
  check((voided_at is null and voided_by is null and void_reason is null) or
        (voided_at is not null and voided_by is not null and length(trim(void_reason))>0))
);
create index on public.mill_entries(kind,date desc,seq desc);
create index on public.mill_entries(party_id,date desc);
create table public.mill_purchases (
  entry_id uuid primary key references public.mill_entries,
  raw_type_id smallint not null references public.mill_raw_types,
  weight numeric(18,3) not null check(weight>0),
  unit_price numeric(18,4) not null check(unit_price>=0),
  logistics numeric(18,2) not null default 0 check(logistics>=0),
  base_amount numeric generated always as (round(weight*unit_price,2)) stored,
  total_cost numeric generated always as (round(weight*unit_price,2)+logistics) stored
);
create index on public.mill_purchases(raw_type_id);
create table public.mill_batches (
  entry_id uuid primary key references public.mill_entries,
  raw_type_id smallint not null references public.mill_raw_types,
  input_weight numeric(18,3) not null check(input_weight>0),
  expenses numeric(18,2) not null default 0 check(expenses>=0),
  raw_cost numeric(24,8) not null check(raw_cost>=0)
);
create index on public.mill_batches(raw_type_id);
create table public.mill_services (
  entry_id uuid primary key references public.mill_entries,
  raw_type_id smallint not null references public.mill_raw_types,
  input_weight numeric(18,3) not null check(input_weight>0),
  charge numeric(18,2) not null check(charge>=0)
);
create table public.mill_outputs (
  entry_id uuid not null references public.mill_entries,
  product_id smallint not null references public.mill_products,
  weight numeric(18,3) not null check(weight>=0),
  retained numeric(18,3) not null default 0 check(retained>=0 and retained<=weight),
  fee_price numeric(18,4) not null default 0 check(fee_price>=0),
  primary key(entry_id,product_id)
);
create index on public.mill_outputs(product_id);
create table public.mill_sales (
  entry_id uuid primary key references public.mill_entries,
  product_id smallint not null references public.mill_products,
  weight numeric(18,3) not null check(weight>0),
  unit_price numeric(18,4) not null check(unit_price>=0),
  total numeric generated always as (round(weight*unit_price,2)) stored
);
create index on public.mill_sales(product_id);
create table public.mill_payments (
  entry_id uuid primary key references public.mill_entries,
  target_id uuid not null references public.mill_entries,
  amount numeric(18,2) not null check(amount>0)
);
create index on public.mill_payments(target_id);
create table public.mill_deliveries (
  entry_id uuid primary key references public.mill_entries,
  sale_id uuid not null references public.mill_sales(entry_id),
  weight numeric(18,3) not null check(weight>0)
);
create index on public.mill_deliveries(sale_id);
create table public.mill_expenses (
  entry_id uuid primary key references public.mill_entries,
  category_id text not null references public.mill_expense_categories,
  description text not null check(length(trim(description)) between 1 and 500),
  responsible text not null default '' check(length(responsible)<=160),
  amount numeric(18,2) not null check(amount>0)
);
create table mill_private.write_lock (id boolean primary key default true check(id), version bigint not null default 0);
insert into mill_private.write_lock default values;
create table mill_private.requests (
  id uuid primary key, actor uuid not null references auth.users,
  kind text not null, payload jsonb not null, result uuid not null,
  created_at timestamptz not null default clock_timestamp()
);

-- Every read view obeys the underlying RLS policies.
create view public.mill_raw_stock with (security_invoker=true) as
select r.id,r.name,
  coalesce(p.weight,0)-coalesce(b.weight,0) quantity,
  coalesce(p.cost,0)-coalesce(b.cost,0) value,
  case when coalesce(p.weight,0)-coalesce(b.weight,0)>0
    then (coalesce(p.cost,0)-coalesce(b.cost,0))/(coalesce(p.weight,0)-coalesce(b.weight,0)) else 0 end average_cost
from public.mill_raw_types r
left join (select p.raw_type_id,sum(p.weight) weight,sum(p.total_cost) cost from public.mill_purchases p join public.mill_entries e on e.id=p.entry_id where e.voided_at is null group by p.raw_type_id) p on p.raw_type_id=r.id
left join (select b.raw_type_id,sum(b.input_weight) weight,sum(b.raw_cost) cost from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where e.voided_at is null group by b.raw_type_id) b on b.raw_type_id=r.id;

create view public.mill_product_stock with (security_invoker=true) as
select p.*,coalesce(o.produced,0) produced,coalesce(o.received,0) service_received,
  coalesce(s.sold,0) sold,coalesce(d.delivered,0) delivered,
  coalesce(s.sold,0)-coalesce(d.delivered,0) reserved,
  coalesce(o.produced,0)+coalesce(o.received,0)-coalesce(s.sold,0) available,
  coalesce(o.produced,0)+coalesce(o.received,0)-coalesce(d.delivered,0) physical
from public.mill_products p
left join (select o.product_id,sum(case when e.kind='processing' then o.weight else 0 end) produced,sum(case when e.kind='service' then o.retained else 0 end) received from public.mill_outputs o join public.mill_entries e on e.id=o.entry_id where e.voided_at is null group by o.product_id) o on o.product_id=p.id
left join (select s.product_id,sum(s.weight) sold from public.mill_sales s join public.mill_entries e on e.id=s.entry_id where e.voided_at is null group by s.product_id) s on s.product_id=p.id
left join (select s.product_id,sum(d.weight) delivered from public.mill_deliveries d join public.mill_entries e on e.id=d.entry_id join public.mill_sales s on s.entry_id=d.sale_id where e.voided_at is null group by s.product_id) d on d.product_id=p.id;

create view public.mill_invoice_balances with (security_invoker=true) as
select e.id,e.kind,e.party_id,e.date,
  coalesce(p.base_amount,s.total,v.charge,0) total,
  coalesce(pay.amount,0) paid,coalesce(fee.value,0) rice_payment,
  coalesce(p.base_amount,s.total,v.charge,0)-coalesce(pay.amount,0)-coalesce(fee.value,0) remaining,
  coalesce(s.weight,0) purchased_weight,coalesce(del.weight,0) delivered,
  coalesce(s.weight,0)-coalesce(del.weight,0) pending
from public.mill_entries e
left join public.mill_purchases p on p.entry_id=e.id
left join public.mill_sales s on s.entry_id=e.id
left join public.mill_services v on v.entry_id=e.id
left join (select p.target_id,sum(p.amount) amount from public.mill_payments p join public.mill_entries e on e.id=p.entry_id where e.voided_at is null group by p.target_id) pay on pay.target_id=e.id
left join (select o.entry_id,round(sum(o.retained*o.fee_price),2) value from public.mill_outputs o group by o.entry_id) fee on fee.entry_id=e.id
left join (select d.sale_id,sum(d.weight) weight from public.mill_deliveries d join public.mill_entries e on e.id=d.entry_id where e.voided_at is null group by d.sale_id) del on del.sale_id=e.id
where e.voided_at is null and e.kind in ('purchase','sale','service');

create view public.mill_party_balances with (security_invoker=true) as
select p.*,coalesce(b.total,0) total,coalesce(b.paid,0) paid,coalesce(b.rice_payment,0) rice_payment,coalesce(b.remaining,0) remaining,
coalesce(b.purchased_weight,0) purchased_weight,coalesce(b.delivered,0) delivered,coalesce(b.pending,0) pending,coalesce(b.sales_total,0) sales_total,coalesce(b.service_total,0) service_total
from public.mill_parties p left join (
select party_id,sum(total) total,sum(paid) paid,sum(rice_payment) rice_payment,sum(remaining) remaining,
sum(purchased_weight) purchased_weight,sum(delivered) delivered,sum(pending) pending,
sum(case when kind='sale' then total else 0 end) sales_total,sum(case when kind='service' then total else 0 end) service_total
from public.mill_invoice_balances group by party_id) b on b.party_id=p.id;

create view public.mill_expense_report with (security_invoker=true) as
select c.id,c.name,coalesce(x.amount,0)+case when c.id='transport' then coalesce(p.amount,0) else 0 end amount
from public.mill_expense_categories c
left join (select x.category_id,sum(x.amount) amount from public.mill_expenses x join public.mill_entries e on e.id=x.entry_id where e.voided_at is null group by x.category_id) x on x.category_id=c.id
cross join (select sum(p.logistics) amount from public.mill_purchases p join public.mill_entries e on e.id=p.entry_id where e.voided_at is null) p
union all select 'processing','Processing expenses',coalesce(sum(b.expenses),0) from public.mill_batches b join public.mill_entries e on e.id=b.entry_id where e.voided_at is null;

create view public.mill_ledger with (security_invoker=true) as
select e.*,party.name party_name,coalesce(r.name,product.name,'') item_name,
coalesce(p.weight,b.input_weight,v.input_weight,s.weight,d.weight,0) weight,
coalesce(i.total,p.base_amount,s.total,v.charge,x.amount,pay.amount,b.raw_cost+b.expenses,0) total,
coalesce(i.paid,0) paid,coalesce(i.remaining,0) remaining,coalesce(i.rice_payment,0) rice_payment,
coalesce(i.delivered,0) delivered,coalesce(i.pending,0) pending,
coalesce(p.unit_price,s.unit_price,0) unit_price,coalesce(p.logistics,0) logistics,
coalesce(p.total_cost,b.raw_cost+b.expenses,0) total_cost,
coalesce(b.expenses,0) processing_expenses,coalesce(b.raw_cost,0) raw_cost,
coalesce(outputs.total_output,0) total_output,
case when e.kind in ('processing','service') then coalesce(b.input_weight,v.input_weight)-coalesce(outputs.total_output,0) else 0 end wastage,
coalesce(outputs.items,'[]'::jsonb) outputs,
x.category_id,x.description,x.responsible,coalesce(pay.target_id,d.sale_id) target_id,
coalesce(target.kind,'') target_kind,target.seq target_seq
from public.mill_entries e
left join public.mill_parties party on party.id=e.party_id
left join public.mill_purchases p on p.entry_id=e.id
left join public.mill_batches b on b.entry_id=e.id
left join public.mill_services v on v.entry_id=e.id
left join public.mill_sales s on s.entry_id=e.id
left join public.mill_payments pay on pay.entry_id=e.id
left join public.mill_deliveries d on d.entry_id=e.id
left join public.mill_expenses x on x.entry_id=e.id
left join public.mill_entries target on target.id=coalesce(pay.target_id,d.sale_id)
left join public.mill_raw_types r on r.id=coalesce(p.raw_type_id,b.raw_type_id,v.raw_type_id)
left join public.mill_products product on product.id=s.product_id
left join public.mill_invoice_balances i on i.id=e.id
left join (select o.entry_id,sum(o.weight) total_output,jsonb_agg(jsonb_build_object('product_id',o.product_id,'name',p.name,'weight',o.weight,'retained',o.retained,'fee_price',o.fee_price,'returned',o.weight-o.retained) order by p.quality) items from public.mill_outputs o join public.mill_products p on p.id=o.product_id group by o.entry_id) outputs on outputs.entry_id=e.id;

-- Staff can read, but cannot write directly or enroll themselves.
do $$ declare t text; begin
  foreach t in array array['mill_staff','mill_raw_types','mill_products','mill_expense_categories','mill_parties','mill_entries','mill_purchases','mill_batches','mill_services','mill_outputs','mill_sales','mill_payments','mill_deliveries','mill_expenses'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy staff_read on public.%I for select to authenticated using ((select public.mill_is_staff()))',t);
  end loop;
end $$;
grant select on public.mill_raw_stock,public.mill_product_stock,public.mill_invoice_balances,public.mill_party_balances,public.mill_expense_report,public.mill_ledger to authenticated;
revoke all on public.mill_raw_stock,public.mill_product_stock,public.mill_invoice_balances,public.mill_party_balances,public.mill_expense_report,public.mill_ledger from anon;
commit;
