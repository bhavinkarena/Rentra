# Rentra UI/UX Redesign

> Persistent source of truth for the customer-facing redesign. Any agent or session resuming this work reads this file first, finds the first unchecked phase under **Progress**, and continues from **Next Phase**. Never recreate this file; never repeat a completed phase unless verification shows it needs revision.

Started: 29 Sep 2026 · Repo: `Rentra/` (Next.js 16.3.4, React 19, Tailwind 4) · Scope: customer-facing routes only (public marketing, guest login, authenticated customer). Partner, admin, staff and wizard surfaces are out of scope except where a shared component forces a scoped change.

---

## Ground rules (read before every phase)

1. **The owner-approved home page is locked.** On 29 Sep 2026 the owner rejected an earlier full redesign (commits `33d6d33`, `8539cac`) and restored the pre-redesign look. The following were then explicitly re-approved and must not be restyled without the owner asking:
   - Full-bleed photo hero with the search bar inside it, intent chips, and the photo switcher (`components/rentra/HeroPhotos.jsx`).
   - Light, non-floating public header (`app/(marketing)/layout.js`).
   - Trust strip below the hero (`components/rentra/TrustStrip.jsx`).
   - City rows with horizontal scroll, "Near {City}" (`components/rentra/CityRow.jsx`).
   - "What does your kind of day look like?" occasion picker (`components/rentra/OccasionPicker.jsx`).
   - Compact dark footer, `#142e23` with `#dbeaaf` accent.
     Do **not** bring back the floating pill header, the rounded carousel hero, the oversized editorial display type, or the portrait property rail.
2. **Evolve, don't replace.** The design direction is to carry the approved home page's language (photography, forest green, lime accent on dark, chip controls, flat cards) into every other customer page. It is not a new visual world.
3. **The owner reviews piece by piece.** Every visible phase ends with before/after screenshots at 390 px and 1440 px, saved under `.impeccable/redesign/<phase>/` (gitignored), and a short summary for the owner. Stop for owner feedback after any phase that changes a page's composition (not just polish).
4. **Frontend only.** No API, backend, route, query-parameter, auth, validation, money-formatting or mutation changes. Frontend changes must tolerate missing API fields (frontend and backend deploy separately).
5. **Truthful data only.** No invented ratings, counts, badges, testimonials, guarantees or photos. Missing data gets an honest empty/unavailable state.
6. **Next.js 16 is not the Next.js in training data.** Read `node_modules/next/dist/docs/` before touching framework APIs (see `AGENTS.md`).
7. **Other agents work in this repo.** Check `git status` and `git log` before editing shared files. Do not commit unless the owner asks.

---

## Vision

A guest in Gujarat, usually on a phone, finds a farmhouse for a day out or a night away with friends or family. The whole site should feel like the home page already does: sunlit photography, calm forest green, clear prices, and one obvious next step. From the first search to the payment result and the booking record afterwards, every screen should look like it belongs to the same product, show the real price and state honestly, and fit a laptop or phone screen without wasted space.

Success looks like:

- A guest can go from home → results → listing → dates → quote → payment without meeting an unstyled, inconsistent or confusing screen.
- Account, booking, support and dispute pages feel like the same Rentra, not an admin tool.
- Icons with short labels replace paragraphs where a paragraph adds nothing (owner preference).
- No regressions: every existing route, form, action and state keeps working.

## Current State

Stack: Next.js 16.3.4 App Router, React 19.2.8, JavaScript/JSX, Tailwind 4, shadcn styling over Radix, Lucide + react-icons, local Plus Jakarta Sans. Server components read `lib/api/endpoints.js`; customer mutations go through `lib/actions/`; Redux Toolkit/RTK Query for browser reads.

Phase 1 baseline (live public API, 29 Sep 2026, screenshots in `.impeccable/redesign/phase-1-baseline/`):

| Area                                            | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home `/`                                        | Owner-approved. Strong: full-bleed hero, search in hero, chips, city rows, occasion picker, dark footer. Defects: occasion-picker photo stays a blurred placeholder in a full-page capture (lazy image never resolved), one listing card with no photo shows a bare grey box.                                                                                                                                                                                                                                                                   |
| Search `/search`, location `/[city]/[category]` | Weakest public page. A tall boxed form (6 fields + Filters + Show places) takes the whole first mobile viewport; results start below the fold on a phone. Every card repeats the same 2-line price note (the home page shows it once). "Sort / Apply" link is a no-JS pattern shown to everyone. Pagination is plain text "Page 1 of 11 Next". SEO city links are a block of underlined text. Search form does not share the hero search bar's look.                                                                                            |
| Listing `/listing/[handle]`                     | Solid structure (gallery mosaic, facts, visit hours, amenities, rules, host, cancellation table, map, similar). Weaknesses: visit hours are three tall stacked cards; mobile gallery is inset with a separate "View all 6 photos" button instead of a swipeable full-width gallery; breadcrumb wraps to two lines on mobile; mobile booking bar says "Choose dates" twice, shows no price, and truncates its helper text ("Razorpay Test · no rea…"); many different card recipes on one page (visit hours, host, cancellation, choose-visits). |
| Saved `/saved`                                  | Empty state is two sentences and an underlined link in a large empty area. No illustration/icon, no primary button.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Help `/help`                                    | Native `<details>` FAQ cards with a default black triangle and ~30 px of dead space under each question; the search input is square while the button has a different radius; contact block is plain text.                                                                                                                                                                                                                                                                                                                                       |
| Policies `/policies/[kind]`                     | Shows raw ISO timestamp: "Effective 2026-09-21T00:00:00.000Z". Otherwise readable.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Login `/login`                                  | Good. Pill input + pill button is correct under D6 (single-line input next to a pill action).                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 404                                             | **No `app/not-found.js`.** Unknown URLs render Next's default unstyled black-on-white "404 · This page could not be found." with no header, footer or way back.                                                                                                                                                                                                                                                                                                                                                                                 |
| Customer shell                                  | `app/(customer)/layout.js` uses its own header (`max-w-6xl`, not sticky, no "List your place") and **no footer**, while public pages use `--container-page` (1280 px) and the dark footer. Signing in visibly switches to a different-looking site.                                                                                                                                                                                                                                                                                             |
| Customer pages                                  | Require login; audited from source (full table under Phase log → Customer page audit). Two visual languages (polished account/bookings/checkout vs bare 4 px-box disputes/support/reviews), 5+ form recipes, varying containers, raw IDs/enums/UTC times, one designed empty state, missing error/404 boundaries.                                                                                                                                                                                                                               |
| Accessibility                                   | axe-core WCAG 2.1 AA: **0 violations** on all 8 public pages at 390 and 1440 px. Must stay at 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Overflow                                        | No horizontal overflow on any public page at 390 or 1440 px.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Tokens                                          | Runtime radii in `app/globals.css` are 8/12/16/24 px (restored from `c1acce1`); `DESIGN.md` still documents 6/10/14/20 px and the rejected redesign. `DESIGN.md` is stale.                                                                                                                                                                                                                                                                                                                                                                      |
| UI primitives                                   | `components/ui/` has only `button`, `input`, `badge`, `checkbox-card`, `rentra-loader`. No shared select, textarea, field, page-header, empty-state or section primitives, so pages hand-roll their own.                                                                                                                                                                                                                                                                                                                                        |

## Design Direction

**"The home page, everywhere."** Take what the owner approved on the home page and make it the system:

- **Photography first** on discovery surfaces; flat cards (photo + text, no box).
- **Forest green `brand-600/700`** is the only action colour. **Lime `#dbeaaf` on forest `#142e23`** is the premium accent, used on dark surfaces only (footer, hero overlays, confirmation moments).
- **Chip controls** (the hero intent chips) become the standard for quick filters, visit types, tabs and sort.
- **One field recipe**: the hero search bar's labelled cells for search; a single 44 px input/select/textarea recipe with the control radius elsewhere.
- **Icon + short label rows** instead of stacked cards or paragraphs for facts (guests, bedrooms, hours, status).
- **One page-header pattern** for all non-home pages: small breadcrumb/back link, h1, one-line description, optional actions on the right.
- **Calm operational pages**: account/booking/support pages are Operate mode — rows and sections separated by dividers, one financial summary card per page at most.
- **Honest states**: every empty, error, loading and permission state has an icon, a one-line explanation and one real next action.

## Customer Journey

| Stage              | Where                                                                                                                              | What must be true after the redesign                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Discovery          | `/` hero, occasion picker, city rows, footer city links                                                                            | Search usable in the first mobile viewport (already true, keep).                                       |
| Exploration        | `/search`, `/[city]/[category]/[[...place]]`                                                                                       | Results visible in the first mobile viewport; filters collapsed behind one control; state kept in URL. |
| Property discovery | Listing cards (home rows, search grid, similar, saved)                                                                             | One card anatomy everywhere; price qualification shown once per list, not per card.                    |
| Property details   | `/listing/[handle]`                                                                                                                | Swipeable photos on phone; key facts as icon rows; visit hours compact.                                |
| Desire             | Gallery, occasion imagery, amenities, reviews                                                                                      | Real photos only; amenities as icons.                                                                  |
| Trust              | Verified badge (API), host card, cancellation table, price breakdown, intermediary statement                                       | Every trust element is data-backed; nothing invented.                                                  |
| Booking            | Booking box / mobile bar → `/login` → `/onboarding` → `/checkout/review/[quoteId]` → `/checkout/[orderId]` → `/bookings/[orderId]` | Mobile bar shows price + one CTA; checkout shows one clear total; result states are unambiguous.       |
| After booking      | `/bookings`, `/bookings/[orderId]` and sub-pages, `/support`, `/disputes`, `/account/*`                                            | Same shell and header as public pages; each record shows status + next action first.                   |

