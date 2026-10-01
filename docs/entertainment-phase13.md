# Entertainment Phase 13 — local QA handoff

Verified 1 October 2026. Automated local acceptance gates pass. Owner screenshot review and staging gateway test-mode verification remain release gates. QA used only disposable databases on `127.0.0.1:55432`; no hosted application database was queried.

## Verification evidence

| Gate | Result |
|---|---|
| Backend `npm test` | 169 passed, 0 failed, 3 existing optional suites skipped |
| Backend `npm run smoke` | All six checks passed on the migrated disposable fixture |
| Backend `npm run db:check` | 56 SQL files/journal entries verified |
| Frontend `npm run ci` | Lint, formatting, 63 tests and production build passed |
| CP33 vertical tabs / homes / ISR | 46/46 assertions passed on the production fixture build |
| CP34 entertainment search / landings | 52/52 passed |
| CP35 picker / conflicts / owner timeline | 28/28 passed, including 30 courts × 20 hours |
| CP36 login / checkout / fake-provider capture / cancellation | 23/23 passed; six booking interactions |
| CP37 customer / owner / admin dashboards | 19/19 passed |
| CP38 keyboard-only paid booking | 5/5 passed; confirmation axe/overflow at 390 and 1440 |
| CP39 audited launch switch and booking preservation | 10/10 passed on the disposable stack |
| Phase 14 real-migrator release test | 0040–0055 applied in one transaction from a pre-0040 disposable database; inspection rejects missing migrations, checksum drift and incomplete launch inventory |

The final backend suite was run before broadening the release rehearsal from 0052–0055 to 0040–0055; the revised release integration test then passed independently. CP35 restores its stress resources/hours before CP37. CP35–CP38 now exit nonzero for failed assertions or browser problems, and reuse the application's pinned `axe-core`. Windows paths and an explicit `CHROME` executable are supported. The picker waits for the streamed grid before counting starts.

Raw logs and screenshots from this run are in `C:/Kunj/Rentra/.qa/`. They are local evidence, outside both repositories. `entertainment/screenshots/` contains the 390/1440 home, search, time sheet, review, confirmation, cancellation and dashboard captures, plus CP33/34/39 JSON results. Fixture photos use a bundled image; these screenshots do not verify real venue photography or translated production catalogue content.

[Recorded gate counts](entertainment-phase13-results.json) preserve the suite results and release status in the repository. Prettier now accepts the checkout's line endings so Windows QA does not require formatting every source file.

An additional backend lint/format check still finds existing issues in legacy QA/seed scripts, docs and `venue-completion.test.js` (520 lint errors and one warning, 15 formatting files). Backend lint is outside Phase 13's stated acceptance command; this is recorded rather than reported green. The new release inspection passed lint with `--no-ignore`; its containing service directory is normally excluded by the repository's existing lint/format rules.

## Master edge-case coverage

Paths below are relative to `rentra-backend/test/` unless prefixed with `Rentra/`.

| Master-list cases | Automated evidence |
|---|---|
| Parallel same-court holds; two free courts; court hold vs venue-wide block; owner block vs hold; expired hold; late capture | `integration/hourly-booking.integration.test.js` (actual Promise concurrency, worker expiry and refund obligation); schema test for database exclusion |
| Overnight booking and operating-day price; invalid start/close/duration; lead time; split shift | `services/hourly-domain.test.js`, frontend `Rentra/test/domain/hourly.test.js`, `integration/time-grid.integration.test.js` |
| Weekly-hours change with future bookings | `integration/venue-apis.integration.test.js` (outside-hours preview retains bookings) |
| Peak-band split; missing price band; stale quote after rate change; 90 minutes at ₹999/hr | `services/hourly-domain.test.js`, `integration/hourly-booking.integration.test.js`, `integration/venue-apis.integration.test.js` |
| Deactivate court / remove activity with bookings; capacity limit; shared physical multi-sport court | `integration/venue-apis.integration.test.js`, `integration/venue-owner-flow.integration.test.js`, `integration/hourly-booking.integration.test.js` |
| Wrong-vertical category / amenity; hidden vertical visibility and retained bookings | `integration/entertainment-schema.integration.test.js`, `integration/entertainment-contract.integration.test.js`, `integration/venue-apis.integration.test.js`, CP39 |
| Missing vertical defaults to farmhouse; category mismatch; incompatible params ignored; empty city | `services/hourly-domain.test.js`, HTTP contract test, `Rentra/test/domain/vertical-ui.test.js`, CP34 |
| Fourth hold refused; booking starts in five minutes / already started | `integration/hourly-booking.integration.test.js`, `services/checkout-deadline.test.js` |
| Exactly 24h / 23h59m cancellation; old farmhouse day snapshot | `services/hourly-domain.test.js`, `integration/hourly-booking.integration.test.js`, frontend hourly domain tests |
| One-hour confirmation without reminder; one-day confirmation with reminder two hours before | `integration/entertainment-schema.integration.test.js` (real notification trigger/outbox) |
| Real single-transaction migrator; two courts overlap without monitor incident | `integration/entertainment-schema.integration.test.js`; full pending release range in `integration/entertainment-release.integration.test.js` |
| Search tab preserves city and drops incompatible params; one public vertical; keyboard-only court booking | `Rentra/test/domain/vertical-ui.test.js`, CP33, CP38 and CP39 |

