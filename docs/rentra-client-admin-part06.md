# CP06 — Gate 2 listing queue and review detail

Status: **COMPLETE — 26 September 2026.** Started in an earlier session and finished here. A disposable-PostgreSQL service test and a 39-check browser/API gate passed. Migration `0025_listing_review` is **not yet applied** to the configured database, and neither is CP05's `0024` (see §4).

## 1. Scope and revisions

- Linked IDs: CP06; acceptance CA03–04, CA19, CA21; gap G01 (Gate 2 half; verification and publication remain CP07–CP08).
- Baseline: frontend `3d4cbf7`, backend `e7d02f5` (CP05 committed). CP06 changes are uncommitted in both repositories.
- Delivered:
  - The missing admin Gate 2 API and UI: a queue with status/reviewer/search filters, and a detail page that renders the exact submitted revision (fields, photos, amenities and prices, private ownership evidence, readiness). Owner and Gate 1 application links.
  - Reviewer assignment.
  - Request-changes, reject and approve-for-verification decisions with reasons and exact revision attribution.
  - The client sees the reason and the sections to correct, resubmits, and gets a confirmation.
- Approval for verification is **not** publication: CP06 has no command that can publish (CP07 owns it).

## 2. API, schema and behavior

### Migration `0025_listing_review`

- `listing_submission(id, rentable_id, content_version, pass_number, snapshot jsonb, submitted_by, submitted_at, assigned_to)` with a unique `(rentable_id, pass_number)`. One row is an **immutable** revision: a trigger refuses deletes and any change except `assigned_to`.
- `listing_review.submission_id` (unique) → one decision per submitted revision.
- `rentable.content_version`, maintained by triggers:
  - any content change on the property row bumps it (status, review and aggregate columns excluded);
  - price, amenity and ownership-document inserts, updates and deletes bump the parent row's version while holding its lock.
  - A content change while `pending_verification` moves the property back to `pending_review`.
- The snapshot stores listing fields, place names, prices, amenities, photo references and document metadata. It never stores storage keys, signed links, credentials or financial history.

### Endpoints (`/api/v1`)

| Method and path | Access | Input | Result / errors |
| --- | --- | --- | --- |
| `GET /admin/properties` | `admin.properties.read` | `status` (`pending_review` default, `pending_verification`, `draft`, `rejected`, `all`), `assignee` (`any`, `me`, `unassigned`), `q` (title, reference or client email; literal match), `page` | `{ …filters, page, pages, total, items[] }` sorted by oldest submission |
| `GET /admin/properties/:id` | read | — | `{ property, current, submissions[], history[], stale, readiness }` (submissions newest first, with display photos) |
| `POST /admin/properties/:id/assign` | `admin.properties.write` | `submissionId`, `action` = `claim`, `release` or `takeover` | 409 `SUBMISSION_CHANGED`, `ASSIGNED_ELSEWHERE`, `NOT_ASSIGNED_TO_YOU`; 422 |
| `POST /admin/properties/:id/decision` | write | `submissionId`, `outcome` = `changes_requested` (needs ≥1 `flagged` section), `rejected` or `approved_for_visit`; `reason` (4–2000) | `{ status, submissionId }`. 409 `SUBMISSION_CHANGED` (stale pass or version, or already decided), `ASSIGNED_ELSEWHERE`, `ALREADY_DECIDED`, `LISTING_INCOMPLETE`, `CLIENT_NOT_ACTIVE`; 422 (including any attempt at `published`) |
| `POST /partner/listings/:id/submit` (changed) | client, own listing | — | Goes through the shared `submitProperty` service: locks the property, re-checks readiness, writes the snapshot, audits. 409 `ALREADY_SUBMITTED` / `LISTING_NOT_SUBMITTABLE`, 422 incomplete, 404 for another owner's listing |
| `GET /partner/listings/:id` (extended) | client | — | Adds `review` context plus `reviewNeedsResubmission`, `reviewFlaggedFields` and `reviewOutcome` |

### Rules

- **Decisions:** one transaction. Lock the owner (share) and the property (update), then the submission. The decision must match the current pass and content version while the property is `pending_review`, and the client must be active. It writes one `listing_review` row and one audit entry. The outcome sets the property to `draft` (changes requested), `rejected`, or `pending_verification`.
- **Races:**
  - two reviewers deciding the same revision: one commits;
  - an edit racing a decision serializes on the parent lock, so changed content never stays approved;
  - a pre-resubmission screen gets 409.
