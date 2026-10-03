---
name: RENTRA
description: A bright, nature-led rental marketplace with precise operational workspaces.
colors:
  brand-50: '#ecf4ef'
  brand-100: '#ddece3'
  brand-200: '#bbd8c8'
  brand-300: '#8dbca4'
  brand-400: '#609a7d'
  brand-500: '#257454'
  brand-600: '#064e3b'
  brand-700: '#043d2e'
  brand-800: '#033326'
  brand-900: '#032d23'
  brand-950: '#021f18'
  amber-100: '#fdf2de'
  amber-300: '#f3c77e'
  amber-500: '#d98a1f'
  amber-700: '#a6640f'
  ink-0: '#ffffff'
  ink-25: '#faf9f6'
  ink-50: '#f3f4ef'
  ink-100: '#eceee8'
  ink-200: '#e1e5de'
  ink-300: '#c4ccc5'
  ink-400: '#7c8780'
  ink-500: '#59655d'
  ink-600: '#4d5a52'
  ink-700: '#38463e'
  ink-800: '#2b3931'
  ink-900: '#1f2924'
  success: '#14532d'
  success-bg: '#ecf5ee'
  warning: '#9a4d0a'
  warning-bg: '#fff4e5'
  danger: '#b42318'
  danger-bg: '#fef3f2'
  info: '#1d4ed8'
  info-bg: '#eff6ff'
  whatsapp: '#1fa855'
  forest-deep: '#032d23'
  forest-line: '#386054'
  paper: '#f8f5ee'
  champagne: '#f8e7c9'
  champagne-hover: '#f2dab0'
  champagne-active: '#eacf9f'
  champagne-subtle: '#fcf5e9'
  champagne-foreground: '#064e3b'
  on-dark-muted: '#d5dad5'
  event-adjustment: '#6b3fa0'
  event-adjustment-bg: '#f5f0fa'
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', 'Noto Sans Devanagari', 'Noto Sans Gujarati', system-ui, -apple-system, sans-serif"
    fontSize: '2.75rem'
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: '-0.035em'
  h1:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '2.125rem'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.03em'
  h2:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1.625rem'
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: '-0.025em'
  h3:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.32
    letterSpacing: '-0.02em'
  h4:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1.0625rem'
    lineHeight: 1.62
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1rem'
    lineHeight: 1.62
  meta:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    lineHeight: 1.5
  tiny:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.4
  portal-h1:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.03em'
  portal-body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    lineHeight: 1.62
rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  full: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '7': '28px'
  '8': '32px'
  '10': '40px'
  '12': '48px'
  '14': '56px'
components:
  button-primary:
    backgroundColor: '{colors.brand-600}'
    textColor: '{colors.ink-0}'
    rounded: '{rounded.full}'
    padding: '0 16px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.brand-700}'
    textColor: '{colors.ink-0}'
  button-outline:
    backgroundColor: '{colors.ink-25}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '44px'
  button-secondary:
    backgroundColor: '{colors.ink-50}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.md}'
    height: '44px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.md}'
    height: '44px'
  button-destructive:
    backgroundColor: '{colors.danger-bg}'
    textColor: '{colors.danger}'
    rounded: '{rounded.md}'
    height: '44px'
  button-link:
    textColor: '{colors.brand-600}'
    height: '44px'
  input:
    backgroundColor: '{colors.ink-0}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
    height: '44px'
  chip-selected:
    backgroundColor: '{colors.ink-0}'
    textColor: '{colors.brand-800}'
    rounded: '{rounded.md}'
    padding: '0 6px'
    height: '44px'
  portal-nav-active:
    backgroundColor: '#164738'
    textColor: '{colors.ink-0}'
    rounded: '{rounded.md}'
    padding: '0 10px'
  listing-photo:
    backgroundColor: '{colors.ink-100}'
    rounded: '{rounded.md}'
  chip:
    backgroundColor: '{colors.ink-0}'
    textColor: '{colors.ink-700}'
    rounded: '{rounded.full}'
    height: '40px'
  footer:
    backgroundColor: '{colors.forest-deep}'
    textColor: '{colors.paper}'
  booking-summary:
    backgroundColor: '{colors.ink-0}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.lg}'
    padding: '20px'
---

