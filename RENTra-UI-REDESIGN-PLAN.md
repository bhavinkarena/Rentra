# Rentra UI/UX Redesign

Status: ALL redesign phases reopened at the user's request. No design system, shared component, shell or page is exempt from reassessment. Existing implementation and test evidence remain a baseline, not design acceptance. Current work: rebuild the public/customer navbar and public footer, then continue the complete product reassessment. This is the persistent execution record.

## Vision

A guest should discover a real place worth visiting, understand its facilities and limitations, choose dates confidently, see an accurate total, and recover their booking after login or a payment interruption. The experience should feel calm, generous and grounded in local nature. Account, cancellation, privacy and support tasks should be as clear as discovery, with factual status and useful next actions.

## Current State

Next.js 16.3.4 App Router, React 19, Tailwind 4, Radix/shadcn primitives and Lucide. Public server components use discovery/content adapters; customer pages use session gates, customer/booking/dispute adapters and existing server actions. URL-backed filtering, quote restoration, minor-unit money, moderation, cancellation preview hashes, idempotency and authorization are preservation requirements.

The previous refresh improved home, shared tokens, primary controls, discovery cards, galleries, checkout sections and portal shells. Its evidence includes 57 representative captures, 126 browser checks, 19 journey checks, 36 tests and a passing build. Those results belong to that recorded source/environment; they do not verify every current customer route or future change. See [prior report](docs/rentra-ui-polish.md).

Remaining source-backed weaknesses: custom forms still use several field/button recipes; booking/support/dispute/review surfaces have inconsistent framing and page gutters; many records retain repeated rounded cards; secondary pages alternate compact metadata and raw identifiers; phone changes use oversized framing; notifications have a bare empty state; error recovery describes search even on help/policy routes. Some components are shared with partner/admin, so customer-only visual improvements require narrow scoping. Prior photographs/focus/financial behavior must not regress. Browser-confirmed findings and priorities are recorded in the Phase 1 audit, not inferred from a class name alone.

## Design Direction

Retain the logo, forest palette, Plus Jakarta Sans and supplied/API-backed photography. Use white and pale green surfaces, restrained 6/10/14/20 px radii, a 1280 px maximum public container and readable narrow text columns. Public discovery can be expressive; decision and account tasks should prioritize information and actions. Use editorial grouping and separators where another card adds no meaning. Preserve honest badges, from-prices, test-mode notices, approximate location privacy and published policy text.

## Customer Journey

Discovery → Exploration → Property discovery → Property details → Desire → Trust → Booking.

1. Home establishes place and visit possibilities; search is immediately usable on a phone.
2. Search/location pages maintain filter and sort state in the URL; saved places maintain intent.
3. Cards provide image, place, facilities and a clearly qualified starting price.
4. Details reveal photos, visit hours, amenities, rules, reviews, approximate location and host information without inventing proof.
5. Desire comes from real photography and useful possibilities, supported by factual capacity and amenities.
6. Trust comes from published verification, quote totals, fees/deposit, cancellation terms and address privacy.
7. Booking retains selection through login/profile completion; quote review precedes the persisted hold and hosted test payment. Processing/expired/failed/confirmed states provide recovery without duplicate bookings.
8. After booking, records, cancellation, book-again, reviews, disputes, support and privacy continue the same experience.

## Customer-Facing Pages

There are 29 page source patterns: eight marketing, one guest login and twenty protected customer pages. The complete source mapping is in [route inventory](docs/rentra-ui-route-inventory.md); the page records below are the redesign scope. Dynamic routes require representative valid IDs and missing/unauthorized cases, not guessed IDs treated as successful content verification.

Additional customer surfaces that are route handlers rather than pages: `/bookings/[orderId]/calendar`, `/bookings/[orderId]/summary`, `/support/[id]/attachments/[attachmentId]`, `/disputes/[id]/attachments/[fileId]`, `/account/privacy/[id]/receipt`, `/account/privacy/[id]/export`. Preserve downloads/content types/authorization. Also cover global not-found, marketing errors, bookings errors, checkout errors and loading boundaries. Authentication redirect is a gate check, not verification of the protected content.

## Design System

Runtime CSS and [DESIGN.md](DESIGN.md) are the token authority; this plan records intended improvements and decisions, not a second independent palette.

| Area       | Planned rule and acceptance                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typography | Existing local Plus Jakarta Sans; display only for home; consistent h1/h2/body/meta hierarchy; tabular money/dates; 16 px narrow-screen input text. Long explanations use body text. |
| Colors     | Existing forest primary, neutral ink and pale surfaces; semantic success/warning/danger; verify contrast on actual backgrounds. No fabricated dark mode.                             |
| Spacing    | Existing 4 px steps; 16/24 px outer gutters; compact field groups and 24/32 px section separation; remove accidental nested page padding.                                            |
| Radius     | 6/10/14/20 px token family; pills only for badges, compact selection or avatars; avoid arbitrary large panel corners.                                                                |
| Shadows    | Flat default; restrained search/summary/overlay elevation; no hover elevation on every informational container.                                                                      |
| Surfaces   | Flat discovery, distinguish financial decisions, group forms by meaning; keep statuses readable without relying on color.                                                            |
| Buttons    | Existing primary/outline/ghost/destructive roles; primary action unambiguous; 44 px default target; pending label and duplicate-submit guards retained.                              |
| Inputs     | Visible labels, focus, described errors and correct autocomplete; unify recipes where a narrow change improves real consistency. Keep field names/constraints/actions.               |
| Cards      | Photography-first public cards; meaningful booking/financial summaries; records and conversations favor readable rows/sections.                                                      |
| Navigation | Existing route-aware public/customer navigation, skip links and menu focus; selection survives navigation/login; no invented destinations.                                           |
| Badges     | Only API-backed verification, rating and status; test/simulation notices remain visible.                                                                                             |
| Dialogs    | Preserve Radix semantics, Escape, trigger focus, internal scrolling and draft state; ensure keyboard and phone layouts.                                                              |
| Loading    | Shared skeleton geometry matches actual page, respects reduced motion; avoid collapsing financial layout.                                                                            |
| Empty      | Explain context and next available action; separate no data from failed/forbidden reads.                                                                                             |
| Error      | Preserve meaningful financial recovery and filters; do not use search-specific guidance on unrelated public routes.                                                                  |
| Responsive | Inspect 390/768/1024/1440 and selected 1920 widths; additionally stress 320 px, long names and safe areas where relevant. No hidden essential action or accidental overflow.         |
| Motion     | State-driven 150–200 ms feedback; no decorative reveals; no movement on destructive confirmation; respect reduced motion and focus.                                                  |

