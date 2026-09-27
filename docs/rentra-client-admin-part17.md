# CP17 — Client support and assigned admin cases

Status: **COMPLETE — 27 September 2026.** The final backend suite, the completed 39-check browser/API gate, the extended integration test and the outage gate all passed on the final code. Migration `0032_support_cases` was applied to the configured database. Baseline frontend `5e5df13`, backend `90b8296`; the CP17 implementation is committed (frontend `5af8163`, backend `b59dbbe`), and this completion adds only verification assets and documentation. Linked scope: CP17, G16, CA01/14/19/21.

## Implemented behavior

- `/partner/support`, `/partner/support/new` and `/partner/support/[id]` reuse the existing support service and customer thread components. Owner navigation, property overview and booking detail link to support. Cases may reference an owned property or booking; foreign IDs are rejected. Clients never enter the customer's private thread through a shared booking.
- `/admin/support` filters by actual supported state, client/customer participant and assigned-to-me/unassigned. Detail provides assignment to an active support operator, normal/urgent priority, reason, optional related support case, append-only history and participant/property/booking links.
- Assignment uses the current version; concurrent assignments have one winner. Linking cases is admin-only metadata, not shared membership or shared messages. Reply visibility explicitly distinguishes participant-visible replies from internal notes. Internal notes do not change the participant-visible status.
- Replies and their attachments persist before success. Request-key/hash replay returns the same effect; changed content with the same key is refused. Stale replies return a reload action and preserve typed text before reload. Reloading refreshes the form version and may replace its draft.
- Photo uploads reuse CP13's private evidence storage and magic-byte validation: up to three JPG/PNG/WebP files, 2MB each, thirty photos per case. No PDFs, identity documents or public storage URLs. Each photo is attached to one immutable message; an internal note's photos are admin-only. Reads recheck participant scope and write an audit entry. Same-origin frontend proxies stream bytes with no-store/nosniff headers.
- Public admin replies to client cases insert a CP15 update in the same transaction. Waiting-for-participant replies are required updates; informational replies honor existing case-category preferences. Internal notes create no client updates. The update links to the support thread, not to a different booking case.
- Customer support routes retain their semantics and receive private reply attachments. Fixed the existing list-validation mismatch (`in_progress`, `waiting_customer`, `resolved` now match service/UI values).
- Admin shell now handles a failed session lookup with the shared retryable outage state. It previously threw above the page's error handling.

No email/SMS delivery was added or claimed. Users return to the thread; clients also receive the persisted updates inbox item. Closing support does not cancel a booking, release inventory, authorize a refund or resolve a CP14 financial case.

## Schema and API

Migration `0032_support_cases` extends `support_request` with nullable `client_id`, `property_id`, `assigned_to`, `priority`, and `related_request_id`; exactly one customer/client participant is required. `support_message.internal` defaults false. New `support_attachment` records private storage metadata. Existing immutable-message and immutable-participant rules remain; assignment/status/version metadata may change. Database participant-scope triggers now support clients and require the appropriate active account/admin permission. A trigger reuses `client_update_insert` for public client replies.

Existing API mounts remain `/customer/support` and `/admin/support`; new `/partner/support` endpoints provide list/create/detail/thread/reply. All three expose `/:id/attachments/:attachmentId`; admin adds `POST /admin/support/:id/manage`. Path IDs override any reply/manage body ID. New `client.support.read/write` capabilities are active-client-only; admin uses existing `admin.support.read/write`. Caretakers have no support capability.

Assignment input: `version`, `assignedTo` (nullable UUID), `priority`, `relatedRequestId` (nullable UUID), `reason`. Replies retain `body`, `state`, `version`, `requestKey` and add `internal` plus multipart `photos`. Foreign/missing cases and attachments return 404; stale assignment/reply and changed replays return 409; unsupported photos return 422. Photo storage unavailable returns 503 without saving the message.

## Verification actually run — final, 27 September 2026

| Check | Result |
| --- | --- |
| Complete backend suite on the final code, disposable PostgreSQL (`PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL`) | **112/112 passed**: 111 existing tests, including the original CP17 integration, plus the new extended CP17 integration |
| New `test/integration/support-cases-extended.integration.test.js` | **Passed**. Evidence listed below. |
| CP17 browser/API gate `scripts/portal-gate/cp17_gate.mjs` | **39/39 passed, `completed: true`** — [results](rentra-client-admin-part17-gate.json) |
| Support outage gate (API stopped, frontend up) | **4/4 passed** — [results](rentra-client-admin-part17-outage-gate.json) |
| CP14 gate / CP13 gate re-run as regression on the CP17 code | 34/34 / 31/31 |
| Frontend unit tests / ESLint / Prettier / isolated `next build --webpack` | 23/23; passed; passed; passed |
| Backend ESLint / Prettier / `db:check` (33 files) / drizzle drift; `git diff --check` in both repositories | Passed; no schema changes |