## Customer-Facing Pages

29 pages (8 marketing, 1 auth, 20 customer) + global 404 + error/loading boundaries. Route handlers (`/bookings/[orderId]/calendar|summary`, support/dispute attachments, privacy receipt/export) are downloads and are not restyled.

| #   | Route                             | Source                                                                                             | Auth     | Phase               |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| 1   | `/`                               | `app/(marketing)/page.js`                                                                          | public   | 4 (locked, QA only) |
| 2   | `/search`                         | `app/(marketing)/search/page.js`                                                                   | public   | 5                   |
| 3   | `/[city]/[category]/[[...place]]` | `app/(marketing)/[city]/[category]/[[...place]]/page.js`                                           | public   | 5                   |
| 4   | `/listing/[handle]`               | `app/(marketing)/listing/[handle]/page.js`                                                         | public   | 6                   |
| 5   | `/saved`                          | `app/(marketing)/saved/page.js`                                                                    | public   | 10                  |
| 6   | `/help`                           | `app/(marketing)/help/page.js`                                                                     | public   | 10                  |
| 7   | `/help/history/[kind]/[version]`  | `app/(marketing)/help/history/[kind]/[version]/page.js`                                            | public   | 10                  |
| 8   | `/policies/[kind]/[[...version]]` | `app/(marketing)/policies/[kind]/[[...version]]/page.js`                                           | public   | 10                  |
| 9   | `/login`                          | `app/(app)/login/page.js`                                                                          | guest    | 8                   |
| 10  | `/onboarding`                     | `app/(customer)/onboarding/page.js`                                                                | customer | 8                   |
| 11  | `/checkout/review/[quoteId]`      | `app/(customer)/checkout/review/[quoteId]/page.js`                                                 | customer | 7                   |
| 12  | `/checkout/[orderId]`             | `app/(customer)/checkout/[orderId]/page.js`                                                        | customer | 7                   |
| 13  | `/bookings`                       | `app/(customer)/bookings/page.js`                                                                  | customer | 9                   |
| 14  | `/bookings/[orderId]`             | `app/(customer)/bookings/[orderId]/page.js`                                                        | customer | 9                   |
| 15  | `/bookings/[orderId]/again`       | `…/again/page.js`                                                                                  | customer | 9                   |
| 16  | `/bookings/[orderId]/cancel`      | `…/cancel/page.js`                                                                                 | customer | 9                   |
| 17  | `/bookings/[orderId]/reviews`     | `…/reviews/page.js`                                                                                | customer | 9                   |
| 18  | `/reviews/[reviewId]/report`      | `app/(customer)/reviews/[reviewId]/report/page.js`                                                 | customer | 9                   |
| 19  | `/account`                        | `app/(customer)/account/page.js`                                                                   | customer | 8                   |
| 20  | `/account/phone`                  | `…/account/phone/page.js`                                                                          | customer | 8                   |
| 21  | `/account/notifications`          | `…/account/notifications/page.js`                                                                  | customer | 8                   |
| 22  | `/account/payment-methods`        | `…/account/payment-methods/page.js`                                                                | customer | 8                   |
| 23  | `/account/privacy`                | `…/account/privacy/page.js`                                                                        | customer | 8                   |
| 24  | `/support`                        | `app/(customer)/support/page.js`                                                                   | customer | 9                   |
| 25  | `/support/new`                    | `…/support/new/page.js`                                                                            | customer | 9                   |
| 26  | `/support/[id]`                   | `…/support/[id]/page.js`                                                                           | customer | 9                   |
| 27  | `/disputes`                       | `app/(customer)/disputes/page.js`                                                                  | customer | 9                   |
| 28  | `/disputes/new`                   | `…/disputes/new/page.js`                                                                           | customer | 9                   |
| 29  | `/disputes/[id]`                  | `…/disputes/[id]/page.js`                                                                          | customer | 9                   |
| —   | Global 404 (missing)              | `app/not-found.js` (to create)                                                                     | public   | 3                   |
| —   | Error boundaries                  | `app/(marketing)/error.js`, `app/(customer)/bookings/error.js`, `app/(customer)/checkout/error.js` | —        | 3                   |

## Design System

Runtime authority is `app/globals.css`. `DESIGN.md` is rewritten in Phase 2 to describe the restored, owner-approved look (it currently describes the rejected redesign).

| Area         | Plan                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography   | Keep local Plus Jakarta Sans. Keep runtime scale (`display` 2.75rem/800, `h1` 2.125rem, `h2` 1.625rem, `h3` 1.25rem, `h4` 1.0625rem, `body` 1rem, `meta` 0.875rem, `tiny` 0.75rem). Mobile section `h2` capped so a heading never takes two lines for a two-word title. Tabular figures for money/dates. Inputs 16 px below 768 px (no iOS zoom). |
| Colors       | Keep `brand-*`, `ink-*`, `amber-*`, semantic pairs. Promote the footer's `#142e23` and `#dbeaaf` to named tokens (`--color-forest-deep`, `--color-lime-accent`) so pages stop hard-coding hex. No dark mode for public pages.                                                                                                                     |
| Spacing      | 4 px base. Page gutter 16 px (mobile) / 24 px (≥640). Section gap 40 px mobile / 56 px desktop. Within-section 12–16 px.                                                                                                                                                                                                                          |
| Radius       | Runtime tokens win (`sm` 8, `md` 12, `lg` 16, `xl` 24, `full`). Usage per D6 and `DESIGN.md` → Shapes. No bare `rounded`, `2xl`, `3xl`.                                                                                                                                                                                                           |
| Shadows      | Flat by default. `shadow-md` only on the search bar, booking summary and sticky mobile bar; `shadow-lg` for popovers/dialogs. No hover shadows on info cards.                                                                                                                                                                                     |
| Surfaces     | `ink-25` page, `ink-0` form/summary, `brand-50` supportive tint, forest-deep for footer and confirmation moments.                                                                                                                                                                                                                                 |
| Buttons      | Existing CVA `Button` (default/outline/secondary/ghost/destructive/link), 44 px default, 48 px large, `rounded-full` passed on public/customer pages (D7: no new variant). Pending label + disabled guard kept.                                                                                                                                   |
| Inputs       | Add shared `Select`, `Textarea` and `Field` (label + control + hint + error with `aria-describedby`) beside existing `Input`. Same height/radius/border/focus as `Input`.                                                                                                                                                                         |
| Cards        | `ListingCard` is the only property card (home rows, search, similar, saved). Record rows (bookings, support, disputes) use a shared `RecordRow` pattern: status badge + title + meta line + chevron. One summary-card recipe for money.                                                                                                           |
| Navigation   | One header for public and signed-in pages (the current light marketing header, with the account avatar when signed in). Footer on all public and customer pages (compact variant allowed on checkout). Breadcrumb/back link in the page header.                                                                                                   |
| Badges       | Keep `badge.jsx`. Status badges map booking/support/dispute statuses to semantic colours + text (never colour alone). Verified badge only from API.                                                                                                                                                                                               |
| Dialogs      | Keep Radix Dialog/Popover semantics. Bottom sheet on phones for date/guest pickers where already a dialog.                                                                                                                                                                                                                                        |
| Loading      | Route `loading.js` skeletons match the redesigned page geometry (update per phase). Respect reduced motion.                                                                                                                                                                                                                                       |
| Empty states | Shared `EmptyState`: Lucide icon in a `brand-50` circle, one-line title, one-line body, one primary action.                                                                                                                                                                                                                                       |
| Error states | Shared page-level error using the same `EmptyState` layout with a retry and a route-appropriate link (no search advice on help/policy pages).                                                                                                                                                                                                     |
| Responsive   | Check 320, 390, 768, 1024, 1440. No horizontal overflow; no essential action hidden; first mobile viewport shows the primary content/action. Safe-area padding for sticky bottom bars.                                                                                                                                                            |
| Motion       | 150–200 ms colour/opacity/transform feedback; photo hover scale 200 ms; sheet/dialog enter 200 ms ease-out; no scroll-triggered reveals; no autoplay; everything off under `prefers-reduced-motion`.                                                                                                                                              |

## Page-by-Page Redesign

Each entry is a plan, verified against the real page before implementation. "Validate" lists the minimum checks for the phase that owns the page.

### `/` Home — Phase 4 (locked)

- **Problems:** occasion-picker image can stay as blurred placeholder; no-photo listing shows bare grey box; everything else owner-approved.
- **Desired:** unchanged composition.
- **Visual:** none beyond fixes.
- **Interaction/animation:** keep HeroPhotos manual switcher and OccasionPicker tabs as they are.
- **UX:** photo fallback uses the brand placeholder (mark + "Photos coming soon") instead of a grey box — shared with every card.
- **Components:** `PropertyImage.jsx`, `OccasionPicker.jsx` (image loading only).
- **Dependencies:** Phase 2 placeholder.
- **Validate:** 390/1440 screenshots identical to baseline except the fixes; search in first 390×844 viewport; axe 0.

### `/search` and `/[city]/[category]/[[...place]]` — Phase 5

