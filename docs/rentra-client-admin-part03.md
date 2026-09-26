# CP03 — Admin client directory, detail and lifecycle

Status: **COMPLETE — 26 September 2026.** Service integration test and a 35-check browser/API gate passed on disposable databases. Migration `0023_client_lifecycle` is **not yet applied** to the configured database (see §4).

## 1. Scope and revisions

- Linked IDs: CP03; acceptance CA01–03, CA19, CA21; gap G05.
- Baseline: frontend `4a82ba2` (CP02), backend `27e616f`. CP03 changes are uncommitted in both repositories.
- Delivered: a searchable, paginated client directory; client detail with profile, application, properties, upcoming visits and lifecycle history; suspend and reinstate commands with a reason, an impact preview and version-based concurrency protection; the CP01 fulfillment policy applied to public listing visibility.
- Not delivered (by design): profile corrections and verification requests, archive/retention workflow, and admin-initiated session revocation without suspension (CP04/CP26/CP27). Financial and team sections are reserved placeholders (CP16, CP21–22). Ownership transfer is shown as unavailable; there is no owner-ID edit.

## 2. API, schema and behavior

### Schema

Migration `0023_client_lifecycle`: `ALTER TABLE "user" ADD COLUMN "lifecycle_version" integer DEFAULT 1 NOT NULL`. Only the lifecycle commands bump it. A client's own sign-in or profile edit therefore never makes an admin's reviewed preview stale. Additive and backwards compatible.

### Endpoints (under `/api/v1`, admin cookie required)

