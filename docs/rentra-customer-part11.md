# Part 11 — Atomic holds and Razorpay Test services

Status: COMPLETE — 20 September 2026. Server gate passed using provider HTTP fixtures; actual sandbox checkout remains an integration check for Part 12.

## Delivered contracts

`lib/booking/checkout-actions.js` exposes authenticated customer actions for creating a hold, starting a Test order, verifying a callback, reading status and requesting reconciliation. Part 12 connects these actions to hosted Checkout. The existing customer screen still creates no hold or payment.

- A hold requires an active customer session, an owned unexpired quote, its exact version/hash, explicit acceptance and a stable UUID idempotency key. The server rechecks current listing, price, policy, gateway configuration and every inventory interval. Parent, visits, reservations and payment intent commit together under the shared listing mutex. Replaying the same request returns the same order; changing it under the same key fails.
- Holds expire after ten minutes or the first visit start, whichever comes first. Accepted terms and the payment allocation plan become immutable. Availability reads and the worker release expired reservations atomically. Confirmed inventory is never expired by a stale job.
- Admin enablement and the current gateway version gate new holds and first dispatch. First dispatch revalidates the accepted terms. An existing dispatch remains pinned to its original enabled configuration and Test key after admin disablement or key rotation.
- The Razorpay adapter accepts only explicit Test credentials and uses the fixed Razorpay API host. Amounts are integer paise in INR, with deposits excluded. Full or advance collection comes from the accepted quote. Provider calls occur outside database transactions.
- Before creating a provider order, the service durably claims its single POST. A timeout or crash enters receipt lookup; retry never sends another create POST. Lookup requires one exact receipt match and matching amount/currency. A crash before the POST may therefore require operator review; absence from lookup is not permission to charge again.
- Callback verification uses the server-stored provider order ID and HMAC, then fetches the payment from the provider. Only an exact captured payment can confirm all held visits. Authorization, failure, forged signatures and mismatched scope cannot confirm. Duplicate callback/webhook/worker deliveries reuse the same immutable capture and allocations.
- Expired inventory is never reacquired on late capture. A verified capture after expiry or account/listing unavailability records a full requested Test refund with per-visit refund allocations and a `refund_required` lifecycle event. Part 14 executes refunds; this part does not send refund requests to Razorpay.
- Test ledger facts use `provider=razorpay`, `environment=test`, `mode=real`, with Test visit provenance. Test captured amounts are auditable while actual-money mirrors stay zero and revenue/payout readers exclude them. Live payments remain disabled.

## Webhooks and worker

`POST /api/webhooks/razorpay` reads at most 256 KiB of raw bytes, verifies `x-razorpay-signature`, and deduplicates `x-razorpay-event-id` in the Test namespace. It acknowledges only after the event and job are persisted. It retains a body hash and redacted event/payment/order identifiers, not raw provider payloads, contacts or card information. Conflicting bodies under one event ID fail.

Subscribe the Test webhook to `payment.authorized`, `payment.captured`, `payment.failed` and `order.paid`. Processing fetches current provider state instead of trusting the payload's financial fields. Other valid event types are recorded and ignored; refund processing belongs to Part 14.

Run `npm run worker` as a separate process, or `npm run worker -- --once` for one bounded tick. Ticks release expired holds, reconcile dispatched/unknown/linked payments and process durable webhook jobs. Jobs use leases, retry timestamps and safe failure codes. Crashes and concurrent workers can repeat reads; database locks and unique evidence prevent repeated settlement. `booking_lifecycle_event` publishes append-only `held`, `expired`, `confirmed` and `refund_required` hooks for later notification work.

## Configuration and rollout

Use `.env.example` for `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET` and `RAZORPAY_TEST_WEBHOOK_SECRET`. Admin settings remain the source of enablement and collection purpose. No credentials or admin enablement are supplied by this change.

When rotating an API key, retain old Test credentials in `RAZORPAY_TEST_KEYRING_JSON`, mapping the old `rzp_test_…` ID to `{ "keySecret": "…" }`. Retain previous webhook secrets in `RAZORPAY_TEST_PREVIOUS_WEBHOOK_SECRETS` while old deliveries can retry. These are server secrets, never public environment variables. Removing a pinned key stops reconciliation for its existing orders until restored.

Migration `0015_customer_checkout.sql` adds payment executions, event jobs, lifecycle hooks and accepted-term protections. It was applied successfully to the configured database on 20 September 2026 after disposable-database verification. The preflight confirmed it was the only pending migration. Apply it before running updated inventory readers or workers in other environments. No configured seed, backfill, SMS, provider payment, gateway enablement or deployment was run.

## Verification

`npm run verify:customer-checkout` provisions and removes an isolated database, applies the complete migration chain and uses deterministic HTTP fixtures. It covers ownership/session isolation, all-or-nothing races, idempotency, immutable terms, gateway toggles, lost responses, signature/scope rejection, authorization versus capture, replay, webhook privacy/retry, late capture after resale, advance allocations, Test accounting exclusion and repeatable jobs.

Provider fixtures exercise the integration contract; they are not evidence of a real Razorpay sandbox checkout. No Test credentials are configured locally, so a genuine provider order/capture has not been executed. Part 12 must run that smoke test when credentials and the hosted checkout are available.

Verified gate — 20 September 2026:

- All **11 checkout groups passed**, including an in-flight duplicate start, a separate connection acquiring inventory/order/payment locks during the provider request, changed-price rejection before dispatch, failed-payment non-confirmation and duplicate-capture rejection. Its disposable database was removed.
- Regression gates passed: **15 quote/inventory/gateway**, **12 payment-ledger**, **10 reservation** and **28 foundation** groups. Reservation checks also migrated and reran the 29-visit development seed only inside a disposable database.
- Explicit old Test API-key and previous webhook-secret rotation checks passed. Missing pinned keys and live keys were rejected.
- Full lint passed with zero errors and four existing image-element warnings. Changed-file lint passed. The isolated production Webpack build generated **44 pages**. Schema generation reported no drift.
- Post-migration checks confirmed all three new tables and five protection triggers. A configured worker `--once` smoke passed after an empty-work preflight: zero expiry listings, reconciliations or events. Diff and documentation consistency checks passed: exactly one card per completed part, Part 12 next, valid runbook links and an unchanged manual checklist.
- The initial tests exposed timestamp coercion and inconsistent JSON serializers on competing fixture connections. Those were corrected. A lock probe initially raced a separate legitimate transaction; the final fixture checks unlocked provider dispatch before starting its in-flight duplicate, and the full rerun passed.

Provider references: [server integration and signature verification](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/), [receipt-filtered order lookup](https://razorpay.com/docs/api/orders/fetch-all/), [raw webhook validation and secret rotation](https://razorpay.com/docs/webhooks/validate-test/).

## Next part

Part 12 implements hosted Test checkout, contact/purpose review, stable idempotency across reloads, pending/failed/expired recovery and callback/webhook reconciliation. Read persisted status after uncertain results. Never interpret a browser callback or a local review marker as confirmation. Part 13 supplies booking history/private arrival details; Part 14 executes refund obligations.
