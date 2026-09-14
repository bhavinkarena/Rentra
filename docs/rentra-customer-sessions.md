# Rentra customer implementation sessions

Source of requirements: [Customer experience plan](rentra-customer-plan.html). This file turns its milestones U0–U6 into **22 bounded implementation parts**. Complete one part per session, including its relevant verification and a written handoff.

**Payment decision updated 13 September 2026:** [Admin-controlled Razorpay Test flow](rentra-payment-flow.md) replaces dummy-only checkout from Part 04 onward. Parts **01–19** deliver provider-integrated sandbox checkout with **₹0 actual bank money**, and Parts **20–22** cover later live commercial/settlement rollout. Admin settings default to disabled; enabling selects Razorpay Test, with no dummy/live fallback. Completed Parts 01–03 and their runbooks remain historical evidence, not the future payment-flow specification.

Token use varies with the files involved, existing code, debugging and verification. These are scope boundaries, not guarantees about a model's context size or a fixed number of tokens. Reserve room in each session to inspect the final diff, run checks and update this document. If evidence shows a part cannot fit, split its remaining work into a clearly named follow-up before proceeding; never mark an incomplete gate complete to fit a session.

## Current status and handoff

- **Completed parts:** 01–02 — COMPLETE (12 September 2026); 03–05 — COMPLETE (13 September 2026); 06 — COMPLETE (14 September 2026).
- **Next planned part:** 07 — guest/account favourites and Saved page.
- **Release state:** implementation underway; the Razorpay Test customer release is not complete. The revised payment flow is approved direction, not evidence that the provider is connected.
- **Part 01 implemented files:** new [policy](../lib/domain/booking-policy.js), [calendar/interval rules](../lib/domain/booking-dates.js), [minor-unit pricing](../lib/domain/booking-money.js) and [legacy availability adapter](../lib/domain/booking-availability.js); [selection validation](../lib/validation/zod/booking.js); [public queries](../lib/db/queries.js); [availability route](../app/api/listings/[code]/availability/route.js); listing calendar/state/locality components. Legacy pricing now derives its rates from the shared policy while retaining whole-rupee inputs/outputs.
- **Part 01 verification:** `npm run verify:customer-foundation` — 28 scenario groups passed, including child Node processes in Honolulu, New York and Tokyo; `npm run lint` — no errors, four existing image-element warnings in OG/icon files; `npm run build` — passed, 39 static pages generated. The first sandboxed build could not read the database (`EACCES`); the permitted build with database network access passed. A scan of 102 generated listing HTML/RSC artifacts found no serialized private location/contact/access field keys. The roadmap has 22 unique part headings and maps all 18 acceptance scenarios.
- **Part 01 limitations at its original gate:** no schema migration, customer login, persisted quote/order/hold/payment or authoritative overlap constraint was implemented in Part 01. Existing price boxes still use legacy local estimates and do not reconcile date overrides; Parts 04/10 replace that split. Legacy `full` availability remains advisory day-plus-night availability, not evidence of a safe physical interval. New interval helpers reject missing schedules and unsupported timezones. This session did not perform browser accessibility, concurrent database booking or production deployment checks.
- **Part 02 implementation:** repaired missing `paymentMode`, `visitProvenance` and `bookingOrder` definitions; added quote/order/visit snapshots, currency/timezone/minor-unit data, composite parent scope and a staged single-property interval ledger. Reviewed migration [0008](../drizzle/0008_customer_reservations.sql) includes custom GiST exclusion and corrected FK/index ordering. Added [audit/backfill CLI](../scripts/customer-legacy.mjs), shared conversion planning, repeatable transactional backfill, explicit fresh-seed provenance and [database verification](../scripts/verify-customer-reservations.mjs).
- **Part 02 verification:** `npm run verify:customer-reservations` — all 10 groups passed against a newly provisioned disposable PostgreSQL database, including full/repeated migrations, legacy FK/value preservation, concurrent backfill reruns, source-drift rejection, zero-money/scope constraints, GiST overnight/touching/released intervals, simultaneous allocation with one winner, and development seed/backfill/repeat. Test database cleanup succeeded. `verify:customer-foundation` — 28 passed; `lint` — passed; `build -- --webpack` — passed, 39 static pages; `db:generate` — no schema drift. Default Turbopack remained blocked by the environment port-binding restriction after escalation; the supported Webpack build verified compilation and static generation.
- **Part 02 rollout state:** no migration, backfill or seed was applied to the configured Rentra database in this session. Its read-only audit found 44 eligible legacy rows; rent/fee/deposit/reported-advance minor totals reconcile to 37,100,000 / 2,968,000 / 22,800,000 / 12,243,000. All 44 have unknown hours/settlements/provenance; none is currently active. Details and approved-deployment commands: [Part 02 runbook](rentra-customer-part02.md).
- **Part 03 implementation:** [migration 0009](../drizzle/0009_customer_payment_ledger.sql) adds all eight payment/refund/event/method tables, scoped external identities, immutable financial facts/provenance, deferred allocation/refund reconciliation and explicit payout funding. [Accounting readers](../lib/payments/accounting.js) use verified live captures only, check active owner scope and exclude simulated/test/seed/legacy-unknown money. [Customer methods](../lib/payments/customer-methods.js) enforce active customer status and return an empty list in simulated mode. [Runtime config](../lib/payments/config.js) cannot enable live charging through environment variables. The Razorpay placeholder returns 503 instead of acknowledging unprocessed events; the worker remains a simulated-mode heartbeat scaffold.
- **Part 03 verification:** `verify:customer-payments` — 12 groups passed, including immutable evidence, provider namespaces, authorization/capture deduplication, zero actual simulated money, refund allocation/caps, concurrent refunds under Read Committed and stale Repeatable Read, payout ownership/funding and private method reads. `verify:customer-reservations` — all 10 groups passed against the expanded migration chain, preserving original legacy columns and converting/rerunning the current 29-visit development seed. `verify:customer-foundation` — 28 passed; `lint` — passed; `build -- --webpack` — passed with 34 static pages from the current listing data; `db:generate` — no schema drift; worker startup smoke check passed. Final database runs completed after resumption with saved logs in `/private/tmp/rentra-part03-payments.log` and `/private/tmp/rentra-part03-reservations.log`. Disposable databases were removed, including the verified inactive seed-only database left by the interrupted run.
- **Part 03 rollout state:** migrations 0008/0009 were not applied to the configured Rentra database by this work. No live provider, financial write endpoint, saved-token handler or payout worker is enabled. No real money was collected/refunded/paid out. See the [Part 03 runbook](rentra-customer-part03.md) for contracts, deployment prerequisites and conservative payout/refund boundaries.
- **Part 04 implementation:** default-disabled, versioned admin Razorpay Test settings; owner booking-calendar controls; authoritative persisted quotes and shared public calendar/desktop/mobile pricing; listing-first inventory locks, conservative legacy readiness checks, owner ledger blocks and idempotent expiry. Migration [0010](../drizzle/0010_customer_quote_inventory.sql) adds configuration, overrides, quote snapshots and immutable gateway history. Details: [Part 04 runbook](rentra-customer-part04.md).
- **Part 04 verification:** `verify:customer-quotes` 15 groups passed; `verify:customer-foundation` 28 passed; `verify:customer-payments` 12 passed; `verify:customer-reservations` 10 passed. All database suites used disposable databases. Lint passed with four existing image warnings; Webpack production build passed with 35 pages; Drizzle generation found no schema drift. Additional boundary checks rejected reversed/impossible availability ranges before database access. Requirement-document scripts parse and all 22 session parts remain present.
- **Part 04 rollout state:** migration/backfill/seed were not applied to the configured database. Owners must explicitly set hours and remediate unknown active inventory before dates become bookable. No Razorpay network requests or actual money movement were performed. Customer checkout stays unavailable until Parts 11/12; admin enablement alone cannot bypass that boundary. Browser/device accessibility, quote throttling/retention and operational scheduling remain release work.
- **Part 05 implementation:** [migration 0011](../drizzle/0011_customer_identity.sql), isolated customer OTP challenges/rate limits, atomic one-time consumption, active customer creation, revocable sessions and durable account-status revocation, explicit partner/admin switching, desktop/mobile login and signed 15-minute selection recovery with a fresh owned quote. Per the user's instruction, development/test uses **123456 after Send code**, without SMS credentials; staging/production cannot enable that mode or accept its sessions. A Twilio Messages adapter is ready for future configured delivery. [Part 05 runbook](rentra-customer-part05.md).
- **Part 05 verification:** `verify:customer-identity` with the optional Chromium gate — all **15 scenario groups passed**, including full disposable migrations, concurrent replay/request races, expiry/attempts/resend/phone/IP limits, mocked Twilio acceptance/failure, production guards, separate same-phone roles, logout/status/expiry revocation, signed multi-date recovery and current customer-owned pricing. Chromium exercised wrong/correct OTP, desktop/mobile guest recovery, refresh, HttpOnly/SameSite cookies and explicit partner/admin switching. Disposable database cleanup succeeded. `verify:customer-foundation` — 28 passed; lint — no warnings/errors; `build -- --webpack` — 35 pages generated; `db:generate` — no schema drift; diff check — clean. The initial recovery fixture incorrectly included hours on disabled slots; the fixture was corrected before the successful run. The browser fixture's identical city/area names produced existing breadcrumb duplicate-key warnings; they did not fail the flow checks. This is not a full accessibility or real-SMS delivery audit.
- **Part 05 rollout — updated after explicit migration request, 13 September 2026:** applied pending migrations **0010–0012** to the configured database using `npm run db:migrate`. Preflight found a historical 0009 checksum difference and older installed financial guard functions. New [0012](../drizzle/0012_financial_trigger_alignment.sql) uses `CREATE OR REPLACE FUNCTION` to align `rentra_financial_immutable` and `rentra_financial_scope` with the already-tested repository definitions, preserving journal history and trigger attachments. Post-apply checks verified the new migration hashes, five new tables, enabled gateway/session triggers and exact function bodies; **no migrations remain pending** and schema generation reports no drift. No seed, backfill or SMS was run. Twilio credentials/sender configuration and a trusted, overwritten single-IP ingress header remain production prerequisites. Missing/invalid IPs share a conservative rate bucket. Preserve the custom SQL in migrations 0008–0012.
- **Part 06 implementation:** shared customer navigation and responsive account forms; first-login name, optional email and separate marketing consent; versioned profile/preferences; purpose-bound verified phone changes with session rotation; persistent customer privacy requests and a paginated admin review queue; full-navigation logout. Saved, Bookings and payment methods explain their current availability. See the [Part 06 runbook](rentra-customer-part06.md).
- **Part 06 verification:** six account database groups and the separate 360px account browser group passed. The identity service suite passed 14 groups; the desktop/mobile browser-only regression passed both recovery groups, including onboarding, retained selection, a fresh customer-owned quote, refresh, cookies and explicit partner/admin switching. All verification databases were disposable and cleanup succeeded. Foundation: 28 groups passed. Final isolated Webpack build: 43 pages generated. Lint: no errors, four existing image-element warnings. Drizzle: no schema drift; the sandbox system-user lookup failure was resolved by the permitted rerun. Document scripts and completion tracking were checked. Focus and mobile-layout checks are focused coverage, not a full accessibility audit; no real SMS or provider payment was executed.
- **Part 06 rollout:** additive [migration 0013](../drizzle/0013_customer_account.sql) was applied to the configured database on 13 September 2026. Post-apply checks verified its hash, both new tables and four OTP scope columns. Historical 0011/0012 checksum differences were verified as LF/CRLF formatting only; migration history and existing financial triggers were preserved. No configured seed, backfill or SMS was run. Privacy export/deletion fulfillment remains a reviewed operational process; requests are persisted, not automatically fulfilled.
- **Next-session notes:** finish any remaining Part 06 gate, then implement Part 07 saved places. Read [Part 06](rentra-customer-part06.md) and [Part 05](rentra-customer-part05.md); replace the `/saved` availability notice with customer-owned saved records and guest merging. Use the active, revocable customer identity from the DAL and preserve onboarding selection recovery, phone-change session rotation, separate marketing consent and the development/production boundary. Keep private account data out of cached public pages and partner/admin identities separate. Read [the revised payment flow](rentra-payment-flow.md) and [Part 04 runbook](rentra-customer-part04.md), preserving the custom database exclusion, financial triggers and accounting view. Requote after customer login; anonymous previews cannot be accepted as customer-owned quotes. New payment attempts need the current enabled config; existing attempts resolve their pinned provider/environment even after disable. Parts 11/12 add Test orders, verification and durable webhooks; Part 14 Test refunds; Part 19 sandbox release; Parts 20–22 live rollout. Apply additive migrations before new readers and never use the configured database as disposable.

