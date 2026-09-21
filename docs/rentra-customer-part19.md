# Part 19 — Test release acceptance and measurement

Status: IN PROGRESS — implementation and verification underway, 21 September 2026. The provider release gate is not complete. Parts 01–18 remain the completed count.

## Delivered implementation

- `/admin/operations` and the authenticated, no-store `/api/admin/operations` expose aggregate operational health. Active admin authorization is checked both at the request boundary and inside the database reader. Customers, owners, anonymous visitors and deactivated admins have no access.
- Visible alerts cover overdue holds, payment/refund reconciliation, webhook age, blocked/uncertain/failed delivery, OTP delivery failures, unresolved support, negative inventory, overlapping active reservations and unallocated captures. Missing, failed or older-than-two-minute worker heartbeats never appear healthy. Alerts remain in the admin surface; no email, SMS or external paging integration is implied.
- Payment intent, verified captures and verified refunds are grouped separately by provider, environment and schema mode, with decimal minor-unit strings. Sources are aggregated before joining so multiple refunds cannot multiply captures. Existing live-only allocation accounting supplies the separate live capture/refund/fee/payout-reserve figures. Test `real` mode is not bank-money evidence. Payout reserves are not a bank settlement statement.
- Optional daily aggregate events cover searches, listing views, date selections, quote results, non-development login, checkout starts, history views, share attempts/observable completions and bounded action-error categories. Browser signals are explicitly untrusted, action retries can count again, and these figures are not unique-customer conversion rates. Confirmations and expiries come from durable lifecycle records.
- Analytics accepts only enumerated event/source/device/visit-count groups. No user/order/listing identifier, raw URL, query, input, phone, OTP, address, access code, payment token or arbitrary error payload is collected. The browser uses no analytics cookie, omits credentials/referrer, and respects DNT/GPC. Server-origin facts cannot be submitted through the browser endpoint.
- Endpoint protection includes configured same-origin checks, a 512-byte streamed body limit, strict schema, a process-local 1,200-request/minute ceiling, capped daily counters and a 90-day aggregate-retention worker. Use shared ingress rate limits for a multi-instance deployment; the process ceiling is not a distributed abuse control. Retention requires the worker to run. Optional measurement failures do not change committed booking outcomes.
- The `2026-09-21` public policy version explains optional measurement. The published `2026-09-20` content remains available without edits. Measurement does not classify new/returning people or track cross-device journeys; field performance percentiles remain unmeasured.

## Configuration and operation

Both `RENTRA_MEASUREMENT_ENABLED=true` and `NEXT_PUBLIC_RENTRA_MEASUREMENT_ENABLED=true` enable browser collection; the public build flag requires a rebuild. Server counters use the first flag. Both default to false. Keep them disabled in demonstrations and configured seed environments. Fixture tests explicitly opt in only inside their disposable database.

Keep `npm run worker` running separately. Each payments/notifications tick records success or failure; retention runs hourly. A successful tick indicates the worker ran, not that every provider obligation succeeded: queue alerts remain independent. If the database cannot record a failure, the old heartbeat ages into an alert. Refresh the admin page to refresh its snapshot.

Queue alert thresholds: holds two minutes past expiry, webhooks five minutes old, payment/refund work 15 minutes old, due delivery 15 minutes old (blocked/failed/uncertain delivery immediately), support 24 hours without update. Ten daily occurrences trigger each bounded action-error counter. These are initial operational thresholds, not service guarantees or statistically calibrated baselines.

## Reproducible acceptance

