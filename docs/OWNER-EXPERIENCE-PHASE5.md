# Phase 5: Add Property wizard

Completed locally on 2 October 2026. Scope: LIST-01 to LIST-11 in OWNER-EXPERIENCE-PLAN.md. Nothing was deployed and no live database was changed.

The wizard now has 3 chapters and 11 steps: Type, Location, Space, Amenities, Photos, Title and description, Pricing, Availability, Rules and cancellation, Ownership proof, and Preview and submit. Farmhouses and venues use the same step ids. Old step links (`basics`, `capacity`, `venue`, `hours`, `terms`, `review`) redirect to the new steps.

## What changed

- **Type (LIST-02).** The draft row is created at the Type step with an empty title. Pressing Continue again within 10 minutes reuses the same untitled draft, so no duplicates are created. City, area, title and description are asked once, each in its own step. Migration 0058 lets a draft have no city or area. A CHECK constraint still requires both for every status other than draft.
- **Completion (LIST-02).** Completion is calculated once, on the backend, and sent with the listing. The frontend no longer keeps its own copy, so the two sides cannot drift. Submissions made before this change are graded with the old rules (`workflowVersion` on the snapshot).
- **Autosave and guards (LIST-03).** Drafts autosave 1.5 s after the last change, on blur and when a link is clicked. Typed input is kept in `sessionStorage` and restored after a reload or an expired session. If two tabs edit the same draft, the second tab gets "Load latest". When offline, the save waits and retries when the connection returns. If the session ends during a save, the owner gets a sign-in link that returns to the same step (`next` on login). Pricing, hourly prices and hours on a draft save in one press (`direct`). Live properties still preview first, and the button then reads "Confirm changes". The unsaved-changes guard also covers browser Back and uploads in progress.
- **Location (LIST-04).** An OpenStreetMap tile picker with a pin and a "Use my current location" button. Coordinate entry is still available under a disclosure. Changing the city clears the area and the pin. The server refuses an area that does not belong to the city.
- **Photos (LIST-05).** Real thumbnails. Each photo is compressed in the browser and uploaded on its own signed request directly to Cloudinary, three at a time, with progress and Retry. Other features: tag prompts, drag or arrow-key reorder, Make cover, delete with a confirmation, duplicate detection ("Already added"), and a 15-photo cap. Uploads strip EXIF profiles and delivery URLs add `fl_strip_profile`. A daily job deletes listing-photo assets that no row uses. Removing a photo no longer sends a live property for review.
- **Validation (LIST-06).** Fields are checked on blur against the shared zod schemas. The default messages are replaced with the copy from the plan, and `₹1,500` and `1,500` both parse.
- **Pricing (LIST-07).** One card per slot. An offered slot needs both a weekday and a weekend price of at least ₹500, and "Same on weekends" copies the weekday price. Each price shows "Guest pays … · You earn …" from `POST /partner/listings/:id/price-preview`. There is now one extra-guest charge, set at listing level. Migration 0058 copies the highest historical per-slot charge onto the listing and writes an audit row. Policy history is not shown inside the wizard.
- **Availability (LIST-08).** Slot times, lead time and booking window are set inside the wizard. "Keep my calendar open automatically" is on by default. Saving this step opens dates immediately, and the `auto-open-dates` daily job extends them without reopening dates the owner closed. Venues use the existing weekly hours editor.
- **Rules (LIST-09 part).** Rules and Terms are now one step. The cancellation policy must be confirmed before a draft can be submitted. Check-in and check-out windows are prefilled from the Availability slot times.
- **Ownership (LIST-01).** The document uploads as soon as a file is picked, and Continue is enabled once a valid document exists. The server refuses an electricity bill older than 3 months. A rejected document no longer shows as failed once a valid replacement exists.
- **Preview and submit (LIST-09).** "Preview as a guest" (`/partner/listings/[id]/preview`) renders the real public listing component from `GET /partner/listings/:id/preview-data`, with a sticky banner, booking disabled, and no Save or Share. Submit redirects to `/submitted`, which shows the timeline Submitted → We check it → Walkthrough → Live, plus "Go to Today" and "Add another property". A draft or rejected listing that opens `/submitted` is sent back to setup.
- **Drafts (LIST-10).** "Delete draft" (`DELETE /partner/listings/:id`) works only for a draft that has never been submitted or booked. The Properties list links each draft to its next step, e.g. "Continue setup — step 2 of 11".
- **Mobile (LIST-11).** `interactive-widget=resizes-content`, 44 px targets, stacked pricing cards and no sideways scroll at 360 px.