Part 01 is intentionally a foundation slice: policy configuration, property-local date/interval helpers, money primitives, strict multi-visit input validation, legacy owner-block/date-range corrections and public location privacy. Its initial timezone implementation supports `Asia/Kolkata` and fails closed for unsupported zones. It does **not** deliver the authoritative quote service, transactional overlap protection, persisted multi-visit checkout or unified calendar/price-box totals. Those have separate gates below.

## Rules carried through every part

- One order belongs to one authenticated customer, listing, property timezone and INR currency. The initial selection contains 1–10 unique visit dates using the same slot and guest count.
- A selected date is the property's local visit-start date. Consecutive selections are individual visits; they do not imply continuous access between visits. Overnight end dates must be explicit.
- Owners must define exact slot hours and buffers. Do not assume `full_day` means 24 hours. Ambiguous or unsupported definitions must fail closed until remediated.
- Keep the proposed 10-minute checkout hold and other product limits in shared configuration. No hold is taken during login.
- Persist new money values in integer minor units with explicit names. Keep the existing 8% platform fee and illustrative future advance of 25% rent plus the full fee. Deposits are separate; do not invent a tax rate or collection obligation.
- A valid quote is not an inventory guarantee. Holds, confirmation, owner blocks, cancellation and expiry share the same listing-first lock discipline and active interval ledger.
- Confirm after verified Razorpay Test capture and atomic allocation; no owner-acceptance wait. A failed/unverified provider result, disabled gateway or browser success screen cannot confirm a booking.
- Default-disabled admin configuration controls new checkout/attempts only. Disabling preserves browsing/availability and existing-attempt verification, webhooks, reconciliation and refunds with their immutable provider/environment. Never fall back to dummy/live/manual transfer.
- Razorpay Test uses schema `mode='real'`, `provider='razorpay'`, `environment='test'`. Its capture/refund fields can be nonzero test amounts; actual bank-money collection, actual revenue and payout eligibility remain zero. Preserve historical dummy facts separately. Visit provenance/completion evidence remains independent; seed/test/unvisited records cannot establish review eligibility.
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
| 03 | U0 | Payment/refund schema and provenance/accounting boundaries | 02 | COMPLETE |
| 04 | U0 | Authoritative quote/inventory; gateway config and collection snapshots | 01–03; revised payment flow | COMPLETE |
| 05 | U1 | Customer OTP, delivery and interrupted-login recovery | 01, 04 | COMPLETE |
| 06 | U1 | Customer shell, onboarding and account settings | 05 | COMPLETE |
| 07 | U1 | Guest/account favourites and Saved page | 05–06 | PLANNED |
| 08 | U2 | Search, filters and real city/area routes | 04, 06–07 | PLANNED |
| 09 | U2 | Listing content, gallery and canonical sharing | 04, 06–08 | PLANNED |
| 10 | U2 | Multi-date picker and one quote-driven booking summary | 04–05, 09 | PLANNED |
| 11 | U3 | Holds, Razorpay Test adapter, verified capture/webhooks and expiry | 02–05; admin gateway config | PLANNED |
| 12 | U3 | Hosted test checkout and callback/webhook recovery | 10–11 | PLANNED |
| 13 | U3 | Confirmation/history, private arrival details and staff visibility | 12 | PLANNED |
| 14 | U4 | Partial cancellation, test refunds and change-support path | 11, 13 | PLANNED |
| 15 | U4 | Notification outbox, lifecycle evidence and calendar export | 11, 13–14 | PLANNED |
| 16 | U4 | Verified-visit reviews, moderation, replies and reports | 13, 15 | PLANNED |
| 17 | U4 | Help, versioned policies and operational support requests | 13–15 | PLANNED |
| 18 | U5 | SEO, accessibility, responsive and performance corrections | 08–10, 12–17 | PLANNED |
| 19 | U5 | Sandbox acceptance A01–A18, admin toggle races and measurement | 01–18 | PLANNED |
| 20 | U6 | Live collection/tax/deposit/provider readiness and adapter revalidation | 19; live policies confirmed | LATER |
| 21 | U6 | Live reconciliation, settlement/recovery and funded payouts | 20 | LATER |
| 22 | U6 | Live refunds, saved methods and verified live-mode rollout | 20–21 | LATER |

