# Rentra customer implementation sessions

Source of requirements: [Customer experience plan](rentra-customer-plan.html). This file turns its milestones U0–U6 into **22 bounded implementation parts**. Complete one part per session, including its relevant verification and a written handoff.

**Payment decision updated 13 September 2026:** [Admin-controlled Razorpay Test flow](rentra-payment-flow.md) replaces dummy-only checkout from Part 04 onward. Parts **01–19** deliver provider-integrated sandbox checkout with **₹0 actual bank money**, and Parts **20–22** cover later live commercial/settlement rollout. Admin settings default to disabled; enabling selects Razorpay Test, with no dummy/live fallback. Completed Parts 01–03 and their runbooks remain historical evidence, not the future payment-flow specification.

Token use varies with the files involved, existing code, debugging and verification. These are scope boundaries, not guarantees about a model's context size or a fixed number of tokens. Reserve room in each session to inspect the final diff, run checks and update this document. If evidence shows a part cannot fit, split its remaining work into a clearly named follow-up before proceeding; never mark an incomplete gate complete to fit a session.

## Current status and handoff

- **Completed parts:** 01–02 — COMPLETE (12 September 2026); 03–05 — COMPLETE (13 September 2026); 06–08 — COMPLETE (14 September 2026); 09 — COMPLETE (15 September 2026); 10 — COMPLETE (19 September 2026). 11 — COMPLETE (20 September 2026).
- **Next planned part:** 12 — hosted Test checkout with explicit acceptance and recovery.
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
- **Part 07 implementation:** persistent guest hearts, customer-owned favourites, batch guest merging with durable replay receipts, a guest/customer `/saved` page, optimistic removal/undo and failure rollback, generic removable unavailable cards, retained valid dates/slot/guests and fresh listing quote recovery. Account results stay out of browser storage and cached public pages; session fingerprints, claim-scoped pending guest input and logout/tab refresh protect account isolation. [Part 07 runbook](rentra-customer-part07.md).
- **Part 07 verification:** all **8 saved-place scenario groups passed**, including the 390px Chromium flow for guest reload, OTP login/merge, another device, failed save/undo, unavailable-card undo, logout and another account. The final batch implementation separately passed all **7 database/domain groups**, including concurrent merge replay, uniqueness, non-resurrection after removal, owner/session isolation, capacity rollback/retry and public DTO redaction. Both test databases were disposable and removed. Foundation: 28 groups passed; lint: clean; isolated final Webpack build: 43 pages generated; schema generation: no drift; diff check: clean. Focused browser coverage is not a complete accessibility audit or a real SMS/provider payment test.
- **Part 07 rollout:** applied additive [migration 0014](../drizzle/0014_customer_saved_places.sql) to the configured database on 14 September 2026, continuing the user's request to apply implementation migrations. Verified its journal hash, both tables, composite primary keys and customer foreign keys. **No migrations remain pending.** Historical journal hashes/custom financial and session triggers were preserved. No configured seed, backfill, customer save fixture or SMS was executed.
- **Part 08 implementation:** `/search` and validated city/category/area/intent routes; URL-driven location/date-mode/slot/guest/budget/amenity/cancellation filters, removable chips, reset/retry states, counts, global sorts and pagination. Complete-selection previews reuse Part 04 pricing and inventory checks without creating quote/hold/payment rows. Selected totals include rent and platform fees, with separate deposits; undated cards state their base-rate unit and exclusions. Saved hearts and listing links retain all dates. Canonical area/intent namespaces resolve slug collisions; active taxonomy drives home/footer links and eligible sitemap entries. See the [Part 08 runbook](rentra-customer-part08.md).
- **Part 08 verification:** all five database/domain groups passed, then passed again on the final batched implementation with up to four concurrent listing checks. The separate browser run passed all three groups (domain, registry and Chromium), covering 390px filters, Back, pagination, all-date matching, guest saves with retained dates, empty/invalid recovery, canonical redirects, unknown-area 404, thin-page noindex and desktop/mobile overflow. The first browser run exposed ambiguous select labels; explicit accessible labels fixed them before the successful rerun. A focused check also rejects area filters without a city before querying. All disposable databases were removed. Foundation: 28 groups passed; final lint: clean; isolated Webpack build: 44 pages generated; schema generation: no drift; diff check: clean.
- **Part 08 rollout:** no schema change or new migration is required; existing migrations through 0014 are preserved. No configured seed, backfill, SMS, payment or deployment was run. Large-catalog search throughput, public request throttling and full accessibility/performance audits remain release work; complete-selection search currently favors correctness and uses bounded concurrency.
- **Part 09 implementation:** photo-led listing details now publish exact configured slot hours, structured Included/Extra cost/Not offered/Not confirmed amenity states, truthful missing-content states, published reviews only and physical-verification badges backed by a completed passed physical visit. Public image normalization handles root-relative, allowlisted Cloudinary HTTPS and Cloudinary public-ID shapes while removing query secrets; owner listing photos now use a public upload path and identity/ownership documents stay private. The lightbox traps Tab, supports arrows/Escape and restores opener focus. Native, copy and WhatsApp sharing use the absolute canonical URL, never selection/account parameters. Slug drift retains only valid date/slot/guest context. See the [Part 09 runbook](rentra-customer-part09.md).
- **Part 09 verification:** `verify:customer-listing` passed all **6 groups**, covering normalized/absolute images, explicit amenity/hour states, native cancellation/clipboard failure, evidence-backed public data, unpublished reviews, private address/contact/GPS exclusion, paused listings and gallery keyboard/focus behavior; its disposable database was removed. The affected search and saved suites passed 5 and 7 groups and removed both disposable databases. Foundation passed 28 groups; lint and diff checks were clean; the isolated Turbopack production build generated 44 pages; schema generation found no drift.
- **Part 09 rollout:** no schema change or migration is required; existing migrations through 0014 remain intact. No configured seed, backfill, SMS, payment, WhatsApp send or deployment was run. Existing owner photos previously uploaded through the authenticated document path may require re-upload as public listing photography; this work does not weaken private document storage.
- **UX follow-up session (UX A and UX D), 14 September 2026 — no new part completed.** Applied the [Parts 01–08 UX review](rentra-customer-parts01-08-ux-review.md) P0/P1/P2 items to already-delivered Parts 06–08 surfaces. Discovery: new [DiscoveryFilters](../components/rentra/DiscoveryFilters.jsx) keeps Where/Visit type/Date choice/Guests visible and collapses property type, budget, cancellation and amenities into a Filters disclosure that opens when any is active; one city-grouped Where control replaces the city-then-submit Area pair; separate dates use individual `type="date"` chips with Add date and Remove instead of a typed comma-separated string; sort moved beside the result count; chips show readable names and clearing city also clears its area. Navigation: customer-aware Account/Log in, Explore active across discovery routes, owner entry demoted, Bookings removed from primary navigation. Unfinished-booking pressure removed: the estimate is now "Price for your visit" with a rent/fee/total order, a separate deposit block and Save as its action; no disabled Reserve button and no login prompt remain; the mobile bar offers Save place or Check dates. The WhatsApp button renders only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is a 10–15 digit number, replacing the hardcoded `919000000000`. Saved places are photo-led, reusing only the first already-public listing photo (`{url, alt}`); unavailable cards keep their original minimal redacted shape. Onboarding asks only for a name, with optional contact preferences behind a disclosure. Removed the orphaned `SearchDates` component, whose typed comma-separated input and dangling `aria-describedby` target no longer existed anywhere in the app.
- **UX follow-up — regression found and fixed by the browser run.** The interrupted session moved sort out of the filter form into its own form beside the result count, but gave the filter form no sort field. Submitting **Show places** therefore dropped `sort` from the URL entirely, silently resetting a chosen order to Recommended on every filter change; carrying it as a hidden input only preserved the *last applied* value, so changing the Sort select and pressing Show places still discarded the new choice. Both controls now belong to one form: the filter form carries `id="discovery-filters"` and the sort `select`/Apply button join it with the HTML `form` attribute, which also removed the twelve duplicated hidden filter inputs. Verified that React emits `form="discovery-filters"` on both elements, and the Chromium group confirms the round trip. This was invisible to the database suites and only the browser run exposed it.
- **UX follow-up verification — all browser groups executed.** `CUSTOMER_BROWSER_DRIVER` is not in `.env.local`; the Playwright driver already present at `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs` (with cached `chromium-1243`) was passed per-run. `verify:customer-search` — **6 groups passed**, including the mobile Chromium group covering filters, Back, pagination, routes, empty and invalid recovery. `verify:customer-account` — **7 groups passed**, including the 360px Chromium group covering onboarding, settings, privacy, phone change and logout. `verify:customer-saved` — **7 database/domain groups passed** and its disposable database was removed; the redacted-card group pins the unavailable DTO key shape, confirming the photo field reaches only available cards. `verify:customer-foundation` — 28 passed, 0 failed. `npm run lint` — clean. `npm run build -- --webpack` — passed, 44 static pages generated. All disposable databases were removed. No schema change was made, so no migration or drift check applies. **Limitations:** no moderated usability testing was performed, so the review's design acceptance checklist stays unchecked; this is focused browser coverage, not a full accessibility, performance or real-SMS/provider audit.
- **UX follow-up — five further defects the interrupted session left behind**, each fixed here: `customer-search-browser.mjs` still typed into `Location or place`, renamed to `Property name or locality`; the sort `select` had lost the `aria-label="Sort"` those checks match with `exact: true`; an unused `SEARCH_SORTS` import remained in the new filters component; `SearchDates.jsx` was orphaned — nothing imported it, yet it still held the typed comma-separated date input the review flagged plus an `aria-describedby` pointing at a deleted element, so it was removed; and `account-browser.mjs` asserted `getByRole('checkbox')` on the onboarding page, which now fails because the marketing consent sits inside a collapsed `details` (confirmed in isolation: Playwright matches **0** checkboxes there and `isChecked()` times out). That fixture now asserts the disclosure starts collapsed, opens it, and then checks consent is unchecked — covering the review's P2 item directly.
- **Part 10 implementation:** completed the committed multi-date picker and shared quote work. Single/consecutive/separate modes, removable visits, retained months/slot/guests, URL reload and signed login recovery use one listing-scoped provider. Calendar, desktop and mobile summaries share authoritative per-visit hours, prices, totals and separate deposits. Expiry refreshes the quote and changed terms require another local review. Fixed mobile-dialog scroll cleanup on navigation and the keyboard focus escape found by the expanded browser gate. See the [Part 10 runbook](rentra-customer-part10.md).
- **Part 10 verification:** `verify:customer-picker` passed all **3 expanded scenario groups**, including reversed/capped ranges, middle-date conflicts/removal, capacity recovery, overnight hours in a Los Angeles browser timezone, URL reload, expiry/price changes, mobile-dialog OTP/onboarding recovery and a customer-owned quote, Tab/Shift+Tab/Escape/edit/calendar focus, 360px/390px overflow, ten-visit server totals, eleventh-date rejection and clearing dates. Its disposable database was removed. Foundation: 28 groups passed. Final isolated Webpack build: 44 pages generated. Full lint: no errors, four existing image-element warnings; final changed-file lint: clean. Diff and document consistency checks passed. The initial expanded run caught native-dialog focus escape; the final rerun passed after explicit wrapping was added. Focused checks do not replace the later full accessibility/performance audit.
- **Part 10 rollout:** no schema change or new migration is required; the previously applied chain through 0014 is preserved. No configured migration, seed, backfill, SMS, provider payment or deployment was run. Review is a UI acknowledgement only; it creates no booking, hold or payment.
- **Part 11 implementation:** customer-owned all-or-nothing holds, immutable accepted terms, stable idempotency, single-dispatch Razorpay Test orders, receipt reconciliation, server-verified capture, durable redacted webhook jobs, expiry and append-only lifecycle hooks. Late capture after expiry reserves a Test refund without reacquiring inventory. New dispatch respects admin enablement; pinned existing attempts continue after disable. See the [Part 11 runbook](rentra-customer-part11.md).
- **Part 11 verification:** all **11 checkout groups**, **15 quote/inventory/gateway**, **12 payment-ledger**, **10 reservation** and **28 foundation** groups passed. The final checkout gate covers in-flight duplicate dispatch, network outside locks, scope/signature rejection, failed-payment non-confirmation, duplicate/out-of-order processing, lost responses, late capture after resale and zero actual Test revenue/payouts. Disposable databases were removed. Credential-rotation checks, lint, schema-drift and the isolated 44-page Webpack build passed; lint retains four existing image warnings.
- **Part 11 rollout:** migration **0015 applied** to the configured database on 20 September 2026; it was the only pending migration. No configured seed/backfill, SMS, provider payment, gateway enablement or deployment was run. Test credentials are absent; provider HTTP fixtures do not certify an actual Razorpay sandbox checkout.
- **Next-session notes:** implement Part 12 hosted Test checkout and recovery using [Part 11](rentra-customer-part11.md), [Part 10](rentra-customer-part10.md) and [the payment flow](rentra-payment-flow.md). Persist contact/purpose and explicit acceptance, preserve stable idempotency across reloads, and launch hosted Checkout only from owned server status. A callback is never confirmation without verified capture. Explain disabled, changed, expired, failed and unknown states and preserve the original outcome on retry. Configure Test credentials for the actual sandbox smoke check. Preserve custom SQL through 0015. History is Part 13, refund execution Part 14, live collection Parts 20–22.

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
5. Review the diff and update this tracker, the part runbook and `rentra-customer-plan.html` in the same change, using actual verification and migration evidence. In the HTML, add the detailed “Part NN · complete” card under Delivery phases and synchronize the metadata, sidebar count/progress, build status, milestone row and phase footer. Check that every completed part has exactly one detailed card and no stale “next” status remains for it. The browser's manual build checklist stays independent of recorded delivery status. Stop at that part's gate; keep already committed booking data and inventory intact if a rollout needs to be disabled.

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
| 07 | U1 | Guest/account favourites and Saved page | 05–06 | COMPLETE |
| 08 | U2 | Search, filters and real city/area routes | 04, 06–07 | COMPLETE |
| 09 | U2 | Listing content, gallery and canonical sharing | 04, 06–08 | COMPLETE |
| 10 | U2 | Multi-date picker and one quote-driven booking summary | 04–05, 09 | COMPLETE |
| 11 | U3 | Holds, Razorpay Test adapter, verified capture/webhooks and expiry | 02–05; admin gateway config | COMPLETE — 20 September 2026 |
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

