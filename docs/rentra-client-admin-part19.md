# CP19 — Payment investigation console

Status: **COMPLETE — 27 September 2026.** The database, browser/API and failure-path gates passed (evidence below). Baseline: frontend `b8c13b6`, backend `4c3ad7a`; CP19 changes are uncommitted. **No migration**: there are no schema changes, and 33 migrations remain applied on the configured database.

Linked IDs: CP19; CA09, CA10, CA19, CA21; G18.

## Delivered

- **`/admin/finance/payments`** — a payment investigation list, separate from `/admin/payments` (gateway settings, which keeps its bookmark). It appears in admin navigation under Finance → Payments, and each booking's payments tab links to it with **Investigate payment**.
  - Environment tabs: **Test** (default), **Simulated**, **Live**, **All**. There is one totals card per environment: expected, captured · verified, refunded · verified, refunds pending, needs review, and actual bank money. Test, simulated and live money are **never added together**; the All tab shows separate cards.
  - Filters: needs review, state, booking reference / payment id / provider order or payment id, and India-date range. Pagination is 25 per page. Unknown filter values fall back safely, and an empty result says so instead of looking like an outage. The totals area shows its as-of time.
- **`/admin/finance/payments/[id]`** — the payment detail page:
  - Money section with verified facts only.
  - Attempts.
  - Verified transactions, each with its visit/component allocations.
  - Refunds with their allocations and execution state (read-only; refund operations are CP20).
  - Signed provider events (type, state, attempts, failure code, times).
  - Booking payment history and reconciliation history.
  - Links to the booking, its Cases tab (to open a CP14 case), the customer and the property.
  - The reconciliation panel shows execution state, next check, the pinned gateway config version and the **masked** key id (`rzp_test_…1234`). When new attempts are paused it says so: "New payment attempts are paused. This existing payment is still reconciled."
- **One safe command: Re-fetch from provider.**
  - Asks Razorpay Test for its own record and settles only what the provider verifies, through the existing `reconcilePayment` and settlement engine: the adapter re-fetch, `assertPayment`, deduplication by provider payment id, and allocation.
  - Offered only for an unresolved Test/real payment with a dispatched or linked execution. It is never offered for simulated, legacy, settled or never-started payments.
  - Every call is written to `audit_log`. The same request key returns the recorded result without calling the provider again.
  - An outcome that is still unconfirmed is recorded as **unresolved** (`NO_PROVIDER_OUTCOME` or the provider error code) and stays visibly pending; nothing is marked paid.
  - A persistent "Last re-fetch" receipt comes from the audit record.
  - There is **no manual paid toggle** and no amount editing anywhere.

### Webhook fix (CP12 follow-up, now closed)

`ingestRazorpayEvent` wrote `redacted_payload` as `${JSON.stringify(...)}::jsonb`, which postgres.js stores as a JSON *string*. `payment_event_valid_chk` requires `jsonb_typeof(redacted_payload)='object'`, so **every signed webhook insert failed the check** and no Razorpay event was ever stored. (CP12 recorded this as a silent no-op; it was actually a storage failure.) The write now uses `::text::jsonb`.

The integration test proves:

- A signed `payment.captured` event is stored as an object and settles through the provider re-fetch.
- A signed event whose provider record disagrees (amount mismatch) is marked `failed / PROVIDER_PAYMENT_MISMATCH` and cannot mark the payment paid.

Because the check rejected every string row, no legacy string rows can exist, so nothing needs migrating.

The gateway-change audit in `gateway-settings.js` had the same pattern and is fixed too. The remaining double-encoded writes (`inventory.js`, `customer/account.js`, `customer/saved.js`) are outside the payments domain and still open.

## How totals stay correct

The read model aggregates **per payment order first**, using lateral sums over that order's own attempts, transactions and refunds. Only then does it filter and total, `GROUP BY environment`. Joins therefore cannot multiply money.

