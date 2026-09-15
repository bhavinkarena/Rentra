# Part 09 — Listing detail, gallery and sharing

Completed 15 September 2026 on top of Parts 01, 04, 07 and 08. The unified multi-date picker and accepted quote summary remain Part 10.

## Behavior and contracts

- The listing page remains photo-first, followed by locality, customer reviews, capacity, property facts, description, exact owner-defined visit hours, availability, amenities, rules, approximate location, host evidence and cancellation terms. Missing photos, rules, reviews, hours and amenity answers now use factual empty states.
- Public photos accept root-relative URLs, allowlisted Cloudinary HTTPS URLs and owner-uploaded Cloudinary public IDs. URL credentials, query parameters and fragments are removed before a photo reaches public metadata, JSON-LD, cards, saved places or the gallery. Unconfigured hosts, invalid schemes and unresolved private IDs are omitted. New listing photography uses a public Cloudinary upload path; KYC and ownership documents continue to use authenticated private storage.
- The gallery has labelled open controls, a modal dialog, Escape and arrow navigation, a Tab loop, scroll locking and focus restoration to the opening control. Single-photo galleries omit meaningless previous/next controls.
- Amenities come from the active fixed taxonomy. Selected standard amenities are **Included**, selected `charge` amenities are **Available for an extra cost**, omitted active filter amenities are **Not offered**, and legacy listings without structured selections show common amenities as **Not confirmed**. Values such as dimensions, counts or published charges remain attached to their label.
- The page publishes enabled slot start/end times, next-day departure, capacity and included-guest limits from `booking_config`. It does not invent hours when configuration is missing.
- “Physically Verified” requires both the listing verification timestamp and a completed, passed `physical` verification visit. Other listings say “Listed by owner”; `verified_at` alone no longer makes a physical-visit claim. Only published customer reviews contribute public review content and sub-scores.
- Public location remains area and city only. Exact address, coordinates, verification GPS and owner phone are absent from the public select and returned object.
- Native share, copy link and WhatsApp all use the absolute canonical listing URL. Selection, account and checkout query parameters never enter shared links or image metadata. A cancelled native share is silent; unsupported/failed native sharing falls back to clipboard, and clipboard denial shows a recoverable message.
- Slug-drift redirects preserve only a currently valid dates/slot/guests selection. Breadcrumbs use the implemented city/category/area namespace. Metadata and JSON-LD use normalized absolute images and avoid unsupported brokerage, payment-hold or verification claims.

## Files

- [Listing route and structured data](../app/(marketing)/listing/[handle]/page.js)
- [Open Graph image](../app/(marketing)/listing/[handle]/opengraph-image.js)
- [Public listing query](../lib/db/queries.js)
- [Listing content normalization](../lib/domain/listing-content.js)
- [Canonical sharing rules](../lib/domain/listing-share.js)
- [Gallery](../components/rentra/listing/PhotoGallery.jsx), [content sections](../components/rentra/listing/ListingSections.jsx) and [share control](../components/rentra/listing/ShareButton.jsx)
- [Public/private upload boundary](../lib/uploads/cloudinary.js)
- [Part 09 verification](../scripts/verify-customer-listing.mjs)

## Verification

Run `npm run verify:customer-listing`. It creates, migrates and removes a disposable PostgreSQL database; it does not modify the configured application database. The five groups cover image URL normalization, explicit amenity/hour states, native-share cancellation and clipboard failure, evidence-backed public listing data, unpublished reviews, private-data exclusion, paused listings and gallery keyboard/focus behavior.

Verification passed: **6 scenario groups** after the final share-contract addition, including the disposable database groups; database cleanup succeeded. The affected search and saved regressions passed 5 and 7 groups respectively, with both disposable databases removed. `npm run verify:customer-foundation` passed all 28 groups. Lint and diff checks passed. The isolated Next.js 16 Turbopack production build compiled and generated 44 pages. `npm run db:generate` found no schema changes.

The keyboard gate checks the implemented gallery focus contract directly; broader screen-reader, performance and moderated mobile usability audits remain Parts 18–19. No real SMS, payment or WhatsApp message was sent.

## Rollout and next part

Part 09 adds no database schema change, so no migration is required or applied. Existing migrations through 0014 remain unchanged. Future owner listing photos now require the configured Cloudinary account and are uploaded as public listing assets. Identity and ownership documents remain private authenticated assets.

Part 10 should reuse the existing `BookingQuoteProvider`, server quote endpoint and these published slot schedules to build one single/consecutive/separate-date selection across the calendar, desktop summary and mobile sheet. It must preserve valid selections through login, explain conflicts and changed prices, and must not add checkout persistence before Parts 11–12.