## Parts 01–19: complete customer release with Razorpay Test

Parts 01–03 below retain their original implemented scope and verification as history. The revised payment flow applies to all planned parts; it does not claim that earlier dummy scaffolding is already a Razorpay integration.

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

**Status:** COMPLETE — 13 September 2026. All schema, accounting and disposable-database verification gates passed. Real provider integration and configured-database rollout remain disabled/unapplied. See the [Part 03 runbook](rentra-customer-part03.md).

**Deliver:** Provider-independent payment order, attempt, transaction, allocation, refund, refund-allocation, payment-event and customer-method tables. Enforce external identity namespaces, immutable provenance, real/simulated distinctions and integer amounts. Add accounting/payout filters so confirmation, simulation and legacy-unknown money cannot create captured-fund revenue or payable balances. Dummy mode leaves saved methods empty.

**Verify:** Database constraints for unique identities, amount validity and simulated zero-actual-money rules; reconciliation fixtures with seed, simulated and captured records; no double-counting authorisation and capture facts. Do not expose real checkout yet.

**Gate:** The complete payment structure exists before gateway integration and no simulated funds enter revenue/payout calculations. Covers A13 schema/accounting foundations; prepares A17/A18.

### Part 04 — Authoritative quotes and inventory rules

**Status:** COMPLETE (13 September 2026). Implementation and verification: [Part 04 runbook](rentra-customer-part04.md). Deployment prerequisites remain explicit.

