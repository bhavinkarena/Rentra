# CP07 — Verification scheduling and publication

Status: **COMPLETE — 26 September 2026.** A disposable-PostgreSQL service test and a 53-check browser/API gate passed. Migration `0026_verification_publication` was applied to the configured database on 26 September 2026 (after the gate), and neither are `0024` (CP05) and `0025` (CP06). See §4.

## 1. Scope and revisions

- Linked IDs: CP07; acceptance CA03–05, CA19, CA23; gaps G09 (verification workflow) and G01 (publication half; revisions and admin restrictions remain CP08).
- Baseline: frontend `10c84a9`, backend `8789dc0` (CP06 committed). CP07 changes are uncommitted in both repositories.
- Delivered:
  - Verification scheduling on the existing `verification_visit` table: assignment, video call or site visit, a time in India time (IST), rescheduling and cancellation with reasons, and version guards.
  - A recorded evidence policy with a checklist, written findings and on-site coordinates. The outcome is passed, failed or no-show.
  - Publication of the exact verified revision, with server-side eligibility checks and attribution.
  - Client progress: the scheduled visit, then live with an honest "cannot book yet" note.
  - Public visibility and cache invalidation.
- **Waiver policy: none.** No command publishes without a passed verification. A waiver path would need an explicit business decision and its own audit design.

## 2. API, schema and behavior

### Migration `0026_verification_publication`

- `rentable` adds `published_submission_id` (FK to `listing_submission`), `published_at` and `published_by`.
- `verification_visit` adds `submission_id`, `time_zone` (default `Asia/Kolkata`), `created_by`, `recorded_by`, `cancelled_at`, `cancel_reason` and `version`.
- A partial unique index allows **one open visit per property** (not completed, not cancelled). Older duplicate open rows are cancelled before the index is created.
- `version_listing_content()` is replaced so that the publication columns do not bump `content_version`: publishing is not a content edit. As before, a content change while `pending_verification` sends the property back to `pending_review`.

### Evidence policy (recorded decision)

A property publishes only when all of the following hold:

1. A verification of the **exact submitted revision** it will publish is **completed** with outcome `passed`.
2. All six checklist items are confirmed:
   - owner identity matches the approved application;
   - the property matches the submitted photos;
   - the claimed amenities are present;
   - the address and map location match;
   - an original ownership or authority document was sighted;
   - there is no safety concern.
3. The findings are at least 20 characters.
4. A **physical** visit also records on-site latitude and longitude.
5. The property is still `pending_verification`, the Gate 2 approval still applies to the current `content_version`, the submitted revision is complete, and the client account is active.

Other outcomes:

- `failed` needs findings. It returns the property to the client as a `draft`, with the findings as the reason.
- `no_show` closes the visit and keeps the property waiting for a new appointment.

Evidence (checklist, findings, coordinates) is admin-only. Public reads never select it.

### Inventory note

Publication does **not** claim bookability. The publication state reports `inventory`:

- `scheduleReady`: the owner confirmed booking hours.
- `openDates`: future open days.
- `bookable`
- `note`

The note appears on the admin publish panel and in the audit entry. The client's live banner says "Guests can see it but cannot book yet…" until booking hours are confirmed.

### Endpoints (`/api/v1`, all `admin.properties.write`)

| Method and path | Input | Result / errors |
| --- | --- | --- |
| `GET /admin/properties/:id` (extended, `admin.properties.read`) | — | Adds `verifications[]` (newest first: mode, status, scheduledAt, timeZone, assignee, outcome, recordedBy, report, geo, version), `publication` (`eligible`, `blockers[]`, `submissionId`, `visitId`, `inventory`, `publishedAt`, `publishedSubmissionId`) and `checklist[]` |
| `POST /admin/properties/:id/verifications` | `submissionId`, `mode` = `video_call` or `physical`, `scheduledAt` (`YYYY-MM-DDTHH:mm`, IST, future, within 90 days), `note` | `{ visitId, version }`. 409 `NOT_PENDING_VERIFICATION`, `SUBMISSION_CHANGED`, `VERIFICATION_ALREADY_SCHEDULED`, `CLIENT_NOT_ACTIVE`; 422. An open visit for an **older** revision is cancelled as "Superseded by a newer revision". |
| `POST …/verifications/:visitId/reschedule` | `expectedVersion`, `scheduledAt`, `reason` (4–500) | `{ visitId, version }`. 409 `VERIFICATION_CHANGED`, `VERIFICATION_CLOSED`; 404; 422 |
| `POST …/verifications/:visitId/cancel` | `expectedVersion`, `reason` | `{ visitId }`. Same errors |
| `POST …/verifications/:visitId/outcome` | `expectedVersion`, `outcome` = `passed`, `failed` or `no_show`; `checklist[]`; `findings`; `geoLat` and `geoLng` (physical) | `{ visitId, outcome, status }`. 422 for incomplete evidence; 409 `REVISION_CHANGED` when the property changed after scheduling |
| `POST /admin/properties/:id/publish` | `submissionId` | `{ id, status: 'live', submissionId, inventory }`. 409 `SUBMISSION_CHANGED` (a different revision), `PUBLICATION_BLOCKED` (the blockers, including "Already published."); 422 |
| `GET /partner/listings/:id` (extended, client) | — | `listing.reviewVerification`: the open visit's `mode`, `scheduledAt` and `timeZone` only |

### Rules