## Page-by-Page Redesign

Every record includes the problem, desired experience, visual direction, interaction, motion, UX, affected components, dependency and validation. These are planned acceptance records, not claims that each change is already necessary or implemented. Phase 1 can retain a good existing page and record that decision.

### `/` — Home (Phase 4)

- Phase 4 reopened: the prior split hero and repeated grid did not deliver the requested visual transformation. Replace the composition and discovery interactions while retaining the earlier functional fixes.
- Desired experience: immediate search and compelling real places with clear starting-price qualifications.
- Visual direction: immersive photograph, oversized editorial type, larger portrait property rail, and a contrasting occasion planner. Retain forest brand, local font and actual property imagery.
- Interaction opportunities: manual hero slideshow, native swipe/keyboard property carousel, occasion tabs and city selection, independent Save/property actions.
- Animation opportunities: controlled photo transition, stronger property-image hover and directional link feedback; honor reduced motion.
- UX improvements: maintain first-viewport mobile search and practical exploration links.
- Components affected: marketing page/layout, SearchBar, ListingCard, TrustStrip.
- Dependencies: discovery home/registry, listing assets and existing analytics.
- Validation: mobile/desktop screenshots, search URL, local Save, long titles, no-data/failed photography and reduced motion.

### `/search` — Search (Phase 5)

- Current problems: filter density and multi-date selections need stronger state coverage than the prior default/empty captures.
- Desired experience: clear results, selected intent and predictable refinements.
- Visual direction: calm filter band, readable result count and flat property grid.
- Interaction opportunities: retain sort, dates, guests and all filters through apply/back/refresh.
- Animation opportunities: pending feedback only, without shifting result layout unnecessarily.
- UX improvements: specific empty recovery and failure distinction.
- Components affected: DiscoveryResults, DiscoveryFilters, ListingCard and loading boundary.
- Dependencies: discovery registry/search, URL parser, availability and saved provider.
- Validation: populated/empty/error states; filter/sort/back/refresh; 390/768/1440 px; keyboard; quote entry.

### `/[city]/[category]/[[...place]]` — Location discovery (Phase 5)

- Current problems: canonical/legacy route paths and scoped results were inventoried but not fully browser verified.
- Desired experience: understand the current place/category and refine without losing scope.
- Visual direction: same discovery system, location-specific heading and useful breadcrumbs.
- Interaction opportunities: preserve URL parameters on canonical redirects.
- Animation opportunities: existing navigation progress only.
- UX improvements: distinct unknown-location and no-results behavior.
- Components affected: location page, DiscoveryResults/Filters and breadcrumbs.
- Dependencies: registry, resolveDiscoveryRoute, route counts and SEO metadata.
- Validation: city/category, area, intent, legacy redirect, unknown path and query preservation on mobile/desktop.

### `/listing/[handle]` — Property details (Phase 6)

- Current problems: long-page navigation, mobile quote bar, partial galleries and network map behavior need state-level review.
- Desired experience: evaluate property and terms, then choose an accurate visit quote.
- Visual direction: real photo mosaic, clear facts and readable sections; compact sticky booking summary.
- Interaction opportunities: gallery keyboard/focus, availability/date selection, save/share and stable mobile booking action.
- Animation opportunities: restrained photo hover and state-driven booking bar; reduced-motion parity.
- UX improvements: separate starting-price, selected quote, fees and deposit; keep approximate location private.
- Components affected: gallery, sections, availability, BookingPriceBox, MobileBookingBar, LocationMap.
- Dependencies: discovery listing/similar, inventory/quote provider, schedules and canonical slug.
- Validation: 1/2/3/4/5+ photos, failed photo/map, multi-slot/date availability, invalid/canonical handles, long content, keyboard and safe-area overlap.

### `/saved` — Saved places (Phase 5)

- Current problems: empty/unavailable/changed-price cards and cross-session selection require deeper coverage.
- Desired experience: recover saved intent and understand availability changes.
- Visual direction: same flat property media/text and clear recovery states.
- Interaction opportunities: remove independently; reopen with preserved selection.
- Animation opportunities: brief pending/removal feedback without decorative stagger.
- UX improvements: distinguish removed/unavailable properties from an empty collection.
- Components affected: SavedPlaces, SavedPlacesProvider, PropertyImage.
- Dependencies: anonymous local storage and authenticated saved API.
- Validation: empty/populated/unavailable, local persistence, authenticated sync, remove and selected dates after reopen.

### `/login` — Guest login (Phase 8)

- Current problems: first-pass form ordering is good; OTP, validation, role conflicts and return journey need visual/keyboard review.
- Desired experience: finish login and return to the selected visit with clear development/provider status.
- Visual direction: focused form with supporting real photography, restrained heading and visible helper text.
- Interaction opportunities: OTP input/resend/change number, Escape/focus, pending and role-switch feedback.
- Animation opportunities: existing dialog/pending feedback only.
- UX improvements: errors next to relevant fields; prevent duplicate submit; preserve selection.
- Components affected: AuthLayout, CustomerLoginForm, OtpDialog, IdentityActionForm.
- Dependencies: role-specific auth/session/actions and saved booking intent.
- Validation: invalid input, development OTP in disposable fixture, expired/wrong code, conflict and redirect restoration; no real OTP dispatch.

### `/onboarding` — Complete profile (Phase 8)

- Current problems: broad container and generic profile controls may weaken the short completion task.
- Desired experience: provide the required name with minimal friction and recover selected dates.
- Visual direction: narrow form column, clear title and useful return context.
- Interaction opportunities: field validation and visible pending/success.
- Animation opportunities: none beyond action feedback.
- UX improvements: clear required/optional distinction and safe logout.
- Components affected: onboarding page, ProfileForm and CustomerLogout.
- Dependencies: customer onboarding/profile actions and completion redirect.
- Validation: incomplete/complete profiles, error/pending, restored selection and 390/1440 px.