**Deliver:** One server quote contract with canonical selection, exact intervals, per-visit override/guest charges, deposit/policy snapshots, version/hash and expiry. Snapshot the default-disabled admin gateway configuration/version, provider/environment, collection-policy version and explicit purpose/amount. Sandbox collection is configurable `full` (default rent plus fee, deposit excluded) or `advance` (25% rent plus full fee). Public discovery/availability/quote previews stay usable while checkout is disabled. Derive availability from owner inputs plus active inventory, use shared locks for owner blocks, and remediate legacy intervals before switching authority.

**Verify:** Calendar/quote parity, blocked/lead-time/horizon/capacity cases, next-day/buffer/full-day conflicts and concurrent owner blocks in a test database. Unsupported windows remain unavailable. Changed price/policy/gateway version produces a replacement quote; disabled payment settings do not alter physical availability. Verify full/advance collection amounts, deposit exclusion and safe secret-free snapshots.

**Gate:** A03/A06–A09 quote/inventory gates pass, and checkout readiness/configuration is distinct from public bookable-date availability. Quotes bind the planned collection and gateway versions without creating a payment. Customer holds and provider calls remain Part 11, which rechecks current config before a new attempt.

### Part 05 — Customer identity and OTP delivery

**Status:** COMPLETE (13 September 2026). All implementation, disposable-database, Chromium and configured-migration checks passed. See the [Part 05 runbook](rentra-customer-part05.md). Production SMS delivery remains a deployment prerequisite.

