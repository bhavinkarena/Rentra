# CP11 — Versioned pricing and supported booking policy

Status: **COMPLETE — 26 September 2026.** Database, browser/API and outage gates passed (evidence below). Baseline frontend `a1348db`, backend `9601911`; changes are uncommitted. No migration or configured-database change; all runtime verification used a disposable local PostgreSQL 14 server.

## Implemented scope

CP11; CA06, CA17, CA23; G24's supported property-policy controls.

- Existing property pricing and terms forms, including the setup wizard, now preview before confirmation. Input is preserved; editing invalidates the displayed preview. Successful confirmation returns a content version and effective booking-configuration version.
- Server-side typed validation, ownership checks, active-client checks, content-version checks and signed exact-value previews. The route property id is authoritative. Pricing and terms commands share the existing inventory transaction lock with quoting and booking.
- Atomic before/after audit history for property base rates and cancellation/deposit-estimate changes. Schedule and date-override audit entries now carry their effective version. The editor shows the latest 30 safe pricing/policy history entries with India-local timestamps and recorded values, without actor identities.
- Existing schedule controls now also use CP10's preview/confirmation contract. Hours, buffers, guest limits, extra-guest charges, lead time and booking horizon still use their existing typed validation and inventory-readiness checks.
- New quotes snapshot cancellation bands, no-show rate, fee-refund rule and pricing constants in addition to the existing policy/configuration versions, tier and house rules. Existing checkout persists that snapshot on the order and visits. Cancellation reads stored bands when present; existing `customer-v1` bookings without bands use the unchanged legacy tier rules.
- Removed the nonfunctional extra-hour price input (the service rejects nonzero extra-hour billing). Replaced the invented deposit-percentage guidance and unconditional refund promise with the existing separate-estimate boundary.

## Supported controls and classification

| Values | Classification / treatment |
| --- | --- |
| Property weekday/weekend slot rates, extra-guest charge | Existing owner business controls; now previewed, versioned and audited. Prices are integer rupees at the legacy storage boundary; customer calculations use integer paise. |
| Exact-date slot override | Existing owner control; CP10 preview and concurrency protection retained, effective version included in receipt/history. |
| Cancellation tier | Existing supported choices: flexible, moderate, strict. Selection can change for future quotes; accepted snapshots remain unchanged. No new cancellation ladder was invented. |
| Separate deposit estimate | Existing display input retained. Does not activate collection, create a collected balance or select the unresolved live deposit policy. |
| Slot hours, buffers, capacities, included guests, extra-guest charge, lead time, booking horizon | Existing bounded owner controls; schedule preview added, configuration version and readiness checks retained. |
| `platformFeeBps=800`, `illustrativeAdvanceBps=2500`, cancellation bands | Existing `customer-v1` Test/illustrative constants, recorded in new accepted snapshots. No new editable platform rate, live commission, tax or settlement promise. |
| Provider enablement / Test full-or-advance choice | Existing separately versioned gateway configuration; unchanged here. New provider adapters and live activation remain outside CP11. |
| Currency INR, Asia/Kolkata time zone, slot enum, max 10 visits, quote/hold expiry, request/upload limits, file-type checks, integer limits, idempotency and inventory constraints | Technical/security boundaries; not exposed as freely editable business settings. |
| Search intents/category labels | Editorial/reference taxonomy; managed in CP24/CP25, not converted into pricing settings here. |
| Accepted identity document types and required sides | Reviewed document policy; changes need their own effective policy review. No unrestricted document-type editor. |
| Live tax, commission, deposit custody/collection, payout and settlement timing | Still unanswered in customer Part 20. Not selected or activated. |

### Precedence and effective behavior

1. The explicitly configured slot must be enabled and have a property base rate.
2. India-local visit-start date chooses weekday or weekend rent.
3. Legacy date override, if any, replaces that base rent.
4. Modern explicit date-and-slot override takes precedence over the legacy override. Full-day overrides are independent; day/night overrides are not added together.
5. Extra guests use the slot's included-guest count and extra-guest charge. Existing Test/illustrative platform fee calculations follow on the resulting rent; the deposit estimate remains separate.
6. Changes take effect immediately after confirmation for new quotes. There is no scheduled future publication control. Checkout revalidates stored quotes against current immutable inputs/hash and rejects changed terms with `QUOTE_CHANGED`; existing accepted order/visit snapshots are not rewritten.

Adding the snapshot fields deliberately changes quote hashes: pre-deployment unaccepted quotes must be refreshed. Do not relabel held or confirmed bookings. The payment confirmation engine is unchanged.

## API contract

`POST /api/v1/partner/listings/:id/pricing` and `/terms` keep the current form fields and require `contentVersion` plus `mode=preview`. The response contains `preview.token`, before/after values and the effect statement. Submit identical values with `mode=apply` and `previewToken` to commit.

