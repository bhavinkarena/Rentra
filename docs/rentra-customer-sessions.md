# Rentra customer implementation sessions

Source of requirements: [Customer experience plan](rentra-customer-plan.html). This file turns its milestones U0–U6 into **22 bounded implementation parts**. Complete one part per session, including its relevant verification and a written handoff.

Parts **01–19** deliver the customer experience with **simulated transactions and ₹0 actually collected**. Parts **20–22** are a later real-payment project with explicit commercial and provider decisions. Completing an earlier part does not mean its whole U milestone is finished.

Token use varies with the files involved, existing code, debugging and verification. These are scope boundaries, not guarantees about a model's context size or a fixed number of tokens. Reserve room in each session to inspect the final diff, run checks and update this document. If evidence shows a part cannot fit, split its remaining work into a clearly named follow-up before proceeding; never mark an incomplete gate complete to fit a session.

## Current status and handoff

- **Completed parts:** 01–02 — COMPLETE (12 September 2026).
- **Next planned part:** 03 — payment/refund schema and provenance/accounting boundaries.
- **Release state:** implementation underway; the dummy-payment customer release is not complete.
- **Part 01 implemented files:** new [policy](../lib/domain/booking-policy.js), [calendar/interval rules](../lib/domain/booking-dates.js), [minor-unit pricing](../lib/domain/booking-money.js) and [legacy availability adapter](../lib/domain/booking-availability.js); [selection validation](../lib/validation/zod/booking.js); [public queries](../lib/db/queries.js); [availability route](../app/api/listings/[code]/availability/route.js); listing calendar/state/locality components. Legacy pricing now derives its rates from the shared policy while retaining whole-rupee inputs/outputs.
- **Part 01 verification:** `npm run verify:customer-foundation` — 28 scenario groups passed, including child Node processes in Honolulu, New York and Tokyo; `npm run lint` — no errors, four existing image-element warnings in OG/icon files; `npm run build` — passed, 39 static pages generated. The first sandboxed build could not read the database (`EACCES`); the permitted build with database network access passed. A scan of 102 generated listing HTML/RSC artifacts found no serialized private location/contact/access field keys. The roadmap has 22 unique part headings and maps all 18 acceptance scenarios.
- **Part 01 limitations at its original gate:** no schema migration, customer login, persisted quote/order/hold/payment or authoritative overlap constraint was implemented in Part 01. Existing price boxes still use legacy local estimates and do not reconcile date overrides; Parts 04/10 replace that split. Legacy `full` availability remains advisory day-plus-night availability, not evidence of a safe physical interval. New interval helpers reject missing schedules and unsupported timezones. This session did not perform browser accessibility, concurrent database booking or production deployment checks.
- **Part 02 implementation:** repaired missing `paymentMode`, `visitProvenance` and `bookingOrder` definitions; added quote/order/visit snapshots, currency/timezone/minor-unit data, composite parent scope and a staged single-property interval ledger. Reviewed migration [0008](../drizzle/0008_customer_reservations.sql) includes custom GiST exclusion and corrected FK/index ordering. Added [audit/backfill CLI](../scripts/customer-legacy.mjs), shared conversion planning, repeatable transactional backfill, explicit fresh-seed provenance and [database verification](../scripts/verify-customer-reservations.mjs).
- **Part 02 verification:** `npm run verify:customer-reservations` — all 10 groups passed against a newly provisioned disposable PostgreSQL database, including full/repeated migrations, legacy FK/value preservation, concurrent backfill reruns, source-drift rejection, zero-money/scope constraints, GiST overnight/touching/released intervals, simultaneous allocation with one winner, and development seed/backfill/repeat. Test database cleanup succeeded. `verify:customer-foundation` — 28 passed; `lint` — passed; `build -- --webpack` — passed, 39 static pages; `db:generate` — no schema drift. Default Turbopack remained blocked by the environment port-binding restriction after escalation; the supported Webpack build verified compilation and static generation.
- **Part 02 rollout state:** no migration, backfill or seed was applied to the configured Rentra database in this session. Its read-only audit found 44 eligible legacy rows; rent/fee/deposit/reported-advance minor totals reconcile to 37,100,000 / 2,968,000 / 22,800,000 / 12,243,000. All 44 have unknown hours/settlements/provenance; none is currently active. Details and approved-deployment commands: [Part 02 runbook](rentra-customer-part02.md).
- **Next-session notes:** implement Part 03 only. Preserve the custom exclusion SQL when generating later migrations. The new ledger is not yet authoritative; Part 04 remediates intervals and switches readers/writers. Part 03 must gate existing legacy revenue/payout queries and add payment/refund tables. Apply the expansion before deploying readers that select the new booking columns; never treat the configured database as disposable.

