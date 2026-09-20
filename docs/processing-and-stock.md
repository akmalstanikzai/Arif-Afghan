# Processing, payments, and packaged inventory

Apply `supabase/migrations/20260920000500_processing_payments_packaging.sql`
after migrations 001–004 before using these screens. The new migration has not
been applied to hosted Supabase. Local PostgreSQL execution was blocked by a
declined server-start permission; the SQL tests below are provided but were not
executed for migration 005.

## Suppliers and payments

Suppliers have an optional father-name field, shown in supplier accounts and
purchase selection. Supplier search also matches the father name.

Purchase payments can be cash or cheque. A cheque requires its number and may
include a sarafi/bank name. The selected method applies to the entered paid
amount; cheques settle that amount immediately, as requested. Later payments
support the same fields. Purchase details show all payment references, including
voided payment records. To split cash and cheque, record one initial payment and
add the other through the purchase's Payment action. No cheque-clearing workflow
or actual bank transfer is performed.

## Start and complete a factory process

1. On Rice processing, select the raw rice, input weight, start date, and notes.
2. Start process reserves the raw rice immediately and fixes its weighted-average
   cost. The app opens Ongoing processes. Raw inventory shows available rice
   separately from rice in process.
3. Open Details / complete, enter a completion date and the four output grades.
   A grade may have multiple rows for different bag sizes/marks, plus bulk rice.
   Each grade/size/mark combination can appear only once. Zero-output grades are
   allowed; the total must be positive and no larger than the input.
4. Completion adds finished stock once. It does not deduct raw stock a second
   time. The server checks the active state and serializes competing writes;
   repeated requests with the same request ID are idempotent.

Started processes do not inflate completed-production or waste totals. Start
and completion dates are both retained, each in Gregorian and Solar Hijri.
Use the processing history's Void action to cancel/correct a process; existing
dependency and cost-protection rules still apply. Completed records remain
auditable. Existing batches migrate as completed records.

The contract-processing screen remains a completed-service form: customer rice
is not factory raw stock. Its outputs now support all the same units and packaging;
only rice retained as payment becomes factory finished stock.

## Weight and packaging

- Every editable weight has linked kilograms and metric tons (1 ton = 1,000 kg).
- Process outputs, retained service rice, sales, and deliveries additionally show
  bag equivalents when a bag size is selected: 20, 24.5, or 70 kg.
- Bag marks are Talha and Mahfooz. Bulk/unpackaged is a separate stock variant.
- Kilograms remain authoritative to 0.001 kg. Unit changes do not alter the
  stored mass. Invalid values or sub-gram precision are rejected in the input.
- Bag equivalents can be fractional when a weight does not fill whole bags;
  they are not an independent count of empty sacks. Repacking between variants
  is not part of this change.

Finished inventory tracks each product/grade/size/mark independently. Sales must
select an available variant; deliveries inherit that sale's variant. A void may
not make any individual variant negative, even if other marks have enough stock.
Old records migrate as bulk because their packaging was never recorded.

Raw and processed inventories have separate navigation pages. Processed-stock
filters combine text, raw rice type, quality, size, mark, availability/reserved/
empty status, and sorting. Displayed totals follow those filters.

## Expense treatment

Purchase transport/additional charges stay in the purchase record and landed
inventory cost. They no longer contribute to Expenses or its dashboard total.
Standalone transport expenses entered on the Expenses page still count there.

The new factory-processing form has no processing-expense field; new started
batches carry zero processing expenses. Historical processing costs are retained
in old records and expense reporting. Record new factory costs separately in
Expenses. The legacy direct-completed processing RPC remains compatible with old
clients; use the new start/completion screens for the revised workflow.

## Validation

`npm test` covers conversions, stock filters, cheque validation, process-start
validation, catalogs, and 39 translated page renders. Build and lint also pass.

For database verification, use a disposable local PostgreSQL database with the
test bootstrap and all five migrations, then run `workflows.sql`, `calendar.sql`,
and `operations.sql` with `psql -v ON_ERROR_STOP=1`. Each SQL fixture rolls back.
The operations fixture covers fathers' names, cheque references and balances,
purchase-only logistics, stock reservation, mixed packaging within a grade,
completion retry protection, packaged sales/deliveries, and reversals.
Run `concurrency.mjs` and `operations-concurrency.mjs` with
`MILL_TEST_DATABASE_URL` pointing to the same disposable local `mill_test...`
database to exercise competing writers. These fixtures commit test-only data.