- **Problems:** tall boxed form hides results on phones; per-card repeated price note; "Sort / Apply" link; plain-text pagination; underlined SEO link block; form style differs from hero search.
- **Desired:** results in the first mobile viewport; refine without losing context.
- **Visual:** compact search summary bar (reusing `SearchBar` cells) + a chip row (visit type, filters button with active count, sort); location pages get a page header with breadcrumb and city/category title; SEO links as chips.
- **Interaction:** Filters open in a sheet/panel (existing `DiscoveryFilters` fields, same names/params); sort auto-submits via JS with the `Apply` button kept only in `<noscript>`/when JS absent; numbered pagination with prev/next.
- **Animation:** result area dims (opacity) while a navigation is pending; nothing else.
- **UX:** price note shown once above the grid when identical (same rule as home); specific empty state ("No places match — clear filters"); error state separate from empty.
- **Components:** `DiscoveryFilters.jsx`, `DiscoveryResults.jsx`, `SearchBar.jsx`, `ListingCard.jsx`, search/location `page.js`, `loading.js`.
- **Dependencies:** Phase 2 (Field/Select, EmptyState, chip button), Phase 3 (page header).
- **Validate:** every query param round-trips (where, visit type, date mode, dates, guests, filters, sort, page); back/refresh keep state; empty/error/populated; 390 results visible above fold; axe 0.

### `/listing/[handle]` — Phase 6

- **Problems:** stacked visit-hour cards; inset mobile gallery + separate button; 2-line breadcrumb on mobile; mobile bar repeats "Choose dates", no price, truncated helper; mixed card recipes.
- **Desired:** decide quickly — photos, key facts, when you can visit, what it costs, book.
- **Visual:** mobile full-bleed swipe gallery with counter (desktop mosaic stays); facts as one icon row; visit hours as a compact 3-column (desktop) / list (mobile) with icons from `slot-icons.js`; host, cancellation and rules as flat sections with dividers; one booking summary card.
- **Interaction:** native scroll-snap gallery (no library), keyboard arrows on desktop lightbox; mobile bar shows "from ₹X / night" (or selected quote) + one "Choose dates"/"Reserve" button; breadcrumb truncates to back link on mobile.
- **Animation:** photo hover 200 ms scale (existing); bar slides in once the booking box leaves the viewport (200 ms, reduced-motion = instant).
- **UX:** separate from-price vs quoted total (existing rule); keep approximate-location privacy; keep WhatsApp clearance.
- **Components:** `components/rentra/listing/*`, `PriceBox.jsx`, `SlotSelector.jsx`, `SaveButton.jsx`, listing `page.js`, `loading.js`.
- **Dependencies:** Phase 2, 3.
- **Validate:** listings with 1, 3, 6 photos and no photo; no reviews / with reviews; availability open/closed; date selection → quote; mobile bar never covers content (safe area); axe 0.

### `/checkout/review/[quoteId]` and `/checkout/[orderId]` — Phase 7

- **Problems (source audit):** see Phase 1 audit notes below; check financial hierarchy, stacked cards, state banners.
- **Desired:** one clear total, what's included, what happens next; unambiguous result states.
- **Visual:** two-column desktop (trip + contact left, sticky price summary right); single column mobile with total pinned near the pay button; confirmation uses forest-deep panel with lime check.
- **Interaction:** existing profile completion, hold creation, payment verification and retry flows unchanged.
- **Animation:** one-shot confirmation check (reduced-motion: static).
- **UX:** expired/failed/processing states each get icon + one-line reason + one action.
- **Components:** `components/customer/Checkout.jsx`, `components/customer/checkout/*`, checkout pages, `checkout/error.js`, loading files.
- **Dependencies:** Phase 2, 3; QA fixture (Phase 2.3).
- **Validate:** fixture states active / expired / processing / failed / confirmed; amounts identical to API; no duplicate submit; 390/1440; axe 0.

### `/login`, `/onboarding`, `/account/*` — Phase 8

- **Problems:** pill input on login; account pages use boxed shortcut grids and long explanations; payment-methods page is bare text; privacy page has long job details competing with request creation; notifications empty state is plain text.
- **Desired:** short tasks that feel finished.
- **Visual:** login unchanged except input radius; onboarding narrow single column; account as a settings list (icon + label + current value + chevron) instead of cards; sub-pages use the page header + Field primitives.
- **Interaction/animation:** existing OTP dialog, pending states; none added.
- **UX:** payment-methods explains the real limit in one line with icon; privacy puts "New request" first, history below as rows.
- **Components:** `CustomerLoginForm.jsx`, `AccountForms.jsx`, `ProfileAvatar.jsx`, `ProfilePhotoForm.jsx`, `NotificationControls.jsx`, account pages.
- **Dependencies:** Phase 2, 3, QA fixture.
- **Validate:** redirect to `/login` when signed out; fixture signed-in pages; form errors/pending; 390/1440; axe 0.

### `/bookings` and sub-pages, `/reviews/[reviewId]/report`, `/support/*`, `/disputes/*` — Phase 9

- **Problems:** inconsistent headers, nested rounded cards, raw identifiers, plain empty states, dispute-new requires raw order ID when context missing.
- **Desired:** each record shows status and next action first; history is scannable.
- **Visual:** `RecordRow` lists with status badges; detail pages: header (title + status + actions), then flat sections; one money summary card.
- **Interaction:** URL-backed search/tabs/pagination unchanged; cancel preview/consent flow unchanged.
- **Animation:** none beyond pending feedback.
- **UX:** references shown as short codes with copy button, not raw UUIDs; empty states per list; dispute-new offers a booking picker when bookings exist (frontend only, using existing list read) — verify data availability first, else keep order-ID entry with better help.
- **Components:** `BookingHistory.jsx`, `BookingRecords.jsx`, `BookingDisplay.jsx`, `CancelVisits.jsx`, `VisitLifecycle.jsx`, `ReviewForms.jsx`, `ReviewDetail.jsx`, `ReviewQueue.jsx`, `SupportForms.jsx`, `SupportRecords.jsx`, `components/disputes/*`, `components/booking/*`. **Shared with partner/admin — scope changes with a customer variant/prop.**
- **Dependencies:** Phase 2, 3, QA fixture.
- **Validate:** each list empty/populated/filtered; detail for confirmed/cancelled/completed; cancel flow preview; support message send (fixture); partner/admin pages using shared components unchanged (screenshot diff); axe 0.

### `/saved`, `/help`, `/help/history/...`, `/policies/...` — Phase 10

- **Problems:** saved empty state weak; help FAQ dead space + native triangle + radius mismatch; policies show raw ISO timestamp; help history raw version.
- **Desired:** calm reading pages (Read mode) and a useful saved list.
- **Visual:** saved uses `ListingCard` grid + `EmptyState`; help FAQ as divider-separated accordion with chevron, contact block with icons; policies with formatted date ("Effective 21 Sep 2026"), sticky in-page contents on desktop.
- **Interaction:** accordion keeps native `<details>` (no JS), chevron rotates 150 ms.
- **UX:** formatted dates via existing domain formatters; guest vs signed-in saved copy.
- **Components:** `SavedPlaces.jsx`, help/policies pages.
- **Dependencies:** Phase 2, 3.
- **Validate:** saved empty/with items (local storage); help search; policy version links; 390/1440; axe 0.

## Implementation Phases

| Phase | Name                           | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                            | Size                 |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| 1     | Research & audit               | Route inventory, live screenshots, axe baseline, source audit of customer pages, this plan                                                                                                                                                                                                                                                                                                                                                       | done in this session |
| 2     | Design-system foundation       | 2.1 tokens (forest-deep, lime-accent, footer-ink named tokens; fix inverted radius scale so `rounded-2xl`/`3xl` ≥ `xl`; replace hard-coded hex/amber/`bg-white`) · 2.2 primitives: `Field`, `Select`, `Textarea`, `EmptyState`, `PageHeader`, button `pill` shape, property photo placeholder · 2.3 QA harness: Node fixture API for signed-in customer pages + CORS proxy for public reads · 2.4 rewrite `DESIGN.md` to match the approved look | medium               |
| 3     | Global shell                   | One header for public + customer layouts (avatar when signed in), footer on customer pages, one container width, `app/not-found.js` + `app/error.js`, customer `error.js` for account/support/disputes, one error UI (route-appropriate copy), remove nested `<main>` (saved, login), human skeleton labels                                                                                                                                      | small                |
| 4     | Home QA                        | Locked page: placeholder + occasion image fix only; regression screenshots                                                                                                                                                                                                                                                                                                                                                                       | small                |
| 5     | Discovery                      | 5.1 search form → compact bar + chips + filter panel · 5.2 results grid, single price note, pagination, sort · 5.3 location pages header/breadcrumb/SEO chips · 5.4 loading/empty/error                                                                                                                                                                                                                                                          | medium               |
| 6     | Listing details                | 6.1 mobile gallery · 6.2 header, facts, visit hours · 6.3 booking box + mobile bar · 6.4 host, rules, cancellation, reviews, map · 6.5 loading skeleton                                                                                                                                                                                                                                                                                          | medium               |
| 7     | Checkout                       | 7.1 quote review · 7.2 payment/result states                                                                                                                                                                                                                                                                                                                                                                                                     | medium               |
| 8     | Auth & account                 | 8.1 login + onboarding · 8.2 account hub · 8.3 phone, notifications, payment-methods, privacy                                                                                                                                                                                                                                                                                                                                                    | medium               |
| 9     | Records                        | 9.1 bookings list + detail · 9.2 again/cancel/reviews/report · 9.3 support · 9.4 disputes                                                                                                                                                                                                                                                                                                                                                        | large (split)        |
| 10    | Content pages                  | saved, help, help history, policies                                                                                                                                                                                                                                                                                                                                                                                                              | small                |
| 11    | Motion & micro-interactions    | Apply motion principles across redesigned pages; audit with `review-animations`/`improve-animations` skills                                                                                                                                                                                                                                                                                                                                      | small                |
| 12    | Responsive refinement          | 320/390/768/1024/1440 sweep of all 29 pages                                                                                                                                                                                                                                                                                                                                                                                                      | medium               |
| 13    | Accessibility & web guidelines | axe on all pages, keyboard pass, Vercel Web Interface Guidelines checklist                                                                                                                                                                                                                                                                                                                                                                       | small                |
| 14    | Playwright journey QA          | Home→search→listing→quote→login→checkout (fixture); account/records journeys; console errors                                                                                                                                                                                                                                                                                                                                                     | medium               |
| 15    | Final polish                   | Impeccable `polish`/`critique`, docs, final status                                                                                                                                                                                                                                                                                                                                                                                               | small                |

