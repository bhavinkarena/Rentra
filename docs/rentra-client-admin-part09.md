# CP09 — Client property operations hub

Status: **COMPLETE — 26 September 2026.** A disposable-PostgreSQL service test and a 41-check browser/API gate passed. CP09 has **no migration**.

## 1. Scope and revisions

- Linked IDs: CP09; acceptance CA01, CA04–05, CA21–22; gaps G02 (operations hub), G04 (earnings and live/bookable copy) and G28 (outage vs missing, on the new route).
- Baseline: frontend `4dc82c7`, backend `5cddeb5` (CP08 and the migration-status update committed). CP09 changes are uncommitted in both repositories.
- Delivered:
  - **Property overview** at `/partner/listings/[id]/overview`, separate from the editor. It shows status and next step, review corrections, bookability, upcoming visits, a summary of what guests see, setup progress and client-safe activity.
  - **Directory → overview → correction → save → calendar** with the filtered list kept at every step.
  - **Conflict-safe editor saves.** A save against content that changed since the page loaded (another tab, or a Rentra correction) is refused. Nothing is written, the typed values stay, and a reload shows the latest version.
  - **Actionable review corrections:** flagged sections are listed on the overview as links, and each flagged section in the editor is marked with Rentra's reason.
  - **Honest copy:**
    - the invented "₹8,000–₹14,500 a night" earnings range is removed;
    - "Live" no longer says "bookable" — the KPI shows how many live properties are bookable now;
    - the submission banner no longer promises an email or WhatsApp reply.
- Kept: the editor at `/partner/listings/[id]`, the wizard at `/partner/listings/[id]/setup/[step]` (resume URLs unchanged), and the per-property calendar. The overview is added in front of them; nothing is duplicated.

## 2. API and behavior

### Endpoints (`/api/v1`, client session)

| Method and path | Result / errors |
| --- | --- |
| `GET /partner/listings/:id/overview` (new) | `{ inventory, publicPath, upcomingVisits, activity }`, scoped by owner in the query. Another owner's id, a missing id and a malformed id all give 404/400; nothing about the property is returned. |
| `GET /partner/listings/summary` (extended) | Adds `bookable`: live, booking hours confirmed, and at least one future open date. |
| `POST /partner/listings/:id/{basics,location,capacity,amenities,rules,pricing,terms,photos}` and `DELETE …/photos` (changed) | Accept an optional `contentVersion`. When it is sent and the property's `content_version` differs, the response is 409 `LISTING_CHANGED` and nothing is written. Success returns the new `contentVersion`. |

`GET /partner/listings/:id/overview` returns:

- `inventory`: `scheduleReady`, `openDates`, `bookable`, `note` and `nextOpenDate`. It reuses the CP07 publication inventory rule, so the admin and the owner see the same facts.
- `publicPath`: only while the property is live and the owner is active.
- `upcomingVisits`: `total`, plus up to 10 visits (`reference`, order link, date, slot, guests, state, and times when known).
- `activity`: up to 30 entries (`action`, `actor` = you, rentra or system, time, and only client-safe detail).

### Rules

- **Client-safe activity.** Rentra events are whitelisted:
  - A reason is included only where the admin form says it is shown to the client: review decision, hide and correction.
  - Verification outcomes are shown without findings. Scheduling notes, reviewer assignment and operator identities are never returned.
  - Owner events show only the status change.
- **Conflict guard.**
  - Section forms send the version they were rendered from, taking the newer of the page props and the section's own last save.
  - The API checks it under the same row lock as the CP08 status rule. Amenity rows are now written inside that locked transaction, after the check. Pricing checks inside the inventory lock; terms use a conditional update.
  - Callers that send no version (older clients, scripts) keep the previous behaviour.
  - Photo reordering is not version-checked. It adds no content and would give false conflicts on quick repeated moves.
- **Corrections.** "Changes Rentra asked for" appears only while the property is a draft or rejected after a changes-requested or rejected decision. The same condition drives the editor's section notices.
- **Navigation.**
  - Directory and dashboard rows open the overview, carrying `from`.
  - The overview links to the editor (including section anchors), the calendar, the setup wizard (while setup is unfinished), the public page (while live) and each booking.
  - The editor and calendar breadcrumbs go Properties (filtered list) → property overview.