- **One transaction per command.** It takes a share lock on the owner, then an update lock on the property, then the visit. There is one audit entry per command: `verification_scheduled`, `verification_rescheduled`, `verification_cancelled`, `verification_recorded` or `listing_published`.
- **Publication:**
  - sets `status='live'`, `verified_at` and `verified_by` (from the passed visit), `approved_snapshot` (the submitted snapshot), and the `published_*` columns;
  - clears `rejection_reason`;
  - calls `revalidateListing` for the public page, home cards, sitemap and owner pages.
- **Races:** two concurrent publish commands produce one success and one 409. An edit after a passed verification moves the property to `pending_review`, so publishing is blocked and the new revision needs its own verification.
- **Admin UI:** the **Verification & publication** tab on `/admin/properties/:id` contains:
  - the publication blockers and the inventory note;
  - a schedule form;
  - the open visit, with outcome, reschedule and cancel forms;
  - a publish panel that needs a confirmation checkbox;
  - verification history, labelled as current or earlier revision.

  A **Publication** figure (Live, Ready or Blocked) is added to the key-figures strip.
- **Client UI:** the Submit bar shows "Site visit/Video call scheduled for … (IST)" or "Rentra will schedule…". Once live, it adds the not-bookable note when hours are unconfirmed.

### Fixes made during CP07

- **Refused commands dropped checkbox state.** React resets a `<form action>` after the action runs, which unchecks controlled checkboxes and radios, while text inputs survive. The verification forms and the CP06 decision form (`PropertyReviewForm`) now dispatch from `onSubmit` inside a transition, so no reset occurs. The gate checks that the checklist and the chosen mode survive a refused command.
- The admin property detail now returns `slug` and `public_code`, used for the "Open public page" link.
- The fixture public code is now lowercase (`review01`). The public URL parser accepts only lowercase base36, like real codes.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 85/85 pass, including `test/integration/verification-publication.integration.test.js` and the new capability test |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (27 migrations; no schema drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 17/17; 0 errors (4 existing OG-image warnings); pass; pass |
| CP07 gate `scripts/portal-gate/cp07_gate.py` (fresh `test/helpers/serve-property-review.mjs` fixture on :4106, frontend on :3106) | **53/53**, twice — [results](rentra-client-admin-part07-gate.json) |
| Regression gates on this build | CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

Integration test scenarios:

- Blocked without evidence.
- Past times refused.
- A duplicate open visit is refused.
- A stale reschedule version is refused.
- Failed → draft.
- No-show keeps the property waiting.
- Missing checklist items or short findings → 422.
- A video pass is eligible but not bookable.
- A content edit after a pass blocks publishing and returns to review.
- A new revision needs its own verification; an older open visit is superseded.
- A physical visit needs coordinates.
- A suspended client blocks publishing.
- Concurrent publishing → exactly one winner.
- `content_version` is unchanged by publishing.
- Attribution and one audit entry.
- The public read shows the physically-verified badge and none of the evidence, address or checklist.

Gate scenarios:

- **Access:** on all five new commands, a client cookie gets 401 and a records-only operator gets 403. A malformed visit id gets 400. Scheduling before Gate 2 approval gets 409.
- **Before evidence:**
  - Gate 2 approval through the API.
  - Publishing without evidence gets 409.
  - The public page renders "not found".
- **Verification tab at 1280 and 390px:** the blockers are listed, there is no publish action, return context is kept, there is no overflow, and axe finds nothing.
- **Scheduling through the UI:**
  - A past time is refused, with the typed note and chosen mode kept.
  - A physical visit is scheduled for this revision.
  - A duplicate visit and a stale reschedule get 409.
  - The client sees the scheduled site visit.
  - A UI reschedule advances the version.
- **Evidence through the UI:**
  - An incomplete checklist is refused and the findings are kept.
  - Missing coordinates are refused and the checklist is kept.
  - The pass is recorded with the recorder.
  - Passing does not publish.
  - The inventory note is shown.
- **Publishing:**
  - Publishing another revision gets 409, and a records-only operator gets 403.
  - UI publication with confirmation makes the property live with the verified submission.
  - A second publish gets 409.
  - The published tab is axe clean.
- **Public page:** it is live, and the exact address, findings, coordinates and checklist are absent.
- **Client:** sees "This property is live" and the cannot-book-yet note.

Gate notes:

- Next streams `notFound()` with HTTP 200, so the gate checks the rendered not-found page rather than the status code.
- The CP02 gate stops the API on purpose (outage test), so run it last or restart the API after it.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0026` applied by the tests and both gate fixtures |
| Configured database (Neon) | **Applied 26 September 2026** with `0024`–`0027`. `0026` had been applied outside the migrator; its objects were checked against the file and the migration was recorded before `0027` ran. Afterwards: 28 of 28 migrations recorded, none pending. At the gate: and neither are `0024` and `0025` |

The configured database has since been migrated (26 September 2026); other target databases still need `npm run db:migrate` in `rentra-backend` before this code runs against them.

No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- Verification evidence has no photo or file attachments; the evidence is the checklist, findings and coordinates. Attachments would use the private document store and need their own access rules.
- There is no automatic email, SMS or calendar invite for the appointment. The client sees it in their workspace only.
- The visit is assigned to the scheduling operator; there is no separate reassignment command.
- Existing `live` properties published before CP07 have no `published_submission_id`.
- Publishing does not open inventory. Owners still confirm booking hours and dates (existing client flow).
- **Next:** apply `0024`–`0026` to the configured database, then CP08: listing revisions and administrative restrictions.
