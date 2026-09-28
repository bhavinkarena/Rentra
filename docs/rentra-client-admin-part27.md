# CP27 - Privacy fulfillment

Status: **COMPLETE - 28 September 2026.** Customer access copies and partial account anonymization passed their independent CP04/CP17/CP26-dependent gates. Progress: **26/32**. CP25 remains independently in progress; CP28 remains planned.

## Delivered behavior

The acknowledgment queue now links to a paginated directory and request detail with scope inventory, obligations, authority/delivery references, policy version, retained classes, identifying fields, checkpoints and receipts. Read-only operators can inspect and download; commands additionally require `admin.privacy.write`, live authorization, authentication within fifteen minutes, a meaningful reason, confirmation and the displayed version.

Review records self/representative authority, an identity-verification reference and a verified delivery reference. These are operator records of verification, not automated identity proof. No new ID-document upload is requested. Signed previews bind the actor, request version, reviewed policy and current scope. Stale scope and concurrent approval are rejected; preview alone creates no job.

Jobs record the owner's researched [internal retention policy v1](rentra-data-retention-policy.md), `rentra-retention-v1`. Closure requires retention acceptance and refuses active bookings, holds, unresolved disputes, pending payments/refunds or another unfinished privacy job. Approval immediately blocks the account, revokes customer sessions, withdraws marketing and invalidates Rentra-held exports. CP04 cannot correct or reactivate pending/erased accounts.

Access jobs generate a projected JSON copy of the customer's account/profile, bookings/orders, financial summaries, preferences, reviews, customer-visible support/dispute messages, attachment metadata and privacy receipts. Explicit exclusions cover secrets/tokens, internal notes, foreign-account private records, raw KYC, backups and binary files. More than 5,000 rows in a section or a copy over 10 MB fails `EXPORT_REVIEW_REQUIRED`, without silent truncation. Customer-visible free text can contain other people's information and requires separately reviewed redaction where appropriate. This is a scoped copy, not every stored record or a guaranteed simultaneous snapshot across all sections.

Artifacts use AES-256-GCM with request-bound authenticated data and a domain-separated key derived from `SESSION_SECRET`. Downloads are available for twenty-four hours from generation. Every data/receipt download checks live authorization/ownership and audits before delivery; responses are private/no-store. Normal anchor links prevent sensitive download prefetch. No public bearer link exists. Expired ciphertext is purged on the next worker tick; closure invalidates existing copies immediately. Secret rotation invalidates old artifacts: reissue through a new verified access request.

## Stages and accurate receipts

The existing cron worker handles up to ten queued/running jobs per tick. Account/request/job locks serialize checkpoints across workers. Each completed stage atomically saves its result and advances. External photo removal is retry-safe and can repeat after a crash; failed jobs preserve their checkpoint and safe error code with no success receipt. A recently authenticated operator records a reason to retry. Revoked sessions stay revoked.

| Job | Stages | Completed outcome |
| --- | --- | --- |
| Access | Scoped encrypted snapshot; receipt | `scoped_export_ready`, counts/exclusions/expiry |
| Closure | Retention inventory; photo removal; preferences/local method disable; live identifier removal; receipt | `partial_anonymization_complete`, `fullDeletion: false` |

Closure removes favourites/merge records, consumes customer-bound OTP challenges, clears live name/email/phone/verification timestamps, resets locale, detaches the shared-person link and keeps the account blocked. Results record actual removed preference/method counts and fields. Receipts disclose retained UUID and financial/case/audit/external classes, historical identifiers, five outstanding actions and a ninety-day retention review. Local payment-method disable does not detach provider methods or delete encrypted tokens.

After closure the customer cannot sign in to download a receipt. Arrange verified manual delivery before approval, record its reference and use the authorized admin receipt download. A recorded delivery reference does not claim an email was sent automatically.

## Routes and implementation

| Surface | Contract |
| --- | --- |
| Admin pages | `/admin/privacy`, `/admin/privacy/[id]`, same-origin `/export` and `/receipt` handlers |
| Admin API | `GET /api/v1/admin/privacy/requests`; `GET/POST /requests/:id`; `GET /requests/:id/export` and `/receipt` |
| Commands | `review`, `preview`, `queue`, `retry`; version/reason/confirmation required; queue uses preview token |
| Customer | Existing `/account/privacy` displays progress, failure, receipts and authorized copy links |
| Customer API | `GET /api/v1/customer/account/privacy/:id/export` and `/receipt`; active customer and own request only |
| Legacy endpoints | Preserved; legacy review checks live capabilities and increments request version |