**Deliver:** Customer request/verify OTP actions using configured delivery, short expiry, hashed challenges, atomic one-time consumption, phone/IP limits and attempt/resend caps. Create active customer accounts without changing partner roles. Enforce blocked/suspended status and explicit wrong-role switching. Preserve a validated short-lived selection across login, allow only safe internal return paths and requote after return.

**Verify:** Concurrent OTP replay, expired/wrong challenges, delivery failure, rate limits, safe redirects, session revocation/status changes and separate customer/partner accounts using one phone. Production cannot enable developer OTP shortcuts.

**Gate:** A01/A02 identity cases pass and an interrupted guest returns to the selected listing/dates/guests. Report missing external delivery configuration as a deployment prerequisite, not a working production capability.

### Part 06 — Customer shell, onboarding and account

**Status:** COMPLETE (14 September 2026). Account database, 360px browser, identity recovery, build, lint and schema gates passed. Migration 0013 is applied to the configured database. See the [Part 06 runbook](rentra-customer-part06.md).

**Deliver:** Consistent Saved/Bookings/Account navigation and shared responsive form/status primitives using the existing design system. First-login name collection, optional email, separate marketing consent, profile/preferences, privacy/deletion request path and logout. Reverify changed phone/contact delivery where used. Explain that saved methods are not yet available; method selection occurs only in hosted Razorpay Test checkout. Do not collect raw card/UPI credentials in Rentra forms.

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