Part 01 is intentionally a foundation slice: policy configuration, property-local date/interval helpers, money primitives, strict multi-visit input validation, legacy owner-block/date-range corrections and public location privacy. Its initial timezone implementation supports `Asia/Kolkata` and fails closed for unsupported zones. It does **not** deliver the authoritative quote service, transactional overlap protection, persisted multi-visit checkout or unified calendar/price-box totals. Those have separate gates below.

## Rules carried through every part

- One order belongs to one authenticated customer, listing, property timezone and INR currency. The initial selection contains 1–10 unique visit dates using the same slot and guest count.
- A selected date is the property's local visit-start date. Consecutive selections are individual visits; they do not imply continuous access between visits. Overnight end dates must be explicit.
- Owners must define exact slot hours and buffers. Do not assume `full_day` means 24 hours. Ambiguous or unsupported definitions must fail closed until remediated.
- Keep the proposed 10-minute checkout hold and other product limits in shared configuration. No hold is taken during login.
- Persist new money values in integer minor units with explicit names. Keep the existing 8% platform fee and illustrative future advance of 25% rent plus the full fee. Deposits are separate; do not invent a tax rate or collection obligation.
- A valid quote is not an inventory guarantee. Holds, confirmation, owner blocks, cancellation and expiry share the same listing-first lock discipline and active interval ledger.
- Confirm immediately after authorised validation and atomic allocation in the dummy release. Do not revive the old unimplemented owner-acceptance wait.
- Booking state, payment state and actual visit provenance are separate. Dummy captures, actual refunds and payout eligibility remain zero. A real completed visit can be reviewed even if its payment was simulated; seed/test/unvisited records cannot establish review eligibility.
- Validate ownership and active customer status inside every private query and mutation. Public HTML, API data, JSON-LD and serialized props must not contain exact arrival coordinates, address or access instructions.
- Do not publish invented ratings, verification claims, scarcity, protected-money claims or refund guarantees. Staff must be able to see and support confirmed visits before release.

## Session workflow

1. Read this status/handoff, the selected part, its source requirement sections and repository instructions. Inspect current code and uncommitted changes before deciding what remains.
2. Read relevant guides under the installed `node_modules/next/dist/docs/` before changing Next.js code. Reuse working repository conventions and avoid parallel business logic in actions and route handlers.
3. Implement only the selected part and necessary dependencies. Record newly discovered scope explicitly instead of silently starting the following part.
4. Run verification appropriate to the risk. Inventory, authentication and financial boundaries require meaningful integration/concurrency tests; document fixtures, prerequisites and any checks that could not run.
5. Review the diff, update the part status and handoff with actual evidence, and stop at that part's gate. Keep already committed booking data and inventory intact if a rollout needs to be disabled.

## Part map

Dependencies identify technical prerequisites. The numbered order is the recommended session sequence.

