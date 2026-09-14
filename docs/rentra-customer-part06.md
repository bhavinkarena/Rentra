# Part 06 - Customer shell, onboarding and account

This part adds customer account pages on top of Part 05's revocable identity and Part 04's authoritative quote service. Saved places remain Part 07; booking history remains Part 13. Payment execution stays disabled until the planned Razorpay Test integration.

## Implemented behavior

- Shared Explore/Saved/Bookings/Account navigation in public and authenticated pages. Customer pages require an active customer session and are noindex. Saved and Bookings have honest availability notices instead of fabricated empty history or saved records.
- First login requires a name through `/onboarding`. Email is optional; marketing consent is separate and initially unchecked. The signed listing selection survives onboarding and the listing fetches a fresh owned quote on return.
- `/account` edits name, optional email, preferred contact language and marketing consent. The interface remains English. Email is not used for authentication or delivery; editing it clears prior verification. Integer profile revisions reject stale edits rather than overwriting another tab's changes.
- `/account/phone` sends a code to the proposed number. The challenge binds its purpose, current user, current session, old number and browser token. A login challenge cannot change a phone; another user's challenge cannot be accepted. Existing customer numbers conflict, while a partner with the same number retains a separate identity. Changes occur only after verification; all old sessions are revoked and the initiating browser receives a new one.
- `/account/privacy` persists access/deletion requests and returns the recorded reference. Duplicate active requests return the same reference. The customer sees only their latest requests. `/admin/privacy` gives active admins the oldest open requests, pagination in batches of 100, and an audited, idempotent Start review action. No button claims to have exported data or deleted an account.
- `/account/payment-methods` explains that saved methods are unavailable and future Test methods belong in hosted checkout. No card or UPI credential form exists.
- Sign out revokes the database session, clears login/selection/phone-change cookies, invalidates app routes and performs a full navigation to discard client account state.

## Data and security boundaries

Migration `0013_customer_account.sql` adds `customer_profile`, `customer_privacy_request` and scoped phone-change challenge fields. Existing login challenges default to the login purpose. Existing customer/partner phone and email uniqueness remains intact. Profile and privacy writes derive the customer from signed session claims and recheck the active user plus live database session under locks. No form accepts an account owner ID.

Phone-change delivery reuses Part 05's server-only adapter and database phone/IP limits. Development/test uses `123456` after requesting a challenge; production cannot use development delivery or its sessions. Provider calls happen outside database transactions. No real SMS is required by the verification fixtures.

Optional email is unverified profile information, not a verified contact destination. Enabling email delivery in a later part requires verification before use. Marketing preferences are persisted and audited without putting names, contact details or codes in audit payloads. Later notification code must honor this consent independently of operational booking messages.

Privacy requests are a real admin queue, not automatic fulfillment. Export and deletion require a separately reviewed process that preserves booking/financial obligations; this part does not delete customer or financial records. Open requests are retained until handled. Retention jobs for OTP/session/rate records remain the Part 05 operational follow-up.

## Verification and rollout

`npm run verify:customer-account` creates a disposable database and checks self-scoped profile reads/writes, version conflicts, consent changes, email verification clearing, privacy deduplication/admin scope, phone challenge isolation/replay/conflicts, session rotation and revocation. Optional Chromium checks cover the 360px onboarding/account flow, persistence on reload, privacy references, error focus, phone change, noindex and logout.

Use `CUSTOMER_BROWSER_DRIVER` for the installed `playwright-core/index.mjs` and `CUSTOMER_BROWSER_EXECUTABLE` for a local Chrome binary when running the browser gate. The driver is a test dependency, not an app dependency. `verify:customer-identity` preserves Part 05's auth gates; its optional browser flow now completes onboarding before returning to the listing. Browser suites must run sequentially because they share `.next/customer-browser`, selected by the helper's `RENTRA_BROWSER_FIXTURE=1`. Set `RENTRA_BUILD_FIXTURE=1` for an isolated `.next/verification-build` production check. Normal development and deployment keep the default output; no existing developer server needs to be stopped for these checks.

The [session handoff](rentra-customer-sessions.md) records the final verification results and configured-database migration state. Apply migration 0013 before running the new login/account readers in a deployment; preserve the earlier custom migration triggers and constraints.

Configured rollout: migration 0013 was applied on 13 September 2026. Read-only post-apply checks verified its hash, both account tables and all four OTP scope columns. Historical 0011/0012 hash differences were confirmed to be LF/CRLF formatting only; no journal history was rewritten. No configured seed, backfill or SMS was run.

Verification recorded on 14 September 2026: all six account database groups passed and their disposable database was removed. The separate 360px account browser flow passed, including onboarding, profile/consent persistence, private-page layout/noindex, privacy requests, wrong-code focus, phone change, session rotation and logout. The identity service suite passed 14 groups and the foundation suite passed 28. The final isolated Webpack build generated 43 pages; lint passed with four existing image-element warnings. Drizzle generation reported no schema changes; its initial sandbox system-user lookup failure was resolved by the permitted rerun. Both desktop/mobile interrupted-login regression groups passed, covering onboarding, retained dates/guests, a fresh customer-owned quote, refresh, cookies and explicit partner/admin switching; their disposable database was removed. These focused checks are not a full screen-reader audit or real-SMS delivery test. The browser fixture retains the existing duplicate breadcrumb-key warning from its identical city/area names.

Next part: Part 07 saved places. Replace the `/saved` availability notice with customer-owned saved records and guest merging; use the existing DAL and avoid adding private account data to cached public pages.
