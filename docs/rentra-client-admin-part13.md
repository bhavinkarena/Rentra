# CP13 — Visit evidence and incident records

Status: **COMPLETE — 27 September 2026.** The database, browser/API and failure-path gates passed (evidence below). Baseline: frontend `a1348db`, backend `9601911`, plus the uncommitted CP11/CP12 changes; CP13 changes are also uncommitted.

**Migration `0028_visit_evidence_records` is not applied to the configured database.** Apply it before deploying this backend: booking detail now reads the new tables for every actor, so an unmigrated database would fail those pages. Apply it to any other target database the same way. The migration has been applied only to disposable local databases.

Linked IDs: CP13; CA01, CA07, CA19; G12 (linked issues remainder), G14.

## Delivered

- **Private evidence photos on transitions.** Handover, return and completion can each carry up to 3 photos, uploaded from the existing evidence form on owner and admin booking detail.
- **Visit-linked incidents.** Owners and admins report an incident with a category (damage, safety, access or entry, guest conduct, amenity failure, other), a summary, the time it happened, a description, up to 3 photos and an attestation. Each gets an `INC-XXXXXXXXXX` reference.
- **Admin incident closure.** An admin closes an incident with a resolution note (10–1000 characters), guarded by the incident version. Closure is final and records operational follow-up only. The form says plainly that damage liability, deposits and money belong to a dispute case (CP23). Reopening is not supported; a new incident is reported instead.
- **Superseding corrections.** An admin evidence decision can change the time, the note, or both, and must give a reason. The original row is never edited. Corrections form one linear chain per evidence row, and readers show the effective values with the original and every correction beneath them. A correction cannot reverse a visit state or change actual/simulation nature.
- **Actor, time, provenance and version.** New evidence records `visit_version`, the visit lifecycle version it was recorded against; earlier rows show none. The UI shows who recorded each item: "You" or "Rentra operations" for owners, "Owner/Admin · name" for admins. It also shows occurred and recorded times and an **Actual** or **Test / simulation** badge.
- **Admin queue.** An open incident puts its order in admin **Action needed**. Owners are not asked to act on Rentra follow-up.
- **Forms keep input on failure.** Typed text and chosen photos survive a refused or failed save. The CP12 transition form now submits the same way.

## Evidence types, limits and retention

| Rule | Value |
| --- | --- |
| Permitted types | JPEG, PNG, WebP, detected from magic bytes; the client MIME type and filename are ignored |
| Per submission | Up to 3 photos, 2MB each (keeps the request under the 8MB server-action body limit); no duplicate photo within one submission |
| Per visit | 30 photos, enforced in the service and by a database trigger |
| Refusals | Any bad file rejects the whole submission with a `photos` field error (422). Nothing is uploaded or written, and the typed input is kept. The evidence route uses its own multer instance with no MIME filter, so a file is never silently dropped. Multer limits give 413/400. |
| Storage | Cloudinary `authenticated` (no public URL). Key `rentra/visit-evidence/<visitId>/<sha256>` with `overwrite: false`, so a retry lands on the same object and cannot replace committed evidence. Keys never leave the API. |
| Reading | `GET /api/v1/{partner,admin}/records/:orderId/attachments/:attachmentId`, reached through same-origin Next routes `/{partner,admin}/bookings/:orderId/attachments/:attachmentId`. The owner must own the property; admins need `admin.records.read`. A foreign, guessed or mismatched order/attachment pair is 404, and customers have no route. Each successful read writes `visit_attachment_viewed` to the audit log. Response headers: `nosniff`, `no-store`, `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox`, `Referrer-Policy: no-referrer`. The UI shows links, not auto-loading thumbnails, so a view happens only when someone asks. |
| Retention class | `visit_evidence` for transition photos, `incident_evidence` for incident photos. CP13 performs **no automatic deletion**, and the append-only triggers refuse deletes. Erasure or expiry therefore needs the reviewed retention procedure in CP27 (privacy fulfillment); no retention period is invented here. |
| Simulation | Every attachment, incident and correction inherits nature from the visit's provenance (`real` → actual, otherwise simulation). Triggers refuse a mismatch, so Test/seed evidence can never be relabelled actual. |

## Schema (migration 0028)