**Extended integration test:**

- Reusing a request key on a different case is refused (`IDEMPOTENCY_CONFLICT`) and never touches the other case.
- Photo storage failures save nothing. When storage is unconfigured the reply is refused with 503, and when a storage write fails the transaction rolls back. Either way there is no message, no attachment, no version change and no client update.
- Inactive and read-only admins cannot be assigned (`INVALID_ASSIGNEE`).
- Malformed priority, assignee id and reason are refused, and a malformed photo id is 404.
- A saved public reply creates exactly one client update: category `case`, `action` kind for a waiting reply, `detail.supportId` equal to the thread.
- Customer photo replies are readable by the customer and admins, and are 404 for the owner.

**Browser gate (39):**

- Access: authentication and audience denial. Client empty inbox, persisted creation, desktop and mobile axe/overflow. Cross-participant denial both ways.
- Admin handling: participant filter and desktop axe; assignment and related case persisted through the UI; admin metadata hidden from the client; assignment race with one winner.
- Private notes and photos: internal note and photo isolation from client and customer; admin private photo proxy; public reply visible to the client; same-origin client attachment download.
- Replies: duplicate reply succeeds twice with one persisted message. A **stale reply keeps the typed text** and offers reload.
- Permissions and filters: read-only admin write denied; invalid state filter 400; admin detail at 390px axe clean; assignment keyboard focus; empty filtered queue.
- **Updates inbox:** the CP15 update opens the exact support thread.
- **Customer reply UI:** a customer reply with a private photo persists and downloads; the owner cannot fetch it; a malformed photo id is 404; malformed assignment input is 422; a read-only admin assignee is 422.

**Outage (4):** client inbox and thread, admin inbox and detail all show the retryable state.

### Found and fixed during completion

- The stale-reply selector: the explicit accessible name added in the earlier session now passes.
- The update inbox's visually hidden title makes the accessible name "Open : …" (with a space). The gate now matches that; the product reads correctly to screen readers.
- Not run: the CP15 and CP16 regression runners are Python Playwright written for Windows (`netstat`/`taskkill`), and Python Playwright could not be installed in this environment. CP15/CP16 coverage on the final code comes from their integration tests in the 112-test suite and from the CP17 gate's updates-inbox deep link.

## Scope resolution

CP17's deliverable asks for "links to relevant records" in admin detail. Admin detail links the participant (client or customer), property, booking, and a separate related support case; the booking's Cases tab reaches its CP14 cases. The wider plan row also names application and payout contexts. Those are resolved as follows, and no links were invented:

- **Application:** client support is active-client only (`client.support.*`). Applicants use the existing application flow, which has its own requested-changes and resubmission path (CP05). No application reference is needed.
- **Payout:** no client-visible payout or statement records exist yet. First-class payout references belong with CP22 statements and payout read models; until then an owner describes the payout in the message. No payout operation is exposed.
- **CP14 booking cases:** owners already message Rentra inside the booking case (CP14). A support thread references the booking, and admins reach its cases from there. A direct support-to-case foreign key is not added.

## Migration and deployment status

On **27 September 2026** a read-only check of the configured database showed 32 of 33 migrations recorded, with only `0032_support_cases` pending. None of its tables, columns or functions existed yet. The existing support rows (1 request, 2 messages) were evaluated against the re-added message check and the new participant check with 0 violations.

`npm run db:migrate` then applied it. A read-only check afterwards confirmed **33 of 33 recorded, none pending**, with `support_attachment`, the five new `support_request` columns, `support_message.internal`, the three constraints and the three triggers present, and the existing rows preserved.

The same check reports hash drift for `0009`, `0024`, `0026` and `0029`: those recorded hashes differ from the current files. The migrator applies by timestamp and did not re-run them, but the configured schema for those migrations may not match their committed files exactly. Review that drift separately.

Deploy frontend and backend together. No new secrets are needed, but deployed attachments require the configured private Cloudinary storage. Browser and integration tests use the in-memory test store, not hosted storage. The code is not deployed.

## Remaining limits

Private storage uploads occur while holding the case transaction. A failed database commit can leave an unreferenced private object; deterministic request-key/hash naming limits retry duplication. No automated orphan cleanup or hosted storage/network test is claimed. Attachment retention follows the existing private-storage boundary; automated deletion remains outside this implementation. Unrelated CP12 webhook `redacted_payload` follow-up remains open.

Next part: **CP19 — Payment investigation console** (depends on CP04 and CP12; both complete).