| Method and path | Capability | Input | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /admin/clients` | `admin.clients.read` | `q` (≤100, literal match on name/email/phone), `status` (`all`, `active`, `pending_application`, `suspended`, `blocked`), `page` | `{ q, status, page, pages, pageSize: 20, total, counts: { all, active, pending_application, suspended, blocked }, items[] }`. Counts are authoritative for the search, not per page | 400 bad query, 401, 403 |
| `GET /admin/clients/:id` | `admin.clients.read` | — | `{ client, application, listings (≤50), upcoming: { total, items (≤20) }, history (≤50), lifecycle }`. `lifecycle` is the preview for the currently applicable action | 400 malformed id, 404 `CLIENT_NOT_FOUND` |
| `GET /admin/clients/:id/lifecycle-preview?action=suspend\|reinstate` | `admin.clients.read` | `action` | `{ action, allowed, blockedReason, fromStatus, toStatus, expectedVersion, effects: { liveListings, upcomingVisits, openSessions }, upcomingVisits (≤5), consequences[] }` | 400, 404 |
| `POST /admin/clients/:id/suspend` | `admin.clients.write` | form: `reason` (4–1000), `expectedVersion` | `{ clientId, accountStatus, lifecycleVersion, impact }`, plus `revalidate` paths for the client's live listings | 422 `VALIDATION_FAILED`, 409 `LIFECYCLE_CONFLICT` (stale version), 409 `LIFECYCLE_NOT_ALLOWED` (invalid transition), 404 |
| `POST /admin/clients/:id/reinstate` | `admin.clients.write` | same | same | same |

The old unguarded `POST /admin/clients/suspend` (no preview, no version check, no reinstatement) and its `suspendClient` action were removed. No UI used them.

### Lifecycle rules

- **Suspend:** allowed from `active` or `pending_application`.
- **Reinstate:** allowed only from `suspended`. It restores the status recorded in the latest `client_suspended` audit entry, which is written in the same transaction as the suspension. Older suspensions without that record fall back to the application outcome (approved → active, otherwise onboarding).
- **Blocked** accounts (three application rejections) are not a lifecycle transition here; application review (CP05) owns them.
- **One transaction per command:** the account row is locked, `expectedVersion` and the transition are checked, the status and version are updated, and the admin audit entry is written with the reason, before/after status and impact counts. The CP01 trigger revokes all portal sessions in the same transaction.
- **Duplicates and races:** a repeated submit or a second admin with an old view gets 409 and changes nothing. In a race, exactly one command commits.

### Suspended-client policy (CP01, now applied end to end)

- There is no portal access and sign-in is refused (CP01).
- **No new business:** quotes and checkouts were already refused for a non-active owner. New in CP03: every public listing read in `services/db/queries.js` (detail, availability, cards, nearby, similar, sitemap, area counts) now uses a single `publiclyListed` predicate, "live AND owner active". This is the rule discovery search already applied. Listing statuses themselves are not changed, so paused or in-review listings keep their state and live ones reappear on reinstatement.
- **Existing obligations:** upcoming visits stay confirmed and are listed on the client detail page. They link to the admin booking record, where Rentra operates fulfillment.
- Public cache: the command response carries `revalidate` paths for each live listing, the home page and the sitemap, and the frontend action revalidates them.

### Frontend

- `/admin/clients`: status chips with authoritative counts, search, URL-backed status/search/page, a focusable table region, a named "Open" link carrying `?from=`, an explicit empty state and a load time.
- `/admin/clients/[id]`: breadcrumb back to the filtered list, a copyable client ID, and section links (profile, application, properties, upcoming visits, account status, history, not yet available).
  - The **account status panel** shows the from → to transition, consequences and the next visit. It requires a reason and an "I have reviewed the impact" confirmation.
  - On 409 it shows the conflict with **Reload current status**. The reason survives a failed submit.
- Admin navigation: new **People → Clients** group (`admin.clients.read`). Application review links to the client record.
- `changeClientLifecycle` (`lib/actions/admin.js`) is written without the shared `runApiAction`, so it can return the failure `code` without changing customer forms that share that helper.
- `CopyReference` gained an optional `label` (default unchanged).
- Fix found by the gate: visually hidden `sr-only` text inside horizontally scrolling tables escaped its container and widened the page on phones. The scroll regions in clients, support and properties are now `relative`.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend integration `test/integration/client-lifecycle.integration.test.js` (`PORTAL_TEST_DATABASE_URL` → disposable local PostgreSQL; all migrations applied by `test/helpers/disposable-db.js`) | Pass |
| Backend unit `test/services/portal-access.test.js` | Pass, including read vs write capability for the client routes |
| Backend `npm test` | 79 tests: 77 pass, 2 skipped (the disposable-DB tests when their URL is unset), 0 fail |
| Backend `db:check` | Pass: 24 migration files and journal entries |
| Backend ESLint and Prettier | Pass (`endOfLine: auto`). `src/services/**` is excluded from both by repository configuration, including the new service |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 17/17; 0 errors (4 pre-existing warnings); pass; pass |
| CP03 gate `scripts/portal-gate/cp03_gate.py` | **35/35** — [results](rentra-client-admin-part03-gate.json) |
| CP02 gate regression `scripts/portal-gate/gate.py` | 34/34 (the foreign-listing check skips on a fresh seed) |

Integration test scenarios:
- Directory counts, search and status filter; `%` treated literally.
- Detail with an upcoming visit, impact counts and no payout fields; 404 for unknown and malformed ids.
- Missing reason is rejected with 422; a stale version with 409.
- Suspend commits once: sessions are revoked, the public detail and availability disappear, the visit stays confirmed, and one audit entry records the reason and impact. A repeated submit returns 409.
- Two concurrent reinstatements: exactly one wins.
- Old sessions stay revoked after reinstatement; the paused listing is untouched.
- Onboarding account round trip; blocked account refused both ways.
- An active account without an approved application is restored to active.

Browser/API gate scenarios (headless Chrome, production build, seeded data plus one upcoming visit):
- Directory at 1280px and 390px: filters, search, no page overflow, axe clean. Detail breadcrumb back to the filtered list.
- The upcoming visit and impact preview are visible, and ownership transfer is shown as unavailable.
- UI suspend: status message, history entry with the reason, and reinstatement offered. The client's existing session ends on the next request, and the public listing page disappears.
- A second admin view opened earlier gets the conflict message; reload shows the current state; UI reinstatement then works and the public listing returns.
- Direct API:
  - Anonymous request → 401; client cookie → 401.
  - `admin.clients.read` operator: detail 200, reinstate 403. Records-only operator: directory 403.
  - Missing reason → 422; stale version → 409; suspending an already suspended account → 409; unknown id → 404.
- axe WCAG 2 A/AA serious/critical: none on the directory (1280/390) or detail (1280).

Evidence type: fixture and disposable-database evidence only. No hosted environment and no human screen-reader pass.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0023` applied by the tests and the gate fixture, then dropped |
| Configured application database (Neon, `rentra-backend/.env`) | **Not applied.** Run `npm run db:migrate` in `rentra-backend` before using the client pages. Until then only `/admin/clients*` fails (the column is missing); other routes select explicit columns and are unaffected |
| Deployments | Not deployed |

No new configuration or secrets. Gate reproduction is the same as in the CP02 handoff, with `scripts/portal-gate/cp03_gate.py`. `mint.mjs` now also creates a clients-reader operator and one upcoming visit on the seeded client.

## 5. Limitations and next step

- There is no admin-initiated session revocation without suspension; CP04 and CP26 own session controls.
- Upcoming visits created as legacy rows (no booking order) show without a booking-record link.
- Ownership transfer, archive/retention, profile corrections and verification requests are not implemented.
- History shows lifecycle, application and session-revocation events for the account, capped at the latest 50.
- **Next:** apply `0023` to the configured database, then start CP04 (admin customer directory and account controls).