### Part 11 — Atomic holds and trusted Razorpay Test services

**Deliver:** Customer-owned all-or-nothing holds, stable idempotency/request hashes, conditional expiry and listing/order/payment locks. Recheck current admin enablement/config and accepted collection before new checkout/attempts. Implement extensible server-only Razorpay Test adapter, provider orders/status/checkout verification, durable signed webhook ingestion and retryable event processing. Persist mode `real`, environment `test` and immutable configuration per attempt. Confirm only after verified capture; add expiry/late-capture reconciliation and event/outbox hooks. Existing verification/webhooks/refunds continue after disable; no fallback confirms a booking.

**Verify:** Database races for last space, owner blocks, overlapping intervals, stale expiry/capture; provider sandbox valid/invalid signature, mismatched amount/currency/order, duplicate/out-of-order events and lost responses. Default/disabled/unsupported config rejects new attempts; old attempts finish after disable. Persist unknown external outcomes and reconcile before retry. No provider network calls inside transactions.

**Gate:** A04–A07/A10/A11/A13 and test-mode A17/A18 late-capture services pass: one winner, no partial order, no failed-payment confirmation and zero actual bank money/payout despite reconciled nonzero test captures. UI checkout is Part 12; test cancellation refunds follow in Part 14.

### Part 12 — Checkout with explicit acceptance and recovery

**Deliver:** Owned checkout showing contact/guests/required purpose, each visit, rent/fee/deposit, planned full/advance test collection, policy/config version and countdown. CTA: “Continue to test payment”; clearly state Razorpay Test deducts no actual bank money. Launch hosted test checkout and route callback/webhook/status results through Part 11. Handle disable/config changes, expiry, replacement quotes, conflicts, failure/cancellation/unknown outcome, double click and session expiry.

**Verify:** One/consecutive/separate checkout, full/advance collection, price/policy/config reacceptance, hosted failure/cancel, callback/webhook races, recoverable timeout and cross-customer references. Disable before a new attempt blocks it; disable after an attempt exists preserves verification. Provider failures/unverified browser results cannot reach confirmed UI.

**Gate:** A customer confirms a booking only through verified Razorpay Test capture; retries recover the original owned outcome. Supports A01/A03/A08/A10/A13/A14/A16 and test-mode A17/A18 recovery. Actual bank-money collection remains ₹0.

### Part 13 — Booking records and owner/admin visibility

**Deliver:** Durable confirmation, paginated/searchable Upcoming/Past/Cancelled history, per-visit timeline and mixed-order display, immutable listing snapshots, separate booking/payment badges and receipt-style summary download. Protect exact arrival/contact details by ownership. Update operational owner/admin readers so grouped references and confirmed child visits are visible.

**Verify:** Refresh/direct navigation, unowned references/receipts, paused/retired listings, mixed children and owner/admin access. Show provider test reference/captured amount distinctly from actual bank-money collection ₹0; a test receipt is not a real-money financial receipt.

**Gate:** Persisted records explain what was booked and staff can operate those visits. Supports A10/A12/A13/A14; no customer release can bypass this staff-visibility dependency.

### Part 14 — Per-visit cancellation and change handling

**Deliver:** Authorised policy-snapshot cancellation preview/commit for selected unstarted visits, conditional release/events and refreshed parent state. Reserve test refunds against captured test allocations, call the original provider outside locks and reconcile/retry the obligation. Existing refunds continue after gateway disable. Label provider test refund amounts/status separately from actual bank refund ₹0. Use an explicit supported change path; connect structured requests in Part 17.

