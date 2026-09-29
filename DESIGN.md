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
  ink-400: '#66736a'
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
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', 'Noto Sans Devanagari', 'Noto Sans Gujarati', system-ui, -apple-system, sans-serif"
    fontSize: 'clamp(2.5rem, 4.2vw, 3.75rem)'
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: '-0.035em'
  h1:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: 'clamp(1.875rem, 3vw, 2.5rem)'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.03em'
  h2:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: 'clamp(1.5rem, 2.4vw, 2rem)'
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
  sm: '6px'
  md: '10px'
  lg: '14px'
  xl: '20px'
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
    rounded: '{rounded.md}'
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
    rounded: '{rounded.lg}'
  booking-summary:
    backgroundColor: '{colors.ink-0}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.lg}'
    padding: '20px'
---

# Design System: RENTRA

## Overview

**Creative North Star: "A Clear Path to the Outdoors"**

RENTRA pairs bright, lightly green-tinted surfaces with grounded forest accents and real property photography. The public experience feels open and relaxed, while type, navigation, and financial detail make the next action clear. Imagery carries the atmosphere; interface decoration stays restrained.

The same identity continues into owner, administrator, and caretaker workspaces through the local brand face, compact typography, tabular figures, forest navigation, and explicit states. Discovery cards and booking/financial surfaces serve different purposes: a photograph invites exploration; a bordered summary organizes a decision.

**Key Characteristics:**

- Bright nature-led surfaces and a forest action accent.
- Real photography with quiet, flat listing anatomy.
- One locally served type family with surface-specific density.
- Clear forms, financial hierarchy, and permission-aware navigation.
- Short state transitions with reduced-motion support.

The frontmatter is the normative token record. Values come from `app/globals.css` and the existing component implementations. `.impeccable/design.json` extends this record with depth, motion, responsive thresholds, and standalone component samples. It is documentation, not a second runtime theme.

## Colors

The palette is cool sunlight on pale ground, with deep field greens for action and sparse functional accents.

### Primary

The `brand-*` ramp runs from pale field tint to deep forest. `brand-600` is the light-surface action fill; `brand-700` is its hover and prominent-link companion. The darker end anchors navigation and the public headline, while pale tints distinguish selected or supportive surfaces. Preserve `brand-400` for fills rather than ordinary small text on light ground.

**The Action Color Rule.** Forest green identifies the supported next action; additional color must explain state, rating, pricing context, or an existing external service.

### Secondary

Harvest amber is used for ratings, peak-price context, and existing portal attention badges. It is not a competing primary CTA color. Use the darker amber text token when amber conveys text rather than a star fill.

Semantic success, warning, danger, and information pairs communicate existing states. WhatsApp green belongs only to the published WhatsApp contact action, shown when a real contact exists.

### Neutral

`ink-25` is the page ground; `ink-0` is the solid content and form surface. `ink-50` and `ink-100` create gentle grouping. `ink-200` separates surfaces, and `ink-300` outlines inputs. Primary text uses `ink-900`; the middle/darker neutral tokens provide secondary text and supporting detail.

The shadcn semantic slots resolve to these runtime values. Scoped `.dark` overrides exist for operational shells; they are opt-in. Public discovery and booking remain light. The dark forest sidebar is navigation chrome and does not itself enable a dark page theme.

## Typography

**Display Font:** Plus Jakarta Sans, with the existing system and Indic fallback stack.

**Body Font:** Plus Jakarta Sans, served locally by `next/font/local` from `assets/fonts/PlusJakartaSans-latin-variable.woff2`.

**Character:** A readable, softly geometric voice throughout the product. Expressive public headlines use the fluid display scale; operational pages use a denser scoped scale without changing the brand face.

### Hierarchy

- **Display:** The fluid `display` role is used for the public hero; compact negative tracking and balanced wrapping keep it calm.
- **Headlines:** `h1` and `h2` provide page and section hierarchy. `h3` and `h4` name subgroups and repeated listings.
- **Body:** `body-lg` supports short introductory copy; `body` supports normal reading.
- **Labels and metadata:** `meta` supports navigation and useful detail; `tiny` supports short secondary labels. Do not promote a long explanation into tiny text.
- **Portal:** `.portal-ui` sets `h1` to 1.875rem, `h2` to 1.5rem, `h3` to 1.0625rem, `h4` and body-large to 0.9375rem, and body to 0.875rem. Metadata and tiny sizes remain unchanged. These are existing scope overrides, not a separate font identity.

**The Stable Figures Rule.** Money, dates, timers, and aligned table values use tabular figures. Keep prices readable at their financial hierarchy rather than relying on a decorative monospace font.