- `npm run verify:customer-operations`: disposable database tests for contract/privacy, concurrent counts, retention, ingestion, authorization, worker health and alerts.
- `npm run verify:customer-release`: consolidated database/domain regressions with A01–A18 traceability. Temporary logs use `rentra-part19-<suite>.log`; the sanitized result is [the acceptance report](rentra-customer-part19-acceptance.json). Provider responses in these suites are deterministic fixtures.
- Set `CUSTOMER_BROWSER_DRIVER` to an installed Playwright-core entrypoint, then run `npm run verify:customer-release -- --browser` for the extended fixture browser gate. The default run does not certify browser behavior. Individual browser suites remain independently runnable.
- `npm run verify:customer-quality` with the driver runs the production viewport/metadata/accessibility audit, extended with mobile/desktop admin operations, anonymous/customer/deactivated-admin denial, authenticated JSON headers and real HTTP persistence of bounded browser measurement.
- `npm run verify:customer-provider`: read-only authenticated Razorpay Test API probe. It persists only booleans and safe status in [the provider report](rentra-customer-part19-provider.json); no remote records, credentials or payment details are printed. Passing this probe is not a capture/refund/webhook acceptance result.

## Evidence recorded so far

- Six new operations scenario groups passed in a disposable database, which was removed.
- Read-only Razorpay Test API authentication passed with the supplied key pair. Keys were stored only in ignored `.env.local`; no provider order, capture or refund was created.
- Lint passed with zero errors and four existing image warnings. The 55-table schema generation reported no drift after generating migration 0020.
- Production browser audit passed **37 route/viewport checks**, with no functional failures or axe WCAG A/AA violations. Includes 360/390/1280px operations, noindex, private serialization, anonymous/customer/deactivated-admin denial, authenticated no-store JSON and actual HTTP persistence of bounded browser events. [Saved audit](rentra-customer-part19-quality.json). Both old and new privacy versions also passed direct rendered HTTP checks. This is lab/automated evidence, not field Core Web Vitals or human screen-reader certification.
- The isolated production Webpack build passed with **45 pages**. The audit also passed its own production fixture build. Initial browser findings corrected keyboard access to the horizontally scrolling payment table and admin 2FA badge contrast; the gallery assertion now waits for its asynchronous focus restoration.
- Consolidated regression and checkout browser verification are underway; final outcomes will be recorded here before handoff.

## Database rollout

`0020_customer_operations.sql` adds only `customer_measurement` and `service_health`, with bounded dimension/name/count constraints. It has no seed, booking, payment or financial backfill. Historical SQL through 0019 is unchanged.

Migration 0020 was applied to the configured database on **21 September 2026**. Read-only preflight found it was the only pending migration; postflight verified its checksum, both tables and both named constraints, with no migrations pending. Historical Windows line-ending differences were recognized; the documented retained 0009 hash was accepted only after verifying both deployed function bodies exactly match the 0012 forward repair. No migration history was rewritten.

An empty-work preflight preceded one configured worker tick: zero expiry listings, reconciliations, webhook events, refunds and notifications. Both health rows persisted and measurement counters stayed empty. New checkout remained disabled. The tick is not a running background worker; operators must keep the worker service running for fresh health and retention. Reproduce the read-only audit with `node --env-file=.env.local scripts/audit-customer-operations.mjs --require-applied`.

## Outstanding provider release gate

The API key pair is verified, but a configured webhook secret and reachable Test deployment are still required. Use a dedicated Test webhook at `/api/webhooks/razorpay`, with the same signing secret configured locally and in the provider dashboard. Required supported events are `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed` and `refund.failed`.

Before marking this part complete, record actual hosted Test evidence for full and advance collection, server-verified capture, signed deployed webhook processing/replay, partial cancellation and provider-confirmed refund. Include refresh/lost-response recovery, disabled browsing/new-attempt rejection and continuation of outstanding attempts/refunds after admin disable. Verify Test ledger amounts reconcile and actual live revenue/payout remain zero. Use Test instruments only; do not introduce dummy/live fallback or fabricate provider evidence with fixture HMACs. Preserve pinned keys for outstanding obligations.

Record the deployment revision/time, scenario outcomes and sanitized provider evidence references in the runbook. Screenshots must omit contact details, credentials and tokens. No external messages, gateway enablement or deployment were performed by this change. Field Core Web Vitals and human assistive-technology acceptance remain unmeasured. Finish this gate before Parts 20–22 live readiness.