- **Edits while waiting for review** make the submission stale. The admin sees "Unsubmitted changes" and cannot decide; the client sees "Resubmit so Rentra can review the current version".
- **Assignment** carries over to the next pass. A non-assignee must take over before deciding.
- **Private evidence:** document links open through the existing audited `/admin/documents/:id` route, only for the current unchanged revision and only for operators with `admin.documents.read`. Historical or changed evidence is labelled as unavailable.
- **Client side:** the Submit bar shows the reason, links to the flagged sections, and states the review or verification state honestly ("approved for verification — not published yet"). After submitting, the property page confirms "Submitted for review" (the redirect now goes to `/partner/listings/:id?submitted=1`).

### Fixes made while finishing CP06

- **`GET /admin/properties?status=all` failed with a 500:** the query compared the `listing_status` enum to the literal `'all'`. Status and reviewer filters are now built as conditional fragments. Regression coverage was added to the integration test and the gate.
- **Decision reason on failure:** the reason, outcome and section fields are controlled state; the gate's "failed decision preserves reason" check now passes.
- UI: queue filters as link chips (same pattern as the application queue); the detail page on the shared layout with a key-figures strip, status tones, header actions, and a readiness checklist with icons. Location reads as "lat, lng" instead of raw JSON. Singular/plural count text fixed. Sidebar entry **Work queues → Property review**.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 83/83 pass. The CP06 integration test was re-run after the queue fix: pass |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (26 migrations; no schema drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 17/17; 0 errors; pass; pass |
| CP06 gate `scripts/portal-gate/cp06_gate.py` (disposable API `test/helpers/serve-property-review.mjs` on :4106, frontend on :3106) | **39/39** — [results](rentra-client-admin-part06-gate.json), stable across repeated runs |
| Regression gates on this build | CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

Integration test (`test/integration/property-review.integration.test.js`) scenarios:
- A foreign owner cannot submit; a duplicate submit is refused.
- Queue filters, including `all`; the snapshot has no storage key; snapshots cannot be updated or deleted.
- Assignment conflicts; a correction request requires sections.
- Changes-requested → edit → resubmit, and the old submission cannot be decided.
- A child-record (price) edit makes the revision stale.
- Concurrent contradictory decisions: exactly one review row and one audit entry.
- `published` is refused.
- An evidence change after approval requires a new review; a restricted client blocks decisions.
- An edit racing a decision leaves the property `pending_review` and stale.

Gate scenarios:
- Access: a client cookie on the admin API → 401; a records-only operator → 403 on the queue, detail and private documents; another owner → 404 on the property; a malformed id → 400; every status filter loads.
- Queue and detail at 1280px and 390px: filtered return context, no page overflow, axe clean. The exact address appears only in the admin detail.
- UI assignment persists; another reviewer gets 409.
- The server requires correction sections; a **failed decision keeps the typed reason**.
- The client sees the reason and the requested sections, and **resubmits with the Submit button**, getting a confirmation. Another client cannot resubmit.
- The new pass has its own identity; the old screen gets 409.
- UI approval stops at `pending_verification`; the history keeps both passes; `published` → 422; the client sees "Verification visit next".

Gate note: Next streams a hidden copy of each page and swaps it in during hydration, so the gate waits for network idle after each navigation before querying.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0025` applied by the tests and the gate fixture |
| Configured database (Neon) | **Not applied**, and CP05's `0024` is also pending (read-only check: 24 migrations, no `listing_submission`, no `review_version`) |

**The configured database needs `npm run db:migrate` in `rentra-backend` before this code runs against it.** Without it, the client property page, property submission, the property review pages and the CP05 application queue all fail there.

No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- Properties that were `pending_review` before this migration have no versioned submission. They show "Awaiting a versioned submission", and the client must resubmit.
- The client can see flagged section names and the reason, but not a per-field comment.
- The old `/partner/listings/[id]/submitted` page still exists but is no longer the submit destination.
- Listing copy elsewhere still promises replies "by email and WhatsApp" (for CP09).
- **Next:** apply `0024`–`0025` to the configured database, then CP07 — verification scheduling and publication.
