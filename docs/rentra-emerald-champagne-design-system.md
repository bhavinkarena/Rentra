# Rentra — Emerald & Champagne design system and frontend implementation guide

**Prepared:** 29 September 2026  
**Source baseline:** frontend commit `7281378` (`refactor: update component styles and improve accessibility`)  
**Status:** proposed design specification and source audit; application changes are not implemented by this document.

Use **Emerald Ink `#064E3B`** for the brand and primary actions, **Champagne `#F8E7C9`** for restrained highlights, warm off-white for the page, and white for working surfaces. Preserve Rentra's photography, existing logo geometry, clear booking information, and separate operational workspaces. The result should feel welcoming on discovery pages and precise on booking and administration pages.

This guide is specific to Rentra's Next.js App Router, React 19, Tailwind CSS 4, Radix, and existing component structure. It is an evolution of the current interface, not a proposal to replace it with an unrelated template.

> **Implementation update — 29 September 2026:** the palette, primitives, brand assets, route-specific styling and loading treatments have been applied to the frontend. See [implementation and verification](rentra-emerald-champagne-implementation.md) for changed files, checks and remaining device coverage. The source findings below preserve the original audit context.

## Contents

1. [Review scope and evidence](#1-review-scope-and-evidence)
2. [Design direction](#2-design-direction)
3. [Priority findings](#3-priority-findings)
4. [Palette and contrast](#4-palette-and-contrast)
5. [Token implementation](#5-token-implementation)
6. [Component rules and interaction states](#6-component-rules-and-interaction-states)
7. [Public and customer implementation](#7-public-and-customer-implementation)
8. [Partner, admin, caretaker, and wizard implementation](#8-partner-admin-caretaker-and-wizard-implementation)
9. [Logo and brand assets](#9-logo-and-brand-assets)
10. [Loading and skeletons](#10-loading-and-skeletons)
11. [Typography, spacing, and responsive behavior](#11-typography-spacing-and-responsive-behavior)
12. [Accessibility and interaction quality](#12-accessibility-and-interaction-quality)
13. [Implementation sequence](#13-implementation-sequence)
14. [Acceptance and handoff](#14-acceptance-and-handoff)

Companion documents:

- [Complete source inventory and migration ownership](rentra-emerald-champagne-source-inventory.md): every scanned frontend source file, including all page and loading boundaries.
- [Visual palette and component specimen](rentra-emerald-champagne-preview.html): proposed color relationships, logo treatments, controls, status chips, and loading surfaces. This is a documentation specimen, not a running application page.

## 1. Review scope and evidence

The repository-wide static review covered **544 source files / 44,376 lines** under `app`, `components`, and `lib`: 296 App Router files, 174 component files, and 74 library files. This includes **120 `page.js` files and 122 `loading.js` files**, all seven route groups, both application CSS files, the inline logo, metadata images, and client/server presentation dependencies. The three exported brand SVGs, brand README, font setup, package configuration, `DESIGN.md`, and existing redesign/runbook documents were also inspected.

All JavaScript/JSX source files were parsed successfully for the inventory. The review traced page imports, shared visual owners, JSX styling, literal colors, loading variants, controls, and accessibility candidates. Manual source inspection concentrated on shared primitives and shells, each UI family, and exceptions exposed by the scan. Library files without presentation were checked for ownership and dependencies; changing their business logic is not a color migration requirement.

**Evidence boundaries:** findings below come from source and calculated solid-color contrast. No live application server was available at `localhost:3000` during this review. Authenticated customer, partner, admin, and caretaker journeys were not browser-tested in this task. Existing recorded browser gates are historical evidence, not new verification of this proposal. Image overlays, sticky overlap, rendered focus, and responsive geometry still require the browser acceptance matrix in section 14. Static inspection is not a claim of full WCAG conformance.

The active `rentra-client-admin-part25.md` describes content-publication delivery. Its relevant visual owner is `components/content/ContentEditor.jsx`; it is not the application's theme source. Keep that completion record intact. The current `DESIGN.md` describes the previously approved forest/lime appearance. On implementation, update it to this palette while retaining the approved home structure. Do not mark a numbered implementation part complete merely because this specification exists.

### Existing strengths to preserve

- Shared tokens and Tailwind/shadcn mappings already exist in `app/globals.css`.
- Plus Jakarta Sans is served locally; money and dates already have tabular-number support.
- Discovery uses real property images and one shared `ListingCard`; saving is a separate control from the card link.
- Search/filter state is largely URL-backed; operational detail tabs preserve their list context.
- Public/customer shells already include skip links. Radix and native dialogs provide a useful foundation for keyboard interaction.
- Pending labels, outage states, field errors, confirmation steps, and unsaved-change handling already exist in many flows.
- Global reduced-motion handling and safe-area padding on the mobile booking bar are already implemented.

These are valuable behaviors. Preserve them while consolidating visual styles.

## 2. Design direction

### A warm marketplace with a precise workspace

The public site should feel like a clean frame around places people can visit: generous photography, clear property facts, calm navigation, and a strong booking action. Partner/admin pages should retain compact tables, clear labels, predictable actions, and readable status indicators.

Use the following as visual proportions, not literal pixel quotas:

| Surface                             | Neutral/white        | Emerald                       | Champagne                                              |
| ----------------------------------- | -------------------- | ----------------------------- | ------------------------------------------------------ |
| Public pages, excluding photography | Approximately 75–85% | Approximately 10–20%          | Approximately 5–10%                                    |
| Checkout/account                    | Approximately 85–90% | Actions and selected controls | One supporting highlight when useful                   |
| Portal content area                 | Approximately 90%    | Actions, links, selection     | Small brand accents; no blanket table fill             |
| Footer/sidebar                      | Deep emerald base    | Surface itself                | Accent text, active indicator, optional inverse action |

Champagne is a brand accent, not a warning, premium-access entitlement, disabled state, or payment-success signal. A champagne section should contain useful content; do not add decorative bands between every section.

Keep the existing full-bleed home hero, light sticky header, flat property cards, city rows, and compact dark footer. The existing design record explicitly describes a rejected alternative home layout; the new palette does not require reviving that alternative. Use emerald and champagne to refine the established composition.

## 3. Priority findings

**P1:** address before releasing the new theme. **P2:** complete during the migration. **P3:** polish after the main components are consistent. “Source-confirmed” means the implementation is present; it does not imply that every runtime state was exercised.

| Priority | Source evidence (`file:line`, relative to frontend root)                                                                                                                                                                                         | Finding and required change                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | `components/rentra/TrustBadge.jsx:24`                                                                                                                                                                                                            | `peak` uses white on `amber-500`: **2.76:1**, insufficient for its small label. Use warning foreground/background, or dark text on the amber fill. This is a defined variant; runtime use depends on supplied badge data.                                                                                                                                                     |
| P1       | `components/rentra/TrustBadge.jsx:21`; `components/partner/listing/SubmitBar.jsx:97`; `components/partner/listing/SectionPrimitives.jsx:169`; `components/partner/KycUploadForm.jsx:102`                                                         | `amber-700` on `amber-100` is **4.25:1**, below 4.5:1 for small text. Normalize these states to `warning`/`warning-bg`. The existing token comment refers to white, not the actual tinted surface.                                                                                                                                                                            |
| P1       | `components/rentra/SearchBar.jsx:54`; `components/partner/PropertyFilters.jsx:65`; `components/partner/listing/SectionPrimitives.jsx:56`                                                                                                         | Placeholder `ink-400` on white is **2.59:1**. Use `text-muted-foreground` for placeholders; retain a persistent label. The same class occurs in onboarding, settings, document review, and decision forms.                                                                                                                                                                    |
| P1       | `components/partner/PropertyFilters.jsx:59`                                                                                                                                                                                                      | Property search has a placeholder but no associated label or accessible name. Add a visible or visually hidden “Search properties” label with `id`/`htmlFor`. SearchBar's inputs are wrapped by its `Cell` label; those are not missing-label defects.                                                                                                                        |
| P1       | `app/globals.css:205`; `components/ui/input.jsx:9`                                                                                                                                                                                               | Existing input border `#C0C7C2` is only **1.72:1** against white. Where the outline identifies the control, use the new control-border token with at least 3:1 against the adjacent surface. Keep subtle card separators separate.                                                                                                                                            |
| P1       | `app/globals.css:337`; `components/portal/PortalShell.jsx:284`; `components/rentra/SiteChrome.jsx:102`                                                                                                                                           | The global dark-green focus outline is reused on dark chrome. Current ring `#2E6449` against portal `#0D1D16` is **2.52:1**. Scope a light focus token to dark surfaces and test the actual outline, offset, and clipping. Merely changing the primary green makes this worse on some dark surfaces.                                                                          |
| P1       | `components/rentra/SearchBar.jsx:54`; `components/customer/AccountForms.jsx:16`; `components/staff/StaffForms.jsx:14`; `components/partner/listing/SectionPrimitives.jsx:55`                                                                     | Mobile controls use 14px `text-meta`/`text-sm` despite the existing 16px design rule. Use `text-base md:text-sm` on inputs/selects/textareas. This is a mobile usability fix; 16px is a product rule, not a WCAG minimum font size.                                                                                                                                           |
| P2       | `components/partner/listing/OwnershipSection.jsx:127`; `components/partner/listing/TermsSection.jsx:48`; `components/partner/KycUploadForm.jsx:146`; `app/(admin)/admin/applications/[id]/page.js:81`; `components/admin/AdminPrimitives.jsx:96` | Bare `border-blue` and `ring-blue/10` have no corresponding `--color-blue` definition. The numbered Tailwind blue ramp does not supply a bare blue token. Replace with `border-info` and `ring-info/20`.                                                                                                                                                                      |
| P2       | `components/portal/PortalShell.jsx:177`                                                                                                                                                                                                          | Collapsed sidebar uses `RentraMark` without `tone="inverse"` on dark green. The default deep logo fill is only **2.21:1** against the current rail. Use the inverse artwork; retain the expand button's accessible label.                                                                                                                                                     |
| P2       | `components/ui/rentra-loader.jsx:16`; `app/globals.css:492`                                                                                                                                                                                      | Loader `inverse` sets a data attribute, but there are no matching inverse CSS rules and the mark never receives the inverse tone. Halo/ring colors are literal old-logo colors. Implement the variant or remove the misleading API after updating callers.                                                                                                                    |
| P2       | `components/loading/ScreenSkeleton.jsx:658`; `app/globals.css:439`                                                                                                                                                                               | ScreenSkeleton pulses its whole content while every `Block` also shimmers. Use one gentle animation on placeholder blocks; keep borders and surfaces static.                                                                                                                                                                                                                  |
| P2       | `components/loading/ScreenSkeleton.jsx:88`, `:222`, `:292`                                                                                                                                                                                       | Card skeletons are boxed and stop at three columns, while discovery cards are flat with four columns at `xl`; the home skeleton uses a split hero. Booking skeletons stack the image above text on phones and use 240px images from `sm`, while `BookingHistory.jsx:96` uses side-by-side 112px phone / 200px desktop images. Rebuild geometry to match each finished screen. |
| P2       | `components/loading/ScreenSkeleton.jsx:634`; `components/admin/AdminPrimitives.jsx:4`; `components/partner/PartnerLoading.jsx:106`                                                                                                               | Generic portal skeleton width defaults to 1280px while several loaded dashboards use 1480px; legacy partner skeletons use separate widths. Share layout variants to avoid width changes when loading ends.                                                                                                                                                                    |
| P2       | `components/content/ContentEditor.jsx:7`; `components/admin/AuditBrowser.jsx:7`; `components/admin/OperatorSecurity.jsx:6`; `components/admin/PrivacyFulfillment.jsx:7`                                                                          | Separate field/button constants use bare `rounded`, pale borders, and black primary actions. Migrate to common field styles and primary/secondary button variants. Preserve each workflow's command ordering and confirmations.                                                                                                                                               |
| P2       | `components/portal/DetailLayout.jsx:126`, `:217`; `components/partner/PropertyTable.jsx:98`; `components/partner/ListingStatusBadge.jsx:74`                                                                                                      | Operational labels/statuses use 0.65–0.68rem text (about 10–11px). Raise meaningful table headers, status labels, hints, and references to 12px minimum, preferably 13–14px for frequently read content. Avoid widely tracked uppercase for sentence-length labels.                                                                                                           |
| P2       | `components/rentra/OccasionPicker.jsx:24`; `components/rentra/listing/LocationMap.module.css:6`; `components/rentra/Logo.jsx:65`; metadata image files                                                                                           | Local colors bypass the theme. Assign deliberate token/asset roles; include SVG exports, favicon, Apple icon, share images, and image placeholders in the migration.                                                                                                                                                                                                          |
| P2       | `app/(staff)/staff/layout.js:16`                                                                                                                                                                                                                 | Caretaker header renders a styled lowercase `rentra` span instead of the actual logo. Use `RentraLogo` with a separate “Caretaker” label and add a skip link/main target.                                                                                                                                                                                                     |
| P2       | `components/ui/button.jsx:26`; `components/ui/button.jsx:34`; `components/rentra/listing/LocationMap.module.css:46`                                                                                                                              | Small button sizes range from 24–36px; `icon-lg` is smaller than `icon`. Map expansion/zoom controls are 42/40px. Standardize names and use 44px touch targets for these standalone controls. These are below the product target, not automatically all WCAG failures.                                                                                                        |
| P2       | `components/customer/AccountForms.jsx:18`; `components/auth/OtpDialog.jsx:80`; `components/ui/button.jsx:7`                                                                                                                                      | Customer buttons/forms mix pills, 12px, 24px, and Tailwind default radii. Document intentional public-versus-portal variants and eliminate accidental differences. `rounded-2xl` is currently 16px while custom `rounded-xl` is 24px.                                                                                                                                         |
| P3       | `components/ui/badge.jsx:7`; `components/partner/listing/PhotosSection.jsx:227`; `components/partner/listing/WizardShell.jsx:156`; `components/partner/listing/NewListingStart.jsx:336`; submitted wizard page                                   | Replace `transition-all` with the properties actually animated. Reduce upload-card movement and keep motion out of data-dense layouts.                                                                                                                                                                                                                                        |
| P2       | `app/opengraph-image.js:18`, `:78`                                                                                                                                                                                                               | Global share image still makes broad verification/fund-handling/brokerage claims unlike the current cautious homepage copy. Align share copy with current supported product claims; do not make new trust promises as part of branding.                                                                                                                                       |

## 4. Palette and contrast

### Core tokens

| Role / token                              | Value     | Intended use                                       |
| ----------------------------------------- | --------- | -------------------------------------------------- |
| Primary / `primary`                       | `#064E3B` | Main buttons, links, selected solid controls       |
| Primary hover / `primary-hover`           | `#043D2E` | Hover on solid emerald actions                     |
| Primary pressed / `primary-active`        | `#032E23` | Pressed solid emerald actions                      |
| On primary / `primary-foreground`         | `#FFFFFF` | Text/icons on primary actions                      |
| Brand subtle / `accent`                   | `#ECF4EF` | Selected pale chips, icon wells, light hover fill  |
| Brand subtle text / `accent-foreground`   | `#064E3B` | Text/icons on brand-subtle surfaces                |
| Champagne / `champagne`                   | `#F8E7C9` | Editorial accents, one welcome panel, inverse CTA  |
| Champagne hover / `champagne-hover`       | `#F2DAB0` | Hover on an explicit champagne action              |
| Champagne subtle / `champagne-subtle`     | `#FCF5E9` | Gentle supporting panel background                 |
| On champagne / `champagne-foreground`     | `#064E3B` | Champagne panel headings and inverse button labels |
| Page / `background`                       | `#FAF9F6` | Warm off-white page ground                         |
| Surface / `card`, `popover`               | `#FFFFFF` | Forms, summary cards, tables, menus, dialogs       |
| Surface subtle / `secondary`              | `#F3F4EF` | Quiet row hover, secondary neutral surfaces        |
| Muted surface / `muted`                   | `#ECEEE8` | Low-emphasis grouping; not every placeholder       |
| Primary text / `foreground`               | `#1F2924` | Headings and body text                             |
| Secondary text / `muted-foreground`       | `#59655D` | Labels, helper text, metadata, placeholders        |
| Separator / `border`                      | `#E1E5DE` | Decorative card borders and table dividers         |
| Control outline / `input`                 | `#7C8780` | Inputs and controls requiring a visible boundary   |
| Dark surface / `sidebar`, `forest-deep`   | `#032D23` | Footer and portal sidebar, not page-wide dark mode |
| On dark / `sidebar-foreground`, `paper`   | `#F8F5EE` | Dark-surface body and navigation text              |
| On dark muted / `on-dark-muted`           | `#D5DAD5` | Secondary text on deep emerald                     |
| Dark divider / `forest-line`              | `#386054` | Decorative dividers on dark surfaces               |
| Focus on light / `ring`                   | `#064E3B` | Visible focus outline on white/light grounds       |
| Focus on dark / `ring-inverse`            | `#F8E7C9` | Visible focus outline on dark chrome               |
| Skeleton base / `skeleton-base`           | `#E7EBE5` | Placeholder bars and photo blocks                  |
| Skeleton highlight / `skeleton-highlight` | `#F3F5F0` | Optional single subtle shimmer                     |

Do not use muted text opacity to invent extra shades. Opaque named text colors have predictable contrast and are easier to maintain. A light divider is allowed to be subtle when it is decorative; it is not interchangeable with a control boundary.

### Semantic colors

| Meaning     | Foreground | Background | Example                                                 |
| ----------- | ---------- | ---------- | ------------------------------------------------------- |
| Success     | `#14532D`  | `#ECF5EE`  | Confirmed booking, saved changes, successful completion |
| Warning     | `#9A4D0A`  | `#FFF4E5`  | Pending review, expiring hold, action required          |
| Danger      | `#B42318`  | `#FEF3F2`  | Failed payment, invalid field, destructive confirmation |
| Information | `#1D4ED8`  | `#EFF6FF`  | Pending information, test environment, neutral guidance |
| Neutral     | `#414D45`  | `#ECEEE8`  | Draft, cancelled/expired records, unavailable metadata  |

Preserve domain meanings. A payment in progress is not green “success.” A booked date is not the same as a user-selected date. Pair every meaningful status with text; icons or patterned markers can reinforce it.

Amber `#D98A1F` may remain a decorative star fill beside a numerical rating. It is not a text or white-label button color. Use a darker outline or semantic warning foreground when an amber shape itself must be discernible. Keep WhatsApp's separate branded green only on the published WhatsApp control; it is not a second application action color.

### Measured contrast

Ratios below use the WCAG relative-luminance formula on opaque sRGB values. Rounded display values are for documentation; pass/fail comparisons use unrounded values.

| Foreground / background                         | Ratio   | Decision                                             |
| ----------------------------------------------- | ------- | ---------------------------------------------------- |
| Emerald `#064E3B` / champagne `#F8E7C9`         | 7.99:1  | Excellent for body text, headings, and button labels |
| White / emerald                                 | 9.72:1  | Approved primary action pair                         |
| Emerald / page `#FAF9F6`                        | 9.23:1  | Approved links/headings                              |
| Secondary text `#59655D` / champagne            | 5.01:1  | Approved supporting copy                             |
| Emerald / subtle brand `#ECF4EF`                | 8.68:1  | Approved selected/hover label pair                   |
| Champagne / dark surface `#032D23`              | 12.30:1 | Approved dark-surface accent                         |
| On-dark muted `#D5DAD5` / dark surface          | 10.56:1 | Approved secondary navigation/footer text            |
| Control border `#7C8780` / white                | 3.73:1  | Approved boundary on white                           |
| Control border / page                           | 3.54:1  | Approved boundary on page                            |
| Control border / champagne                      | 3.06:1  | Approved boundary; white fields still preferred      |
| Success foreground / success background         | 8.18:1  | Approved status pair                                 |
| Warning foreground / warning background         | 5.62:1  | Approved status pair                                 |
| Danger foreground / danger background           | 6.05:1  | Approved status pair                                 |
| Information foreground / information background | 6.16:1  | Approved status pair                                 |
| White / champagne                               | 1.22:1  | Do not use for labels or meaningful icons            |
| Existing white / amber-500                      | 2.76:1  | Replace small badge labels                           |
| Existing amber-700 / amber-100                  | 4.25:1  | Replace small warning labels                         |

Normal text needs 4.5:1 for WCAG AA; large text can use 3:1 at the specified size/weight thresholds. Placeholder text is included. Logo artwork has an exception, but visibility remains a design goal. See [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Controls and meaningful graphical indicators generally need 3:1 against adjacent colors; decorative separators do not all need that ratio. See [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## 5. Token implementation

### Change the existing source of truth

The current architecture has two layers: `@theme` supplies palette utilities such as `bg-brand-600`; `:root` supplies shadcn runtime roles such as `--primary`, mapped by `@theme inline`. Change **both**, using aliases to stop duplicate hex values from drifting.

Keep the existing shadcn mapping block and extend it for new semantic roles. Do not overwrite the complete CSS file, remove its accessibility rules, or introduce a Tailwind v3 configuration as the new theme owner. Tailwind 4 creates color utilities from `--color-*` theme variables; plain runtime variables need an appropriate mapping. See [Tailwind theme variables](https://tailwindcss.com/docs/theme).

### Compatibility ramp

Existing code uses the entire brand/ink ramps directly. The following replacement values allow it to inherit the palette during migration. New component APIs should prefer semantic names.

| Ramp                            | Values, from light to dark                                                        |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `brand-50/100/200/300/400`      | `#ECF4EF` / `#DDECE3` / `#BBD8C8` / `#8DBCA4` / `#609A7D`                         |
| `brand-500/600/700/800/900/950` | `#257454` / `#064E3B` / `#043D2E` / `#033326` / `#032D23` / `#021F18`             |
| `ink-0/25/50/100/200/300/400`   | `#FFFFFF` / `#FAF9F6` / `#F3F4EF` / `#ECEEE8` / `#E1E5DE` / `#C4CCC5` / `#7C8780` |
| `ink-500/600/700/800/900`       | `#59655D` / `#4D5A52` / `#38463E` / `#2B3931` / `#1F2924`                         |

`brand-200…400` remain decorative/light-surface values, not blanket text colors. `ink-300` remains a decorative intermediate; inputs must use `border-input`. `ink-400` may identify boundaries but still does not reach 4.5:1 as normal text on white. Audit direct ramp consumers rather than assuming every pair is accessible.

### CSS wiring example

This is an **implementation excerpt**, not a complete replacement stylesheet. Add the full ramp above to the existing `@theme`, replace existing runtime slots, and extend the mapping with the new roles. Keep existing font, layout, radius, selection, and reduced-motion rules.

```css
/* Existing @theme block: update the full brand and ink ramps above. */
@theme {
  --color-brand-600: #064e3b;
  --color-brand-700: #043d2e;
  --color-brand-900: #032d23;
  --color-champagne: #f8e7c9;
  --color-champagne-hover: #f2dab0;
  --color-champagne-subtle: #fcf5e9;
  --color-champagne-foreground: #064e3b;
  --color-success: #14532d;
  --color-success-bg: #ecf5ee;
  --color-warning: #9a4d0a;
  --color-warning-bg: #fff4e5;
  --color-danger: #b42318;
  --color-danger-bg: #fef3f2;
  --color-info: #1d4ed8;
  --color-info-bg: #eff6ff;
  --color-forest-deep: #032d23;
  --color-forest-line: #386054;
  --color-paper: #f8f5ee;
  --color-on-dark-muted: #d5dad5;
}

:root {
  --background: #faf9f6;
  --foreground: #1f2924;
  --card: #fff;
  --card-foreground: var(--foreground);
  --popover: var(--card);
  --popover-foreground: var(--foreground);
  --primary: var(--color-brand-600);
  --primary-foreground: #fff;
  --primary-hover: var(--color-brand-700);
  --primary-active: #032e23;
  --secondary: #f3f4ef;
  --secondary-foreground: var(--foreground);
  --muted: #eceee8;
  --muted-foreground: #59655d;
  --accent: #ecf4ef;
  --accent-foreground: var(--primary);
  --destructive: var(--color-danger);
  --border: #e1e5de;
  --input: #7c8780;
  --ring: var(--primary);
  --ring-inverse: var(--color-champagne);
  --shadow-focus: 0 0 0 3px rgb(6 78 59 / 16%);
  --skeleton-base: #e7ebe5;
  --skeleton-highlight: #f3f5f0;
  --sidebar: var(--color-forest-deep);
  --sidebar-foreground: var(--color-paper);
  --sidebar-primary: var(--color-champagne);
  --sidebar-primary-foreground: var(--color-brand-600);
  --sidebar-accent: #164738;
  --sidebar-accent-foreground: var(--color-paper);
  --sidebar-border: var(--color-forest-line);
  --sidebar-ring: var(--ring-inverse);
}

/* Extend, rather than replace, the existing @theme inline mapping. */
@theme inline {
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-ring-inverse: var(--ring-inverse);
  --color-skeleton-base: var(--skeleton-base);
  --color-skeleton-highlight: var(--skeleton-highlight);
}

/* Apply explicitly to the footer and sidebar/drawer content. */
[data-surface='inverse'] {
  --ring: var(--ring-inverse);
  --shadow-focus: 0 0 0 3px rgb(248 231 201 / 16%);
}
```

Scope inverse variables on the actual dialog/drawer element too: content rendered through a portal may not inherit from the trigger's ancestor.

### Migration rules

| Existing pattern                             | Replacement / decision                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bg-brand-600 text-white hover:bg-brand-700` | Use shared Button default, backed by `primary`, `primary-hover`, and `primary-active`                               |
| Primary `bg-brand-700` buttons               | Move to Button default; don't let some pages start one shade darker                                                 |
| Black submit buttons                         | Emerald primary; keep black only where it is an intentional neutral surface                                         |
| `text-lime` / `bg-lime-soft` in footer       | `text-champagne` / explicit inverse champagne action                                                                |
| Old `lime` token aliases                     | May temporarily alias to champagne for a short migration; remove/update names and consumers before completion       |
| `bg-brand-50` used for selection             | Keep the pale emerald role; do not globally replace with champagne                                                  |
| `bg-brand-50` owner/welcome promotion        | Can become `bg-champagne-subtle` or `bg-champagne` if it is the page's one brand highlight                          |
| `border-border` on inputs                    | `border-input`; keep `border-border` on decorative card/table divisions                                             |
| `placeholder:text-ink-400`                   | `placeholder:text-muted-foreground`                                                                                 |
| Raw amber warning combinations               | `bg-warning-bg text-warning`; preserve the status label                                                             |
| Local `bg-white` form surfaces               | Prefer `bg-card`; white remains the light-theme value                                                               |
| Map literals                                 | CSS variables from the same semantic tokens                                                                         |
| SVG/metadata image literals                  | Shared build-safe brand constants or synchronized asset exports; CSS variables are not inherited into an image file |

Do not run a blind replace of every green or amber class. Inventory, warnings, selection, third-party branding, and editorial accents have different meanings.

### Dark mode and chart tokens

The portal sidebar is dark chrome inside a light application. It is not evidence that the existing `.dark` theme is ready to enable. Numerous `bg-card` surfaces coexist with fixed `text-ink-*`, raw white fields, light skeletons, and semantic fills. Keep public pages light and leave full dark mode opt-in/unreleased until every component is verified against a separate dark palette. Never add `.dark` to the root just to make the sidebar green.

Update the dormant `--chart-*` palette deliberately if charts are introduced. A suitable categorical set is emerald `#064E3B`, information blue `#1D4ED8`, warning brown `#9A4D0A`, purple `#6B3FA0`, and charcoal `#414D45`, on white. Supply labels, line styles/patterns, and data tables where appropriate. Do not use pale champagne as the only thin series against white. No chart library or current chart UI was identified; don't invent chart work for this migration.

## 6. Component rules and interaction states

### Buttons and links

| Variant           | Rest                                                      | Hover                             | Pressed/selected                                        | Focus                                                             |
| ----------------- | --------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Primary           | Emerald fill, white label                                 | Primary-hover                     | Primary-active                                          | Solid emerald outline separated by 3px of the surrounding surface |
| Outline           | White, emerald label, control border                      | Pale emerald fill, emerald border | Pale emerald plus explicit selected state if applicable | Same light-surface focus                                          |
| Secondary neutral | Secondary surface, foreground label                       | Slightly darker neutral           | Muted surface                                           | Same focus                                                        |
| Ghost             | Transparent, foreground/emerald label                     | Pale emerald                      | Pale emerald plus stronger text                         | Visible outline; never hover-only feedback                        |
| Destructive       | Danger fill, white label for the final destructive action | Darker danger `#912018`           | `#7A1B14`                                               | Danger outline on light; contrasting inverse outline on dark      |
| Quiet destructive | Danger-bg, danger label                                   | Stronger danger tint              | Danger tint                                             | Danger outline                                                    |
| Inverse champagne | Champagne, emerald label                                  | Champagne-hover                   | `#EACF9F`                                               | Champagne outline on dark parent                                  |
| Inline link       | Emerald and underline in body copy                        | Primary-hover                     | Primary-active                                          | Visible outline, comfortable offset                               |

Add semantic hover/active/danger tokens when implementing these variants. Keep existing `destructive` behavior as the quiet variant if callers depend on it; add a clearly named solid-danger variant rather than silently making every destructive button equally prominent.

Primary controls: 44px minimum height; main booking/search actions: 48px. Use pills for public navigation, CTA buttons, and chips; use 12px corners for portal actions and labeled form controls. Expose `shape="pill"` / `shape="default"` (or equivalent CVA variants) so callers don't repeatedly override shared classes. Preserve `asChild`, `type`, pending/disabled guards, and action labels.

Disabled: muted surface and secondary text, no hover transform, native `disabled` where valid. Do not make important explanatory text unreadable by dimming an entire panel. Pending: retain width, show a short action-specific label such as “Saving…”, and reserve spinner space. Avoid rendering a fixed page loader inside a small button.

Update `components/ui/button.jsx` first, then local `primary`, `button`, `btn`, and `linkClass` definitions. Correct the icon size naming: use 32px only for explicitly compact desktop tools, 44px default icon controls, and 48px large. Do not globally enlarge every dense row without checking layout.

### Inputs, selects, textareas, checkboxes

White surface, control-border outline, foreground text, muted-foreground placeholder, 12px radius, 44–48px height, and 16px mobile text. A field includes label, optional help, and error; spacing must not change arbitrarily between login, account, owner setup, and admin commands.

- Hover: emerald border or a slightly stronger outline; no yellow/champagne field fill.
- Focus: opaque emerald outline with clear offset. For compound SearchBar cells, use an inset `focus-within` treatment inside the rounded container so the overflow-hidden parent cannot clip the only indicator.
- Invalid: danger outline, explicit message, `aria-invalid`, and `aria-describedby` to the message. Keep the user's value.
- Read-only: ordinary legible text on a subtle surface; explain why editing is unavailable.
- Disabled: semantic disabled state with nearby explanation where the reason matters.
- Checked checkbox/radio: emerald fill and contrasting check/dot. Label and control share a generous clickable region.
- Selected checkbox card: pale emerald fill, solid emerald outline, checked control, and programmatic selected/checked state. Champagne is not needed.

Reuse `components/ui/input.jsx`; add matching shared select/textarea/field-error styles as required. Retain native selects unless a custom select solves a specific usability need. Each select needs explicit foreground/background colors. Avoid duplicating field behavior while extracting styles.

### Cards, tables, and records

| Component               | Treatment                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Discovery property card | Preserve flat photo + text; 4:3 image, 12px photo radius, no enclosing champagne panel                      |
| Booking summary         | White, subtle border, 16px radius, restrained shadow; primary total prominent                               |
| Form section            | White, 16px radius, 20/24px padding; no shadow on every nested field group                                  |
| Record list             | One white bordered group with row separators; matching row hierarchy and action placement                   |
| KPI card                | White base, dark value, secondary label; color only the small icon/status unless the whole card is an alert |
| Table header            | Subtle neutral fill, 12–14px semibold labels, consistent alignment                                          |
| Table row               | White, neutral hover; selected row pale emerald with an explicit checkbox/marker                            |
| Tooltip                 | Dark emerald, light text; keyboard-visible and not clipped by scroll containers                             |
| Dialog/menu             | White, 16px corners, strong but restrained elevation; neutral dark backdrop                                 |
| Empty state             | Small pale emerald icon well, short heading, useful explanation, one relevant action                        |
| Error/outage            | Semantic error or information panel plus retry; do not present as an empty catalogue                        |

Keep currency right-aligned and tabular. Align statuses consistently. Avoid giving every table cell a different colored badge. Show enough of property names and references to identify records; provide a reachable detail/copy action for truncated values.

### Icons, active navigation, and overlays

Use Lucide as the standard UI icon family and the existing brand-specific WhatsApp icon for that channel. Standard sizes: 16px compact inline, 20px controls/navigation, 24px empty-state/support accents; 1.75–2px stroke where applicable. Decorative icons should be hidden from assistive technology.

Public active navigation: pale emerald pill, emerald icon/text, `aria-current`. Dark sidebar active navigation: slightly lighter deep-emerald surface, light text, champagne indicator, `aria-current`; retain a clear boundary/marker so selection isn't conveyed by hue alone. Neutral unread counts can use champagne; warnings still use warning semantics.

Use a consistent neutral overlay such as `rgb(15 25 20 / 52%)`. Avoid champagne-tinted modal backdrops. Preserve modal titles, close controls, focus return, Escape behavior, and scroll containment. Ensure overlay layers sit above sticky navigation and booking bars.

## 7. Public and customer implementation

Paths below are relative to `Rentra/`. The inventory lists every route and its actual component owner, so shared changes can be made once.

| Page/flow and files                                                                                                                                                                             | Concrete implementation                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All public/customer chrome: `components/rentra/SiteChrome.jsx`; `(marketing)/layout.js`; `(customer)/layout.js`                                                                                 | Warm off-white page; light/white header; existing emerald logo geometry; emerald active navigation. Change footer lime headings/CTA to champagne, footer to deep emerald, muted footer text to an opaque on-dark token. Apply inverse focus scope to footer and dark controls. Preserve contact publication behavior and optional WhatsApp visibility.                                                         |
| Home: `app/(marketing)/page.js`; `HeroPhotos.jsx`; `SearchBar.jsx`; `TrustStrip.jsx`; `CityRow.jsx`                                                                                             | Keep the current home structure. Re-tint hero scrim through the brand ramp and inspect bright photos. Keep search white. Use champagne-subtle for the owner invitation near the bottom; retain emerald CTA. Trust information stays quiet and readable. Increase carousel arrow hit areas without enlarging the icons.                                                                                         |
| Occasion exploration: `OccasionPicker.jsx`                                                                                                                                                      | Replace the five arbitrary tint literals with named decorative categories, preferably just neutral, champagne-subtle, and brand-subtle. Preserve category labels and user-triggered selection. Reuse one emerald selection style rather than making each category a separate action color.                                                                                                                     |
| Search/city/category/intent pages: `DiscoveryResults.jsx`; `DiscoveryFilters.jsx`; `SortSelect.jsx`; `app/(marketing)/search/page.js`; `app/(marketing)/[city]/[category]/[[...place]]/page.js` | White filter controls on neutral page; emerald active filters; consistent outline filter/sort buttons; readable result count. Preserve query parameters and reset behavior. Keep 1/2/3/4-column results. Show explicit retry on outage and a useful reset on no matches.                                                                                                                                       |
| Property cards: `ListingCard.jsx`; `PropertyImage.jsx`; `SaveButton.jsx`; `Rating.jsx`; `TrustBadge.jsx`; `PriceBox.jsx`                                                                        | Keep real image colors; use the new neutral placeholder. Fix amber badges. Keep prices dark, action/selection emerald, metadata secondary. A saved heart needs fill/pressed state and an accessible label; it must remain independent of the stretched property link. Avoid recoloring a whole card when saved.                                                                                                |
| Listing detail: `app/(marketing)/listing/[handle]/page.js`; `listing/PhotoGallery.jsx`; `listing/ListingSections.jsx`; `listing/ShareButton.jsx`                                                | White/neutral page structure, quiet separators, clear section headings. Retain gallery geometry and overlays, but ensure controls remain visible against every image. Use semantic warnings for unconfirmed information; important policies and accessibility facts should not be 12px paragraphs. Share/save actions stay secondary.                                                                          |
| Availability and quote: `listing/AvailabilityPicker.jsx`; `DateModeSelect.jsx`; `BookingPriceBox.jsx`; `QuoteSummary.jsx`; `MobileBookingBar.jsx`; `SlotSelector.jsx`                           | Emerald selected date/slot, outline for today, visible unavailable treatment and labels. Pale green multi-date context; warning for scarce/expiring conditions only if supplied by real data. Strong total and one primary booking action. Keep selection, quote refresh, and date editing behavior intact.                                                                                                    |
| Map: `listing/LocationMap.jsx`; `LocationMap.module.css`                                                                                                                                        | White control plates, emerald icons, tokenized neutral loading/error background; 44px expand/zoom targets. Retain ordinary readable map tiles and attribution. Marker uses updated exported SVG. Keep approximate-location and unavailable-map copy.                                                                                                                                                           |
| Saved places: `app/(marketing)/saved/page.js`; `customer/SavedPlaces.jsx`; `SavedPlacesProvider.jsx`                                                                                            | Use the same property card and loading geometry as discovery. “Remove” remains a quiet destructive action; sync failures stay explanatory. Update provider toast/banner colors and contrast alongside the page. Inspect small “retry”/secondary Button sizes on phones.                                                                                                                                        |
| Login and OTP: `app/(app)/login/page.js`; `auth/AuthLayout.jsx`; `auth/OtpDialog.jsx`; `customer/CustomerLoginForm.jsx`                                                                         | White form, warm page, existing photo panel, emerald submit. Champagne may accent the small trust illustration, not fill every input. Normalize dialog radius. Keep six-digit autofill, paste distribution, disabled state, resend feedback, and visible focus.                                                                                                                                                |
| Customer account: `app/(customer)/account/**`; `AccountForms.jsx`; `ProfilePhotoForm.jsx`; `ProfileAvatar.jsx`                                                                                  | Replace local 24px field/button corners with 12px fields and pill public actions; correct 14px mobile fields. Avatar fallback pale emerald with emerald initials. Use clear sections for profile, privacy, notification preferences, phone changes, and payment-method availability. Avoid treating unavailable payment features as active controls.                                                           |
| Checkout: `Checkout.jsx`; `checkout/parts.jsx`; `PaymentVerification.jsx`; `CopyReference.jsx`; checkout route pages                                                                            | Keep payment facts and acceptance text on white. Price breakdown neutral, total strongest, CTA emerald. Correctly distinguish review, payment processing, expired quote, failure, and confirmed state. Preserve test-mode wording, hold timeout, acceptance snapshots, amount formatting, and pending guards. Champagne may highlight one introductory summary label, not obscure fee or deadline information. |
| Booking confirmation: `checkout/ConfirmedView.jsx`                                                                                                                                              | Use success semantics for the result and emerald for subsequent actions. A narrow champagne-subtle welcome panel is optional; it must not imply a live charge or service promise. Keep the one-off check animation, respecting reduced motion. Avoid making all secondary action cards look like primary buttons.                                                                                              |
| Booking list/detail/rebook/cancel: `BookingRecords.jsx`; `BookingHistory.jsx`; `BookingDisplay.jsx`; `VisitLifecycle.jsx`; `CancelVisits.jsx`; booking route pages                              | Unify divided rows, status badges, tabs, date/amount hierarchy, and explicit cancellation action. Preserve “from” versus actual booked price and per-visit cancellation information. A dangerous cancellation confirmation remains red; a cancelled historical record can be neutral.                                                                                                                          |
| Reviews: `ReviewForms.jsx`; `ReviewDetail.jsx`; `ReviewQueue.jsx`; customer review routes                                                                                                       | Numerical rating stays readable beside decorative amber stars. Use emerald submit, neutral published content, and danger/report treatment for moderation actions. Labels and error explanations remain readable on mobile.                                                                                                                                                                                     |
| Support and disputes: `SupportRecords.jsx`; `SupportForms.jsx`; `disputes/Disputes.jsx`; `DisputeForms.jsx`                                                                                     | Consistent thread rows, attachments, field shapes, and status pairs. Messages use white/subtle neutral surfaces; avoid large green or champagne conversation blocks. Preserve customer/partner/admin role differences and genuine action permissions.                                                                                                                                                          |
| Help and policies: `content/ContentBody.jsx`; public help/history/policy pages                                                                                                                  | White/off-white reading area, dark text, emerald underlined links, max 65–75 characters per line, 16px minimum reading text, 1.6 line-height. Champagne can frame a short support intro. Preserve publication version, contact channels, history links, and outage behavior.                                                                                                                                   |
| Failure/not-found: `RouteError.jsx`; `NotFoundBody.jsx`; `customer/BookingError.jsx`; `portal/PortalState.jsx`; all route error/not-found files                                                 | A calm neutral surface, readable issue heading, semantic icon if appropriate, and emerald recovery action. Never style an error as successful confirmation. Keep real retry/back destinations and route-specific explanations.                                                                                                                                                                                 |

### Mobile booking-bar details

`MobileBookingBar.jsx` already accounts for the bottom safe area and toggles the hidden button's tab order. Preserve that. The WhatsApp offset in `globals.css` currently assumes an additional 4.75rem; verify it against the bar's actual height, long prices, and device safe area. Prefer one shared reserved-height custom property if the bar geometry changes. Reserve page-bottom scroll space so the last action/link can be reached above the bar. Do not hide horizontal overflow to disguise a clipped price or CTA.

## 8. Partner, admin, caretaker, and wizard implementation

### Shared workspace shell

`components/portal/PortalShell.jsx`, `NavDrawer.jsx`, `components/partner/PartnerShell.jsx`, and `components/admin/AdminShell.jsx` should share deep emerald chrome, light page content, and one navigation selection pattern. Replace hardcoded `bg-brand-950` shell surfaces with the explicit sidebar role; changing `--sidebar` alone currently will not recolor them.

Use the inverse logo in both expanded and collapsed modes. Use champagne sparingly for an active indicator or neutral count. Menu labels stay 14px; section labels and counts at least 12px. Preserve capability filtering and explanatory locked navigation. The shell's current collapse preference and route labels should continue to work.

Keep 236px expanded desktop sidebar / 64px rail unless testing shows content needs a change. On tablet/phone use the drawer. Enlarge its 36px close control to the 44px product target and test focus visibility on the dark panel. A mobile user must still be able to access admin search if it is essential; the header currently hides its search area below `md`. Provide a deliberate mobile destination/control rather than assuming the desktop search field exists.

### Operational families

| Area and exact visual owners                                                                                                                                                                | Required treatment and improvements                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview and properties: `PartnerListingsView.jsx`, `PropertyTable.jsx`, `PropertyFilters.jsx`, `PortalPrimitives.jsx`, `AdminPrimitives.jsx`, partner/admin root pages                     | White KPI/table surfaces, modest icon accents, 12–14px column labels, consistent gutters. Fix property search naming and placeholder contrast. Use emerald search/add actions. Retain financial counts as real data, not decorative hero metrics.                                                                                                                              |
| Admin clients/customers/applications: `AdminClients.jsx`, `AdminCustomers.jsx`, `ApplicationQueue.jsx`, `DetailLayout.jsx`, application detail route                                        | Same list filters, statuses, metrics, tabs, record identity, and reasoned actions. Raise tiny uppercase labels. Update missing information-border tokens. Preserve capability/read-only states.                                                                                                                                                                                |
| Admin booking history/detail/cases: `AdminBookingHistory.jsx`, `AdminBookingDetail.jsx`, `BookingCases.jsx`, `booking/CasePanels.jsx`, `CaseForms.jsx`                                      | Apply neutral tables and semantic status taxonomy. Make booking, payment, and dispute states separately identifiable. Keep refunds/case commands and confirmation requirements intact.                                                                                                                                                                                         |
| Property decisions and verification: `DecisionPanel.jsx`, `PropertyReviewForm.jsx`, `VerificationPanel.jsx`, `PropertyLifecyclePanel.jsx`, `PropertyCommandForm.jsx`, `AssignmentPanel.jsx` | Emerald approve/save primary action; clear warning request-changes state; red hide/cancel/revoke confirmation. Use shared forms and readable outcome descriptions. Never recolor all decision buttons emerald.                                                                                                                                                                 |
| Identity/document/account operations: `DocumentViewer.jsx`, `AccountLifecyclePanel.jsx`, `CustomerAccountForms.jsx`, `PayoutDestinationAdmin.jsx`                                           | Readable warning panels and 16px phone fields; white document viewer surround; useful preview/download controls. Preserve private document handling. Normalize warning roles and fix muted placeholders; apply the measured amber-pair correction only where that pair is actually used.                                                                                       |
| Payment operations: `PaymentGatewaySettings.jsx`, `PaymentInvestigation.jsx`, `ReconcilePayment.jsx`, `RefundOperations.jsx`, `RefundCommands.jsx`, `finance/Statements.jsx`                | Primary amounts dark and tabular; filters white; environment clearly labeled. Use semantic success/error/pending chips and a strong but restrained danger confirmation. Keep paid, refunded, pending, and unavailable totals distinct; color changes must not change calculations.                                                                                             |
| Admin support/reviews: `AdminSupport.jsx`, `SupportManagement.jsx`, `AdminReviewQueue.jsx`, shared review/thread components                                                                 | Consistent filters, row density, readable timestamps/references, and clear moderation hierarchy. Preserve report and thread data, attachment states, and action permissions.                                                                                                                                                                                                   |
| Audit/privacy/security: `AuditBrowser.jsx`, `PrivacyFulfillment.jsx`, `OperatorSecurity.jsx`                                                                                                | Replace black primary button/local field constants; use shared `AdminPage`/headers where practical. Keep signed exports, enrollment, permissions, warnings, and potentially destructive actions explicit. Monospace references can be compact but must remain selectable/readable.                                                                                             |
| Content publication: `content/ContentEditor.jsx`; `app/(admin)/admin/content/page.js`; `[kind]/page.js`                                                                                     | Use white section cards and a clear working-copy → review → preview → publish sequence. Current raw version/ISO date presentation should gain human-readable labels with exact values available as secondary detail. Emerald save/publish actions need distinct labels and hierarchy; retain unsaved changes, read-only mode, conflict recovery, and publication confirmation. |
| Catalogues: `catalogues/Catalogues.jsx`; catalogue routes                                                                                                                                   | Replace isolated `border-red-300` with semantic danger. Standardize form/row styles and differentiate impact preview from final action. Preserve archival/dependency information.                                                                                                                                                                                              |
| Notifications/operations: `NotificationControls.jsx`, `IncidentControls.jsx`, admin notification and operations pages                                                                       | Shared control borders, semantic alerts, and readable timestamps. Unread may use a small emerald dot plus text/weight; incident severity must not be indicated by champagne alone.                                                                                                                                                                                             |
| Partner onboarding: `OnboardingShell.jsx`, `onboarding-forms.jsx`, `PhoneVerifyForm.jsx`, `KycUploadForm.jsx`, `CompletionStepper.jsx`                                                      | Align field styles, move small amber text to warning roles, use emerald completed markers and warning pending markers. Preserve KYC permissions, upload validation, consent wording, and phone-verification states.                                                                                                                                                            |
| Listing wizard: all `components/partner/listing/*`, setup/new/submitted route pages                                                                                                         | Keep chapter progression and completion signals. Use champagne-subtle only for guidance summaries; white editable sections; emerald current/completed step; muted future step. Update `SectionPrimitives` once, then exceptions in amenities quantities, ownership, terms, photos, and new-listing controls.                                                                   |
| Photo management: `listing/PhotosSection.jsx`                                                                                                                                               | Keep photos accurate; white overlay controls with dark/emerald icons, red delete hover; larger touch areas. Give upload a neutral dashed boundary with explicit focus and error states. Remove `transition-all`/unnecessary scaling. Retain upload progress, ordering, and cover-photo meaning.                                                                                |
| Pricing and policies: `PricingSection.jsx`, `PolicyValues.jsx`, `PolicyPreview.jsx`, `BookingCalendarSettings.jsx`                                                                          | Neutral numeric grids, clear units and totals, tabular figures, emerald save action. Keep version/preview distinctions and explain unavailable states. Allow contained horizontal scrolling where a genuine comparison grid requires it.                                                                                                                                       |
| Portfolio calendar: `PortfolioCalendar.jsx`; partner calendar routes                                                                                                                        | Existing blue/amber/red/purple classes distinguish booking, hold, owner block, and other events. Convert to named event roles rather than turning all entries green. Recommended: booking=info, held=warning, owner block=neutral/dashed, conflict=danger, pricing adjustment=separate labeled category. Add/retain a text legend and detailed disclosure.                     |
| Partner team/settings/payouts: `TeamPanel.jsx`, `SettingsForms.jsx`, `PayoutDestinations.jsx`, `PayoutDestinationForms.jsx`, `UpdateControls.jsx`, updates/settings/team pages              | Shared form typography and status vocabulary. Invitation, pending verification, ready payout, failed destination, and revoked access must remain distinguishable. Use quiet secondary actions for copy/reset/resend; keep one primary action per task.                                                                                                                         |
| Caretaker: `app/(staff)/staff/layout.js`, all four staff page files, `staff/StaffForms.jsx`, shared `VisitEvidence.jsx`, `EvidenceForms.jsx`, `VisitLifecycle.jsx`                          | Use real Rentra logo, warm neutral background, white task panels, 16px inputs, and 48px principal touch controls. Keep visit/evidence status legible outdoors; avoid low-opacity metadata. Add skip link/main target and ensure upload/camera workflows fit narrow phones.                                                                                                     |
| Help and shared states: `portal/OperatorHelp.jsx`, `PortalState.jsx`, `ValidationSummary.jsx`, `RetryButton.jsx`, `Breadcrumbs.jsx`, `CopyChip.jsx`                                         | Same link/action colors and error roles across portals. Retain keyboard focus after errors, useful breadcrumbs, copy feedback, and readable recovery paths.                                                                                                                                                                                                                    |

The API/service/domain/store modules and route download handlers are not visual redesign targets. Their consumers are included in the inventory so a developer can preserve permissions, pricing, availability, and published content behavior while migrating presentation.

## 9. Logo and brand assets

### Does the existing logo fit?

Yes. The existing mark and outlined wordmark already belong to a green identity; emerald/champagne is a compatible evolution. Preserve the artwork, cropped canvas, proportions, and wordmark paths. Do not replace the wordmark with a font-rendered “Rentra,” add a gold gradient, or distort it to fill a fixed-width slot.

Current inline tones in `components/rentra/Logo.jsx:65` are deep `#1F5C41`, leaf `#5C9A72`, and word `#12261C`; the inverse variant uses pale green, a darker leaf, and white. The logo is therefore not currently identical to the button green. This is not inherently wrong, but the new theme should define the difference deliberately.

### Proposed colorways

| Placement             | Deep shape | Leaf shape   | Wordmark       | Background              |
| --------------------- | ---------- | ------------ | -------------- | ----------------------- |
| Primary light lockup  | `#064E3B`  | `#3F8061`    | `#064E3B`      | White or warm off-white |
| On champagne          | `#064E3B`  | `#3F8061`    | `#064E3B`      | `#F8E7C9`               |
| Inverse lockup        | `#F8E7C9`  | `#BBD8C8`    | `#F8F5EE`      | Deep emerald `#032D23`  |
| Monochrome small mark | `#064E3B`  | Same emerald | Not applicable | Warm off-white tile     |

The logo's secondary leaf green is an identity color, not a new button or status token. The preview shows these proposed recolorings with the current vector geometry. Final small-size visual inspection remains necessary; no geometric redraw is recommended.

### Asset checklist

| File                                                  | Action                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `components/rentra/Logo.jsx`                          | Update `TONES`; retain paths/transforms/viewBoxes and accessible SVG names                                 |
| `public/brand/rentra-lockup.svg`                      | Export matching light colorway                                                                             |
| `public/brand/rentra-lockup-inverse.svg`              | Export matching inverse colorway                                                                           |
| `public/brand/rentra-mark.svg`                        | Update mark colorway; it is also used by the map marker                                                    |
| `public/brand/README.md`                              | Update hex values, light/dark placement rules, and synchronized-source instructions                        |
| `app/icon.svg`                                        | Recolor the mark; inspect at 16/24/32px on light and dark browser tabs; use a simple opaque tile if needed |
| `app/apple-icon.js`                                   | Change the current brand-50 tile to warm off-white or champagne; keep it opaque and preserve mark padding  |
| `app/opengraph-image.js`                              | New palette, correct brand SVG, supported marketing wording, retained dimensions and font assets           |
| `app/(marketing)/listing/[handle]/opengraph-image.js` | Update headline/price/CTA literal colors; retain real property photo and quote/price meaning               |
| `app/layout.js:23`                                    | Set `viewport.themeColor` to `#FAF9F6` for the light page shell                                            |
| `components/rentra/listing/LocationMap.jsx`           | Verify the SVG map marker after the shared export changes                                                  |

Inside the application use the inline `RentraLogo`/`RentraMark` components. SVG files and metadata images are separate rendering contexts; CSS variables from the page will not recolor their fixed fill values. A future small asset-generation script or shared literal palette can enforce synchronization, but this document does not claim the present duplicated assets are generated automatically.

### Placement and sizing

- Header lockup: 28–32px high on tablet/desktop; existing 32px mobile mark remains suitable.
- Auth pages: 36–40px lockup; avoid oversized branding pushing the form below the first screen.
- Sidebar: 24–28px inverse lockup; 28–32px inverse mark in collapsed rail.
- Footer: 28–32px inverse lockup; never use the light wordmark on dark emerald.
- Keep aspect ratio (about 3.66:1 for the lockup); size by height and `w-auto`.
- Clear space: at least 25% of logo height; no card edge, badge, or menu control inside it.
- Do not place directly over detailed photography without a quiet solid/controlled backing.
- A logo home link needs a clear accessible name and a visible focus indicator; avoid duplicate spoken branding from nested image labels where appropriate.

## 10. Loading and skeletons

### One visual language, layout-specific shapes

Use neutral green-gray skeletons on white/off-white. Champagne loading blocks look like promoted content; saturated emerald blocks look like active buttons. Neither should dominate a pending screen.

Keep the loaded shell visible during data refresh. Replace only the affected content region, mark it busy, and retain its dimensions. Use one screen-reader status announcement per region; hide decorative bars. Do not render placeholder buttons as real enabled controls or fake textual prices.

| Owner                                          | Change                                                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/globals.css:439`                          | Replace old ink gradient with explicit skeleton tokens; choose one animation mechanism                                                                                                                                                |
| `components/loading/ScreenSkeleton.jsx`        | Centralize placeholder primitive; remove outer `animate-pulse`; correct home/card/booking/portal geometry; share actual route container widths                                                                                        |
| `components/partner/PartnerLoading.jsx`        | Reuse the same primitive/timing; preserve useful dashboard/editor variants while eliminating duplicate visual rules                                                                                                                   |
| `components/admin/AdminLoading.jsx`            | Currently a fixed page-logo loader, not a geometry skeleton. Keep this adapter thin; where a content boundary needs a skeleton, route it to the correct workspace layout instead of stacking a page loader over another pending state |
| `components/navigation/RouteSkeleton.jsx`      | Align its card/table/form shapes and palette with ScreenSkeleton; retire only after checking all imports                                                                                                                              |
| `components/rentra/listing/QuoteLoading.jsx`   | Keep summary height, use neutral bars and a small emerald activity indicator; no large pale-green fake CTA                                                                                                                            |
| `components/ui/rentra-loader.jsx`              | Use a small single-motion spinner for inline actions; keep upright logo loader only where its size is useful; implement inverse treatment intentionally                                                                               |
| `components/navigation/NavigationProgress.jsx` | Emerald thin progress indicator, shared track color, no guessed percentage; ensure duplicate pending hints don't create multiple competing announcements                                                                              |
| All 122 `loading.js` files                     | Verify mapping to real layout, inset behavior, accessible label, and route-specific shape; exact mappings are in the inventory                                                                                                        |

### Geometry targets

| Screen                   | Skeleton must reserve                                                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                     | Full-width hero footprint, search footprint, trust strip overlap, and horizontal city rows; not a two-column text/image hero                                                                                                           |
| Search/city/saved        | Actual filter/title spacing; flat 4:3 photo cards; same 1/2/3/4 breakpoints as loaded content                                                                                                                                          |
| Listing                  | Mobile photo strip/desktop mosaic; title/facts and actual booking column; appropriate narrow-screen quote/bar space                                                                                                                    |
| Checkout                 | Main review/payment content and 360px summary at desktop, stacked order on mobile; no fabricated completed state                                                                                                                       |
| Booking history          | Match current `BookingHistory` cards: 112px image column on phones, 200px from `sm`, matching text/amount rows and gaps. If the loaded list is later deliberately redesigned into divided rows, change its skeleton in the same change |
| Account/support/help     | Actual narrow container and field/thread/reading layout                                                                                                                                                                                |
| Portal overview          | 1480px content max where used; actual KPI count and table/sidebar split                                                                                                                                                                |
| Operational table/detail | Matching header, tabs, column density, and detail sections; consistent 12–16px radii                                                                                                                                                   |
| Wizard                   | Existing step chrome, working form width, and submit-bar clearance                                                                                                                                                                     |

`ScreenSkeleton` currently has a generic `inset` switch. Make the width/container role explicit rather than adding special-case padding in each loading wrapper. For example, a `layout` mapping can distinguish public, reading, customer-record, portal-wide, and wizard. Reuse those layout constants in both loaded and pending owners.

### Suggested animation

The following can replace the current background-position animation after removing the parent pulse. It uses a moving highlight overlay, keeps parent surfaces static, and stops after two passes so a long request does not leave the whole screen moving indefinitely.

```css
.rentra-skeleton {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: var(--skeleton-base);
}

.rentra-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--skeleton-highlight), transparent);
}

@media (prefers-reduced-motion: no-preference) {
  .rentra-skeleton::after {
    animation: rentra-skeleton-sweep 1.8s ease-in-out 2;
  }
}

@keyframes rentra-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}
```

Example accessibility structure for an affected region:

```jsx
<section aria-busy={loading} aria-labelledby="results-heading">
  <h2 id="results-heading">Places for your dates</h2>
  <p role="status" className="sr-only">
    {loading ? 'Loading places…' : 'Places updated.'}
  </p>
  {loading ? <div aria-hidden="true">{/* Geometry-matched blocks */}</div> : children}
</section>
```

Use existing route-status wrappers where appropriate instead of nesting this around another announcing loader. On an error, replace loading with a truthful recovery state; do not keep shimmering indefinitely. During quote refresh, either replace the stale total or explicitly identify it as updating and prevent an action based on the obsolete quote.

### Loader color details

The current `.rentra-loading-*` classes hardcode old logo greens, a white core, and multiple orbit/breathe/scale animations. Replace halo and ring colors with tokens. For a logo loader on deep emerald, use a deliberate pale core with the light mark, or an inverse mark without the white core; choose one coherent treatment. `inverse` must control the actual rendered treatment, not just an unused attribute. A neutral 16–20px spinner is clearer inside a button than a scaled-down detailed logo with several animations.

## 11. Typography, spacing, and responsive behavior

### Typography

Retain Plus Jakarta Sans and the existing local font pipeline. The wordmark remains artwork. Avoid adding a display serif or another sans merely to signal “premium.” Consistent size, weight, and space will produce the refinement.

| Role                  | Customer/public                        | Portal                    | Guidance                                                                     |
| --------------------- | -------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Hero                  | 36–44px, 700–800, line-height 1.1–1.15 | Not applicable            | Current home composition remains the reference                               |
| Page heading          | 28–34px, 700                           | 26–30px, 700              | One clear `h1`; no oversized dashboard hero                                  |
| Section heading       | 22–26px, 600–700                       | 20–24px, 600–700          | 24–32px space before major sections                                          |
| Card/subsection title | 17–20px, 600                           | 16–18px, 600              | Give property/record identity sufficient emphasis                            |
| Body                  | 16px, 400–500, line-height 1.6         | 14px, line-height 1.5–1.6 | Help/policy reading text stays 16px even in dense context                    |
| Form value            | 16px on mobile; 14–16px desktop        | Same mobile rule          | Do not inherit a 14px portal base on phone inputs                            |
| Label/helper          | 14px                                   | 13–14px                   | Avoid tiny body paragraphs                                                   |
| Compact metadata      | 12–13px                                | 12–13px                   | References, short timestamps, badges; accessible full values where truncated |
| Price/KPI             | 22–28px for primary total              | 24–28px                   | Tabular figures, clear currency/unit, fewer competing bold numbers           |

Existing global body/headings already wrap intelligently. Retain that. Apply `min-w-0` to flexible identity text, allow long names to wrap where identity matters, and reserve truncation for secondary content. Keep font weight mostly 400/500/600/700; avoid bolding every label and every amount equally.

### Spacing and shape

Use a 4px spacing base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64. Fine optical adjustments are acceptable; repetitive one-off values should not define the system.

| Relationship          | Target                                      |
| --------------------- | ------------------------------------------- |
| Icon to label         | 8px, or 6px in compact status chips         |
| Label to input        | 8px                                         |
| Input to helper/error | 6–8px                                       |
| Fields in a form      | 20–24px                                     |
| Related row items     | 12–16px                                     |
| Card padding          | 16–20px phone; 24px desktop                 |
| Main content sections | 32–40px phone; 48–56px desktop              |
| Public page gutters   | 16px phone; 24px tablet/desktop             |
| Portal gutters        | 16px phone; 24px tablet; 32px large desktop |
| Reading measure       | 65–75ch inside the page container           |

The home currently uses several `px-6` sections while other public routes use `px-4 sm:px-6`. Harmonize the mobile gutter to 16px unless the existing hero composition requires a deliberate 24px inset. Test horizontal row bleed against the chosen gutter; update negative margins with it.

Radii: 8px small utilities, 12px fields/photos/portal buttons, 16px cards/dialogs, 24px large feature panels, full pill for public CTA/chips/avatar. Keep these explicit roles; do not rely on the assumption that `rounded-2xl` is larger than Rentra's customized `rounded-xl`.

Shadows: one subtle card/floating-control shadow and one stronger dialog/sticky-summary shadow. Prefer neutral shadow hues. Do not combine a colored outline, tinted fill, large shadow, and hover scale on every card.

### Responsive contract

| Width            | Expected behavior                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 320–639px        | One-column forms/results; 16px gutters; phone-first caretaker tasks; no document-wide horizontal scroll; essential actions fit with long text |
| 640–767px        | Two-column property cards where supported; still 16px form values; allow wrapping header actions                                              |
| 768–1023px       | Tablet layouts, two-column content when comfortable; portal drawer remains; booking bar still active under `lg`                               |
| 1024–1279px      | Desktop sidebar appears; listing booking summary can become sticky; three discovery columns                                                   |
| 1280px and above | Four discovery columns; 1280px public max; up to 1480px operational max; reading/forms stay narrower                                          |

Do not force mobile tables into illegible compressed columns. For `PropertyTable.jsx` and admin booking/client/customer/support tables, show a concise stacked summary on phones when practical; otherwise keep a labeled, contained horizontal scroll area with a visible affordance. Preserve headers and row relationships. Finance/comparison grids may reasonably scroll; ordinary text and forms should reflow. See [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

At high zoom, sidebars should yield to the narrow layout and sticky regions should not consume the whole viewport. Test both portrait and landscape tablets and real mobile browser keyboard behavior.

## 12. Accessibility and interaction quality

Color must reinforce a clear interface, not carry meaning by itself. Use text, selected indicators, checkmarks, and programmatic states. Keep underlines in paragraph links, label icon-only actions, and provide explicit outcomes after saving/copying/uploading.

Adopt 44×44px as Rentra's normal touch-control target; 48px for principal booking/caretaker actions. WCAG 2.2 AA's target-size criterion uses 24×24 CSS pixels with specified exceptions, including spacing. A 32px icon control can therefore meet that criterion while still missing Rentra's more comfortable product target. See [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Focus must remain visible on light pages, dark footer/sidebar, photographs, dialogs, and sticky regions. A low-opacity halo is decorative support, not a substitute for a solid contrasting indicator. Audit any `outline-none` together with its computed replacement. Test that sticky headers/bottom bars do not entirely obscure the focused control; ideally keep it fully visible. See [W3C focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

Specific checks during implementation:

- Add the missing property-search label; preserve the SearchBar's actual wrapping labels.
- Keep OTP paste distribution: its `preventDefault` is followed by insertion into fields, so it is not evidence that pasting is blocked.
- Keep visible labels and inline error relationships after extracting shared controls; a placeholder cannot become the label.
- Preserve `aria-current`, `aria-pressed`, checkbox state, table headings, and disabled/pending guards.
- Keep one useful live announcement per async operation. Do not announce a timer every second or each decorative skeleton bar.
- Test dialog Escape/close/focus return and nested dialogs. Do not remove a legitimate focus-management implementation merely to standardize styling.
- Preserve reduced motion for photos, drawers, skeletons, and success illustration. Do not introduce auto-advancing heroes or decorative infinite pulsing across a full page.
- Use real image descriptions for meaningful images; decorative icons and scrims should not add spoken noise.
- Support 200% text resizing and 400% browser zoom/reflow; allow long property names, dates, rupee amounts, contact addresses, and error text.
- Verify Windows forced-colors/high-contrast behavior: selected/focused controls need borders/outlines, not only a box shadow or background fill.

The source review also used the [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) for general interaction, focus, form, and motion checks. Recommendations here are tailored to the actual components; automated candidates were not all treated as confirmed defects.

## 13. Implementation sequence

Implement in reviewable stages. Do not change business behavior, permissions, backend data, or routes as a side effect of styling.

| Stage                  | Files/owners                                                                                                              | Completion evidence                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1. Baseline            | Representative public + authenticated screens, current `DESIGN.md`, source inventory                                      | Capture current desktop/tablet/phone screenshots and the real empty/error/pending states; document available fixture coverage |
| 2. Foundation          | `app/globals.css`, `app/layout.js`, `DESIGN.md`                                                                           | Palette/ramp/runtime aliases agree; contrast measurements match; inverse focus and control borders work                       |
| 3. Primitives          | `ui/button.jsx`, `input.jsx`, `badge.jsx`, `checkbox-card.jsx`, shared field/select/textarea styles, shared status styles | Rest/hover/focus/pressed/disabled/pending/invalid states work; no missing-label regressions                                   |
| 4. Brand/chrome        | Inline SVG, public assets, icons/share cards, SiteChrome, PortalShell/NavDrawer, staff header                             | Logo colorways synchronized; footer/sidebar focus visible; mobile navigation usable                                           |
| 5. Public experience   | Home/search/listing/saved/help/policies/map                                                                               | Photography, CTA hierarchy, selection, responsive columns, and reading layouts reviewed                                       |
| 6. Customer flows      | Auth/account/checkout/bookings/reviews/support/disputes                                                                   | Existing functional gates still pass; totals, disclosures, expiry, errors, and confirmations remain correct                   |
| 7. Workspaces          | Partner/admin/staff/listing-wizard families                                                                               | All table/form/status exceptions migrated; capability and command states preserved                                            |
| 8. Loading and cleanup | Skeleton owners + all loading boundaries, old color exceptions, obsolete aliases                                          | Shapes match loaded content; one animation; no old lime/undefined blue/unapproved color literals remain                       |
| 9. Acceptance          | Relevant tests, browser matrix, accessibility and manual interaction                                                      | Record actual passes/failures and remaining limits; update design documentation without rewriting historical delivery records |

Skeleton work should accompany each screen family, with stage 8 acting as the final cross-route sweep rather than leaving loading states until after release.

### Suggested semantic APIs

- Extend the existing Button CVA rather than creating separate CustomerButton/AdminButton implementations.
- Share field presentation and error/help linkage; allow public versus portal density without separate color systems.
- Share status **style roles**, but keep booking/listing/payment-specific state-to-label maps in their domain components. Do not collapse different business states into one generic enum.
- Share container roles between loaded pages and skeletons.
- Keep explicit inverse-surface context for focus/logo usage; don't infer it from arbitrary class strings.
- Use complete Tailwind class strings in variant maps. Avoid interpolated strings like `bg-${tone}-100`, which may not generate the intended CSS.

### Useful migration searches

Run from the frontend directory. These identify review candidates; not every match is a defect.

```sh
rg -n 'text-lime|bg-lime|lime-soft|forest-deep' app components
rg -n 'border-blue\b|ring-blue/' app components
rg -n 'placeholder:text-ink-400|text-\[0\.(6|7)' app components
rg -n 'transition-all|animate-pulse|rentra-skeleton' app components
rg -n '#[0-9A-Fa-f]{3,8}\b' app components public/brand
rg -n 'bg-ink-900|bg-brand-700|const (input|field|button|primary)' components
rg -n 'border-border|border-ink-300' components
rg -n 'ScreenSkeleton|RouteSkeleton|PartnerLoading|QuoteLoading' app components
```

Keep valid photo scrims, third-party map styles, semantic event colors, and brand-asset literals on an explicit exception list rather than deleting them mechanically.

## 14. Acceptance and handoff

### Browser matrix for the future implementation

| Dimension     | Required coverage                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewports     | 320, 390, 768, 1024, 1440px; one wide portal viewport; portrait/landscape where relevant                                                                            |
| Browsers      | Current Chromium, Firefox, Safari; actual iOS Safari for field zoom/safe areas and Android Chrome for touch                                                         |
| Public routes | Home, search with results/empty/error, city/intent listing, property details, saved, help, current/historical policy                                                |
| Customer      | Login/OTP, account/profile/phone/privacy, checkout review/payment/expired/failure/confirmed, booking list/detail/cancel/rebook, support/reviews/disputes            |
| Partner       | Overview, property list/filter, onboarding/KYC, wizard/submit, property calendar, bookings, payouts/statements, team/settings/updates                               |
| Admin         | Applications, clients/customers, properties/verification, bookings/cases, payments/refunds, content, catalogues, audit/privacy/security, support/reviews/operations |
| Caretaker     | Login/join, assigned work, visit details, evidence/upload and failure states                                                                                        |
| Accessibility | Keyboard traversal, visible focus, screen-reader naming, zoom/reflow, reduced motion, forced colors, error recovery                                                 |
| Data stress   | Long names/IDs, large amounts, missing images, no data, network failure, disabled permissions, slow refresh                                                         |
| Brand assets  | Header/footer/sidebar at real sizes, collapsed rail, favicon, Apple tile, global/property share cards, map marker                                                   |

Automated axe checks should supplement, not replace, manual review of focus, reading order, color meaning, and touch behavior. A public login redirect does not count as testing the authenticated page behind it.

### Developer completion checklist

- [ ] `#064E3B` and `#F8E7C9` have the stated roles; no full-page champagne dashboard or competing primary greens.
- [ ] Global/runtime/brand asset palettes and the revised `DESIGN.md` agree.
- [ ] Primary, outline, ghost, destructive, inverse, and disabled states are consistent.
- [ ] Inputs, selects, textareas, calendar controls, and compound search controls have readable labels and clear focus.
- [ ] Small text and meaningful control boundaries pass contrast on their actual backgrounds.
- [ ] Footer/sidebar use inverse logo/focus treatment; staff uses the real logo.
- [ ] Status text and selection semantics survive palette changes; warnings/errors are not recolored as brand decoration.
- [ ] All page families in the inventory have been checked, including loading, error, not-found, and shared multi-role components.
- [ ] Skeletons match final geometry and widths, preserve shell position, and use one restrained motion pattern.
- [ ] No document-wide overflow, clipped sticky actions, obscured focus, or mobile field zoom introduced by undersized values.
- [ ] Real images, booking fees, test-mode disclosure, verification wording, publication history, and permissions remain accurate.
- [ ] Relevant lint/tests/build and route-specific functional gates pass, with actual results recorded.

For implementation, use the repository's `npm run lint`, `npm test`, `npm run build`, and formatting checks, plus the relevant existing verification scripts. Select the gates that exercise changed flows; a color-only primitive change does not justify changing backend fixtures or applying database migrations.

**Verification of this documentation deliverable:** the complete source inventory was generated and JavaScript/JSX parsing completed without errors; listed color pairs were calculated from their hex values. The specification is a design handoff, not evidence that application migrations or authenticated browser acceptance have already passed. The separate specimen checks are recorded below.

### Documentation and specimen checks — 29 September 2026

| Check                            | Result                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source inventory completeness    | All 544 scanned source files are present; 555 distinct local inventory link targets resolve                                                               |
| Source citations                 | 57 explicit file/line references resolve to existing files and in-range lines; findings were checked against the named source patterns                    |
| Documentation formatting         | All three deliverables pass Prettier with the repository configuration and an explicit empty ignore file, because the repository normally excludes `docs` |
| Specimen viewports               | Chromium at 320, 390, 768, 1024, and 1440px: no document-wide horizontal overflow; all referenced images load                                             |
| Specimen automated accessibility | No axe violations in the selected WCAG 2 A/AA, 2.1 AA, and 2.2 AA rule sets at those five widths                                                          |
| Specimen motion                  | Under reduced motion, skeleton overlay animation computes to `none`                                                                                       |
| Specimen interactions            | Demonstration action updates its status message; navigation-style selection updates `aria-pressed`                                                        |
| Visual inspection                | Desktop/mobile specimen screenshots and the current/proposed logo colorways inspected                                                                     |

These browser checks apply **only to the documentation HTML specimen**, with HTTP(S) requests blocked. They are not application-route tests, real-device Safari/Android testing, a human screen-reader audit, or confirmation that every future color combination is accessible. At the documentation stage, application source files and brand assets remained unchanged. Subsequent implementation and application checks are recorded separately in the linked implementation handoff.