# Design System: RENTRA

## Owner properties portfolio and overview

The Properties list uses a photo-led portfolio grid (one column on phones, two from `sm`, three from `xl`). The white filter surface retains URL-backed search and counted status chips; the existing global Pagination shows ranges, page sizes and page navigation. Cards show real photos or an explicit photo prompt, status, public code, location, available capacity and reviews, optional strength, updated date and the state-specific next action. Draft setup, corrections, next visits and live properties without open dates remain distinct. Unknown bookability is not presented as closed dates. Filtered list context travels into overview and setup links.

The overview leads with the property's saved photography: one large photo and up to two supporting photos on desktop, one large photo on phones, with a direct Manage photos link. No stock photos are added to real listings. Identity, preview/pause/share controls and the existing horizontally scrollable section navigation remain below. Status and next action, four operational facts, upcoming visits, strength checklist and guest preview retain their API-backed behavior. Strength uses a labelled linear progress bar. Other property tabs retain their compact header.

Portfolio and overview skeletons mirror these compositions, including the gallery, filter strip, photo cards, facts and operational panels. The list skeleton is reused by the route loader, cached query state and initial partner shell.

## Overview

**Creative North Star: "A Clear Path to the Outdoors"**

Sunlit property photography on warm off-white ground; Emerald Ink (`#064E3B`) for primary actions and Champagne (`#F8E7C9`) for restrained premium accents. Preserve the approved full-bleed home hero, search, trust strip, flat property cards and city rows. The detailed specification is [Emerald & Champagne design system](docs/rentra-emerald-champagne-design-system.md); implementation and verification are recorded in [the theme handoff](docs/rentra-emerald-champagne-implementation.md).

Owner and admin workspaces share these tokens and retain their denser type, operational layouts and deep emerald sidebar. The caretaker workspace uses the same accessible controls and brand artwork.

**Key characteristics**

- Full-bleed photography on discovery surfaces; flat listing cards (photo + text, no box).
- Emerald actions, white cards, neutral operational pages. Champagne is an accent or inverse-surface action, never a status color.
- Pill-shaped actions and chips, as in the home hero and footer.
- Icon + short label rows in place of paragraphs.
- Honest data: no invented ratings, counts, badges or photos.

The frontmatter is the token record; runtime values live in `app/globals.css` and win if the two disagree.

## Colors

