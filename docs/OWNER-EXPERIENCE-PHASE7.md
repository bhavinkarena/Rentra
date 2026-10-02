# Owner experience Phase 7 — calendar and bookings

Started 2 October 2026. **In progress; not deployed.** This record describes the current implementation, not completion of every §7 acceptance criterion.

## Implemented

The calendar derives occupied states and effective prices on the server using the shared IST schedule and weekend rules. It has real Monday-first month ranges, week and agenda views, portfolio rows, keyboard navigation and a lazy native dialog that becomes a side drawer or bottom sheet. Schedule settings have their own Booking rules page. Exact-period blocks reuse the guarded command, including the court timeline's drag/keyboard/mobile entry. Active future blocks are filtered; court conflicts are scoped correctly.

Selected-slot closes/reopens, absolute price changes, percentages from base and resets preview every affected cell and apply atomically under the inventory mutex. Confirmation hashes the selected window and exact inputs. Price and slot Undo lasts ten seconds, checks the post-write window before restoring prior rows and recreates deleted overrides correctly. Active reservations prevent closure. Booking prices already accepted by guests are unchanged.

Offline bookings use committed owner-block inventory with private guest details. They appear in Today and assigned caretaker views and create no payment, commission or earning. Per-property iCalendar secrets are stored as hashes; regeneration invalidates the old subscription. Feeds exclude contact, addresses and private notes.

Owner booking queues support Today arrivals/departures, guest-name/phone search, property/date filters and With Rentra. Detail leads with the next action, guest contact, visits and a private note of at most 500 characters. Payment provider details are collapsed. Visit notes are optional, time defaults to now, early check-in uses configuration, and failed or replayed upload attempts clean unreferenced private assets. Automatic completion requires recorded check-out older than 24 hours and no open incident or case.

Migration 0060 adds the no-show state and database proof guards. Only admin resolution of a no-show case can change an overdue, never-checked-in visit to no-show. It remains eligible for the existing captured-payment earning calculation. Supported mid-stay partial refunds reuse refund obligations, cap the amount by unreserved verified captures and retain existing provider restrictions. Nonzero accepted no-show refund policies are refused for refund review rather than silently treated as zero.

Caretaker guest contact is controlled by an owner toggle, defaults on and is limited to the actual visit day. Incident reporting uses the existing evidence and assignment checks; open incidents appear in the owner's Today tasks. Owner contact expires seven days after completion. Private notes never enter customer records or feeds.

## Verified locally

- Backend: 203 tests, 200 passed, zero failed, three skipped behind their own flags.
- Frontend: 70 tests passed, production build passed, lint passed for changed JavaScript files.
- Migrations: 61 SQL files and journal entries verified. Migration 0060 applied in disposable test databases only; the production Drizzle transaction also passed.
- Integration checks: atomic previews, conflicting closes, unrelated-window confirmation, reset Undo, stale Undo refusal, secret-feed revocation/privacy, private-note ownership, offline exclusion conflicts, optional notes, early-arrival bounds, automatic completion/replay, admin-only no-show proof and expired owner contact.
- [Browser evidence](evidence/owner-phase7/browser-checks.json): zero calendar axe violations, arrow-key navigation, price preview/confirm/Undo, owner detail/private-note saving, zero page errors and no overflow at 390 px. The browser uses a disposable API fixture.

## Completion (2 October 2026)

All remaining items were finished; full gates were repeated on the combined tree.

