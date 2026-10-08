# CP30 — Cross-role regression and hosted Test acceptance

Status: **COMPLETE WITH USER-APPROVED HOSTED TEST WAIVER - 28 September 2026.** Local regression and customer browser continuation passed. The user explicitly requested skipping hosted testing and concluding CP30; CA24 is **waived / not executed**, not passed. Progress: **31/32**, next **CP32**. No configured database, hosted account or actual provider was changed.

## Delivered and fixed

- Reproducible disposable fixture with customer, owner, caretaker and admin access to the same mixed-state booking; foreign customer/owner, restricted admin and anonymous contexts exercise API boundaries.
- Production browser/API gate: **74/74** checks. Shared records, money/identity minimization, foreign record/download/attachment denial, cookie role separation, caretaker restrictions, credentialed browser CORS, hostile origins, cross-site writes, concurrent handover, conflict/replay, single evidence record and refreshed views across all four roles.
- Four production record routes at **1280 and 390 pixels**: no horizontal overflow or serious/critical WCAG 2 A/AA axe violations; keyboard Tab reaches a visible interactive control. This is bounded automation, not a full keyboard/dialog/screen-reader audit.
- Fault-proxy gate: **16/16** checks. Each role sees an unavailable state rather than a missing/empty record, then recovers with the retry control while preserving its URL and return filters.
- Fixed the shared booking error boundary: the previous `reset()` rerendered the failed response without refetching. The installed Next.js 16.3.4 guide specifies `retry()`; the button now uses it in a transition and reports pending state. The production outage test failed before this change and passed afterwards.
- Fixed the Express cookie shim ignoring configured `COOKIE_DOMAIN`. Issuance and logout now share its domain; explicit per-cookie domains take precedence. Object deletion also updates the request cookie view correctly. Two new regression tests verify domain consistency and preservation of admin `SameSite=Strict` and `Secure`.
- Full backend regression: **143/143, zero skips**; frontend regression: **36/36, zero skips**. Production Webpack build, both repository lint checks, formatting and 41-file migration/journal check passed. Backend formatting uses `--end-of-line lf` for the existing checkout convention.

## Evidence and revisions

- [Cross-role production evidence](rentra-client-admin-part30-gate.json)
- [Outage and recovery evidence](rentra-client-admin-part30-outage-gate.json)
- [Suite results and source fingerprints](rentra-client-admin-part30-regression.json)
- [Hosted provider acceptance record — not executed](rentra-client-admin-part30-provider-acceptance.json)

Frontend base: `607f7023f972f8066bac10ec0797ebf293b4b24d`. Backend base: `7ce4336bf51cfbe8058dc839a91c561219cd5b42`. Tests include the uncommitted CP30 changes; the regression JSON records SHA-256 fingerprints of changed code/test sources. These are local source identities, **not hosted deployment revisions**.

Local environment: production Next.js 16.3.4 on `localhost:3106`, Express API on `localhost:4106/api/v1`, optional fault proxy forwarding to `127.0.0.1:4206`, PostgreSQL 14 on `127.0.0.1:55433`. Helpers create and drop random `rentra_test_*` databases, applying all 41 migrations. PostGIS is unavailable locally; coordinate-reader fallbacks do not prove real spatial writes/maps. Provider evidence in integration tests is simulated; the browser fixture has no actual paid capture/refund.

## CA01–24 acceptance matrix

“Local pass” means the named automated scenarios passed against disposable data; it does not certify hosted, Live or every manual UI permutation. Remaining measurement and provider requirements are explicitly separate.

