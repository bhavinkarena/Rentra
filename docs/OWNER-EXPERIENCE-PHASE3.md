# Phase 3 — First-time owner onboarding

Implemented 2 October 2026 on `feat/owner-experience` in both repositories. No deployment or live database migration was performed.

## Delivered

| ID | Result |
|---|---|
| ONB-01 | Email and mobile owner sign-in, explicit free account creation, new accounts routed to Welcome, returning accounts to Today, logout to owner login. |
| ONB-02 | Welcome seen-state and property preference saved per account. Five native dialog tour stops, CSS anchors with a fixed fallback, keyboard focus containment, Escape/skip, completion, one interrupted-tour resume and Help restart. |
| ONB-03 | Four derived steps: details with mobile verification, identity, payout, consent. Saves advance to the next incomplete step or review. Submitted applications are read-only; approved owners go to Settings. Failed submissions retain entered values. |
| ONB-03 uploads | Browser images resize to a 1600 px long edge at JPEG quality 0.8; PDFs pass through with a 5 MB limit. Local previews and legibility hints; existing valid ID sides can be retained. Private storage remains authenticated. |
| ONB-03 payout | Bank method restores on return; confirmation compares normalized account numbers. IFSC lookup displays bank/branch and remains optional during lookup failures. Consent links resolve to published policies; `owner-terms` uses the existing terms publication. |
| ONB-04 | Submitted confirmation, review lock, requested corrections, rejection reasons and remaining attempts, restricted-account support link, and a persisted one-time approval notice. Decision copy says to check back here. |
| ONB-05 | Pending owners can create and edit their own drafts, including ownership and opening hours. Publishing and calendar operations still require approval. Non-draft changes and another owner's drafts remain protected. |
| ONB-06 | Seven setup rows derived from account, listings, current verification visits, staff and payout data. Calendar completion uses the guest availability readers. Collapse, dismiss after required completion, restore from Help; caretaker is optional. Empty approved accounts see setup guidance instead of zero KPI tiles. |
| ONB-07 | Visible rule hints, upload explanations, and contextual onboarding Help links. Later phases extend this to their own screens. |

No new dependency was added. Existing authentication, listing, inventory, payout and policy readers are reused. Application notification delivery remains Phase 9 work; this phase does not promise email or WhatsApp decisions.

## Migration and release order

1. Confirm the target has all earlier journal migrations through `0056_owner_navigation_support`.
2. Apply backend `0057_owner_onboarding.sql` using the existing migration runner. It adds `user.owner_guide`, default `{}`, with an object constraint; existing owners require no backfill.
3. Deploy the backend, then frontend. The new actor reader needs this column, so deploying application code before the migration breaks authenticated owner reads.
4. Verify new and returning email/mobile login, a private identity upload, onboarding submission, a pending draft, and approval/calendar progression on the hosted stack.

The migration was exercised on disposable localhost PostgreSQL only. On rollback, keep the additive column and roll back both application releases; removing it is unnecessary. Existing production OTP provider configuration from R0 still applies.

IFSC lookup uses the documented [Razorpay IFSC API](https://github.com/razorpay/ifsc/wiki/API), sends only the IFSC, and times out after five seconds. A lookup failure does not prevent saving a valid-format IFSC.

## Verification

- Frontend: **67 tests passed**, production `npm run build` passed.
- Backend: the full run enabled both local database variables: **193 passed, one failed, zero skipped**. The failure was the minimal portal-session fixture missing `owner_guide`. It now applies migration 0057; the rerun of that fixture, onboarding integration and onboarding unit tests passed **4/4**. All 194 distinct backend tests consequently have passing evidence.
- Migration journal: **58 files/entries verified**. Changed-file lint and diff whitespace checks passed. Whole-repository lint still has unrelated existing failures; service files are excluded by the backend's existing lint/format configuration.
- Browser: **14 checks passed** (12 full-flow checks plus disabled-submit and desktop-anchor follow-ups). Final evidence is recorded in [browser-checks.json](evidence/owner-phase3/browser-checks.json), with [360 px details screenshot](evidence/owner-phase3/details-360.png). It checks Welcome persistence and preference, keyboard tour completion/restart/resume/Escape, four-step progress at 360/390/768/1440 px, wrong mobile code and advance, 6 MB image compression and 3 MB PDF, bank error correction and method restore, consent/review/submission/read-only state, rejection copy, pending drafts and approved redirects/setup guide. Audited screens have no critical/serious axe violations or horizontal overflow.

Browser private storage is a local fixture substitute, IFSC response is stubbed, and OTP uses the development bypass on the disposable API. Real Cloudinary delivery, SMS/email delivery, hosted-network failures, EXIF retention and physical-device camera picking still need deployment smoke checks. Unit/integration checks exercise owner isolation, pending/non-draft/calendar restrictions, review outcomes, live guest bookability for slot and hourly rentals (including open hours without prices), guide dismissal and restoration.

## Repeat the checks

From `rentra-backend`, with an explicitly disposable localhost PostgreSQL server:

```powershell
$env:PORTAL_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/postgres'
$env:CP01_TEST_DATABASE_URL=$env:PORTAL_TEST_DATABASE_URL
node --import ./loader/register.mjs --env-file=.env --test --test-concurrency=4 "test/**/*.test.js"
npm run db:check
```

For the browser gate, start a fresh disposable API from the backend:

```powershell
$env:OWNER_ONBOARDING_FIXTURE='C:/Kunj/Rentra/.tmp/owner-phase3/browser-fixture.json'
node --import ./loader/register.mjs --env-file=.env test/helpers/owner-onboarding-browser.mjs
```

Start frontend dev in another terminal:

```powershell
$env:RENTRA_BROWSER_FIXTURE='1'
$env:RENTRA_BROWSER_FIXTURE_ID='owner-phase3'
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:4143/api/v1'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3143
```

Run the frontend gate with `PLAYWRIGHT_MODULE` pointing to an installed Playwright module and `GATE_TOKENS` pointing to the fixture JSON. `CHROME` can override the installed Windows Chrome path. The fixture JSON contains test sessions and stays outside the repositories.

```powershell
node scripts/portal-gate/owner-onboarding.mjs
```

Use a fresh fixture for each run. Stop the owned API/dev servers afterward. Run `npm test` and `npm run build` from the frontend separately: a normal production build cleans `.next`, including the nested browser fixture cache, so do not run it concurrently with this dev gate.

## Remaining release scope

Phase 3 is complete; R2 remains in progress because its dashboard and application notification work spans Phases 4 and 9. The setup guide is already available for those phases to reuse. No later-phase redesign is included here.
