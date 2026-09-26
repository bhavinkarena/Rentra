# CP05 — Gate 1 application review

Status: **COMPLETE — 26 September 2026.** A disposable-PostgreSQL service test and a 35-check browser/API gate passed. Migration `0024_application_review` was applied to the configured database on 26 September 2026 (after the gate) (see §4).

This session also delivered a **portal-wide UI refresh** requested by the project owner: a shared shell and sidebar, a denser workspace type scale, and tabbed detail pages (§3). It builds on CP02's foundations and does not change any permission or data rule.

## 1. Scope and revisions

- Linked IDs: CP05; acceptance CA01, CA03, CA19, CA21; gaps G08 and G29 (Gate 1 copy).
- Baseline: frontend `accaf3b`, backend `50e2eb0` (CP04 committed). CP05 changes are uncommitted in both repositories.
- Delivered:
  - A paginated Gate 1 queue with status, reviewer and search filters, aging and return-to-list context.
  - Reviewer assignment (claim, release, take over).
  - Decisions tied to the reviewed version, which rules out contradictory or duplicate decisions.
  - Structured correction requests that the client sees on the exact steps to fix.
  - Resubmission tracking and "changed since last decision" detection.
  - Honest verification wording.
- Reused, not replaced: the existing approve / more-info / reject routes and actions, the document viewer and the audited private document route.

## 2. API, schema and behavior

### Migration `0024_application_review`

- `client_application.review_version integer NOT NULL DEFAULT 1`; `assigned_to uuid → admin_user` (on delete set null); `assigned_at`; index `application_queue_idx (status, assigned_to, submitted_at)`.
- `revoke_changed_portal_access()` is replaced so that **Gate 1 approval (`pending_application → active`) no longer signs the client out**. Capabilities are derived from the live status on every request, so the wider access applies immediately. Every other status, role or email change still revokes sessions.
- An idempotent normalization of CP03/CP04 admin audit rows stored as JSON strings (see "jsonb" below). On the configured database this is a no-op: the rows checked read-only there are objects.

### Endpoints (under `/api/v1`, admin cookie)

| Method and path | Capability | Input | Result / errors |
| --- | --- | --- | --- |
| `GET /admin/applications` (changed) | `admin.applications.read` | `status` (`submitted` default, `more_info_needed`, `approved`, `rejected`, `draft`, `all`), `assignee` (`any`, `me`, `unassigned`), `q`, `page` | `{ status, assignee, q, page, pages, pageSize: 20, total, slaHours, counts{…, overdue}, items[] }`. Items carry age, overdue, assignee, strikes, blocker, resubmission and locked-button clicks. Waiting items are sorted oldest first |
| `GET /admin/applications/:id` (extended) | read | — | Adds `review: { reviewVersion, assignee, assignedToMe, submissions, waitingHours, overdue, lastDecision, changedSinceLastDecision[] }` |
| `POST /admin/applications/:id/assign` (new) | `admin.applications.write` | form `action` = `claim`, `release` or `takeover` | 409 `ASSIGNED_ELSEWHERE` (claim while someone else is assigned), 409 `NOT_ASSIGNED_TO_YOU` (release), 404 |
| `POST /admin/applications/approve`, `/more-info`, `/reject` (existing routes) | write | adds required `expectedVersion`; `more-info` needs ≥1 `flagged` step and a reason; `reject` needs a reason | Redirect `/admin?decided=…` on success. 409 `APPLICATION_CHANGED` (stale version), `APPLICATION_NOT_SUBMITTED`, `ASSIGNED_ELSEWHERE`, `APPROVAL_BLOCKED` (payout name mismatch), `ACCOUNT_NOT_PENDING` (account suspended, blocked or already active); 422 field errors |

### Decision rules (`src/services/admin/applications.js`)

- **One transaction per decision:** lock the client row, then the application row. Check the version, status, assignment and account state. Update the application and the account, then write **exactly one** decision audit entry. Each submit, withdraw and decision bumps `review_version`, so:
  - two reviewers deciding the same version: one commits and the other gets 409;
  - a duplicate submit gets 409, so there is only one decision record;
  - a decision from a screen that predates a resubmission gets 409.
- **Client submit and withdraw are now conditional:** `WHERE status IN (…)` plus a version bump. A withdraw can no longer overwrite a decision that has already been made.
- **Approval** no longer re-activates a suspended or blocked account. A payout name mismatch now blocks approval on the server, not only in the UI.
- **Assignment:** the decider becomes the assignee if the application was unassigned. The assignment is kept after a correction request, so the resubmission returns to the same reviewer. A non-assignee must take over, which is audited, before deciding.
- **Change detection:** the decision audit stores keyed-HMAC fingerprints of the reviewed fields (name, phone, owner/agent, legal name, address, pincode, owner fields, ID type and name, payout destination and holder, and documents), never the values. The detail page lists which fields changed since the last decision.
- **Notifications:** there is no client decision-notification channel (email and SMS delivery are not wired), so no message is sent, once or twice. The client sees the outcome in the partner workspace, and the copy no longer promises email or WhatsApp replies.

### Fixes found while doing this

- **KYC documents were invisible to the stepper.** Uploads are stored under `owner_type='client_application'`, but `/auth/me`, the partner documents list and the admin user-documents list queried `owner_type='user'`. The identity step therefore never completed and resubmission was blocked. There is now one helper, `listApplicationDocuments(userId)`, used by all three.
- **Flagged fields never reached the client.** The stepper now marks flagged steps with "Rentra asked you to review and update this step" and a Fix link, even when the step's data exists.
- **jsonb parameters:** `${JSON.stringify(x)}::jsonb` can store a JSON *string* on some driver paths (seen on local disposable databases). The CP03–CP05 services now cast through `::text::jsonb`, and the tests assert `jsonb_typeof = object/array`.
- **Honest copy (G29):**
  - "Verified partner" → "Approved partner".
  - The identity status reads "documents reviewed by Rentra", stating that no automated KYC provider is connected.
  - The admin payout label "Matches ID" → "Name comparison".
  - The approve dialog wording is corrected.
