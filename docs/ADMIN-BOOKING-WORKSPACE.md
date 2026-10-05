# Admin booking workspace — Phase 6

Implemented and locally verified on 5 October 2026. Not deployed. See the [phase tracker](ADMIN-EXPERIENCE-PLAN.md) and [recorded checks](evidence/admin-phase6/checks.json).

## Delivered scope

| ID | Behavior |
| --- | --- |
| ADM-BOOK-01 | Shared booking table: property/reference, owner/protected guest, visit range, state, rent basis, payment environment and View. |
| ADM-BOOK-02 | URL-driven full booking sheet, all record sections, filtered return context and independent full-page route. |
| ADM-BOOK-03 | Separate case section with open, unassigned, mine, resolved and all filters; shared table and case sheet/full page. |
| ADM-BOOK-04 | Capability-aware lifecycle/evidence/case controls; existing prerequisites, versions, preview hash, idempotency and private downloads retained. |
| ADM-BOOK-05 | Failed/pending draft protection, refreshed sheet evidence, Live/Test money separation and local browser/API/database verification. |

## Routes and data

- `/admin/bookings?...&booking=<uuid>&recordTab=<section>` opens the complete booking sheet. `tab` remains the list filter. Closing removes only sheet state.
- `/admin/bookings/<uuid>?tab=<section>&from=<filtered-list>` works independently and retains list context.
- `/admin/booking-cases?...&case=<uuid>` opens a case sheet; `/admin/booking-cases/<uuid>?from=<filtered-list>` is its full page.
- All supported booking filters, including property/resource/vertical/date, dashboard creation/environment/rent/visit scope and page, survive open/close and record-section navigation.
- Admin record list additions are `owner`, `guestName`, `guestWithheld` and `lastVisit`. Guest identity is withheld after active fulfillment ends, matching admin detail behavior; phone is not added to the list. Owner/customer list DTOs are unchanged.
- `admin.records.read` authorizes booking/case inspection; `admin.records.write` exposes commands. Related module links use separate read grants, and dispute creation uses payments write access. APIs still enforce authorization.
- History and policy render the existing record contract; no new history/policy API is invented. Private attachments, summary and calendar keep their existing protected endpoints.
- Original booked rent is distinct from cash. Live captured/refunded totals include only Live payment evidence; Test payment rows remain visible separately.

## Changed files

Frontend: booking/case list and full-page routes; `AdminBookingHistory.jsx`, `AdminBookingDetail.jsx`, `BookingCases.jsx`; shared `CasePanels.jsx`, `VisitEvidence.jsx`, `EvidenceForms.jsx`; `lib/domain/admin-booking-navigation.js` and its behavior tests; `scripts/portal-gate/admin-bookings.py`; phase tracker and evidence.

Backend: `src/services/booking/records.js` adds admin-only list metadata. `case-actions.js`, `evidence-actions.js` and `lifecycle-actions.js` also invalidate the parent admin booking route. `test/integration/admin-booking-experience.integration.test.js` covers privacy/DTO parity; `test/helpers/seed-admin-bookings-gate.mjs` prepares the explicit disposable browser dataset using existing fixture and checkout services.

No schema migration or application dependency was added.

## Reproduce

Use an explicitly disposable localhost PostgreSQL server. Do not load the backend production `.env` for these fixture commands. Temporary fixture JSON contains sessions and must stay outside the repository.

```sh
# Backend directory: PORTAL_TEST_DATABASE_URL names the disposable local server.
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55436/postgres \
  node --import ./loader/register.mjs --test \
  test/integration/admin-booking-experience.integration.test.js \
  test/integration/booking-cases.integration.test.js \
  test/integration/visit-evidence.integration.test.js

PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55436/postgres \
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase6-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase6 \
ADMIN_BASELINE_API_PORT=4166 GATE_WEB_ORIGIN=http://127.0.0.1:3166 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

# Separate backend terminal; run once against the fresh fixture.
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase6-fixture.json \
  node --import ./loader/register.mjs test/helpers/seed-admin-bookings-gate.mjs

# Frontend directory; isolated dev output preserves any normal dev instance.
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=admin6 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:4166/api/v1 \
  npx next dev --hostname 127.0.0.1 --port 3166

# Frontend directory; Python environment with Playwright and local Chrome.
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase6-fixture.json \
  python scripts/portal-gate/admin-bookings.py
```

The browser gate mutates only its disposable fixture; use a fresh fixture for another full run. It records screenshots and token-free JSON. `GUARD_ONLY=1` limits the gate to failed-save protection for regression proof. Send `stop` to the fixture process, stop the isolated frontend and PostgreSQL, and remove the private fixture JSON after verification.

## Verified limits

Frontend tests: 97 passed. Targeted disposable integrations: 3 passed. Browser: 39 checks, 15 axe scans, zero violations or page errors. Final confirmation checks five case filter modes and 44 px download targets. The original form hook fails the browser draft-protection assertion; the fixed hook passes. Fresh review reports no production findings.

Frontend/backend lint, changed-file formatting, backend formatting and 64 migration entries pass. Production webpack build passes. Default Turbopack build cannot bind its worker port in this execution environment.

Full backend regression reports 233 passed, one failed and three skipped. The unchanged content-history test expects four entries and receives five; its isolated rerun also fails. Global frontend formatting flags the unchanged launch roadmap. These are recorded failures, not passing checks. Production providers and the complete Phase 12 release journeys remain unverified.