- `visit_evidence.visit_version` — nullable; earlier rows are unknown.
- `visit_attachment` — exactly one parent (evidence or incident) with matching retention class, position 0–2, type/size/hash checks.
- `visit_incident` — reference, category, summary, description, time, nature, actor, `open`→`closed` with note/time/admin and version.
- `visit_evidence_correction` — reason, corrected time and/or note, `supersedes_id` chain. Partial unique indexes allow one first correction per evidence row and one successor per correction.
- Idempotency: unique `(actor_kind, actor_id, request_key)` on incidents and corrections; the existing key on evidence.
- Triggers:
  - Immutability: attachments and corrections never change. Incidents change only in their closure fields, once, by an active admin, with version +1.
  - Insert scope: the right visit, an active owner of the property or an active admin, and nature equal to visit provenance.
  - Incidents: the visit must be confirmed/handed over/returned/completed/disputed. The time must fall from a day before the start up to now.
  - Corrections: a corrected time must fall within the visit, and the correction chain must stay on the same evidence row.
  - Attachments: must match their parent's visit, nature and actor; incident attachments need an open incident; 30 per visit.
- Drizzle schema, snapshot and journal agree: 29 migrations; `drizzle-kit generate` reports no changes.

## API contract

All routes sit under the existing capability split: `GET` needs `records.read`, `POST` needs `records.write`. Actors come from the session.

| Method and path | Body | Result |
| --- | --- | --- |
| `POST /partner/records/visit`, `POST /admin/records/visit` | Existing transition fields, plus multipart `photos` (0–3) | Unchanged success. `photos` 422; stale 409 `VISIT_CHANGED`; replay returns the original. A transition without photos keeps its earlier request hash, so old replays still match. |
| `POST /partner/records/incident`, `POST /admin/records/incident` | `visitId, category, summary, description, occurredAt` (India local), `attested=on, requestKey`, `photos` | `{ message, reference }`. Field 422; 404 for foreign or missing visit; 409 for changed visit or idempotency conflict. |
| `POST /admin/records/incident/close` | `incidentId, version, resolutionNote` | 409 `INCIDENT_CHANGED` when stale or already closed |
| `POST /admin/records/evidence/correct` | `evidenceId, supersedesId` (`''` for the first), `reason, correctedOccurredAt?, correctedNote?, requestKey` | 409 `EVIDENCE_CHANGED` when not superseding the current head; 422 for time out of order, no change, or field errors |
| `GET /{partner,admin}/records/:id/attachments/:attachmentId` | — | Image bytes, 404 or 502 |

Operational record detail adds, per visit:

- `evidence[]` with `note` (effective), `visitVersion`, `actorKind`, `actorName` (admins only), `corrected`, `original`, `corrections[]`, `headCorrectionId` and `attachments[] {id, position, mimeType, bytes}`.
- `incidents[]` with reference, category, summary, description, times, nature, state, version, actor, resolution and attachments.

Customers still see only kind, nature and the effective time; no notes, photos or incidents. Incidents and corrections are audited in `audit_log` and deliberately do **not** create booking lifecycle events, which would appear in the guest's timeline.

## Verification — 27 September 2026

All runtime checks used disposable databases on a local PostgreSQL 14 server (`127.0.0.1:55432`) and an in-memory evidence store. The in-memory store is honoured only when `NODE_ENV=test` and is injected by the fixture. Neither Cloudinary nor the configured database was touched.

