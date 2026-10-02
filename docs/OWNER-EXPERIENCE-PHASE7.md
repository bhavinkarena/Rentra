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

## Remaining before Phase 7 completion

- CAL-01: batch portfolio snapshot reads; measure the ten-property, thirty-day 1.5-second gate; complete arrival/departure markers, cross-month night bars, phone mini-month, sticky property/photo column and venue swipe columns. Hold countdown and greyscale/mixed-state fixtures still need their own browser gates.
- CAL-03: paginate active blocks, prefill exact block times from a slot and support guarded Undo for block release. Current ten-second Undo covers slot and price changes.
- CAL-04: finish the one-click full-day alignment warning and multi-lane selection; the current warning asks the owner to select Full day for a separate preview.
- CAL-05: finish the live now line and court/week occupancy summaries; run a venue browser gate.
- CAL-02: finish the one-time existing-property auto-open opt-in task and verify the worker schedule. Auto-open itself preserves existing closes.
- BOOK-01/06/08: finish list-card guest/action/contact and expandable multi-visit details, caretaker list contact and WhatsApp links, and a prefixed overdue no-show case action. Verify contact-toggle behaviour in a browser and captured partial-refund limits against the provider fixture.
- BOOK-08 / Phase 9: arrival-guide editing and T−24h/morning guest outbox delivery. Storage exists; delivery is not implemented.
- Repeat the full gates after those changes. No live migration or deployment has been performed.

## Repeatable checks

From `rentra-backend`, set `PORTAL_TEST_DATABASE_URL` to the disposable local PostgreSQL cluster, then run `npm test` and `npm run db:check`. The helper rejects nonlocal database hosts and creates/drops its own databases.

From `Rentra`, run `npm test`, changed-file ESLint and `npm run build` with `RENTRA_BUILD_FIXTURE=1` to keep the user's development cache separate.

For the browser gate, start `test/helpers/serve-property-review.mjs` with `FIXTURE_STAGE=published`, `GATE_API_PORT=4106`, `GATE_WEB_ORIGIN=http://localhost:3107` and `CP06_GATE_FIXTURE` set to a temporary JSON path. Start Next with `RENTRA_BROWSER_FIXTURE=1`, a unique `RENTRA_BROWSER_FIXTURE_ID`, `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1` and port 3107. Then run `node scripts/portal-gate/owner-phase7.mjs` with the same fixture path and origin. It uses the installed Playwright CLI module; `PLAYWRIGHT_MODULE` and `CHROME_PATH` can override local locations. Stop the fixture with `stop` on its stdin to drop the disposable database. Never commit its session tokens.