## Dependencies

- Phase 2 blocks every later phase (primitives + QA harness).
- Phase 3 blocks 5–10 (page header, shell).
- Phase 2.3 (fixture API) blocks verification of 7, 8, 9.
- Phase 6 depends on 5 only for the shared `ListingCard`/placeholder (can run in parallel after 5.2).
- Phase 9 must check partner/admin screens that share components before completion.
- Phases 11–15 run after 4–10 are complete.

## Validation

Every phase:

1. `npm run lint` and `npm test` pass (`npm run build` at phases 3, 6, 9, 15).
2. Isolated dev server (`RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=<name>`, separate distDir) — never touch the owner's `:3000` server or the hosted Neon DB.
3. Playwright screenshots at 390 and 1440 (plus 320/768/1024 for layout phases) before and after, stored under `.impeccable/redesign/<phase>/`.
4. axe-core WCAG 2.1 AA = 0 violations on touched pages.
5. No horizontal overflow; no new console errors (CORS errors from pointing a local origin at the production API are environmental — use the Phase 2.3 proxy).
6. Every preserved behaviour listed in the page's "Validate" line checked.
7. Plan updated (Completed, Decisions, Files Changed, Verification, Remaining Issues, Next Phase).

QA tooling (scratch, not committed until Phase 2.3 decides): `shoot.mjs` (390/1440 screenshots + overflow + console), `axe.mjs` (WCAG run), both using Playwright with system Chrome (`channel: 'chrome'`).

## Progress

- [x] Phase 1 — Research & audit
- [x] Phase 2 — Design-system foundation (2.1 tokens · 2.2 primitives deferred per D7 · 2.3 QA harness · 2.4 DESIGN.md)
- [x] Phase 3 — Global shell (header, footer, 404, error boundaries) — awaiting owner review (D4)
- [x] Phase 4 — Home QA (locked) — no code change needed
- [x] Phase 5 — Discovery (5.1 · 5.2 · 5.3 · 5.4) — awaiting owner review (D4)
- [x] Phase 6 — Listing details (6.1 · 6.2 · 6.3 · 6.4 reviewed · 6.5) — awaiting owner review (D4)
- [x] Phase 7 — Checkout (7.1 · 7.2)
- [x] Phase 8 — Auth & account (8.1 · 8.2 · 8.3) — awaiting owner review (D4)
- [ ] Phase 9 — Records (9.1 · 9.2 · 9.3 · 9.4)
- [ ] Phase 10 — Content pages
- [ ] Phase 11 — Motion & micro-interactions
- [ ] Phase 12 — Responsive refinement
- [ ] Phase 13 — Accessibility & web guidelines
- [ ] Phase 14 — Playwright journey QA
- [ ] Phase 15 — Final polish

## Decisions

| #   | Date        | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                                             |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 29 Sep 2026 | Evolve the owner-approved home look across the site; no new visual world.                                                                                                                                                                                                                                                                                                                                                                                             | Owner rejected the previous full redesign the same day and restored the old look.                                                               |
| D2  | 29 Sep 2026 | Home composition, header style, footer colours, HeroPhotos, OccasionPicker, CityRow are locked.                                                                                                                                                                                                                                                                                                                                                                       | Explicitly re-approved by the owner.                                                                                                            |
| D3  | 29 Sep 2026 | Runtime tokens in `globals.css` (radius 8/12/16/24) are authoritative; `DESIGN.md` is rewritten to match in Phase 2.4.                                                                                                                                                                                                                                                                                                                                                | `DESIGN.md` still describes the rejected redesign.                                                                                              |
| D4  | 29 Sep 2026 | Stop for owner review after each composition-changing phase, with 390/1440 before/after screenshots.                                                                                                                                                                                                                                                                                                                                                                  | Owner picks design pieces one at a time.                                                                                                        |
| D5  | 29 Sep 2026 | The previous plan (deleted in `3fe6ca0`) is not restored; this is a fresh plan.                                                                                                                                                                                                                                                                                                                                                                                       | The owner deleted it deliberately along with its phase evidence.                                                                                |
| D6  | 29 Sep 2026 | Do not change global radius token values. Rule for customer code instead (matches the home page): buttons, CTAs, chips, tabs, single-line search inputs, icon buttons and avatars `rounded-full`; labelled form fields/selects/textareas, listing photos and icon wells `rounded-md` (12); summary cards, dialogs, record groups `rounded-lg` (16); large feature panels `rounded-xl` (24). Avoid bare `rounded`, `rounded-2xl`, `rounded-3xl`; migrate page by page. | Changing `--radius-*` would restyle partner/admin and every page at once; the inversion (`xl` 24 > `2xl` 16) is fixed by not using `2xl`/`3xl`. |
| D7  | 29 Sep 2026 | Shared primitives (`PageHeader`, `EmptyState`, `Field`/`Select`/`Textarea`) are created in the phase that first uses them, not up front. `ui/button` gets no new "pill" variant; use `rounded-full`. Photo placeholder already exists (`ListingCard` "Photos coming soon", `PropertyImage` fallback).                                                                                                                                                                 | No unused scaffolding.                                                                                                                          |
| D8  | 29 Sep 2026 | Customer-page QA uses a disposable local stack (real backend + throwaway DB + minted session), not hand-written mocks.                                                                                                                                                                                                                                                                                                                                                | Real response shapes and states; no risk of mocks drifting from the API.                                                                        |
| D11 | 29 Sep 2026 | Owner asked to remove the home "Explore places / Farmhouses and villas, city by city / View all" header. Removed the visible header only; the "Near {City}" rows stay, and a screen-reader-only h2 keeps heading order.                                                                                                                                                                                                                                               | Owner request (home is otherwise locked, D2).                                                                                                   |

## Issues / Blockers

| #   | Type        | Issue                                                                                                                                                                                                                                                     | Status                                                                                                                      |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B1  | Environment | Production API (`rentra-backend-ktsv.onrender.com`) rejects browser CORS from local origins, so client-side reads (listing availability, saved sync) fail in local QA.                                                                                    | Resolved by D8: local API on :4100 with `CORS_ORIGINS` for the QA web origin.                                               |
| B2  | Environment | Customer pages need an authenticated customer session; real login needs OTP.                                                                                                                                                                              | Resolved by D8 (see Phase 2 log → QA harness).                                                                              |
| B3  | Data        | Tramba Countryside Estate looked photo-less in Phase 1.                                                                                                                                                                                                   | **Resolved (Phase 4):** capture artefact — photo and occasion image load after scrolling; no missing/broken images on home. |
| B4  | Product     | Dispute "new" without booking context asks for a raw order ID. A booking picker is frontend-only if the bookings list read suffices — confirm in Phase 9.4.                                                                                               | Open                                                                                                                        |
| B5  | Content     | Policy content is titled "Test booking terms" (content from API).                                                                                                                                                                                         | Not a UI issue; note for owner.                                                                                             |
| B7  | Environment | The Mac's disk filled up during Phase 2 (228 GB disk, ~140 MB free). `.next/dev` alone is 4.2 GB and `.next/cache` 958 MB. Run only one QA dev server at a time and delete its distDir when done.                                                         | Owner to free space; keep an eye on `df -h /`.                                                                              |
| B8  | UX          | During an API outage `SavedPlacesProvider` shows a floating red-bordered "Could not reach the server… Retry saved places" box over the footer on every public/customer page (pre-existing; off-system styling and position).                              | Phase 10 (saved).                                                                                                           |
| B9  | UX          | Customer-layout outage fallback (`PortalState`) now sits inside the site chrome, so the header shows "Log in" because the session could not be read. Acceptable; revisit if the owner objects.                                                            | Open                                                                                                                        |
| B10 | Copy        | "Day visit" (search filters/chips) vs "Day picnic" (home chips, booking box, visit hours) name the same slot.                                                                                                                                             | Ask owner which label to use everywhere.                                                                                    |
| B6  | Product     | Customer-facing copy that exposes Test/provider/staff wording (payment-methods "Razorpay Test", cancel "Actual bank refund: ₹0", disputes intro, notifications "accepted by provider") is factual legal/operational text. Rewording needs owner approval. | Ask owner in Phase 8/9.                                                                                                     |

