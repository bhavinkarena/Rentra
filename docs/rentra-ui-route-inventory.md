# RENTRA UI route inventory

Captured from all 120 `app/**/page.js` files in the existing frontend. This is an implementation map, not a QA coverage report. Route groups in parentheses are omitted from URLs. Brackets indicate dynamic route parameters; `[[...place]]` and `[[...version]]` are optional catch-all segments.

## Architecture and preservation constraints

- **Framework:** Existing Next.js 16.3.4 App Router, React 19.2.8, JavaScript/JSX, Tailwind CSS 4, shadcn styling, Radix primitives, and Lucide icons. Read the installed Next.js guides before changing framework-dependent code.
- **Routing/layouts:** `app/layout.js` loads the local brand face and shared globals. Route-group layouts separate public discovery, customer account, owner workspace, administrator workspace, caretaker workspace, and full-screen listing wizard chrome. Multiple groups can contribute URLs below `/partner`; group names are implementation boundaries, not public path prefixes.
- **Data flow:** Public server-rendered pages read adapters in `lib/api/endpoints.js`; homepage discovery and registry reads use resilient fallback handling and hourly revalidation. `lib/api/client.js` centralizes server/browser transport and API error envelopes. Server actions in `lib/actions/` preserve existing mutation, cookie, revalidation, and field-error behavior. Browser reads use feature services layered onto `lib/services/baseApi.service.js` where implemented. UI work does not add APIs or backend behavior.
- **Authentication:** Sessions belong to the API; server session helpers in `lib/api/session.js` forward/read cookies and enforce role, account status, completion, and capabilities. Customer layouts require customer access; partner/admin shells adapt to their existing session and capability state. Login/onboarding/invitation pages are distinct from protected operational pages. Private surface metadata blocks indexing. Route presence is not authorization.
- **State:** Redux Toolkit stores are created by factories, not a cross-request singleton. RTK Query uses the shared base API and feature services; query envelopes and invalidation tags remain intact. Owner cached reads use the existing optional scoped same-origin proxy and identity disposal/access events. Other interactive forms and providers use local state, context, transitions, and action state. Saved-place state has its own customer-facing provider boundary.
- **Forms:** Existing React action-state/form-status patterns, server actions, Zod schemas, field-error mapping, validation summaries, and unsaved-change guards remain authoritative. Keep names, hidden fields, constraints, quote state, multipart upload limits, disabled states, and pending feedback. Monetary values use existing domain formatters, including minor-unit helpers.
- **Assets:** Preserve delivered SVG logos in `public/brand/`, existing guest/owner login images in `public/images/`, and API-backed property imagery. Plus Jakarta Sans is a checked-in Latin variable font used locally in root and portal font definitions. `next/image` uses the existing image qualities/formats and Cloudinary allowlist. Do not fabricate photography, ratings, badges, claims, or content counts when data is absent.
- **Responsiveness/accessibility:** Public containers use the 1280px cap, responsive gutters and listing grid. Search changes from a two-column mobile form to a horizontal desktop row. Portal navigation becomes a drawer below the large threshold and supports a browser-local collapsed rail. Caretaker pages remain phone-first; listing booking bars reserve the narrow-screen bottom action area. Preserve visible focus, skip links, labels, semantic controls, tabular figures, and reduced-motion behavior.
- **Design modes:** Public home/introductory discovery content supports a Persuade task; search, filtering, listing selection, booking, and account tasks support Operate. Owner, administrator, caretaker, and listing setup surfaces support Operate. Mode belongs to each surface/task, not to the whole product.
- **Scope:** This inventory and design refresh require no new API or backend changes. Existing routes, authorization, data contracts, and business behavior must remain compatible. Validation results belong in the parent task evidence; this document makes no pass/fail claims.

## Route counts

| Route group   |   Pages | Surface                                                                                                    |
| ------------- | ------: | ---------------------------------------------------------------------------------------------------------- |
| `(marketing)` |       8 | Public discovery, listings, saved places, help, and published policies.                                    |
| `(app)`       |       1 | Guest authentication entry.                                                                                |
| `(customer)`  |      20 | Authenticated customer account, bookings, checkout, reviews, support, and disputes.                        |
| `(partner)`   |      32 | Owner login, onboarding, listings, bookings, calendar, team, reviews, support, and financial records.      |
| `(wizard)`    |       4 | Full-screen listing creation/setup and submission flows with their own identity chrome.                    |
| `(staff)`     |       4 | Caretaker login, invitation acceptance, assigned visits, and visit details.                                |
| `(admin)`     |      51 | Administrator login/enrollment, operational queues, record details, finance, privacy, security, and audit. |
| **Total**     | **120** | All page routes below.                                                                                     |

