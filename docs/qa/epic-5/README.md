# Epic 5 local browser verification — 4 November 2026

This directory records real local application checks for Stories 5.1–5.4 (genuine guest reviews). It is not hosted acceptance. Every action ran in Playwright's bundled Chromium 153 on macOS against a disposable local API and `next dev`.

Two action runs were made, each on a fresh fixture:

- **1440:** a desktop mouse context. The portal's compact density applies.
- **390:** a touch phone context (`hasTouch`, `isMobile`).

Each key screen was also sampled for reflow, configured axe WCAG 2.1 A/AA (scoped to `<main>`) and action-button size at 320, 390 and 1440 px. Target sizes are held to 44 px under touch and to the WCAG 2.2 AA 24 px minimum under a fine pointer. This matches the design system: `globals.css` compact density applies only to `pointer: fine`. This is emulation. It does not certify WCAG 2.2 AA, native mobile browsers, screen readers or field performance.

## Results

| Run | Passed | Failed | Browser | Service |
| --- | --- | --- | --- | --- |
| 1440 (mouse) | 115 | 0 | 114 | 1 |
| 390 (touch) | 115 | 0 | 114 | 1 |

The single service observation per run is the SMS body produced by the fake Twilio adapter while the fixture was seeded. It is labelled `source: "service"` in the JSON.

**Resolved finding (390 run).** The first 390 run failed one check: in the touch context at 1440 px, the customer "Mark as read" button was 111×36 px. The shared `Button` `xs`/`sm`/`icon-xs`/`icon-sm` sizes shrank at the `md` breakpoint regardless of pointer type. They now shrink only for `md:pointer-fine:`, so touch screens keep 44 px at every width. The 390 run was repeated after that change on 4 November 2026: 115/115.

No Epic 5 application defect was found. The only application change is the shared `Button` density fix above.

## Journeys exercised (both runs)

### 5.1 Auto-publish

- **Clean 4★ review:** published at once and shown on the public listing. The guest sees a Live badge and "Your review is live — see it on the listing".
- **Failed submit:** with the browser minimum removed, a short body returns a server refusal and keeps the rating and text.
- **Phone number + domain:** the review stays pending. The guest sees the checking message, including after a reload, and the review is not public.
- **Clean 1★ harsh review:** published, with no rating flag.
- **Admin queue:** shows the flagged review as pending with "Auto-flagged: private information, spam".
- **Auto-published filter:** lists only the clean reviews, and the tab is marked `aria-current`.

### 5.2 Arrival exception

The fixture files a stay-issue case through the real 4.1 service and then cancels the visit.

- **Before a decision:** the guest has no arrival form.
- **Admin panel:** shows "Not eligible — no decision". The admin approves `arrival_access` with a reason.
- **Guest case page:** shows "You can review your arrival until …" and the reason.
- **Guest reviews page:** shows "Review your arrival", with the scope note and no sub-scores.
- **Submitted scoped review:** public with the label "Arrival experience only — didn't stay".
- **Admin view of the reviewed visit:** sees "Review is public" and is offered Deny only.
- **Deny:** removes the review from the listing. The guest case then shows "Not eligible for a review" with the reason.

### 5.3 Invitations

- **Invitation state:** delivered by the fake SMS adapter but still `(unread)` in the in-app list.
- **SMS body:** links to `/bookings/<order>/reviews`, with no case detail (service observation).
- **Mark as read:** only the customer's own Mark as read sets Read.
- **After review:** the invitation is hidden once the guest has reviewed.
- **Arrival exception:** the approval created an invitation that is visible at once. The approval ran at about 16:15 IST, inside 09:00–21:00. Outside that window it would be scheduled for 09:00 the next day, which the browser run did not cover.

### 5.4 Reports and moderation

- **Customer report:**
  - Four photos are refused on the client before upload.
  - With 2 photos the report saves. The reporter sees their report with 2 evidence links, marked Open.
  - The review stays public.