| Part | Requirement milestone | Deliverable | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 01 | U0 | Policy, dates, intervals, minor-unit money and public privacy foundations | None | COMPLETE |
| 02 | U0 | Reservation schema, legacy audit and backfill tooling | 01 | COMPLETE |
| 03 | U0 | Payment/refund schema and provenance/accounting boundaries | 02 | PLANNED |
| 04 | U0 | Authoritative quote and inventory service; owner block integration | 01–03 | PLANNED |
| 05 | U1 | Customer OTP, delivery and interrupted-login recovery | 01 | PLANNED |
| 06 | U1 | Customer shell, onboarding and account settings | 05 | PLANNED |
| 07 | U1 | Guest/account favourites and Saved page | 05–06 | PLANNED |
| 08 | U2 | Search, filters and real city/area routes | 04, 06–07 | PLANNED |
| 09 | U2 | Listing content, gallery and canonical sharing | 04, 06–08 | PLANNED |
| 10 | U2 | Multi-date picker and one quote-driven booking summary | 04–05, 09 | PLANNED |
| 11 | U3 | Atomic holds, dummy confirmation and expiry | 02–05 | PLANNED |
| 12 | U3 | Authorised checkout and recovery states | 10–11 | PLANNED |
| 13 | U3 | Confirmation/history, private arrival details and staff visibility | 12 | PLANNED |
| 14 | U4 | Partial cancellation and explicit change-support path | 11, 13 | PLANNED |
| 15 | U4 | Notification outbox, lifecycle evidence and calendar export | 11, 13–14 | PLANNED |
| 16 | U4 | Verified-visit reviews, moderation, replies and reports | 13, 15 | PLANNED |
| 17 | U4 | Help, versioned policies and operational support requests | 13–15 | PLANNED |
| 18 | U5 | SEO, accessibility, responsive and performance corrections | 08–10, 12–17 | PLANNED |
| 19 | U5 | Measurement, regression and dummy-release acceptance | 01–18 | PLANNED |
| 20 | U6 | Real-payment decisions and hosted checkout adapter | 19; policies/provider confirmed | LATER |
| 21 | U6 | Webhooks, reconciliation and captured-fund payouts | 20 | LATER |
| 22 | U6 | Real refunds, saved methods and verified real-mode rollout | 20–21 | LATER |

## Parts 01–19: complete customer release with simulated payments

### Part 01 — Booking and public-data foundations

**Deliver:** Central booking configuration; strict local-date parsing/range handling; property-local weekday and slot interval helpers; explicit overnight/buffer semantics; integer minor-unit pricing/conversion helpers; strict single/consecutive/separate selection validation. Correct legacy availability readers to respect owner blocks and property-local date boundaries. Remove exact location fields from public listing DTOs and their consumers.

**Boundary:** Initial timezone support is `Asia/Kolkata`; reject unsupported timezones. Preserve existing legacy rupee interfaces where needed until their migration. Do not treat existing unit counts or a pre-query as transactional inventory protection. Quote persistence, price-box unification and checkout follow in Parts 04/10/11/12.

**Verify:** Fixed-clock local-date and overnight boundary cases; duplicates/excess visits; invalid dates, money values and intervals; per-date override and rounding primitives; owner-block filtering; public serialized-field checks. Run relevant existing checks for changed consumers.

**Gate:** Foundation tests pass, the legacy display no longer offers owner-blocked rows through the corrected readers, public DTOs exclude exact coordinates, and remaining transactional/quote limitations are recorded. Contributes to A03/A06–A09/A13/A14; does not complete those end-to-end scenarios alone.

**Implemented contract notes:**

