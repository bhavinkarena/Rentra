# Part 18 — Public visibility, accessibility and performance

Status: COMPLETE — 21 September 2026. A16 quality checks and A14 public/private serialization checks passed within the documented automated coverage.

## Corrections

- Shared public metadata supplies canonical, Open Graph and Twitter titles/descriptions/URLs for home, discovery, help, policies and listings. Page titles use the inherited brand template once. Unavailable listings explicitly opt out of indexing; renamed listing URLs and legacy discovery aliases redirect permanently.
- Listing JSON-LD escapes `<` and Unicode line separators before script embedding. Description content cannot terminate the script element. Unknown dates no longer produce invented `LimitedAvailability` or cached `InStock` claims. Exact address/coordinates/contact remain omitted; schema stays LodgingBusiness, not conditional VacationRental markup.
- Robots allows crawlers to read route noindex instructions, including search combinations and authenticated surfaces. Authentication remains the private-data boundary. API routes remain disallowed. Sitemap entries remain canonical live listings, sufficiently populated discovery routes and public help/versioned policy pages.
- Public pages now provide a first-focus skip link and focusable main target; customer main targets are focusable too. Focus indicators have a solid contrasting outline in addition to the existing shadow. Account/support/booking paths no longer incorrectly mark Explore as current.
- Corrected secondary/placeholder/private-phone text contrast, active-filter group semantics, login main landmark, long-description wrapping and mobile share-menu positioning. Selected calendar dates now retain their green background while availability loads.
- Listing detail now resolves publication and slug at request time, with request-local React memoization shared by metadata and page rendering. Reading search parameters only in the renamed-URL branch of an ISR page caused a production `DYNAMIC_SERVER_USAGE` error. The production crawl verified permanent redirects, preserved selection and unavailable-listing responses after this correction. This trades full-page ISR for current publication/slug checks; metadata and page rendering share one request-local listing read.
- Listing first paint no longer waits for a 60-day inventory transaction. The live calendar checks availability after hydration; undated links start without a selected visit, while URL selections survive. Search loading reserves responsive filter/card space instead of replacing a one-line message with a whole results page.
- Listing edits invalidate home cards and sitemap data as well as listing detail, including edits to titles, photos and prices.

## Reproducible verification

`CUSTOMER_BROWSER_DRIVER=/path/to/playwright-core/index.mjs npm run verify:customer-quality`

The script creates a disposable database, builds an optimized Next.js production fixture in an isolated directory and runs Chromium at 360px, 390px, 768px and 1280px. It exercises public and authenticated routes, rendered metadata, unavailable/renamed listings, sitemap/robots, script injection/privacy sentinels, image sizing, absence of eager map resources, skip/gallery focus, required-field focus and persisted support submission. axe-core is a development-only dependency; automated WCAG A/AA checks run on the selected rendered routes.

Artifacts are written beneath the OS temporary directory: `rentra-part18-quality.json`, `rentra-part18-browser.log` and `rentra-part18-support.png`. The JSON records route/viewport outcomes, accessibility findings and local performance observations.

## Verified gate

- **34 rendered route/viewport checks passed**, with zero functional assertions, runtime errors or axe WCAG A/AA violations. Includes URL-selected calendar dates during normal loading, public and authenticated pages, canonicals/OG/Twitter/noindex, renamed selection-preserving redirects, unavailable listings, sitemap, JSON-LD injection/private serialization, image dimensions, no eager map loads, overflow, skip/gallery focus, required-field focus, persisted support submission and anonymous-calendar denial.
- **28 foundation groups**, **six public-listing regression groups**, lint and diff checks passed. Schema generation found no changes.
- The final isolated production Webpack build passed, generating **42 static pages**. Listing detail now renders on demand, so the old 54-page prerender count no longer applies. The separate disposable-database production build also passed.
- [Saved machine-readable audit](rentra-customer-part18-audit.json) includes per-route timings and layout-shift attribution. All test databases were removed, including an interrupted harness fixture. No configured seed, payment/SMS provider request, migration or deployment was run.

## Lab findings and corrections

Before the performance corrections, listing fixture LCP was 8.52–19.54s and search cumulative non-input layout shifts reached 0.63. The listing was waiting for a full advisory inventory transaction; search was replacing a short loading paragraph with its full form/results and moving the footer. Removing that blocking inventory read and reserving loading layout space addressed these causes.

Final fixture listing LCP ranged from 1.45–2.12s; search cumulative non-input layout shifts peaked at 0.0000. These are individual observations from this fixture, not a benchmark guarantee or a field percentile. Request-time listing reads still depend on database latency. Keep database and deployment regions aligned, and measure real photography and representative mobile traffic before making production performance claims. Fixture imagery uses a local SVG.

## Performance and coverage boundaries

Report production-build lab observations separately from field targets. This local browser and remote fixture database are not a representative deployed mobile network or a 75th-percentile user population. Field LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 remain unmeasured targets, not passing results. The lab records LCP observations, cumulative non-input layout shifts, DOM timing and resource counts/transfer sizes. It does not measure field INP or certify Core Web Vitals.

Keyboard and programmatic accessible-name/role/error checks are reproducible; they do not constitute a human NVDA/VoiceOver audit or a blanket WCAG conformance claim. Map resources must stay unloaded before a deliberate navigation; private arrival links remain authenticated. No external provider or SMS requests are needed for this gate.

## Database and next step

No schema changes or migration. Preserve custom migrations through 0019. Part 19 remains full Razorpay Test release acceptance and measurement; actual provider smoke verification needs configured Test credentials. Live bank-money readiness remains Parts 20–22.
