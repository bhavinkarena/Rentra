# Phase 6: Property management

Completed locally on 2 October 2026. Scope: PROP-01 to PROP-06 and PROP-08 in OWNER-EXPERIENCE-PLAN.md. PROP-07 (launch offer) stays in the backlog, as the plan says. Nothing was deployed and no live database was changed.

## What changed

- **Property hub (§6.1).** Every property page shares one header and one tab bar: Overview, Edit, Calendar, Photos, Reviews and Activity. The header shows the cover photo, the title and the status badge, with Preview, Share (only when the property is live) and Pause bookings. Photos (`/photos`), Reviews (`/reviews`) and Activity (`/activity`) are new routes. The existing overview, editor and calendar routes keep their URLs. The Properties list opens a property on its Overview tab.
- **One status vocabulary (PROP-01).** The badges read Draft, Needs changes (a draft that Rentra sent back), In review, Verification scheduled, Live, Paused by you, Hidden by Rentra and Not approved (`rejected`). `GET /partner/listings/:id` now also returns:
  - `reviewFlags` (each flagged section with its wizard step)
  - `reviewUnchanged`
  - `trustFields`
- **Status card (PROP-01).** A Draft → In review → Verification → Live timeline with the date of each stage. Under it there is one sentence and at most one button, for example "Rentra asked for 2 changes: photos; title and description. [Fix now]" or "Live, no open dates — guests can't book yet. [Open calendar]".
- **Fix links (PROP-02).** Fix links open `/setup/{step}#field-{name}`. The wizard scrolls to that field, focuses it and rings it for 2 seconds. A flagged step shows "Rentra asked you to change this step" at the top. Resubmitting with nothing changed since Rentra's review first asks "Submit without changes?".
- **Review warnings (PROP-03).**
  - Before a save that Rentra must review, a dialog names the exact trust fields from the API and lets the owner cancel.
  - On a property that is in review, any save warns that the property will need submitting again.
  - The Edit tab lists what the owner can change at any time and what Rentra reviews.
  - Adding photos to a live property warns first. Removing a photo always asks, and never triggers a review.
  - A trust edit during verification now reports the restarted review. The database trigger already restarted it.
- **Properties list (PROP-04).**
  - Cards show the cover photo, area, status, the next visit or the reason the property is blocked, the strength score and one action: Continue setup — step N of 11, Fix, Open calendar or View.
  - Filters are one segmented control with counts: All · Live · Needs you · In review · Drafts · Paused. A Farmhouses/Venues chip appears when the owner lists both.
  - "Live, not bookable" now reads "Live, no open dates".
  - An owner with no properties sees an empty state that invites them to add one.
  - Paging keeps the vertical filter (BUG-34).
- **Pause and resume (PROP-05).** Pausing asks first and shows the number of upcoming bookings. It runs until the owner resumes, or until a chosen date up to a year ahead. The `resume-paused` worker job resumes the property on that date and records a system audit row. Paused properties show a banner with a Resume button. Migration 0059 adds `rentable.paused_until`; the pause date never counts as a content edit, and the database clears it whenever the property leaves `paused`.
- **Property strength (PROP-06).** A ring and a checklist on Overview for live and paused properties. The checklist covers 10+ photos, a pool, lawn or court photo, a highlight, an assigned caretaker, weekday and weekend prices, 60+ open days and a reply to every review. Each missing item links to where the owner fixes it, and no item promises more bookings. The score is computed on the fly and never stored, using one query (`listing-strength.js`, `strengthFacts`).
- **Overview fixes (PROP-08).** The text summary that showed "Prices: Not set" for venues is replaced by "Preview as a guest". Activity and the price and policy history (now in plain words) moved to the Activity tab.
- **Shared dialog.** `components/ui/confirm-dialog.jsx` is built on the native `<dialog>`. Trust edits, pause, resubmit, photo removal and draft deletion all use it.

## Deliberate deviations

- **No pending revisions (PROP-03).** The plan offered two options for trust edits on a live property. Keeping it visible on its last approved content means serving a pending revision. That needs the public page and quotes to read approved snapshots, which is a large change. I shipped the plan's fallback: warn first. The property still leaves search until Rentra re-approves it, and the dialog says so.
- **Arrival guide.** The arrival-guide strength item is left out, because there is no arrival guide feature to fill in yet. `listing-strength.js` marks this with a `ponytail:` comment.
- **Flags carry steps, not messages.** Admin flags carry the section and its wizard step, but no message per flag. The admin form records one reason for the whole decision, and that reason is what the owner sees.
- **Tabs stay separate routes.** The editor stays at `/partner/listings/[id]`, so existing links and saved URLs keep working.

## Verification

- Backend: 201 tests, 198 passed, 0 failed, 3 skipped behind their own environment flags.
  - New integration test `owner-property-hub`: dated pause and its validation, auto-resume and its audit row, the Needs you and Drafts filters, list cards (cover, bookability, strength), overview timeline, stats and strength, and the review property filter.
  - New unit tests for strength and the verification-restart rule.
- Migrations: `db:check` verifies 60 files and journal entries.
- Frontend: 70 tests pass, including the new `listing-trust` test; the production build and whole-repository lint pass.
- Browser: [9 checks](evidence/owner-phase6/browser-checks.json) at 360 px and 1440 px, with zero page errors and zero serious or critical axe findings. They cover:
  - list filters and cards
  - every hub tab
  - a free edit with no dialog
  - a dated pause with its banner, then resume
  - a trust edit cancelled, then confirmed, into review
  - the in-review warning
  - a sent-back property where Fix now lands on its wizard step
  - resubmitting without changes

  Screenshots: [properties](evidence/owner-phase6/properties-360.png), [overview](evidence/owner-phase6/overview-360.png), [paused](evidence/owner-phase6/paused-360.png), [trust dialog](evidence/owner-phase6/trust-dialog-360.png), [sent back](evidence/owner-phase6/sent-back-360.png).
- The Phase 5 wizard gate was re-run on the same fixture. All 14 checks still pass; Delete draft now confirms in the dialog.

Not verified:
- Cover photos on real Cloudinary assets. The fixture's photos come from a host that the owner thumbnail allow-list refuses.
- The `resume-paused` job on the real worker schedule. The integration test calls it directly.
- The venue hub in a browser.

## Repeatable checks

Backend and frontend commands are the same as in [Phase 5](OWNER-EXPERIENCE-PHASE5.md). For the browser gate:
1. Start `rentra-backend/test/helpers/serve-owner-wizard.mjs` with `OWNER_FIXTURE_HUB=1` (a live property plus a copy that Rentra sent back).
2. Start the frontend as in Phase 5, with `RENTRA_BROWSER_FIXTURE_ID=owner-phase6`.
3. Run `node scripts/portal-gate/owner-property.mjs`.
4. Clean up afterwards: drop the `rentra_test_*` database and delete `.next/customer-browser-owner-phase6`.

## Release

1. Apply migration 0059. It must follow 0058.
2. Deploy the backend.
3. Deploy the frontend.
4. Check that the new `resume-paused` worker job (hourly) is running.
