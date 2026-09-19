# Part 10 — Multi-date picker and shared quote state

Status: COMPLETE — 19 September 2026.

## Delivered behavior

- The listing provider owns all dates, visit type and guest count, scoped to one listing. Single mode replaces dates on the next click. Consecutive mode uses a first and last date, including every intervening visit. Separate mode toggles dates up to ten.
- Removing any date from a consecutive range keeps the other dates and switches to separate mode. Clear dates leaves the selection empty. Month navigation does not change the selection.
- Calendar, desktop summary and mobile dialog read the same provider. Calendar controls no longer calculate independent local prices. Every visit displays server-defined arrival/departure in India time and its price including platform fees; the shared total and separate deposit come directly from the quote.
- Slot and guest changes preserve dates and request a new quote. Conflicting dates stay visible with recovery instructions. Slow responses for earlier selections cannot replace the current quote.
- Expiry invalidates local review and requests a fresh quote. Changed prices or visit details require another review. Review is local acknowledgement only; no order, hold or payment is created.
- Review booking opens a clear current-capability state and offers guest login. The existing signed selection recovery retains every date, slot and guest through OTP and onboarding, with a fresh customer-owned quote on return. URL selection survives reload; canonical sharing remains parameter-free.
- The mobile summary uses a native modal dialog with explicit Tab/Shift+Tab wrapping, Escape, opener restoration and safe-area padding. Calendar dates support arrow navigation and native keyboard activation. The expanded browser gate exposed focus escaping the native dialog without explicit wrapping; the dialog now wraps its first and last available controls.
- Leaving the open mobile summary for login releases its body scroll lock during unmount; cleanup retains the dialog element rather than reading a ref React has already cleared.

## Verification

`npm run verify:customer-picker` runs pure selection checks and an isolated PostgreSQL fixture, then requires `CUSTOMER_BROWSER_DRIVER` pointing to an installed Playwright core driver for its browser gate. Set `CUSTOMER_BROWSER_EXECUTABLE` to a local Chrome binary if needed. It creates/removes only its uniquely named test database and starts its own Next server on port 3198. Browser suites share `.next/customer-browser` and must run sequentially; set `RENTRA_BUILD_FIXTURE=1` for an isolated production build.

The browser gate uses an America/Los_Angeles browser timezone while asserting India-local visit hours, retained dates/guests after reload, capacity and middle-date conflicts, refreshed prices after expiry, mobile-dialog login/onboarding recovery with a customer-owned quote, Tab/Escape/edit focus behavior, 360px/390px overflow, ten-visit server totals, the eleventh-date limit and clear-date recovery. These are focused checks, not a full accessibility or performance audit.

Verified gate — 19 September 2026: all three expanded picker groups passed, including the full browser flow described above, and the disposable database was removed. The original three-group gate also passed before coverage was expanded. The expanded run exposed the native-dialog Tab escape; after explicit focus wrapping, the final full rerun passed both forward and backward Tab, Escape/opener restoration and Edit dates focus. The 28 foundation groups passed, and the final isolated Webpack build generated 44 pages. Full lint passed with four existing image-element warnings; lint on the final changed component and verification scripts is clean. Diff and completion-document consistency checks passed. No new schema was introduced, so no schema-generation or migration gate was needed.

No database migration is required: the implementation reuses the existing quote, identity and inventory contracts through migration 0014. No configured migration, seed, backfill, SMS, provider payment or deployment was run in Part 10.

## Next part

Part 11 adds atomic holds and trusted Razorpay Test services. It must revalidate an owned quote and its exact version/hash on the server; the Part 10 review marker is a UI acknowledgement and is never authorization to charge or reserve. Checkout UI remains Part 12.
