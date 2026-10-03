# Owner experience — Phase 11: responsive and mobile UX

Implemented locally on 2 October 2026. Not deployed. Responsive changes are delivered; the performance budget and physical-phone checks remain open.

## Delivered

- `PortalPage` accepts the existing named page widths. Today, settings and property-list roots now reuse it alongside the previously wrapped owner routes. Existing narrow detail layouts remain inside their page gutters; complete width consolidation is scheduled in Phase 12.
- Owner shell and wizard use dynamic viewport height. Shared visual-viewport keyboard detection hides the bottom navigation, wizard actions, booking action and confirmation actions when usable height shrinks substantially. Pinch zoom retains controls. Safe-area padding protects the header and bottom actions.
- Eligible booking details keep the existing validated Record check-in / check-out / complete submit button in the mobile thumb zone. Desktop keeps it in the form. Visits with unknown hours correctly have no operational action.
- Owner-scoped CSS gives links, buttons, summaries and radio/checkbox labels a minimum 44 px target. Wizard chapter links now have an explicit 44 px height. Owner input text stays at 16 px or larger; shared wizard inputs request the Next keyboard action.
- Existing mobile property, booking and finance cards, stacked pricing cards, native dates, numeric/OTP inputs and gallery/camera file picker are reused. No new dependency or date picker.
- Property-card thumbnails use Cloudinary `f_auto,q_auto,w_400,h_225,c_fill`; booking thumbnails request `f_auto,q_auto,w_400`. Hero images keep their original sizing. Existing calendar range loading remains in place.

## Verification

- Frontend tests: **76 passed**, no failures or skips. The new keyboard check covers height loss, browser chrome and pinch zoom.
- Whole frontend lint and production build passed (`RENTRA_BUILD_FIXTURE=1`).
- The repeatable [browser gate](../scripts/portal-gate/owner-phase11.mjs) checks 40 main owner/property/wizard routes at 360, 390, 768, 1024 and 1440 px: no horizontal overflow, visible links/buttons/summaries at least 44 px, and input text at least 16 px. It also checks six onboarding URLs at those widths for overflow; the phone URL intentionally redirects to the mobile verification section of Details.
- [Browser results](evidence/owner-phase11/results.json) record **43 checks, 230 viewport checks and zero uncaught page errors**. Screenshots at 360 px cover the main route matrix. Axe checks cover Today, bookings, earnings, settings and wizard pricing. Keyboard shrinking and pinch zoom are simulated through `visualViewport`, including the booking thumb-zone action.
- Disposable local PostgreSQL fixtures only. No production account, upload provider, payment or live database change.

## Open acceptance criteria

- [Production bundle evidence](evidence/owner-phase11/bundle-budget.json) measures each unique first-load JS chunk once per route, gzipped with the existing performance helper. All 53 owner routes exceed the 180 KiB target (approximately 303–400 KiB). Shared chunks may be cached on later navigations; this does not make the cold-load budget pass. Phase 13 contains the broader server/cache and bundle work.
- First meaningful content under 2.5 seconds and interaction under 200 ms on 4G have **not** been proved. Development-server timings are not production performance evidence.
- Real Android Chrome and iPhone Safari keyboard, camera/gallery, safe-area and touch checks still require physical devices. Desktop Chromium viewport checks do not replace them.
- The route matrix does not claim every entity-detail permutation, legacy alias, authentication screen or drawer state. Full matrix expansion and physical-device checks remain QA work.

## Repeat the gate

1. Start the backend `test/helpers/serve-property-review.mjs` with a localhost `PORTAL_TEST_DATABASE_URL`, `FIXTURE_STAGE=published`, `GATE_API_PORT=4206`, `GATE_WEB_ORIGIN=http://localhost:3107` and a temporary `CP06_GATE_FIXTURE` path. It creates a disposable database.
2. Start Next on 3107 with `RENTRA_BROWSER_FIXTURE=1`, a unique `RENTRA_BROWSER_FIXTURE_ID`, `PARTNER_RTK_ENABLED=true`, `NEXT_PUBLIC_API_URL=http://localhost:4206/api/v1` and `NEXT_PUBLIC_SITE_URL=http://localhost:3107`.
3. Run `node scripts/portal-gate/owner-phase11.mjs` with the same `CP06_GATE_FIXTURE` and `GATE_WEB_ORIGIN`. `PLAYWRIGHT_MODULE` and `CHROME_PATH` can override the locally installed browser tools. The gate refuses non-local/non-disposable database URLs before seeding draft and eligible-visit records.
4. Stop Next, then send `stop` to the fixture API stdin to drop its database. Keep temporary tokens outside version control.
