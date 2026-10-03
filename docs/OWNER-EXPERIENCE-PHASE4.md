# Phase 4: Today dashboard

Completed locally on 2 October 2026. Scope: HOME-01, HOME-02 and HOME-03 in OWNER-EXPERIENCE-PLAN.md. No deployment or live database mutation.

The approved home now shows setup guidance, actionable tasks, With Rentra information, arrivals/departures, the next seven days, rent-only earnings, property cards and linked updates. Each section settles independently and offers Retry. Pending owners see verification status, steps with estimates, requirements, a draft CTA and support contacts.

`GET /partner/today` requires an active owner. Optional `section` selects needsYou, visits, week, earnings or properties. Invalid sections fail validation. Owner identity comes from the authenticated session, never a query parameter. The dashboard and Bookings Today reuse `services/booking/owner-visits.js`: one row per visit, IST overlap boundaries, overnight departures, owner isolation and pagination. Each dashboard category shows the next five and links to the full Today list. Check-in/out links target the existing visit record and its evidence requirements.

Booked rent reuses statement allocations, includes rent only and counts each booking once. The month basis and payment environment remain visible. Payout status explicitly reports unavailable settlement data. Property cards reuse existing completion as Setup strength; the richer Phase 6 score is still future work.

## Verification

- Backend: 195 tests passed, no skips or failures, against disposable localhost databases. Final focused Today integration rerun passed after payment metadata, filter and next-booking fixes.
- Frontend: 68 tests passed; production build passed. Policy sitemap reads used the existing fallback because the external API was unavailable during build.
- Changed-file lint and whitespace checks passed. Existing unrelated whole-repository lint failures remain.
- Migration check: 58 SQL files and journal entries; no Phase 4 migration.
- Browser: five check groups passed, zero page errors, zero serious/critical axe findings and no horizontal overflow at 360/390/768/1024/1440 px. Covers 40 visits, canonical Bookings count, next-five limits, five independent section failures/retries, zero-data and pending owners.

Evidence: [browser report](evidence/owner-phase4/browser-checks.json), [360 px screenshot](evidence/owner-phase4/today-360.png).

## Repeatable checks

Run backend checks from `rentra-backend`, supplying a disposable-test-capable localhost Postgres URL. The integration helpers create and drop their own databases; never point these fixtures at a hosted database.

```powershell
$env:PORTAL_TEST_DATABASE_URL='postgres://postgres@localhost:55439/postgres'
$env:CP01_TEST_DATABASE_URL=$env:PORTAL_TEST_DATABASE_URL
npm test
npm run db:check
node --import ./loader/register.mjs --env-file=.env --test test/integration/owner-today.integration.test.js
```

From `Rentra`, run `npm test` and `npm run build`.

For the browser gate, start `rentra-backend/test/helpers/serve-owner-today.mjs` with the loader and localhost test URL. Set `OWNER_TODAY_FIXTURE` to an untracked output path. It serves the disposable API on 4143 and writes test session tokens to that file. Start the frontend on 3143 with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=owner-phase4` and `NEXT_PUBLIC_API_URL=http://localhost:4143/api/v1`. Set `GATE_TOKENS` to the fixture file and `PLAYWRIGHT_MODULE` to an installed Playwright module, then run:

```powershell
node scripts/portal-gate/owner-today.mjs
```

Stop both fixture servers afterward; do not commit the token file. Failure injection exists only in the local test server wrapper.

## Release

Apply existing migration 0057 before the backend actor reader, then deploy the frontend. No new dependency or migration was added. Hosted smoke checks and live provider delivery remain outstanding. R2 application notifications and R4 booking redesign/notifications remain in Phases 7 and 9.