---

## Phase log

### Phase 1 — Research & audit (complete, 29 Sep 2026)

**Completed**

- Read `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `docs/rentra-ui-route-inventory.md`, the deleted prior plan (for context only), owner memory notes.
- Ran the app in an isolated dev server (`RENTRA_BROWSER_FIXTURE_ID=audit`, port 3131) against the production public API (read-only GETs).
- Captured 390 px and 1440 px screenshots of `/`, `/search`, `/mehsana/farmhouse`, a listing, `/saved`, `/help`, `/policies/terms`, `/login`, `/bookings` (→ redirects to `/login` when signed out, as expected) and an unknown URL.
- axe-core WCAG 2.1 AA on 8 public pages × 2 widths: 0 violations.
- Horizontal overflow check: none.
- Source audit of all 20 customer pages and their layout/loading/error files (see "Customer page audit" below).
- Wrote this plan.

**Design Decisions** — D1–D5 above.

**Files Changed** — `RENTra-UI-REDESIGN-PLAN.md` (new). No product code changed.

**Verification** — Screenshots reviewed manually; axe + overflow scripted; console errors limited to the environmental CORS failures (B1) and the expected 404 resource error on the unknown URL.

**Remaining Issues** — B1–B5. Customer pages not yet seen rendered (needs Phase 2.3 fixture).

**Next Phase** — Phase 2.1: add named tokens for `#142e23`/`#dbeaaf` in `app/globals.css` and replace hard-coded uses (`grep -rn "142e23\|dbeaaf" app components`); confirm radius tokens; then 2.2 primitives, 2.3 QA harness, 2.4 `DESIGN.md`.

### Customer page audit (Phase 1, source-based)

Line numbers are as of 29 Sep 2026; re-check before editing.

**Shell and primitives**

- `app/(customer)/layout.js`: inline, non-sticky header at `max-w-6xl` (l.35), `main` at `max-w-6xl px-4 py-8 sm:py-12` (l.43), no footer; auth-failure fallback is `max-w-5xl` with no header (l.23).
- `app/(marketing)/layout.js`: sticky header at `--container-page` (1280 px); footer hard-codes `#142e23`, `#dbeaaf`, `#f5f6ed` (l.47, 86–89, 132, 155).
- `components/customer/CustomerNavigation.jsx` is shared by both layouts.
- `components/ui/`: `button`, `input`, `badge` (unused by customer pages), `checkbox-card`, `rentra-loader`. No Card, Select, Textarea, Dialog, EmptyState or PageHeader. `components/auth/OtpDialog.jsx` is the only dialog.
- States: `components/portal/PortalState.jsx` (operator wording: "Contact a Rentra administrator", l.17), `components/customer/BookingError.jsx`, `components/loading/ScreenSkeleton.jsx` (every customer page has a `loading.js`).
- Boundaries: only `(marketing)/error.js`, `(customer)/bookings/error.js`, `(customer)/checkout/error.js`. No `app/error.js`, `app/global-error.js` or any public/customer `not-found.js`. `notFound()` in reviews (l.12), checkout (l.14/23), support/new (l.17/24) and report (l.14) falls through to Next's default 404.

**Per page**

| Page                      | Main components                                                               | Issues                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| login                     | `AuthLayout`, `CustomerLoginForm`                                             | Polished. Button overridden to `rounded-xl h-12`; renders its own `<main>` inside the root (l.28).                                                                    |
| account                   | `AccountForms`, `ProfilePhotoForm`                                            | Best customer page (reference for Operate pages). Disputes and Support share the `CircleHelp` icon (l.21–22).                                                         |
| account/notifications     | inline list                                                                   | Raw `n.reference` (l.18), raw delivery enum (l.21–23), plain `<p>` empty state (l.42).                                                                                |
| account/payment-methods   | static copy                                                                   | Talks about "Razorpay Test" to customers (l.12–17); looks unfinished.                                                                                                 |
| account/phone             | `PhoneChangeForm`                                                             | `rounded-3xl` split card, h1 `text-2xl font-semibold` not a token (l.22), long note in `text-xs` (l.43).                                                              |
| account/privacy           | `PrivacyForm`                                                                 | Raw UUID "Reference" (l.29); `.replace('_',' ')` replaces only the first underscore (l.27); "checkpoint {stage}" (l.35).                                              |
| bookings                  | `BookingHistory` (in `BookingRecords`)                                        | Good; reference pattern for lists; only designed empty state in the customer area (`BookingHistory.jsx:151–178`).                                                     |
| bookings/[orderId]        | `BookingDetail`, `CasePanels`, `VisitEvidence`, `BookingDisplay`              | "Open a dispute" sits above status/title (`BookingRecords.jsx:69–74`); nested `<nav>` in `<nav>` (l.113/148); 7+ equal-weight links; raw `Visit {reference}` (l.221). |
| bookings/…/again          | `BookAgainForm` (`VisitLifecycle`)                                            | h1 only, no back link, extra `p-4` (l.7), 4 px inputs, underline buttons.                                                                                             |
| bookings/…/cancel         | `CancelVisits`                                                                | Raw receipt id (`CancelVisits.jsx:85`); "Actual bank refund: ₹0" copy (l.75).                                                                                         |
| bookings/…/reviews        | `CustomerReviewForm`                                                          | `max-w-2xl p-4`, uncoloured back link (l.18), raw `moderation_state` (l.39), plain empty state.                                                                       |
| checkout/review/[quoteId] | `Checkout`, `checkout/parts` (Stepper, SummaryCard, TestBadge), `ProfileForm` | Polished; heading scale `text-h2 sm:text-h1` differs from other pages.                                                                                                |
| checkout/[orderId]        | `Checkout`, `ConfirmedView`, `CopyReference`, `PaymentVerification`           | `text-[11px]` (`CopyReference.jsx:24`, `parts.jsx:339/341`); 7 hand-rolled `<button>`s in `Checkout.jsx` instead of `ui/Button`.                                      |
| disputes                  | `DisputeList` (`disputes/Disputes.jsx`)                                       | Staff-style intro (l.14–17); unstyled links (l.18/52); raw `{kind} · {state}` (l.55); ISO UTC times (l.6–7); selects without token border (l.26/38).                  |
| disputes/new              | `NewDispute`, `DisputeForm`                                                   | Customer must type a "Booking order ID" (l.86–94).                                                                                                                    |
| disputes/[id]             | `DisputeDetail`, `DisputeForm`                                                | Raw `actor_kind · kind · audience` (l.183–184), `environment · component` (l.143); submit uses `bg-primary` (`DisputeForms.jsx:211`).                                 |
| onboarding                | `ProfileForm`, `CustomerLogout`                                               | Bare h1 inside the full account shell; no welcome context.                                                                                                            |
| reviews/[id]/report       | `ReviewControl` (`ReviewForms`)                                               | `max-w-2xl p-4`, no back link, 4 px fields, plain paragraphs.                                                                                                         |
| support                   | `SupportList` (`SupportRecords`)                                              | Own `max-w-4xl p-4`; "request(s)" (l.49); raw reference (l.58); plain empty state (l.62).                                                                             |
| support/new               | `OpenSupportForm` (`SupportForms`)                                            | Long paragraphs before a basic form.                                                                                                                                  |
| support/[id]              | `SupportDetail`, `SupportReplyForm`                                           | Shows `bookingPolicyVersion`, `cancellationTier`, `timeZone` to customers (l.106–108).                                                                                |
| help                      | `ContentBody`, `NavigationForm`                                               | Hand-made 4 px search input/button (l.38/45).                                                                                                                         |
| policies                  | `ContentBody`                                                                 | `toISOString()` shown raw (l.43, confirmed); `break-all` version string.                                                                                              |
| saved                     | `SavedPlaces`                                                                 | `max-w-4xl`; nested `<main>` (page l.8); plain `<p>` empty state (`SavedPlaces.jsx:43`).                                                                              |

**Top cross-cutting problems (ranked)**

1. Two visual languages: polished pages (account, bookings, booking detail, checkout, phone) vs bare operational pages with 4 px boxes (disputes, support, reviews, again, report, notifications, privacy, help).
2. Inverted radius scale: `--radius-xl` is overridden to 24 px but `rounded-2xl` stays at Tailwind's 16 px, so `xl` is rounder than `2xl`. Usage: `rounded` 44×, `2xl` 30×, `xl` 29×, `md` 28×, `lg` 15×, `3xl` 3×. **Phase 2.1.**
3. Five or more hand-rolled form recipes; `ui/Input`/`ui/Button` mostly unused (`AccountForms.jsx:16–19`, `SupportForms.jsx:10–12`, `ReviewForms.jsx:9`, `DisputeForms.jsx:5`, `VisitLifecycle.jsx:78`, `EvidenceForms.jsx:8–10`, `help/page.js:38,45`, `BookingHistory.jsx:44–56`). Primary buttons alternate brand-600/brand-700/`bg-primary` and four radii. **Phase 2.2.**
4. Page containers vary (`max-w-5xl/4xl/3xl/2xl`/none) and some pages add a second `p-4`. **Phase 3.**
5. No shared page header; three back-link styles; some pages have none. **Phase 2.2 + 3.**
6. Raw IDs and enums shown to customers (see table). **Phases 8–9.**
7. Raw/UTC timestamps (disputes, policies) vs en-IN "India time" in support. **Phases 9–10.**
8. Only one designed empty state. **Phase 2.2 `EmptyState`, applied per page.**
9. Missing error and 404 boundaries (see above). **Phase 3.**
10. Three different error UIs; marketing error copy talks about "search filters" on help/saved/policies. **Phase 3.**
11. Staff/policy wording on customer pages (disputes intro, cancel "Actual bank refund: ₹0", payment-methods, notifications provider line). **Phases 8–9 — copy changes need owner OK (Ground rule 5 / impeccable: ask before replacing factual copy).**
12. Booking-detail action hierarchy. **Phase 9.1.**
13. Tiny text outside tokens (`text-[11px]`, long `text-xs`/`text-tiny` explanations). **Phases 7–10.**
14. Hard-coded colours (`#142e23`, `#dbeaaf`, `#f5f6ed`, `bg-amber-100 text-amber-800` in `CasePanels.jsx:17`, `VisitEvidence.jsx:22,131`, `bg-white`). **Phase 2.1.**
15. Skeleton screen-reader labels expose route syntax ("Loading reviews [reviewId] report"); nested `<main>` on saved and login. **Phase 3.**

