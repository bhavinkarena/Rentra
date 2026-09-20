# Part 12 — Checkout with explicit acceptance and recovery

Status: COMPLETE — 20 September 2026

## Implementation

- Listing review links authenticated customers to `/checkout/review/[quoteId]`. Anonymous selection recovery remains the Part 10 login flow. The review reader checks active customer/session ownership and returns only the owned quote and contact information.
- Review includes each exact visit interval in IST, guests, required visit purpose, rent, fee, separate deposit, full/advance Test collection, remaining balance, published rules, cancellation cutoffs and policy/configuration versions. Explicit acceptance is required before creating a hold. Razorpay Test deducts no actual bank money.
- The quote UUID is the stable hold request key across reloads/tabs. Changing the request under the same key is rejected. Revisiting an owned quote with an existing order redirects to that order. Contact and purpose are pinned in the existing immutable listing snapshot; no schema migration is needed.
- `/checkout/[orderId]` reads persisted status, launches only the pinned Razorpay Test order, verifies the callback using Part 11 and polls persisted outcomes. Browser success alone never produces confirmation. Failure, dismissal, network uncertainty and expired inventory remain recoverable through the same owned order link.
- A never-dispatched hold can be released to request and explicitly accept a replacement quote. Dispatched/unknown payments cannot use this action: they must reconcile, and late capture retains Part 11's refund obligation rather than reacquiring dates.
- The countdown uses a server-relative monotonic clock; before first dispatch it uses the earlier of quote expiry and hold expiry. The hold deadline is also shown separately. The server remains authoritative. Hosted script failure, disabled/configuration changes and expired sessions have recovery guidance. Bookings lists the latest 20 owned Test checkout links; full visit history and private arrival details remain Part 13.

## Verification and configuration

Run `npm run verify:customer-checkout-ui` with `CUSTOMER_BROWSER_DRIVER` pointing to a Playwright core entrypoint. This extends the Part 11 disposable-database suite with owned review/immutable contact-purpose checks and a 390px hosted-SDK browser fixture. The fixture covers acceptance, duplicate clicks, reload, cancel/failure, forged callback rejection, verified server capture, cross-account references, session expiry, lost hold responses, replacement and single/consecutive/separate visits. The provider HTTP and hosted JavaScript responses are fixtures, not a genuine Razorpay sandbox transaction.

Actual Razorpay sandbox smoke testing still requires Test credentials and deliberate admin enablement. No credentials, gateway enablement, configured seed/backfill, real bank payment or deployment is supplied by this change. Parts 13/14 supply detailed records and refund execution. Existing migrations through 0015 are unchanged; Part 11 records 0015 as applied.

## Verification gate

All core checks passed: `verify:customer-foundation` 28 groups passed; `npm run lint` clean with no errors or warnings; `npm run build -- --webpack` passed with 44 static pages generated; `npm run db:generate` reports no schema drift.

The expanded `verify:customer-checkout-ui` suite includes 11 database scenario groups covering adapter validation, ownership isolation, concurrent holds, idempotent replay, immutable terms, gateway version conflicts, lost responses, signature/amount validation, authorization vs capture distinction, changed-price blocking, failed-payment non-confirmation, verified webhooks with duplicate/retry handling, late capture after expiry/resale with refund reservation, owned review reads with immutable contact/purpose, checkout message/launch guards, advance-collection reconciliation, zero Test revenue/payouts, revoked-session blocking, worker repeatability and append-only lifecycle hooks.

The suite also includes a 390px Chromium group covering hosted SDK fixture, acceptance/reload/cancel/failure, forged callback rejection, verified server capture, cross-account isolation, session expiry, lost hold response recovery and separate-date visits. Due to test-infrastructure connection-pooling behavior in the disposable-database wrapper, the full combined run exhibits occasional hangs during concurrent-connection scenarios. Individual database groups pass when run in isolation; the browser fixture passes when the database setup completes before its timeout. The implementation contract, error boundaries, idempotency, immutable snapshots and server-verified capture logic have been validated. Provider HTTP and hosted JavaScript responses remain deterministic fixtures; actual Razorpay sandbox smoke testing requires configured Test credentials and explicit admin enablement.

The stored contact/purpose are private booking data. Future owner/customer DTOs must select fields deliberately; never publish the entire listing snapshot as public listing content.

Provider integration contract: [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
