# Current update

The latest workflow adds process start/completion, cheque references, father names,
and stock by packaging. See [the updated requirements](processing-and-stock.md).
The review below documents the original baseline; migration 005 supersedes its
purchase-transport expense behavior and single-step factory processing.

# Frontend requirements and backend review

Reviewed the current repository pages, forms, calculations, history, and SQL.
This describes the checked-in backend, not a live inspection of hosted Supabase.
No hosted records or schema were changed.

| Frontend area | Required behavior | Backend implementation |
| --- | --- | --- |
| Login/account | Email/password authentication, persistent session, sign-out, account details; only active staff access business data | Supabase Auth; `mill_staff`, `mill_is_staff`, RLS |
| Suppliers/customers | Create/edit names and contact, deactivate for new transactions, keep history and balances | `mill_parties`, `mill_party_balances`, `mill_post('party')` |
| Purchases | Raw rice type, weight, unit price, separately paid transport, initial cash, payable balance | `mill_entries`, `mill_purchases`, `mill_payments`, invoice balances |
| Factory processing | Consume owned raw stock at weighted average cost, four output grades, waste, processing expenses, batch cost | `mill_batches`, `mill_outputs`, raw/product stock views |
| Contract processing | Record completed processing for a customer, cash and/or rice settlement, receivable balance; only retained rice enters factory stock | `mill_services`, `mill_outputs.retained/fee_price`, `mill_payments` |
| Sales | Transfer ownership immediately; allow initial payment and partial delivery | `mill_sales`, `mill_payments`, `mill_deliveries` |
| Inventory | Raw quantity/value/average cost; processed production, retained fee rice, sold, delivered, reserved, available, physical quantities | `mill_raw_types`, `mill_products`, `mill_raw_stock`, `mill_product_stock` |
| Expenses | Category, description, amount, responsible person, date; include purchase transport and batch expenses once | `mill_expense_categories`, `mill_expenses`, `mill_expense_report` |
| History/details | Type/party/date/search/category filters, pagination, voided records, details, later payments/deliveries | `mill_ledger`, `mill_history`, `mill_post` |
| Corrections | Reasoned voids, retained audit history, dependency checks, stock/cost protection | `mill_entries` audit fields and checked void operation |
| Overview | Financial, stock, processing and contract totals; recent activity | `mill_snapshot` and read views |
| Reliable writes | Atomic invoice/payment/delivery writes, duplicate retry protection, prevent simultaneous overselling/overpayment | `mill_private.requests`, `mill_private.write_lock`, `mill_post` |

## Schema decision

All 14 public tables and both private tables support requirements above. There
is no unused table to drop in this baseline. Views are calculated reports, not
duplicate stored copies of inventory. Combining all transaction tables into one
wide nullable table would weaken type-specific constraints; putting their fields
in JSON would make validation and reporting harder. Payments and deliveries must
remain separate from invoices to support partial amounts and independent voids.
The private request and lock tables protect retries and concurrent writes.

The useful simplification is migration `20260920000300_simplify_snapshot.sql`:
one aggregate over invoice balances and one over processing/service sources
replace repeated summary queries over the full ledger. It preserves response
keys, security-invoker behavior, staff checks, privileges, and transaction data.
It also returns empty category/report arrays consistently. This is a smaller
read implementation, not a measured performance claim or a destructive rebase.
The frontend remains compatible before and after this migration.

## Business boundaries already present

- This is one shared factory, with the same business-data access for all active staff.
- Catalogs contain five raw rice types and four grades each. The UI cannot edit catalogs.
- Contract processing is recorded after rice is returned. It does not track customer raw-rice intake or contract rice awaiting collection.
- There are no opening balances, returns, credit notes, bank accounts, cash drawer reconciliation, tax, profit valuation, or multiple warehouses in the current UI.
- Business dates can be entered in Gregorian or Solar Hijri. The database stores both after migration 004; canonical Gregorian dates still drive sorting and comparisons.
- Stock costing follows posting order (`seq`), even if an operator backdates a record. Date filters do not reconstruct historical stock valuation.
- Standalone expenses mean money already paid; transport and processing charges must not be entered twice.
- Final documents are corrected by void-and-repost, not direct edits or deletion.

## Validation and applying safely

The three migrations and workflow assertions were run in a disposable local
PostgreSQL database. Tests cover costs, service rice/cash settlements, all 16
dashboard summary fields, reversals, atomic rollback, staff/anonymous access,
and concurrent sales, payments, deliveries, and idempotent retries.

For an existing database with the first two migrations applied, run the third migration (dashboard simplification), followed by the fourth
migration (dual calendar dates) in the Supabase SQL editor. For a new project, run all four
in filename order, then provision staff. Do not rerun the original CREATE TABLE
migrations against existing tables. If hosted schema differs from these files,
compare/export it before applying this replacement function. See
`supabase/README.md` for the apply order and test commands.