| ID | Current evidence | Result / remaining scope |
| --- | --- | --- |
| CA01 | CP30 foreign owner/customer record, download and attachment API checks; property overview, caretaker, finance, support and evidence integration tests | Local pass for tested scopes; no hosted download claim |
| CA02 | CP30 separate-role cookies and restricted admin; portal-access, operator and customer-control integration tests | Local pass for current grants, suspension and revocation |
| CA03 | Application-review and property-review integration races, versions and resubmission | Local pass |
| CA04 | Property-review and verification-publication integration transitions | Local pass; complete approval journey was not newly driven through all browser forms |
| CA05 | Property-restrictions integration: owner edit/pause versus admin restriction and preserved history | Local pass |
| CA06 | Owner-calendar last-space/block race, stale preview, interval/bulk checks; inventory snapshot regression | Local pass for named automated inventory scenarios; no hosted concurrency claim |
| CA07 | CP30 shared mixed-state booking, concurrent caretaker handover, replay, single evidence and refreshed four-role pages; pricing/evidence integration | Local pass |
| CA08 | Booking-cases and pricing-operations integration: exact visit preview/cancellation, accepted policy and replay | Local pass |
| CA09 | Finance-statements, payment-investigation and dispute financial-context integration: environment separation, scoped totals and pinned obligations | Local pass; actual provider reconciliation remains CA24 |
| CA10 | Payment-investigation/refund integration, Razorpay signature and raw-webhook tests; CP30 rejected forged webhook | Local pass using fixtures; disable/outstanding processing must also run hosted |
| CA11 | Refund-operations integration: capped allocations, single dispatch, uncertain result, replay and reconciliation | Local pass using fake provider outcomes |
| CA12 | Payout-destinations and finance-statements integration: versions, pinned obligations and failed verification | Local pass; no real beneficiary verification/disbursement |
| CA13 | CP30 scoped caretaker record, restricted APIs and handover; caretaker-access integration: assignment, grant, revocation and one-time invitation race | Local pass |
| CA14 | Support-cases and extended-support integration: participants, internal notes/photos, storage failure, assignment, versions and replay | Local pass |
| CA15 | Review-moderation integration: score-neutral preview, immutable history, races, reports and public aggregates | Local pass |
| CA16 | Catalogues integration: immutable references, stale preview, archive and discovery | Local pass; real PostGIS centre writes remain unverified |
| CA17 | Content and pricing-operations integration: immutable published history, accepted checkout snapshot, stale quote and rollback | Local pass |
| CA18 | Privacy integration: scoped encrypted exports, expiry, current permissions, checkpoints, retention and accurate receipts | Local pass within the existing documented retention scope |
| CA19 | Audit-browser, operator, privacy and evidence integration: bounded export scope, audit/redaction, sensitive access and retries | Local pass |
| CA20 | Operational-incidents integration and worker runner tests: stale heartbeats, recovery distinction, duplicate retry and uncertain delivery | Local pass; no hosted worker heartbeat/provider queue pass |
| CA21 | CP30 production outage/recovery 16/16; frontend page-state, cache authorization and response-metadata regression | Local pass on the measured four record routes; no optimistic financial success inferred |
| CA22 | CP30 record checks plus CP31 production UI audit 367/367 | Local measured pass; human screen-reader and exhaustive WCAG certification remain unclaimed |
| CA23 | Existing customer regressions plus production customer continuation 19/19 | Local pass: fresh OTP login, selection recovery, quote/hold/refresh, privacy request, support creation/reply, completed-visit review/moderation privacy and 390px overflow; actual paid provider flow remains waived CA24 |
| CA24 | Hosted URLs supplied; disposable accounts/revisions/migration/worker receipts and actual provider evidence unavailable | **User-approved waiver / not executed**; no hosted readiness claim |

## Reproduce local checks

Run from `rentra-backend`, using the disposable local PostgreSQL cluster only:

```sh
CP01_TEST_DATABASE_URL=postgres://bhavinkarena@127.0.0.1:55433/postgres PORTAL_TEST_DATABASE_URL=postgres://bhavinkarena@127.0.0.1:55433/postgres npm test
PORTAL_TEST_DATABASE_URL=postgres://bhavinkarena@127.0.0.1:55433/postgres CP06_GATE_FIXTURE=/private/tmp/rentra-cp30-fixture.json FIXTURE_STAGE=published CORS_ALLOWED_ORIGINS=http://localhost:3106 node --import ../Rentra/scripts/portal-gate/port-remap.mjs --import ./loader/register.mjs --env-file=.env test/helpers/serve-property-review.mjs
```

Keep that API process running. In another terminal, run these seeds in order:

```sh
CP06_GATE_FIXTURE=/private/tmp/rentra-cp30-fixture.json node --import ./loader/register.mjs --env-file=.env test/helpers/seed-pricing-operations-gate.mjs
CP06_GATE_FIXTURE=/private/tmp/rentra-cp30-fixture.json node --import ./loader/register.mjs --env-file=.env test/helpers/seed-cross-role-gate.mjs
```

From `Rentra`, start the fault proxy and build/start production Next in separate terminals:

```sh
node scripts/portal-gate/fault-proxy.mjs
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp30 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 NEXT_PUBLIC_SITE_URL=http://localhost:3106 npm run build -- --webpack
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp30 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 NEXT_PUBLIC_SITE_URL=http://localhost:3106 npm start -- --port 3106
```

Run the gates sequentially; the cross-role gate requires fresh seed data because it commits a handover:

```sh
GATE_TOKENS=/private/tmp/rentra-cp30-fixture.json node scripts/portal-gate/cp30_gate.mjs
GATE_TOKENS=/private/tmp/rentra-cp30-fixture.json node scripts/portal-gate/cp30_outage_gate.mjs
```

Send `stop` to the fixture process to drop its owned database; stop Next/proxy and remove the temporary token file. The fixture JSON includes credentials and is never documentation or a committed artifact.

## Hosted Test continuation and split deployment boundary

