# CP28 - Audit browser and governed exports

Status: **COMPLETE - 28 September 2026.** CP28's audit/export gates passed against the existing audited workflows. CP25's separate publication acceptance remains incomplete and is not asserted here. Implementation progress: **27/32**. CP25 remains independently in progress; CP29-CP32 remain planned.

## Delivered behavior

`/admin/audit` provides URL-backed actor type/UUID, exact action, target type/UUID, correlation UUID, UTC date and page filters. Results have an authoritative total, refresh timestamp, newest-first ordering, 25-row pagination, loading/empty/permission/outage states and event drill-down. A search spans at most 31 inclusive UTC dates. Detail shows actor/action/target/time, recorded reason presence, available correlation and safe before/after differences.

Raw audit payloads are never sent to this browser or its exports. Projection allowlists UUIDs, dates, recognized states, booleans and integer counts. IP addresses, contact/name fields, free-text reasons, arbitrary nested structures, secrets and unknown fields are withheld. A recorded reason is explicitly identified as withheld; investigate its source case through the existing domain permission. Omitted fields do not establish that no change occurred. Existing events without correlation show 'not recorded'; new generic audit writes capture a validated UUID correlation when request context supplies one. CP28 reads/job actions record their request or job correlation. Direct legacy SQL writers are not silently backfilled.

New `admin.audit.read` and `admin.audit.write` capabilities separate inspection from export creation/retry. Full Super Admin (`permissions = NULL`) receives them automatically; explicit permission arrays require deliberate grants through CP26. Customer/client/caretaker roles receive neither. All service entry points recheck the operator and a live, owned, unrevoked portal session. Creation/retry additionally require authentication within fifteen minutes, a reason and explicit scope confirmation.

## Export contract

| Dataset | Extra permission | Scope and exclusions |
| --- | --- | --- |
| `audit_events` | Audit read/write | Filtered redacted event projections; no raw payloads, IP or free text |
| `payment_orders` | `admin.payments.read` | UTC dates and exactly one Test/Live/simulation environment; one source row per payment order, projected IDs/state/mode/currency/purpose/expected minor amount; no provider IDs/tokens/contact fields or ledger aggregation |
| `operation_receipts` | `admin.records.read` | Filtered committed `calendar_dates_added` events only; actual attempted/added/skipped counts for new operations |

The client chooses up to 2,000 rows. A result over that limit or 5 MB fails `EXPORT_BOUNDS_EXCEEDED`; it is never silently truncated. The UI displays the failure and advises a new narrower request. The original UTC filters/environment remain immutable. Creation uses a creator-bound UUID request key: duplicate submissions return one job, changed payloads conflict. At most three jobs may be queued per creator, including retries. The list shows the latest 25 requests and labels that bound explicitly.

The existing worker handles ten queued jobs per tick. It rechecks the creator's active status and dataset grants before generation. A transaction locks the job and commits ciphertext, completion receipt and audit together. Worker interruption rolls back and leaves the job queued; concurrent workers produce one completion. Failures keep a safe code and no success artifact/receipt. Retry requires the displayed version, current permissions, recent authentication and a fresh recorded reason. Requests older than 24 hours cannot execute or retry; create a new request.

Rows are selected through the exact database creation timestamp; later rows are excluded. Values are projected at generation, so this is not a guaranteed historical/as-of statement. UTC boundaries are explicit and independent of the database timezone. Payment summaries are expected order amounts, not captured earnings or a replacement for CP22's reconciled statements. Environment filtering and a single source table prevent duplicate joins or Test/simulation amounts entering Live output.

Artifacts use AES-256-GCM with random nonces, request-bound authenticated data and a domain-separated key derived from `SESSION_SECRET`. Availability lasts 24 hours from generation. Every data/receipt retrieval is creator-scoped, checks live session/operator/dataset authorization and audits before delivery. Other admins, including full Super Admins, cannot retrieve another creator's jobs. Permissions lost after creation immediately deny retrieval. Responses are private/no-store; normal anchors prevent download prefetch. The next worker tick clears expired ciphertext. Receipts retain authorized metadata after copy expiry. Secret rotation invalidates existing artifacts; request a new copy. Downloaded files on the operator's device are outside server-side revocation.

## Supported operation receipts and immutable history

Calendar date addition already inserts missing day/night rows atomically and preserves existing availability. Its audit now records attempted, added and skipped-existing counts in that same transaction. CP28 detail and the receipt dataset expose these committed results to operators with records access. Repeating the original add command produces a receipt with zero additions and skipped-existing counts; it does not imply new inventory changes. Historical events without result counts explicitly say counts were not recorded.