**Verify:** One-of-three cancellation, replay/cross-customer/cutoff cases, expiry/confirmation races and preserved unaffected visits. Test concurrent refund caps, partial refunds, provider unknown/failure/retry, disabled-gateway continuation and namespace/accounting separation. Historical simulated refunds retain zero actual ledger amount; provider test refunds can be nonzero test amounts.

**Gate:** A12/A13/A14 and test-refund A18 pass. Visits release once, test refunds reconcile without double refund and no actual bank-money refund is claimed. Started visits reach operational support.

### Part 15 — Durable communication and actual visit lifecycle

**Deliver:** Notification outbox schema/transactional writes, configured delivery worker, deduplicated confirmations/reminders/cancellations/review invitations and retry monitoring. Suppress obsolete reminders. Define owner/admin handover/return evidence and completion transitions; scheduled dates passing alone cannot complete a visit. Add timezone-correct calendar export and Book again with new availability validation.

**Verify:** Duplicate worker delivery, failed channel/retry, cancellation before reminder, evidence-based completion and calendar timezone/overnight content. Delivery failure cannot undo a confirmed booking.

**Gate:** Lifecycle evidence is sufficient for review eligibility and communication has durable, visible outcomes. Supports A09/A11/A15 and the U4 operational gate.

### Part 16 — Reviews with honest publication

**Deliver:** Customer review form selecting an eligible completed visit; 1–5 checks and unique booking/author constraint; optional subscores, moderation/publication status, owner replies and reports. Public aggregates include only eligible published customer reviews. Keep guest-targeted feedback separate.

**Verify:** Duplicate reviews, wrong customer, cancelled/no-show/incomplete/test/seed visit restrictions; completion evidence independent of a non-live payment environment; equal moderation for low/high scores; aggregate/cache updates after publication changes. A test payment cannot itself prove a real visit.

**Gate:** A15 review scenarios pass and the public listing displays only evidence-backed review counts/scores.

### Part 17 — Help, policies and operational support

**Deliver:** Searchable practical FAQs, versioned cancellation/terms/privacy pages, booking-linked persisted support requests, customer status/replies and staff inbox. Connect history, cancellations, change requests and account privacy requests. Publish actual support channels/hours and retained-record policy; do not imply unattended live chat.

**Verify:** Persist-before-success behavior, customer/staff ownership, private request noindex, state/reply transitions and booking/policy context. Do not expose another customer's reference or message.

**Gate:** Customers and staff can follow a support request to a visible resolution state. Covers A14/A16 support boundaries and completes the v1 change-support path.

### Part 18 — Public visibility, accessibility and performance

**Deliver:** Audit rendered titles/canonicals/OG/Twitter/JSON-LD, renamed/paused/deleted listing behavior and sitemap coverage. Index only useful canonical public pages; search combinations and personal routes follow the documented noindex policy. Correct mobile overflow, controls/focus/contrast, screen-reader errors/announcements, reduced motion, image sizing and heavy map loading. Use truthful listing schema; VacationRental eligibility is a later conditional project.

**Verify:** Rendered route crawl and metadata assertions; keyboard/screen-reader critical journeys at 360px/390px/tablet/desktop; image/layout performance checks. Record lab observations separately from field Core Web Vitals targets (75th percentile LCP ≤2.5s, INP ≤200ms, CLS ≤0.1).

**Gate:** A16 passes with recorded evidence and no private serialization regressions under A14. Report unmeasured field targets honestly.

### Part 19 — Full Razorpay Test release acceptance and measurement

**Deliver:** Bounded funnel/operational events, delivery/conflict/expiry/payment alerts and service health visibility. Record provider/environment and separate test booking value/captures/refunds from actual live revenue; do not treat schema mode `real` as bank-money proof. Finish customer/partner/admin regression and sandbox handoff.

**Verify:** Run A01–A18 with database concurrency and provider Test/browser evidence. Cover default-disabled/admin-only enablement, stale configuration, full/advance quotes, disabled browsing, blocked new attempts, existing-attempt callbacks/webhooks/refunds after disable, provider outage and absence of dummy/live fallback. Test totals reconcile while actual bank-money/revenue/payout remain zero. Analytics/logs exclude phone, OTP, access code, exact address and payment token.

**Gate:** The complete Test journey works through verified provider outcomes, staff can operate/support visits and all A01–A18 sandbox cases pass with evidence. Admin may enable configured Razorpay Test; live mode remains unavailable until Parts 20–22.

