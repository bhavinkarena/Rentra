---
name: RENTRA
description: A bright, nature-led rental marketplace with precise operational workspaces.
colors:
  brand-50: '#f1f7f3'
  brand-100: '#ddebe2'
  brand-200: '#bcd8c7'
  brand-300: '#90bca3'
  brand-400: '#629b7d'
  brand-500: '#3f7d5f'
  brand-600: '#2e6449'
  brand-700: '#26503c'
  brand-800: '#1f4031'
  brand-900: '#1a3529'
  brand-950: '#0d1d16'
  amber-100: '#fdf2de'
  amber-300: '#f3c77e'
  amber-500: '#d98a1f'
  amber-700: '#a6640f'
  ink-0: '#ffffff'
  ink-25: '#fafbfa'
  ink-50: '#f5f7f5'
  ink-100: '#ebeeeb'
  ink-200: '#dce1dd'
  ink-300: '#c0c7c2'
  ink-400: '#9aa39d'
  ink-500: '#59655d'
  ink-600: '#5a635d'
  ink-700: '#414843'
  ink-800: '#2a2f2b'
  ink-900: '#171a18'
  success: '#2e6449'
  success-bg: '#f1f7f3'
  warning: '#b45309'
  warning-bg: '#fdf3e7'
  danger: '#c0362c'
  danger-bg: '#fbedec'
  info: '#2563a5'
  info-bg: '#eaf1f8'
  whatsapp: '#1fa855'
  forest-deep: '#142e23'
  forest-line: '#3c5546'
  paper: '#f5f6ed'
  lime: '#dbeaaf'
  lime-soft: '#e5efc8'
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
    backgroundColor: 'rgb(192 54 44 / 0.1)'
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
    backgroundColor: 'rgb(255 255 255 / 0.12)'
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

## Overview

**Creative North Star: "A Clear Path to the Outdoors"**

Sunlit property photography on pale, slightly green-tinted ground; forest green for every action; a deep-forest footer with a lime accent. The public home page is the reference for the whole customer experience and was re-approved by the owner on 29 Sep 2026 after an earlier redesign was rejected. The redesign plan (`RENTra-UI-REDESIGN-PLAN.md`) carries this look to every other customer page rather than replacing it.

Owner and admin workspaces share the tokens and type but keep their own dense, forest-sidebar shell. Nothing in this file changes them.

**Key characteristics**

- Full-bleed photography on discovery surfaces; flat listing cards (photo + text, no box).
- One action colour (forest green). Lime appears only on forest-deep surfaces.
- Pill-shaped actions and chips, as in the home hero and footer.
- Icon + short label rows in place of paragraphs.
- Honest data: no invented ratings, counts, badges or photos.

The frontmatter is the token record; runtime values live in `app/globals.css` and win if the two disagree.

## Colors

- **Brand ramp (`brand-50…950`).** `brand-600` is the action fill; `brand-700` its hover and link colour. `brand-50` tints supportive surfaces (icon wells, selected chips). `brand-400` is decorative only.
- **Amber.** Star ratings and peak-price context only. `amber-700` when amber is text.
- **Ink ramp.** `ink-25` is the page, `ink-0` form and summary surfaces, `ink-100` photo placeholders, `ink-200` dividers, `ink-300` input borders, `ink-500/600` secondary text, `ink-900` primary text. `ink-400` is non-text.
- **Semantic pairs.** success/warning/danger/info with matching `-bg`. Always pair colour with a text label.
- **Forest-deep surfaces.** `forest-deep` background, `paper` text (at 60–75% for secondary), `lime` for accent text and headings, `lime-soft` for the one action fill, `forest-line` for dividers. Used by the footer; available for confirmation moments. Never put lime on a light surface.
- **WhatsApp green.** Only the published WhatsApp contact button.
- Occasion-picker tints in `components/rentra/OccasionPicker.jsx` are local to that component.