### `/checkout/review/[quoteId]` — Quote review (Phase 7.1)

- Current problems: only the journey exercised initial quote; incomplete-profile and stale quote visuals need retained captures.
- Desired experience: understand dates, guests, rent, fee, deposit and amount due before creating the hold.
- Visual direction: flat trip/contact sections with one financial summary; mobile pricing near decision.
- Interaction opportunities: profile completion, editing contact/selection and guarded hold creation.
- Animation opportunities: pending state only.
- UX improvements: clear quote expiration and existing-order recovery without duplicate holds.
- Components affected: Checkout, checkout parts, ProfileForm and review page.
- Dependencies: reviewQuote/account APIs, quote expiry and idempotent actions.
- Validation: active/expired quote, incomplete profile, existing order redirect, amounts, submit/refresh and mobile decision visibility.

### `/checkout/[orderId]` — Payment and result (Phase 7.2)

- Current problems: prior screenshots emphasize expired hold; active/processing/confirmed/failed/provider-unavailable visuals remain incomplete.
- Desired experience: know the authoritative payment state and the safe next action.
- Visual direction: retain financial hierarchy and distinct factual state banners, with calm confirmation.
- Interaction opportunities: status recheck, retry/recovery and booking record links.
- Animation opportunities: restrained one-shot confirmation; reduced-motion equivalent; no fake progress.
- UX improvements: make amount/deposit separation and duplicate-payment prevention understandable.
- Components affected: Checkout, PaymentVerification, ConfirmedView and checkout error.
- Dependencies: reviewOrder, hosted test payment/status APIs, payment state and session.
- Validation: disposable fake-provider active/processing/failed/expired/confirmed states, refresh recovery, amount consistency, keyboard and mobile. Live provider remains separate.

### `/bookings` — Booking history (Phase 9.1)

- Current problems: retained kicker, search card and record framing compete; narrow input focus and long references need inspection.
- Desired experience: find the relevant visit and outstanding action immediately.
- Visual direction: clear page header, compact search/tabs and readable record rows.
- Interaction opportunities: URL-backed search, tabs and pagination with independent links.
- Animation opportunities: existing pending/navigation feedback only.
- UX improvements: useful filtered empty state, sensible action hierarchy and readable date/status.
- Components affected: BookingHistory via BookingRecords, BookingDisplay.
- Dependencies: customer records/summary and booking record domain formatters; shared operational variant.
- Validation: upcoming/past/cancelled/empty/search/pagination and long titles; isolate customer changes from operational variants.

### `/bookings/[orderId]` — Booking detail (Phase 9.1)

- Current problems: many rounded sections and dense financial/lifecycle records need clearer priority.
- Desired experience: see booking state, next visit action and money outcome without losing the audit trail.
- Visual direction: meaningful financial group, flat secondary sections and legible timeline.
- Interaction opportunities: existing cancel/book-again/review/support/download actions.
- Animation opportunities: none beyond state feedback.
- UX improvements: status-specific actions, references that wrap/read well and preserved confirmed address controls.
- Components affected: BookingDetail/Records, BookingDisplay, VisitLifecycle.
- Dependencies: scoped record, lifecycle permissions, attachments, summary/calendar downloads.
- Validation: confirmed/unpaid/cancelled/multi-visit/completed/simulation, financial values, private address and download authorization.

### `/bookings/[orderId]/again` — Book again (Phase 9.2)

- Current problems: additional page padding and utilitarian selection form need consistency.
- Desired experience: repeat the useful visit setup with newly checked availability and price.
- Visual direction: narrow readable form, familiar visit selectors and clear quote action.
- Interaction opportunities: date/guest updates and quote refresh.
- Animation opportunities: pending feedback only.
- UX improvements: explain that old prices/availability are rechecked.
- Components affected: BookAgainForm and page.
- Dependencies: scoped booking record, quote API and visit provenance.
- Validation: one/multiple visits, unavailable date, changed price, validation and fresh quote navigation.

### `/bookings/[orderId]/cancel` — Cancellation (Phase 9.2)

- Current problems: high-stakes preview/consent/error flow needs retained visual evidence beyond basic booking checks.
- Desired experience: understand which visits are cancelled and the computed money outcome before consenting.
- Visual direction: clearly separated preview and final confirmation; semantic destructive action.
- Interaction opportunities: visit selection, preview, reason, acknowledgement and safe retry.
- Animation opportunities: no movement during destructive confirmation; pending indicator only.
- UX improvements: prominent refund/deposit distinctions and stale-preview recovery.
- Components affected: CancelVisits and booking money/time display.
- Dependencies: preview hash, idempotency key, scoped cancellation actions and refund state.
- Validation: partial/all cancellation, preview expiry, lost response, duplicate attempt and receipt in disposable data only.

### `/bookings/[orderId]/reviews` — Review visit (Phase 10.2)

- Current problems: raw eligibility/moderation language and basic controls need clearer form/record organization.
- Desired experience: eligible guest submits an honest review and understands moderation status.
- Visual direction: focused form, readable existing-review rows and restrained status badges.
- Interaction opportunities: completed visit, overall/optional scores and text validation.
- Animation opportunities: pending/success feedback only.
- UX improvements: preserve eligibility and one-review rule with clear empty/ineligible guidance.
- Components affected: CustomerReviewForm and reviews page.
- Dependencies: completed handover/return/completion, review API and moderation rules.
- Validation: eligible/ineligible/already reviewed, body limits, duplicate prevention, non-public pending review and mobile controls.

### `/reviews/[reviewId]/report` — Report content (Phase 10.2)

- Current problems: paragraph-heavy context and generic action need a clearer report task.
- Desired experience: identify content and send a reason without implying automatic removal.
- Visual direction: narrow form with quoted content separated from explanatory text.
- Interaction opportunities: reason validation and submit feedback.
- Animation opportunities: none beyond pending feedback.
- UX improvements: clarify scoped staff review and keep private data out of report text.
- Components affected: ReviewControl and report page.
- Dependencies: scoped review read, report action and hidden-content handling.
- Validation: visible/hidden/malformed review, required reason, saved outcome, long content and keyboard.