## Parts 20–22: later live bank-money release

### Part 20 — Live policies and provider readiness

**Deliver:** Agree live collection schedule, tax, deposit, cancellation/refund and supported-method policies. Review live credentials, merchant settings, operational responsibility and readiness. Reuse/revalidate Parts 11/12's tested adapter; add providers only through the same contracts. Keep live enablement unavailable until Parts 21/22 pass; never convert test/dummy records to live.

**Verify:** Re-run A17/A18 test coverage against the final provider settings and approved live policy calculations; review credential/environment isolation and controlled rollout. A browser response alone cannot mark paid; do not store PAN/CVV/UPI PIN/bank credentials.

**Gate:** Live commercial and provider prerequisites are explicit; sandbox verification remains green. This is live-readiness review, not the first payment-adapter implementation.

### Part 21 — Live reconciliation, settlement and payout recovery

**Deliver:** Extend the existing durable webhook/reconciliation pipeline for approved live operations, reporting, settlement timing and post-disbursement recovery. Enable payout eligibility only for verified live capture allocations with required visit/owner evidence. Preserve disable-new-checkout semantics for all outstanding obligations.

**Verify:** Re-run A17 and late-capture A18 under final live configuration; verify settlement/recovery, funded payouts, namespace separation and reconciliation. Existing test/dummy money cannot enter live totals.

**Gate:** Live financial reporting and settlement obligations reconcile without double allocation/payout or overbooking. Core webhook safety was already mandatory for the Test release.

### Part 22 — Live refunds, saved methods and live-mode gate

**Deliver:** Revalidate the Part 14 test refund implementation for live policy, captured funds and post-settlement recovery. Add provider-supported saved-token labels/default/removal/revocation with ownership. Finalize reconciled readiness and a separate explicit live enablement for new orders; this cannot be achieved through the earlier Test toggle.

**Verify:** A18 refund caps/partial/failure/retry/late-event cases with final policies, actual deposit treatment, token isolation/revocation and booking/expiry/cancellation races. Preserve historical test/dummy namespaces and zero actual-bank totals for them.

**Gate:** Live A17/A18 readiness and actual-fund reconciliation pass; payment copy matches persisted outcomes. Enable live mode only after all explicit provider/policy/release gates are satisfied.

## Acceptance traceability

These are the source document's A01–A18 checks. Part 19 consolidates all of them in Razorpay Test, including provider verification/refund races formerly deferred to live integration. Parts 20–22 revalidate A17/A18 for live bank-money rollout. Admin toggle/configuration races are additional mandatory cases in Parts 04/11/12/14/19, detailed in the payment-flow document.

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
| A13 | Historical dummy / gateway Test / live money separation | 01–04, 11–14, 19; preserved in 20–22 |
| A14 | Ownership and public/private serialized data | 01, 05–07, 09, 12–14, 17–19, 22 |
| A15 | Save merge and eligible unique reviews | 07, 15, 16, 19 |
| A16 | Public content, metadata and usability | 06, 08–10, 12, 17–19 |
| A17 | Verified Test capture and webhook replay; later live revalidation | 11, 12, 19; live 20–22 |
| A18 | Test refund cap and late capture; later live revalidation | 11, 12, 14, 19; live 20–22 |

## Next-session prompt

Copy this prompt into a new implementation session after the current part's handoff is complete:

> Read `docs/rentra-customer-sessions.md`, its current status/handoff, `docs/rentra-payment-flow.md`, the Part 02/03 historical runbooks and relevant customer-plan sections. Implement the next incomplete part only after inspecting repository instructions/code/uncommitted changes. Use default-disabled admin-controlled Razorpay Test with quoted/versioned full-or-advance collection; never fall back to dummy/live. Keep browsing usable while disabled and existing-attempt verification/webhooks/refunds operational. Follow the part's gates and installed Next.js guides, preserve existing work, run meaningful checks and update the handoff with evidence/limitations. Live mode remains unavailable until Parts 20–22; do not mark broader milestones complete prematurely.

Use the same prompt for later sessions; the recorded status decides the next part. Finish any unresolved gate in the current part before beginning the next part.
