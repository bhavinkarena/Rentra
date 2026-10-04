# Policy alignment · 4 October 2026

The new terms, privacy and cancellation version describes existing behavior. Booking, payment, refund and privacy fulfillment rules are unchanged. Historical versions remain addressable; accepted booking snapshots retain their original rules. The help/contact baseline remains unchanged.

| Revised wording | Backend evidence |
| --- | --- |
| Farmhouse multi-visit and hourly venue bookings | `src/services/booking/quotes.js`, `src/services/domain/booking-policy.js` |
| 10-minute quote/hold defaults and verified confirmation | `src/services/domain/booking-policy.js`, `src/services/booking/checkout.js` |
| 8% fee, zero brokerage and separate uncollected deposit | `src/services/domain/booking-money.js`, `src/services/booking/quotes.js` |
| Test payments and verified refund outcomes | `src/services/payments/gateway-settings.js`, `src/services/payments/refund-operations.js` |
| Day/hour cancellation bands and saved fee rules | `src/services/domain/pricing.js`, `src/services/domain/cancellation.js` |
| Reviewed encrypted exports, 24-hour expiry and staged closure | `src/services/customer/privacy-fulfillment.js` |
| Owner scope, caretaker revocation and retained evidence | `src/services/customer/owner-privacy.js`, `src/services/customer/privacy-fulfillment.js` |

No unverified business identity, grievance contact, universal legal retention deadline or compliance claim was added. Internal retention targets are not presented as completed deletion guarantees.

## Publication

The API returns an effective database publication when one exists. The new built-in `2026-10-04` version is used only when that policy has no database publication. Repository changes do not overwrite existing database publications.

The adjacent JSON files contain the revised bodies for the admin Content workflow. For an existing database publication, load the respective JSON into `/admin/content/terms`, `/admin/content/privacy` or `/admin/content/cancellation` and use the review/publish workflow. It assigns an immutable publication version and records review evidence. Do not edit published bodies in place.

No database publication, migration, deletion or deployment was performed.
