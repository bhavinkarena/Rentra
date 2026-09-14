# Part 08 — Search and implemented location routes

Completed 14 September 2026 on top of Parts 04 and 06–07. Listing content/gallery/sharing remain Part 09; the richer listing date picker remains Part 10.

## Behavior and contracts

- `/search` uses URL query parameters for location text, city, area, category, date mode, dates, slot, guests, budget, amenities, cancellation and sort. Native GET forms, removable chips, reset links and pagination preserve reload and Back behavior. Filters reject repeated scalar values, unsupported options, oversized input, impossible/duplicate/past dates, more than ten visits and reversed budgets. Multiple amenities must all match.
- Single and consecutive modes use date inputs; separate mode accepts comma-separated visit-start dates. A consecutive range expands to separate visits, not continuous possession. The richer listing date picker remains Part 10.
- Search checks the entire selection through `previewBookingQuote`, using Part 04 owner schedules, intervals, guest charges, overrides, inventory locks and current policy. It creates no quote, hold or payment rows. Existing expired holds may be released through the shared inventory service.
- All eligible candidates are processed in batches of 100, with at most four concurrent complete-selection checks, before global sorting and 12-card pagination. Selected-date budgets and price sorts compare the total rent plus platform fee for all visits and guests. Deposits are separately disclosed. Undated prices show the lower configured weekday/weekend base rent for the selected slot, with excluded charges identified; missing prices are never presented as zero. Listing links and saved hearts retain all selected dates, slot and guests.
- City/category records must be active; routes validate slugs and city-owned areas. `/[city]/[category]/area/[area]` and `/[city]/[category]/intent/[intent]` avoid collisions. Legacy three-segment paths redirect to the explicit destination while retaining parameters; a legacy collision prefers the intent. Unsupported routes return 404.
- Pool and bonfire intents require their matching active amenity. Shoot and offsite pages describe lawn facilities to explore, with permission/equipment/charges requiring owner confirmation. They do not assert event approval. Day picnic uses the day slot.
- Home search routes location text to `/search` instead of inventing city slugs. Home/footer links use active taxonomy destinations. Home copy no longer promises universal visits/photography or money held until check-in. Landing pages with fewer than three matching live places and parameterized search pages are noindex; the sitemap includes only eligible canonical discovery routes.
- Public search DTOs include public listing summaries and valid selection context, never private addresses, coordinates, owner contact or account records. Paused listings and inactive owners are excluded. Database failures show a retry state, not a successful zero-result page.

## Files

- [Filter and route domain](../lib/domain/discovery.js)
- [Registry, search and landing-page count service](../lib/db/discovery.js)
- [Complete-selection preview](../lib/booking/quotes.js)
- [Search results and filters](../components/rentra/DiscoveryResults.jsx), [date controls](../components/rentra/SearchDates.jsx)
- [Integration verification](../scripts/verify-customer-search.mjs), [browser verification](../scripts/lib/customer-search-browser.mjs)

## Verification

Run `npm run verify:customer-search`. The script creates, migrates and removes its own disposable PostgreSQL database; it does not seed or migrate the configured application database. Set `CUSTOMER_BROWSER_DRIVER` to an installed `playwright-core/index.mjs`, and optionally `CUSTOMER_BROWSER_EXECUTABLE`, to include the browser gate. `CUSTOMER_SEARCH_BROWSER_ONLY=1` skips the database scenario groups when repeating just the browser gate after they have passed. The browser uses port 3197 and the existing isolated `.next/customer-browser` directory; run browser suites sequentially.

Verification passed: five database/domain groups, repeated successfully after bounded parallel checks were added. The separate browser run passed three groups (domain, registry and Chromium). It exercised 390px filters, price sort, pagination, Back, all-date exclusions, guest saved-selection persistence, empty/invalid recovery, legacy intent redirects, explicit area routes, unknown-area HTTP 404, thin-page noindex and 390px/1440px overflow checks. An initial browser failure exposed ambiguous select labels; explicit accessible labels fixed it before the successful rerun. A focused domain/service check rejected an ambiguous area filter without querying.

All disposable databases were removed. Foundation: 28 groups passed. Final lint: clean. Final isolated Webpack build: 44 pages generated. Schema generation: no drift. Diff and document consistency checks passed. The build required network access for existing database-backed static generation. See the [session tracker](rentra-customer-sessions.md) for the handoff.

## Rollout and next part

No schema change or migration is required. Existing migrations through 0014 and their custom SQL remain intact. No configured seed/backfill, SMS, payment or production deployment is part of this work. Customer checkout remains unavailable until Parts 11/12.

Dated search currently checks every candidate with the authoritative listing lock, keeping results/counts and ordering truthful. This favors correctness over throughput; large-catalog performance, public request throttling and broader accessibility audits remain release work in Parts 18/19. Do not optimize by paginating before availability or by introducing separate pricing rules.

Part 09 improves listing content, gallery and canonical sharing. Preserve search/saved selection context when navigating to a listing, while stripping it from canonical share URLs. Part 10 owns the richer multi-date listing picker.