## (marketing)

Public discovery, listings, saved places, help, and published policies.

| Public path pattern               | Source page                                              |
| --------------------------------- | -------------------------------------------------------- |
| `/[city]/[category]/[[...place]]` | `app/(marketing)/[city]/[category]/[[...place]]/page.js` |
| `/help/history/[kind]/[version]`  | `app/(marketing)/help/history/[kind]/[version]/page.js`  |
| `/help`                           | `app/(marketing)/help/page.js`                           |
| `/listing/[handle]`               | `app/(marketing)/listing/[handle]/page.js`               |
| `/`                               | `app/(marketing)/page.js`                                |
| `/policies/[kind]/[[...version]]` | `app/(marketing)/policies/[kind]/[[...version]]/page.js` |
| `/saved`                          | `app/(marketing)/saved/page.js`                          |
| `/search`                         | `app/(marketing)/search/page.js`                         |

## (app)

Guest authentication entry.

| Public path pattern | Source page               |
| ------------------- | ------------------------- |
| `/login`            | `app/(app)/login/page.js` |

## (customer)

Authenticated customer account, bookings, checkout, reviews, support, and disputes.

| Public path pattern           | Source page                                         |
| ----------------------------- | --------------------------------------------------- |
| `/account/notifications`      | `app/(customer)/account/notifications/page.js`      |
| `/account`                    | `app/(customer)/account/page.js`                    |
| `/account/payment-methods`    | `app/(customer)/account/payment-methods/page.js`    |
| `/account/phone`              | `app/(customer)/account/phone/page.js`              |
| `/account/privacy`            | `app/(customer)/account/privacy/page.js`            |
| `/bookings/[orderId]/again`   | `app/(customer)/bookings/[orderId]/again/page.js`   |
| `/bookings/[orderId]/cancel`  | `app/(customer)/bookings/[orderId]/cancel/page.js`  |
| `/bookings/[orderId]`         | `app/(customer)/bookings/[orderId]/page.js`         |
| `/bookings/[orderId]/reviews` | `app/(customer)/bookings/[orderId]/reviews/page.js` |
| `/bookings`                   | `app/(customer)/bookings/page.js`                   |
| `/checkout/[orderId]`         | `app/(customer)/checkout/[orderId]/page.js`         |
| `/checkout/review/[quoteId]`  | `app/(customer)/checkout/review/[quoteId]/page.js`  |
| `/disputes/[id]`              | `app/(customer)/disputes/[id]/page.js`              |
| `/disputes/new`               | `app/(customer)/disputes/new/page.js`               |
| `/disputes`                   | `app/(customer)/disputes/page.js`                   |
| `/onboarding`                 | `app/(customer)/onboarding/page.js`                 |
| `/reviews/[reviewId]/report`  | `app/(customer)/reviews/[reviewId]/report/page.js`  |
| `/support/[id]`               | `app/(customer)/support/[id]/page.js`               |
| `/support/new`                | `app/(customer)/support/new/page.js`                |
| `/support`                    | `app/(customer)/support/page.js`                    |

## (partner)

Owner login, onboarding, listings, bookings, calendar, team, reviews, support, and financial records.