- **Captured** counts only `capture / succeeded / verified_at IS NOT NULL` transactions.
- **Refunded** counts only `succeeded` refunds.
- **Pending** counts `requested / processing / unknown` refunds.
- **Simulated** money appears only under the simulated environment and as "no money moved".
- **Actual bank money** is ₹0 outside live.

**Needs review** means any of:

- a refund whose outcome is unknown or whose execution failed
- a failed provider event
- an attempt in an unknown state
- an execution that is unresolved or has a failure code while the payment is not settled

## API contract

The routes live under the admin `/payments` domain, so `GET` needs `admin.payments.read` and `POST` needs `admin.payments.write`. A records-only admin gets 403, and owners, customers and anonymous callers get 401.

| Method and path | Input | Result |
| --- | --- | --- |
| `GET /admin/payments/orders` | `environment` (`test`, `simulated`, `live` or `all`), `state`, `attention`, `q`, `from`, `to`, `page` | `{ items, totals[] (one per environment), total, page, pages, asOf, ...filters }` |
| `GET /admin/payments/orders/:id` | — | Detail as above; 404 when missing |
| `POST /admin/payments/orders/reconcile` | `id, requestKey` | `{ message, outcome: checked \| unresolved, code, stateBefore, stateAfter, bookingStateAfter, replayed }`; 409 `NOTHING_TO_RECONCILE` when there is nothing unresolved |

No field carries a credential secret, full key id, execution snapshot, request hash, idempotency key or raw provider payload. Transaction evidence shows only a truncated hash.

## Verification — 27 September 2026

All runtime checks used disposable databases on a local PostgreSQL 14 server and a fake Razorpay transport. That transport is honoured only when `NODE_ENV=test`, through `globalThis.__rentraPaymentFetcher` or a direct test option. Neither the configured database nor the Razorpay network was touched.

| Check | Result |
| --- | --- |
| Backend full suite (both disposable-DB variables) | **116/116 passed**, including CP19 unit and integration tests |
| Unit `test/services/payment-investigation.test.js` | 3/3: key masking; re-fetch offered only for unresolved Test/real payments; simulated, legacy, settled and closed labels; attention flags |
| Integration `test/integration/payment-investigation.integration.test.js` | **Passed**. Evidence listed below. |
| Browser/API gate `scripts/portal-gate/cp19_gate.mjs` | **34/34 passed, `completed: true`** ([results](rentra-client-admin-part19-gate.json)) |
| Outage and failure-path gate `scripts/portal-gate/cp19_outage_gate.mjs` | **9/9 passed** ([results](rentra-client-admin-part19-outage-gate.json)) |
| CP14 / CP17 gates re-run as regression | 34/34 / 39/39 (`completed: true`) |
| Frontend tests / ESLint / Prettier / isolated `next build --webpack` | 23/23; passed; passed; passed |
| Backend ESLint / Prettier / `db:check` (33 files) / drizzle drift; `git diff --check` in both repositories | Passed; no schema changes |

**Integration test evidence:**

- **A** — a paid two-visit order after a customer cancellation of one visit.
- **B** — captured at the provider but unheard. The admin re-fetch settles it and confirms the booking. A replay with the same key makes no provider call, a second key is refused, and there is exactly one capture.
- **B2** — the provider has no payment: unresolved, `NO_PROVIDER_OUTCOME`, still processing.
- **C** — a signed webhook stored as an object and settled by the event worker.
- **D** — a signed webhook with a mismatched provider amount: event failed and payment not captured. After the **gateway is disabled**, a new checkout is refused with `PAYMENTS_DISABLED`, yet the re-fetch still settles D.
- **F** — a simulated order.
- **Totals:** the Test totals (count, expected, captured, refunds pending) equal independent ledger sums, with simulated 0. The All view gives separate simulated and test totals; the simulated card shows simulated 54,000 paise with captured and refunded 0.
- **Detail:** allocations equal the verified capture; the pending refund has its visit allocation; the masked key shows; no secret, key id, snapshot, hash or idempotency key appears.
- **Access and edge cases:** searches, pagination clamp, owner and inactive-admin denial, 404, simulated re-fetch refused, and 3 audit rows.