- Contrast fixes for amber labels on the application, document and decision screens.

## 3. Portal UI refresh (owner request)

- **One shell for both workspaces** (`components/portal/PortalShell.jsx`; `AdminShell` and `PartnerShell` are thin configurations).
  - Compact sidebar groups with brand-green section labels, and an active-item indicator.
  - An amber **count badge** for waiting applications.
  - A thin, in-panel brand-green scrollbar (`.portal-scroll`).
  - A **collapsible icon rail** that remembers the choice in the browser. When collapsed, the logo becomes the expand control (the expand icon appears on hover or focus), and items show tooltips.
  - A 200ms width transition (off for reduced-motion users) and a sliding mobile drawer.
- **Admin top bar search** → `/admin/search`: clients, customers and applications in one view. A section the operator may not see says so rather than disappearing.
- **Typography:** a denser workspace scale (about 1–2px smaller headings and body text) and Inter, scoped to `.portal-ui`. The customer site keeps Plus Jakarta Sans and its own scale.
- **Detail pages:** a shared `components/portal/DetailLayout.jsx`:
  - an identity header with avatar initials, status badges, a copyable ID and info chips;
  - a key-figures strip;
  - URL-backed tabs (`?tab=`, which keep `from`);
  - section cards and a two-column field grid.

  Applied to:

  | Page | Tabs or treatment |
  | --- | --- |
  | Admin client | Overview · Properties · Upcoming visits · Application · Account details · Activity log |
  | Admin customer | Overview · Bookings · Support · Reviews · Privacy · Account details · Activity log. The list shows the full phone and "Not activated" customers (see below) |
  | Admin application | Overview · Documents · Decision · Activity log |
  | Admin booking | Visits · Payments · Guest & arrival · Records. Now also separates not-found from outage |
  | Admin support detail | New header |
  | Client property workspace | New header |
- **Customers with status `pending_application`** (the column default for rows created without a status) showed empty red badges and could never sign in. They are now labelled "Not activated", counted and filterable, and an admin can **Activate access** with a reason (same versioned command as reinstate).
- Fixed a tab-strip scrollbar (the underline sat 1px outside the scroll box).

## 4. Verification, migration and deployment

| Check | Result |
| --- | --- |
| Backend integration `test/integration/application-review.integration.test.js` | Pass. Covers: queue counts, overdue and filters; application-scoped document lookup; claim/take-over/release; a two-reviewer race with one decision and one audit record holding fingerprints only; approval keeping the client session; a correction request driving the flagged steps; resubmission with change detection and stale-version refusal; payout-mismatch and not-pending blockers; third strike blocking the account and ending its sessions; structured jsonb |
| Backend CP03/CP04 integration tests after the changes | Pass (added jsonb-type and "Not activated" activation assertions) |
| Backend `npm test` | 82 tests: 78 pass, 4 skipped without the disposable-DB URLs (all four pass with them), 0 fail |
| `db:check`, ESLint, Prettier (both repos) | Pass (25 migrations) |
| Frontend `npm test`, `next build --webpack` | 17/17; pass |
| CP05 gate `scripts/portal-gate/cp05_gate.py` | **35/35**. The results JSON from this run was not kept, only the console summary |
| Regression gates on the refreshed UI | CP04 38/38 · CP03 35/35 · CP02 34/34 |

CP05 gate scenarios:
- Queue at 1280px and 390px: overdue aging, filtered return context, no overflow, axe clean.
- Claim; a second reviewer's decision refused while someone else is assigned.
- A structured correction request that the client sees on two flagged steps with Fix links; client resubmission.
- The stale pre-resubmission decision gets 409; the review state shows two submissions and no changed fields; the assignee approves; a duplicate approval gets 409.
- The approved client stays signed in and sees "Approved partner".
- A concurrent approve + reject race: exactly one commits.
- The admin document route is authorized, while a client cookie gets 401 and a records-only operator gets 403 on the queue and documents. Another client cannot delete an applicant's document.

Gate fixture notes: `mint.mjs` now also creates a second full reviewer, two complete submitted applications with their initial submission events, and a pending-client session. It resets the CP04 customer between runs. The gate's page-load helper falls back to `load` when a background request keeps the network busy.

| Environment | Migration `0024` |
| --- | --- |
| Disposable local databases | Applied by the tests and gates, then dropped |
| Configured database (Neon) | **Applied 26 September 2026** with `0024`–`0027`. `0026` had been applied outside the migrator; its objects were checked against the file and the migration was recorded before `0027` ran. Afterwards: 28 of 28 migrations recorded, none pending. At the gate: (read-only check: 24 migrations, no `review_version`). Until `npm run db:migrate` runs, the new application queue, assignment and decisions fail there, and approval still signs the client out |

No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- There is still no client notification channel for decisions; the outcome appears in the workspace only.
- Change detection covers application, profile and document fields, not individual document image contents.
- Blocked accounts (three strikes) still reopen only by a manual appeal outside this UI.
- Listing-related copy ("reply by email and WhatsApp", "Visible and bookable") is left for CP06/CP09.
- The client booking detail and the partner editor sections keep their current bodies. Only headers, shell and type scale changed.
- **Next:** apply `0024` to the configured database, then CP06 — Gate 2 listing queue and review detail.