Backend: `src/services/customer/privacy-fulfillment.js`, privacy controller, account projection and cron registry. Frontend: `components/admin/PrivacyFulfillment.jsx`, privacy pages/route handlers and `lib/actions/privacy.js`. Migration `0038_privacy_fulfillment` adds erasure flags, review/version/receipt fields and checkpointed encrypted-artifact jobs; SQL, journal and snapshot are included.

## Verification - 28 September 2026

| Check | Actual result |
| --- | --- |
| CP27 disposable integration | Passed with all 39 real migrations: permissions/reauthentication, idempotent submission, scope/version races, concurrent approvals/workers, foreign exclusion, encryption, expiry/revocation/purge, photo failure, receipt-stage restart and export bounds |
| Financial preservation | Passed: whole booking/order rows and nine financial tables, including captures, allocations, refunds and payouts, compared exactly before/after closure; pending refund/payment approval refused |
| Focused privacy/operator/access/customer regression | 4/4 passed, no skips, both disposable test URL variables set |
| Full backend suite | **137 passed, 1 failed, 0 skipped**. Existing CP25 `content.integration.test.js` fails `INVENTORY_REMEDIATION_REQUIRED` because its confirmed-booking fixture lacks reservations; CP27 passed |
| Browser/API | **43/43 passed**; [gate evidence](rentra-client-admin-part27-gate.json), [completed-detail screenshot](rentra-client-admin-part27-detail.png) |
| Browser scope | Directory/detail/completed receipt at 1280px and 390px: no horizontal overflow or serious/critical axe WCAG findings. Review/preview/approval, actual customer download, read-only/revoked access, expiry, failure/retry, directory/detail outages and preserved input passed |
| Frontend | 36/36 tests; changed-file lint/format; production Webpack build passed |
| Backend static | Full ESLint with Windows `endOfLine: auto`; changed service/controller/routes/cron/helper/test formatting; migration check verified 39 files/journal entries |
| Documentation | Generated 14 sections, 32 session cards and 26 detailed completion cards; status/link assertions and both repository diff checks passed |

Browser fixtures use disposable localhost PostgreSQL, synthetic identities, fake media removal and an injected stage failure. No signed fixture tokens or production data are committed. Hosted Cloudinary deletion, object versions/CDN/backups, screen-reader behavior and real provider delivery were not verified.

### Reproduction

Set `PORTAL_TEST_DATABASE_URL` to an explicitly disposable PostgreSQL server and also set `CP01_TEST_DATABASE_URL` for the legacy access test. From the backend:

```powershell
node --import ./loader/register.mjs --env-file=.env --test test/integration/privacy.integration.test.js
npm test
npm run db:check
```

For browser gates, set `CP27_GATE_FIXTURE` to a temporary JSON path. Start `node --import ./loader/register.mjs test/helpers/serve-privacy.mjs` on 4107. Configure the existing fault proxy to listen on 4108 and forward to 4107. Start frontend `next dev --webpack -p 3107` with `NEXT_PUBLIC_API_URL=http://localhost:4108/api/v1`, then run `python scripts/portal-gate/cp27_gate.py`. Expiry/revocation control endpoints exist only in the fixture wrapper, never production. Send `stop` to the helper to drop its database; stop dev/proxy processes and remove the temporary signed-token JSON.

## Deployment and outstanding operations

Migration **0038 is not applied to the configured database**; only disposable databases were migrated. Apply pending migrations through 0038 to the intended target before deploying frontend/backend/worker together. Keep the worker running for progress and expired-artifact purging. Inspect failed jobs and delivery references in the detail; preserve account restriction during recovery.

Historical contacts/free text/public-review PII, shared KYC, token/provider disposal, backup/object-version expiry and record-specific legal holds/deadlines remain explicit follow-ups. The privacy lead must operate the policy's controlled due-record/hold register and separately reviewed disposal actions. CP27 completes the customer fulfillment slice; the wider retention program and legal applicability remain unverified. Legal-entity/GST scope and named contacts are still needed; public publication is CP25. No configured-database migration, production deletion, provider disposal request, customer communication or public publication was performed.

Next unfinished roadmap part: **CP25** acceptance. **CP28 remains planned** and can follow the user's requested order independently.
