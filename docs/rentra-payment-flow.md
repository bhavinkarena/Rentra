# Rentra payment flow: admin-controlled Razorpay Test

**Decision date: 13 September 2026.** This supersedes the earlier dummy-only customer checkout proposal. Parts 01–03 remain completed historical work; their runbooks describe what was implemented at those gates. This document defines the payment behavior to implement from Part 04 onward. It is a requirement and integration contract, not a claim that checkout or Razorpay is already connected.

**Implementation status — 20 September 2026:** Part 11 server services are complete: atomic holds, Razorpay Test order dispatch/verification, durable webhook processing and expiry/late-capture reconciliation. Migration 0015 is applied locally. Verification used deterministic provider HTTP fixtures; no actual sandbox payment was executed because Test credentials are absent. Hosted customer checkout remains Part 12, refund execution Part 14 and the full sandbox release gate Part 19. See the [Part 11 runbook](rentra-customer-part11.md).

Razorpay **Test mode** is the first gateway integration. It exercises provider orders, hosted checkout, payment verification, webhooks and refunds without deducting real bank money. It is distinct from Rentra's internal dummy provider. Razorpay documents separate test credentials and test checkout behavior in its [Standard Checkout integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

## Availability and admin controls

| State | New customer checkout / new payment attempts | Existing attempts and obligations |
| --- | --- | --- |
| Disabled, including default/unconfigured | Pause new checkout and payment attempts; explain that online booking payments are currently unavailable. Public browsing, search, listing availability and quote previews remain usable. | Continue owned status reads, callback verification, webhook ingestion, reconciliation and refunds using each attempt's stored provider/environment. |
| Enabled: Razorpay Test | Offer clearly labelled test checkout after configuration, quote, identity and inventory checks. | Continue through the same persisted provider/environment. |
| Provider outage, missing/invalid credentials or unsupported configuration | Fail closed with recoverable unavailability/processing state. Do not confirm a booking from a provider failure. | Preserve pending/unknown state; retry/reconcile the same attempt rather than inventing a success or starting a duplicate. |
| Live or an unimplemented provider requested | Reject the configuration. Live checkout is unavailable until Parts 20–22 pass. | Never relabel historical test/dummy records or reroute an existing attempt. |

- An authorised active admin controls whether new payments are enabled and selects a supported provider. The first enabled option is Razorpay Test. Configuration changes are versioned, audited and checked on the server; customers cannot choose an environment or bypass a disabled gate.
- Default is disabled. Neither disabling nor any error triggers a dummy, offline/manual-transfer or live fallback. No no-payment shortcut confirms a new booking.
- Provider credentials and webhook secrets stay server-side. Admin settings show configuration/readiness and safe identifiers, not credential values. A future provider registry can add another adapter without changing booking or ledger semantics.
- Preserve existing credential references and webhook verification material while old attempts/events/refunds still require them. Disabling new checkout must not disable the settlement/reconciliation path for previously created attempts.
- Recheck configuration when accepting a quote, creating a hold/checkout intent and starting a new attempt. A changed version requires an updated quote and explicit acceptance of any changed amount/terms. An already-created attempt remains bound to its original configuration snapshot and can finish after disable.

## Mode, environment and money truth

The existing schema has separate mode and environment fields. **Razorpay Test records use `mode='real'`, `provider='razorpay'`, `environment='test'`.** Here `real` distinguishes a provider integration from the legacy internal simulation; it does not establish a real bank-money payment. Do not add a new enum solely to make a UI label or store Test records as `simulated`.

| Record family | Provider evidence | Ledger capture/refund amounts | Actual bank money / actual revenue / payout eligibility |
| --- | --- | --- | --- |
| Historical internal dummy | Internal `DUMMY_TXN_…` fact; no gateway payment | Simulated amounts separately; captured and actual refunded amounts remain zero | Zero |
| Razorpay Test | Verified test order/payment/event/refund IDs | Capture/allocation/refund fields can contain nonzero test amounts and must reconcile inside the test namespace | Zero; exclude `environment='test'` from all actual-money reports and payouts |
| Future live integration | Verified live evidence under approved policy | Verified live captures/refunds only | Eligible only under the live accounting and settlement gates |

