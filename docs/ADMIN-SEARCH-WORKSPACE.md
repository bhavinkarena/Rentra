# Admin search workspace

Phase 11 uses the existing capability-gated list endpoints. No unified endpoint, production backend change, new capability, dependency, stored preference or migration is needed.

## Supported fields and scopes

| Type | Fields | API | Read grant |
| --- | --- | --- | --- |
| Owners | Name, email, phone | `/admin/clients` | `admin.clients.read` |
| Customers | Name, email, phone | `/admin/customers` | `admin.customers.read` |
| Applications | Owner/legal name, email | `/admin/applications` | `admin.applications.read` |
| Properties | Title, owner email, exact property code | `/admin/properties` | `admin.properties.read` |
| Bookings | Booking/visit reference, property title, guest name/phone | `/admin/records` | `admin.records.read` |
| Booking cases | Case/booking reference, property title | `/admin/records/cases` | `admin.records.read` |

Support has no text/reference query contract. Support requests, message bodies and documents are not searched. Applications do not advertise phone search. Property codes use the existing exact comparison; reference/name predicates use the existing literal, case-insensitive substring comparisons. Percent and underscore characters do not widen queries.

## Navigation and failure behavior

Search capability checks run before any directory request. The header affordance and record-type choices use the same supported-type map, including application-only, property-only and booking-record-only roles. No permitted type means no header search affordance or directory request. Direct unauthorized type URLs show an explicit unavailable-type state.

A query is trimmed and limited to 100 characters. Repeated query inputs are ignored. Page numbers are bounded integers, independently named `clientsPage`, `customersPage`, `applicationsPage`, `propertiesPage`, `bookingsPage` and `casesPage`. APIs clamp requests to their actual page count; each result includes the full matching total, 20 rows and independent pagination. Changing the term/type resets all pages. Blank queries perform no directory request.

Copy uses the existing reference control with visible clipboard-denial feedback and accessible success confirmation. Full record pages retain a canonical, bounded `/admin/search` return through record tabs and refresh. Directory links retain matching scope, term and page. Application decisions return to the matching application queue with the committed decision outcome; search breadcrumbs return to search. Legacy application bookmarks at `/admin?...` retain their compatibility redirect.

Failures are isolated per directory. Retry uses the existing refresh control to refetch the current server render without losing filters/pages, rather than following a cached link to the same failed route. Existing endpoint and direct-record authorization remain authoritative.

## Verification

Locally verified on 5 October 2026: 102 frontend tests, five backend regression tests (zero skipped), 12 browser checks and 14 axe scans with zero violations/page errors. Production build, changed-source lint/format, backend lint, fixture formatting and the 64-entry migration checker pass. Existing global lint/format issues and production sitemap policy warnings are recorded in checks.json. Not deployed; full release, production providers and performance remain Phase 12 work.

## Reproduce

Use isolated localhost PostgreSQL and keep private session JSON outside both repositories. Never load backend production .env. These examples use shell environment syntax; on Windows use equivalent PowerShell `$env:` assignments.

From the backend:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5471/postgres \
ADMIN_SEARCH_FIXTURE=1 ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase11-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase11 \
ADMIN_BASELINE_API_PORT=4171 GATE_WEB_ORIGIN=http://127.0.0.1:3171 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5471/postgres \
CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5471/postgres \
NODE_ENV=test SESSION_SECRET=phase11-disposable-tests-only \
  node --import ./loader/register.mjs --test \
  test/integration/owner-today.integration.test.js \
  'test/integration/admin-*.integration.test.js'
```

From the frontend:

```sh
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4171/api/v1 \
  npm run build -- --webpack
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4171/api/v1 \
  node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3171
ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase11-fixture.json \
  python scripts/portal-gate/admin-search.py
npm test
```

The browser gate needs Python Playwright, Chrome and installed axe-core. Its local fixture seeds 23 matching records per supported type, single-grant roles and synthetic private body text. Immutable booking snapshots are supplied at insertion. The optional title argument in the existing busy-visit fixture preserves the default owner fixture; its integration regression is included.

Failure injection endpoints `/fixture/search-failure/on` and `/off` exist only in the disposable localhost helper with `ADMIN_SEARCH_FIXTURE=1`; production application routes are unchanged. The gate restores the failure switch in `finally`. Stop the fixture with `stop` to drop its database, shut down the isolated services and remove private JSON. Failed startup databases disappear when the isolated cluster is removed. Do not commit private fixture JSON, cookies or credentials.

[Checks](evidence/admin-phase11/checks.json) | [Browser evidence](evidence/admin-phase11/browser-results.json)