### `/account` — Account (Phase 8)

- Current problems: improved shortcut grid still repeats boxed/icon sections; profile/preferences/photo state coverage is partial.
- Desired experience: edit identity and find bookings/settings without visual competition.
- Visual direction: quieter shortcut navigation and readable profile/settings groups.
- Interaction opportunities: photo upload/remove, profile save, preferences and logout.
- Animation opportunities: state feedback only.
- UX improvements: explicit optional fields, image upload errors and clear security settings.
- Components affected: account page, ProfileForm, ProfilePhotoForm, ProfileAvatar.
- Dependencies: scoped account/actions, profile upload and saved changes.
- Validation: long/missing name, optional data, validation/save, upload limits/error and session logout in disposable fixture.

### `/account/phone` — Change phone (Phase 8)

- Current problems: oversized rounded split panel and leading explanation consume phone viewport before the form.
- Desired experience: verify the new number with clear consequences and current-number context.
- Visual direction: compact security context followed by focused form; standard radius.
- Interaction opportunities: request/confirm/change OTP and focus restoration.
- Animation opportunities: existing OTP dialog only.
- UX improvements: state that other sessions end only after verified change; preserve booking/account continuity.
- Components affected: phone page, PhoneChangeForm and OtpDialog.
- Dependencies: request/confirm phone change, session revocation and development OTP fixture.
- Validation: invalid/same/taken numbers, wrong/expired OTP, success/session behavior; no real number change.

### `/account/notifications` — Booking updates (Phase 10.1)

- Current problems: plain empty text and repeated raw references/SMS details lack hierarchy.
- Desired experience: scan updates, identify booking and acknowledge unread items.
- Visual direction: restrained readable rows, distinct unread state and useful empty panel.
- Interaction opportunities: open record and mark read without losing context.
- Animation opportunities: subtle state change only.
- UX improvements: delivery uncertainty remains factual but secondary.
- Components affected: notifications page, NotificationControls if relevant.
- Dependencies: notifications/readNotification and delivery/simulation states.
- Validation: empty/unread/read, long references, accepted-not-confirmed delivery, pending action and 390/1440 px.

### `/account/payment-methods` — Payment availability (Phase 10.1)

- Current problems: bare explanatory text can look unfinished despite an intentional capability limit.
- Desired experience: understand payment methods are unavailable and where supported checkout occurs.
- Visual direction: purposeful narrow informational state and back action.
- Interaction opportunities: existing navigation only; no invented method management.
- Animation opportunities: none.
- UX improvements: retain honest test-mode and no-bank-details guidance.
- Components affected: payment-methods page and shared informational state if warranted.
- Dependencies: customer account gate and existing hosted test payment capability.
- Validation: no editable payment fields/fake saved cards, correct back route, readable mobile text.

### `/account/privacy` — Privacy requests (Phase 10.3)

- Current problems: lengthy job/checkpoint/status details and download links compete with request creation.
- Desired experience: request access/deletion and understand outcome, limits, expiry and next support action.
- Visual direction: clear request form followed by readable outcome records.
- Interaction opportunities: request confirmation, scoped exports/receipts and related support.
- Animation opportunities: pending/confirmation only; none on deletion acknowledgement.
- UX improvements: make partial fulfillment and retained-record limitations understandable without changing policy.
- Components affected: PrivacyForm, account privacy page and download links.
- Dependencies: privacy request/fulfillment state, access export and receipt authorization.
- Validation: no requests, access/deletion, queued/partial/closed/revoked/expired outcomes, duplicate handling and scoped downloads in disposable data.

### `/support` — Support requests (Phase 10.4)

- Current problems: nested padding, generic filters and plain empty copy need a calmer record view.
- Desired experience: find a conversation or begin a scoped request.
- Visual direction: compact header/filter row and readable conversation list.
- Interaction opportunities: URL filters, pagination, open thread and new request.
- Animation opportunities: navigation/pending feedback only.
- UX improvements: clarify saved messages and non-live-chat delivery.
- Components affected: SupportList/Records; protect admin/owner variants.
- Dependencies: customer support list, category/state domain and scoped pagination.
- Validation: populated/empty/filtered/error, long subjects/references, pagination and cross-role visual isolation.

### `/support/new` — New request (Phase 10.4)

- Current problems: several explanatory paragraphs lead into basic form controls; booking/privacy context can be clearer.
- Desired experience: send a saved request about the intended booking/privacy issue.
- Visual direction: compact context summary, focused form and clear limits.
- Interaction opportunities: category/subject/body/attachments, validation and idempotent pending feedback.
- Animation opportunities: no decorative movement; pending only.
- UX improvements: preserve request scope, attachment limits and factual submission status.
- Components affected: new support page and OpenSupportForm.
- Dependencies: requestKey, scoped booking/privacy context and support actions.
- Validation: general/booking/privacy contexts, invalid ownership, attachment/field errors, draft and duplicate submission in disposable fixture.

### `/support/[id]` — Conversation (Phase 10.4)

- Current problems: record metadata and repeated message framing need hierarchy and long-content review.
- Desired experience: read the latest reply and respond within the permitted case.
- Visual direction: readable chronological thread and distinct response area.
- Interaction opportunities: reply, permitted attachments and safe pending behavior.
- Animation opportunities: status feedback only; no automatic scrolling that moves keyboard focus.
- UX improvements: closed/locked context and actual persisted-message feedback.
- Components affected: SupportDetail and SupportReplyForm; protect operational variants.
- Dependencies: scoped thread/reply, case version and attachment permissions.
- Validation: open/closed, long text, files, reply persist/refresh, unauthorized thread and lost-response behavior.

### `/disputes` — Disputes (Phase 10.5)

- Current problems: dense raw case metadata and generic filters do not emphasize requested response.
- Desired experience: know whether action is due and locate the relevant case.
- Visual direction: readable records with status/deadline priority, compact filters.
- Interaction opportunities: filter/paginate/open existing case or begin from booking context.
- Animation opportunities: none beyond navigation feedback.
- UX improvements: plain labels while preserving exact dispute state and deadlines.
- Components affected: DisputeList and shared filters; scope customer styling carefully.
- Dependencies: disputes list, settle/PortalState and customer permissions.
- Validation: empty/open/response-due/closed/failed, filters/pagination and timezone/readability.