- `bookingSelectionSchema` accepts `{ rentableId, dates, slot, guests, currency? }`, defaults currency to INR, sorts a copy of 1–10 valid unique dates and rejects client totals/identity fields. `consecutiveVisitDates(start, end)` expands inclusive visit-start dates before validation.
- `visitInterval` requires an enabled owner schedule with `startTime`, `endTime`, explicit `endDayOffset`, `bufferBeforeMinutes` and `bufferAfterMinutes`. `buildVisitIntervals` also requires explicit lead time and booking horizon; it rejects started/late/out-of-horizon and mutually overlapping visits. These are pure preflight checks, not inventory locks.
- `priceVisitsMinor` expects trusted minor-unit rates (`weekdayMinor`, `weekendMinor`, `depositMinor`, `includedGuests`, `capacity`, `extraGuestChargeMinor`) and date/slot overrides. Deposits and rounding are per visit; order totals sum the rounded visit components. Advance/balance fields are explicitly illustrative. This helper creates no payment or collection fact and is not a persisted quote.
- `legacyRupeesToMinor` is the explicit migration boundary; never multiply an already migrated minor amount. Existing `calculateBookingPrice` callers remain in whole rupees, verified by a compatibility assertion.
- Availability responses include an inclusive `from`/`to`, `timeZone`, `advisory: true` and `Cache-Control: no-store`. Owner blocks win even with positive legacy units. Calendar results are scoped to listing/retry; a failed load disables dates and offers retry instead of selecting stale suggestions. Browser rendering uses UTC calendar containers and property-local today.
- Public listing data no longer selects or returns the property's exact coordinates; its location illustration uses locality names only. Existing deployed caches require a fresh deployment/revalidation when these changes are released.

### Part 02 — Reservation schema and legacy audit

**Status:** COMPLETE — implementation and disposable-database gate passed. Configured-database rollout remains unapplied. See the [runbook](rentra-customer-part02.md) for reviewed commands, reconciliation totals and Part 03/04 boundaries.

**Deliver:** Reviewed additive Drizzle migrations for `booking_quote`, `booking_order`, inventory reservations and extended visit fields. Add quote/version/policy snapshots, explicit currency/timezone/local day/timestamps, minor-unit amounts, idempotency and visit provenance. Retain existing booking IDs and review/payout references. Build a dry-run legacy audit, repeatable conversion/backfill and reconciliation report.

**Verify:** Apply migrations to a disposable database; exercise seed, historical and unknown-hour cases; rerun backfill without double conversion; reconcile row counts, IDs and rupee-to-minor totals. Verify target database support for the required GiST equality/exclusion mechanism before enabling it.

**Gate:** Additive schema and reviewed backfill are ready, unknown hours/settlements are explicitly reported, and no legacy payment is invented. Constrain/switch authoritative inventory only after remediation. Supports A03/A06/A09/A10/A13; next is payment schema, then authoritative quoting.

### Part 03 — Payment data and accounting boundaries

**Deliver:** Provider-independent payment order, attempt, transaction, allocation, refund, refund-allocation, payment-event and customer-method tables. Enforce external identity namespaces, immutable provenance, real/simulated distinctions and integer amounts. Add accounting/payout filters so confirmation, simulation and legacy-unknown money cannot create captured-fund revenue or payable balances. Dummy mode leaves saved methods empty.

**Verify:** Database constraints for unique identities, amount validity and simulated zero-actual-money rules; reconciliation fixtures with seed, simulated and captured records; no double-counting authorisation and capture facts. Do not expose real checkout yet.

**Gate:** The complete payment structure exists before gateway integration and no simulated funds enter revenue/payout calculations. Covers A13 schema/accounting foundations; prepares A17/A18.

### Part 04 — Authoritative quotes and inventory rules

**Deliver:** One server quote contract with canonical selection, exact intervals, per-visit override/guest charges, deposit/policy snapshots, version/hash and expiry. Derive public availability from owner inputs plus active inventory. Implement shared inventory locking/overlap operations and route owner blocking through the same discipline. Audit/remediate legacy active intervals before switching authority. Provide bounded availability/conflict responses for search and calendars.

**Verify:** Calendar and quote parity, blocked-date/lead-time/horizon/capacity cases, next-day/buffer/full-day conflicts, exclusion boundaries and concurrent owner-block writes in a real test database. Unsupported windows remain unavailable. Verify changed policy/price produces a replacement quote.

