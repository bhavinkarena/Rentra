# Owner experience — Phase 14: QA and edge cases

Run locally on 2 October 2026 against disposable databases only. Not deployed. This records which §14.2 edge cases have automated evidence, which are partial, and which still need a test or a device.

## Gates run

| Gate | Result |
|---|---|
| Backend `npm test` with `PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL` on a local cluster (127.0.0.1:55432) | **219 passed, 0 failed, 0 skipped**. Integration tests that were skipped in earlier records now run |
| Frontend `npm test` | 79 passed |
| Frontend lint, production build | Passed |
| [Phase 11 viewport gate](../scripts/portal-gate/owner-phase11.mjs), rerun after Phase 12 | 43 checks, 230 viewport checks, 0 page errors |
| New [Phase 12 gate](../scripts/portal-gate/owner-phase12.mjs) ([results](evidence/owner-phase12/results.json)) | axe on 14 owner routes at 1440 px: **0 serious/critical**. Focus lands on the h1 after navigation. A dirty form holds Back and links; clean pages and filter forms never prompt |
| Glossary check (§14.3 item 5) | Clean on owner screens. "revision" and "partner" appear only in admin operator help |

## Defects found and fixed in this pass

1. **Unsaved guard ignored every Server Action form (DS-07).** React renders action forms without a `method`, so `form.method` reads `"get"` and the guard skipped them. The guard now tracks a form unless it has an explicit `method="get"`, a real URL `action`, `role="search"` or `data-unsaved-guard="off"`. The owner earnings and statement month filters and two admin filters now declare `method="get"`.
2. **Focus after navigation stayed on `#portal-main` while a loading skeleton showed (DS-06).** The shell now moves focus to the h1 when the page streams in, unless the user has already moved focus.
3. **Electricity-bill age check was inline and untested.** Extracted to `billIsFresh()` in `services/domain/listing-completion.js` with a unit test (same rule: today back to 3 calendar months, valid date, not in the future).

## New regression tests

- `rentra-backend/test/integration/owner-edge-cases.integration.test.js`
  - Owner booking search by part of a phone number.
  - Guest phone visible on the list card and detail 3 days after completion, masked at 8 days.
  - Changing to a phone number another owner uses is refused with `CONTACT_IN_USE`, and no code is sent or stored.
- `rentra-backend/test/services/bill-freshness.test.js`: bill freshness boundaries.

## §14.2 coverage map

**Covered** means an automated test asserts the case. **Partial** means a test covers the rule but not the exact scenario. **Open** means no automated evidence yet.

| Area | Covered | Partial | Open |
|---|---|---|---|
| Identity and onboarding | OTP provider outage (code not sent is reported); name change during review (display name locked); phone already used (new); approval flow and drafts never bypass approval | Wrong/expired code (session-bound codes, attempt limits); third rejection (`strikesLeft` unit test) | New vs returning account (`isNew`); withdraw while under review; approved owner opening onboarding URLs |
| Wizard | Two tabs autosaving (autosave conflicts); weekend-only price refused; bill older than 3 months (new); ownership step keeps the existing document | Full-day lower than day + night (Full-day alignment); duplicate photo ("Already added" in UI, no test) | Legacy step ids; session expiry mid-step; offline autosave queue; 15 × 6 MB on 3G; HEIC (UI shows "Most Compatible" guidance, untested); rejected document replaced by another type |
| Live edits | Unchanged save stays live; trust edits need re-review; admin restriction and corrections; dated pause and auto-resume | Edit during review / verification (CP06/CP07 stale decisions) | Pause with future bookings (UI warning) |
| Calendar | Overnight boundaries; Full-day vs day/night; bulk preview with bounded conflicts; owner blocks preserved by snapshots and auto-open; court block vs venue; CAL-07 quote stays valid; missing inventory never bookable; 10 × 30 portfolio | CAL-06 guest hold vs owner command (CP10 stale confirmations) | Hold countdown reaching zero in the drawer; bulk price with an unoffered slot |
| Bookings | Mixed visit states and partial cancellation (CP14); early arrival; no-show; caretaker revocation (CP16); 7-day contact window (new); phone search (new); unpaid checkouts hidden and relevant visit first | Auto-complete blocked by an incident (completion proof) | — |
| Money | Test vs live default; fee excluded; IST month boundaries; refunds; paged exports; draft → draft destination; step-up keeps the draft; account number separators | — | IFSC lookup failure |
| Notifications | Quiet hours; dedupe; fallback, retry and unknown outcomes; preferences | Muted category vs critical events; deep links after sign-in (Phase 10 return-path links) | Invalid number banner |
| Accessibility and responsive | axe 0 serious/critical on 14 routes; route-change focus; 360 px keyboard (simulated, Phase 11); polite toasts (Phase 10) | Calendar keyboard (arrow keys exist, cell labels now include state and price; no scripted test) | Greyscale calendar; keyboard-only wizard; physical-device keyboard checks |

## §14.3 definition of done — status

1. Completion records exist for every phase (§15.5–§15.18).
2. Backend and regression tests pass against disposable databases. ✅
3. Owner journey script (`owner-journey.mjs`, new owner → completed visit → earnings) **not written**. axe ✅ on 14 routes; viewport overflow ✅.
4. Screenshots: Phase 11 evidence holds 360 px shots; **1440 px shots for owner review not attached**.
5. Glossary check ✅.
6. Feature flags were not used (§15.17), so there is nothing to switch off.

## Repeat the gates

1. Start a local cluster: `initdb -D <dir> -U postgres --auth=trust`, then `pg_ctl -D <dir> -o "-p 55432 -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start`. The empty socket directory avoids macOS's 103-byte socket-path limit in deep temp folders.
2. Backend: `PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP01_TEST_DATABASE_URL=… npm test`.
3. Browser: follow the Phase 11 runbook to start `serve-property-review.mjs` and Next on 3107. Start Next with the **same** `RENTRA_BROWSER_FIXTURE_ID` used for the build, because the build directory depends on it. Then run `owner-phase11.mjs` and `owner-phase12.mjs` with `PLAYWRIGHT_MODULE` and `CHROME_PATH` set. On macOS: `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. The scripts default to a Windows Chrome path.
4. Send `stop` to the fixture API stdin, then check that no `rentra_test_%` databases remain.