Headings balance and allow long content to wrap. Paragraphs use pretty wrapping. Hindi and Gujarati language selectors increase leading; fallback names alone do not load localized font files.

## Layout

The public page container is capped at the observed 1280px token, with 16px side gutters increasing to 24px at the small threshold. Tailwind spacing uses the existing 4px base. Compact controls use small steps; section padding grows from 40px to 56px where the current public pages do so.

The home page places copy beside a real listing photo from the medium threshold, with the search form below. On narrower screens, the composition stacks. The photo and matching home skeleton are 16:8 below 768px and 4:3 from 768px, with a 420px height cap from the large threshold. The shallow mobile photo keeps the search form inside the tested 390 × 844 first viewport. This is a home-surface composition, not a required layout for every page.

Listing grids use one column, then two at small, three at large, and four at extra-large widths. The four-cell search form starts as a two-column grid with a full-width search action, becoming a single horizontal row at medium width. Listing pages separate descriptive content, availability, and the booking summary; the narrow-screen booking bar yields the bottom action position, including clearance for the WhatsApp contact.

Operational workspaces use a persistent forest sidebar at large width and a mobile drawer below it. The full sidebar is 236px wide and can collapse to a 64px icon rail. The rail preference is browser-local; keyboard-focus labels remain available. Tables and forms must keep their existing overflow and stacking behavior instead of shrinking content into unreadable density. The caretaker workspace is independently phone-first.

The responsive thresholds inherited from Tailwind are carried in the sidecar. Refer to the actual route and component for narrower content-specific layouts.

## Elevation & Depth

The product is flat by default, with photographs and pale surface shifts supplying depth. Listing cards have no enclosing border or resting shadow. Booking summaries, search, floating controls, popovers, and overlays use the existing restrained shadow vocabulary when they need separation from surrounding content.

### Shadow Vocabulary

- **Extra-low:** `shadow-xs` gives minimal separation.
- **Low:** `shadow-sm` supports small selected/floating surfaces.
- **Summary:** `shadow-md` supports the search and booking decision surface.
- **Overlay:** `shadow-lg` supports floating controls and overlay details.
- **Focus:** `shadow-focus` supplements the visible outline. Preserve the shared two-pixel outline and offset rather than relying on the shadow alone.

Exact shadow values are in the sidecar and runtime CSS. Shared Button and Input retain the global two-pixel `:focus-visible` outline with a three-pixel offset. Their component rings supplement this outline; removing a ring for an embedded field must not remove its keyboard outline.

**The Flat Discovery Rule.** Keep the photograph and text as a single flat listing; reserve bordered, padded financial surfaces for quote and transaction decisions.

## Shapes

The implemented radius scale is compact: small accents use `sm`, controls use `md`, listing media and summaries use `lg`, and the hero photo uses `xl`. Borders are quiet functional separators. Rounded badges, circular save/contact controls, and avatars remain purpose-specific exceptions rather than a recipe for wrapping every section.

Keep photography clipped to its media shape and retain its reserved aspect ratio while loading. Scrims are legibility treatments on images, not a general gradient style. Missing photography uses the existing neutral placeholder and honest copy.

## Components

### Buttons

The shared `Button` uses `class-variance-authority` with default, outline, secondary, ghost, destructive, and link variants. The default control is 44px high with compact semibold text; large controls are 48px. Smaller variants are present for dense existing contexts and should not be treated as the default mobile touch size.

Primary actions use forest fill and white text; hover deepens the forest. Outline and secondary actions keep neutral surfaces. Destructive actions use semantic danger rather than forest. Disabled and pending states preserve their existing behavior and feedback. Background/color/border changes are short; pressed actions scale slightly when appropriate.

### Chips and Badges

Slot-selection buttons keep `aria-pressed`, the selected white surface, dark forest text, and the low selection shadow. Ratings retain amber stars. Status and trust badges describe only data supplied by the existing backend or content. Keep their labels visible rather than encoding meaning through color alone.

### Cards / Containers

Listing cards reserve 4:3 photography, then title/rating, location, capacity/facility detail, and price/unit. Preserve source-backed ratings, badges, counts, and the distinction between from-price and date-specific price. Property names use the full card width; location and review information wrap on the following row, with each rating kept together. Only priced rows receive a from qualifier. Home may show an identical API price qualification once above the grid when all cards share it, associating it with each property link; retain individual notes elsewhere and when conditions differ. Photo hover scales gently only when motion is allowed; the save control remains a separate interaction.

Booking/financial summaries use a white surface, border, observed padding, and restrained depth to group date, guest, quote, fee, and transaction detail. Preserve the existing quote provider and minor-unit money formatting. Do not give every descriptive section this treatment.

### Inputs / Fields