The farmhouse HTTP contract checks byte equality within the same fixture before/after the launch switch. It does not claim a historical byte snapshot of every endpoint from the pre-entertainment release. The earlier Phase 12 latency comparison remains in its own evidence files and was not overwritten.

## Reproduce on Windows

Run a disposable PostgreSQL server on port 55432 with a `postgres` control database. Never substitute the hosted application URL. From `rentra-backend/`:

```powershell
$env:DATABASE_URL = 'postgres://postgres@127.0.0.1:55432/postgres'
$env:PORTAL_TEST_DATABASE_URL = $env:DATABASE_URL
npm test
npm run db:check
$env:GATE_FIXTURE_DIR = 'C:/Kunj/Rentra/.qa/entertainment'
node --import ./loader/register.mjs test/helpers/serve-entertainment.mjs
```

The last command holds API port 4106 and creates the fixture JSON/token files. It uses a file-backed fake Razorpay provider and fixture-only credentials. In a separate backend shell, set `GATE_DB_JSON` to the resulting `qa-db.json` and run `test/helpers/prepare-entertainment-gates.mjs`. For smoke, set `DATABASE_URL` to the URL in that JSON, `NODE_ENV=test`, the fixture `SESSION_SECRET`, site origin and inert Cloudinary values shown in `serve-entertainment.mjs`, then run `npm run smoke`. The helper validates the disposable host/port/database name before any writes.

From `Rentra/`, build and start the browser stack with the same fixture identifier:

```powershell
$env:RENTRA_BROWSER_FIXTURE = '1'
$env:RENTRA_BROWSER_FIXTURE_ID = 'entertainment-release'
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:4106/api/v1'
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3106'
npm run build
npm run start -- --port 3106
```

Run CP33–CP39 in order with `GATE_WEB=http://localhost:3106`, `GATE_OUT` pointing to an existing screenshot directory, `GATE_DB_JSON`, `GATE_TOKENS`, `FAKE_RAZORPAY_STATE`, and `GATE_RZP_SECRET=phase13-fixture-payment-secret`. CP33/34 use `PLAYWRIGHT_MODULE` (path to the installed `playwright` package); CP35–CP39 use `PLAYWRIGHT_DIR` (a package.json path whose installation resolves `playwright-core`). Set `CHROME` to an available Chromium executable. No separate axe installation is required. CP36 leaves the confirmed booking CP37 expects. CP39 exercises the single-public-vertical state and restores public afterward.

For the general frontend gate, unset `RENTRA_BROWSER_FIXTURE`, set `RENTRA_BUILD_FIXTURE=1` and use the local API for `npm run ci`. The recorded CI build instead used the existing unavailable-local-API fallback on port 4119; the subsequent production browser build used live fixture API port 4106. Both compiled successfully. Static cache assertions require `next start`.

Stop the fixture server through its stdin/SIGINT cleanup when finished; it drops its database. Stop the local frontend and disposable PostgreSQL server. See [the Phase 14 runbook](entertainment-phase14.md) for hosted release gates.
