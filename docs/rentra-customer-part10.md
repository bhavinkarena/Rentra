# Part 10 — Multi-date picker and shared quote state

Status: implementation in progress; final browser and production gates pending.

## Delivered behavior

- The listing provider owns all dates, visit type and guest count, scoped to one listing. Single mode replaces dates on the next click. Consecutive mode uses a first and last date, including every intervening visit. Separate mode toggles dates up to ten.
- Removing any date from a consecutive range keeps the other dates and switches to separate mode. Clear dates leaves the selection empty. Month navigation does not change the selection.
- Calendar, desktop summary and mobile dialog read the same provider. Calendar controls no longer calculate independent local prices. Every visit displays server-defined arrival/departure in India time and its price including platform fees; the shared total and separate deposit come directly from the quote.
- Slot and guest changes preserve dates and request a new quote. Conflicting dates stay visible with recovery instructions. Slow responses for earlier selections cannot replace the current quote.
- Expiry invalidates local review and requests a fresh quote. Changed prices or visit details require another review. Review is local acknowledgement only; no order, hold or payment is created.
- Review booking opens a clear current-capability state and offers guest login. The existing signed selection recovery retains every date, slot and guest through OTP and onboarding, with a fresh customer-owned quote on return. URL selection survives reload; canonical sharing remains parameter-free.
- The mobile summary uses a native modal dialog with Escape, browser focus containment, opener restoration and safe-area padding. Calendar dates support arrow navigation and native keyboard activation.

## Verification

`npm run verify:customer-picker` runs pure selection checks and an isolated PostgreSQL fixture, then requires `CUSTOMER_BROWSER_DRIVER` pointing to an installed Playwright core driver for its browser gate. It creates/removes only its uniquely named test database and starts its own Next server on port 3198.

Gate results will be recorded after final checks finish. No database migration is required: the implementation reuses the existing quote, identity and inventory contracts through migration 0014.

## Next part

Part 11 adds atomic holds and trusted Razorpay Test services. It must revalidate an owned quote and its exact version/hash on the server; the Part 10 review marker is a UI acknowledgement and is never authorization to charge or reserve. Checkout UI remains Part 12.