**Browser gate (34):**

- Anonymous, owner and records-only-admin denial.
- Default Test view with a single total; Test totals equal the sum of their rows; simulated absent from Test; the All view separates environments; unknown filters fall back.
- The list shows verified totals and ₹0 actual bank money; the All tab has one card per environment; Needs review lists only unresolved payments; provider-order search finds one; the empty view says so. At 390px: no overflow and no serious or critical axe violations, and the keyboard focuses payment links.
- Paid detail: allocations equal the capture, the pending refund is linked, no secrets, and no re-fetch is offered.
- A signed webhook is stored and a forged one gets 400. A received callback alone does not mark paid.
- A records-only admin cannot re-fetch. The paused-gateway notice shows, the event appears in the timeline, and the re-fetch button takes keyboard focus. The detail page at 390px is axe clean.
- **Re-fetch** records the verified capture and confirms the booking. A second re-fetch is refused with no second capture, and history shows who re-fetched and the result.
- An unknown-outcome payment shows the honest pending message.
- The booking payments tab links to the investigation. Revocation blocks the next read.

**Failure paths (9):**

- A payments-API outage on list and detail shows the retryable state, keeps filters, and **Try again** recovers in place.
- A re-fetch during an outage records nothing and says a retry is safe.
- A **lost response after the request committed** is recorded once. The retry with the same form replays, so there is still one audited re-fetch and the payment is still pending.
- With the whole API down, list and detail are retryable with no false empty state or login redirect.

### Found and fixed by execution

- The webhook storage failure described above.
- After a successful re-fetch, the form disappeared along with its success message because the payment no longer needs one. The detail page now shows a persistent receipt from the audit record.
- A re-fetch that raised no error but left the payment unconfirmed was labelled "checked". It is now "unresolved", with `NO_PROVIDER_OUTCOME`.

## Remaining limits and next step

- **Refund operations** (request, retry or reconcile a refund) are CP20. Refunds are read-only here.
- **Exports** are CP28: no CSV export is offered.
- **No live adapter:** live payments cannot exist yet, and the Live tab shows an honest empty state.
- **Webhooks:** there is no admin "reprocess event" control. Failed events retry through the existing job, and the re-fetch settles independently of events.
- **Hash drift:** the configured database's migration hash drift (`0009`, `0024`, `0026`, `0029`) was **not** reviewed in this part; it needs permission to query that database read-only. CP19 adds no migration and relies only on behavior proven in disposable databases.
- **Other double-encoded writes:** the remaining ones listed above are still open outside payments.
- No hosted Razorpay Test run (CA24 belongs to CP30) and no human screen-reader pass.

**Re-run the gates:**

1. Disposable PostgreSQL on `:55432`; backend `npm test` with both variables.
2. Export the same `FAKE_RAZORPAY_STATE` and `RAZORPAY_TEST_KEY_ID`/`KEY_SECRET`/`WEBHOOK_SECRET` for both the fixture API and the seeds.
3. Start `serve-property-review.mjs` (`FIXTURE_STAGE=published`), then run `seed-pricing-operations-gate.mjs` and `seed-payment-investigation-gate.mjs`.
4. Start isolated Next on `:3106` with `--webpack`.
5. `GATE_TOKENS=<json> GATE_WEBHOOK_SECRET=<webhook secret> GATE_KEY_ID=<key id> node scripts/portal-gate/cp19_gate.mjs`.
6. Outage: start the fixture with `--import <frontend>/scripts/portal-gate/port-remap.mjs` plus `scripts/portal-gate/fault-proxy.mjs`, run `cp19_outage_gate.mjs partial`, stop both, then run `cp19_outage_gate.mjs full`.

Next part: **CP20 — Refund operations** (depends on CP14 and CP19, both complete).