## Bugs found and fixed during verification

- After typing in a field, the first tap on Continue did nothing. The blur started an autosave, and the autosave disabled the button before the click arrived. Continue now stays enabled. If an autosave is still running, the explicit save waits for it and then submits with the newer version.
- Continue did nothing on the Photos and Ownership steps.
- The guest preview crashed in two places. Structured farmhouse rules reached a component that expected a list, and the guest Save button needs a saved-places session that the owner portal does not have. The structured rules also crashed the public page of any farmhouse listed through the owner editor. `publicHouseRules` now converts them to guest-facing lines.
- "Delete draft" called `api.delete`, which does not exist. It now calls `api.del`.
- Autosave of half-typed input showed "Check the highlighted fields" without highlighting any field. It now shows "Draft not saved yet — finish the fields to save".
- Test fixtures still used the old completion rules. They now confirm cancellation and import the step helpers that still exist.

## Deliberate deviations

- The plan's data fix for one-sided slot prices would copy the non-zero side across. It is replaced by an audit row (`one_sided_price_needs_owner`). R0 already stops guests being quoted on the zero side, and copying would start selling weekdays or weekends at a price the owner never chose.
- Delete uses the browser's native confirm dialog, because no shared ConfirmDialog component exists yet (DS-03).
- The map is a single tile without an SDK, as the plan's ponytail note suggests. It moves in half-tile steps and zooms from 5 to 18.

## Verification

- Backend: 199 tests, 196 passed, 0 failed. 3 are skipped behind their own environment flags (CP29 delivery, portal session revocation). They ran against disposable localhost databases, including `owner-wizard`, `venue-owner-flow` and the new `public-house-rules` test.
- Frontend: 68 tests passed. The production build and whole-repository lint pass.
- Migrations: `db:check` verifies 59 files and journal entries.
- Browser: 14 checks pass at 360 px with zero page errors and zero serious or critical axe findings. A new farmhouse goes from Type to Submitted, and the checks also cover autosave restore, legacy links, the Properties resume link and Delete draft. Evidence: [checks](evidence/owner-phase5/browser-checks.json), [location](evidence/owner-phase5/location-360.png), [photos](evidence/owner-phase5/photos-360.png), [pricing](evidence/owner-phase5/pricing-360.png), [guest preview](evidence/owner-phase5/preview-360.png), [submitted](evidence/owner-phase5/submitted-360.png).

Not verified:
- Real Cloudinary uploads and EXIF stripping (`exiftool` on a delivered URL). The gate stubs Cloudinary.
- HEIC from an iPhone.
- Real 4G with 15 full-size photos.
- The venue wizard in a browser. The backend integration test covers it.
- Widths above 360 px for the new screens.

## Repeatable checks

```powershell
# rentra-backend
$env:PORTAL_TEST_DATABASE_URL='postgres://postgres@localhost:55439/postgres'
npm test
npm run db:check
# Rentra
npm test
npm run build
```

For the browser gate, start `rentra-backend/test/helpers/serve-owner-wizard.mjs` with the loader, `PORTAL_TEST_DATABASE_URL` and `OWNER_WIZARD_FIXTURE` set to an untracked JSON path. It serves a disposable API on 4143 with Cloudinary stubbed. Start the frontend with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=owner-phase5`, `NEXT_PUBLIC_API_URL=http://localhost:4143/api/v1` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=fixture`, using `next dev -p 3143`. Then run:

```powershell
$env:GATE_WEB_ORIGIN='http://localhost:3143'   # localhost, not 127.0.0.1: Next dev blocks other dev origins
$env:GATE_TOKENS='<fixture json>'
$env:PLAYWRIGHT_MODULE='<path to playwright>'
node scripts/portal-gate/owner-wizard.mjs
```

Afterwards, stop both servers, drop the `rentra_test_*` database and delete `.next/customer-browser-owner-phase5`. Do not commit the token file.

## Release

1. Apply migration 0058 before deploying the backend.
2. Deploy the backend.
3. Deploy the frontend.
4. Configure Cloudinary in production. Signed direct upload and owner thumbnails need `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` on the backend. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` on the frontend is only a fallback for photos without a URL.
5. Check that the two new daily jobs (`listing-photo-orphans`, `auto-open-dates`) run on the worker.
