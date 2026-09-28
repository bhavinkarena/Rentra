# RENTRA UI polish — implementation and verification

This refresh changes the existing frontend. Routes, API contracts, authentication, pricing, booking states, payment calculations and backend implementation remain in place. The [route inventory](rentra-ui-route-inventory.md) covers all 120 page sources; browser verification covers representative routes and states, rather than every role permission and every data variant.

The requested Taste, Design.md, Impeccable, Emil, Vercel, Ponytail and Caveman skill sources were available and read. Local Next.js documentation and project guidance were also read. The Design.md reference library was not installed locally, so its linked Airbnb and Apple references were read remotely. A dedicated Playwright connector was unavailable; the installed Python Playwright CLI/API supplied the actual browser automation. The Impeccable engine limitation is described below.

## UI changes

- **Public discovery:** `app/(marketing)/page.js` now uses a split text/photo hero, an existing listing photo and link, a compact search form, quick visit intents and a quieter trust strip. Mobile search fits within the tested 390 × 844 first viewport. The header and footer use clearer navigation and less decorative framing.
- **Search and saved places:** shared listing cards put title, area and price in a clearer order. The property link and Save control are separate interactive elements. Decorative carousel dots became an actual photo count. Search filters use a two-column mobile layout, and empty results offer recovery.
- **Listing and booking:** responsive galleries accommodate one to five photos without empty image cells. The booking panel has clearer hierarchy and controls; checkout sections use separators instead of repeated rounded cards. Existing price/deposit/due calculations are retained.
- **Authentication and customer pages:** mobile authentication places the form before photography. Customer navigation, saved places, account shortcuts and loading skeletons follow the same type and spacing system.
- **Partner, staff and admin:** shared portal shells have readable labels, solid navigation, larger mobile controls and quieter KPI treatments. Partner wizard controls retain visible focus and use simpler progress presentation. Admin Review queue now starts directly with its page title.
- **Failed photography:** `PropertyImage` renders a labelled “Photo unavailable” state instead of a broken image. Existing image sources are retained.

## Design system changes

[DESIGN.md](../DESIGN.md) is the normative token and component reference. [PRODUCT.md](../PRODUCT.md) records existing product constraints. `.impeccable/design.json` contains structured component samples and motion/layout metadata. The previous HTML design specimen is explicitly marked historical.

The palette retains forest green and pale natural surfaces. Muted text is darker (`ink-400: #66736a`); corner radii are 6/10/14/20 px; the shared maximum page width is 1280 px. Display headings scale from 40 to 60 px, with smaller operational headings and 14 px portal metadata. Default inputs/buttons are 44 px high. Plus Jakarta Sans is served locally from the existing cached font, with its OFL licence included; production builds no longer need a Google Fonts request. No npm dependency was added.

## UX improvements

Search location, slot, guests and sort continue to use the existing URL state. Saving a card does not accidentally open the property. Gallery Escape restores trigger focus. Availability retains its existing dialog behavior. Checkout keeps the selected quote through login and refresh, with an unpaid hold persisted by the disposable test backend. Loading, empty and photo failure states use the shared design language.

## Motion and animation

Button feedback and photo hover use short, explicit transitions (150–200 ms). Wizard entrance movement was removed. Existing skeleton motion is reused. Reduced-motion behavior was exercised in Chromium; no new animation library or scroll-driven effect was added.

## Accessibility and Vercel guideline review

The review used the [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), source inspection and axe WCAG 2 A/AA and 2.1 AA browser checks. Changes include stronger text contrast, 44 px primary controls, restored wizard focus outlines, valid definition-list markup, independent card actions, image failure labels and reduced-motion handling. The checks establish the recorded results for these routes and states; they are not a complete accessibility certification or a screen-reader audit.

## Playwright QA

The reproducible script is [ui-polish.py](../scripts/verification/ui-polish.py). It uses local Python Playwright and the installed axe-core package, without installing dependencies. Screenshots and raw machine-readable results are retained in `.impeccable/review/public` and `.impeccable/review/fixture`.

Public checks use the existing frontend on port 3000. Authenticated checks use a separate frontend on port 3118, a disposable API on port 4118 and an owned local PostgreSQL instance on port 55437. Synthetic sessions and provider fakes are confined to this fixture. No real payment, email, OTP or support delivery was exercised. Test services and private fixture files are removed after verification.

