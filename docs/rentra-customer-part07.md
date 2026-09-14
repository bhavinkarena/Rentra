# Part 07 — Saved places across guest and account journeys

Implemented 14 September 2026 on top of Parts 05–06. Search/filter improvements remain Part 08. The Razorpay Test payment direction and disabled checkout boundary are unchanged.

## Behavior

- Listing and card hearts now use a shared saved state. Guests keep up to 100 saved places in this browser; authenticated customers keep their shortlist in PostgreSQL for other devices. `/saved` is accessible to guests and customers and remains noindex. Account records are fetched after hydration, never embedded into cached public pages.
- Saving does not require available inventory or a price quote. When valid dates, slot and guest count are selected, they are retained with the save. Past, malformed, mismatched-listing or client-priced selections are rejected/dropped as appropriate. Saved links restore all supported dates and guests; the listing requests current quotes and availability. No stored selection reserves inventory or promises a price.
- Removal updates the list/heart optimistically and offers Undo for ten seconds, paused while a mutation is pending. Failed writes restore the prior list and show an alert. A failed undo restores the removed state and keeps the retry available during the undo window. Browser-storage failures are not reported as successful saves.
- Unpublished and deleted listings remain removable unavailable cards. Their title, URL, owner and location details are not returned. An account can undo removal of its previously saved unavailable place. Guest merges retain unavailable entries as generic cards rather than silently losing them.
- Partner/admin sessions do not read or write customer saved accounts. The Saved page offers the existing explicit customer switch. Guest saves merge after customer login, including the existing onboarding journey.

## Storage and ownership

[Migration 0014](../drizzle/0014_customer_saved_places.sql) adds `customer_favourite` and `customer_favourite_merge`. The favourite has a composite customer/listing primary key, validated optional selection, active flag and save timestamp. The listing identifier deliberately has no foreign key so a deleted listing can remain an unavailable card. Both tables belong to the customer user through cascading foreign keys.

Removal leaves an inactive row so undo can restore an unavailable place without accepting an arbitrary new private listing. A merge receipt belongs to `(customer, guest entry ID)`. Replaying a successfully merged guest batch cannot resurrect an account item removed afterward. Receipts and saved rows commit in the same transaction; failed capacity checks roll back both. Existing account selections win when a guest duplicate merges. Queries batch the merge rather than making a database round trip per place.

All account operations use the Part 06 user-then-session lock, rechecking role, active status, expiry and revocation inside the transaction. Actions derive the actor from the signed session and compare an opaque session fingerprint before accepting mutations. A session change clears stale optimistic state instead of applying an old browser action to the new account. The shared access module now identifies session failures with a `CustomerSessionError` subclass while preserving existing `CustomerAccountError` handling.

Only guest input is persisted in browser storage. Account query results remain in memory. A pending guest merge is marked with an opaque account fingerprint before sending; a failed/lost response cannot cause that input to merge into another account. Acknowledged guest entry IDs are removed only after successful merge, preserving newer guest entries from other tabs. Unfinished input claimed by another account is hidden and not merged; signing out clears claimed input, while deliberately starting a new guest save discards an older claimed batch. This is recovery input, not an offline account-list cache.

Navigation, focus, visibility and storage-change events refresh identity and lists. Hidden tabs discard their rendered shortlist; mutation notifications refresh other tabs. The existing full-navigation logout now also broadcasts saved-state cleanup. Failed metadata reads after a successful guest storage write show a temporary-details state while retaining the save.

## Files and contracts

- [Saved domain](../lib/domain/saved-places.js): guest envelope/limits, strict context validation and selection URL helpers.
- [Saved service](../lib/customer/saved.js): private queries, explicit desired-state writes, merge receipts and public-only DTOs.
- [Saved actions](../lib/customer/saved-actions.js): signed actor/session boundary and safe errors.
- [Saved provider](../components/customer/SavedPlacesProvider.jsx): shared hearts, guest persistence, merge recovery, optimistic rollback, undo and session cleanup.
- [Saved page](../app/(marketing)/saved/page.js): public shell with private client-loaded content; replaces the prior authenticated availability notice.

Public DTOs contain only listing ID, public title, area/city, canonical link and validated selection. They contain no exact address, owner contact, access instructions, customer ID, payment facts or stored price promise. Unavailable DTOs contain only the listing ID, selection and generic unavailable state.

## Verification

`npm run verify:customer-saved` provisions a uniquely named disposable database and applies the full migration chain. It checks malformed/oversized guest storage and selections, concurrent merge replay/uniqueness, removal replay and undo, account isolation and second-session persistence, stale/foreign/revoked sessions, unavailable/deleted cards, blocked accounts, invalid writes, and atomic full-list merge failures/retries.

Set `CUSTOMER_BROWSER_DRIVER` to an installed `playwright-core/index.mjs` and optionally `CUSTOMER_BROWSER_EXECUTABLE` to run the Chromium gate in the same fixture. It uses the isolated `.next/customer-browser` output and port 3197. Run browser suites sequentially. Coverage includes 390px guest save/reload and context links, real development OTP login/merge, a second device, failed save and undo responses, unavailable-card removal/undo, logout, account switching, noindex and horizontal overflow. No real SMS or provider payment is executed.

Verification passed: all 8 scenario groups including Chromium, followed by all 7 database/domain groups on the final batch implementation. Both disposable databases were removed. Foundation: 28 groups; lint: clean; isolated `RENTRA_BUILD_FIXTURE=1 npm run build -- --webpack`: 43 pages generated; schema generation: no drift; diff check: clean. Final evidence and migration rollout are recorded in the [session handoff](rentra-customer-sessions.md).

## Rollout and next part

Migration 0014 was applied to the configured database on 14 September 2026. Post-apply checks verified its journal hash, both tables, composite primary keys and customer foreign keys; no migrations remain pending. It adds two tables and user foreign keys without modifying existing booking/payment/account records. Keep the custom SQL in migrations 0008–0013 intact; do not rewrite historical migration hashes. No seed/backfill is needed.

Keep merge receipts and inactive favourites while replay/undo protection is needed. Future reviewed privacy export/deletion handling must include these customer-owned tables. Named wishlists, sharing, full offline account support, selected-date search matching and broader accessibility/performance audits remain outside this part.

Part 08 implements search, filters and real location routes. Reuse the saved hearts and selection contracts, and preserve the public/private data split.