- 422: invalid typed values or unsupported extra-hour billing.
- 404: missing/foreign property.
- 409 `LISTING_CHANGED`: stale content version.
- 409 `PREVIEW_REQUIRED`: absent, changed or invalid signed preview.
- Success: `ok`, `contentVersion`, `effectiveVersion`; writes and audit commit together.

`GET /partner/listings/:id` adds `listing.policyHistory` (safe fields only). Schedule requests now require CP10's `expectedCalendarVersion`, `mode` and preview token as well as the existing `expectedVersion`.

Deploy frontend and backend together when the gates pass; old unpreviewed writers are refused.

## Verification actually run — 26 September 2026

All database work used disposable databases on a local PostgreSQL 14 server (`127.0.0.1:55432`), created and dropped per run. The configured (hosted) database was not touched.

| Check | Result |
| --- | --- |
| Backend full suite, `PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL` set to the disposable server | **96/96 passed** — includes the CP11/12 integration test and the CP03–CP10 integration regressions |
| `test/integration/pricing-operations.integration.test.js` | **Passed** — preview writes nothing; foreign owner 404; invalid value 422; changed values after preview `PREVIEW_REQUIRED`; two racing confirmations → exactly one winner and exactly one audit entry; old customer quote refused with `QUOTE_CHANGED`; accepted order snapshot unchanged after a terms change; new quote carries the new tier and hash |
| Browser/API gate `scripts/portal-gate/cp1112_gate.mjs` | **44/44 passed** ([results](rentra-client-admin-part11-12-gate.json)) |
| Outage gate | **22/22 passed** ([results](rentra-client-admin-part11-12-outage-gate.json)) |
| Frontend tests / ESLint / Prettier | 19/19; passed; passed |
| Isolated production build (`RENTRA_BUILD_FIXTURE=1 next build`) | Passed |
| Backend ESLint / Prettier on changed files; `git diff --check` in both repositories | Passed |

CP11 browser/API evidence in the 44-check gate: anonymous, foreign-owner, invalid-value and unpreviewed writes denied; the preview returns its effect statement without changing the content version; concurrent confirmations have one winner (200/409); the pricing preview keeps typed input and the receipt shows the effective booking version; terms persist; the property policy page has no overflow and no serious/critical axe violations at 1280px and 390px; a stale price keeps the typed value, **Reload latest version** shows the latest saved price, and a re-preview/confirm saves the new value (checked in the form and through the API); schedule preview keeps input and confirms with an effective-version receipt; the setup wizard previews on the first **Save and continue** and advances only after confirmation. Outage evidence: with the API unreachable, the policy editor and the setup pricing step show a retryable state and no editable stale form.

### Found and fixed by execution

- Gate race: **Reload latest version** calls `window.location.reload()`, and the gate waited on the already-idle old page, so it could type into the document being replaced. The gate now waits for the reload's `load` event. This was the only failure in the previous gate run; the product was not at fault.
- Integration fixture: moving the inherited visit to "now" now moves its inventory reservation too, so the next authoritative quote does not correctly refuse with `INVENTORY_REMEDIATION_REQUIRED`.
- CP11 pricing, schedule and audit JSON writes use `::text::jsonb`. With postgres.js, `${JSON.stringify(value)}::jsonb` stores a JSON string instead of an object, under both prepared (default) and `prepare: false` (production) clients. This was checked directly.

## Remaining limits

- No hosted deployment, human screen-reader pass or large-portfolio benchmark.
- No scheduled future publication; confirmed changes apply immediately to new quotes.
- Live tax, commission, deposit custody/collection, payout and settlement timing remain unanswered in customer Part 20 and were not selected.
- Deploy frontend and backend together: old unpreviewed writers are refused. Unaccepted quotes created before deployment must be refreshed (snapshot fields changed the quote hash).

## Re-running the gates

1. Start a local PostgreSQL server on `127.0.0.1:55432` (Homebrew `initdb`/`pg_ctl`). Set `PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL` to its `postgres` database and run backend `npm test`.
2. Start `test/helpers/serve-property-review.mjs` with `FIXTURE_STAGE=published`, the backend loader and `CP06_GATE_FIXTURE=<temp json>`. It serves `:4106`. Then run `test/helpers/seed-pricing-operations-gate.mjs` with the same `CP06_GATE_FIXTURE`.
3. Start isolated Next on `:3106` with `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1`, `RENTRA_BROWSER_FIXTURE=1` and a unique `RENTRA_BROWSER_FIXTURE_ID`.
4. Run `GATE_TOKENS=<temp json> node scripts/portal-gate/cp1112_gate.mjs` (optional `PLAYWRIGHT_MODULE`, `CHROME`). The fixture JSON holds temporary tokens; never commit it.
5. Outage: put a fault proxy on `:4106` in front of the fixture that returns 503 for `/api/v1/{partner,admin}/records` to check the page-level state and **Try again** recovery. Then stop the API to check the whole-API boundary. Stopping the fixture with SIGTERM drops its database.

Next part: **CP13** (depends on CP12, now complete). See [CP12](rentra-client-admin-part12.md) for the shared evidence.