**Gate:** A single authoritative quote service rejects invalid selections; active intervals and owner inputs agree; owner blocks cannot race past the shared guard. A03/A06–A09 foundation gates pass. Customer hold/confirmation endpoints remain Part 11.

### Part 05 — Customer identity and OTP delivery

**Deliver:** Customer request/verify OTP actions using configured delivery, short expiry, hashed challenges, atomic one-time consumption, phone/IP limits and attempt/resend caps. Create active customer accounts without changing partner roles. Enforce blocked/suspended status and explicit wrong-role switching. Preserve a validated short-lived selection across login, allow only safe internal return paths and requote after return.

**Verify:** Concurrent OTP replay, expired/wrong challenges, delivery failure, rate limits, safe redirects, session revocation/status changes and separate customer/partner accounts using one phone. Production cannot enable developer OTP shortcuts.

**Gate:** A01/A02 identity cases pass and an interrupted guest returns to the selected listing/dates/guests. Report missing external delivery configuration as a deployment prerequisite, not a working production capability.

### Part 06 — Customer shell, onboarding and account

**Deliver:** Consistent Saved/Bookings/Account navigation and shared responsive form/status primitives using the existing design system. First-login name collection, optional email, separate marketing consent, profile/preferences, privacy/deletion request path and logout. Reverify changed phone/contact delivery where used. Add the no-payment-method-needed empty state; no card or UPI input in dummy mode.

**Verify:** Ownership and conflicting-phone checks; wrong-role session handling; logout/session cache clearing; keyboard/focus/errors and 360px layout. Privacy requests must use a real persistence/support mechanism rather than a false submitted message.

**Gate:** Customer account settings work within the authenticated account and the shell has honest route availability. Supports A01/A14/A16.

### Part 07 — Saved places across guest and account journeys

**Deliver:** Favourites schema/actions/query DTOs, guest-local hearts, idempotent account merge and Saved page. Retain date context where valid; remove with undo; represent unpublished listings as removable unavailable cards. Optimistic failures restore previous state.

**Verify:** Merge replay, unique customer/listing pairs, account isolation, cross-device persistence, logout cleanup and failed save/undo states.

**Gate:** A15 saved-place cases pass; no account's private shortlist leaks into another session.

### Part 08 — Search and implemented location routes

**Deliver:** URL-driven location/date-mode/slot/guest/budget/amenity/cancellation filters, chips, clearing, result count, pagination and supported sorts. Match availability across every selected date. Implement useful city/area/intent pages and a validated slug registry with collision handling. Connect home/category/footer links to actual destinations and truthful card price bases.

**Verify:** Filter parsing limits, total-price sorting, all-date availability, unsupported slugs, empty/error results and Back navigation. Selected-date totals use server pricing; undated cards identify their from-price unit and excluded charges.

**Gate:** Discovery routes work without dead links and a failed date/filter has a useful recovery path. Supports A07/A08/A16.

### Part 09 — Listing detail, gallery and sharing

**Deliver:** Photo-led detail order, accessible gallery/lightbox, fast facts, explicit included/extra/unavailable/unknown amenity states, precise slot hours, capacity/rules, real review content and evidence-based host verification. Use approximate public location. Provide canonical native/copy/WhatsApp sharing and corrected image URL normalization.

**Verify:** Missing images/amenities/reviews, paused listings, keyboard gallery/focus restoration, share cancellation/clipboard failure, absolute image URLs and no private URL parameters or location data.

**Gate:** A customer can understand the offering and restrictions on mobile/desktop; trust and sharing are factual. Supports A14/A16. The unified interactive quote summary follows in Part 10.

### Part 10 — Multi-date picker and shared quote state

**Deliver:** Single/consecutive/separate modes, dated removable chips, preserved month navigation, slot/guest revalidation, per-visit exact hours and prices. One shared selection and accepted server quote powers the calendar, desktop panel and mobile summary/sheets. Replace independently derived totals and explain price changes and visit gaps.