- **CAL-01:** portfolio read is one read-only snapshot with 6 statements regardless of property count (`owner-calendar.js`, version equal to `calendarSnapshot`); 10 properties × 30 days measured 5–21 ms against the 1.5 s gate (`test/integration/owner-calendar-finish.integration.test.js`). Arrival/departure markers, night bars continuing across days and months, guest/reason/custom-price lane details, live hold countdown, phone mini-month with spoken summary, sticky photo/title column, venue swipe columns.
- **CAL-02:** one-time Today task "Keep {title} open automatically?" for live farmhouses without an auto-open choice, one-click Turn on (`POST /partner/listings/:id/calendar/auto-open`); test confirms the daily `auto-open-dates` job fills dates to the horizon.
- **CAL-03:** active blocks paged 20 at a time; exact-block form prefilled from the first chosen slot; block release returns a 10-second Undo refused with `CALENDAR_CHANGED` when stale (shared `signUndo`).
- **CAL-04:** "Update Full day to Day + Night" one-click alignment inside the same atomic, undoable change; multi-lane Day/Night/Full day selection across selected dates.
- **CAL-05:** live now line on venue lanes; "Occupancy this week" court × 7-day table with week %; venue browser gate.
- **BOOK-01:** list cards with guest first name and count, next action and Call/WhatsApp (contact window same as detail); expandable multi-visit orders.
- **BOOK-06:** caretaker list and visit page show guest contact only on the visit day and only with "Can see guest contact on visit day" on; browser-verified both ways.
- **BOOK-08:** "Guest didn't arrive" pre-filled no-show case for confirmed visits past start without check-in. Captured partial-refund limits verified against the fake Razorpay provider (captured + 1 refused, exact captured accepted, further ₹0.01 refused). Arrival guide tab (landmark, parking, gate photo from property photos, include caretaker) and guest delivery through the customer outbox at T−24h and 07:00 IST on arrival day, deduped (one message when both fall within 6 h), cancelled when the visit or guide no longer qualifies.

**Not built (minor, noted in spec):** the CAL-05 "often empty" time hint (only percentages show) and dragging across lanes (selection uses checkboxes).

**Verification (combined tree):** backend 216/216 passed, 0 skipped (with `CP01_TEST_DATABASE_URL`); `db:check` verified 64 migration files and journal entries; frontend 74/74, eslint 0 errors (2 pre-existing warnings), production build with `RENTRA_BUILD_FIXTURE=1` passed. Browser gates: [calendar](evidence/owner-phase7/browser-checks.json) (plus `calendar-greyscale.png`) and [bookings](evidence/owner-phase7/bookings-checks.json), axe 0 and no page errors; the bookings gate ran on `next dev`.

**Migration:** 0063 adds the `arrival_guide` notification template. Apply with 0060 before the backend rollout. Disposable databases only.

**Owner actions:** register the arrival-guide SMS text under TRAI DLT before live delivery. No live migration or deployment has been performed.

## Repeatable checks

From `rentra-backend`, set `PORTAL_TEST_DATABASE_URL` (and `CP01_TEST_DATABASE_URL`) to the disposable local PostgreSQL cluster, then run `npm test` and `npm run db:check`. The helper rejects nonlocal database hosts and creates/drops its own databases.

From `Rentra`, run `npm test`, changed-file ESLint and `npm run build` with `RENTRA_BUILD_FIXTURE=1` to keep the user's development cache separate.

For the browser gate, start `test/helpers/serve-property-review.mjs` with `FIXTURE_STAGE=published`, `GATE_API_PORT=4106`, `GATE_WEB_ORIGIN=http://localhost:3107` and `CP06_GATE_FIXTURE` set to a temporary JSON path. Start Next with `RENTRA_BROWSER_FIXTURE=1`, a unique `RENTRA_BROWSER_FIXTURE_ID`, `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1` and port 3107. Then run `node scripts/portal-gate/owner-phase7.mjs` with the same fixture path and origin. It uses the installed Playwright CLI module; `PLAYWRIGHT_MODULE` and `CHROME_PATH` can override local locations. Stop the fixture with `stop` on its stdin to drop the disposable database. Never commit its session tokens.

On macOS set `PLAYWRIGHT_MODULE` to the npx Playwright `index.mjs` and `CHROME_PATH` to Google Chrome; the script defaults are Windows paths. The bookings gate is `scripts/portal-gate/owner-phase7-bookings.mjs` on ports 4116/3117 and needs a fresh fixture per run.
