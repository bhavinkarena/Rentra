# Part 17 — Help, policies and operational support

Status: COMPLETE — 21 September 2026. Part 18 is next.

## Delivered behavior

`/help` provides searchable FAQs for confirmation, disabled payments, multi-date/overnight visits, cancellation, changes, arrival, prices, reviews, privacy and support. Search queries have noindex metadata. Public terms, cancellation and privacy explanations are available at `/policies/{kind}` and their permanent versioned paths `/policies/{kind}/2026-09-20`. Unknown versions return not found. The sitemap contains only the canonical public help/policy URLs, never private support requests.

The cancellation explanation follows the existing `customer-v1` implementation, including exact elapsed-time cutoffs, fee treatment and captured-fund caps. Accepted booking snapshots remain authoritative; publishing these pages does not rewrite historical policies. Preserve published versions and add a new version for a future policy change. These pages document current Test behavior; they do not establish live commercial readiness or claim legal compliance.

Customers create private requests from `/support/new`, booking records, cancellation/change flows or a specific account privacy request. Requests retain their accepted booking title/reference, policy version/tier and timezone without copying private arrival or payment credentials. Privacy links are checked against the authenticated customer. General questions can be submitted without a booking.

Creation saves the request and first message in one transaction before redirecting to its reference. Stable request keys replay an identical submission and reject changed duplicates. Customers and staff reply within the same conversation. States are open, in progress, awaiting customer reply and resolved. Customer replies can reopen or resolve; only staff select in-progress/awaiting-customer. Every change requires a message and the current version. Concurrent stale replies fail instead of overwriting a response. Failed submissions retain the typed content.

`/admin/support` is the paginated, status-filtered staff inbox. `/support` lists only the current customer's requests. Owners cannot read these conversations. Authorization rechecks active staff/customer accounts and customer sessions inside the database transaction. Request identity/context and messages are immutable; staff replies also write audit records without copying message text. Limits are five new requests per customer per rolling day and thirty messages per conversation per rolling hour. Replaying a committed request does not consume a new request slot.

Support resolution never cancels, changes or refunds a booking and never exports/deletes account data. Changes continue through cancellation and a fresh booking after checking current prices and availability. A linked privacy request's current state is shown separately; resolving its conversation cannot mark it fulfilled. The retained-record explanation is explicit about manual review and does not invent a deletion deadline or retention period.

## Support configuration and operation

- The private account inbox is the working support channel. Customers must return there for replies. No external message, email alert, live-chat attendance or response deadline is implied.
- `RENTRA_SUPPORT_EMAIL` and `RENTRA_SUPPORT_HOURS` publish verified contact information and actual staffed hours. Include the timezone in the hours text. Blank values omit the email and explicitly state that hours have not been published.
- The existing `NEXT_PUBLIC_WHATSAPP_NUMBER`, when valid and configured, exposes an external contact link. Clicking it is the customer's action; no WhatsApp send is automated.
- These details were not supplied for this implementation, and local email/hours configuration is absent. Staff should publish their actual values before promising availability. This does not disable persisted requests.
- Staff must check the inbox, filter open requests, read linked booking/privacy context, reply and record the appropriate status. Do not request OTPs, identity documents, access codes or payment credentials. A support resolution is a conversation outcome, not evidence of a financial or privacy operation.

## Migration and verification

Migration `0019_customer_support.sql` adds `support_request` and `support_message`, replay/inbox indexes, immutable-history triggers and customer/admin/context scope guards. It does not backfill requests or modify existing bookings, refunds, reviews or privacy request states. Preserve its custom SQL triggers when regenerating schema changes.

Run `npm run verify:customer-support`. Set `CUSTOMER_BROWSER_DRIVER` to a local Playwright-core module to include the 390px Chromium journey. The script creates and removes a disposable database; it never sends an external message. It tests forced persistence rollback, concurrent replay, ownership and direct scope guards, immutable history, stale staff replies, customer resolution/reopening, unchanged bookings/refunds, independent privacy status, limits and revoked/inactive identities.

Verified gate — 21 September 2026:

- Six support database/content groups plus the focused 390px Chromium group, six account/privacy regression groups and 28 foundation groups passed. The 54-page Webpack build and no-drift schema check passed; lint has no errors and four existing image warnings. Disposable databases were removed. Migration 0019 is applied; its checksum, two tables and four enabled triggers were verified. No support seed, external message, provider payment or deployment was run.
- Mobile verification covered searchable help, canonical versioned policies and unknown-version rejection; request creation with escaped script text, reload, staff reply, customer resolution and reload; linked privacy requests; noindex; and other-customer, owner and anonymous access rejection. The 390px screenshot was inspected and horizontal-overflow checks passed.
- Earlier browser runs exposed test selector and navigation timing assumptions. The completed focused run uses an isolated per-run Next.js cache, accepts streamed duplicate noindex metadata and waits for privacy-link navigation to finish. `CUSTOMER_SUPPORT_BROWSER_ONLY=1` selects this focused gate; the six database/content groups passed separately.
- Configured rollout: 0019 was the only pending migration. `npm run db:migrate` applied it, and read-only post-checks verified no pending migrations, its exact checksum, both tables, all four enabled triggers and zero support requests/messages. No existing customer data was changed or backfilled.

The browser gate does not replace Part 18's broader accessibility and performance audit. External support contact/hours remain unset until actual operational details are supplied.

## Next

Part 18 covers the broader public visibility, accessibility and performance audit. Part 19 remains the full Razorpay Test release acceptance gate; Parts 20–22 remain live bank-money readiness.