Public and customer pages are light only. `.dark` exists for opt-in operational shells.

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
- Header: sticky, light (`bg-background/90`, blur, bottom border), wordmark left (mark only below `sm`), `CustomerNavigation` right, "List your place" as a quiet link from `md`. Not floating, not framed.
- Home: full-bleed photo hero (`HeroPhotos`, manual switcher) with the headline, `SearchBar` and intent chips inside it; `TrustStrip` below; "Explore places" with horizontally scrolling `CityRow`s ("Near {City}"); `OccasionPicker`; city chips; owner call-to-action; footer.
- Listing grids: 1 → 2 (`sm`) → 3 (`lg`) → 4 (`xl`) columns. City rows scroll horizontally with arrow buttons.
- Footer: compact deep-forest block — brand + one-line invitation, "Your next getaway" links, "Have a place to share?" with a lime-soft pill, city links, then legal links and the intermediary statement.
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

`components/ui/button.jsx` (CVA): default, outline, secondary, ghost, destructive, link; heights 44px (default) and 48px (`lg`). On public and customer pages pass `rounded-full` to match the home page. Primary = `brand-600`, hover `brand-700`; never `bg-primary` hand-rolled alongside it. Chips: `min-h-10 rounded-full border border-border px-4 text-meta`, hover `border-brand-300 bg-brand-50 text-brand-800`; on photos use `border-white/25 bg-white/10 text-white backdrop-blur`. Keep pending labels and disabled guards.

### Search bar

`components/rentra/SearchBar.jsx`: white labelled cells (Where / When / Slot / Guests) in one `rounded-full` bar on desktop, stacked `rounded-lg` card on mobile, `shadow-lg`, pill search button. Every cell ≥ 44px.

### Listing card

`components/rentra/ListingCard.jsx` is the only property card. 4:3 photo (`rounded-md`, top scrim, `TrustBadge` from API, `SaveButton` as a separate control, photo-count dots), then area (h4), "New" or rating, title as a stretched link, capacity line, price with "from" only when `isFromPrice`. When every card on a page shares one price note, show it once below the list. Missing photo: "Photos coming soon"; failed photo: `PropertyImage` fallback.

### Inputs and forms

`components/ui/input.jsx`: 44px, `rounded-md`, `border-input`, `bg-card`, 16px text below `md`. Visible labels, described errors, server-action field errors, pending states and unsaved-change guards stay as implemented. New shared field/select/textarea primitives are added in the phase that first needs them (see plan D7).

### Navigation

`components/customer/CustomerNavigation.jsx`: Explore, Saved, Bookings (signed in), avatar menu; icon-only below `sm`, 44px targets, active item on a `brand-50` pill.

### Badges and status

`components/ui/badge.jsx` for status; `TrustBadge` for API-supplied verification; `Rating` with amber stars. Status always has a text label.

### States

Empty states: icon in a brand tint, one-line title, one-line explanation, one action (reference: `BookingHistory` empty state). Errors: say what failed and offer a real next step; do not reuse search advice on unrelated pages. Loading: `ScreenSkeleton`/route skeletons that match the final layout; labels in plain words.

### Motion

150–200ms colour/opacity/transform feedback; listing photo hover scale (300ms, `motion-safe`); hero photo switch and occasion tabs are user-triggered, never autoplay. No scroll-triggered reveals. Everything respects `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Reuse the home page's pieces (chips, pill CTAs, `ListingCard`, `SearchBar`, forest footer) before inventing new ones.
- Use real photos and real data; show honest empty/unavailable states.
- Keep from-prices distinct from date-specific quotes, fees and deposits.
- Keep focus outlines, labels, tabular figures and reduced-motion support.

**Don't**

- Bring back the floating pill header, rounded carousel hero, oversized editorial display type or portrait property rail from the rejected redesign.
- Wrap every section in a rounded bordered card, or add gradients, glass or hover shadows to information.
- Show raw IDs, enums or ISO timestamps to customers.
- Put lime on light surfaces or add a second action colour.
- Change APIs, routes, validation or money formatting as part of visual work.