### `/disputes/new` — Open dispute (Phase 10.5)

- Current problems: raw order-ID entry when context is absent is a difficult dead-end flow.
- Desired experience: load an allowed booking and submit factual case information.
- Visual direction: clear booking context and narrow form; better guidance for existing ID entry without adding APIs.
- Interaction opportunities: current context lookup, reason/evidence and submit.
- Animation opportunities: pending feedback only.
- UX improvements: useful existing booking link and scoped validation; no invented booking picker backend.
- Components affected: NewDispute and DisputeForm.
- Dependencies: customer dispute context/create API, attachments and permitted order.
- Validation: no context/valid context/forbidden context, field/evidence errors, saved case and duplicate prevention in disposable data.

### `/disputes/[id]` — Dispute detail (Phase 10.5)

- Current problems: operational evidence/status presentation can overwhelm the guest task.
- Desired experience: understand requested response, evidence, status and available action.
- Visual direction: clear case summary, readable timeline and separated response form.
- Interaction opportunities: permitted reply/evidence/download actions and version-safe refresh.
- Animation opportunities: pending feedback only.
- UX improvements: explicit closed/no-action states and factual deadlines/outcome.
- Components affected: DisputeDetail and DisputeForm; protect owner/admin variants.
- Dependencies: scoped detail/version, response permissions, attachments and decision history.
- Validation: requested/open/closed/unauthorized, stale version, attachment access and mobile long content.

### `/help` — Help (Phase 11)

- Current problems: running API previously lacked published help/contact; failure boundary gives unrelated search guidance.
- Desired experience: search actual published answers and find the appropriate support route.
- Visual direction: narrow readable FAQs, compact search and factual contact panel.
- Interaction opportunities: URL-backed FAQ search, accordion keyboard and policy links.
- Animation opportunities: native disclosure or restrained height feedback only when useful.
- UX improvements: specific no-match and service-unavailable recovery; do not invent FAQ/contact data.
- Components affected: help page, ContentBody and marketing error boundary.
- Dependencies: published help/contact APIs; content provisioning may block successful-state verification.
- Validation: published/default/filtered/no-match/error, disclosures, contact links and mobile readability.

### `/help/history/[kind]/[version]` — Published help history (Phase 11)

- Current problems: raw version/effective timestamp and minimal historical distinction.
- Desired experience: read immutable historical publication and return to current guidance.
- Visual direction: clear historical label and editorial text width.
- Interaction opportunities: current help link and native FAQ disclosures.
- Animation opportunities: none beyond disclosure state.
- UX improvements: distinguish historical help/contact from current content without editing the publication.
- Components affected: history page and ContentBody.
- Dependencies: publicContent version read and help/contact kind validation.
- Validation: real published historical version, invalid kind/version, contact/help variants and long content.

### `/policies/[kind]/[[...version]]` — Policies (Phase 11)

- Current problems: ISO timestamp/raw version display and publication/network failures need careful review.
- Desired experience: understand current or historical published terms and retain permanent version access.
- Visual direction: readable legal text, quiet metadata and clear current/version context.
- Interaction opportunities: existing help/support/permanent-version navigation.
- Animation opportunities: none.
- UX improvements: human-readable effective date without losing canonical version facts.
- Components affected: policies page and ContentBody.
- Dependencies: published terms/privacy/cancellation content, metadata and notFound behavior.
- Validation: all three kinds, current/versioned, malformed version/kind, failed content and long text at phone/desktop widths.

## Implementation Phases

Only one phase is active. Each phase is read, implemented or intentionally retained, verified and recorded before starting the next. Subphases below are separate gates; do not bulk-edit all of Phase 10.

| Phase | Scope                                                                                             | Depends on          | Completion evidence                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Master plan, prior-work baseline and complete customer source inventory                           | Existing repository | 29 page records plus ancillary handlers; preserved prior evidence                                                                                  |
| 1     | Full customer audit, live public/gate inspection, authenticated coverage gaps and priority ledger | 0                   | Source/asset/component audit, actual browser findings, route/state coverage ledger and ranked findings                                             |
| 2     | Resolve token/documentation drift and form primitives only where audit supports change            | 1                   | Computed tokens/documentation agreement, control focus/contrast/mobile checks, scoped lint                                                         |
| 3     | Public/customer navigation and page-layout consistency                                            | 2                   | Route-aware navigation, keyboard/menu/focus, safe-area/long labels and preserved auth gates                                                        |
| 4     | Home composition and showcase refinement                                                          | 3                   | Hero/search/card populated/empty/error at responsive widths, search/save journey                                                                   |
| 5     | Search/location/saved state refinement                                                            | 4                   | Filter/sort/back/canonical/saved matrix and responsive screenshots                                                                                 |
| 6     | Property exploration, quote selection and mobile action                                           | 5                   | Gallery/availability/quote/privacy/map failure matrix and keyboard                                                                                 |
| 7.1   | Quote review and profile interruption                                                             | 6                   | Active/expired/incomplete/existing-order states and preserved amounts                                                                              |
| 7.2   | Payment recovery/result state presentation                                                        | 7.1                 | Fake-provider state matrix and refresh/duplicate guards; live-provider limits recorded                                                             |
| 8     | Login/onboarding/account/phone                                                                    | 7.2                 | Development OTP, profile/session/photo validation and return intent                                                                                |
| 9.1   | Booking history/detail                                                                            | 8                   | Status/action/financial/download matrix                                                                                                            |
| 9.2   | Book-again/cancellation                                                                           | 9.1                 | Fresh quote and disposable cancellation preview/receipt/idempotency checks                                                                         |
| 10.1  | Notifications/payment availability                                                                | 9.2                 | Empty/read/delivery and honest capability-state evidence                                                                                           |
| 10.2  | Review/report                                                                                     | 10.1                | Eligibility/moderation/report/duplicate matrix                                                                                                     |
| 10.3  | Privacy/outcomes/downloads                                                                        | 10.2                | Disposable request/state/download scoping and meaningful status presentation                                                                       |
| 10.4  | Support list/create/thread                                                                        | 10.3                | Context/draft/persist/attachment/closed/version matrix                                                                                             |
| 10.5  | Dispute list/create/detail                                                                        | 10.4                | Customer context/response/version/evidence states; cross-role checks                                                                               |
| 11    | Help/policy/history and nonfinancial error recovery                                               | 10.5                | Published/versioned/failed/no-match content and readable metadata                                                                                  |
| 12    | Cross-route motion/responsive/accessibility refinement                                            | 11                  | Focus, reduced motion, 320/390/768/1024/1440 stress cases and axe; fix concrete remaining gaps                                                     |
| 13    | Every-route final QA and independent finish review                                                | 12                  | All 29 patterns validated with state coverage, important journeys, build/tests/lint, Impeccable and Vercel findings resolved or explicitly blocked |