| Public path pattern               | Source page                                            |
| --------------------------------- | ------------------------------------------------------ |
| `/partner/allocations/[id]`       | `app/(partner)/partner/allocations/[id]/page.js`       |
| `/partner/bookings/[orderId]`     | `app/(partner)/partner/bookings/[orderId]/page.js`     |
| `/partner/bookings`               | `app/(partner)/partner/bookings/page.js`               |
| `/partner/calendar`               | `app/(partner)/partner/calendar/page.js`               |
| `/partner/disputes/[id]`          | `app/(partner)/partner/disputes/[id]/page.js`          |
| `/partner/disputes/new`           | `app/(partner)/partner/disputes/new/page.js`           |
| `/partner/disputes`               | `app/(partner)/partner/disputes/page.js`               |
| `/partner/finance`                | `app/(partner)/partner/finance/page.js`                |
| `/partner/help`                   | `app/(partner)/partner/help/page.js`                   |
| `/partner/listings/[id]/calendar` | `app/(partner)/partner/listings/[id]/calendar/page.js` |
| `/partner/listings/[id]/overview` | `app/(partner)/partner/listings/[id]/overview/page.js` |
| `/partner/listings/[id]`          | `app/(partner)/partner/listings/[id]/page.js`          |
| `/partner/listings`               | `app/(partner)/partner/listings/page.js`               |
| `/partner/login`                  | `app/(partner)/partner/login/page.js`                  |
| `/partner/onboarding/consent`     | `app/(partner)/partner/onboarding/consent/page.js`     |
| `/partner/onboarding/details`     | `app/(partner)/partner/onboarding/details/page.js`     |
| `/partner/onboarding/kyc`         | `app/(partner)/partner/onboarding/kyc/page.js`         |
| `/partner/onboarding/payout`      | `app/(partner)/partner/onboarding/payout/page.js`      |
| `/partner/onboarding/phone`       | `app/(partner)/partner/onboarding/phone/page.js`       |
| `/partner`                        | `app/(partner)/partner/page.js`                        |
| `/partner/payouts/[id]`           | `app/(partner)/partner/payouts/[id]/page.js`           |
| `/partner/payouts`                | `app/(partner)/partner/payouts/page.js`                |
| `/partner/reviews/[id]`           | `app/(partner)/partner/reviews/[id]/page.js`           |
| `/partner/reviews`                | `app/(partner)/partner/reviews/page.js`                |
| `/partner/settings`               | `app/(partner)/partner/settings/page.js`               |
| `/partner/settings/payout`        | `app/(partner)/partner/settings/payout/page.js`        |
| `/partner/statements/[id]`        | `app/(partner)/partner/statements/[id]/page.js`        |
| `/partner/support/[id]`           | `app/(partner)/partner/support/[id]/page.js`           |
| `/partner/support/new`            | `app/(partner)/partner/support/new/page.js`            |
| `/partner/support`                | `app/(partner)/partner/support/page.js`                |
| `/partner/team`                   | `app/(partner)/partner/team/page.js`                   |
| `/partner/updates`                | `app/(partner)/partner/updates/page.js`                |

## (wizard)

Full-screen listing creation/setup and submission flows with their own identity chrome.

| Public path pattern                   | Source page                                               |
| ------------------------------------- | --------------------------------------------------------- |
| `/partner/listings/[id]/setup/[step]` | `app/(wizard)/partner/listings/[id]/setup/[step]/page.js` |
| `/partner/listings/[id]/setup`        | `app/(wizard)/partner/listings/[id]/setup/page.js`        |
| `/partner/listings/[id]/submitted`    | `app/(wizard)/partner/listings/[id]/submitted/page.js`    |
| `/partner/listings/new`               | `app/(wizard)/partner/listings/new/page.js`               |

## (staff)

Caretaker login, invitation acceptance, assigned visits, and visit details.

| Public path pattern       | Source page                                  |
| ------------------------- | -------------------------------------------- |
| `/staff/join/[token]`     | `app/(staff)/staff/join/[token]/page.js`     |
| `/staff/login`            | `app/(staff)/staff/login/page.js`            |
| `/staff`                  | `app/(staff)/staff/page.js`                  |
| `/staff/visits/[orderId]` | `app/(staff)/staff/visits/[orderId]/page.js` |

## (admin)

Administrator login/enrollment, operational queues, record details, finance, privacy, security, and audit.