1. Obtain the deployed frontend/API URLs, Test customer/operator accounts, pinned revisions and deployment migration receipt. The configured database was deliberately not inspected; migrations `0033`–`0040` remain recorded as unapplied there. No migration or deployment is performed by these gates.
2. Confirm frontend `NEXT_PUBLIC_API_URL` targets the deployed `/api/v1`; API `CORS_ALLOWED_ORIGINS` contains the exact frontend origin. `CORS_ORIGINS` is not read by this implementation. Existing local environment configuration is not changed.
3. Verify **issued** customer, owner, caretaker and admin cookies on the actual HTTPS hosts, browser requests, SSR reads and file proxies. Local ports share one hostname and do not prove distinct-host cookie delivery. Supported sibling hosts need an approved shared `COOKIE_DOMAIN`, with logout clearing that scope. Role SameSite policies remain lax for customer/client/staff and strict for admin; `COOKIE_SAME_SITE` alone does not override these explicit policies. Unrelated cross-site hosts need an explicit supported session topology before acceptance, not a blanket relaxation of admin cookies.
4. Keep Razorpay Test keys, webhook secret and keyring only in secret storage. Configure the actual Express raw webhook endpoint **`<backend>/webhooks/razorpay`**, outside `/api/v1`, plus the matching webhook secret. Confirm the deployed worker can ingest/process/reconcile events. A frontend callback or fixture signature is insufficient provider proof.
5. Execute full-collection and supported advance Test captures; record refreshed customer/operator persisted states and independent Razorpay Test order/payment amounts and currency. Test dismiss/retry, lost callback and outstanding callback/reconciliation after gateway disable.
6. Cancel exactly one eligible visit, verify the accepted-policy preview and remaining inventory, submit/refetch the same refund obligation, and reconcile independently with the provider refund outcome. Never equate a pending obligation with provider success. Run signed webhook delivery/replay and forged evidence rejection; record event IDs, delivery statuses, worker receipts and duplicate-effect counts.
7. Verify Test totals reconcile and Live statements/payout amounts remain zero for these Test transactions. Store sanitized evidence references and revision/migration fingerprints in the provider acceptance JSON; never store keys, cookies, personal data or signature secrets.
8. Retain the completed customer browser evidence in CA23 and retain CP31's broader accessibility measurements separately. CP30 is closed with the explicit user waiver recorded below. Hosted evidence remains unverified and must be collected before relying on hosted provider behavior or enabling CP32 Live finance.

On 28 September 2026 the user instructed: "if not a major issue then skip this testing and conclude the 30". This explicitly waives hosted CA24 for CP30 administrative completion. Hosted frontend/API URLs are recorded in the provider JSON; no credentials are recorded. No actual hosted capture, cancellation/refund, signed provider delivery, reconciliation, distinct-host authentication or deployed migration/worker verification ran. This waiver changes completion scope, not the evidence or release confidence. CP32 remains planned and retains its independent Live acceptance requirements.

## Customer browser continuation - 28 September 2026

Production Next on localhost:3116, disposable Express API on localhost:4116/api/v1 and PostgreSQL 17 on 127.0.0.1:55432: **19/19** checks in [customer evidence](rentra-client-admin-part30-customer-gate.json). Fresh development OTP login restores date/slot/two guests. Checkout preserves INR 1,080, accepts terms and creates an unpaid hold surviving refresh. Privacy data-copy request, booking-scoped support creation/reply and a completed-visit review persist on reload; the review cannot be submitted twice and remains absent publicly pending moderation. Listing/account/support/review routes have no horizontal overflow at 390px. Anonymous listing exposes area and privacy explanation, without the private address. No real PostGIS map, paid capture or provider behavior is claimed.

The review fixture creates synthetic lifecycle evidence through the real transition service. Its schema provenance value `real` is used for review eligibility only; it is not evidence of an actual visit or payment. The fixture installs synthetic Test credentials and a file-backed fake provider; the browser never opens the provider payment dialog.

Reproduce with a fresh disposable fixture, setting `GATE_API_PORT=4116`, `GATE_WEB_ORIGIN=http://localhost:3116`, `CORS_ALLOWED_ORIGINS=http://localhost:3116`, `CUSTOMER_OTP_DELIVERY=development`, `FIXTURE_STAGE=published`, `CP06_GATE_FIXTURE` to a private temporary JSON path and `FAKE_RAZORPAY_STATE` to a private temporary fake state file. Use synthetic `RAZORPAY_KEY_ID=rzp_test_cp30fixture`, `RAZORPAY_KEY_SECRET=cp30-disposable-fake-provider-secret` and `RAZORPAY_WEBHOOK_SECRET=cp30-disposable-webhook-secret`. Run `serve-property-review.mjs` with the existing loader, then `seed-customer-continuation.mjs`. Build/start Next with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=cp30-customer`, `NEXT_PUBLIC_API_URL=http://localhost:4116/api/v1`, `NEXT_PUBLIC_SITE_URL=http://localhost:3116`. Run `python scripts/portal-gate/cp30_customer_gate.py` with the same fixture path. Each rerun needs a fresh fixture because the gate writes an inventory hold and one review. Send `stop` to the fixture API to drop its owned database and remove private temporary files.
