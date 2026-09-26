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
