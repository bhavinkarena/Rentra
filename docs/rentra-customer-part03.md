# Part 03: payment data and accounting boundaries

This part adds the financial structure for the simulated customer release. No checkout, capture, refund, saved-token or payout provider is connected. Runtime mode is fixed to `simulated` in `lib/payments/config.js`; changing an environment variable cannot enable charging.

## Schema and money contract

Migration `0009_customer_payment_ledger.sql` adds eight tables:

| Table | Meaning |
| --- | --- |
| `payment_order` | Intended collection, with a booking-order parent, purpose, expected amount and request/idempotency identity. |
| `payment_attempt` | One attempt within an intent; at most one created/processing/unknown attempt at a time. |
| `payment_transaction` | Immutable simulated, authorization, capture or failure fact. |
| `payment_allocation` | Immutable per-visit rent/fee/tax/deposit split of a capture or simulation. |
| `refund` | One persistent refund obligation; pending/uncertain and successful obligations reserve their amount. |
| `refund_allocation` | Refund split tied to the original allocation, visit and component. |
| `payment_event` | Deduplicated, signature-verified provider event metadata for a future durable ingestion service. |
| `customer_payment_method` | Future encrypted provider-token references; no raw card, CVV, PIN or account details. |

All new amounts are nonnegative integer minor units within JavaScript's safe integer range. Aggregate query results are decimal strings to preserve precision across many rows. No tax rate or collection schedule is introduced.

Payment-order, attempt, transaction and refund scope must match through the parent chain: provider, environment, mode, INR currency and expected amount where applicable. Provider identities are unique within provider/environment namespaces. A payment ID may appear in both authorization and capture facts; transaction deduplication uses external ledger ID plus kind instead of incorrectly making the payment ID itself unique across facts.

Simulated transactions use `DUMMY_TXN_…` references. Their simulated amount is separate from authorized and captured amounts, which are zero. Simulated refunds have zero actual amount. `legacy_unknown` cannot be used to create new financial facts. Existing legacy booking amounts and payout rows are preserved, not promoted into payment evidence.

A real fact in a fixture is a **synthetic assertion** used to test the database. `verified_at` and `evidence_hash` do not verify a bank payment by themselves. Only the future trusted provider adapter may write verified facts after checking signatures, identity, amount and currency. That adapter and live rollout belong to Parts 20–22.

## Atomic reconciliation and immutable evidence

Create a transaction and all its allocations in one database transaction. Likewise, create or complete a refund and all allocation amounts together. Deferred constraints enforce equality at commit, and reject incomplete writes. A returned insert row is not a committed outcome until the outer transaction succeeds.

Financial writers serialize through their payment-order row. A no-op update versions that row so a stale Repeatable Read snapshot receives a serialization failure instead of overspending from an old aggregate. Future orchestration must acquire listing/booking locks first, then payment-order locks; retry the whole transaction for retryable serialization/deadlock failures. Do not make provider/network calls while those locks are held.

Captured plus simulated successful amounts cannot exceed the intended collection. Authorization does not enter this sum. Capture and simulation allocations reconcile exactly with their respective amounts. Refund allocations must retain the original transaction, visit and component; all pending, processing, unknown and succeeded refunds share the same cap. A failed refund releases its reservation, and retry updates the original obligation with its existing idempotency key. Successful refunds and immutable facts cannot be rewritten or deleted.

Parent booking scope and provenance become immutable once a payment intent exists, while legacy backfill without financial children remains possible. Payment/event identities and original evidence are immutable. Provider order/payment/refund IDs can be assigned once when initially unknown, then cannot be swapped.

The database migration contains custom triggers and an internal `captured_payment_allocation` view. They are not represented in Drizzle's JSON snapshot. Preserve them in future migrations and verify using the actual migration chain, not `drizzle-kit push`. The rationale for deferred checks follows PostgreSQL's [constraint-trigger documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html); cross-row totals cannot safely be ordinary row [CHECK constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

## Accounting, payouts and private reads

`lib/payments/accounting.js` is the shared owner-scoped accounting reader. It uses only verified successful live capture allocations attached to real-provenance booking orders and visits. Seed, test, legacy-unknown, simulated and authorization facts never contribute. Current repository inspection found no implemented earnings query to replace; the existing partner portal reports portfolio/onboarding data. The new server wrappers in `lib/payments/queries.js` are the integration boundary for later financial screens.

The summary reports captured amount, successful actual refunds, net captured fees and remaining captured rent eligible for payout. It does not call all booking value revenue. Payout sources additionally require a completed real visit and deduct pending/successful refund reservations plus funded payout reservations. Each query checks the owner's current active client status and limits data to that owner's listings. The internal database view alone is not an authorization boundary and must never be exposed directly to customers.

Existing `payout` columns retain whole-rupee meaning. New `funding_allocation_id` and `actual_net_minor` explicitly identify an actual-money payout. Legacy rows default to null funding and zero actual money, even if their old status says paid. New funded payouts require a verified live rent capture, matching owner and booking, completed real visit, unique allocation funding and enough unreserved funds. Financial history cannot be deleted to free its reservation.

This is a conservative single-allocation funding model, not a settlement provider. Multiple payout splits, deductions, recovery after disbursement and refunds of already-disbursed funds need the reconciliation/recovery policies in Parts 21–22. A refund that would exceed the remaining funded allocation is rejected until that recovery path exists. No payout service is enabled in this part.

`getCustomerPaymentMethods()` rechecks active customer status and returns `[]` in dummy mode, including when provider-method fixtures exist in the database. Token encryption/decryption, provider consent and safe display DTOs remain Part 22. Schema existence does not mean token handling is implemented.

The old Razorpay placeholder previously acknowledged events without persisting anything. It now responds with HTTP 503, `PAYMENTS_DISABLED` and `Cache-Control: no-store`. Part 21 must replace it with verified durable event ingestion before acknowledging real events. The worker remains a heartbeat scaffold and explicitly reports that real money handlers are disabled.

## Verification and rollout

```sh
npm run verify:customer-payments
npm run verify:customer-reservations
npm run verify:customer-foundation
npm run lint
npm run build -- --webpack
npm run db:generate
```

Database tests provision uniquely named disposable databases, apply the previous and new migrations, run synthetic fixtures and concurrency assertions, then remove only those databases. They use `TEST_DATABASE_ADMIN_URL` when set, otherwise the configured database server as a provisioner. Neither test migrates or seeds the configured Rentra database. As in Part 02, Neon provisioning uses the direct endpoint.

Deploy the additive migration after a reviewed backup and the Part 02 rollout prerequisites, before enabling readers of the new tables/view. The application currently enables no live provider from this migration. Booking quotes and inventory authority remain Part 04, and customer confirmation is Part 11. Keep original booking and payout data when disabling a later UI rollout.

**Gate complete — 13 September 2026.** All 12 payment verification groups, 10 reservation regression groups and 28 foundation groups passed. The reservation suite converted and re-ran the current 29-visit seed. Lint, the worker startup smoke check and the Webpack production build passed; the build generated 34 static pages. Drizzle regeneration reported no schema drift.

The final database runs completed after the interrupted session was resumed; their logs were retained in `/private/tmp/rentra-part03-payments.log` and `/private/tmp/rentra-part03-reservations.log`. Both new disposable databases were removed. One inactive database left by the interrupted reservation run was verified as seed-only (29 visits, seed-owner marker, zero payment facts) and removed without forcing any active connections.

The configured Rentra database was not migrated or seeded by this part. No real money operations occurred. Part 04 is the next session; the authoritative status and handoff are in [the session roadmap](rentra-customer-sessions.md).
