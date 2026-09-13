# Part 04: quotes, inventory and payment configuration

Payment direction: [Razorpay Test flow](rentra-payment-flow.md). Session scope: [22-part roadmap](rentra-customer-sessions.md).

## Delivered

- `/admin/payments`: active-admin-only, default-disabled Razorpay Test configuration. Full rent plus fee is the default; advance collects 25% rent plus all fees. Deposit is excluded. Immutable revisions, audit records, stale-edit rejection and explicit Test credential readiness support future adapters without changing historical provider scope.
- `/partner/listings/[id]/calendar`: owner-scoped hours, turnover buffers, notice/horizon, slot capacities, included guests, extra guest charges, explicit open dates, paise-precise overrides and ledger owner blocks with idempotent release.
- Server quotes persist canonical selections, exact intervals, prices, policy/deposit terms, payment configuration/collection snapshots, hash, version and ten-minute expiry. Customer-bound acceptance rechecks ownership, account state and current facts under inventory locks. Guest previews must be requoted after login.
- Calendar, desktop summary and mobile summary use server pricing. Calendar and quotes remain usable with payments disabled. A quote creates neither a hold nor a payment. The public selector still selects one visit; multi-visit service inputs are supported for Part 10's UI.
- Listing-first locking, stable child lock order, whole-transaction retries, conditional hold expiry and the existing PostgreSQL exclusion constraint protect inventory. Legacy active visits or blocks with unknown hours fail closed until explicitly reconciled. Missing inventory is never invented.

## Database rollout

Migration `0010_customer_quote_inventory.sql` is additive: gateway revisions, price overrides, booking configuration and quote payment snapshots, plus owner-block attribution. Its custom trigger prevents gateway history UPDATE/DELETE. Preserve the custom constraints, triggers and accounting view in migrations 0008/0009.

Verification provisions uniquely named disposable databases and removes only databases created by that run. This part does not migrate, backfill or seed the configured Rentra database.

Deployment sequence:

1. Review/apply migrations with `npm run db:migrate` against the intended deployment database, following the Part 02/03 legacy audit/backfill runbooks.
2. Resolve uncertain active intervals and owner blocks. Owners must explicitly configure hours and add missing bookable dates; setup refuses unresolved active inventory. Do not copy assumed default hours into historical reservations.
3. Set `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET` and `RAZORPAY_TEST_WEBHOOK_SECRET` on the server. Generic/live keys are not accepted as a fallback. Secrets never appear in quotes or admin responses.
4. An active admin can save a Test configuration. Enabling this setting alone does not activate checkout: provider execution remains disabled until Parts 11/12 are implemented and verified.

For rollback, disable new payment configuration and revert public readers as needed while preserving all committed reservations and financial records. Do not remove ledger rows or migrations to roll back the UI.

## Verification and remaining boundaries

Use `verify:customer-quotes` for real PostgreSQL integration and concurrent inventory races; `verify:customer-foundation` for date/money rules; `verify:customer-reservations` and `verify:customer-payments` for migration and ledger regressions. Run lint, the Webpack production build and schema-drift generation. The roadmap records final results.

No Razorpay network order, hosted checkout, capture, webhook processing or refund was exercised here. Test credentials in integration tests are fixtures. No bank money was collected. Browser accessibility/device checks, quote abuse throttling/retention and operational expiry scheduling remain release work; they are not established by a successful build.

Part 05 continues customer identity and OTP delivery. Part 10 adds multi-date selection/acceptance UX. Parts 11/12 must use the shared inventory transaction and quote revalidation before holds/confirmation, recheck configuration when registering new attempts, and reconcile existing pinned attempts even after admin disable. Provider network calls belong outside database transactions. Part 14 adds provider Test refunds; Part 19 is the complete sandbox release gate. Live payments remain Parts 20-22.