## Dependencies

Data/API/business behavior are fixed boundaries. A missing published record or provider capability cannot be replaced by invented success. Use the existing disposable fixture helpers on owned local services for mutations, never production sessions/data. Current external backend changes are outside this redesign; do not revert them. Shared customer/partner/admin components require a check of affected role variants. Read installed Next docs before framework-dependent changes.

Design skills available: Taste, Design.md, Impeccable, Emil, Vercel guidelines, Ponytail, Caveman and now Playwright CLI. Prior Impeccable engine loading failed; manual skill review and independent finish review remain available, but an automated score must not be claimed. Current CLI attempts could not create its user-profile cache under workspace permissions; Python Playwright is an existing working fallback. No dependency installation is required.

## Validation

Each phase records implementation or a justified retain decision, application operation, direct visual inspection, relevant responsive/a11y checks, interaction/contract preservation and actual commands/results. Read-only phases record their artifacts and observed environment limitations. No unrun check is marked passing. A login redirect does not certify private content; a rendered error boundary does not certify successful content delivery. A passing build does not establish product completion.

For UI edits: focused lint/format checks, appropriate existing tests, phase-specific Playwright screenshots/actions and axe; final production build after cumulative changes. Use real supplied assets and actual fixture states. Keep provider-fake QA distinct from live-provider QA. Track console errors separately from uncaught exceptions. Retain durable JSON/Markdown evidence under docs; `.impeccable` screenshots are locally ignored by the user's current gitignore, so these are local review artifacts unless intentionally exported later. Do not change that preference implicitly.

## Progress

- [ ] Phase 0 — master plan and customer source inventory
- [ ] Phase 1 — audit
- [ ] Phase 2 — foundation
- [ ] Phase 3 — navigation/layout
- [ ] Phase 3.1 — public footer destination browser
- [ ] Phase 3.2 — customer navigation/shared layout boundaries
- [ ] Phase 4 — home (reopened: visual and interaction rebuild)
- [ ] Phase 5 — search/location/saved
- [ ] Phase 6 — property/quote selection
- [ ] Phase 7.1 — quote review
- [ ] Phase 7.2 — payment/result
- [ ] Phase 8 — identity/account
- [ ] Phase 9.1 — booking history/detail
- [ ] Phase 9.2 — repeat/cancel
- [ ] Phase 10.1 — notifications/payment availability
- [ ] Phase 10.2 — reviews/report
- [ ] Phase 10.3 — privacy
- [ ] Phase 10.4 — support
- [ ] Phase 10.5 — disputes
- [ ] Phase 11 — content/error recovery
- [ ] Phase 12 — cross-route refinement
- [ ] Phase 13 — final QA/finish review

## Decisions

- 2026-09-28: continue from the existing shared refresh; do not restart or silently certify untested private states.
- Use `RENTra-UI-REDESIGN-PLAN.md` at frontend project root as the single execution record. Windows resolves the capitalization variants in the request to the same file.
- Maintain separate phase gates, with small booking and secondary-page subphases.
- Keep local design reference files normative for tokens and this file normative for execution/progress.
- Keep backend/provider limits explicit and preserve the user's unrelated ongoing work.

## Issues / Blockers

- Prior server missing help/contact publication routes; recheck against current running server before deciding if this remains a blocker.
- Network restrictions affected map tiles and sitemap policy reads; distinguish environment failure from UI fault.
- Existing repository-wide lint failures remain; scoped changed-file lint is necessary and final baseline must be reported accurately.
- Prior authenticated browser matrix did not cover every account/review/support/dispute/cancellation route or every checkout state.
- Real payment/OTP delivery and assistive-technology verification remain separate from disposable automated QA.
- Resolved in Phase 2: DESIGN.md and local structured narrative now match the existing 16:8 mobile home/skeleton; shared controls retain the documented keyboard outline.

## Phase Log

### Phase 0

#### Completed

Read the new task-management instructions, repository guidance, existing design/inventory/evidence and customer route sources. Established all 29 page records and ancillary download/error/loading surfaces before further UI edits.

#### Design Decisions

Retain the existing nature-led direction, document the partial baseline and use small state-based phase gates.

#### Files Changed

`RENTra-UI-REDESIGN-PLAN.md` only. No product UI changes in this phase.

#### Verification

Existing source inventory contains 120 page patterns; customer subset is 8 marketing + 1 login + 20 protected pages. Prior evidence is linked and bounded. CLI availability confirmed; its cache permissions failure recorded without claiming a browser run.

#### Remaining Issues

Current live audit and deeper private-state evidence are still needed. No redesign completion claim.

#### Next Phase

Phase 1: run the read-only browser audit, inspect current screenshots and customer components, build the ranked finding and route/state coverage ledger. Do not begin Phase 2 edits until this audit gate is recorded.

### Phase 1

#### Completed

Created the [ranked customer audit and coverage ledger](docs/rentra-ui-redesign-audit.md). Inspected all 29 page sources and their component/API boundaries. Fresh read-only Playwright captured 26 public route/viewport states (including negative historical-publication cases) and verified anonymous login gates for all 20 protected page patterns. An independent reviewer confirmed source/plan completeness and prioritized remaining private-layout gaps.

#### Design Decisions

Retain the existing successful home composition and truthful financial/authentication behavior. Prioritize registry-scaled navigation, contextual recovery and booking action hierarchy. Treat source hypotheses and missing successful-state coverage separately from observed defects. Confirmed installed Next error-boundary `retry()` is valid; no speculative repair.

