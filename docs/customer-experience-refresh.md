# Customer experience refresh

## Design decisions

Research references:

- [Airbnb: finding reservation details](https://www.airbnb.com/help/article/2064): make the bookings list the starting point for reservation information.
- [Airbnb: accessing your profile](https://www.airbnb.com/help/article/3811): keep profile and account settings easy to reach from one destination.
- [Expedia Help Center](https://www.expedia.com/helpcenter?CCheck=1): group account help and booking management into recognisable tasks.

These are workflow references, not copies of those products' authenticated screens. Rentra retains its own green palette, typography, and existing property photography.

- Desktop customer and partner login use a photo/form split with different imagery. Mobile uses a shorter image panel above the form.
- OTP verification uses a keyboard-accessible modal with six individual digit inputs, paste/autofill, backspace and arrow navigation, resend, and editable contact information.
- Normal customer login returns home. An existing booking intent returns to the listing, with name setup retained when required. A customer who signs in to browse can complete their name on the account page or before reviewing a new checkout.
- The header uses a round avatar and gives bookings a direct link. Photos fall back to the first name initial, then a person icon. Small-screen icons retain accessible names.
- Account quick links prioritise bookings, saved places, and support; contact and privacy settings sit beside personal details.
- Booking cards show a property photo, visit date, status, and accepted total. The whole card opens the record. Deposits and verified payment amounts remain distinct from the accepted total.
- Detail pages keep downloads, help, reviews, repeat booking, cancellation, and payment recovery available. Confirmed-visit rules for private arrival information remain in the backend.
- New booking snapshots retain listing photos; historical records use the current public photo when a snapshot has none.

## Verification

- Frontend lint, unit tests, and production build passed during implementation.
- Backend unit/integration suite passed; additional profile-photo tests cover rejected file types and sizes, unauthorised sessions, stale profile versions, replacement cleanup, and removal.
- An isolated API fixture was used for real Chrome desktop/mobile interaction checks: guest OTP including wrong-code recovery, homepage redirect, authenticated header, profile/name changes, photo upload/removal, booking list/detail navigation, phone verification, and partner OTP. No real SMS or production upload was made.
- Chrome checks found no horizontal overflow at 375px across account, phone, bookings, and booking details; no hydration warnings in the final fixture run.
- Automated axe WCAG 2 A/AA and 2.1 AA checks reported zero violations on both login pages, account, phone change, bookings, booking detail, and the OTP dialog. This is automated coverage, not a complete accessibility certification.

## Deployment

Deploy the backend changes and migration before the frontend that uses photo upload.

1. In the backend deployment environment, run `npm run db:migrate`. Migration `0021_customer_profile_photo` adds the nullable `customer_profile.photo_public_id` field.
2. Deploy/restart the backend with the existing Cloudinary cloud name, API key, and API secret configured.
3. Deploy the frontend.
4. Check customer and partner login with the configured delivery providers, upload/remove a real profile photo, and open an actual booking.

The migration journal was validated locally. This task did **not** apply migrations to the configured remote database or deploy either application. Browser photo checks used a fixture; live Cloudinary upload and real OTP delivery still require the deployment smoke check.

Profile photos accept JPG/PNG/WebP up to 2 MB. The server checks file signatures; Cloudinary decodes and re-encodes them as 400px WebP avatars. The server authenticates ownership and checks the profile version before committing the new photo. Photos are public avatar assets, and the UI explains this before upload. Removing or replacing a photo attempts to delete the old Cloudinary asset.

## Booking card reference update

The listing booking card now follows the supplied reference screenshots: prominent price, grouped arrival/departure and guest controls, a guest stepper popover, a calendar overlay, a primary booking action, and a compact itemised total. Rentra green remains the action colour.

The price header uses the server's inclusive quote total when available. Before dates are selected it explicitly labels the base rent as “From”. No reference-site discounts or taxes were added. This also follows the clarity principle in [Airbnb's total-price presentation](https://news.airbnb.com/total-price-display-is-now-standard-globally).

The calendar shows two months on desktop and one on mobile. Day picnic, overnight, full-day, single-date, consecutive-date and separate-date modes are preserved. For multiple visits, the card says “Visit dates” and “Visit schedule” to avoid implying access throughout the intervening dates. Full visit hours and individual prices remain under “View dates & hours”. Existing review, login, checkout, quote expiry, conflict, and payment-enabled decisions still come from the existing booking state and backend.

Browser checks with an isolated API fixture passed for single selection, separate dates across months, consecutive dates, guest changes, checkout continuation, review reset on selection changes, mobile overflow and calendar accessibility. No backend pricing or inventory logic was changed by this booking-card update.

## Listing location map

The listing Location section spans the full content width and uses Leaflet with
OpenStreetMap tiles. The branded marker and permanent callout represent the
shared locality center, never a property's exact coordinates. Zoom buttons and
an accessible expanded-map dialog work on desktop and mobile. Map tiles load
when the section approaches the viewport; scrolling the page does not zoom the
map. Failed tile requests show a retry action.

Deploy the backend and frontend together: the public listing response now adds
`approximateLocation: { latitude, longitude } | null` from `area.centre`. No schema
migration or map API key is required for this change. If an area has no center,
the page shows its name and the booking privacy notice without inventing a map
position. Existing private arrival details still require booking authorization.

The default tile service requires visible attribution and compliance with its
[usage policy](https://operations.osmfoundation.org/policies/tiles/). For another
tile provider, configure `NEXT_PUBLIC_MAP_TILE_URL` and
`NEXT_PUBLIC_MAP_ATTRIBUTION` before building the frontend. Do not use a secret
key in either public variable. Leaflet interaction API:
[official reference](https://leafletjs.com/reference).

Map verification (2026-09-26, completing the interrupted session): the fixture
browser check passed for desktop and 390px mobile, zoom, expanded-map dialog
with Escape and focus return, no horizontal overflow, tile failure with retry,
and zero automated axe WCAG 2 A/AA violations. The live backend already returns
`approximateLocation` and the live listing page renders the new map.

## Checkout and confirmation redesign

`/checkout/review/[quoteId]` ("Confirm your booking") and `/checkout/[orderId]`
("Complete your payment" / "You're all set!") share `components/customer/Checkout.jsx`.
Only presentation changed; hold, payment, verification, polling and recovery
calls are the same.

Research references (patterns, not copies):

- Airbnb confirm-and-pay: two columns, sticky price card, "Your trip" rows with
  Edit, one-line cancellation summary, consent next to the final button, and
  "You won't be charged yet" under the listing button.
- Booking.com: Review → Pay → Confirmed step bar, a shaded "pay now" band, a
  copyable booking number and icon rows on the confirmation, and a sticky
  mobile price-and-button bar.
- MakeMyTrip post-booking redesign: icon-led cards, and a cancellation
  _timeline_ instead of paragraphs.
- Ticketmaster: the hold timer stays visible throughout checkout.
- Baymard: the review page is a summary of known facts with no new fees, the
  main button is the most prominent element, and it says what happens next.
- WCAG 2.2.1 / UK DWP: warn before a time limit ends and explain what to do after.
- India's CCPA dark-pattern guidelines (2023): no false urgency (the timer is
  the real server hold) and no drip pricing (the deposit is shown before payment).

Decisions:

- Review: a stepper, a hold timer pinned in the sticky summary card (header on
  phones), trip facts as icon rows, a visit tile per date, and a price card that
  separates Total, Pay now, Remaining and the refundable deposit. The
  cancellation policy is a refund ladder computed from `CANCELLATION_TIERS` for
  the first visit. House rules get keyword icons. Purpose has quick-pick chips
  and a 0/160 counter. The consent tick-box names the deposit amount.
  The button stays enabled; native validation points at what is missing.
- Payment: one status banner per state (held, failed, pending, time up, expired,
  cancelled, updated, needs resolution) with a single obvious next action. The
  Pay button says the amount and that it opens Razorpay. Each button shows its
  own progress rather than every button spinning at once.
- Confirmation: a self-drawing tick, the test-mode badge, a copyable reference,
  a stay card, four icon quick actions (booking, calendar, arrival details, help),
  "What happens next", payment summary and the next refund deadline. It no
  longer offers "request a fresh quote" after payment.
- Phones: a compact property row at the top, price after the trip details,
  and a sticky bar (amount, total, time left, action) shown only while the
  in-page action is scrolled away.
- Dates and times come from numeric Intl parts plus fixed English names, so
  the server render and every browser agree (no "Sep"/"Sept" hydration errors).

Fixes found while testing:

- Razorpay button stuck on "Loading secure payment" after Reserve: the review
  page briefly renders the checkout script before navigating, and `next/script`
  then wires only `onLoad` (not `onReady`) on the payment page. The script now
  sets readiness from both callbacks. This race predates the redesign.
- Razorpay `timeout` is set to the seconds left on the hold, so its window
  closes when the dates would be released.
- Customer header overflowed at 381–480px widths; phones now show the logo mark
  and icon-only navigation with accessible names and tooltips.

Backend: the checkout review response adds public `photo`, `area`, `rating` and
`reviewCount` (the same allowlist a browsing guest sees). No migration. The
frontend falls back to a placeholder when these fields are absent, so either
app can be deployed first.

## Listing booking box (height and consent)

Reference feedback: the button belongs after the price calculation, the box
should fit on a laptop screen, the date mode needs a proper dropdown and the
deposit note needs a proper tick-box.

- Order is now price → visit type → dates and guests → breakdown → deposit
  tick-box → "Review booking" → "You won't be charged yet".
- The tick-box replaces the separate "Review booking" click (it records the
  exact quote reviewed; any price, date or guest change clears it). Clicking the
  button without it shows an inline prompt and focuses the box. Guests who must
  log in first are not asked twice.
- Save became a heart icon in the header (Save and Share remain in the title
  block). Date fields show weekday and hours, so a single visit needs no extra
  row. "1 visit selected" is announced by the calendar instead of shown.
- Height with a quote went from 825px to 598px (desktop, 1440px viewport).
- Date mode is a Radix Select listbox with an icon, name and hint per option:
  keyboard arrows, typeahead and Escape work, and Escape does not close the calendar.

Verification (isolated API fixtures, real Chrome):

- 12 checkout states × desktop and 390px mobile rendered with no page errors,
  hydration warnings or horizontal overflow.
- End-to-end: purpose chip → tick → hold → payment page with the Pay button
  ready, status check, copy reference, quick-action links, legacy API response
  and the incomplete-profile state.
- Automated axe WCAG 2 A/AA and 2.1 AA: zero violations on all ten checkout
  states, the profile step and the phone booking sheet.
- Listing box: dropdown by mouse, keyboard and Escape; tick-box gating and reset;
  navigation; phone sheet.
- Frontend: 15 unit tests (5 new for checkout helpers), lint, Prettier and
  production build passed. Backend: 71 tests and lint passed. The new review
  query was run against a throwaway local Postgres with the same columns; it was
  not run against the hosted database.