- **Brand ramp (`brand-50…950`).** `brand-600` is the action fill; `brand-700` its hover and link colour. `brand-50` tints supportive surfaces (icon wells, selected chips). `brand-400` is decorative only.
- **Amber.** Decorative star fill only; meaningful warning text uses `warning` on `warning-bg`. Peak context keeps an explicit label.
- **Ink ramp.** `ink-25` is the page, `ink-0` form and summary surfaces, `--skeleton-base` photo placeholders, `ink-200` dividers, `border-input` (#7C8780) control boundaries, `ink-500/600` secondary text, `ink-900` primary text. `ink-400` is non-text.
- **Semantic pairs.** success/warning/danger/info with matching `-bg`. Always pair colour with a text label.
- **Inverse surfaces.** `forest-deep` background, `paper` text, opaque `on-dark-muted` secondary text, `champagne` accents/actions and `forest-line` dividers. Mark the surface `data-surface="inverse"` for a champagne focus outline; nested white cards use `data-surface="light"`.
- **WhatsApp green.** Only the published WhatsApp contact button.
- Occasion-picker tints use `accent`, `secondary`, and `champagne-subtle` tokens.

The app ships a light theme. `.dark` remains reserved for separate future verification; the inverse sidebar/footer does not activate it.

## Typography

Plus Jakarta Sans, served locally (`assets/fonts/PlusJakartaSans-latin-variable.woff2`), with system and Indic fallbacks.

| Role               | Size                       | Weight  | Use                                       |
| ------------------ | -------------------------- | ------- | ----------------------------------------- |
| `display`          | 2.75rem, lh 1.06, -0.035em | 800     | Home hero headline only                   |
| `h1`               | 2.125rem                   | 700     | Page title                                |
| `h2`               | 1.625rem                   | 700     | Section title                             |
| `h3`               | 1.25rem                    | 600     | Sub-section, city row title               |
| `h4`               | 1.0625rem                  | 600     | Card title, price                         |
| `body-lg` / `body` | 1.0625 / 1rem, lh 1.62     | 400     | Reading text                              |
| `meta`             | 0.875rem                   | 400–600 | Nav, labels, secondary detail, chips      |
| `tiny`             | 0.75rem                    | 500     | Badges, eyebrow labels, footer legal line |

Rules: headings balance and wrap; paragraphs use pretty wrapping. Money, dates and times use tabular figures (`data-money`, `<time>`, `.tabular`). Long explanations never go in `tiny` or arbitrary `text-[11px]`. Inputs are 16px below 768px so iOS does not zoom. `.portal-ui` scales headings down for operational workspaces.

## Layout

- Container: `max-w-(--container-page)` = 1280px, gutters 16px (mobile) / 24px (≥640px). Reading pages (help, policies) use a narrower text column inside it.
- 4px spacing base. Sections 40px apart on mobile, 56px on desktop.
- Header: sticky, light (`bg-background/90`, blur, bottom border), fixed 68px (60px docked), wordmark left (mark only below `sm`), `CustomerNavigation` right, "List your place" as a quiet link from `md`. Not floating, not framed. From `md`, the centre holds the vertical tabs (see _Vertical tabs_) until the search docks, then the docked search pill. Header heights are coupled to `SearchBar`, `HeaderSearch`, `ScreenSkeleton` and the listing rail; do not change them.
- Home: full-bleed photo hero (`HeroPhotos`: auto-advances every 3s, pauses on hover and focus, never autoplays under reduced motion, with dots) with the headline, `SearchBar` and intent chips inside it; `TrustStrip` below; "Explore places" with horizontally scrolling `CityRow`s ("Near {City}"); `OccasionPicker`; city chips; owner call-to-action; footer.
- Listing grids: 1 → 2 (`sm`) → 3 (`lg`) → 4 (`xl`) columns. City rows scroll horizontally with arrow buttons.
- Footer: compact deep-forest block — brand + one-line invitation, "Your next getaway" links, "Have a place to share?" with a champagne pill, city links, then legal links and the intermediary statement.
- Listing pages reserve the bottom of narrow screens for the booking bar; the WhatsApp float moves above it via `--float-bottom`.

## Elevation & Depth

Flat by default; photography supplies depth.

- `shadow-xs` / `shadow-sm`: small selected or floating controls.
- `shadow-md`: booking summary, sticky bars.
- `shadow-lg`: the hero search bar, popovers, dialogs, the WhatsApp float.
- Focus: 2px `--ring` outline with 3px offset plus `shadow-focus`, everywhere.
  No resting shadow on listing or information cards.

## Shapes

Runtime radii: `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px, `full`.

| Element                                                                      | Radius         |
| ---------------------------------------------------------------------------- | -------------- |
| Buttons, CTAs, chips, tabs, single-line search inputs, icon buttons, avatars | `rounded-full` |
| Labelled form fields, selects, textareas, small icon wells                   | `rounded-md`   |
| Listing photos                                                               | `rounded-md`   |
| Summary cards, dialogs, record groups                                        | `rounded-lg`   |
| Large feature panels (occasion picker, auth photo)                           | `rounded-xl`   |

Do not use bare `rounded`, `rounded-2xl` or `rounded-3xl` in customer code: `--radius-xl` is overridden to 24px while Tailwind's `2xl` stays at 16px, so the scale is inverted above `xl`.

## Components

### Buttons and chips

`components/ui/button.jsx` (CVA): default, outline, secondary, ghost, destructive (quiet), danger-solid, inverse and link; heights 44px (default) and 48px (`lg`). Public/customer CTAs use `shape="pill"`; operational commands use the default 12px radius. Reuse `Button` or `buttonVariants`; primary/hover/active come from semantic tokens, inverse uses champagne with emerald text, and disabled controls use muted colors. Chips: `min-h-10 rounded-full border border-border px-4 text-meta`, hover `border-brand-300 bg-brand-50 text-brand-800`; on photos use `border-white/25 bg-white/10 text-white backdrop-blur`. Keep pending labels and disabled guards.

### Search bar

`components/rentra/SearchBar.jsx`: white labelled cells (Where / When / Slot / Guests) in one `rounded-full` bar on desktop, stacked `rounded-lg` card on mobile, `shadow-lg`, pill search button. Every cell ≥ 44px.

### Listing card

`components/rentra/ListingCard.jsx` is the only property card. 4:3 photo (`rounded-md`, top scrim, `TrustBadge` from API, `SaveButton` as a separate control, photo-count dots), then area (h4), "New" or rating, title as a stretched link, capacity line, price with "from" only when `isFromPrice`. When every card on a page shares one price note, show it once below the list. Missing photo: "Photos coming soon"; failed photo: `PropertyImage` fallback.

### Inputs and forms

Global control styling in `app/globals.css` covers existing customer, partner and admin forms. Single-select menus use `appearance: base-select` where supported: rounded popover surfaces, 44px option rows, green selection and a checkmark. Other browsers retain native menus. Keep real `select`, `option`, `input` and form attributes so validation, reset, autofill and keyboard behavior remain native. Checkboxes, radios and file-upload buttons share semantic theme tokens; forced-colors mode restores system checkbox/radio rendering. Date/time pickers retain platform behavior.

`components/ui/input.jsx`: 44px, `rounded-md`, `border-input`, `bg-card`, 16px text below `md`. Visible labels, described errors, server-action field errors, pending states and unsaved-change guards stay as implemented. `components/ui/field.jsx` exports `fieldClass`, `Select`, `Textarea` and `Field`; the latter connects help/errors to the named direct child control. Use those primitives for new forms.

### Navigation

`components/customer/CustomerNavigation.jsx`: Explore, Saved, Bookings (signed in), avatar menu; icon-only below `sm`, 44px targets, active item on a `brand-50` pill.

### Badges and status

`StateBadge` (`components/customer/BookingDisplay.jsx`) for booking, visit, payment, support and dispute states: underscores become spaces, first letter capitalised, and the colour follows the state (success for confirmed/completed/succeeded, ink for cancelled/expired, warning for disputed, danger for failed, info otherwise). `TrustBadge` for API-supplied verification; `Rating` with amber stars. Status always has a text label.

### Page structure and records

- `PageHeader` / `BackLink` (`components/ui/page-header.jsx`): back link ("← Account"), `h1`, one-line description, actions on the right. Every customer sub-page uses it.
- Booking history retains photo cards: 112px image column on phones, 200px from `sm`. Other record lists (notifications, support, disputes, privacy requests): one `rounded-lg` bordered list with `divide-y` rows, an icon well on the left, title + `StateBadge`, meta line, reference in `font-mono text-tiny`, chevron on the right. Not a stack of separate cards.
- Label/value money rows: label left, amount right (`tabular`), totals bold behind a top border. Amounts use `displayMoney` (whole rupees without ".00", paise only when present).
- Actions on a record: one row of icon pills; on phones one swipeable row (`overflow-x-auto`, `shrink-0` children).
- Dates shown to customers use `formatLocalDate` / `en-IN` short dates ("Wed, 30 Sept, 2026"); slot names come from `SLOTS`.

### Vertical tabs (Farmhouse / Entertainment)

Owner-approved on 1 Oct 2026 (mockups: `docs/design/entertainment/shots/`; plan: `docs/ENTERTAINMENT-PLAN.md`).

- **What:** links, not an ARIA tablist (`<nav aria-label="Categories">`, `aria-current="page"` on the active tab). One per public vertical, ordered by the registry `sortOrder`. Render nothing when fewer than two verticals are public.
- **Where:** from `md`, centred in the free space between the wordmark and `CustomerNavigation`, full header height. They fade out when the search docks and the docked pill takes the centre (`docked:` variant, opacity only, 150ms). Below `md`, two equal pill links sit at the top of the hero (photo chip recipe; the active tab is solid white with ink text) and above the search fields on discovery pages. Not shown on listing, checkout, account or portal pages.
- **Look:** 32px duotone icon plus a 15px semibold label; inactive `ink-500`, active `ink-900` with a 3px `ink-900` underline on the header's bottom edge. The icon lifts 2px on hover (`motion-safe`). Targets ≥44px. Icons are inline SVG in brand tokens (farmhouse in champagne and emerald with a sage tree; a cricket bat in amber with a red ball). They are not copies of another marketplace's illustrations.
- **Switching:** home tabs link to `/` and `/entertainment`. On `/search`, a tab keeps `city`, `area` and the first date, and drops parameters of the other vertical.

### Vertical vocabulary

- Farmhouse surfaces keep "guests", "stay", "visit type" and the `SLOTS` labels.
- Entertainment surfaces use "players", "booking", "time", "court/lane/station" (by activity) and "per hour". Never "night", "stay", "check-in" or "BR".
- Times are 12-hour with "(next day)" when the end passes midnight. One label helper per visit (`describeVisit`, Phase 10 of the plan).
- Entertainment trust strip items are limited to true statements (live availability, price before payment, cancellation window). "Verified" only from API data.

### Entertainment pieces (approved layout)

- **Entertainment home** mirrors the locked home skeleton: hero (real venue photos, licensed fallback until three venues have photos) → Where / What / When / Time search → activity chips → trust strip → "Play near {City}" rows → "What are you playing?" activity tiles (replaces the occasion picker) → city chips → owner CTA "Own a turf, court or play zone?" → footer, which gains a "Play near you" column. Built in Phase 6 (`app/(marketing)/entertainment/page.js`); the tiles list only activities a city's live venues offer, with venue counts.
- **Venue card:** `ListingCard` with facts from the vertical (`listingFacts`): activity icons, "Box cricket · 3 courts · Up to 12 players · Outdoor", "from ₹X / hr". The unit noun follows the activity (courts, lanes, turfs, stations). When a date is searched, the price is for the chosen duration ("₹1,200 for 1 hr") and up to three free start-time chips link to the venue at that time; a dot marks peak.
- **Venue page:** the shared gallery, header, reviews, host and map, plus facts row, courts cards, opening hours (today highlighted), prices per activity (weekday/weekend bands, peak marked with a dot _and_ the word "Peak"), venue rules and hour-based cancellation. Desktop rail: activity → date strip → duration stepper → start-time grid (time + price) → court ("Any available court (N free)") → quote → Reserve. Phones: a sticky "From ₹X / hr · Check times" bar opens the same picker as a bottom sheet.

### Disclosures

Accordions and "show more" use native `<details class="group">` with `list-none` + a rotating `ChevronDown` (150ms), never the browser triangle. FAQs use `FaqList` (`components/content/ContentBody.jsx`): one bordered list, 56px summaries.

### Discovery search

`DiscoveryFilters` renders the shared `SearchFields` (the same fields as the home `SearchBar`: a 2-column grid on phones, one pill bar from `md`) inside one form, with a dock sentinel. When the page scrolls past it, the in-page bar fades out and the header shows the compact `HeaderSearch` pill (Where · When · visit type · guests; on the Entertainment home Where · What · When · Time); clicking a segment opens the full fields in a panel under the header. The pill exists only on `/`, `/entertainment` and discovery pages. `SearchFields vertical="entertainment"` renders the venue fields (Where, What, When, Time, "Find venues") in the same bar shape. On venue searches the "Filters" panel holds venue name or locality, players, indoor or outdoor, price per hour, cancellation and the vertical's amenities (the activity is chosen in the bar). Secondary filters sit behind a "Filters" chip with an active-count badge.

### States

Empty states: `EmptyState` (`components/ui/empty-state.jsx`) — icon in a brand tint, one-line title, one-line explanation, one action. Expired or blocked flows show a top `StatusBanner` with the way forward (reference: checkout "This price expired" → "Choose dates again"). Errors: say what failed and offer a real next step; do not reuse search advice on unrelated pages. Loading: `ScreenSkeleton`/route skeletons match final layouts. All use `Skeleton` with `--skeleton-base` and `--skeleton-highlight`, a transform shimmer that stops after two cycles, and no parent pulse. One live status per boundary; decorative bars remain hidden from accessibility APIs. Page loaders stay in flow; inline pending controls use a single current-color spinner.

### Motion

150–200ms colour/opacity/transform feedback; listing photo hover scale (300ms, `motion-safe`); the hero photos auto-advance every 3s (owner-confirmed 1 Oct 2026; paused on hover/focus and under reduced motion); occasion tabs are user-triggered. Dialogs fade/scale in 200ms (`data-[state]` utilities); the `<dialog>` bottom sheet uses `.sheet-dialog` (slide up via `@starting-style`); `details.group` answers grow open via `::details-content`; toasts slide up 8px. No scroll-triggered reveals. Everything respects `prefers-reduced-motion`; motion that the blanket rule cannot reach (pseudo-elements) lives inside `@media (prefers-reduced-motion: no-preference)`.

## Do's and Don'ts

**Do**

- Reuse the home page's pieces (chips, pill CTAs, `ListingCard`, `SearchBar`, forest footer) before inventing new ones.
- Use real photos and real data; show honest empty/unavailable states.
- Keep from-prices distinct from date-specific quotes, fees and deposits.
- Keep focus outlines, labels, tabular figures and reduced-motion support. Tap targets are at least 24px (44px for primary controls); date inputs keep the focus ring via `:focus-within`.

**Don't**

- Bring back the floating pill header, rounded carousel hero, oversized editorial display type or portrait property rail from the rejected redesign.
- Wrap every section in a rounded bordered card, or add gradients, glass or hover shadows to information.
- Show raw IDs, enums or ISO timestamps to customers.
- Use champagne for warning/success text or a full-page dashboard background; add competing action greens.
- Change APIs, routes, validation or money formatting as part of visual work.

## Owner portal

Rules for `/partner/**` and the full-screen wizard (OWNER-EXPERIENCE-PLAN Phase 12). Both render inside `.portal-ui` with `portalFont`.

### Tokens

- `:root` surface tokens point at the `--color-ink-*` scale; do not add new hex literals there. `brand-900` is the deep green (sidebar, footer, pressed buttons); `forest-deep` and `primary-active` are gone.
- Portal type: `text-body` 15 px, `text-meta` 14 px, `text-tiny` 12 px, `text-stat` 28 px/1 for KPI figures, `eyebrow` utility for the small uppercase label above a heading.
- Radius: `rounded-md` for controls and fields, `rounded-full` for chips, pills and badges, `rounded-lg` for cards. No `rounded-sm` or `rounded-xl`.
- Cards have no resting shadow. `shadow-md` only for sticky bars and popovers; dialogs may use `shadow-xl`.

### Dashboard (`/partner`, approved owners)

- Bento grid, `lg:grid-cols-12`, one column on phones. Row 1: the **Today** tile (7/12) is the page's only inverse surface (`bg-brand-900`, paper text, champagne verb buttons, `data-surface="inverse"`), with Arriving / On site / Leaving counts and guest rows sorted by time; **Needs you** (5/12). Row 2: **Booked rent** (8/12) and **Next 7 days** (4/12). Row 3: Properties and Latest updates. Row 4: Upcoming & recent bookings and Booking outcomes (top-aligned).
- Every other tile is a white `rounded-lg` bordered card with no inner cards. Rows inside tiles use `divide-y` or hover washes, never nested borders.
- No duplicate actions: Needs you drops tasks already on a Today row, and Recent bookings drops today's visits.
- Booked rent chart: a single area series (`brand-600` line, 10% wash) plus the previous period as an `ink-300` line with a two-item legend. The crosshair drives the headline figure and sub-line (no floating tooltip); arrow keys do the same. Range control: 7D / 30D / 90D / 12M segmented `h-11`, CSV export as a `size-11` icon button. All zero values show a dashed placeholder, not a zero axis.
- Figures use `text-stat`; the rent headline uses `text-h1`.

### Calendar (`/partner/calendar`)

- Split view from `lg`: a 19rem **property rail** (search, status chips, rows with thumbnail, location and status, compact `Pagination` with `listPage` / `listSize`), then the **workspace**: a property header card (photo, title, status, Booking rules, Property) and `PortfolioCalendar`. Desktop opens the first property. Phones show the rail until a property is chosen, then the calendar with an "All properties" back link.
- Toolbar: Previous / Today / Next group and a fixed-width period title, then a Month / Week / 30 days / Agenda segmented control (links, not a select). Row 2 holds the full legend (every mark in the grid, including check-in, check-out and the custom-price dot) and "Jump to".
- Day cells on a 1px hairline grid. Today is a filled brand circle. Lanes use a Sun or Moon icon for the slot: open is the price in ink, booked is solid `bg-success` with the guest's first name and guest count, hold is dashed warning, blocked is hatched ink, closed is muted, and "Needs attention" is danger. Past dates show no lanes.
- Bulk selection docks sticky under the grid in the page flow, never over dates. The date detail is a right-hand drawer (a bottom sheet on phones). It shows slots with price and state, booking cards with Call / WhatsApp / Open booking, a "Change this date" panel with a before→after preview, then "Block exact hours" and "Add offline booking" disclosures.

### Pagination

`components/ui/pagination.jsx` is the one pagination control for every list. It shows "1–10 of 57", a "Rows per page" select (10 / 20 / 50) and Previous / numbered pages (with ellipsis) / Next. It is URL-driven: it keeps every other query parameter and resets to page 1 when the page size changes. `pageParam` and `sizeParam` name the query keys. `compact` is for narrow rails. Disabled Previous and Next keep the bordered shape.

### Setup checklist (header)

- "Get ready for bookings" lives in the owner header, left of Add, as a pill containing a progress ring (`done/total`, `brand-600` arc on an `ink-200` track) and "Finish setup" from `md`. On phones only the ring shows.
- The pill opens a native `popover` panel: a 56px ring with the percentage, then numbered steps. Done steps show a filled check, and the next step is highlighted with a primary action. The panel ends with "Hide this checklist" when the API allows it.
- The control renders nothing once every step is done or the owner dismissed it. It is streamed from the partner layout (`SetupProgress`) and never shown on the dashboard body.

### Status

- Every state renders through `StatusBadge` (`components/ui/status-badge.jsx`) with labels and tones from `lib/domain/status.js`. Always a dot plus text, never colour alone, never a raw enum.
- Tones: success = live or done; warning = the owner must act; info = with Rentra; neutral = stopped by the owner or ended; danger = Rentra stopped it or it failed.
- Brand colour is for actions and selection only, never status. Calendar "Booked" uses the success tone.

### Components

- Page: `PortalPage` (named widths) and `PageHeader`. States: `EmptyState`, `InlineAlert`, `PortalState`, `ConfirmDialog`. Mobile: `PortalBottomBar`.
- Fields: `ui/field` with the label above, a one-line hint, then the error linked by `aria-describedby`. Inputs are 44 px high. Mark "(optional)"; required fields carry `aria-required`. Failed submits show `ValidationSummary`.
- Buttons: `Button`/`buttonVariants`. Pending shows a spinner plus text; disabled says why.
- `UnsavedChangesGuard` is mounted once by `PortalShell` and `WizardShell`. Forms are tracked from first input until submit (or until `rentra:form-saved` for forms marked `data-unsaved-until-saved`, such as policy previews). GET/search forms and `data-unsaved-guard="off"` are ignored.
- Earnings (`/partner/earnings`): monthly booked rent is the primary figure, with completed visits' rent and refunds alongside. White `rounded-lg` panels use ink dividers and no resting shadow. Its headline uses 36px type on phones and 48px from `sm`; this is a surface-specific hierarchy, not a replacement for portal KPI tokens. Payout readiness is a 300px secondary column from `xl` and a collapsed disclosure below the summary at smaller widths.
- Earnings activity: one bar per day of the selected month, grouped by when rent was first recorded in IST. Bars use `brand-500`, `brand-800` for selection and ink for zero values; date ticks share the bars' day grid. Hover, focus and tap update the inline amount; arrow keys and Home / End move between days. Keep booked rent distinct from payout amounts and completed rent as a subset, not an additional balance.
- Earnings records: a single bordered group, desktop table and compact phone rows, with details disclosed per booking. Keep the amount visible before expanded evidence. Month navigation stays visible on phones; property and booking-type filters sit behind Filters. CSV and print actions share Export, and loading uses a matching in-flow skeleton shell.
- Reviews (`/partner/reviews` and a property's Reviews tab): a compact public average/count strip precedes one white `rounded-lg` inbox with divided guest rows. Use only API-backed public statistics; do not derive a total needing replies or rating distribution from the current page. Filters are links with `aria-current`, and changing the filter starts at page 1 within the current property scope.
- Review rows: show the guest, rating, written feedback and visit context before actions. Feedback uses 16px type with a 28px line height and a maximum 72ch measure; long feedback expands in place. Reply is the primary action, with an inline editor; details and reporting remain secondary. Phone actions wrap beneath full-width feedback. Label unpublished reviews and existing replies "Not public" and expose reply editing only for published reviews. Reporting does not change the public rating; the report form closes when refreshed data records the report, even if the review version is unchanged.
- Review states: distinguish no feedback from no replies needed, offer "Read all reviews" for the latter, and keep loading in flow with the overview/inbox geometry and one accessible loading announcement. Embedded Reviews use section headings and retain the property's frame.
- Caretakers: use a white `rounded-lg` directory with ink dividers, semantic state labels, and emerald navigation/actions. Desktop rows align person, assignments, visit access and Manage; phone rows stack with full-width readable text. Keep real membership counts above the group and search/status controls within it. Initials represent people without adding invented portraits.
- Caretaker tasks: invitations and each person's properties/access have separate pages with a Caretakers back link and focused heading. Reuse shared fields, button variants and validation summaries; property selection and visit/guest-contact grants remain explicit. Link issuance and confirmed removal are secondary disclosures. A one-time link is shown only when created, with delivery state and expiry; failed saves retain selections, and successful saves refresh the version guard. History is a directory view, not another competing form.
- Caretaker loading: directory and form skeletons mirror their route's heading, navigation, row or field geometry in flow, with one accessible loading announcement and no entrance motion.
- Help (`/partner/help`): prominent guide search and one white `rounded-lg` topic/result group lead; Contact support and My requests remain quieter, separate destinations. Topic pages use divided article links. Articles use 16px text with a 28px line height and a maximum 65ch reading measure; preserve published actions and stable legacy article links.
- Support: the request inbox leads with subject, unread reply and semantic state before reference/date metadata. A thread leads with its subject and status, then divided conversation rows with 16px/28px message text; saved booking, visit, property and policy context stays in a secondary rail that stacks below on phones. The contact form leads its own page; show only published channels and retain truthful asynchronous-support copy.
- Help forms and loading: use shared fields and validation summaries, stable explicit message labels, readable privacy/photo/consequence guidance and private attachment links. Failed saves retain the draft; pending-owner categories and contextual restrictions remain explicit. Guide and form skeletons mirror the route in flow, including shell loading, with one accessible announcement and no entrance motion.

### Icons (lucide)

Today `Sun` · Calendar `CalendarDays` · Bookings `ClipboardList` · Properties `Building2` · Earnings `Wallet` · Reviews `Star` · Caretakers `Users` · Help `LifeBuoy` · Settings `Settings2` · Inbox `Bell` · Disputes `Scale` · Warning `CircleAlert` only. Sizes: 16 px inline, 20 px in navigation, 24 px in empty-state wells.

### Accessibility

- After a client navigation, focus moves to the page h1 (or `#portal-main`).
- Locked navigation rows are focusable buttons with `aria-disabled` and the reason in `aria-describedby`.
- h1 per page, h2 per section. Essential content is never in 12 px text.
- Motion respects `prefers-reduced-motion`.

### Money, dates and copy

- Money: `displayMoney` ("₹1,200"; paise only when non-zero). Never divide by 100 in the UI.
- Dates: "Sat 4 Oct" in lists, "Sat 4 Oct 2026, 10:45 IST" in detail views, relative time in the inbox. Owner screens say "IST", not "India time".
- A page description is one sentence; longer explanations go behind "How this works". Buttons are verb plus object. No customer copy on owner screens.

| Use                                                                         | Instead of                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Owner                                                                       | partner, client, host                                  |
| Property · Add property                                                     | listing, place, rentable · Add place for rent          |
| Live / Paused / In review / Needs changes / Not approved / Hidden by Rentra | bookable, pending review, rejected, revision           |
| Calendar                                                                    | Portfolio calendar, booking calendar                   |
| Bookings · Visit                                                            | booking records · interval, reservation                |
| Check-in / Check-out                                                        | handover / return                                      |
| Earnings, Earning line, Payout, Payout method                               | allocation, obligation, destination, eligible, settled |
| Caretaker                                                                   | staff, team member                                     |
| Test booking                                                                | environment, simulated, legacy                         |