**Verify:** A03/A08/A09 selections and pricing through the UI; unavailable middle date; date-removal semantics; keyboard and status announcements; mobile focus/safe-area behavior. Quote expiry/conflicts retain valid selections and identify dates needing attention.

**Gate:** Displayed final totals agree with the server quote for up to ten visits and “Review booking” preserves the complete selection through login. Booking persistence remains Parts 11/12.

### Part 11 — Atomic holds and dummy confirmation

**Deliver:** Customer-owned hold/confirm services and endpoints, stable idempotency keys/request hashes, conditional hold expiry and lock ordering across affected orders. Allocate the complete visit set or roll back. Confirm all visits with server-selected dummy provider records, zero actual allocations and a unique persisted `DUMMY_TXN_…` reference. Add expiry job and lifecycle event/outbox integration points.

**Verify:** Real database races for last-space claims, owner blocking, overlapping slot names, stale-hold expiry and confirmation. Lost responses/replayed requests return one outcome; reused key with altered payload conflicts. No external network call inside a database transaction.

**Gate:** A04–A07/A10/A11/A13 service scenarios pass: one winner, no partial group, no double release and ₹0 collected. UI checkout is Part 12.

### Part 12 — Checkout with explicit acceptance and recovery

**Deliver:** Owned draft/hold checkout showing contact/guests/required purpose, each visit and hours, rent/fee/deposit/policy terms, countdown and “Confirm booking — no payment collected.” Handle expired holds, new quotes, conflicts, validation, duplicate clicks, session expiry and unknown/lost-response outcomes using the shared services.

**Verify:** Customer login-to-checkout flows for one/consecutive/separate dates; explicit price/policy reacceptance; recoverable timeout; neutral not-owned responses; keyboard submission and focus on errors.

**Gate:** A customer can persist a booking with an honest simulated payment result; retry recovers the original reference. Supports A01/A03/A08/A10/A13/A14/A16.

### Part 13 — Booking records and owner/admin visibility

**Deliver:** Durable confirmation, paginated/searchable Upcoming/Past/Cancelled history, per-visit timeline and mixed-order display, immutable listing snapshots, separate booking/payment badges and receipt-style summary download. Protect exact arrival/contact details by ownership. Update operational owner/admin readers so grouped references and confirmed child visits are visible.

**Verify:** Refresh/direct navigation, unowned references/receipts, paused/retired listings, mixed children, zero-collection wording and regression of owner/admin access.

**Gate:** Persisted records explain what was booked and staff can operate those visits. Supports A10/A12/A13/A14; no customer release can bypass this staff-visibility dependency.

### Part 14 — Per-visit cancellation and change handling

**Deliver:** Authorised policy-snapshot cancellation preview and commit for all or selected unstarted visits; conditional reservation release, events, receipt and refreshed parent state. Explain “No money was collected; no refund is due.” Use an explicit supported change-request path in v1; do not edit dates in place or promise atomic self-service changes before implementing them. Connect structured support requests in Part 17.

**Verify:** One-of-three cancellation, repeated/cross-customer cancellation, start-time cutoff, concurrent expiry/confirmation and preserved unaffected visits. Simulated refund scenarios always have actual refunded amount zero.

**Gate:** A12/A13/A14 cancellation cases pass. Future visits release exactly once; started visits reach a truthful operational support route.

### Part 15 — Durable communication and actual visit lifecycle

**Deliver:** Notification outbox schema/transactional writes, configured delivery worker, deduplicated confirmations/reminders/cancellations/review invitations and retry monitoring. Suppress obsolete reminders. Define owner/admin handover/return evidence and completion transitions; scheduled dates passing alone cannot complete a visit. Add timezone-correct calendar export and Book again with new availability validation.

**Verify:** Duplicate worker delivery, failed channel/retry, cancellation before reminder, evidence-based completion and calendar timezone/overnight content. Delivery failure cannot undo a confirmed booking.