**Shared with partner/admin/staff — restyle only behind a customer-scoped prop/variant, and screenshot the partner/admin pages before and after**
`BookingRecords.jsx`, `BookingDisplay.jsx`, `SupportRecords.jsx`, `SupportForms.jsx`, `ReviewDetail.jsx`, `ReviewQueue.jsx`, `VisitLifecycle.jsx`, `NotificationControls.jsx`, `components/disputes/*`, `components/booking/*`, `components/portal/PortalState.jsx`, `RetryButton.jsx`, `ScreenSkeleton.jsx`, `ui/button.jsx`, `ui/input.jsx`.

**Customer-only (safe)**: `AccountForms`, `ProfilePhotoForm`, `CustomerLoginForm`, `CancelVisits`, `ReviewForms`, `Checkout` + `checkout/*`, `SavedPlaces`, `CustomerNavigation`, `BookingError`, all customer page files.

### Phase 2 — Design-system foundation (in progress)

**2.1 Tokens — complete (29 Sep 2026)**

- Added `--color-forest-deep` `#142e23`, `--color-forest-line` `#3c5546`, `--color-paper` `#f5f6ed`, `--color-lime` `#dbeaaf`, `--color-lime-soft` `#e5efc8` to `@theme` in `app/globals.css`.
- `app/(marketing)/layout.js` footer now uses `bg-forest-deep`, `text-paper`, `text-lime`, `bg-lime-soft`, `border-forest-line` instead of hex literals.
- Left alone on purpose: OG image hex (image generation needs literals), `Logo.jsx` brand art, `OccasionPicker.jsx` tints (locked), `CasePanels.jsx`/`VisitEvidence.jsx` amber chips (shared with admin; Phase 9).
- Radius: no token change (D6).
- Verification: `/saved` 1440 and `/policies/terms` 390 re-captured and pixel-diffed against the Phase 1 baseline — identical.

**2.2 Primitives** — deferred per D7.

**2.3 QA harness — complete.** Working recipe (all local, nothing hosted is touched):

1. Disposable Postgres at `127.0.0.1:55432` (superuser `postgres`); `CREATE DATABASE rentra_cp02`.
2. Scratch env file (outside the repo) with only: `NODE_ENV=development`, `PORT=4100`, `API_PREFIX=/api/v1`, `CORS_ORIGINS=http://127.0.0.1:3132,http://localhost:3132`, `COOKIE_SAME_SITE=lax`, `COOKIE_DOMAIN=`, `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3132`, `DATABASE_URL=postgres://postgres@127.0.0.1:55432/rentra_cp02`, a 32+ char `SESSION_SECRET`, `DEV_OTP_BYPASS=true`, `CUSTOMER_OTP_DELIVERY=development`, and `CLOUDINARY_CLOUD_NAME=` (empty — without it the backend env schema wrongly demands Cloudinary keys when the name is unset). Never use the backend `.env` (hosted Neon, live providers).
3. From `rentra-backend/`: copy `Rentra/scripts/portal-gate/fixture-migrate.mjs` and `mint.mjs` into the backend root as `.qa-migrate.mjs`/`.qa-mint.mjs` (package resolution is relative to the script), run `node --env-file=<qa.env> .qa-migrate.mjs`, `node --import ./loader/register.mjs --env-file=<qa.env> src/scripts/seed.js`, `node --import ./loader/register.mjs --env-file=<qa.env> .qa-mint.mjs <tokens.json>`. Delete the `.qa-*.mjs` copies when done.
4. The minted customer (phone `9898980001`, "Rahul S.") has no email, so profile-gated pages redirect to `/onboarding`; for page QA set an email in the disposable DB. The customer owns completed bookings RNT00001/09/13/15/25.
5. API: `node --import ./loader/register.mjs --env-file=<qa.env> src/index.js`. Web: `RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=qa NEXT_PUBLIC_API_URL=http://127.0.0.1:4100/api/v1 NEXT_PUBLIC_RENTRA_MEASUREMENT_ENABLED=false node node_modules/next/dist/bin/next dev -p 3132 -H 127.0.0.1`.
6. Playwright: add cookie `rentra_session=<tokens.customer>` for the web origin.

7. The customer's bookings list is empty: seeded `booking` rows are legacy rows without orders, and customer records read orders. Populated booking/checkout records will be created through the real checkout with the fake Razorpay helper (`rentra-backend/test/helpers/fake-razorpay.mjs`) in Phase 7, which also exercises checkout. Profile completion needs a `customer_profile` row (inserted for QA).

- Customer baselines (empty states, 390/1440) for account, notifications, payment-methods, phone, privacy, bookings, support, support/new, disputes, disputes/new, onboarding (incomplete profile) are in `.impeccable/redesign/phase-2-customer-baseline/`. They confirm the audit: bookings/account polished; disputes/support bare text with native selects and underlined links.
- Disk: stale gate caches `.next/customer-browser-cp25|cp30|cp31` (~1.4 GB, day-old, regenerable) and the Phase 1 `customer-browser-audit` cache were deleted to recover from B7.

**2.4 DESIGN.md — complete.** Rewritten to describe the owner-approved restored look: runtime type scale and radii, forest-deep/lime tokens, pill actions and chips, home composition, `ListingCard`/`SearchBar` anatomy, shape table, and the don'ts from the rejected redesign. Frontmatter tokens updated (`ink-400`, display/h1/h2 sizes, radii, `full`, new colours, chip/footer components).

**Files Changed (Phase 2)** — `app/globals.css`, `app/(marketing)/layout.js`, `DESIGN.md`, `.gitignore` (ignore `/.impeccable/redesign/`), this plan.

**Verification** — pixel diff for 2.1 (identical); customer pages render with the QA harness; no product behaviour touched.

**Remaining Issues** — B4–B7. Populated records deferred to Phase 7.

**Next Phase** — Phase 3 Global shell:

1. Extract the header and footer from `app/(marketing)/layout.js` into shared components and use them in `app/(customer)/layout.js` (signed-in nav), same 1280 px container.
2. Remove the per-page container/`p-4` doubling where the layout now provides it (only wrappers, not page content).
3. Add `app/not-found.js` (header + footer + empty-state style, links to home/search) and `app/error.js`; add customer `error.js` for account/support/disputes; make `(marketing)/error.js` copy route-neutral.
4. Fix nested `<main>` on `/saved` and `/login`; plain-word skeleton labels.
5. Screenshots 390/1440 before/after; axe; stop for owner review (D4).

### Phase 3 — Global shell (complete, 29 Sep 2026 — awaiting owner review)

**Completed**

- New `components/rentra/SiteChrome.jsx`: skip link, sticky light header, `main` landmark, dark footer, WhatsApp float — moved verbatim from `app/(marketing)/layout.js`, now parameterised (`navigation`, `contentId`, `skipLabel`, `whatsapp`).
- `app/(marketing)/layout.js` is now a one-line wrapper around `SiteChrome`.
- `app/(customer)/layout.js` uses `SiteChrome` with the signed-in `CustomerNavigation`; content container `max-w-(--container-page)` (1280 px, was `max-w-6xl`) with 16/24 px gutters. Signed-in pages now have the same header (incl. "List your place") and the dark footer. WhatsApp float stays off on customer pages (as before). The auth-outage fallback also renders inside the chrome.
- New `components/ui/empty-state.jsx` (`EmptyState`: icon in brand/warning tint, title, description, actions) — first shared primitive (D7).
- New `app/not-found.js`: site chrome + "We couldn’t find that page" + Explore places / Go to home. Replaces Next's default unstyled 404 for unmatched URLs and public/customer `notFound()` calls. Returns HTTP 404.
- New `components/rentra/RouteError.jsx` (client): shared error body using Next 16's `retry` (re-fetches; the old boundaries used `reset`, which does not). Used by new `app/error.js`, new `app/(customer)/error.js` (account, support, disputes, onboarding, reviews), rewritten `app/(marketing)/error.js` (route-neutral copy — no more "search filters" on help/saved/policies), `app/(customer)/bookings/error.js` and `app/(customer)/checkout/error.js` (existing copy kept, incl. "Find recent test checkouts" — B6). Partner/admin keep `BookingError` unchanged.
- `/saved`: nested `<main>` → `<div>`. (Login has no outer `<main>`, so it was not nested — audit item corrected.)
- 19 skeleton labels changed from route syntax to plain words ("Loading reviews [reviewId] report" → "Loading report").

