-- One-time reset requested before entering new production data.
-- Keeps staff access and fixed rice/product/expense-category catalogs.
begin;

truncate table
  mill_private.requests,
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

update mill_private.write_lock set version=0 where id;

commit;
