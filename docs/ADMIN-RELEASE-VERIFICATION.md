# Admin release verification

Phase 12 was verified locally on 5 October 2026. It is the release gate for the redesigned admin workspace. It ran against disposable localhost services only. No providers, production data or deployments were used.

## What the gate covers

| ID | Coverage | Evidence |
| --- | --- | --- |
| ADM-QA-01 | One operator signs in with a password and an authenticator code, then opens a dashboard attention link and approves an owner application. They record a property decision, schedule and pass verification, and publish the exact revision. They resolve a booking case through preview/confirm, which cancels one visit and creates one Test refund obligation, and they inspect that refund. Finally they reply to support, confirm the audit trail and sign out. Each step is checked in the UI and in the database. | `admin-release.py` journey |
| ADM-QA-02 | Every admin page, with discovered detail records, at 320, 640, 768 and 1280 px. At 1280 px, 320 and 640 CSS px equal 400 % and 200 % zoom. Pages must not overflow, wide tables must scroll inside their own region, and pages must load without failures. Representative phone screenshots are kept. | sweep |
| ADM-QA-03 | WCAG 2.2 AA axe checks at 320 and 1280 px on every page, including sign-in, enrollment, field-error and no-grant screens. The skip link is the first stop and focus is always visible. The booking sheet and mobile drawer keep focus away from background controls and restore it on Escape. Reduced motion is honoured. | sweep, keyboard |
| ADM-QA-04 | A revoked session refuses a write, keeps the draft and explains recovery, and the next load redirects to sign-in. An expired session redirects to sign-in, and signing in restores the workspace. | recovery |
| ADM-QA-05 | Every capability-protected admin API route refuses an operator with no grants. Every write route refuses a read-only operator, and every read route admits one. Direct page URLs for a no-grant operator render no records and no server errors. | permissions |
| ADM-QA-06 | Cold-load JavaScript and timings for the current build against the pre-redesign build (commit `90b0900`), served on the same API. Warm sheet, tab and filter interactions are timed. Admin APIs are timed at synthetic volume. | `admin-release-perf.py`, `admin-release-volume.py` |
| ADM-QA-07 | Frontend tests, lint, format and production build. Full backend suite, lint, format and migration journal. | checks.json |

## Results

- **Browser:** 19 checks and 97 WCAG 2.2 AA axe scans, with zero violations, zero page errors and zero hydration errors. 47 pages were swept at four widths.
- **Permissions:** 115 of 116 admin API routes are capability-protected, and all 115 refuse the no-grant operator. The 53 write routes refuse a read-only operator, and the 62 read routes admit one.
- **Cold-load JavaScript:** each route stays within −1.9 % to +4.2 % of the pre-redesign build. The largest is `/admin/bookings` at 346.7 KiB compressed, against 332.8 KiB before; it now includes the booking sheet.
- **Interactions** (warm, local medians): the booking sheet opens in 101 ms, a sheet tab switches in 68 ms and a booking filter applies in 47 ms.
- **Budget:** at most 360 KiB compressed JavaScript per admin route, and a booking-sheet open of at most 300 ms median on the local production build. Re-measure on production hardware before tightening either figure.
- **Volume:** with 20,053 users, 2,024 properties and 20,029 orders and visits:
  - The dashboard responds in 11 ms.
  - Directory, property and reference searches respond in 2–35 ms.
  - Booking records page 1 responds in 119 ms. Page 500 takes 359 ms because OFFSET pagination grows with depth.
  - No index was added; review keyset pagination once production volume is known.
- **Release gates:**
  - Frontend: 103 tests pass, lint is clean, and the production build has no warnings.
  - Backend: 237 of 238 tests pass. The one Cloudinary-dependent test passes on its own with dummy configuration.
  - Backend lint and format are clean, and the migration journal has 64 entries.
  - Frontend formatting still flags only the unchanged launch roadmap.

## Defects found and fixed

- **The sign-in form hid non-field errors.** Rate-limit, outage and other non-field errors never appeared. Field errors were not linked to their inputs, and React's post-action reset cleared the email after every failed attempt. The form now uses the shared `Field`, shows a form-level alert and keeps the email. Passwords are never echoed back.
- **Saving after the session ended gave no way forward.** The form said only "Admin sign-in required." `ApiError` now maps `ADMIN_REQUIRED` to copy that says the entry is kept and how to sign in again. The draft remains in the form.

## Not covered

- Six detail routes had no seeded record, so the sweep could not discover them: audit export, dispute, allocation, payout, statement and privacy details. Their Phase 8–10 gates cover them on their own fixtures.
- Production providers, workers, email/SMS delivery and hosted-database query plans were not run. Local timings are relative evidence only, not production latency.
- Session recovery returns the operator to the dashboard, not to the page they were on. Returning to the original page would need a validated return path through sign-in.

## Reproduce

Use isolated localhost PostgreSQL and keep the private fixture JSON outside both repositories. Never load backend `.env`.

```sh
# backend
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5472/postgres \
ADMIN_REVIEW_FIXTURE=1 ADMIN_COMMS_FIXTURE=1 ADMIN_SEARCH_FIXTURE=1 \
ADMIN_BASELINE_FIXTURE=/private/tmp/admin-phase12-fixture.json ADMIN_BASELINE_EVIDENCE_DIR=/private/tmp/admin-phase12-ev \
ADMIN_BASELINE_API_PORT=4172 GATE_WEB_ORIGIN=http://127.0.0.1:3172 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs &
ADMIN_BASELINE_FIXTURE=/private/tmp/admin-phase12-fixture.json \
  node --import ./loader/register.mjs test/helpers/seed-admin-release-gate.mjs

# full backend suite with a disposable-only env file (blank CLOUDINARY_* values, DATABASE_URL on the disposable server)
PORTAL_TEST_DATABASE_URL=... CP01_TEST_DATABASE_URL=... \
  node --import ./loader/register.mjs --env-file=<disposable.env> --test "test/**/*.test.js"

# frontend: current build on 3172; pre-redesign build (git worktree at 90b0900) on 3173
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4172/api/v1 npm run build -- --webpack
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4172/api/v1 \
  node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3172
ADMIN_BASELINE_FIXTURE=... ADMIN_API_ROUTES=/private/tmp/admin-phase12-ev/api-routes.json \
  uv run --with playwright python scripts/portal-gate/admin-release.py
ADMIN_BASELINE_FIXTURE=... uv run --with playwright python scripts/portal-gate/admin-release-perf.py
ADMIN_BASELINE_FIXTURE=... uv run --with playwright python scripts/portal-gate/admin-release-volume.py  # last: inflates the database
```

The journey changes data, so use a fresh fixture for every full run. `RELEASE_ONLY=journey,recovery,keyboard,sweep,permissions` runs a subset. The sweep takes about 25 minutes, so run it detached (`nohup`). Stop the fixture with SIGTERM or `stop` to drop its database. Then stop the servers and the cluster, and remove the private JSON.

[Checks](evidence/admin-phase12/checks.json) | [Browser results](evidence/admin-phase12/browser-results.json) | [Performance](evidence/admin-phase12/performance.json) | [Volume](evidence/admin-phase12/volume.json)
