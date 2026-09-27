# Screen-specific loading states

Each page has a colocated loading boundary, so nested detail and form routes do not inherit the parent list skeleton. Shared shells remain outside these fallbacks. No data is fetched by a skeleton.

Skeletons reserve structural space, have a single accessible loading label, hide decorative blocks from assistive technology, and respect reduced motion. Existing partner workspace skeletons are reused where they already match the page.

| Route | Layout |
| --- | --- |
| `admin/applications/[id]` | case-detail |
| `admin/booking-cases/[id]` | case-detail |
| `admin/booking-cases` | table |
| `admin/bookings/[orderId]` | booking-detail |
| `admin/bookings` | bookings |
| `admin/clients/[id]` | profile |
| `admin/clients` | people |
| `admin/customers/[id]` | profile |
| `admin/customers` | people |
| `admin/disputes/[id]` | case-detail |
| `admin/disputes/new` | form |
| `admin/disputes` | table |
| `admin/finance/allocations/[id]` | document |
| `admin/finance/payments/[id]` | document |
| `admin/finance/payments` | payments |
| `admin/finance/payouts/[id]` | document |
| `admin/finance/payouts` | finance |
| `admin/finance/refunds/[id]` | document |
| `admin/finance/refunds/new` | form |
| `admin/finance/refunds` | finance |
| `admin/finance/statements/[id]` | document |
| `admin/finance/statements` | finance |
| `admin/login` | login |
| `admin/notifications` | updates |
| `admin/operations` | table |
| `admin` | dashboard |
| `admin/payments` | payments |
| `admin/privacy` | table |
| `admin/properties/[id]` | detail |
| `admin/properties` | properties |
| `admin/reviews/[id]` | review-detail |
| `admin/reviews` | reviews |
| `admin/search` | table |
| `admin/support/[id]` | thread |
| `admin/support` | support |
| `login` | auth |
| `account/notifications` | updates |
| `account` | account |
| `account/payment-methods` | settings |
| `account/phone` | form |
| `account/privacy` | consent |
| `bookings/[orderId]/again` | form |
| `bookings/[orderId]/cancel` | form |
| `bookings/[orderId]` | booking-detail |
| `bookings/[orderId]/reviews` | review-detail |
| `bookings` | bookings |
| `checkout/[orderId]` | checkout |
| `checkout/review/[quoteId]` | checkout |
| `disputes/[id]` | case-detail |
| `disputes/new` | form |
| `disputes` | table |
| `onboarding` | form |
| `reviews/[reviewId]/report` | form |
| `support/[id]` | thread |
| `support/new` | form |
| `support` | support |
| `[city]/[category]/[[...place]]` | search |
| `help` | help |
| `listing/[handle]` | listing |
| `/` | home |
| `policies/[kind]/[[...version]]` | document |
| `saved` | saved |
| `search` | search |
| `partner/allocations/[id]` | document |
| `partner/bookings/[orderId]` | booking-detail |
| `partner/bookings` | bookings |
| `partner/calendar` | calendar |
| `partner/disputes/[id]` | case-detail |
| `partner/disputes/new` | form |
| `partner/disputes` | table |
| `partner/finance` | finance |
| `partner/listings/[id]/calendar` | calendar |
| `partner/listings/[id]/overview` | detail |
| `partner/listings/[id]` | EditorSkeleton |
| `partner/listings` | PropertiesSkeleton |
| `partner/login` | auth |
| `partner/onboarding/consent` | consent |
| `partner/onboarding/details` | form |
| `partner/onboarding/kyc` | upload |
| `partner/onboarding/payout` | form |
| `partner/onboarding/phone` | login |
| `partner` | DashboardSkeleton |
| `partner/payouts/[id]` | document |
| `partner/payouts` | finance |
| `partner/reviews/[id]` | review-detail |
| `partner/reviews` | reviews |
| `partner/settings` | SettingsSkeleton |
| `partner/settings/payout` | form |
| `partner/statements/[id]` | document |
| `partner/support/[id]` | thread |
| `partner/support/new` | form |
| `partner/support` | support |
| `partner/team` | team |
| `partner/updates` | updates |
| `staff/join/[token]` | login |
| `staff/login` | login |
| `staff` | table |
| `staff/visits/[orderId]` | booking-detail |
| `partner/listings/[id]/setup/[step]` | WizardSkeleton |
| `partner/listings/[id]/setup` | WizardSkeleton |
| `partner/listings/[id]/submitted` | success |
| `partner/listings/new` | WizardSkeleton |

## Verification

- All 102 page routes have colocated loading boundaries.
- Final production build, scoped ESLint and whitespace checks passed.
- 33 new skeleton variants were rendered using the production CSS and checked in headless Chrome at 390 px and 1280 px: no horizontal overflow and one accessible status each. This is a static component check, not 102 authenticated route journeys.
- Checkout/mobile and listing/desktop screenshots were visually inspected.
- Motion uses reduced-motion-aware CSS. Existing partner dashboard, properties, editor, settings and wizard skeletons are reused.