**Gate:** Lifecycle evidence is sufficient for review eligibility and communication has durable, visible outcomes. Supports A09/A11/A15 and the U4 operational gate.

### Part 16 — Reviews with honest publication

**Deliver:** Customer review form selecting an eligible completed visit; 1–5 checks and unique booking/author constraint; optional subscores, moderation/publication status, owner replies and reports. Public aggregates include only eligible published customer reviews. Keep guest-targeted feedback separate.

**Verify:** Duplicate reviews, wrong customer, cancelled/no-show/incomplete/test/seed visit restrictions; real completed visits with simulated payments; equal moderation for low/high scores; aggregate/cache updates after publication changes.

**Gate:** A15 review scenarios pass and the public listing displays only evidence-backed review counts/scores.

### Part 17 — Help, policies and operational support

**Deliver:** Searchable practical FAQs, versioned cancellation/terms/privacy pages, booking-linked persisted support requests, customer status/replies and staff inbox. Connect history, cancellations, change requests and account privacy requests. Publish actual support channels/hours and retained-record policy; do not imply unattended live chat.

**Verify:** Persist-before-success behavior, customer/staff ownership, private request noindex, state/reply transitions and booking/policy context. Do not expose another customer's reference or message.

**Gate:** Customers and staff can follow a support request to a visible resolution state. Covers A14/A16 support boundaries and completes the v1 change-support path.

### Part 18 — Public visibility, accessibility and performance

**Deliver:** Audit rendered titles/canonicals/OG/Twitter/JSON-LD, renamed/paused/deleted listing behavior and sitemap coverage. Index only useful canonical public pages; search combinations and personal routes follow the documented noindex policy. Correct mobile overflow, controls/focus/contrast, screen-reader errors/announcements, reduced motion, image sizing and heavy map loading. Use truthful listing schema; VacationRental eligibility is a later conditional project.

**Verify:** Rendered route crawl and metadata assertions; keyboard/screen-reader critical journeys at 360px/390px/tablet/desktop; image/layout performance checks. Record lab observations separately from field Core Web Vitals targets (75th percentile LCP ≤2.5s, INP ≤200ms, CLS ≤0.1).

**Gate:** A16 passes with recorded evidence and no private serialization regressions under A14. Report unmeasured field targets honestly.

### Part 19 — Full dummy-release acceptance and measurement

**Deliver:** Bounded funnel/operational events, delivery/conflict/expiry alerts and service health visibility. Separate `payment_mode=simulated`, booking value and real revenue; exclude seeds/document demos. Finish focused regressions and release handoff for customer, partner and admin flows.

**Verify:** Run A01–A16 as an integrated release matrix with real database concurrency for risky services and browser evidence for critical UX. Analytics/logs contain no phone, OTP, access code, exact address or payment token. Required repository checks pass, or a concrete unresolved blocker prevents release.

**Gate:** The complete simulated customer journey has no dead-end actions, staff can operate/support visits, money truth reconciles and the handoff lists the verified release state. Do not enable real payments as part of this gate.

## Parts 20–22: later real-payment release

### Part 20 — Explicit policies and verified hosted checkout

**Deliver:** Record the chosen provider/environment and explicit collection schedule, tax, deposit, refund and supported-method policies before exposing real payment choices. Implement hosted checkout through a provider-independent adapter, server order creation, checkout-response verification and status fetching. Preserve historical simulated provenance.

**Verify:** Provider sandbox success/failure/unknown outcomes, amount/currency/order linkage, signature validation and controlled configuration. A browser success message cannot mark an order paid. No PAN/CVV/UPI PIN/bank-login credential storage.

**Gate:** Policy prerequisites are resolved and verified captures work in sandbox. Begins A17; production real mode stays disabled pending Parts 21/22.

### Part 21 — Durable webhooks and reconciliation

