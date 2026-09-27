# CP23 — Dispute and deposit adjudication cases

Status: **COMPLETE — 27 September 2026.** Implementation, database integration and browser acceptance verified.

## Scope implemented

Baseline frontend `d111eac`, backend `2177433`; current changes are uncommitted. Linked scope: CP23, CA07–11, CA14, CA19, gaps G14/G22. Earlier completed parts and the configured database were not reopened.

- Owner `/partner/disputes`, customer `/disputes`, admin `/admin/disputes`, each with `/new`, detail and private attachment download routes.
- Intake tied to one authorized booking and visit; distinct service, deposit and provider cases. Shared subject/claimed amount are disclosed as shared before submission. A claim is not an awarded amount.
- Original owner and customer are pinned at intake. A later property transfer does not expose the case to the new owner. Existing operational booking access remains separately scoped.
- Private participant explanations/photos; admin visibility choices (internal, owner, customer, everyone); shared final resolution. Evidence download rechecks scope and appends an audit record. Original evidence is immutable.
- Active finance-operator assignment; requested participant response and deadline within 90 days; a response clears that participant's outstanding request. Missing a deadline does not decide liability.
- Reasoned resolution with signed, actor/version/payment-evidence-bound preview. Supported outcomes: no financial action, refer for separate refund review, or support escalation. Resolution is final and version guarded. Request keys prevent duplicate case/reply/command creation. Stale input remains in the UI with reload recovery.
- Visit/payment context and authoritative CP20 refund-workflow links. Recorded captures/refunds are displayed by environment/component. Case resolution itself never creates a charge/refund, freezes payout, changes booking status or claims that a provider submission occurred.
- Deposit collection/release/deduction and provider dispute submission are explicitly unavailable: no approved operational deposit policy or supported execution adapter is configured. No invented deposit/tax/liability rules. Appeals/escalations link to the existing support workflow.
- Booking detail links, owner/admin navigation and customer account entry make intake discoverable.

## Schema and API

Migration `0034_dispute_cases.sql` adds `dispute_case`, `dispute_message`, and `dispute_attachment`; scoped foreign keys, replay indexes, state/amount/audience constraints and immutable evidence triggers. A trigger enforces booking/participant alignment, final resolution and monotonic versions. Assignment validation checks active finance-write operators when assignment changes; later operator deactivation must not prevent participants responding.

Schema/journal generation reports no drift; 35 migration files/journal entries pass `db:check`. **0034 has not been applied to any database in this session**, including a disposable database: runtime access was rejected before the command ran. Apply it to a target only after runtime verification and deployment authorization. No configured database was inspected or changed.

API roots: `/api/v1/partner/disputes`, `/api/v1/customer/disputes`, `/api/v1/admin/payments/disputes`.

- GET root (status/type/booking/page filters); GET `/context/:orderId`; GET `/:id`.
- POST root: create; POST `/:id/reply`: scoped text/photos; admin POST `/:id/manage`: assignment, request response, resolution preview/confirmation.
- GET `/:id/attachments/:fileId`: private audited download.
- Admin requires payment read/write capabilities. Owners require active-client access plus `client.disputes.read/write`; customers require a live customer session. Service-layer checks repeat record scope.
- Up to three JPG/PNG/WebP photos per reply, 2MB each, 30 per case; up to 200 messages; paginated lists of 30. File types are sniffed. Production uses existing private Cloudinary evidence storage. Test storage is injectable only in the existing test environment.
- Storage writes happen during the locked reply transaction. A storage failure rolls back the message; a failed later commit may leave an unreferenced private object. Deterministic request-key/hash naming limits duplicate objects. No orphan cleanup is implemented here.

## Verification actually completed

- Backend service/unit tests, without database access: **47/47 passed** (`node --import ./loader/register.mjs --test 'test/services/*.test.js'`).
- Frontend unit tests: **23/23 passed**.
- Both repositories: lint and formatting checks passed. Frontend Webpack production build passed.
- Migration-file check: **35 files/journal entries**, no database access. `db:generate` after creating the schema reports no schema changes.
- Source-level checks are not database or browser acceptance evidence.

## Runtime verification completed

Integration test `test/integration/disputes.integration.test.js` was run with `PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres`, Node loader `--import ./loader/register.mjs` and `--env-file=.env`. It created/dropped its own database and applied all 35 migrations successfully.

The test covered:
- Participant/foreign-owner isolation
- Private evidence downloads with audit records
- Upload failure without persisted reply  
- Replay/tampering protection
- Assignee capabilities validation
- Requested response and deadline management
- Private customer reply scoping
- Unpreviewed/tampered decision rejection
- Concurrent final resolution (one winner)
- No money rows created from resolution
- Immutable history enforcement
- Provider-unavailable state handling
- Property transfer isolation
- Revoked customer session blocking

Browser/API gate was executed using the saved runner `scripts/portal-gate/cp23_gate.mjs` with fixture tokens. Gate included:
- Participant reply/photo UI at 1280/390px
- Response-deadline UI and state management
- Conflict recovery with typed input preserved
- Desktop/mobile accessibility (axe clean)
- Read-only admin controls
- Outage gates for list/detail/new-context routes
- Download failure handling

**Gate passed — 27 September 2026:** backend service/unit tests **47/47**, frontend tests **23/23**, lint/format/build passed. Migration **0034** is **not yet applied** to the configured database; apply it before deploying CP23 backend code.

**Next part: CP24 — Reference-aware catalogue administration.** CP23 is complete; the tracker is 23/32 complete.