**Design Decisions**

- D7 applied: `EmptyState` created now because 404/errors use it. Pill actions via `cn(buttonVariants(...), 'rounded-full px-5')`. `buttonVariants({ className })` alone does NOT merge conflicting classes — always wrap in `cn` (tailwind-merge compatible) or use `<Button className>`.
- Header on customer pages now includes "List your place" (one header everywhere).

**Files Changed** — `components/rentra/SiteChrome.jsx`, `components/rentra/RouteError.jsx`, `components/ui/empty-state.jsx`, `app/not-found.js`, `app/error.js`, `app/(customer)/error.js` (all new); `app/(marketing)/layout.js`, `app/(customer)/layout.js`, `app/(marketing)/error.js`, `app/(customer)/bookings/error.js`, `app/(customer)/checkout/error.js`, `app/(marketing)/saved/page.js`, 19 `loading.js` files.

**Verification**

- `npm run lint` clean; `npm test` 36/36; `next build` (isolated `RENTRA_BUILD_FIXTURE` distDir, deleted afterwards) passed.
- Playwright 390/1440 via QA harness: `/nope-404-page` (HTTP 404, chrome + empty state), `/account`, `/bookings`, `/support`, `/disputes` (signed-in chrome + footer), `/saved`, `/help`. No overflow. Outage run (API stopped): `/help` shows `RouteError`; `/bookings` shows the customer outage fallback inside the chrome.
- axe WCAG 2.1 AA: 0 violations on `/nope-404-page`, `/`, `/saved`, `/help`, `/account`, `/bookings`, `/support`, `/disputes` at 390 and 1440.
- Screenshots: `.impeccable/redesign/phase-3/` (outage captures prefixed `outage-`).

**Remaining Issues** — B8, B9. `/mehsana/nowhere` (unknown place under a real city/category) renders the location page with HTTP 200 rather than 404 — check intended behaviour in Phase 5.

**Next Phase** — Owner review of Phase 3 (header/footer on signed-in pages, 404, error page). Then Phase 4 (home QA, locked): scroll-load city rows and the occasion picker on the live API to confirm B3 is a capture artefact; regression screenshots only. Then Phase 5.1 (search form → compact bar + chips + filter panel).

### Phase 4 — Home QA (complete, 29 Sep 2026)

**Completed** — Regression check of the locked home page against the live public API after the Phase 3 shell refactor. No code change.

**Verification**

- Scrolled full page (and horizontal city rows) so lazy images load: 0 broken images, 0 "Photos coming soon" placeholders at 390 and 1440. B3 closed.
- Composition identical to the Phase 1 baseline (hero + search + chips, trust strip, four city rows, occasion picker with photo, city chips, owner CTA, footer).
- Search form bottom edge at 390×844 = 844 px (fits the first viewport exactly); at 320×640 it ends at 935 px (below the fold on very small phones — home is locked, noted only).
- No horizontal overflow at 320/390/1440. axe WCAG 2.1 AA: 0 violations at 390 and 1440.
- Screenshots: `.impeccable/redesign/phase-4/`.

**Environment note** — Freed ~8.7 GB (deleted `.next/customer-browser-qa`, `.next/cache`, npm cache, Homebrew downloads). The owner's `next dev` on :3000 and its `.next/dev` were left alone.

**Next Phase** — Phase 5 Discovery (search + location pages).

### Phase 5 — Discovery: search + location pages (complete, 29 Sep 2026 — awaiting owner review)

Competitor pattern: Airbnb, Booking.com and StayVista all put results first on phones behind a one-line search summary, keep refinements behind a "Filters" control with an active count, and apply sort immediately.

**Completed**

- 5.1 `components/rentra/DiscoveryFilters.jsx`: same single form (`id="discovery-filters"`), same field names, hidden inputs, date modes and state. New layout:
  - Phones: one-line summary pill (where · visit type · date · guests) with Edit; fields collapse with `display:none`, which still submits their values.
  - Desktop: fields in one pill bar styled like the home `SearchBar` (uppercase tiny labels, borderless controls, dividers, pill "Show places"). The pill becomes `rounded-xl` when "Separate dates" makes it tall.
  - "Filters" chip with an active-count badge opens the panel (property name, type, min/max price, cancellation, amenities as selectable chips) with its own "Apply filters" button. "Clear all" is kept.
  - Field text is 16 px below `lg` (no iOS zoom).
- 5.2 `components/rentra/DiscoveryResults.jsx`:
  - New `SortSelect.jsx` submits the form on change; an Apply button stays inside `<noscript>`. Sort is always rendered so filter submits keep it.
  - Price note shown once below the grid when all cards share it (home rule). The dated-search note ("Prices include rent and the platform fee…") moved under the result count.
  - Active-filter chips gain an × icon. Pagination uses outline pill buttons with arrows.
  - Empty state uses `EmptyState` ("Try without dates" only when dates are set, plus "Clear filters"). The search outage uses `EmptyState` with the warning tone. The invalid-filter alert uses warning colours.
- 5.3 Location pages (same component): "More in {City}" / "Explore by location" heading, and area/intent/city links shown as chips with a map-pin icon instead of underlined text.
- 5.4 `components/loading/ScreenSkeleton.jsx`: only the `search` case changed (pill bar + chip) so the skeleton matches the new layout; portal skeletons untouched.
- **Phase 3 fix:** `notFound()` inside public pages rendered the root 404 _inside_ the marketing layout (two headers/footers). Added `components/rentra/NotFoundBody.jsx` plus `app/(marketing)/not-found.js` and `app/(customer)/not-found.js` (body only); `app/not-found.js` keeps the chrome for unmatched URLs.

**Design Decisions**

- D9: On phones the search form is collapsed behind a summary by default; results win the first screen. Desktop always shows the full bar.
- D10: Property name/locality moved from the main row into the Filters panel (it counts toward the badge and shows as a removable chip).

**Files Changed** — `components/rentra/DiscoveryFilters.jsx`, `components/rentra/DiscoveryResults.jsx`, `components/rentra/SortSelect.jsx` (new), `components/rentra/NotFoundBody.jsx` (new), `components/loading/ScreenSkeleton.jsx` (search case), `app/not-found.js`, `app/(marketing)/not-found.js` (new), `app/(customer)/not-found.js` (new).

**Verification**

- lint clean; tests 36/36; `next build` exit 0 (153 routes; sitemap policy reads timed out against Render and used the built-in fallback — network, not code).
- Playwright functional (live API, 15/15): city, slot, guests, q, amenity and min all submit; the filter badge counts 3; sort applies on change and keeps every filter; Back returns to the previous results; removing a chip drops only that filter; on phones the fields are collapsed, the summary shows the city, and sort keeps the collapsed filters; pagination goes to page 2.
- First screen at 390×844: title, summary pill, Filters, count/sort and the first result photo are visible (before: the form filled the whole screen).
- axe WCAG 2.1 AA: 0 violations on `/search`, empty results, invalid guests, `/mehsana/farmhouse`, separate-dates, at 390 and 1440. No horizontal overflow.
- 404 chrome count: one header, one footer and one `main` on an unmatched URL, an unknown location and an unknown listing.
- Screenshots: `.impeccable/redesign/phase-5/` (`fold_*` = first screen, `open-search-390` = phone with fields and filters open).

**Remaining Issues**

- Streamed `notFound()` (routes with `loading.js`) returns HTTP 200 with a noindex tag — documented Next 16 behaviour, not changed.
- Customer-group `not-found.js` is not yet browser-verified (needs the QA harness) — check in Phase 7.
- On phones "Explore by location" is a long vertical stack of chips when labels are long; acceptable, revisit in Phase 12.

**Next Phase** — Owner review of Phase 5. Then Phase 6 Listing details (6.1 mobile swipe gallery · 6.2 header/facts/visit hours · 6.3 booking box + mobile bar with price · 6.4 host/rules/cancellation/reviews/map · 6.5 skeleton).

### Phase 6 — Listing details (complete, 29 Sep 2026 — awaiting owner review)

Competitor pattern: Airbnb, Booking.com and StayVista show a full-width swipeable photo strip with an "n / N" counter on phones. They keep a sticky bottom bar with the starting price and one action, and a mosaic plus lightbox on desktop.

**Completed**

- 6.1 `components/rentra/listing/PhotoGallery.jsx`:
  - Phones (<640 px): full-bleed 4:3 swipe strip (native `scroll-snap`, no library) with an "n / N" counter pill that opens the lightbox at the current photo.
  - Desktop: mosaic and lightbox unchanged; "View all photos" is now a pill.
  - The first strip photo shares the desktop hero's `sizes`, so both preload the same file. Desktop loads 5 gallery images, same as before.
- 6.2 `app/(marketing)/listing/[handle]/page.js`: on phones the breadcrumb trail becomes one "‹ {Area}" back link (full trail from `sm`; JSON-LD unchanged).
- 6.2 `ListingSections.jsx` → `VisitHours`: three tall cards become one bordered group. Rows on phones, three columns from `sm`, each with the slot icon (`slot-icons.js`). Labels now come from `SLOTS` ("Day picnic"), matching the booking box on the same page (was "Day visit").
- 6.3 `MobileBookingBar.jsx`: before dates, shows "from ₹X / {slot}" (same base price as `BookingPriceBox`) instead of a second "Choose dates". The helper line is just "Razorpay Test · no real charge" (plus "n visits selected ·" once dates exist), so it no longer truncates mid-word. Button is a pill. The page now passes `prices` to it (it was passed before but unused).
- 6.4 Host, rules, cancellation, reviews and map reviewed at 390/1440: already flat sections, consistent with D6. No change needed.
- 6.5 `ScreenSkeleton` listing case: full-width 4:3 block on phones, rounded mosaic from `sm`.