CP28 introduces no bulk business-mutation command. Existing calendar preview/version/ownership/inventory rules remain responsible for changes. A receipt describes a committed operation and cannot replay, undo or alter it. Other operations are not invented as supported bulk datasets.

Migration `0039_governed_exports` adds the creator-scoped job table and audit correlation column, plus database triggers rejecting audit updates, deletes and truncation. Original evidence remains intact; restricted retention/archive changes require a separate reviewed database procedure. The app exposes no delete-history control, generic SQL console or arbitrary table editor.

## Routes and files

| Surface | Contract |
| --- | --- |
| Pages | `/admin/audit`, `/admin/audit/events/[id]`, `/admin/audit/exports`, `/admin/audit/exports/[id]` |
| Audit API | `GET /api/v1/admin/audit/events` and `/events/:id` |
| Export API | `GET/POST /api/v1/admin/audit/exports`; `GET /exports/:id`; `POST /exports/:id/retry`; `GET /exports/:id/download` and `/receipt` |
| Browser downloads | Same-origin route handlers proxy the authorized API response, with private/no-store headers |

Backend: `src/services/admin/audit-browser.js`, `src/services/exports/artifact.js`, audit-browser controller and existing cron registry. Frontend: `components/admin/AuditBrowser.jsx`, audit pages/handlers, `lib/actions/audit.js` and capability-filtered shell navigation.

## Verification - 28 September 2026

| Check | Actual result |
| --- | --- |
| CP28 disposable integration | Passed with all 40 real migrations, including Drizzle production timestamp/JSON overrides: redaction, scopes/bounds, recent authentication, creator/domain permissions, concurrent request keys/workers, injected failure/retry, expiry/purge, revocation and append-only update/delete/truncate guards |
| Finance and operation evidence | Passed: exact payment-order IDs for each Test/Live/simulation environment; calendar receipts record 4 additions then 0 additions/4 skipped; records-less operators cannot view the operation receipt |
| Focused regression | CP28/CP26/CP27: 3/3; CP28/calendar/portal-session: 3/3 with the existing `.env` bootstrap and both disposable URL variables, no skips |
| Full backend | **138 passed, 1 failed, 0 skipped**. Existing CP25 content integration fails `INVENTORY_REMEDIATION_REQUIRED` due to missing fixture reservations; CP28 passes |
| Browser/API | **44/44 passed**; [gate JSON](rentra-client-admin-part28-gate.json), [synthetic export-directory screenshot](rentra-client-admin-part28-exports.png) |
| Browser scope | Desktop 1280px/mobile 390px audit list/detail, completed export and export directory: no overflow or serious/critical axe WCAG findings; URL filters, redaction, receipt counts, read-only controls, actual download, failure/retry, foreign/anonymous denial, Test environment, expiry/revocation and outages with input preservation passed |
| Frontend | 36/36 tests; changed-file ESLint/format; production Webpack build passed |
| Backend static | Full ESLint with Windows `endOfLine: auto`, explicit new-service lint, changed-file formatting; `db:check` verified 40 files/journal entries |
| Tracker | HTML regenerated with 14 sections, 32 session cards, 27 unique detailed completion cards; status/link assertions and both repository diff checks passed |

No hosted environment, provider execution or human screen-reader check is claimed. All runtime fixtures were synthetic disposable localhost databases. Fixture tokens are temporary and are not committed.

## Reproduction and deployment

Use an explicitly disposable localhost `PORTAL_TEST_DATABASE_URL`; also set `CP01_TEST_DATABASE_URL` for the legacy session test. From the backend:

```powershell
node --import ./loader/register.mjs --env-file=.env --test test/integration/audit-browser.integration.test.js
npm test
npm run db:check
```

For browser evidence set `CP28_GATE_FIXTURE` to a temporary JSON path, start `node --import ./loader/register.mjs test/helpers/serve-audit.mjs` on 4117, configure the existing fault proxy to listen on 4118 and forward to 4117, then frontend `next dev --webpack -p 3108` with `NEXT_PUBLIC_API_URL=http://localhost:4118/api/v1`. Run `python scripts/portal-gate/cp28_gate.py`. Fixture expiry/revocation controls exist only in the helper wrapper. Send `stop` to drop the disposable database, stop the proxy/dev processes and remove temporary signed tokens.

Migration **0039 is not applied to the configured database**. Apply pending migrations through 0039 before deploying API/frontend/worker together. The changed generic audit writer requires its new column. Keep the worker running for generation and artifact expiry; inspect safe job errors in My governed exports. No configured-database migration, production export, audit-history alteration or external communication was performed. Existing CP27 work remains intact.

Next unfinished roadmap part: **CP25** acceptance. **CP29** is the next planned part after CP28 and may follow the user's chosen order independently.