#### Files Changed

`RENTra-UI-REDESIGN-PLAN.md`, `docs/rentra-ui-redesign-audit.md`, `docs/rentra-ui-redesign-phase-1.json`, `scripts/verification/redesign-audit.py`. No product UI changes.

#### Verification

26 captures at 390/1440 px; no horizontal overflow, axe WCAG A/AA violations or uncaught browser exceptions. All 20 protected routes redirect anonymous users to login. Home mobile search bottom ~764 px within 844 px viewport; public inputs compute 16 px. Footer measures 2618 px at 390 px with 46 links. All screenshot files decoded. Help fails; all three policies and unpublished history examples show missing content, so successful publications are not certified. Separate reviewer confirmed 29/29 page records.

#### Remaining Issues

Current authenticated successful states and real published history/content remain unverified. Actual help API and missing policies are external dependencies. Customer form/layout hypotheses require their phase-specific fixture checks. Full redesign remains incomplete.

#### Next Phase

Phase 2: reconcile mobile home ratio in DESIGN.md and structured samples with the existing 16:8 runtime; validate existing token/control foundation. Keep custom-form integration in its page phase so styling changes are not made without signed-in state evidence. Then Phase 3 addresses the measured long footer and navigation/layout contract.

### Phase 2

#### Completed

Reconciled design-reference geometry and control rules with runtime. Removed shared Button/Input `outline-none` after browser measurements showed it suppressing the global keyboard outline. Updated the global design-reference comment and local structured narrative. Added reproducible foundation verification and [phase report](docs/rentra-ui-redesign-phase-2.md), retaining before/final JSON evidence.

#### Design Decisions

Retain the existing palette, responsive typography, local font, radii, shadows and mobile hero composition. Allow the established global outline to apply instead of duplicating focus styles. Preserve component rings and form semantics. Defer custom customer-form integration to phases with signed-in state coverage.

#### Files Changed

`DESIGN.md`, `app/globals.css` (comment), `components/ui/button.jsx`, `components/ui/input.jsx`, local ignored `.impeccable/design.json`, `scripts/verification/redesign-foundation.py`, Phase 2 report/before/final evidence, and this plan.

#### Verification

54/54 foundation checks pass. All 36 palette entries, nine public type roles and five shadows agree with references. At 390/768/1440px: correct live radii, page width, hero ratios, 16/14px input type, controls at least 44px, two-pixel input/button outlines, no login axe violations/overflow. Forced-colors and reduced motion pass; no uncaught browser exceptions. Nine PNGs decode; focus screenshots directly inspected. Scoped ESLint/format/whitespace checks and 36/36 tests pass. Production build succeeds with 77 static pages after two sitemap timeout retries and existing content/network fallback warnings. Independent reviewer: disposition ship, no material Phase 2 fixes.

#### Remaining Issues

Published help/policy success and sitemap/API latency remain external issues. Custom private forms, compact operational control variants and later route states are not certified by this foundation gate. Full redesign remains incomplete.

#### Next Phase

Phase 3: read this plan and the public/customer layouts; group the 46-link mobile footer directory while retaining existing city/intent routes, useful discovery access and legal/support links. Verify keyboard/disclosure behavior, responsive long registries and navigation/authentication contracts. Do not begin later page phases as part of that change.

### Phase 3.1 - Public footer correction

#### Completed

Replaced the oversized flat directory and the rejected per-city accordion grid with a compact destination browser. Larger screens use city tabs; phones use a labelled native selector. One shared link panel contains the selected city's category and visit links. All 46 original footer destinations remain prerendered, including support/search/legal access. See [phase report](docs/rentra-ui-redesign-phase-3.md).

#### Design Decisions

The accordion attempt reduced the default height but opening one city stretched an entire grid row and created unacceptable empty space. It was rejected and replaced. City selection now changes content within a stable shared panel; all ten city states have identical height at each measured width. Retain the existing forest identity, concise visit labels and flat separators. Desktop tabs have arrow/Home/End navigation and one tab stop; hidden panels leave the keyboard order. Mobile uses the platform's city selector.

#### Files Changed

`app/(marketing)/layout.js`, `components/customer/FooterDiscovery.jsx`, `DESIGN.md`, local ignored `.impeccable/design.json`, `scripts/verification/redesign-navigation.py`, original before/final JSON evidence, the phase report and this plan.

#### Verification

106/106 read-only browser checks pass. At 390/768/1440px, all original hrefs remain, all ten cities expose their correct routes, switching cities produces no height change, keyboard selection/focus and Saved active navigation work, and footer axe WCAG A/AA checks have zero violations. Edge widths 320/1024/1920 also have no overflow or city-switch reflow. Long-label DOM stress with 1/30 cities passes. Skip-to-main, actual city/search navigation and all 20 anonymous customer gates pass. No uncaught browser exceptions. Default/selected mobile and desktop captures directly inspected. Independent finish review: ship, no material fixes. Scoped ESLint, Prettier and whitespace checks pass. Production build succeeds with 77/77 generation after two sitemap timeout retries and existing content/network fallback warnings; the linked report records the limits.

#### Remaining Issues

The remaining shared navigation/layout review was completed in Phase 3.2 below. Customer page content and private form states still belong to their later phases. Existing unpublished help/policy content and sitemap/API latency remain external issues. The full redesign is incomplete.

#### Next Subphase

Phase 3.2: review customer navigation on narrow screens, account menu keyboard/focus behavior and public/protected layout boundaries. Retain working behavior and document actual defects before changing it. Do not start home or later page redesign phases until Phase 3 is recorded complete.

### Phase 3.2 - Customer navigation and shared layout review

#### Completed

Reviewed direct account navigation, authenticated/public header identity, mobile labels/targets, current state, skip focus and layout ownership. Added visible account selection and wrapping headers/navigation after baseline browser evidence confirmed absent account feedback and enlarged-text overflow. Kept normal logo/icon/avatar dimensions while labels enlarge. Added a reproducible read-only isolated shell fixture and [phase report](docs/rentra-ui-redesign-phase-3-2.md).

#### Design Decisions