| Check | Result |
| --- | --- |
| Backend full suite (both disposable-DB variables) | **101/101 passed**, including the new unit tests and integration test and all earlier CP integration tests |
| Unit `test/services/visit-evidence.test.js` | 4/4: magic-byte sniffing (a GIF labelled JPEG and a PDF refused), size/count/duplicate limits, chain ordering, effective values, ordered corrected times, incident time window |
| Integration `test/integration/visit-evidence.integration.test.js` | **Passed**: photo transition replay; conflicting retry and stale form upload nothing; unsafe file writes nothing; audited reads (owner/admin 200; foreign, guessed, mismatched and malformed 404; missing object 502; customer refused); incident replay and conflict, foreign 404, future time refused, natures follow provenance; admin-only closure with one winner in a race; admin-only corrections (ordering, replay, stale, no-change), original row unchanged, state unchanged; direct SQL `UPDATE`/`DELETE`/relabel/mismatched inserts refused; read models (owner no names or keys, admin names, customer minimal, Test visit never review-eligible) |
| Browser/API gate `scripts/portal-gate/cp13_gate.mjs` | **31/31 passed** ([results](rentra-client-admin-part13-gate.json)) |
| Failure-path gate | **6/6 passed** ([results](rentra-client-admin-part13-outage-gate.json)) |
| CP11/CP12 browser gate re-run as regression | **44/44 passed** ([results](rentra-client-admin-part11-12-gate.json)) |
| Frontend tests / ESLint / Prettier / isolated production build | 19/19; passed; passed; passed |
| Backend ESLint / Prettier; `git diff --check` in both repositories | Passed |

**Browser gate (31):**

- Anonymous denial. An unsupported file is refused with the typed evidence kept and nothing recorded. A real two-photo handover is recorded, and no storage key appears in the record.
- Actor, visit version and **Actual** badge shown.
- Same-origin photo read with exact bytes and private headers. Foreign-owner link and API, guessed id and mismatched order all 404. Admin and read-only admin can view.
- Photo link is keyboard focusable.
- Browser incident with a photo; incident replay is one effect; foreign-owner report 404; open incident is admin, not owner, queue work.
- Read-only admin cannot close or correct; the owner cookie cannot use the admin route. Browser closure; stale closure 409. Browser correction keeps the original; stale correction 409. The owner sees the correction but no correction form.
- Owner and admin evidence at 390px with forms open: no overflow, no serious or critical axe violations.
- Revocation blocks the next photo read.

**Failure paths (6):** a fault proxy failed only incident submissions, then only photo reads.

- A failed submit shows an honest message: "may not have been saved; submitting again is safe". The summary and chosen photo are kept, and nothing is recorded while the service is down.
- Retrying with the same request key creates exactly one incident with its photo.
- A photo link during the outage answers 503 plain text (no store), then serves again once the service returns.

### Found and fixed by execution

- The first `visit_attachment` trigger used one `record` variable filled with differently typed columns, which PostgreSQL refused ("type of parameter … does not match"). It now uses typed variables. The migration was unapplied anywhere but disposable databases when edited.
- The evidence panel hid "recorded against visit version 0" because it used a truthy check. Visit lifecycle versions start at 0, so it now uses a null check.

## Remaining limits and next step

- Apply migration 0028 before deploying the backend. Deploy frontend and backend together: the frontend sends photos and uses the new routes.
- No automatic retention deletion (CP27). No incident reopening, assignment or messaging (cases: CP14/CP17). No liability, deposit or charge decisions (CP23).
- Photos are stored as uploaded. Camera metadata stays in the private original to preserve evidence integrity, and only authorized operators can read it.
- Orphan objects: if the database write fails after an upload, the content-addressed object remains unreferenced. A retry reuses it; there is no sweeper yet.
- Owners cannot correct evidence; corrections are admin decisions. Owners can report an incident.
- Still open from CP12: webhook `redacted_payload` double-encoding makes webhook confirmation a no-op. See the [CP12 handoff](rentra-client-admin-part12.md).
- No hosted Cloudinary upload was exercised; the adapter mirrors the KYC authenticated-upload path. No human screen-reader pass.

**Re-run:**

1. Start disposable PostgreSQL on `:55432` and run backend `npm test` with `PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL` set.
2. Start `test/helpers/serve-property-review.mjs` (`FIXTURE_STAGE=published`, `CP06_GATE_FIXTURE=<temp json>`). It injects the memory store.
3. Run `seed-pricing-operations-gate.mjs`, then `seed-visit-evidence-gate.mjs`.
4. Start isolated Next on `:3106` with `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1`, `RENTRA_BROWSER_FIXTURE=1` and a unique fixture id.
5. Run `GATE_TOKENS=<temp json> node scripts/portal-gate/cp13_gate.mjs`.
6. For failure paths, remap the fixture to another port and put a 503 fault proxy on `:4106` (same method as CP11/12).

Next part: **CP14 — Admin booking change and cancellation cases** (depends on CP12–13).
