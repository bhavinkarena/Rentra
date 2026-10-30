# Story 3.12 local verification — 30 October 2026

This directory records real local application checks, not hosted acceptance. Guest and owner actions ran in Chrome on Windows at desktop and 390px action widths. Automated reflow, configured axe WCAG 2.1 A/AA scans and primary-button measurements sampled 320/390/768/1024/1440px. This is desktop emulation; it does not certify WCAG 2.2 AA, native mobile browsers, screen readers or field performance.

The [shared spec](../../../../Rentra-Doc/_bmad-output/implementation-artifacts/spec-3-12-suitable-stay-verification.md) and shared HANDOFF hold final check results, review dispositions and matching commits. Recorded customer Parts 01–19 remain complete; Part 20 and every financial release gate remain open.

Final journey reports contain **452 passing assertions**: 440 browser assertions and 12 explicitly labelled API/provider/SQL observations. Main runs are 165 per action width; details 67, farm calendar 13, departure 12 per width and cancellation 9 per width. Separate checks are 16 target-remediation checks, nine direct service assertions, and four deliberate failed-launch checks. Independent review closed with no unresolved findings; new interactive scans also exposed and verified the repair of farm-calendar text contrast.

## Evidence

- `390/results.json` and `1440/results.json`: main guest/owner runs. Each run audits eight screens across five widths and exercises apartment Reserve → review → hold → fake Test payment → confirmation → booking record, hotel gallery/facilities, seeded hotel login return with infant age zero, apartment block/partial-unblock, and hotel dirty Escape/discard guards.
- `details/results.json`: child percentage and room-only meal base, fixed bedding, missing cot and pet-limit refusals, canonical pet retention, complete hotel amounts through checkout, category mapping/disclosure, farm/villa seeded auth recovery into checkout review, hotel preview/Tab wrap/concurrent save refusal/explicit retry. Actions ran at both 1440 and 390.
- `farm-calendar/results.json`: fixed date override followed by a percentage of the effective override, save/reload, and readable property identity at both action widths.
- `departure/results-*.json`: apartment early-departure preview, retained cleaning/pet charges, whole-unit receipt and completed record. `departure/cancellation-*.json`: full cancellation preview reconciled with captured fixture amounts, followed by the cancellation receipt and explicit zero actual bank refund.
- `startup-guard-results.log`: four actual runs with a nonexistent Chrome executable proved that setup failures replace previous green output with an explicit incomplete result. The final positive reports above were run separately.
- [Backend service-results.json](../../../../rentra-backend/docs/qa/story-3-12/service-results.json): nine **direct service** checks, not browser actions: apartment authoritative extras, pet limit, hold replay, exclusive dates/turnover, fake capture, private record, booked-date protection, cancellation/release and partial unblock/stale version.

Only selected screenshots are retained; the runners generate a larger working set. JSON records every assertion, including widths without retained screenshots. Cases listed as unexecuted in the main runner's JSON are local to that runner; the supplemental reports above close their recorded cases. Screenshots use local fixture images and synthetic identities. They are not evidence that a real property's photos or policies were verified.

## Reproduce safely

Keep a disposable PostgreSQL server on `127.0.0.1:55432`. Never use a configured/hosted database or `db:migrate`. From `rentra-backend`, start the API with stdin open:

```powershell
$env:PORTAL_TEST_DATABASE_URL='postgres://postgres@127.0.0.1:55432/postgres'
$env:DATABASE_URL='postgres://nobody@127.0.0.1:1/never'
node --import ./loader/register.mjs --env-file=.env test/helpers/serve-suitable-stays.mjs
```

The helper rejects other hosts, ports and control databases, creates a unique `rentra_test_*`, and applies fixture migrations using the existing helper. On this machine PostGIS is absent; geometry stand-ins do not establish real geographic behavior. Test keys are synthetic. API transport maps Razorpay to the file-backed fake provider and rejects other external requests. Session tokens and database URLs stay under ignored backend `tmp/story312`. Send `stop` on API stdin to drop its owned database.

From `Rentra`, start Next with an isolated fixture cache:

```powershell
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:4112/api/v1'
$env:RENTRA_BROWSER_FIXTURE='1'
$env:RENTRA_BROWSER_FIXTURE_ID='story312'
npx next dev --hostname 127.0.0.1 --port 3112
```

Set `PLAYWRIGHT_MODULE` to an installed Playwright package if it is not resolvable normally; set `CHROME` to its executable when using system Chrome. The recorded run used Python Playwright's driver package and `C:/Program Files/Google/Chrome/Application/chrome.exe`. Run from `Rentra`:

```powershell
node scripts/portal-gate/suitable-stays-details.mjs
node scripts/portal-gate/suitable-stays-farm-calendar.mjs
$env:SUITABLE_STAYS_ACTION_WIDTH='390'
node scripts/portal-gate/suitable-stays.mjs
node scripts/portal-gate/suitable-stays-departure.mjs --cancel
$env:SUITABLE_STAYS_ACTION_WIDTH='1440'
node scripts/portal-gate/suitable-stays.mjs
node scripts/portal-gate/suitable-stays-departure.mjs --cancel
```

Use a fresh fixture before replaying bookings and owner blocks. The details runner explicitly prepares a three-child/no-cot room with one paid extra bed in the guarded database. Login recovery uses a fixture cookie after the real login handoff; actual OTP delivery is not exercised. CSS zoom is a lab observation, not native browser zoom.

For an already-started stay, from `rentra-backend` run `prepare-suitable-departure.mjs`, then `activate-suitable-departure.mjs 1440`, through the same loader. From `Rentra` run `suitable-stays-departure.mjs` at action width 1440. Repeat activation and browser action at 390. Preparation creates fake-paid stays and shifts their local dates, restoring triggers before the browser acts; it resets earlier completed local scenarios' reservations between cases. That setup is not an application operation or proof of production mutation behavior. Backend integration tests separately verify accepted snapshots and turnover retention without that between-case reset.

From `rentra-backend`, `node --import ./loader/register.mjs --env-file=.env test/helpers/check-suitable-stays.mjs` writes the nine sanitized service assertions to backend `docs/qa/story-3-12/service-results.json`.

## Limits

No actual iOS/Android hardware, human screen reader, native zoom, field p75 LCP/INP/CLS, sustained backend load or specialist assistance-animal acceptance was executed. Existing suite performance observations use synthetic fixtures and a shared budget; a passed test title containing “300 ms” does not establish the opt-in strict performance gate.

Financial operations used fake Test captures/refunds and zero actual bank money. An early bootstrap attempt used dummy keys without the fake transport and reached pending; it is superseded by the guarded fake-provider runs. No provider acceptance, funded refund, payout or Live gate passed. Neon, hosted migrations, push and deployment were untouched.
