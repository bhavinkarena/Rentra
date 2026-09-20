# Part 13 — Booking records and owner/admin visibility

Status: COMPLETE — 20 September 2026.

## Delivered behavior

- `/bookings` replaces the recent-checkout placeholder with 20-order pages, literal text search by accepted property title, order reference or child visit reference, and All/Upcoming/Past/Cancelled tabs. Page numbers and search length are bounded. Mixed orders may appear in multiple tabs because filtering examines individual visits.
- `/bookings/[orderId]` provides a durable record independent of the current listing's publication status or public URL. Accepted title, contact, purpose, price and policy come from stored snapshots. Child references, guests, exact property-timezone intervals, separate deposits and recorded creation/confirmation/cancellation timestamps remain visible. Missing legacy hours or payment evidence is explicitly marked missing.
- Booking and payment badges are separate. Verified capture excludes authorization and failed facts. Test captures, completed refunds and pending refund obligations retain their Test labels; Test actual-bank collection/refunds stay zero. Browser callback state is not used as payment evidence.
- Exact address, coordinates/map link and current host contact are selected only after database authorization and only when the order has a confirmed or later non-cancelled visit. Cancelled and unconfirmed visits do not unlock arrival access. Mixed orders identify which visits qualify. Accepted commercial terms are immutable; host arrival instructions are deliberately current.
- `/bookings/[orderId]/summary` downloads an authenticated text summary with immutable visit/pricing facts and provider reference/amounts. It is explicitly not a tax invoice or real-money Test receipt. Portable summaries omit exact address, coordinates and host contact. Every response, including access errors, uses private/no-store and noindex headers; filenames use validated order UUIDs.
- `/partner/bookings` and `/admin/bookings`, their detail pages and summary routes reuse the same reader. Active owners see only their current listings' orders; active admins see operational records. Customer name/phone, purpose and exact confirmed times are visible to authorized operators. The existing application supports owner and admin sign-ins; no new caretaker authentication is introduced.
- Checkout links directly to its booking record. Owner and admin navigation includes Bookings. The admin header wraps on narrow screens.

## Authorization and implementation

`lib/booking/records.js` validates the actor inside each database transaction. Customer access uses the existing account/session lock, checking session ownership, expiry and revocation. Owner and admin IDs come only from authenticated server boundaries and are checked against active database accounts. Ownership scopes are applied in SQL before selecting private details. Paused or hidden listings remain readable by their authorized booking holders; this schema represents withdrawn listings as hidden, not with a separate retired enum.

The reader exposes an explicit DTO. Entire listing snapshots, lifecycle payloads, provider events, credential configuration and internal metadata are never serialized. History search cannot widen the actor's SQL scope. Customer pages reject simultaneous admin identity consistently with the existing customer flow; customer download routes do the same.

No schema change or new migration is needed. Existing migrations through 0015 are preserved. No configured migration, seed/backfill, provider payment, SMS, admin gateway change or deployment is part of this work.

## Verification

Run `npm run verify:customer-records`. It provisions/removes a uniquely named disposable database and exercises pagination, literal search, mixed tabs, original snapshots, privacy, verified Test amounts, revoked sessions and owner/admin authorization. Set `CUSTOMER_BROWSER_DRIVER` to an installed Playwright core entrypoint to include the required UI gate; optionally set `CUSTOMER_BROWSER_EXECUTABLE` to a local Chromium executable.

The browser gate uses a 390px viewport and an America/Los_Angeles browser timezone. It checks search-to-detail navigation, reload, property-timezone rendering, overflow, authenticated summary responses/cache headers, customer and owner isolation, admin access and logged-out rejection. The fixture uses artificial ledger facts in the disposable database; it does not contact Razorpay or certify a payment integration.

Verified gate — 20 September 2026: all **six record groups passed**, including the full 390px Chromium group, and the disposable database was removed. Coverage includes 23-order pagination without duplicates, literal wildcard searches, mixed upcoming/past/cancelled visits, direct navigation/reload, immutable title/contact/purpose, paused/hidden listings, private arrival eligibility, redacted snapshots/events, nonzero Test capture with zero actual bank collection, customer/owner/admin scope, malformed/unowned summaries, revoked customer sessions and inactive operators. Browser summary responses confirmed attachment/no-store headers, cross-account 404 and anonymous 401; the anonymous detail page redirected to login. The mobile screenshot was inspected and the overflow assertion passed.

The **28 foundation groups passed**. Full lint passed with zero errors and four pre-existing image-element warnings; final changed-file lint was clean. The final isolated Webpack build passed and generated **46 pages**. No schema change was introduced, so no migration or schema-generation gate was required. Diff and completion-document consistency checks passed. The manual browser build checklist remains independent of recorded delivery status.

The first fixture run caught an invalid test payment hash. The following run caught a query-composition error: returning a PostgreSQL query fragment directly from an async authorization helper caused it to execute independently. The helper now returns the fragment inside a plain object, and the full database/browser rerun passed. These focused tests do not replace the later full accessibility/performance or genuine Razorpay sandbox release gate.

## Next part

Part 14 implements authorized per-visit cancellation/change handling, conditional release and Test-provider refund execution/reconciliation. Continue using accepted policies, immutable payment allocations and pinned provider configuration. Preserve current booking records and private arrival authorization as children change state; a refund obligation is not a completed refund.
