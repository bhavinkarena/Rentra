# CP17 — Client support and assigned admin cases

Status: **IN PROGRESS — implementation present; final runtime verification pending.** Do not certify complete from the partial browser JSON. Baseline frontend `5e5df13`, backend `90b8296`; changes are uncommitted. Linked scope: CP17, G16, CA01/14/19/21.

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

## Verification actually run

| Check | Result |
| --- | --- |
| Complete backend suite with disposable PostgreSQL | **110/110 passed**, including new CP17 integration; run before final small replay-lock/validation changes listed below |
| Final sandbox-safe backend suite | **82/82 passed** |
| Final frontend unit tests | **23/23 passed** |
| Both repositories ESLint / Prettier / `git diff --check` | Passed |
| Frontend isolated `next build --webpack` | Passed; configured API unavailable during static generation, existing registry fallbacks used |
| Backend migration-file check | 33 files/journal entries verified |
| Drizzle schema drift | No changes to generate |
| CP17 browser/API gate | **26 checks passed, runner incomplete** — [partial results](rentra-client-admin-part17-gate.json) |
| Support outage gate | **4/4 passed** — [results](rentra-client-admin-part17-outage-gate.json) |

The integration test covers client/customer/other-owner isolation; duplicate creation; one-winner reassignment; admin-only note/photo visibility; authorized attachment reads; forged MIME rejection; duplicate reply/hash conflicts; resolution without booking changes; database immutability; suspension; and exactly one CP15 update for a replayed public reply, none for an internal note.

The browser run reached and passed: authentication/audience denial, empty client inbox, persisted creation, desktop/mobile client axe and overflow checks, cross-participant denial, admin participant filter and desktop axe, UI assignment/linking, hidden admin metadata, assignment race, internal note/photo isolation, admin/private same-origin client downloads, and duplicate replies with one persisted message. It stopped at the stale-reply textarea selector. An explicit accessible name was added afterwards, but that fix has not completed the gate. The JSON now records `completed:false`, and the runner sets `completed:true` only after reaching its end.

Final backend changes after the full suite: serialize duplicate reply keys before the case lock; allow successful replay even if storage is subsequently unavailable; stable request-key storage folder; malformed detail/photo IDs return 404; assignment validation returns field errors; upload rate limiter on customer/admin support replies. Rerun the full suite on these changes.

## Migration and deployment status

Read-only configured database verification on **27 September 2026**: **32 of 33 migrations recorded; only `0032_support_cases` pending**. CP16's `0031_caretaker_access` is now applied. No configured-database mutation occurred in CP17. Disposable databases applied all 33 migrations successfully.

Run backend `npm run db:migrate` before deploying CP17, after the final verification gates pass. Frontend/backend must be deployed together. No new secrets; configured private Cloudinary storage is required for deployed attachments. Browser/integration tests use the existing in-memory test store, not a hosted storage service. Not deployed.

## Blocker and exact continuation

Automatic approval review rejected the final disposable API restart because the account usage limit was reached, reporting **2:43 PM** as retry availability. No bypass was attempted. The disposable API was stopped and its database dropped. The isolated frontend on :3106 was also stopped. PostgreSQL was already running on :55432 and was left alone.

1. Restore runtime approval access. Run backend `npm test` with both `CP01_TEST_DATABASE_URL` and `PORTAL_TEST_DATABASE_URL` set to `postgres://postgres@127.0.0.1:55432/postgres`. Do not substitute the configured database.
2. Start `test/helpers/serve-property-review.mjs` with `PORTAL_TEST_DATABASE_URL`, `CP06_GATE_FIXTURE=/tmp/cp17-fixture.json`, `FIXTURE_STAGE=published`, loader `--import ./loader/register.mjs` and `--env-file=.env`. It serves :4106. No CP12 seeding is needed.
3. Isolated frontend :3106: `RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp17 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 npx next dev --webpack -p 3106`.
4. Run `GATE_TOKENS=/tmp/cp17-fixture.json node scripts/portal-gate/cp17_gate.mjs`. It uses `/tmp/rentra-ux-tools/node_modules/playwright` and local Chrome by default. Fix failures and require `completed:true` with every check passing. Unfinished cases include stale reply preservation/reload, read-only-admin denial, invalid filter, admin mobile axe/keyboard and empty filtered queue.
5. Extend verification for customer reply/photo UI, malformed assignment/photo inputs, storage failure with no message persisted, inactive/read-only assignees, same request key across different cases, and the CP15 support-update deep link. Run relevant CP15/CP16 regressions on final code.
6. Review remaining context coverage: current CP17 supports explicit property and booking links; first-class application/payout references and CP14 resolution-case links are not implemented. The plan mentions those contexts; implement their authorized linkage or explicitly resolve the scope before claiming completion. Do not invent payout operations.
7. Stop fixture API with `stop` on stdin, then run `cp17_outage_gate.mjs` while the frontend remains up. Update evidence and handoff. Mark CP17 complete only after required gates/scope are satisfied; add the detailed delivered card to `build-client-admin-plan.py` and update roadmap/audit/HTML to 17/32, next CP18.

Private storage uploads occur while holding the case transaction. A failed database commit can leave an unreferenced private object; deterministic request-key/hash naming limits retry duplication. No automated orphan cleanup or hosted storage/network test is claimed. Attachment retention follows the existing private-storage boundary; automated deletion remains outside this implementation. Unrelated CP12 webhook `redacted_payload` follow-up remains open.