Keep the existing header identity and direct account link; no dropdown exists or is needed for this scope. Retain the Saved provider, role visibility, profile-photo fallback, skip links and session/error guards. Protected layout owns 16/24px outer gutters and the public container width. Page-specific nested spacing remains in the corresponding page phase, preserving deliberate text widths and shared operational surfaces until their real content is inspected.

#### Files Changed

`components/customer/CustomerNavigation.jsx`, public/customer layouts, `DESIGN.md`, local ignored structured narrative, `scripts/verification/redesign-shell.py`, `scripts/verification/redesign-public-shell.py`, before/final/live JSON, phase report and this plan. No backend or dependencies changed.

#### Verification

76/76 isolated Next development/in-memory API browser checks pass at 320/390/768/1024/1440px. No overflow, correct current state, all four customer targets at least 44px, skip focus, keyboard outline, zero header axe violations, actual cross-layout account navigation, 200% text reflow and available content space. Controlled guest/client/blocked/outage guard responses preserved; no API writes or browser/console exceptions. These are frontend shell/guard checks, not real backend or private-content certification. Scoped ESLint passes. 22/22 additional live signed-out checks pass across four widths, including enlarged text, header axe and login navigation. Scoped formatting and whitespace checks pass. Independent finish reviewer: ship, no material fixes. Production build succeeds with 77/77 generation after two sitemap timeout retries and existing public-content/network fallback warnings.

#### Remaining Issues

Real authenticated page states, physical-device safe areas and page-specific inner spacing remain in their planned phases. Published content/sitemap API conditions remain outside this shell change. Full redesign is incomplete.

#### Next Phase

Phase 4: inspect the existing home composition and real lower-page discovery content. Preserve the good first-viewport search, supplied photography and URL-backed intent; change only confirmed hierarchy/density/wrapping gaps and verify selected/empty/error states.

### Phase 4 - Home discovery (historical pass, superseded)

#### Completed

Retained the successful hero/search/trust composition and supplied API photography. Deduplicated identical price qualifications above the home grid, with accessible card-link descriptions and per-card notes retained when conditions differ. Property titles use the full width; location/reviews share a wrapping row with each rating kept together. Unknown prices have no misleading from prefix. Distinguished successful empty listings from failed reads. Search fields now have 44px targets while cell padding preserves form height. See [phase report](docs/rentra-ui-redesign-phase-4.md).

#### Design Decisions

Keep all sixteen actual listings, photo routes, real badges/reviews, price units and qualified starting prices. Share only an exactly identical nonempty API note across every home listing; default card behavior elsewhere keeps each note. Retain independent Save controls, search parameters and existing photo/press feedback. No new animation, decorative panels, assets or fabricated product proof.

#### Files Changed

`app/(marketing)/page.js`, `components/rentra/ListingCard.jsx`, `components/rentra/SearchBar.jsx`, `DESIGN.md`, local ignored narrative/captures, `scripts/verification/redesign-home.py`, before/final/live/console evidence, phase report and this plan.

#### Verification

69/69 isolated frontend/in-memory API checks pass: six widths from 320 to 1920px, all listings, full-width titles, shared/mixed qualifications, zero main-region axe violations, empty/failed/long-title/rating/unknown-price/missing-photo states, search URL parameters, independent guest save/recovery, failed image recovery, reduced motion and focus. Ten additional live checks confirm all sixteen listings/photos, first-viewport 390px search and guest save/recovery. No uncaught browser exceptions or unexpected API writes. The screenshot helper now avoids its temporary caret-style mutation; a fresh live probe reports zero console errors/exceptions. Fixture image-resource and screenshot-injected hydration logs are retained and explained in the report. Direct visual review and independent reviewer: ship, no material fixes. Scoped ESLint and all 36 existing tests pass. Production build succeeds with 77/77 generation after two sitemap timeout retries and existing content/network fallback warnings. Scoped Prettier and whitespace checks pass.

#### Remaining Issues

Phase 5 still owns search/location/saved refinement and their filter/state matrices. Real authenticated customer and hosted-provider states remain unverified by this home gate. Missing published content, source asset/network conditions and sitemap latency remain external dependencies. Full redesign is incomplete.

#### Next Phase

Phase 5: inspect search/location/saved with populated, selected, empty and failed states. Improve confirmed filter/result hierarchy while preserving URL-backed filters/sort/date modes, canonical location routes, local/account saves and saved booking intent. Verify mobile results, apply/back/refresh and independent Save navigation before marking that phase complete.

### Phase 4 reopened - premium home rebuild

The user's rejection supersedes the earlier visual acceptance. The retained split hero/grid was too similar to the prior page. Current implementation replaces it with an immersive manual photo hero, portrait property rail, interactive occasion/city planner and clearer editorial typography. Existing search, Save, pricing and failure behavior remains. Research and decisions: [rebuild record](docs/rentra-ui-redesign-phase-4-rework.md).

Verification: 69 fixture checks pass, plus live carousel/hero/tab/city/overflow/accessibility checks. All 36 existing tests and scoped ESLint pass. Fresh desktop/mobile captures and an independent finish review confirm the composition materially changes the page. The one review finding, dark-surface focus contrast, is fixed and visually verified. Production build succeeds with 77/77 static generation, following the existing two sitemap timeout retries and contact/policy fallback warnings. Scoped Prettier and whitespace checks pass.

Current next action: present the rebuilt home for visual review, then continue Phase 5 search/location/saved. The earlier Phase 5 next-action entry is historical and does not bypass this reopened home work.

### Entire redesign reopened

User direction supersedes all earlier phase-completion and next-phase statements: reassess the full design system, shared components, navigation, landing page and every route in this plan. Preserve working functionality and useful evidence, but do not treat previous visual decisions as accepted. Current focused improvement makes every occasion tab change its photograph, atmosphere, copy and discovery action together.

### Shared shell rework

Replaced the pale footer with a forest closing composition, inverse brand, clear discovery/support/hosting groups, an all-width native city selector and all five occasion routes. Public and protected customer layouts share a framed sticky navbar with a phone wordmark and pill-shaped navigation controls. See [shell rework report](docs/rentra-ui-shell-rework.md). All broader redesign phases remain open.