Provider test captures must not be erased to zero: doing so would destroy test reconciliation. Instead, customer/staff DTOs and metrics expose test amounts with an explicit test label and separately report actual bank-money collection as ₹0. Booking value, intended collection, provider test capture and actual live collection are different measures.

Visit provenance remains independent: test/seed visits never establish real visit history; real visit completion requires operational evidence even if payment used a non-live environment. Payment success alone cannot make a visit completed or review-eligible.

## Part 04 quote contract

Extend the authoritative server quote and immutable accepted snapshots with:

- Canonical dates/slot/guests, precise property-local intervals, currency, itemised rent/fee/deposit, price/policy versions and expiry.
- Gateway configuration version, enabled/readiness state, selected provider and environment; include only safe public fields, never secrets or secret references.
- Explicit planned collection purpose, amount in minor units, component/visit allocation basis and collection-policy version. Initial admin choices are `full` (the sandbox default: booking rent plus platform fee, excluding deposit) or `advance` (25% rent plus the entire platform fee). Retain the schema's `balance`/`deposit` purposes for future agreed flows; the first checkout does not silently add them. A missing or inconsistent plan can prevent checkout readiness without preventing public availability/price discovery.
- Separate total booking value, intended test collection, excluded deposit and any remaining balance. The admin-selected, versioned `full`/`advance` setting is a sandbox test policy, not a live commercial commitment. No tax or deposit collection is silently added.

Quotes never create payment facts or a provider order. Disabled gateways do not make a free date unavailable. When checkout is implemented, it reloads current admin configuration and revalidates quote/inventory under the shared lock discipline. The accepted collection amount, provider and environment must match through order, attempt, transaction and allocations.

## Customer flow and persistence

1. **Discover and select.** Public availability and quote previews work whether the gateway is on or off. Show the test-payment or paused-booking state without misleading date availability.
2. **Log in and review.** Restore and requote the validated selection. Display every visit, pricing, policy, planned test collection and deposit separation. Require explicit terms/quote acceptance.
3. **Create one owned checkout intent.** Recheck admin gate/configuration and quote versions. Under listing-first and order/payment locks, reserve all visits or none, with the configured hold expiry and stable customer idempotency/request identity.
4. **Start Razorpay Test.** Persist the attempt and its immutable provider/environment/config snapshot before the external call. Create the provider order outside database transactions, record its identity once and launch hosted checkout with the safe public options. Unknown provider outcomes require lookup/reconciliation before another attempt.
5. **Verify on the server.** The browser result is evidence to verify, not authority to confirm. Check the signature against the server-stored order, payment identity, expected amount/currency and provider state. An authorised-only result or timeout stays processing until capture is verified. Razorpay's [integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) describes server signature verification and checking capture status.
6. **Confirm atomically.** After verified test capture, record immutable test facts and per-visit allocations, then confirm the entire owned visit set under inventory locks. No owner-acceptance wait is introduced. If the hold expired, reacquire all visits only if policy and availability permit; otherwise create a visible reconciliation/refund obligation. Never overbook to satisfy a late payment event.
7. **Recover and inform.** Lost response, refresh, callback/webhook replay and duplicate click read the persisted outcome. Unknown/processing is not failed, and failed/unverified payment is not confirmed. Show the provider test reference and actual bank-money collection of ₹0.
8. **Cancel and reconcile.** Apply per-visit policy and inventory release exactly once. Reserve any test refund against remaining test captured allocations, call the stored provider outside locks, and reconcile its result. State “test refund” where applicable; no real bank refund was sent. Existing refunds continue after the admin disables new checkout.

## Webhooks, retries and refunds