The shared input is 44px high, uses the input border token, a white content surface, and the control radius. Input text is 16px below 768px and 14px from 768px. Keep visible labels, field associations, focus, invalid, disabled, and pending feedback. Server action and API field errors remain part of the form contract. Page-specific customer forms still have independent recipes; their integration is tracked in the redesign plan and is not certified by these shared primitive rules.

### Navigation

Public and customer navigation share `CustomerHeader`: a sticky warm-white surround with a framed white navigation surface, pill-shaped active and login controls, the delivered wordmark and a separated host link on wider screens. Keep the wordmark visible on phones; use the existing accessible icon navigation to preserve room. Customer role detection, account avatar, nested account state, saved/bookings links and skip-link targets remain unchanged. Preserve 44px targets, keyboard focus, wrap at enlarged text, and the existing portal/sidebar system outside these layouts.

The public footer is a deep-forest closing section with a large invitation, pale-lime discovery action, inverse brand lockup and grouped discovery/support/hosting links. A labelled native city selector is used at all widths; the associated category and five occasion links switch together. All destination links remain prerendered. Do not reintroduce a large repeated SEO list or expanding columns. Legal policies and the published intermediary statement remain visible. Use light focus outlines and readable pale text on the forest surface.

### Dialogs, Popovers, and States

Existing Radix primitives supply dialog/popover behavior in booking and selection flows. Preserve their semantic triggers, escape/focus behavior, and overscroll containment. Forms retain the existing unsaved-change guard and validation summary where supplied.

Use the shared portal state, retry, navigation progress, brand loader, and skeleton components. State copy should name the relevant failure or next step without turning permission denial into an empty list. Skeletons reserve the shape of the future content. No testimonial, verification, price, or capability may be introduced as a loading placeholder.

### Motion

Controls use brief, state-driven transitions; card imagery uses a 200ms ease-out transform. Navigation, sidebar width, and loading animations communicate actual state. Listing submission has existing one-shot confirmation motion. Respect the global reduced-motion rule and component-level motion variants; avoid new decorative loops or page-wide reveal sequences.

## Do's and Don'ts

### Do:

- **Do** use the local Plus Jakarta Sans face across public and portal surfaces, with the existing scoped density.
- **Do** use real listing imagery and keep honest unavailable or empty states when data is absent.
- **Do** keep discovery cards flat and give booking/financial summaries their own clear hierarchy.
- **Do** preserve API-backed prices, dates, fees, permissions, form state, and role-specific navigation.
- **Do** retain visible keyboard focus, semantic labels, tabular figures, and reduced-motion behavior.

### Don't:

- **Don't** fabricate verification, guarantees, reviews, prices, proof counts, or new functionality.
- **Don't** wrap every section in a rounded white card or add broad gradients, glass, and repeated shadows.
- **Don't** introduce backend/API changes as part of this visual system.
- **Don't** change public pages to dark mode or replace real property assets with invented imagery.
- **Don't** claim that documentation establishes successful QA or production readiness.

Home treats a successful empty listing result separately from an API read failure. Keep honest recovery and photo placeholders. Its four search fields have at least 44px targets; compact cell padding preserves the existing first-viewport mobile search composition.

### Expressive home discovery

All design decisions remain open for reassessment under the user's full-scope reopening. Occasion discovery uses dedicated, credited editorial inspiration photos for picnic, pool, bonfire, couple photography and team gathering. A tab change synchronizes photo, caption, copy, panel tone and action; the selected city persists. Do not label inspiration imagery as a real Rentra property. Preserve blur placeholders, keyboard tab navigation and reduced-motion support.

The home rebuild uses an immersive, attributed property photograph with display typography up to 86px, a manual three-property hero, a native horizontally scrolling property rail and occasion/city discovery. Keep all content visible without entrance-animation dependencies. Rail cards use larger portrait crops only on home; search cards retain their existing geometry. Native scrolling, directional controls and keyboard access must agree at both rail boundaries.

Home adds scoped warm white `#fafbf8`, pale olive `#e9efdf` and light lime `#dbebbc` to the established forest identity. These are editorial discovery surfaces, not replacements for financial/status tokens. Light 3px focus outlines belong on the dark hero and photo-credit surfaces; controls on pale surfaces retain forest focus. Real photo attribution and truthful price qualifications stay visible.

Hero changes use a 450ms photo transition, property photos use a 400ms hover/focus transform, and action arrows move briefly on hover. Motion is manually triggered, never autoplay, and disabled by reduced-motion preferences. Occasion tabs use arrow keys/Home/End and retain owner-permission caveats. See the [home rebuild record](docs/rentra-ui-redesign-phase-4-rework.md).
