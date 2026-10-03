# Owner workspace UI refresh — 3 October 2026

The owner header now has a global search field, and both logo lockups place “for owners” below Rentra. The question-mark help controls were removed from the workspace header and page titles; Help & support remains available in navigation.

## Requested behavior

- **Search:** `/partner/search` searches owned properties, booking references, support subjects/references, public guest reviews, disputes and caretakers. Results have type filters and pagination. The new `/api/v1/partner/search` endpoint checks account status and ownership inside the service as well as the authenticated route. Applicants can search their property drafts and support requests. Private conversation bodies and guest phone numbers are not returned.
- **Dashboard:** summary tiles, a booking overview with property/date/status filters, today's visit and offline booking tables, action category filters with eight-row pages, weekly visits, recently updated properties, workspace destinations and latest updates. Counts that cover the entire portfolio are labeled explicitly. Property summaries show the six most recently updated properties, with a link to the full list. Account verification and setup guidance remain available.
- **Calendar:** the page starts with a property table and property name/status filters. Selecting a property opens its month calendar in a large modal. Month/week/agenda/multi views, IST date details, open/close commands, date prices, blocks, offline bookings and existing court timelines remain available. Closing a date detail leaves the property calendar open. Closing either modal respects the existing unsaved form guard.
- **Bookings:** filtered, paginated tables in both the cached and server-rendered paths. View opens the existing complete owner record in a modal, including contacts, every visit, lifecycle actions, notes, evidence, cases, accepted policies, payment details and downloads. Modal close preserves the list filters; direct booking-detail URLs still work.
- **Other record lists:** properties, guest reviews, support, disputes, inbox, caretakers, membership history, earnings/statements, active sessions, privacy requests, calendar feeds, payout-method history and property activity/policy history now use tables. Horizontal scrolling stays inside the table at small widths. Existing review replies, access management, private downloads and print behavior are preserved.

## Validation recorded for this change

| Check                                                    | Result                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Frontend lint                                            | Passed                                                                                                                          |
| Frontend tests                                           | 79 passed, no failures or skips                                                                                                 |
| Isolated production build                                | Passed; static sitemap requests used their existing API-network fallback                                                        |
| Backend tests with both local integration-database flags | 220 passed, no failures or skips                                                                                                |
| New owner-search integration test                        | Passed: authorization, applicant boundaries, literal wildcard handling, reference lookup and pagination                         |
| Browser gate                                             | 45 passed: 32 screen checks at 360/1280 px and 13 workflow checks                                                               |
| Accessibility and page width                             | No WCAG 2 A/AA or 2.1 A/AA violations or page overflow in the checked screens/modal states                                      |
| Modal workflows                                          | Booking details, independent nested calendar dialogs, month navigation, mobile sizing, and unsaved note/block protection passed |
| Earnings                                                 | Populated rent/refund rows and an A4 statement PDF passed                                                                       |

Browser checks used the disposable owner communications fixture with fake finance evidence added locally. Notifications were disabled; no live provider or production database was used. Checks establish the listed local behavior, not production readiness. The earlier [owner experience review](OWNER-EXPERIENCE-REVIEW.md) remains the record of separate delivery, contact-feedback and release-gate findings.

## Review artifacts

- [Browser results](evidence/owner-workspace-ui/browser-checks.json)
- [Desktop dashboard](evidence/owner-workspace-ui/dashboard-desktop.png), [mobile dashboard](evidence/owner-workspace-ui/dashboard-mobile.png)
- [Bookings table](evidence/owner-workspace-ui/bookings-desktop.png), [booking detail modal](evidence/owner-workspace-ui/booking-modal.png)
- [Property calendar modal](evidence/owner-workspace-ui/calendar-modal.png)

The reusable gate is [owner-workspace-ui.mjs](../scripts/portal-gate/owner-workspace-ui.mjs). Run it against `test/helpers/owner-communications-browser.mjs` and an isolated Next frontend; supply `OWNER_COMMUNICATIONS_FIXTURE`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and optionally `GATE_WEB_ORIGIN`/`OWNER_UI_EVIDENCE_DIR`. It refuses a nonlocal or nondisposable database fixture. Screenshots and results default to a temporary directory. A fixture `money.period` enables the additional populated finance/PDF check. Older layout-dependent phase scripts have updated table/modal selectors; their full original fixture runs were not rerun for this refresh.

Both frontend and backend changes must be loaded to use global search. No database migration is required.

## Dashboard analytics — 3 October 2026

The approved-owner dashboard now includes an analytics panel using Rentra’s existing light theme, forest-green brand colors, card surfaces, borders, and typography, with the chart layout inspired by the supplied reference: selected-period summary cards, booked-rent and visit trends, booking-status and property-category doughnuts, and a 12-month booked-rent bar chart. Today, 7-day, 30-day and 90-day controls change the daily trends and summary cards; status distribution is explicitly labelled as 90 days, and categories cover the whole portfolio. Refresh re-fetches dashboard data. CSV exports the selected daily series. Each trend includes an expandable data table.

The new `analytics` section on the existing owner Today API aggregates all matching visits rather than the paginated booking records. Booking attribution uses the immutable order snapshot owner ID. Draft, held and expired orders are excluded. Rent excludes cancelled visits, guest fees and deposits; visits include cancellations. Periods use visit local dates in India time, include zero-filled days/months, and end today. Historical orders without snapshot owner attribution are excluded. Test/simulated visits are included and the UI states that quoted rent is not collected revenue or a payout. No payout rail or database migration was added.

Validation: all 79 frontend tests passed; ESLint passed for the changed frontend components/page and backend service/test; the owner Today integration test passed against a disposable local PostgreSQL cluster, including 90-day/12-month series lengths, rent totals, owner isolation, and cancellation exclusion. The isolated production build passed with Webpack; static pages logged API network warnings and used existing fallbacks. The default Turbopack build stalled and was stopped. Production browser appearance was not manually verified in this change.

Theme follow-up: analytics cards, controls, labels, and SVG chart colors now use existing Rentra CSS tokens. Removed the hard-coded dark/neon palette. ESLint and Prettier passed for `OwnerAnalytics.jsx` after this styling-only change.

Hydration fix: replaced analytics runtime locale formatting with deterministic date, INR, and axis formatters. Browser and Node locale datasets can produce different September abbreviations (`Sept` versus `Sep`), even with an explicit locale and timezone. Charts now format the supplied IST calendar-date strings directly; all rendered number labels also avoid runtime locale data. Two regression tests passed, including with locale formatting APIs disabled; ESLint and Prettier passed for the changed files. The reported browser hydration error was not re-tested in an authenticated browser session.