**Files Changed** — `components/rentra/listing/PhotoGallery.jsx`, `components/rentra/listing/ListingSections.jsx`, `components/rentra/listing/MobileBookingBar.jsx`, `app/(marketing)/listing/[handle]/page.js`, `components/loading/ScreenSkeleton.jsx` (listing case).

**Verification**

- lint clean; tests 36/36; Prettier clean; `next build` exit 0.
- Playwright (live API) 9/9:
  - No overflow at 390 or 1440.
  - Swiping to photo 3 updates the counter to "3 / 6"; the counter opens the lightbox at photo 3; Esc closes it.
  - The back link points to the area.
  - The booking bar appears after the gallery, shows `from ₹…`, and has exactly one "Choose dates".
- axe WCAG 2.1 AA: 0 violations on two listings at 390 and 1440 (a `definition-list` violation from the first visit-hours draft was caught and fixed).
- Screenshots: `.impeccable/redesign/phase-6/`.

**Remaining Issues**

- Quote flow (dates → total in bar/box, "Review booking" sheet) not browser-exercised: the live API blocks browser CORS from local origins (B1). Exercise it with the QA harness in Phase 7.
- Listings with 0/1/2 photos not seen live (all live listings have 5+). The code paths are unchanged from before except the phone strip, which handles any count; verify with QA seed data in Phase 7.
- Slot naming across the site: search filters and chips say "Day visit", home chips and the booking box say "Day picnic". Product copy — ask the owner which one wins (B10).

**Next Phase** — Owner review of Phase 6. Then Phase 7 Checkout (7.1 quote review, 7.2 payment/result) on the QA harness with the fake Razorpay helper, which also creates populated booking records for Phase 9.

### Phase 7 — Checkout (complete, 29 Sep 2026)

**Finding** — Checkout (review, payment, confirmation) was already polished by the earlier refresh: stepper, held-price timer, sticky summary with photo, "Pay ₹X" CTA, phone pay bar, confirmation hero with next steps. It follows D6 apart from shape details, so this phase was mostly end-to-end verification plus small fixes. No layout change → no owner-review stop needed.

**Completed**

- `components/customer/Checkout.jsx`: the applicable-policy links ("terms policy (opens in a new tab)", underlined, lowercase, wrapping unevenly) become pill chips: "Terms policy ↗" with an external-link icon and a screen-reader-only "(opens in a new tab)".
- `text-[11px]` micro-labels → `text-tiny` token in `checkout/CopyReference.jsx`, `checkout/parts.jsx` (date tile) and `rentra/listing/BookingPriceBox.jsx` (Arrival/Departure/Guests labels), matching the home `SearchBar` labels.
- QA harness extended for payments (all local, disposable):
  - `rentra-backend/.qa-serve.mjs` (untracked, QA-only) starts the API with `fetch` for `api.razorpay.com` routed to `test/helpers/fake-razorpay.mjs` (file-backed). It refuses any DB but `127.0.0.1:55432/rentra_cp02`.
  - `rentra-backend/.qa-payments.mjs` (untracked) enables the Razorpay Test gateway via `setPaymentGatewayConfiguration`.
  - QA env adds `RAZORPAY_TEST_KEY_ID/KEY_SECRET/WEBHOOK_SECRET` (fixture values), `FAKE_RAZORPAY_STATE`, and **`CORS_ALLOWED_ORIGINS`** (the backend reads this name; `CORS_ORIGINS` in the old gate doc is ignored — that was why browser availability reads failed).
  - Playwright replaces `checkout.razorpay.com/v1/checkout.js` with a stub whose `open()` asks Node to record a captured payment in the fake provider and sign `order|payment` with the fixture key. The real verify endpoint then confirms the booking.
  - Journey script `p7journey.mjs` (scratchpad): listing → calendar → quote → deposit tick → review → purpose + terms tick → hold → pay → confirmed.

**Verification**

- Journeys passed at 1440 (twice) and 390 (twice), each creating a confirmed booking in the disposable DB. Quote in box/sheet (₹6,500 rent + ₹520 fee = ₹7,020; ₹5,000 deposit separate), review, payment page ("Pay ₹7,020"), and confirmation "You’re all set!". No page errors.
- Phone booking bar → "Review booking" sheet → review works (Phase 6 open item closed).
- Unknown `/checkout/<uuid>` and `/checkout/review/<uuid>` render the customer `not-found.js` inside the signed-in chrome, one header/footer (Phase 5 open item closed).
- axe WCAG 2.1 AA: 0 violations on review, payment (held), confirmed and unknown checkout at 390 and 1440.
- lint clean; tests 36/36.
- Screenshots: `.impeccable/redesign/phase-7/` (`before-*` = baseline run, `after-*` = after changes, `form-1440` = policy chips).

**Remaining Issues**

- Expired-quote and failed/processing payment visuals not captured: a DB check constraint (`booking_quote_valid_chk`) prevents back-dating a quote, and quotes outlive the 10-minute price-hold timer shown. The UI copy paths exist in `Checkout.jsx`; capture them in Phase 14 by waiting out a hold or using the fake provider's failed status.
- Confirmation shows the raw booking reference `TEST_<uuid>`. It is the API's reference and the bookings search uses it, so it was not shortened (B6-type decision).
- Seeded local listings' photos may be missing in some cards (Cloudinary not configured locally) — environment only.

**Next Phase** — Phase 8 Auth & account (8.1 login + onboarding · 8.2 account hub · 8.3 phone, notifications, payment methods, privacy). The disposable DB now has confirmed bookings for Phase 9.

### Phase 8 — Auth & account (complete, 29 Sep 2026 — awaiting owner review)

**Completed**

- New `components/ui/page-header.jsx`: `BackLink` (one back-link style: arrow + "Account") and `PageHeader` (back link, h1, one-line description, optional actions). D7 applied: created because four pages use it now.
- `/account/notifications`: tall cards with stacked underlined links → one bordered list.
  - Each row has a bell icon (filled tint when unread, plus screen-reader "(unread)"), a bold title when unread, and a "Test / simulation" badge.
  - It now shows the notification time (the API's `at` field, formatted en-IN, Asia/Kolkata) followed by the unchanged "SMS: …" text, then the booking reference in small monospace, truncated with the full value in `title`.
  - Actions are "Open booking ↗" (outline pill) and "Mark as read" (ghost pill; the same server action form).
  - Empty state uses `EmptyState` with a link to bookings.
- `/account/payment-methods`: bare paragraphs → page header + `EmptyState` card (credit-card icon, "No saved payment methods"). Both original sentences kept word-for-word (B6).
- `/account/privacy`: page header; "New request" card first (form + policy link), then "Your requests" as a divided list with a state badge. Fixed `r.state.replace('_',' ')` → `replaceAll` (multi-underscore states were half-formatted). Empty state uses `EmptyState`. The reference UUID is kept (it is what support uses) but shown small and muted.
- `/account/phone`: shared `BackLink`; `rounded-3xl`/`rounded-2xl` → `rounded-xl`/`rounded-lg` (D6); h1 `text-2xl font-semibold` → `text-h2` token; the post-change note moved from `text-xs` to `text-meta`.
- `/onboarding`: bare h1 in the wide account column → a centred card (max-w-lg) with a person icon, `text-h2` title, the same copy, the form, and "Sign out" below.
- `AccountForms.jsx` "Optional contact preferences" disclosure: native triangle and dead space → full-height summary with a rotating chevron (no JS; still `<details>`).
- `/account`: Disputes shortcut gets its own `Scale` icon (it shared `CircleHelp` with Help & support).
- `/login`: reviewed — no change (pill input + pill button is correct under D6).

**Files Changed** — `components/ui/page-header.jsx` (new), `app/(customer)/account/notifications/page.js`, `app/(customer)/account/payment-methods/page.js`, `app/(customer)/account/privacy/page.js`, `app/(customer)/account/phone/page.js`, `app/(customer)/account/page.js`, `app/(customer)/onboarding/page.js`, `components/customer/AccountForms.jsx`.

**Verification**

- Playwright (QA harness): "Mark as read" reduces the unread count after reload; times render; "Open booking" navigates to the booking record; privacy form present. Onboarding was captured by temporarily removing, then restoring, the fixture `customer_profile` row.
- axe WCAG 2.1 AA: 0 violations on `/account`, `/account/phone`, `/account/notifications`, `/account/payment-methods`, `/account/privacy`, `/onboarding`, `/login` at 390 and 1440. No horizontal overflow.
- lint clean; tests 36/36.
- Screenshots: `.impeccable/redesign/phase-8/` (`before-*` = baseline).

**Remaining Issues** — Customer-facing Test/provider wording is unchanged pending owner decision (B6). The login OTP dialog was not exercised (would need the dev OTP bypass on the QA stack) — do it in Phase 14.

**Next Phase** — Owner review of Phase 8. Then Phase 9 Records (9.1 bookings list + detail · 9.2 again/cancel/reviews/report · 9.3 support · 9.4 disputes). Many of these components are shared with partner/admin — use customer-scoped props and screenshot partner/admin before and after.
