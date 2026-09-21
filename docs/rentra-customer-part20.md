# Part 20 — Live policies and provider readiness

Status: **IN PROGRESS — 21 September 2026.** This part is a live-readiness review, not a payment implementation. Parts 01–19 are the completed count; live mode remains unavailable.

Two things block completion, and neither is a code defect:

1. **Commercial decisions are unanswered.** The live collection schedule, tax treatment, deposit handling, cancellation/refund schedule and supported payment methods are business decisions. They are listed in [Decisions required](#decisions-required) and nothing below assumes an answer.
2. **Part 19's hosted Razorpay Test acceptance was never executed.** It is carried into this part. See [the hosted Test acceptance record](rentra-customer-part19-provider-acceptance.md). Live enablement is not permissible until every row there is observed on a reachable deployment.

## Credential and environment isolation review — passed

This is the part of Part 20's verification that can be performed without commercial answers. It was read from the code on 21 September 2026 and is a source review plus a configured-database inspection, not a new test run.

- **Live is structurally unreachable.** `lib/payments/provider-registry.js` registers one provider, `razorpay`, with `environments: ['test']`. `registeredPaymentProvider` throws `UNSUPPORTED_GATEWAY` for any other pair, and every execution path calls it.
- **Admin input cannot select live.** The change schema in `lib/payments/gateway-settings.js` pins `environment: z.literal('test')`. Database migration `0010` independently enforces `payment_gateway_config_valid_chk`, requiring `environment = 'test'`. Migration `0015` re-checks provider and environment inside the checkout trigger, including the pinned snapshot.
- **No live credential fallback exists.** `lib/payments/provider-credentials.js` reads only `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET` and `RAZORPAY_TEST_WEBHOOK_SECRET`, and requires the key id to match `^rzp_test_`. Generic or live variable names are never consulted, and no dummy fallback exists.
- **Installed capabilities are explicit.** `PAYMENT_RUNTIME` in `lib/payments/config.js` records `realPaymentsEnabled: false` and `savedMethodsEnabled: false`. `customerPaymentMethods` returns an empty list under that flag and otherwise throws; saved tokens remain Part 22 work.
- **No raw instrument data is stored.** A repository search for PAN, CVV, UPI PIN, card or bank account fields across `lib`, `app` and `worker` returns only the schema comment forbidding them. The stored provider reference is an encrypted application-side identifier.
- **Configured database holds no payment facts at all.** `payment_order`, `payment_attempt`, `customer_payment_method` and `captured_payment_allocation` are empty, and `payment_gateway_config` has no row. Actual live revenue and payout are therefore zero by construction, and no test record exists that could later be mistaken for live money.

**Limitation:** this is a review of the current source and the configured database. It does not re-run A17/A18 against final provider settings, because those settings do not exist yet.

## What a live rollout would have to change

Recorded so that the blast radius is explicit before any commercial decision is made. **None of these changes have been made, and none may be made until the gates in Parts 21–22 pass.**

| Location | Change required | Guarded by |
| --- | --- | --- |
| `lib/payments/provider-registry.js` | Add `live` to the adapter's `environments` | Code review; the registry is the single allowlist |
| `lib/payments/gateway-settings.js` | Relax `z.literal('test')` on the change schema | Part 22's separate live enablement, not the Test toggle |
| `drizzle/` | New migration relaxing `payment_gateway_config_valid_chk` and the `0015` checkout trigger | Migration review; existing SQL through 0020 stays unchanged |
| `lib/payments/provider-credentials.js` | Add a reviewed live credential loader with distinct variable names | Must not share names with the Test loader |
| `lib/payments/config.js` | `realPaymentsEnabled` / `savedMethodsEnabled` | Parts 21 and 22 respectively |

The Part 11/12 adapter itself is reused, not rewritten. Any additional provider enters through the same registry and credential-loader contracts.

<h2 id="decisions-required">Decisions required</h2>

Nothing in this part can be completed until these are answered by the business. Each answer becomes a versioned policy, not a constant in code.

- **Collection schedule:** full collection at booking, or advance plus balance? If advance, what percentage or fixed amount, and when is the balance due?
- **Tax:** is GST charged, at what rate, on which components (rent, fees, deposit), and is the quoted price inclusive or exclusive? Is a GSTIN registered?
- **Deposit:** collected as part of the payment, held separately, or collected off-platform at the property? If collected, when and how is it returned?
- **Cancellation and refund schedule:** the cutoffs and refund percentages for live money, and who absorbs the provider fee on a refund.
- **Supported methods:** which of cards, UPI, net banking and wallets are enabled live, and are saved methods offered at all (Part 22).
- **Operational responsibility:** who holds the live Razorpay merchant account, who is accountable for settlement reconciliation and chargebacks, and what the refund turnaround commitment to customers is.
- **Rollout control:** whether live opens to all listings at once or a limited set first.

## Provider readiness prerequisites

Separate from the decisions above, and none are satisfied today:

- A live Razorpay merchant account with completed KYC and activated settlement to a verified bank account.
- Live API credentials and a live webhook secret, stored only in deployment secrets and never in the repository or `.env.local`.
- A reachable non-localhost deployment with a live webhook endpoint, distinct from the Test webhook.
- Merchant settings reviewed: supported methods, capture behaviour, refund speed, settlement cycle and fee structure.
- The carried-forward Part 19 hosted Test acceptance passed first, on the same deployment topology.

## Gate

Live commercial and provider prerequisites are explicit and answered; sandbox verification remains green; A17/A18 re-run against the final provider settings and approved live policy calculations. A browser response alone never marks a payment paid, and PAN, CVV, UPI PIN and bank credentials are never stored. Live enablement stays unavailable until Parts 21 and 22 also pass.

## Evidence recorded so far

- Credential and environment isolation review passed by source inspection and configured-database inspection, 21 September 2026 (details above). No code was changed by this review.
- No commercial decision has been answered, no live credential exists, no merchant settings were reviewed and no A17/A18 re-run against final settings has occurred.
- No provider payment, external message, gateway enablement, migration or deployment was performed by this part.