**Deliver:** Verify and persist provider events before acknowledgement; deduplicate and retry processing; reconcile out-of-order/late/unknown outcomes. Under inventory locks, reacquire expired visits only if permitted and available, otherwise create a visible refund/reconciliation obligation. Enable payout eligibility only from verified captured allocations.

**Verify:** Duplicate/out-of-order/wrong-signature/wrong-amount events, interrupted event handling, stale failure after capture and late capture racing another booking. Reconcile provider and internal totals without double allocation.

**Gate:** A17 and A18 late-capture cases pass. Captures cannot force an overbooking or create duplicate captured funds/payouts.

### Part 22 — Real refunds, saved methods and real-mode gate

**Deliver:** Persist refund obligations and reserved amounts before provider calls; cap by remaining captured allocations; support selected-visit/component refunds, retry and reconciliation. Add only provider-supported token labels/default/removal/revocation operations with customer ownership. Finalize sandbox reconciliation and explicit real-mode configuration for new orders.

**Verify:** Concurrent refund cap, partial refund, failure/retry and late-event cases; no double refund; actual deposit treatment; token isolation/revocation. Re-run relevant booking/expiry/cancellation races and preserve zero actual money for historical simulations.

**Gate:** A18 passes, actual funds reconcile and payment copy matches persisted outcomes. Enable real mode only after the concrete provider/policy and release gates are satisfied.

## Acceptance traceability

These are the source document's A01–A18 checks. A part can contribute primitives without completing the full acceptance scenario; Part 19 consolidates A01–A16, and Parts 21/22 close the future-payment cases.

| Acceptance ID | Scenario | Implementation and verification parts |
| --- | --- | --- |
| A01 | Login interruption and role conflict | 05, 06, 10, 12, 19 |
| A02 | OTP replay and brute force | 05, 19 |
| A03 | Single/consecutive/separate visits | 01, 02, 04, 10–12, 19 |
| A04 | One unavailable date leaves no partial group | 04, 11, 12, 19 |
| A05 | Last-space race has exactly one winner | 04, 11, 19 |
| A06 | Full-day/night/next-day and buffer overlap | 01, 02, 04, 11, 19 |
| A07 | Owner block overrides positive legacy units | 01, 04, 08, 11, 19 |
| A08 | Override/guest/policy changes and money rounding | 01, 04, 08, 10, 12, 19 |
| A09 | Property timezone and overnight boundary | 01, 02, 04, 10, 15, 19 |
| A10 | Duplicate click, lost response and refresh | 02, 11–13, 19 |
| A11 | Hold expiry and repeated expiry worker | 11, 14, 15, 19 |
| A12 | Partial and repeated cancellation | 13, 14, 19 |
| A13 | Simulated-money truth and payout exclusion | 01–03, 11–14, 19; preserved in 20–22 |
| A14 | Ownership and public/private serialized data | 01, 05–07, 09, 12–14, 17–19, 22 |
| A15 | Save merge and eligible unique reviews | 07, 15, 16, 19 |
| A16 | Public content, metadata and usability | 06, 08–10, 12, 17–19 |
| A17 | Future verified capture and webhook replay | 20, 21 |
| A18 | Future refund cap and late capture | 21, 22 |

## Next-session prompt

Copy this prompt into a new implementation session after the current part's handoff is complete:

> Read `docs/rentra-customer-sessions.md`, its current status/handoff, and the relevant sections of `docs/rentra-customer-plan.html`. Inspect repository instructions, current code and uncommitted changes. Implement the next incomplete part only, using the current status above to select the part. Follow its dependency and acceptance gates; read the installed Next.js guides before changing Next.js code. Preserve existing work, run meaningful checks, and update the part status/handoff with changed files, verification evidence, remaining limitations and the next starting point. Do not enable real payments or mark broader milestones complete prematurely.

Use the same prompt for later sessions; the recorded status decides the next part. Finish any unresolved gate in the current part before beginning the next part.