- **Recovery.**
  - If the property itself cannot load, the page shows the shared unavailable state with a retry.
  - If only the overview data fails, the page still renders the property and shows an inline "could not load … Try again".
  - A missing or foreign property shows "Record not found", never an outage.

### Fixes made during CP09

- `runApiAction` now passes the API error `code` back to forms, so a form can tell a conflict from other refusals.
- The CP02 gate accepts the overview as the row destination (`/partner/listings/:id(/overview)?from=`).

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 91/91, including `test/integration/property-overview.integration.test.js` |
| Backend `db:check`, ESLint, Prettier | Pass (28 migrations, unchanged) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 19/19; 0 errors (4 existing OG-image warnings); pass; pass |
| CP09 gate `scripts/portal-gate/cp09_gate.py` (fixture `serve-property-review.mjs` with `FIXTURE_STAGE=published` on :4106, frontend on :3106) | **41/41**, twice — [results](rentra-client-admin-part09-gate.json) |
| Regression gates on this build | CP08 56/56 · CP07 53/53 · CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

Integration test scenarios:

- **Ownership:** another owner, a malformed id and a missing id read as nothing.
- **Bookability:**
  - Once published but without hours or open dates, the property is not bookable, and the summary counts 1 live and 0 bookable.
  - Confirmed hours plus an open date make it bookable, with the next open date and the booking listed.
- **Activity:**
  - Includes submission, review decision (with its client-facing reason), verification scheduled and recorded (with the outcome) and publication.
  - Excludes reviewer assignment, verification findings, scheduling notes, operator email and admin id.

Gate scenarios:

- **Ownership:**
  - The owner reads the overview; another owner gets 404 from the API and "Record not found" in the UI, with no property text.
  - A malformed id is rejected.
  - Another owner's save does not change the property.
- **Directory to overview at 1280 and 390px:** the row opens the overview with `from`, and the breadcrumb returns to the filtered list. No overflow, axe clean.
- **Overview content:**
  - Live but "Not bookable yet: the owner has not confirmed booking hours".
  - The upcoming visit links to its booking; the public page link appears.
  - Activity shows publication and "Verification completed: passed".
  - No findings, operator email or exact address in the page.
- **Calendar:** from the overview it keeps the list context, and its breadcrumb returns to the overview.
- **Editor conflict:**
  - The editor breadcrumb links to the overview.
  - A save from "another tab" succeeds; a stale-version API save gets 409 `LISTING_CHANGED`.
  - The UI save shows the conflict with "Reload latest version", keeps the typed 15 and writes nothing.
  - Reload shows the saved 13.
- **Corrections:**
  - After a changes-requested decision on the resubmitted revision, the attention list opens the overview.
  - The overview shows the reason and links "Correct House rules" and "Correct Photos".
  - The link opens the editor at the rules section, which is marked; unflagged sections are not. The list context is kept.
  - The flagged section saves, and the property is resubmitted from the overview.
- **Copy:** the dashboard has no earnings range, the KPI says "bookable now", and the submission banner makes no email or WhatsApp promise.
- **Outage:** with the API stopped, the overview shows "This page could not load" with "Try again", not "Record not found".

Gate notes:

- The CP09 gate stops the fixture API at the end (outage check).
- The Next router updates the URL before rendering the next page, so the gate waits for the target content, not only the URL.

## 4. Migration, configuration and deployment

No migration, configuration or secrets. The configured database is already at 28 of 28 migrations. Not deployed.

## 5. Limitations and next step

- Owner photos are not rendered in the overview or the editor. They live in the private store until a public delivery bucket exists; previews appear on the public page.
- There is no field-level diff for the owner, and no effect preview before a trust edit. The existing "needs re-approval" notice and the paused/live copy explain the effect after saving.
- The conflict guard covers content sections. Booking-hours saves already have their own `booking_config_version` guard. Date price overrides and open/block-date commands have no stale-screen guard yet; that belongs to CP10's calendar interval detail.
- The review SLA copy ("within 2 working days") is unchanged, because it is a stated business promise, not derived data.
- **Next:** CP10 — the portfolio calendar and interval detail.
