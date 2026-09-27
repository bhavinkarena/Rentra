# CP20 — Refund operations queue and detail

Status: **COMPLETE — 27 September 2026.** A disposable-PostgreSQL integration test using the real checkout, cancellation, webhook and refund services with a fake Razorpay transport, two unit tests and a 42-check browser/API gate passed. **No migration**: the configured database is at 33 of 33 recorded migrations (read-only check).

## 1. Scope and revisions

- Linked IDs: CP20; acceptance CA08–11, CA19; gap G19.
- Baseline: frontend `9bd1e15`, backend `3092c5f` (CP17–CP19 committed). CP20 changes are uncommitted in both repositories.
- Delivered:
  - **`/admin/finance/refunds`**, a refund queue:
    - environment tabs (Test, Simulated, Live, All);
    - status chips: needs attention, queued, processing, uncertain, failed at provider, refunded;
    - source filter (customer cancellation, booking case, late capture, operator refund) and search by refund or booking reference or `rfnd_` id;
    - one totals card per environment (requested, refunded · verified, pending or uncertain, actual bank money), never summed across environments.
  - **`/admin/finance/refunds/[id]`**, a refund detail page:
    - what the state means and the recovery path;
    - requested vs verified amounts, provider refund id and original capture;
    - per-visit/component allocations against their captures;
    - origin (customer cancellation, CP14 case with a link, operator refund with actor and reason, or late capture);
    - signed provider events and execution state (sent, next automatic check, last provider problem);
    - operator-action history and other refunds on the same payment;
    - links to the payment, booking and case.
  - **Operator refund, preview then request** (`/admin/finance/refunds/new?order=…`, linked from the payment's Refunds section as **Request a refund**):
    - choose a visit and amounts per component;
    - the preview shows captured · verified, refunded · verified, pending and remaining per component, and blocks over-cap or non-Test requests;
    - the request is accepted only for that preview's hash and records one obligation per captured transaction.
  - **One guarded command per obligation.** **Send to provider now** is offered for a queued obligation; **Check with provider** for processing, uncertain and failed ones. It goes through the existing single-dispatch engine (`reconcileRefund`): a refund is POSTed to Razorpay **at most once**, and every later call only looks it up. The command is request-keyed and audited.
- **Never:** a manual "refunded" toggle, amount editing, a second provider refund for an uncertain or failed first one, or live refunds (live stays outside this Test console, CP30).

## 2. API and behavior

### Endpoints (`/api/v1`, `admin.payments.*`)

| Method and path | Input | Result / errors |
| --- | --- | --- |
| `GET /admin/payments/refunds` | `environment`, `status`, `source`, `q`, `page` | `{ items[], totals[] per environment, page, pages, total, asOf }` |
| `GET /admin/payments/refunds/:id` | — | Detail as above. 404 when missing; 400 for a malformed id |
| `GET /admin/payments/refunds/order/:orderId` | — | The order's visits with captured and remaining refundable amounts, and whether the payment is Test-only |
| `POST /admin/payments/refunds/preview` | `orderId`, `visitId`, `rent`, `fee`, `deposit` (paise) | `{ preview: { visit, components[], refundMinor, obligations, blocked, hash } }`. Writes nothing |
| `POST /admin/payments/refunds/request` | Preview fields + `reason` (10–120), `hash`, `requestKey` | `{ refundIds, refundMinor }`. 409 `PREVIEW_CHANGED` when the amounts changed (including a concurrent request that used the funds first); 409 `IDEMPOTENCY_CONFLICT` for a reused key with a different payload; replaying the same key returns the same ids; 422 `REFUND_BLOCKED` or field errors |
| `POST /admin/payments/refunds/reconcile` | `id`, `requestKey` | `{ command, outcome (refunded, pending or unresolved), code, stateBefore, stateAfter }`. 409 `NOTHING_TO_RECONCILE` (refunded, simulated or live); the same key replays the recorded result without calling the provider |

### Rules

- **Status keys** (`refundStatus`, pure and unit-tested) drive badges, filters, totals and commands. The SQL filter uses the same rules.

  | Key | Meaning | Command |
  | --- | --- | --- |
  | `queued` | Not sent yet | send |
  | `processing` | The provider accepted it | check |
  | `uncertain` | Outcome unknown, for example a lost response | check |
  | `provider_failed` | The provider reports failure; funds stay reserved and it is never resent | check |
  | `refunded` | Provider-verified | — |
  | `unsupported` | Live or non-Razorpay-Test | — |
  | `simulated` | No money moved | — |

- **Caps:**
  - An operator refund is split per component over the visit's verified captures (`allocateAdditionalRefund`), never past what earlier refunds reserved, whether pending, uncertain or refunded.
  - The request re-plans under the same listing lock that customer cancellations, booking cases and late-capture refunds take. Two concurrent requests for the remaining funds give one success and one `PREVIEW_CHANGED`.
- **Single dispatch:**
  - The engine claims dispatch once (`refund_execution.dispatched_at`).
  - A timeout after the provider accepted the refund leaves the obligation **uncertain**; the next check finds the provider's refund by receipt and moves it to processing.
  - Repeated or concurrent commands never POST again.
- **Callbacks:** duplicate signed `refund.*` webhooks with the same event id are stored once; different ids are stored separately. They reconcile lookup-only, so a refund is marked refunded once, with one `refund_<id>` lifecycle event.
- **Customer-visible effects** are unchanged. The customer booking record already shows refund state from the obligations, and its notification comes from the existing lifecycle event on verified success.
- **Disabled gateway:** new payment attempts are blocked; existing refund obligations still send and reconcile.

### Fixes made during CP20

- **CP17 support attachments were prefetched.** Private support photos were linked with a prefetching Next `<Link>`, so viewport prefetch requested the audited attachment route without a click. That recorded views nobody made (CA19), and the pending requests kept the page from ever going network-idle, which is how the CP17 gate timed out on this machine. Both the owner/customer and admin threads now use plain links that open in a new tab, like the CP13 evidence photos. The CP17 gate now passes 39/39.
- **The CP02 gate's drawer focus check** now asserts that Tab never reaches content behind the modal. A native `<dialog>` passes focus to the browser chrome once per cycle, and CP17's extra "Support" nav item had moved that slot onto the 25th Tab. This is a gate change, not a product change.
- `test/helpers/fake-razorpay.mjs` gains refund routes: create (optionally with the response dropped), look up by id, and list by payment. Gates drive refund status by editing its state file.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 120/120, including `test/integration/refund-operations.integration.test.js`, `test/services/refund-status.test.js` and the refund capability test |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (33 migrations; no drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 23/23; 0 errors (4 existing OG-image warnings); pass; pass |
| CP20 gate `scripts/portal-gate/cp20_gate.py` (published fixture with `FAKE_RAZORPAY_STATE` and `RAZORPAY_TEST_*`, then `seed-pricing-operations-gate.mjs` and `seed-payment-investigation-gate.mjs`; API :4106, frontend :3106) | **42/42**, three runs, the last on the final build — [results](rentra-client-admin-part20-gate.json) |
| Regression gates on this build | CP19 34/34 · CP18 34/34 · CP17 39/39 (after the attachment fix) · CP16 51/51 · CP15 38/38 · CP14 34/34 · CP13 31/31 · CP11/12 44/44 · CP10 37/37 · CP09 41/41 · CP08 56/56 · CP07 53/53 · CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

The `.mjs` gates were replayed with a scratchpad `playwright-core`, and their rewritten result files were restored. Outage and fault-proxy gates were not re-run.

Integration test scenarios:

- **Queue and detail:** a paid two-visit order where the customer cancels one visit gives a queued `customer_cancellation` obligation with Test-only totals. A non-admin gets `OPERATOR_REQUIRED`.
- **Operator refund:**
  - The preview blocks one paisa over the remaining amount.
  - Two concurrent requests for the full remaining rent give one success and one `PREVIEW_CHANGED`. Nothing remains afterwards, and reservations never exceed the captured rent.
  - A fee refund replays by key; a reused key with a different payload gets `IDEMPOTENCY_CONFLICT`; the origin is `operator`.
- **Lost response:** the provider accepts the POST but the response is lost, giving `unresolved` and `uncertain`. The next check finds it as `pending`, and the provider received exactly one POST.
- **Repeated commands:** the same key replays; three concurrent commands still give one POST.
- **Duplicate callbacks:** the same event id is deduplicated, and a second id is stored. Processing leaves one `refunded` with the verified amount and one lifecycle event; a further command gets `NOTHING_TO_RECONCILE`.
- **Provider failure:** gives `provider_failed` with a check command, still one POST, and no fee left to refund twice.
- **Filters and totals:** attention and refunded filters and the source filter match the status keys; the totals have one Test environment with the verified amount.

Gate scenarios:

- **Permissions:** an owner cookie gets 401; a records-only operator gets 403 on the list, preview, request and reconcile; a malformed id gets 400.
- **Queue and detail:** the queue shows the queued customer-cancellation refund with Test-only totals. Queue and detail at 1280 and 390px have no overflow and are axe clean, and the queued explanation is shown.
- **Lost response:** **Send to provider now** is clicked with the provider response dropped; it reads **Uncertain**, and the provider has one POST. **Check with provider** then shows **Processing at provider** with no resend.
- **Repeated commands:** a repeated command replays, and three concurrent commands give no resend.
- **Provider processed:** the check shows **Refunded · verified** with the verified amount, and no command remains.
- **Callbacks:** three signed callbacks (two share an id) are accepted, two are stored, and the verified refund is unchanged.
- **Operator refund through the UI:**
  - From the payment page, **Request a refund**. The over-cap preview is blocked with no request button; ₹500 previews and is requested with a reason.
  - It is recorded as one queued ₹500 obligation.
- **Concurrency and replay:** concurrent API requests for the remaining rent give 200 and 409, with none remaining. A replay returns the same obligation; a reused key for a different refund gets 409.
- **Provider failure:** labelled "failed at provider" with ₹0 verified and one POST; the page explains that no second refund is sent; the fee cannot be refunded again; the attention filter lists it.
- **Disabled gateway:** new payments are disabled while the existing refund was reconciled.

## 4. Migration, configuration and deployment

No migration, configuration or secrets. The configured database has 33 of 33 migrations recorded (read-only check, 27 September 2026). Not deployed.

## 5. Limitations and next step

- Test environment only. A hosted Razorpay Test refund and live refunds remain CP30.
- There is no escalation queue beyond the "needs attention" filter. A provider-failed refund is resolved with Razorpay; the provider's record then settles it on the next check.
- An operator refund covers one visit per request. A multi-visit goodwill refund means one request per visit.
- The fixture API runs no cron, so the gate settles callbacks through the check command; the integration test covers event processing.
- **Hash drift:** the configured database's recorded hashes for `0009`, `0024`, `0026` and `0029` were **not** reviewed in this part; that needs permission to query the database read-only. The refund schema CP20 relies on was proven only in disposable databases built from the current migration files. Only the migration count was checked (33 of 33 recorded).
- **Next:** CP21 — versioned payout destinations.