**Status:** COMPLETE (14 September 2026). Saved-place database/browser gates passed and migration 0014 is applied. See the [Part 07 runbook](rentra-customer-part07.md).

**Deliver:** Favourites schema/actions/query DTOs, guest-local hearts, idempotent account merge and Saved page. Retain date context where valid; remove with undo; represent unpublished listings as removable unavailable cards. Optimistic failures restore previous state.

**Verify:** Merge replay, unique customer/listing pairs, account isolation, cross-device persistence, logout cleanup and failed save/undo states.

**Gate:** A15 saved-place cases pass; no account's private shortlist leaks into another session.

### Part 08 — Search and implemented location routes

**Status:** COMPLETE — 14 September 2026. [Implementation, verification and rollout](rentra-customer-part08.md).

**Deliver:** URL-driven location/date-mode/slot/guest/budget/amenity/cancellation filters, chips, clearing, result count, pagination and supported sorts. Match availability across every selected date. Implement useful city/area/intent pages and a validated slug registry with collision handling. Connect home/category/footer links to actual destinations and truthful card price bases.

**Verify:** Filter parsing limits, total-price sorting, all-date availability, unsupported slugs, empty/error results and Back navigation. Selected-date totals use server pricing; undated cards identify their from-price unit and excluded charges.

**Gate:** Discovery routes work without dead links and a failed date/filter has a useful recovery path. Supports A07/A08/A16.