Verify webhook signatures over the unchanged raw body with the appropriate webhook secret, then deduplicate by provider/environment/event ID. Razorpay documents raw-body signature checks, its event-ID header and out-of-order delivery in [Validate and Test Webhooks](https://razorpay.com/docs/webhooks/validate-test/).

Persist verified events durably before acknowledging them. Processing is retryable, records a safe error/correlation ID and tolerates duplicate/out-of-order events. A later-delivered failure cannot downgrade a verified capture. An admin checkout toggle is not a reason to reject a valid event for an existing attempt. Retain verification material needed for retried older events when rotating secrets.

Use the current financial schema's payment-order serialization, immutable facts, namespace uniqueness and deferred allocation/refund reconciliation. Follow listing/booking-order locks before payment-order locks; retry whole transactions for retryable concurrency failures. No provider calls while holding database locks. Refund caps include reserved/in-flight and successful obligations; retries reuse the original obligation.

## Customer and staff wording

| Situation | Required meaning / example |
| --- | --- |
| Gateway disabled | “Online booking payments are temporarily unavailable. You can still explore spaces and check dates.” |
| Test checkout | “Razorpay Test payment — no real money will be deducted.” CTA: “Continue to test payment.” |
| Awaiting verification | “Test payment processing. We are checking your booking status.” |
| Confirmed after test capture | “Booking confirmed after a verified test payment. No real bank money was collected.” |
| Failed/unverified attempt | “The test payment was not verified. Your booking is not confirmed.” Keep retry/status recovery available as appropriate. |
| Late capture without inventory | “Test payment received; booking needs resolution.” Explain the test refund/reconciliation state, without claiming a reservation. |
| Cancellation with test refund | Show the test refunded amount/status separately from “Actual bank refund: ₹0.” |
| Account methods | Saved methods are not yet available; test methods are selected only within Razorpay's hosted checkout. Never request production credentials in Rentra's own forms. |

The standalone HTML plan's interactive calendar remains a document-only preview. It creates no real or test gateway order and must not pretend that clicking its preview button verified a payment or confirmed inventory.

## Implementation sequencing and acceptance

- **Before Part 04:** adopt this flow and the versioned default-disabled admin/provider configuration boundary. Parts 01–03 and their verification remain historical evidence; their earlier dummy runtime is not the future checkout specification.
- **Part 04:** snapshot gateway configuration plus explicit collection plan in quotes; public browsing/availability stays independent from payment enablement.
- **Part 11:** atomic holds, Razorpay Test adapter/server orders, trusted verification, durable webhook ingestion/processing, expiry and late-capture reconciliation. Existing attempts continue after disable. No customer confirmation from dummy or failed provider fallback.
- **Part 12:** hosted test checkout UX, policy/config acceptance, status/retry recovery and end-to-end callback/webhook races.
- **Part 14:** test-provider partial refunds and cancellation reconciliation, including disabled-gateway continuation.
- **Part 19:** full sandbox release gate, including A17/A18 in Test mode and administrator toggle/security races. Demonstrate zero actual bank-money totals, revenue and payouts despite nonzero test captures/refunds.
- **Parts 20–22:** live commercial readiness, live verification/reconciliation/settlement and live refund/saved-method rollout. Reuse and revalidate the tested adapter instead of deferring core provider correctness to these parts. Live mode remains unavailable beforehand.

Required toggle cases: default/unconfigured is disabled; non-admin cannot change it; enabling supports only configured Razorpay Test; disabling blocks new checkout/attempts but not browsing/quotes; stale quotes detect version changes; existing attempts verify after disable; webhook/refund handling survives disable; provider outage never confirms; unsupported/live settings and browser-forged settings fail; no fallback path; all test financial facts remain isolated from actual-money reporting.

See the full [customer requirements](rentra-customer-plan.html) and [22-part roadmap](rentra-customer-sessions.md) for inventory, identity, customer experience and release gates.
