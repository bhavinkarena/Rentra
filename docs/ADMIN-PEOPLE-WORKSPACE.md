# Admin People workspace — Phase 7

Implemented and locally verified on 5 October 2026. Not deployed.

Specification: [Phase 7 of the admin experience plan](ADMIN-EXPERIENCE-PLAN.md#phase-7--people-owners-and-customers). Implemented on the existing frontend `main` branch; the backend fixture helper remains on its existing `master` branch. No branch switch, deployment, migration, production backend change, or dependency installation.

## Scope and implementation checklist

- ADM-PEOPLE-01: use the existing Owners/Customers section navigation; migrate both directories to shared admin tables, filters, native fields, pagination and loading presentation. Keep literal search and status/page behavior.
- ADM-PEOPLE-02: retain independent full-page details and every existing record section, filtered return context, application/property/booking/support links and account history. Optional View sheets are deferred; `View` opens the full-page record.
- ADM-PEOPLE-03: expose account restriction/reinstatement, customer profile correction/session revocation and payout-method failure only with the directory's write grant. Related workspace links require that workspace's read grant. Keep current account separation and all API authorization, reasons, versions, previews and request keys.
- ADM-PEOPLE-04: verify authenticated full/read-only/customer-only operators, direct document/command denial, failed-value retention, concurrency, history, pagination, search and 360/768/1280 px layouts. Record only passing checks and actual limitations in the phase tracker and evidence.

## Data and permission boundaries

`/admin/clients` and `/admin/clients/<id>` remain compatible; UI labels use Owner. `/admin/customers` and its detail routes stay unchanged. Existing People APIs remain the authority. The details retain the read contract already authorized by `admin.clients.read` or `admin.customers.read`; showing related record summaries does not grant access to those records' commands or private documents.

`admin.clients.write` controls owner lifecycle and payout-method failure. `admin.customers.write` controls customer lifecycle, profile correction and session revocation. Related links independently require `admin.applications.read`, `admin.properties.read`, `admin.records.read`, `admin.support.read`, `admin.reviews.read` or `admin.privacy.read`.

Account/profile version checks prevent lost updates. Customer name/email/language and lifecycle reasons remain controlled inputs on refusal. Payout failure retains its existing manual preview/apply flow and form values, request key, state guard and recent-authentication requirement. There is no impersonation, account merge, owner-ID edit, provider verification or payout execution.

Dates use the existing deterministic IST formatter for operator events. Visits use the shared booking formatter in the property's timezone. Directory counts remain API aggregates scoped by search; no new counters are inferred from row lengths. Owner properties and history retain their existing latest-50 limits; upcoming visits retain their next-20 limit. Customer booking/support/review summaries retain existing backend limits.

## Verification and evidence

Frontend tests: 97 passed. People integrations: 3 passed, no skips. Browser gate: 30 checks, 12 WCAG axe scans, zero violations and page errors. Frontend/backend lint, changed-file frontend formatting, backend formatting and production Webpack build pass. Migration journal: 64 entries; no new migration. Results are recorded in [checks.json](evidence/admin-phase7/checks.json) and [browser-checks.json](evidence/admin-phase7/browser-checks.json), with screenshots in the same evidence directory. Full backend suite: 233 passed, 1 existing CP25 failure (expected history length 4, received 5), 3 skipped. Frontend global formatting still flags the unchanged launch roadmap. Production providers and the Phase 12 complete release journey are outside these local checks.

## Reproduce

Use an explicitly disposable localhost PostgreSQL server. Do not load production backend `.env`. Temporary fixture JSON contains sessions and stays outside the repository.

```sh
# Backend directory; disposable PostgreSQL listening on port 55432.
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase7-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase7 \
ADMIN_BASELINE_API_PORT=4167 GATE_WEB_ORIGIN=http://127.0.0.1:3167 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

# Separate backend terminal; run once against a fresh fixture.
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase7-fixture.json \
  node --import ./loader/register.mjs test/helpers/seed-admin-people-gate.mjs

PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
  node --import ./loader/register.mjs --test \
  test/integration/client-lifecycle.integration.test.js \
  test/integration/customer-controls.integration.test.js \
  test/integration/payout-destinations.integration.test.js

# Frontend directory; build and serve isolated production output.
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4167/api/v1 \
  npm run build -- --webpack

RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4167/api/v1 \
  npx next start --hostname 127.0.0.1 --port 3167

ADMIN_BASELINE_FIXTURE=/tmp/admin-phase7-fixture.json \
  python scripts/portal-gate/admin-people.py

```

The browser gate requires Python Playwright, Chrome and the project's pinned axe-core. Use a fresh dataset: the gate changes account and payout state to prove concurrency and records history. Send `stop` to the fixture terminal to drop its database; stop the isolated frontend and PostgreSQL server and remove the private JSON. No fixture tokens or configured credentials belong in evidence.

## Changed files

Frontend: `AdminClients.jsx`, `AdminCustomers.jsx`, `AccountLifecyclePanel.jsx`, `CustomerAccountForms.jsx`, `PayoutDestinationAdmin.jsx`, `AdminLoading.jsx`, `AdminPrimitives.jsx`, People detail/loading routes and `scripts/portal-gate/admin-people.py`. `AdminTable` gains a positioning boundary so visually hidden row labels stay inside local table scrolling. Existing shared URL and pagination helpers need no new abstraction.

Backend: only `test/helpers/seed-admin-people-gate.mjs`, which extends the explicitly disposable baseline fixture with existing services. Production routes, DTOs, database schema and identity switching remain unchanged.