### Part 09 — Listing detail, gallery and sharing

**Status:** COMPLETE — 15 September 2026. See the [Part 09 runbook](rentra-customer-part09.md).

**Deliver:** Photo-led detail order, accessible gallery/lightbox, fast facts, explicit included/extra/unavailable/unknown amenity states, precise slot hours, capacity/rules, real review content and evidence-based host verification. Use approximate public location. Provide canonical native/copy/WhatsApp sharing and corrected image URL normalization.

**Verify:** Missing images/amenities/reviews, paused listings, keyboard gallery/focus restoration, share cancellation/clipboard failure, absolute image URLs and no private URL parameters or location data.

**Gate:** A customer can understand the offering and restrictions on mobile/desktop; trust and sharing are factual. Supports A14/A16. The unified interactive quote summary is delivered in Part 10.

### Part 10 — Multi-date picker and shared quote state

**Status:** COMPLETE (19 September 2026). Expanded database/browser, foundation, lint and production-build gates passed. No new migration required. See the [Part 10 runbook](rentra-customer-part10.md).

**Deliver:** Single/consecutive/separate modes, dated removable chips, preserved month navigation, slot/guest revalidation, per-visit exact hours and prices. One shared selection and accepted server quote powers the calendar, desktop panel and mobile summary/sheets. Replace independently derived totals and explain price changes and visit gaps.

**Verify:** A03/A08/A09 selections and pricing through the UI; unavailable middle date; date-removal semantics; keyboard and status announcements; mobile focus/safe-area behavior. Quote expiry/conflicts retain valid selections and identify dates needing attention.

**Gate:** Displayed final totals agree with the server quote for up to ten visits and “Review booking” preserves the complete selection through login. Booking persistence remains Parts 11/12.

### Part 11 — Atomic holds and trusted Razorpay Test services

**Status:** COMPLETE (20 September 2026). All 11 server checkout groups and regression gates passed; migration 0015 applied. Verification used deterministic provider HTTP fixtures; actual sandbox checkout requires credentials and Part 12 UI. See the [Part 11 runbook](rentra-customer-part11.md).

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