- **Owner:**
  - The owner page has no delete, hide, veto or approve control for the guest review. "Delete reply" removes only the owner's own reply.
  - The owner reports with 1 photo and sees the open report with its thumbnail.
- **Admin:**
  - "Open reports" shows 2, and all 3 evidence thumbnails load through the admin proxy.
  - Owner report closed as **Not a violation** with a note: the review stays public.
  - Customer report closed as **Upheld**, using the preview and confirm steps. The decision is Hide; "Manipulation (fake, incentivised or conflicted review)" is offered and `meets_policy` is not. The review leaves the listing.
- **Outcomes seen by reporters:**
  - The customer reporter sees "Upheld · <note>" and "This review is no longer public".
  - The owner sees "Not a violation · <note>".
- **Evidence privacy:** another customer requesting the reporter's evidence through the customer proxy gets 404.
- **Runtime errors:** none on any page.

## Evidence

- `1440/results.json` and `390/results.json` record every assertion with its detail. Each run writes an `incomplete` result first, so a setup failure cannot leave stale green output.
- Screenshots (full page, at the action width) are kept for 8 screens per run: review form, admin queue, admin eligibility panel, arrival form, notifications, report page, owner review detail, admin review detail. Photos are local fixture images and identities are synthetic.

## Reproduce safely

1. Keep a disposable PostgreSQL superuser server on `127.0.0.1:55432`. Superuser is needed because the fixture moves a notification's `scheduled_at` with `session_replication_role=replica`. Never use a configured or hosted database, and never run `db:migrate`.
2. From `rentra-backend`, start the API:

   ```sh
   PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
   DATABASE_URL=postgres://nobody@127.0.0.1:1/never \
   node --import ./loader/register.mjs --env-file=.env test/helpers/serve-epic5.mjs
   ```

   The helper:
   - creates a unique `rentra_test_*` database with every migration applied;
   - injects an in-memory evidence store;
   - blocks all external `fetch`;
   - writes tokens and the database URL to ignored `tmp/epic5qa/fixture.json`;
   - listens on `127.0.0.1:4115`.

   SIGTERM, SIGINT or `stop` on stdin drops the database. Restart it before each run, because both runs mutate state.
3. From `Rentra`, start Next:

   ```sh
   NEXT_PUBLIC_API_URL=http://127.0.0.1:4115/api/v1 RENTRA_BROWSER_FIXTURE=1 \
   RENTRA_BROWSER_FIXTURE_ID=epic5 npx next dev --hostname 127.0.0.1 --port 3115
   ```

4. Run the browser checks, with a fresh API between the two runs:

   ```sh
   EPIC5_ACTION_WIDTH=1440 node scripts/portal-gate/epic5-reviews.mjs
   EPIC5_ACTION_WIDTH=390 node scripts/portal-gate/epic5-reviews.mjs
   ```

   Set `PLAYWRIGHT_MODULE` if `playwright` is not resolvable. The recorded run used an npx cache copy. Set `CHROME` to use a system browser.

## Limits

- **PostGIS:** absent on this machine, so geometry stand-ins were used.
- **Messaging and time:**
  - SMS used a fake Twilio adapter. The real Twilio Test SMS remains an open release gate.
  - Day-7 reminders were not exercised in the browser: they need clock travel. The 5.3 integration tests cover them.
  - The 09:00–21:00 IST approval window was observed only inside the window.
- **Not exercised:**
  - Upload failure (503) and server-side photo limits (4 photos, 3 MB, PDF) were not driven through the browser. Only the client-side 4-photo refusal was.
  - An admin publishing a flagged review was not exercised.
  - Stale-version (409) and close-twice refusals were not exercised. Backend tests cover these.
- **Untested environments:** no actual iOS/Android hardware, human screen reader, native zoom or field performance.
- **Fixture data:** the farm listing shows "Farm size 2 null" because its unit is missing in the shared fixture. This is not product data.
- **Untouched:** Neon, hosted services, push and deploy.