The customer journey evidence is [rentra-ui-journey-qa.json](rentra-ui-journey-qa.json): anonymous address privacy, quoted selection, development OTP login, restored selection, checkout quote, persisted unpaid hold, privacy request, scoped support conversation, completed-booking review moderation and duplicate prevention. It also checks mobile listing/account/support/bookings.

The final browser matrix records **57 route/viewport captures and 126 passing checks**, plus **19/19 passing customer journey checks**. Public home was exercised at 390, 768, 1024, 1440 and 1920 px; other representative routes at 390 and 1440 px. No uncaught browser exceptions, horizontal overflow or serious/critical axe findings were recorded. The checkout captures show the expired-hold recovery state; the separate journey verifies initial quote and unpaid-hold persistence. This does not claim successful real-provider payment.

The final authenticated fixture run recorded zero console errors and zero broken image nodes. An earlier fixture run reported duplicate photo keys because its synthetic seed repeated the same image URL; only the disposable seed was corrected to use distinct local URLs, then its full browser matrix was rerun. There were no axe violations in either final run. All 59 retained PNG files (57 route captures, one mobile viewport crop and one before capture) decoded successfully.

Compare the [before desktop](../.impeccable/review/before/home-desktop.png), [after desktop](../.impeccable/review/public/home-1440.png) and [mobile first viewport](../.impeccable/review/public/home-390-viewport.png). Checkout examples are [desktop](../.impeccable/review/fixture/checkout-payment-1440.png) and [mobile](../.impeccable/review/fixture/checkout-payment-390.png). Raw results are [public](../.impeccable/review/public/evidence.json) and [authenticated fixture](../.impeccable/review/fixture/evidence.json).

Visual inspection covered public desktop/mobile discovery, listing, login, customer account, partner dashboard, wizard, admin dashboard and checkout. Each retained screenshot is decoded and checked for valid dimensions. Browser checks cover horizontal overflow, serious/critical axe findings, runtime exceptions, gallery/date dialogs, search/sort URL state, local saves and reduced motion.

### Build and source checks

- Production `npm run build`: passed on the final source, including 77 generated static pages.
- `npm test`: 36/36 passed.
- ESLint on every changed JS/JSX file, including the new image wrapper: passed.
- Full-repository `npm run lint`: remains failing on existing unrelated issues, including line-ending/Prettier findings and temporary scout files. No broad cleanup was included.

### Independent Impeccable review

The installed Impeccable context engine could not run because the local engine/cache was unavailable and loading required network access. Its craft-floor, audit, critique and documentation instructions were applied manually, with a separate reviewer. No deterministic detector score is claimed.

The reviewer assessed the supplied screenshots and source against the existing RENTRA brief. It requested one material finish change: remove the redundant “Partner verification” kicker above the admin Review queue title. That change was applied and the same mobile/desktop captures were regenerated. Its follow-up verdict was **disposition: ship**, with the listed fix resolved and no remaining issue within that review's scope.

## Issues requiring backend/API or environment work

- The existing public API returned `ROUTE_NOT_FOUND` for `/api/v1/discovery/content/contact`; public help/content routes also produced API errors. Their fallback/error presentation was inspected, but successful live help content could not be verified against that server.
- Build-time sitemap policy reads reported network failures and used existing fallbacks.
- External map tile requests were denied by the execution environment. Map service availability needs verification in the deployment environment.
- The public run recorded 50 console errors associated with denied network resources and the handled help API error. Its broken-image records were empty-alt map tile images on the listing route, rather than property photography. These records are retained rather than presented as a clean console result.
- External photography may fail with network access; the new image failure state handles that presentation without changing data.

No backend fix or contract change was bundled with this UI work. Console messages caused by these API/network conditions are recorded in the browser evidence, separately from uncaught JavaScript errors.

## Remaining recommendations

Verify successful help/contact/policy delivery against the deployed API, real payment/OTP integrations, and signed-in staff workflows with representative permissions. Extend the representative browser matrix to remaining route/data combinations and run assistive-technology testing. Resolve the existing repository-wide lint baseline as a separate maintenance task.