| Public path pattern                  | Source page                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `/admin/applications/[id]`           | `app/(admin)/admin/applications/[id]/page.js`           |
| `/admin/audit/events/[id]`           | `app/(admin)/admin/audit/events/[id]/page.js`           |
| `/admin/audit/exports/[id]`          | `app/(admin)/admin/audit/exports/[id]/page.js`          |
| `/admin/audit/exports`               | `app/(admin)/admin/audit/exports/page.js`               |
| `/admin/audit`                       | `app/(admin)/admin/audit/page.js`                       |
| `/admin/booking-cases/[id]`          | `app/(admin)/admin/booking-cases/[id]/page.js`          |
| `/admin/booking-cases`               | `app/(admin)/admin/booking-cases/page.js`               |
| `/admin/bookings/[orderId]`          | `app/(admin)/admin/bookings/[orderId]/page.js`          |
| `/admin/bookings`                    | `app/(admin)/admin/bookings/page.js`                    |
| `/admin/catalogues/[type]/[id]`      | `app/(admin)/admin/catalogues/[type]/[id]/page.js`      |
| `/admin/catalogues/[type]`           | `app/(admin)/admin/catalogues/[type]/page.js`           |
| `/admin/catalogues`                  | `app/(admin)/admin/catalogues/page.js`                  |
| `/admin/clients/[id]`                | `app/(admin)/admin/clients/[id]/page.js`                |
| `/admin/clients`                     | `app/(admin)/admin/clients/page.js`                     |
| `/admin/content/[kind]`              | `app/(admin)/admin/content/[kind]/page.js`              |
| `/admin/content`                     | `app/(admin)/admin/content/page.js`                     |
| `/admin/customers/[id]`              | `app/(admin)/admin/customers/[id]/page.js`              |
| `/admin/customers`                   | `app/(admin)/admin/customers/page.js`                   |
| `/admin/disputes/[id]`               | `app/(admin)/admin/disputes/[id]/page.js`               |
| `/admin/disputes/new`                | `app/(admin)/admin/disputes/new/page.js`                |
| `/admin/disputes`                    | `app/(admin)/admin/disputes/page.js`                    |
| `/admin/enroll`                      | `app/(admin)/admin/enroll/page.js`                      |
| `/admin/finance/allocations/[id]`    | `app/(admin)/admin/finance/allocations/[id]/page.js`    |
| `/admin/finance/payments/[id]`       | `app/(admin)/admin/finance/payments/[id]/page.js`       |
| `/admin/finance/payments`            | `app/(admin)/admin/finance/payments/page.js`            |
| `/admin/finance/payouts/[id]`        | `app/(admin)/admin/finance/payouts/[id]/page.js`        |
| `/admin/finance/payouts`             | `app/(admin)/admin/finance/payouts/page.js`             |
| `/admin/finance/refunds/[id]`        | `app/(admin)/admin/finance/refunds/[id]/page.js`        |
| `/admin/finance/refunds/new`         | `app/(admin)/admin/finance/refunds/new/page.js`         |
| `/admin/finance/refunds`             | `app/(admin)/admin/finance/refunds/page.js`             |
| `/admin/finance/statements/[id]`     | `app/(admin)/admin/finance/statements/[id]/page.js`     |
| `/admin/finance/statements`          | `app/(admin)/admin/finance/statements/page.js`          |
| `/admin/help`                        | `app/(admin)/admin/help/page.js`                        |
| `/admin/login`                       | `app/(admin)/admin/login/page.js`                       |
| `/admin/notifications/[id]`          | `app/(admin)/admin/notifications/[id]/page.js`          |
| `/admin/notifications`               | `app/(admin)/admin/notifications/page.js`               |
| `/admin/operations/incidents/[code]` | `app/(admin)/admin/operations/incidents/[code]/page.js` |
| `/admin/operations`                  | `app/(admin)/admin/operations/page.js`                  |
| `/admin`                             | `app/(admin)/admin/page.js`                             |
| `/admin/payments`                    | `app/(admin)/admin/payments/page.js`                    |
| `/admin/privacy/[id]`                | `app/(admin)/admin/privacy/[id]/page.js`                |
| `/admin/privacy`                     | `app/(admin)/admin/privacy/page.js`                     |
| `/admin/properties/[id]`             | `app/(admin)/admin/properties/[id]/page.js`             |
| `/admin/properties`                  | `app/(admin)/admin/properties/page.js`                  |
| `/admin/reviews/[id]`                | `app/(admin)/admin/reviews/[id]/page.js`                |
| `/admin/reviews`                     | `app/(admin)/admin/reviews/page.js`                     |
| `/admin/search`                      | `app/(admin)/admin/search/page.js`                      |
| `/admin/security/[id]`               | `app/(admin)/admin/security/[id]/page.js`               |
| `/admin/security`                    | `app/(admin)/admin/security/page.js`                    |
| `/admin/support/[id]`                | `app/(admin)/admin/support/[id]/page.js`                |
| `/admin/support`                     | `app/(admin)/admin/support/page.js`                     |
