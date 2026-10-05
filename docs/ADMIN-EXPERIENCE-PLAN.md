# Rentra admin experience — phased UI redesign plan

| Item               | Detail                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prepared           | 4 October 2026                                                                                                                                                                         |
| Scope              | Admin dashboard, navigation, section tabs, tables, record details, review workflows, finance, support, configuration and release QA                                                    |
| Status | Phases 1–12 complete (locally verified); not deployed |
| Method             | Repository review plus Phase 1 disposable-local role, viewport, permission and integration baseline; inspected saved owner and current admin screenshots                               |
| Verification limit | Phase 1 adds authenticated disposable-local browser/API/database evidence below. Production workflows and providers were not exercised; historical owner test results remain separate. |

## Phase completion tracker

**Progress:** 12 of 12 phases complete · 0 in progress · 0 pending. Phase 12 release verification is locally verified; deployment and production-provider checks remain separate. Existing admin functionality does not count as completion of these redesign phases.

| Phase | Work                                                            | Status      | Completed on | Notes / remaining work                                                                                       |
| ----- | --------------------------------------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| 1     | Admin inventory and behavior baseline                           | ✅ Complete | 4 Oct 2026   | Inventory, owner comparison and disposable baseline recorded; findings tracked below |
| 2 | Admin shell, navigation and section tabs | ✅ Complete | 5 Oct 2026 | ADM-NAV-01–05 delivered; [local checks](evidence/admin-phase2/checks.json), [browser evidence](evidence/admin-phase2/browser-checks.json); dashboard delivered in Phase 4 |
| 3 | Shared admin visual system and list/detail primitives | ✅ Complete | 5 Oct 2026 | ADM-DS-01–06 delivered; [checks](evidence/admin-phase3/checks.json), [browser evidence](evidence/admin-phase3/browser-checks.json); View sheets remain later-phase work |
| 4 | Dashboard and analytics | ✅ Complete | 5 Oct 2026 | ADM-HOME-01–07 delivered; [contract](ADMIN-DASHBOARD-CONTRACT.md), [checks](evidence/admin-phase4/checks.json), [browser evidence](evidence/admin-phase4/browser-checks.json) |
| 5 | Owner applications and property review | ✅ Complete | 5 Oct 2026 | ADM-REV-01–06 delivered; [checks](evidence/admin-phase5/checks.json), [browser evidence](evidence/admin-phase5/browser-checks.json) |
| 6 | Bookings and booking cases | ✅ Complete | 5 Oct 2026 | ADM-BOOK-01–05 delivered; [checks](evidence/admin-phase6/checks.json), [browser evidence](evidence/admin-phase6/browser-checks.json), [runbook](ADMIN-BOOKING-WORKSPACE.md) |
| 7 | People: owners and customers | ✅ Complete | 5 Oct 2026 | ADM-PEOPLE-01–04 delivered; [checks](evidence/admin-phase7/checks.json), [browser evidence](evidence/admin-phase7/browser-checks.json), [runbook](ADMIN-PEOPLE-WORKSPACE.md); optional sheets deferred |
| 8 | Finance workspace | ✅ Complete | 5 Oct 2026 | ADM-FIN-01–06 delivered; [checks](evidence/admin-phase8/checks.json), [browser evidence](evidence/admin-phase8/browser-results.json), [runbook](ADMIN-FINANCE-WORKSPACE.md); locally verified, not deployed |
| 9 | Guest reviews, support and message delivery | ✅ Complete | 5 Oct 2026 | ADM-COMMS-01–05 delivered; [checks](evidence/admin-phase9/checks.json), [browser evidence](evidence/admin-phase9/browser-results.json), [runbook](ADMIN-COMMUNICATION-WORKSPACE.md); locally verified, not deployed |
| 10 | Operations, privacy, audit and configuration | ✅ Complete | 5 Oct 2026 | ADM-OPS-01–06 delivered; [checks](evidence/admin-phase10/checks.json), [browser evidence](evidence/admin-phase10/browser-results.json), [runbook](ADMIN-OPERATIONS-WORKSPACE.md); locally verified, not deployed |
| 11 | Global search and cross-workspace links | ✅ Complete | 5 Oct 2026 | ADM-SEARCH-01–04 delivered; [checks](evidence/admin-phase11/checks.json), [browser evidence](evidence/admin-phase11/browser-results.json), [runbook](ADMIN-SEARCH-WORKSPACE.md); locally verified, not deployed |
| 12 | Responsive, accessibility, performance and release verification | ✅ Complete | 5 Oct 2026 | ADM-QA-01–07 delivered; [checks](evidence/admin-phase12/checks.json), [browser evidence](evidence/admin-phase12/browser-results.json), [performance](evidence/admin-phase12/performance.json), [runbook](ADMIN-RELEASE-VERIFICATION.md); locally verified, not deployed |

**Status key:** ⏳ Pending · 🔄 In progress · ✅ Complete · 🚧 Blocked.

Update this table and the release table in section 6 together as work progresses. Mark a phase complete only after its acceptance criteria and required checks pass; record its completion date and link supporting evidence in Notes. Keep the progress totals above in sync.

## 1. Reference and current findings

Read this alongside [OWNER-EXPERIENCE-PLAN.md](OWNER-EXPERIENCE-PLAN.md), [OWNER-WORKSPACE-UI.md](OWNER-WORKSPACE-UI.md), [OWNER-EXPERIENCE-REVIEW.md](OWNER-EXPERIENCE-REVIEW.md), and [DESIGN.md](../DESIGN.md).

The original owner plan describes the earlier experience. The later workspace refresh adds filtered tables, URL-driven booking/calendar modals, global search and dashboard analytics. Current owner components and the design document include further surface refinements. Follow the latest implemented patterns per screen rather than copying every original recommendation. In particular, the original mobile-card recommendation has since been supplemented by locally scrollable record tables. The saved dashboard screenshot predates the documented analytics addition; it is evidence of the table/shell composition, not the latest analytics appearance.

### Code-backed observations

| Observation                                                                                          | Evidence                                                                                                                                         | Admin redesign consequence                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Admin home is an application queue, not an overall dashboard                                         | `app/(admin)/admin/page.js` fetches applications, application statistics and recent decisions                                                    | Give `/admin` a true cross-workspace dashboard and move the queue to a dedicated list route                    |
| Navigation has 22 destinations across eight groups                                                   | `components/admin/AdminShell.jsx`, including Help, Publication, Reference data, Work queues, People, Operations, Finance and Compliance & health | Group related tasks behind a small number of clear destinations and local tabs                                 |
| Current sidebar already filters by capabilities                                                      | `AdminShell.jsx`; authenticated layout in `app/(admin)/admin/layout.js`                                                                          | Preserve this filtering, including for dashboard metrics and local tabs                                        |
| Record tabs already exist                                                                            | `components/portal/DetailLayout.jsx`, `AdminBookingDetail.jsx`, `AdminClients.jsx`, `AdminCustomers.jsx`, property detail page                   | Standardize existing tabs; do not rebuild working record workflows                                             |
| Admin search currently fans out to three directories                                                 | `app/(admin)/admin/search/page.js`: clients, customers and applications                                                                          | Broader property/booking search is additional API work, not a placeholder change                               |
| Finance investigation and gateway configuration have separate routes                                 | `/admin/finance/payments` versus `/admin/payments`                                                                                               | Keep Payments and Gateway settings distinct in both navigation and labels                                      |
| Admin writes already use specialized commands                                                        | `lib/actions/admin.js`: review, property lifecycle, refunds, cases, support and incident commands                                                | Retain previews, reasons, authorization, version checks and audit evidence during visual changes               |
| There is an operations endpoint but no dedicated dashboard endpoint in the reviewed admin route file | `rentra-backend/src/routes/admin.route.js`                                                                                                       | Define dashboard aggregation explicitly; existing queue pages cannot supply trustworthy global analytics alone |
| Owner has reusable visual patterns                                                                   | `OwnerTable.jsx`, `OwnerModal.jsx`, `OwnerAnalytics.jsx`, shared portal/UI components                                                            | Reuse presentation where appropriate; keep admin data, permissions and money definitions separate              |
| Admin has separate primitives and badges                                                             | `components/admin/AdminPrimitives.jsx` alongside shared UI primitives                                                                            | Consolidate gradually with parity checks, especially semantic status labels                                    |

These are structural findings. Runtime bugs, query performance and production readiness remain to be verified during implementation.

## 2. Target navigation and tabs

Use a forest-green sidebar, warm off-white workspace, white bordered panels, existing portal typography, clear filters and compact tables. Admin density can be higher than owner density, while keeping essential text readable. Show “Admin workspace” prominently so operators can identify their role.

Keep seven main sidebar destinations, with Help & guide in the footer. Local tabs reveal the selected area's tools. Tab groups may wrap or scroll inside their own container on phones; do not put all tools back into the sidebar.

| Main destination     | Local tabs                                                             | Existing routes to preserve                                                                                            |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Dashboard            | No competing default subtab                                            | `/admin` becomes the overview                                                                                          |
| Reviews & approvals  | Owner applications · Property review · Guest reviews                   | New list route `/admin/applications`; existing `/admin/applications/[id]`, `/admin/properties/**`, `/admin/reviews/**` |
| Bookings             | Booking records · Booking cases                                        | `/admin/bookings/**`, `/admin/booking-cases/**`                                                                        |
| People               | Owners · Customers                                                     | `/admin/clients/**`, `/admin/customers/**`                                                                             |
| Finance              | Payments · Refunds · Statements · Payouts · Disputes                   | `/admin/finance/**`, `/admin/disputes/**`; allocation details remain reachable from statements/bookings                |
| Operations           | Service health · Message delivery · Privacy requests · Audit & exports | `/admin/operations/**`, `/admin/notifications/**`, `/admin/privacy/**`, `/admin/audit/**`                              |
| Settings & content   | Public content · Catalogues · Gateway settings · Operators & security  | `/admin/content/**`, `/admin/catalogues/**`, `/admin/payments`, `/admin/security/**`                                   |
| Footer: Help & guide | Guide · Support inbox                                                  | `/admin/help`, `/admin/support/**`                                                                                     |

Support is reachable directly from the footer and dashboard attention list. Retain an unread/waiting badge there when an authorized aggregate exists; never infer it from the current page. Operators handling support must be able to bookmark its route as their working destination.

### Navigation rules

- Each main item opens the first permitted tab; omit empty groups. A customer-only or finance-only operator must still reach an authorized home.
- Hide tabs without read access. Show a clear read-only state where read access exists without write access. The API remains the authority for every read and write.
- Keep existing child route URLs; new hub routes are optional redirects to a permitted child, not duplicate data screens.
- Match details to their parent section. Exactly one sidebar item and one applicable section tab are active.
- Changing section resets incompatible section filters. Changing list filters resets its page; preserve all remaining compatible query parameters.
- Use navigational links with `aria-current` for route/query navigation. Use ARIA tab semantics and arrow-key behavior only for actual in-place tab panels.
- Rename “Clients” to “Owners” in UI copy while retaining `/admin/clients` and existing API terminology.
- Preserve the current search initially; expand its scope only when the corresponding backend support is delivered.

### Root-route compatibility

Moving applications from `/admin` requires updating `ApplicationQueue`, decision redirects, shell matching, search “See all” links, guide links and test selectors. Preserve recognized old application-filter links such as `/admin?status=...&assignee=...&q=...&page=...` through a compatibility redirect to `/admin/applications`. Reserve distinct dashboard query names, such as `period` and `environment`, to avoid ambiguity. Carry decision feedback to the new queue. Inventory every root application link before switching the root page.

## 3. Dashboard specification

The dashboard must answer: what needs action, what is happening today, and how is the marketplace performing?

### Layout order

1. Heading, one-sentence description, IST period, environment selector, refreshed-at time and Refresh.
2. Urgent attention strip: overdue reviews, payment/refund exceptions, unresolved high-priority cases and service incidents, limited to permitted modules.
3. Four to six summary tiles, chosen from the operator's accessible data.
4. Analytics: booking trend and booked-rent trend, followed by booking-status distribution and review throughput when supported.
5. Needs attention table, then today's visits/bookings table.
6. Recent decisions/activity and a compact service-health panel. Every panel links to its complete filtered destination.

Desktop: summary grid and two-column analytics; wide attention and booking tables below. Tablet: two tiles per row and stacked charts. Phone: stacked panels, locally scrollable tables, secondary filters under Filters, visible period and Refresh controls. Avoid duplicating the whole navigation as dashboard tiles.

### Metric contract

| Metric                     | Definition and required drill-down                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Waiting owner applications | Submitted applications awaiting decision, with unassigned and overdue breakdowns; opens the matching queue                                      |
| Properties awaiting review | Submitted property revisions needing review, separate from published-property count and scheduled verification visits                           |
| Bookings created           | Booking orders created in selected IST period, with documented inclusion/exclusion states; count orders once regardless of visit count          |
| Today's visits             | Visits on today's IST date; separate arrival, departure and hourly visits where data supports it; never label visit count as booking count      |
| Booked rent                | Rent attributed to an explicitly documented date basis; exclude cancelled rent, guest fees and deposits; does not mean collected cash or payout |
| Captured payments          | Provider capture evidence in the selected period and environment; show separately from booked rent                                              |
| Refunds                    | Distinguish requested/pending amounts from successful refund evidence; do not subtract pending refunds as settled cash                          |
| Open cases/support         | Unresolved queue totals, not page lengths; separate categories and their actual priority/SLA rules                                              |

For every metric return its unit, date basis, IST boundaries, environment, filters, generated-at time and permitted drill-down. Keep “Waiting now” tiles separate from selected-period analytics. Never display a missing or failed metric as zero. Zero is a valid result; absent provider evidence is “Unavailable”.

Default to Live financial data; expose Test and any supported simulated namespace explicitly. Do not blend environments into a revenue figure. Reuse owner chart colors, controls and accessible data-table patterns without reusing its owner-only aggregation assumptions. Daily series must include zero-value dates; status charts must state whether they represent bookings created in the period or current states. Twelve-month trends are a follow-up once daily aggregation is correct.

### Proposed dashboard API — new work

Add a capability-filtered `GET /api/v1/admin/dashboard` (route path `/dashboard` in the admin router) and `adminApi.dashboard()` after agreeing the contract. Suggested inputs: `period=today|7d|30d|90d` and a validated supported environment. Suggested response sections: `scope`, `summary`, `attention`, `dailySeries`, `distributions`, `todayVisits`, `recentActivity`, `health`, and per-section availability.

Aggregations must execute on the server across the full matching dataset. Omit unauthorized sections without revealing restricted counts or financial totals. If a module fails, return or compose a truthful partial state and let that panel retry. Audit existing operations queries for reuse rather than importing its entire sensitive payload into the home screen. No database migration is assumed: measure query plans first and add indexes only if needed. Do not invent historical queue-backlog charts from today's queue.

## 4. Shared screen contracts

### Lists

Heading → section tabs → optional meaningful totals → URL-backed search/filter strip → results count → table → shared pagination. Keep status, assignee and date filters close to the records. Defaults must reflect supported API states. Add sort/page-size controls only after validating or extending the backend query contract.

Tables use explicit column headers, semantic captions, visible reference/name links and labelled row actions. Keep status and the next action easy to scan. Confine horizontal scroll to the table. Use the shared `ui/pagination.jsx`; total counts and page sizes must reflect actual API behavior. Filtered-empty, no-records, failed-load and forbidden states are distinct.

### Details and modals

Identity/reference → state/environment → meaningful facts → record tabs → focused content and actions → history. Preserve direct detail URLs. Offer View in a large side sheet for fast booking/people inspection, with Full page and an exact return to the filtered list. Keep complex application/property decisions and finance investigations on full pages initially; a drawer must never omit required evidence or hide a consequence.

Modal URLs identify the record and preserve list context. Refresh, copied links, Back/Forward, Escape and close must work. Restore focus to the invoking row, trap focus and protect unsaved edits on every close/navigation path. Validate return URLs as local allowed admin paths. Adapt presentation primitives rather than copying owner-specific routing/session hooks wholesale.

### Actions and state

One primary action per task. Keep pending buttons disabled with meaningful progress text; retain form values after failure. Destructive or financial actions show target, reason, consequence and the existing preview/confirmation sequence. On a stale version/token, reload or re-preview with an explanation; never silently retry a changed financial command. Preserve request-key/idempotency semantics.

Skeletons match each screen's layout. Background refresh retains records and labels stale data. Session expiry offers a sign-in recovery path. Success feedback must survive revalidation/remount. Shared status mapping must be domain-aware: property review, account restriction, payment, visit and export states are not interchangeable. Display raw technical IDs/enums only in labelled diagnostic/evidence sections.

## 5. Implementation phases

Phases 1–12 are **Complete (locally verified)**; nothing is deployed. Phase 1 establishes the baseline; Phases 2–4 create the shared foundation and dashboard; the remaining modules ship incrementally. Each phase includes its own verification before proceeding.

### Phase 1 — Admin inventory and behavior baseline

**IDs:** ADM-AUD-01–03 · **Priority:** High · **Depends on:** none.

Inventory every admin route, query parameter, capability, action, detail tab and redirect. Include login/2FA, private files, exports, allocation details and routes absent from navigation. Compare latest owner components against older documentation per surface. Capture permitted full-access/read-only/restricted-role screens with disposable data at 360, 768 and 1280 px.

**Files:** `app/(admin)/admin/**`, `components/admin/**`, `components/portal/**`, `lib/api/endpoints.js`, `lib/actions/admin.js`, `lib/services/admin.service.js`; backend `src/routes/admin.route.js` and corresponding controllers/services.

**Backend/database:** read-only mapping; identify missing aggregates and supported list controls.

**Acceptance/QA:** route/capability matrix, existing action invariants, root-route link inventory and baseline screenshots recorded. Separate verified runtime findings from code-review observations. Do not treat historical owner checks as admin passes.

#### Phase 1 delivery record — 4 October 2026

**Status: audit complete.** ADM-AUD-01 (inventory), ADM-AUD-02 (latest owner pattern comparison) and ADM-AUD-03 (disposable runtime baseline) are delivered. This is completion of the audit, not approval of the current UI for release. No production application code or schema was changed.

**Reviewed revisions:** frontend `767f7e8`, backend `97e902e`. The new plan was untracked when this phase began. Browser verification used a separate frontend on port 3161, a fixture API on port 4161 and an isolated PostgreSQL 14 cluster on port 55461. The existing app on ports 3000/4000 was not used. Fixture sessions, credentials and database URLs remain in private temporary files and are not included in committed evidence.

##### ADM-AUD-01 — Complete route and capability inventory

There are **51 admin page routes, 11 private file handlers and 114 authenticated API method/path pairs (61 GET, 53 POST)** in the reviewed admin router. All 114 API entries map to a known capability. Authentication adds four endpoints in its separate router: POST login, POST enrollment, POST logout and GET me. GET me requires a valid admin session; enrollment uses an expiring private token. The page matrix below records routing requirements; it does not imply every displayed subrecord has a separate domain permission check.

Machine-readable sources: [frontend route inventory](evidence/admin-phase1/frontend-routes.json), [expanded API/capability inventory](evidence/admin-phase1/api-routes.json), and [root-link inventory](evidence/admin-phase1/root-links.json). Frontend inventory entries include the exact source path and adapter calls; backend method/path entries were read from Express's registered route stack, including loop-generated verification commands.

| Frontend route                                         | Kind | Read requirement                                               | Existing URL controls                                                                     |
| ------------------------------------------------------ | ---- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/admin/applications/[id]`                             | page | `admin.applications.read`                                      | `from`, `tab`                                                                             |
| `/admin/audit/events/[id]`                             | page | `admin.audit.read`                                             | —                                                                                         |
| `/admin/audit/exports/[id]/download`                   | file | `admin.audit.read`                                             | —                                                                                         |
| `/admin/audit/exports/[id]`                            | page | `admin.audit.read`                                             | —                                                                                         |
| `/admin/audit/exports/[id]/receipt`                    | file | `admin.audit.read`                                             | —                                                                                         |
| `/admin/audit/exports`                                 | page | `admin.audit.read`                                             | —                                                                                         |
| `/admin/audit`                                         | page | `admin.audit.read`                                             | `from`, `to`, `actorType`, `actorId`, `action`, `entity`, `target`, `correlation`, `page` |
| `/admin/booking-cases/[id]`                            | page | `admin.records.read`                                           | —                                                                                         |
| `/admin/booking-cases`                                 | page | `admin.records.read`                                           | `state`, `type`, `assigned`, `q`, `page`                                                  |
| `/admin/bookings/[orderId]/attachments/[attachmentId]` | file | `admin.records.read`                                           | —                                                                                         |
| `/admin/bookings/[orderId]/calendar`                   | file | `admin.records.read`                                           | —                                                                                         |
| `/admin/bookings/[orderId]`                            | page | `admin.records.read`                                           | `from`, `tab`                                                                             |
| `/admin/bookings/[orderId]/summary`                    | file | `admin.records.read`                                           | —                                                                                         |
| `/admin/bookings`                                      | page | `admin.records.read`                                           | `tab`, `page`, `q`, `vertical`, `from`, `to`, `event`, `property`, `resource`             |
| `/admin/catalogues/[type]/[id]`                        | page | `admin.catalogues.read`                                        | —                                                                                         |
| `/admin/catalogues/[type]`                             | page | `admin.catalogues.read`                                        | `q`, `status`, `page`                                                                     |
| `/admin/catalogues`                                    | page | `admin.catalogues.read`                                        | —                                                                                         |
| `/admin/clients/[id]`                                  | page | `admin.clients.read`                                           | `from`, `tab`                                                                             |
| `/admin/clients`                                       | page | `admin.clients.read`                                           | `q`, `status`, `page`                                                                     |
| `/admin/content/[kind]`                                | page | `admin.content.read`                                           | `historyPage`                                                                             |
| `/admin/content`                                       | page | `admin.content.read`                                           | —                                                                                         |
| `/admin/customers/[id]`                                | page | `admin.customers.read`                                         | `from`, `tab`                                                                             |
| `/admin/customers`                                     | page | `admin.customers.read`                                         | `q`, `status`, `page`                                                                     |
| `/admin/disputes/[id]/attachments/[fileId]`            | file | `admin.payments.read`                                          | —                                                                                         |
| `/admin/disputes/[id]`                                 | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/disputes/new`                                  | page | `admin.payments.read`                                          | `order`                                                                                   |
| `/admin/disputes`                                      | page | `admin.payments.read`                                          | `state`, `kind`, `page`, `orderId`                                                        |
| `/admin/documents/[id]`                                | file | `admin.documents.read`                                         | —                                                                                         |
| `/admin/enroll`                                        | page | `Private one-time token; no admin session required`            | `#token (URL fragment)`                                                                   |
| `/admin/finance/allocations/[id]`                      | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/finance/payments/[id]`                         | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/finance/payments`                              | page | `admin.payments.read`                                          | `environment`, `state`, `attention`, `q`, `from`, `to`, `page`                            |
| `/admin/finance/payouts/[id]`                          | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/finance/payouts`                               | page | `admin.payments.read`                                          | `period`, `environment`, `propertyId`, `ownerId`, `page`                                  |
| `/admin/finance/refunds/[id]`                          | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/finance/refunds/new`                           | page | `admin.payments.read`                                          | `order`                                                                                   |
| `/admin/finance/refunds`                               | page | `admin.payments.read`                                          | `environment`, `status`, `source`, `q`, `page`                                            |
| `/admin/finance/statements/[id]/download`              | file | `admin.payments.read`                                          | `period`, `environment`, `propertyId`, `ownerId`, `page`                                  |
| `/admin/finance/statements/[id]`                       | page | `admin.payments.read`                                          | `period`, `environment`, `propertyId`, `ownerId`, `page`                                  |
| `/admin/finance/statements`                            | page | `admin.payments.read`                                          | `period`, `environment`, `propertyId`, `ownerId`, `page`                                  |
| `/admin/help`                                          | page | `Admin session; articles capability-filtered`                  | —                                                                                         |
| `/admin/login`                                         | page | `Public credential form; existing-admin redirect`              | `reauthenticate`, `session`                                                               |
| `/admin/notifications/[id]`                            | page | `admin.notifications.read`                                     | —                                                                                         |
| `/admin/notifications`                                 | page | `admin.notifications.read`                                     | `page`                                                                                    |
| `/admin/operations/incidents/[code]`                   | page | `admin.operations.read`                                        | —                                                                                         |
| `/admin/operations`                                    | page | `admin.operations.read`                                        | —                                                                                         |
| `/admin`                                               | page | `admin.applications.read`                                      | `status`, `assignee`, `q`, `page`, `decided`                                              |
| `/admin/payments`                                      | page | `admin.payments.read`                                          | —                                                                                         |
| `/admin/privacy/[id]/export`                           | file | `admin.privacy.read`                                           | —                                                                                         |
| `/admin/privacy/[id]`                                  | page | `admin.privacy.read`                                           | —                                                                                         |
| `/admin/privacy/[id]/receipt`                          | file | `admin.privacy.read`                                           | —                                                                                         |
| `/admin/privacy`                                       | page | `admin.privacy.read`                                           | `state`, `page`                                                                           |
| `/admin/properties/[id]`                               | page | `admin.properties.read`                                        | `from`, `tab`, `revision`                                                                 |
| `/admin/properties`                                    | page | `admin.properties.read`                                        | `status`, `assignee`, `q`, `page`                                                         |
| `/admin/reviews/[id]`                                  | page | `admin.reviews.read`                                           | —                                                                                         |
| `/admin/reviews`                                       | page | `admin.reviews.read`                                           | `page`                                                                                    |
| `/admin/search`                                        | page | `Per-section applications/clients/customers read capabilities` | `q`                                                                                       |
| `/admin/security/[id]`                                 | page | `admin.security.read`                                          | —                                                                                         |
| `/admin/security`                                      | page | `admin.security.read`                                          | `q`, `status`, `page`                                                                     |
| `/admin/support/[id]/attachments/[attachmentId]`       | file | `admin.support.read`                                           | —                                                                                         |
| `/admin/support/[id]`                                  | page | `admin.support.read`                                           | —                                                                                         |
| `/admin/support`                                       | page | `admin.support.read`                                           | `state`, `participant`, `assignment`, `page`                                              |

`[id]` is an entity UUID except statement IDs, which are `YYYY-MM`. Catalogue `[type]` supports cities, areas, categories, amenities and the inline verticals registry. The current catalogue detail page allows only the first four types and `new`/UUID IDs; vertical editing happens in the registry list. `/admin/catalogues` redirects to Categories. API paths use `/records` for booking pages and `/payments/finance` or `/payments/disputes` for finance/dispute pages. File handlers proxy private bytes rather than returning page data.

**Default order and pagination:** applications/properties/people/cases/support/security/privacy use fixed 20-row pages in their existing contracts; reviews, notification delivery, finance records and disputes use 30-row windows or view pagination; catalogues and audit events use 25 rows. Most lists do not support selectable page size or arbitrary sorting. Application waiting order is oldest-first, other application states use latest update; people use newest-first; cases prioritize open/oldest; catalogues use configured order/name; audit uses newest-first. These existing semantics must survive UI changes. Passing a new `size` or `sort` query parameter does not establish backend support.

| Domain                    | Read capability            | Write capability            | Existing write operations / authoritative source                                                                                                                                    |
| ------------------------- | -------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applications              | `admin.applications.read`  | `admin.applications.write`  | Assign/claim/release, approve, request information, reject; `services/admin/applications.js`, `auth/admin-actions.js`                                                               |
| Properties                | `admin.properties.read`    | `admin.properties.write`    | Assign, decide, schedule/reschedule/cancel verification, record outcome, publish, hide/restore/correct; `admin/listings.js`, `admin/verification.js`, `admin/property-lifecycle.js` |
| Owners                    | `admin.clients.read`       | `admin.clients.write`       | Suspend/reinstate, fail payout destination; `admin/clients.js`, `payouts/destinations.js`                                                                                           |
| Customers                 | `admin.customers.read`     | `admin.customers.write`     | Restrict/reinstate, revoke sessions, correct permitted profile fields; `admin/customers.js`                                                                                         |
| Documents                 | `admin.documents.read`     | `admin.documents.write`     | Private document file access and document review; `auth/document-file.js`, `auth/admin-actions.js`                                                                                  |
| Booking records/cases     | `admin.records.read`       | `admin.records.write`       | Visit/evidence/incident commands; create/assign/update/preview/resolve case; `booking/visit-lifecycle.js`, `booking/booking-cases.js`, case actions                                 |
| Payments/finance/disputes | `admin.payments.read`      | `admin.payments.write`      | Gateway settings, reconcile payments/refunds, preview/request refund, create/reply/manage dispute; payment, finance and dispute services                                            |
| Guest reviews             | `admin.reviews.read`       | `admin.reviews.write`       | Preview/moderate, resolve report; `reviews/service.js`                                                                                                                              |
| Support                   | `admin.support.read`       | `admin.support.write`       | Reply with private attachments, assign/manage/escalate; `support/service.js` and support management                                                                                 |
| Message delivery          | `admin.notifications.read` | `admin.notifications.write` | Existing notification management/reconciliation commands; `notifications/actions.js`                                                                                                |
| Privacy                   | `admin.privacy.read`       | `admin.privacy.write`       | Start review and fulfillment review/preview/queue/retry; `customer/privacy-fulfillment.js`                                                                                          |
| Audit/exports             | `admin.audit.read`         | `admin.audit.write`         | Create/retry governed export; `admin/audit-browser.js`                                                                                                                              |
| Operators/security        | `admin.security.read`      | `admin.security.write`      | Create/access/revoke, issue/cancel enrollment/recovery; `admin/operators.js`                                                                                                        |
| Public content            | `admin.content.read`       | `admin.content.write`       | Save/restore/review/preview/publish; `content/service.js`                                                                                                                           |
| Catalogues                | `admin.catalogues.read`    | `admin.catalogues.write`    | Save/replace catalogue records and registry configuration; `catalogues/service.js`                                                                                                  |
| Service health            | `admin.operations.read`    | `admin.operations.write`    | Existing incident commands; `operations/overview.js`, `operations/incidents.js`                                                                                                     |

Capabilities are not a role hierarchy: 16 domains produce 32 grants. An active admin with null permissions has full access; an explicit list grants only listed capabilities. Record ownership/actor checks and fresh authentication may add restrictions beyond route permission. Governed payment exports additionally require payment read access; operation-receipt exports additionally require record read access. Keep these service checks when moving pages.

**Current detail tabs:** applications: Overview, Documents, Decision, Activity log; properties: Submitted property, Review & decision, Verification & publication, Visibility & corrections, History & activity; bookings: Visits, Payments, Guest & arrival, Cases, Records; owners: Overview, Properties, Upcoming visits, Application, Account details, Payout method, Activity log; customers: Overview, Bookings, Support, Reviews, Privacy, Account details, Activity log. Tabs use URL links through `DetailLayout.jsx`. Cases, support, security and finance investigations mostly use sections rather than these record tabs. Adding tabs must reorganize their existing content, not drop it.

##### Root-route migration checklist for Phase 2

The [root-link inventory](evidence/admin-phase1/root-links.json) records **34 source references**. Some are generic home links or route-prefix builders; they must not all be blindly replaced.

| Location                                      | Application-specific behavior to migrate                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `components/admin/ApplicationQueue.jsx`       | Queue URL builder, GET search form, filters, pagination and detail `from` context                       |
| `app/(admin)/admin/page.js`                   | Queue reads, statistics, recent decisions and `decided` feedback; move to the new application list page |
| `components/admin/AdminShell.jsx`             | Applications href/matcher; root becomes Dashboard, detail matching stays with applications              |
| `app/(admin)/admin/applications/[id]/page.js` | Default Applications back link and safe filtered return                                                 |
| `app/(admin)/admin/search/page.js`            | Application “See all” link currently uses `/admin?status=all&q=...`                                     |
| `components/portal/OperatorHelp.jsx`          | Application queue guide link                                                                            |
| `lib/actions/admin.js`                        | Application assignment revalidation currently targets `/admin`                                          |
| Backend `src/services/auth/admin-actions.js`  | Decision redirect `/admin?decided=...`                                                                  |
| `app/(admin)/admin/not-found.js`              | Root link label currently says “Go to applications queue”                                               |

Keep login success, logo home and general error/home links at `/admin` once it becomes the dashboard. Preserve shared `/admin` prefix builders for booking/review/finance links. Handle recognized legacy application query links before introducing dashboard filters. The `safeReturnPath` helper preserves same-section paths; validate compatibility with the new queue and modal return paths.

##### Command invariants to preserve

| Workflow                 | Existing invariant                                                                                                                                                                        | Evidence layer in Phase 1                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Admin sign-in            | Separate `rentra_admin` cookie/audience, durable session, account deactivation/revocation; provisioned account only; TOTP when enrolled and mandatory in production                       | Code, portal integration, local missing/valid-TOTP API checks; production hard-stop not exercised here     |
| Application review       | Review-version compare, explicit reason for corrections/rejection, strikes, assignment and audit; three outcomes remain distinct                                                          | Existing application-review integration passed                                                             |
| Property publication     | Immutable submitted revision; completed, passed verification with checklist/findings for the exact revision; publication distinct from inventory readiness                                | Property-review and verification/publication integrations passed                                           |
| Account controls         | Lifecycle/profile version guards; restriction affects new business while confirmed visits remain; session revocation retained                                                             | Client/customer/portal integrations passed                                                                 |
| Visit/evidence/cases     | Visit state order, exact affected visits, evidence history, scoped attachments, case preview/version/request-key guards                                                                   | Visit-evidence and booking-case integrations passed                                                        |
| Money/refunds            | Verified capture evidence, environment separation, full-dataset/per-order sums, bounded remaining refund, hash/preview guards and single-dispatch handling of uncertain provider outcomes | Payment-investigation and refund-operation integrations passed                                             |
| Support                  | Version and request key, internal versus participant-visible messages, assignment/escalation and private attachment access                                                                | Extended support integration passed; eight denied private-file probes recorded separately                  |
| Operator security        | Fresh authentication, write grant, audited access change, session revocation, private enrollment/recovery and last-super-admin protection                                                 | Operator integration passed                                                                                |
| Privacy/governed exports | Scoped identity, preview/confirmation, reason, fresh authentication where required, dataset permission, encrypted expiring artifacts and receipts                                         | Privacy/audit integrations passed; no production exports generated                                         |
| Content/catalogues       | Version/review/preview/publication, immutable public history and booking acceptance; catalogue structural-change restrictions                                                             | Catalogue integration passed; content integration failed at a fixed history-count assertion (see findings) |

Frontend command boundaries are spread across `lib/actions/admin.js`, `auth.js`, `audit.js`, `catalogues.js`, `content.js`, `disputes.js`, `operators.js` and `privacy.js`. Some flows use server actions and `runApiAction` redirect/revalidation metadata; others post JSON through dedicated actions. Admin pages currently use server-side API adapters; the RTK admin service exists but no `useGetAdmin*`/`useReplyAdmin*` usage was found in pages/components. Do not introduce a second admin cache/session model as part of a visual rewrite without a separate decision.

##### ADM-AUD-02 — Latest owner patterns and admin adaptation

| Surface          | Current owner evidence                                                                                                                                              | Admin direction                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell/home       | Current `PartnerShell.jsx` says Dashboard; original specification says Today. Five main destinations plus secondary tools; header search and guarded account switch | Keep the Admin identity; use grouped admin section tabs; no admin-to-customer impersonation switch                                                 |
| Dashboard        | `OwnerAnalytics.jsx` and updated workspace documentation add scoped trends, distributions, refresh/CSV and data tables after the saved initial screenshot           | Copy visual hierarchy and accessible controls; implement separate full-platform aggregates and money definitions                                   |
| Bookings         | Updated owner tables and `OwnerModal.jsx` preserve detail URLs and list context                                                                                     | Introduce booking inspection sheets only after full-record, role and unsaved-form parity                                                           |
| Properties       | Current `DESIGN.md` describes photography-led portfolio/overview refinements; older workspace refresh describes a table pass                                        | Admin review remains a dense queue with thumbnail/context and submitted-versus-published comparison; do not copy a portfolio grid indiscriminately |
| Calendar         | Older plan specifies grid/drawer; later refresh uses property selection and a large calendar modal                                                                  | Retain visit links and property review context; platform editable calendar is not included                                                         |
| Earnings         | Booked rent and payout availability are explicitly distinct; chart and month scopes are labelled                                                                    | Finance keeps evidence, environments, refund uncertainty and actual payout availability                                                            |
| Forms/states     | Shared fields, `ValidationSummary`, guarded navigation, semantic badges, durable feedback and matching skeletons                                                    | Reuse shared behavior; verify admin command context and control permissions independently                                                          |
| Support/settings | Subject-led conversations, focused tasks and disclosure for secondary evidence                                                                                      | Match hierarchy while retaining internal notes, operator management and audit controls                                                             |

No live owner regression was performed in this phase. Current owner documentation, components and saved screenshots were inspected; their earlier tests are not counted as new admin evidence.

##### ADM-AUD-03 — Runtime baseline and findings

[Browser baseline](evidence/admin-phase1/browser-checks.json): **126 recorded views** (90 full-access, 15 read-only, 12 records-only and 9 customer-reader) at **360, 768 and 1280 px**, plus three login screenshots. **36 explicit checks passed**: record/application tab and return context, restricted navigation, 15 forbidden read probes, 16 forbidden write probes, unsigned session denial, and missing/valid TOTP behavior. The corrected read-only fixture was rerun independently; its 15 screens replaced the initial incorrectly encoded fixture results.

All 126 views had no recorded page-width overflow or WCAG 2 A/AA / 2.1 A/AA axe violations. **Three hydration errors were recorded**, all on the same operator detail route across the three widths; the baseline is not error-free. Accessibility results apply to rendered fixture states, not every possible form, populated ledger or private-file preview.

Additional [observations](evidence/admin-phase1/observations.json) record enabled read-only decision buttons, unavailable owner-guide editing, eight forbidden private-file handlers and mobile drawer focus/Escape/return behavior. [Sanitized role API probes](evidence/admin-phase1/role-api-probes.json) separate valid sessions from forbidden modules.

| Finding                                                                | Evidence / impact                                                                                                                                                                                                                                          | Follow-up phase                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ADM-F01 · High · Restricted-role home shows an outage message          | Browser-confirmed records-only/customer-reader `/admin` displays “This page could not load”; their permitted directories work and application API returns 403. Root calls application endpoints without a capability-aware home or settled forbidden state | Resolved locally in Phases 2 and 4; capability-scoped dashboard verified                   |
| ADM-F02 · Medium · Read-only reviewers receive enabled write controls  | Browser-confirmed Assign to me / Approve / Need more info / Reject on application decision tab for an all-read operator; write API correctly returns 403. Application page does not pass a write grant to these panels                                     | Application assignment/decision controls resolved locally in Phase 3; application/document/property grants verified in Phase 5; other module grants remain later-phase checks |
| ADM-F03 · High · Owner guide content cannot be edited through admin UI | Full admin GET `/admin/content/owner_help` API returns 200, frontend shows Record not found. Both frontend content page and `lib/actions/content.js` allowlists omit `owner_help`, while the backend and editor recognize it                               | Resolved Phase 10; route/action/archive allowlist parity and browser publication verified                     |
| ADM-F04 · Medium · Operator detail hydration mismatch                  | Three browser page errors; `OperatorSecurity.jsx` uses implicit-locale `toLocaleString()` for session/history dates. Node rendered `10/4/2026, 11:08:38 PM`, Chrome rendered `04/10/2026, 23:08:38`                                                        | Resolved locally in Phase 3 with deterministic IST formatting and browser verification |
| ADM-F05 · Medium · Content integration assertion is stale              | Existing integration expected four history entries at line 204, observed five. Code now includes a third built-in policy version, `2026-10-04`. No application/test fix is included in this audit                                                          | Resolved Phase 10; assert preserved seeded versions plus two new publications, CP25 passes |
| ADM-F06 · Medium · Guest-review summaries use bounded rows as totals   | Code-reviewed `AdminReviewQueue.jsx` counts Pending/Published from the current 30-row window and Open reports from up to 30 reports; only “On this page” explicitly states its scope                                                                       | Phase 9; relabel page scope or add authoritative aggregates              |
| ADM-F07 · Low · Search affordance excludes application-only operators  | Code-reviewed shell shows search only for clients/customers read capabilities, despite the search page also supporting applications                                                                                                                        | Resolved locally in Phase 2; expanded search remains Phase 11                |

**Existing integration baseline:** [results](evidence/admin-phase1/integration-tests.json) — **27 tests, 26 passed, 1 failed, 0 skipped** against disposable local databases. Failure ADM-F05 is recorded without changing the assertion. The run covers the audited admin domains and portal boundaries; it is not a full repository CI run. The failing content test stops at its assertion, so later assertions in that test are not verified by this run.

**Representative screenshots:** [desktop home](evidence/admin-phase1/full-1280-01.png), [mobile home](evidence/admin-phase1/full-360-01.png), [booking record](evidence/admin-phase1/full-1280-26.png), [read-only decision](evidence/admin-phase1/readonly-application-actions.png), [owner-guide missing page](evidence/admin-phase1/owner-guide-unreachable.png). Every baseline row links its matching screenshot filename in the evidence directory.

**Coverage boundaries:** all route families are inventoried, but runtime screenshots cover 30 representative full-access destinations/detail states, not all 51 pages. Private downloads were tested for denied access; successful provider-backed document preview, populated finance ledgers, export execution, production 2FA configuration, actual notification delivery and PostGIS behavior were not exercised. Local PostgreSQL substitutes nullable text geometry through the existing disposable helper. No provider requests or external delivery were enabled; browser external requests were blocked in the main baseline.

##### Reusable Phase 1 verification

The fixture is [admin-experience-browser.mjs](../../rentra-backend/test/helpers/admin-experience-browser.mjs); the browser harness is [admin-baseline.mjs](../scripts/portal-gate/admin-baseline.mjs). The fixture refuses a nonlocal database server through `createDisposableDatabase`, creates a new `rentra_test_*` database, seeds fake operators/accounts, writes private fixture JSON with mode 0600 and exposes a loopback-only API. Do not load the application `.env` for this fixture. Stop its process with SIGTERM to drop the created database; stop the isolated frontend and temporary PostgreSQL cluster after capture.

Supply `PORTAL_TEST_DATABASE_URL` for a disposable localhost PostgreSQL server, `ADMIN_BASELINE_FIXTURE` for a private temporary file, `ADMIN_BASELINE_EVIDENCE_DIR` for output, and optional `ADMIN_BASELINE_API_PORT`/`GATE_WEB_ORIGIN`. From the backend directory:

```sh
node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs
```

From the frontend directory, start a separate fixture build/cache and matching API URL:

```sh
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=admin-phase1 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:4161/api/v1 \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3161 \
npm run dev -- --webpack --hostname 127.0.0.1 --port 3161
```

Supply `ADMIN_BASELINE_FIXTURE`, `ADMIN_BASELINE_EVIDENCE_DIR`, `PLAYWRIGHT_MODULE` (absolute installed module entry), and optional `CHROME_PATH`, `GATE_WEB_ORIGIN`, `GATE_API_ORIGIN`; then:

```sh
node scripts/portal-gate/admin-baseline.mjs
```

`ADMIN_BASELINE_ROLES=readonly` limits a follow-up run to that fixture role and writes its own result set; use a separate output directory when retaining earlier evidence. The harness records existing errors/violations rather than fixing them. Review recorded errors and screenshots even when explicit checks pass. Fixture helper startup/cleanup, syntax, targeted ESLint and formatting were checked for the delivered scripts. No production build was necessary because no runtime application code changed.

**Next phase:** Phase 2, with ADM-F01 and the application root-link checklist carried into its acceptance criteria. ADM-F02–07 remain explicitly assigned above; audit completion does not close them.

### Phase 2 — Admin shell, navigation and section tabs

**IDs:** ADM-NAV-01–05 · **Priority:** High · **Depends on:** Phase 1.

Implement the navigation map in section 2 with reusable section navigation and proper detail matching. Introduce `/admin/applications`, migrate queue references and implement legacy-filter redirects before replacing root content. Retain search, admin identity, sign-out and 2FA warning. Put Help and Support where they remain readily reachable. Mobile uses the existing drawer rather than a bottom bar containing every admin tool.

**Files:** `AdminShell.jsx`, admin layout/root, new applications list page, `ApplicationQueue.jsx`, admin actions/search, `PortalShell.jsx`, `NavDrawer.jsx`, `DetailLayout.jsx`.

**Backend/database:** none expected for grouping/routes. Badge additions require authorized aggregate support.

**Acceptance/QA:** each existing destination reachable; old application links and decision feedback work; details activate the correct parent; restricted roles see only allowed tabs; keyboard and mobile navigation work; owner/customer shells remain unchanged by shared-component edits.

#### Phase 2 completion record · 5 October 2026

**Delivered:** ADM-NAV-01–05. Implemented and locally verified; not deployed. Seven main destinations open the first permitted child, with Help & guide and authorized Support inbox in the footer. Section navigation uses links and `aria-current`, hides unauthorized tabs, identifies read-only access and matches details to their section. Allocation details activate Finance → Statements; gateway settings activate Settings & content. Existing drawer, search, admin identity, sign-out and 2FA warning remain available. Admin-only wrapping and footer configuration preserve owner shell defaults.

Moved the queue, statistics, recent decisions and feedback to `/admin/applications`. Migrated forms/filter links/detail context, breadcrumbs, search and guide links, assignment revalidation, backend decision redirects, not-found copy and CP05 gate URLs. Recognized root queue queries redirect with their parameters. Generic login/logo/home links remain `/admin`. Root provides an authenticated, capability-aware entry page without application reads; overview metrics remain Phase 4 work. ADM-F01 and ADM-F07 are resolved locally. Application-only operators can search, and each directory's read grant is checked before fetching. UI copy uses Owners while retaining `/admin/clients` and backend terminology.

**Changed files:** `components/admin/{AdminShell,AdminSectionNav,ApplicationQueue,AdminClients}.jsx`, `components/portal/{PortalShell,OperatorHelp}.jsx`, `lib/domain/admin-navigation.js`, `lib/actions/admin.js`, admin home, new application list, application detail, people metadata, search and not-found routes; backend `src/services/auth/admin-actions.js`. Verification adds `test/admin-navigation.test.js`, `scripts/portal-gate/admin-navigation.py`, backend `test/helpers/admin-navigation-browser.mjs` and updates `scripts/portal-gate/cp05_gate.py`. `NavDrawer`, `DetailLayout`, admin layout and customer components required no changes.

**API/database:** no new endpoints, capabilities, schema or application migrations. The existing decision command returns the new queue URL. Disposable localhost PostgreSQL fixtures applied the existing migration journal; production database and providers were not exercised. The Phase 1 helper named above is absent in this checkout; Phase 2 supplies its own narrow fixture. Historical Phase 1 evidence and baseline harness remain unchanged.

**Verification:** [check record](evidence/admin-phase2/checks.json), [37 browser checks, zero page errors](evidence/admin-phase2/browser-checks.json), screenshots at [1280 px](evidence/admin-phase2/applications-1280.png), [768 px](evidence/admin-phase2/applications-768.png), [360 px](evidence/admin-phase2/applications-360.png) and [application detail](evidence/admin-phase2/application-detail-1280.png). Frontend tests: 89 passed. Application-review integration: 1 passed, no skips, covering assignment, all decision outcomes, stale-state protection and resubmission. Changed-file ESLint/Prettier and production build pass. Browser roles: full, all-read, records-only, customer-reader, finance-reader, application-reader and no operational grants. Checks cover restricted home, first-permitted navigation, direct API denial, legacy query/feedback redirects, filtered breadcrumbs, section filter reset, gateway separation, viewport containment, drawer/keyboard focus, scoped search, a real correction-command redirect, read-only mutation refusal, sign-out and owner help shell parity.

**Limitations / remaining work:** repository-wide lint reports 418 formatting errors in existing `.impeccable/review` scripts and three image warnings; repository-wide formatting reports `Rentra_Post_Development_Launch_Roadmap.md`. Build passed with public sitemap policy fetch warnings from an unavailable configured API. The design detector reported inherited queue typography and an existing owner-record action border, deferred to Phase 3. Existing mobile queue row density and enabled read-only decision controls remain module work (ADM-F02); the new section banner does not claim those controls were repaired. ADM-F03–06 remain assigned to later phases. These checks cover navigation and representative pages, not every production workflow or the Phase 12 full regression journey.

To reproduce, initialize a disposable localhost PostgreSQL server, set `PORTAL_TEST_DATABASE_URL` and a private `ADMIN_NAV_FIXTURE` path, then run `node --import ./loader/register.mjs test/helpers/admin-navigation-browser.mjs` from the backend. Start the frontend with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=admin-phase2`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:4162/api/v1` and `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3162`, using `npm run dev -- --webpack --hostname 127.0.0.1 --port 3162`. With the same fixture path, run `python scripts/portal-gate/admin-navigation.py` (Python Playwright and Chrome required). Use a fresh fixture per run; the gate records a correction decision and signs out the full operator. Run the fixture in an interactive terminal; send `stop` or Ctrl+C to drop its database, stop the frontend, then stop the isolated PostgreSQL cluster. On Windows, stopping the isolated temporary cluster and removing its data directory also disposes of the fixture databases. Tokens remain only in the private temporary fixture, never in evidence.

**Next phase:** Phase 3 — shared admin visual system and list/detail primitives. Release A1 remains in progress until Phase 3 is complete.


### Phase 3 — Shared admin visual system and list/detail primitives

**IDs:** ADM-DS-01–06 · **Priority:** High · **Depends on:** Phase 2.

Standardize page headers, metric tiles, filters, tables, pagination, badges, forms, empty/error/loading states and record detail layout using current Rentra tokens. Add a shared table abstraction only where it removes duplication. Consolidate `AdminPrimitives` gradually; preserve callers while migrating. Establish the modal behavior contract before enabling View sheets.

**Files:** `AdminPrimitives.jsx`, `AdminLoading.jsx`, shared portal/UI components, `OwnerTable.jsx`/`OwnerModal.jsx` as references, `lib/domain/status.js`, `app/globals.css`, `DESIGN.md`.

**Backend/database:** none for presentation; query extensions are separately scoped.

**Acceptance/QA:** representative queue, detail, finance and form screens match the system; readable status labels; keyboard focus, 44 px touch controls and localized table scrolling; shared changes do not regress owner screens. Add behavior tests for extracted URL/modal logic, not tests that merely mirror CSS.

#### Phase 3 completion record · 5 October 2026

**Status:** ADM-DS-01–06 implemented and locally verified; not deployed. Release A1's navigation and shared foundation are complete. Module-specific redesigns still follow their later phases.

| ID | Delivered foundation |
| --- | --- |
| ADM-DS-01 | Admin headers adapt shared `PageHeader`/breadcrumbs, preserve callers and use portal type/geometry. Queue summary cards use `AdminKpiCard` and `text-stat`. |
| ADM-DS-02 | Shared `AdminTable` and `AdminFilterBar` serve the application queue and payment list; semantic captions/headers, readable cells, explicit record actions and keyboard-focusable local scroll regions. Existing shared pagination retains API page sizes and query context. |
| ADM-DS-03 | Admin badges and shared detail badges reuse `ui/status-badge`; operator status labels remain domain-specific through `adminStatusMeta`, with humanized unknown values and no inference of captured money from success alone. |
| ADM-DS-04 | Shared native fields, admin-only 44 px controls and checkbox/radio labels, visible keyboard focus, and explicit application assignment/decision write grants with read-only alternatives. |
| ADM-DS-05 | Shared record-section URL logic preserves encoded return paths and repeated parameters; deterministic IST operator timestamps resolve ADM-F04. [Detail-sheet contract](ADMIN-DETAIL-SHEETS.md) defines URL, focus, return and draft safeguards before sheets are enabled. |
| ADM-DS-06 | Shared empty/error/forbidden presentation and queue/payment skeleton geometry with one loading announcement. Queue API failures settle into an explicit state rather than empty/zero data. Representative screen and owner regression evidence recorded. |

**Changed files:** `AdminPrimitives`, `AdminLoading`, `ApplicationQueue`, `PaymentInvestigation`, `AssignmentPanel`, `DecisionPanel`, `OperatorSecurity`, `AdminClients`, admin shell and shared portal/detail components; application list/detail/loading and payment loading routes; `app/globals.css`, `lib/domain/{status,admin-display,detail-navigation}.js`, `DESIGN.md` and the sheet contract. Verification adds `test/domain/admin-display.test.js`, `scripts/portal-gate/admin-visual-system.py` and an opt-in `ADMIN_UI_FIXTURE=1` extension to backend `test/helpers/admin-navigation-browser.mjs` using existing review/finance fixture seeds. Normal Phase 2 fixture behavior remains unchanged.

**API/database:** no production backend service, endpoint, capability or schema changes; no new migrations. Existing application assignment/decision versions, reasons and mutation APIs remain in use. Disposable local PostgreSQL applied the existing migration journal and seeded Test/Live/Simulated ledger evidence without calling providers or moving money. No admin View sheets were enabled; booking/people sheets remain Phases 6–7 work and full-page evidence remains accessible.

**Verification:** [check record](evidence/admin-phase3/checks.json), [33 browser checks / zero page errors / ten WCAG axe runs](evidence/admin-phase3/browser-checks.json). Representative screenshots: queue [desktop](evidence/admin-phase3/queue-1280.png) / [phone](evidence/admin-phase3/queue-360.png), payments [desktop](evidence/admin-phase3/payments-1280.png) / [phone](evidence/admin-phase3/payments-360.png), [application detail](evidence/admin-phase3/application-detail-360.png), [gateway form](evidence/admin-phase3/gateway-form-360.png), [operator detail](evidence/admin-phase3/operator-detail-360.png), [read-only reviewer](evidence/admin-phase3/read-only-decision-360.png) and [owner property](evidence/admin-phase3/owner-property-360.png). Tablet captures are retained in the same directory.

Frontend tests: **92 passed**, including new IST boundary/domain-status/record-tab URL tests and existing owner navigation/state tests. Application-review disposable integration: **1 passed, 0 skipped**, covering assignment, all decision outcomes, stale-state protection and resubmission. Changed-file ESLint/Prettier and production build pass. Browser coverage includes 360/768/1280 px containment, captions/headers, keyboard scroll/focus, 44 px native controls, full-access review actions, read-only control absence and API 403, forbidden/filtered-empty states, record-tab navigation/refresh, deterministic security history/session dates, gateway form and owner help/property shell parity. The Impeccable detector's three inherited decision-panel accent borders were removed in the confirmation pass.

**Remaining limits:** repository-wide lint/format have unrelated failures recorded in the check record; build emits public sitemap policy API warnings. Production/provider workflows and the Phase 12 complete journey were not exercised. ADM-F02's named application assignment/decision controls and ADM-F04's operator-date mismatch are resolved locally; other document/module permissions remain their later-phase verification. ADM-F03, ADM-F05 and ADM-F06 remain open. Shared primitives are demonstrated on representative screens; remaining module tables/forms move onto them during Phases 5–10.

**Reproduce:** follow the Phase 2 disposable fixture instructions above, adding `ADMIN_UI_FIXTURE=1` for backend startup, using frontend fixture ID `admin-phase3`, and running `python scripts/portal-gate/admin-visual-system.py` with the private `ADMIN_NAV_FIXTURE` path. The gate requires Python Playwright, Chrome and the application's pinned axe-core. Use a fresh fixture; do not load backend `.env`. Run fixtures in an interactive terminal so `stop` or Ctrl+C drops their database, stop the isolated frontend and PostgreSQL cluster, and remove private tokens. Evidence contains no fixture tokens or configured database credentials.

**Next phase:** Phase 4 — authorized dashboard and analytics, beginning with the dashboard API contract and aggregate definitions.


### Phase 4 — Dashboard and analytics

**IDs:** ADM-HOME-01–07 · **Priority:** High · **Depends on:** Phases 1–3 and dashboard API contract.

Replace root queue with the dashboard in section 3. Deliver attention/summary/today panels first, then correctly aggregated trends and distributions. Refresh only authorized data. Provide chart data tables and filtered drill-downs; include CSV only when its access policy and definition are explicit.

**Files:** admin root and loading page; proposed `AdminDashboard.jsx` and `AdminAnalytics.jsx`; `OwnerAnalytics.jsx` as a presentation reference; endpoint/service adapters. Backend admin router/controller and a proposed dedicated dashboard aggregation service.

**Backend/database:** new dashboard read contract; full-dataset aggregates and per-module authorization; evaluate indexes against realistic fixtures. No payout engine or speculative schema migration.

**Acceptance/QA:** fixed fixtures prove order/visit distinction, multi-visit deduplication, cancelled rent, period boundaries, zero-filled dates, Test/Live separation and restricted roles. A panel failure does not blank the home or display zero. Check deterministic date/number rendering for hydration. Tiles open exactly matching filters.

### Phase 5 — Owner applications and property review

**IDs:** ADM-REV-01–06 · **Priority:** High · **Depends on:** Phases 2–3.

Unify queues with status/assignee/search controls and backend-supported SLA summaries. Application table: owner, submitted date, waiting age, state, assignee and Review. Property table: thumbnail/name, owner, submission state, verification readiness, assignee and Review. Only expose counters supplied by authorized aggregates.

Application details: Overview · Documents · Decision · History, mapped to existing data/actions. Property details retain Submission · Review decision · Verification · Visibility · History, with clearer labels and consistent chrome. Put immutable submission comparison beside the reviewed revision; distinguish submitted, current and published data. Preserve document authorization, assignment, request-more-information, strikes, appeals, verification scheduling/outcomes and publication prerequisites.

**Files:** `ApplicationQueue.jsx`, `DecisionPanel.jsx`, `DocumentViewer.jsx`, `AssignmentPanel.jsx`, `PropertyReviewForm.jsx`, `VerificationPanel.jsx`, `PropertyLifecyclePanel.jsx`, applications/property routes.

**Backend/database:** reuse review commands; any missing SLA/count/filter contract is new scoped work.

**Acceptance/QA:** approve, request information and reject refresh the correct queue and show durable feedback; two reviewers receive stale-state protection; historical/private document boundaries hold; unpublished/failed verification cannot become published through a UI shortcut.

### Phase 6 — Bookings and booking cases

**IDs:** ADM-BOOK-01–05 · **Priority:** High · **Depends on:** Phase 3.

Standardize booking tables with reference, property, owner/guest, visit dates, state, money/environment and View. Enable the full booking detail sheet with an independent full-page route. Retain existing visit/payment/guest/case/history/policy content and downloads; map labels to the actual detail contract. Cases remain a separate section tab with supported open, unassigned, mine and resolved filters.

**Files:** `AdminBookingHistory.jsx`, `AdminBookingDetail.jsx`, `BookingCases.jsx`, booking routes, `components/booking/CasePanels.jsx`, visit/evidence components.

**Backend/database:** existing records/case APIs first; add missing filters only with validation and service support. A platform-wide editable calendar is outside this phase; links to booking visits satisfy the dashboard drill-down.

**Acceptance/QA:** list context survives open/close; all visits and evidence remain accessible; lifecycle actions retain prerequisites; case resolution still previews and executes once; private files stay protected; simultaneous updates are handled; unsaved edits block sheet close.

### Phase 7 — People: owners and customers

**IDs:** ADM-PEOPLE-01–04 · **Priority:** Medium · **Depends on:** Phase 3.

Use Owners/Customers section tabs and matching table/filter patterns. Details retain current record tabs and cross-links to applications, properties, bookings, support and history. Optional View sheets follow booking parity checks. Keep account restriction, reinstatement, profile correction, session revocation and payout-method failure controls in clearly labelled action panels.

**Files:** `AdminClients.jsx`, `AdminCustomers.jsx`, `AccountLifecyclePanel.jsx`, `CustomerAccountForms.jsx`, `PayoutDestinationAdmin.jsx`, people routes.

**Backend/database:** reuse existing scoped APIs. Shared customer/owner identity does not authorize admin impersonation; preserve current account separation and switching behavior.

**Acceptance/QA:** UI says Owner while old URLs work; restricted operators cannot access documents/commands by entering a direct URL; failed changes retain values; account history and all linked records remain reachable.

### Phase 8 — Finance workspace

**IDs:** ADM-FIN-01–06 · **Priority:** High · **Depends on:** Phase 3; metric definitions aligned with Phase 4.

Implement Finance local tabs for Payments, Refunds, Statements, Payouts and Disputes. Keep environment/period scope visible. Standardize tables and evidence detail headers. Separate booking rent, captured amount, successful refunds, accounting allocations and payout evidence. Keep Gateway settings under Settings & content.

Refund tasks keep select → preview → confirm → recorded outcome; provider reconciliation remains an explicit authorized action. Statements retain IST periods and authorized CSV/downloads. Disputes retain evidence, replies and history. Payout UI describes actual rail availability; neither an eligibility figure nor an admin button proves funds were transferred.

**Files:** finance/dispute routes, `PaymentInvestigation.jsx`, `RefundOperations.jsx`, `RefundCommands.jsx`, `ReconcilePayment.jsx`, shared finance/dispute components and admin actions.

**Backend/database:** reuse finance/refund/dispute commands; missing aggregate definitions require backend changes. Live settlement, commission/tax policy and payout execution are separate projects, consistent with owner EARN-07.

**Acceptance/QA:** no Test amount presented as Live cash; preview expiry/version/idempotency safeguards remain; unavailable evidence is explicit; export respects role and environment; statement and detail totals reconcile against fixtures.

### Phase 9 — Guest reviews, support and message delivery

**IDs:** ADM-COMMS-01–05 · **Priority:** Medium · **Depends on:** Phase 3.

Guest reviews sit under Reviews & approvals, with reported/moderation states and readable feedback. Support uses a subject-led inbox and conversation-led detail with contextual booking/owner/guest links; assignment, escalation, replies and attachments remain available. Message delivery sits under Operations and distinguishes queued, provider accepted, delivered and failed outcomes supported by the current contract. Retry/suppress commands must remain explicit and authorized.

**Files:** `AdminReviewQueue.jsx`, `AdminSupport.jsx`, `SupportManagement.jsx`, review/support/notification routes and shared thread/delivery components.

**Backend/database:** reuse APIs; add only supported unread/queue aggregates. Do not introduce a live chat promise or external messaging channel through UI copy.

**Acceptance/QA:** moderation preserves public-rating semantics; unread state and saved replies refresh correctly; private attachments stay private; failed provider delivery is distinguishable from acceptance; repeated retries cannot accidentally duplicate an ambiguous delivery.

### Phase 10 — Operations, privacy, audit and configuration

**IDs:** ADM-OPS-01–06 · **Priority:** Medium · **Depends on:** Phases 2–3.

Operations tabs expose service health, delivery, privacy and audit. Health prioritizes incidents before diagnostics; keep incident commands and evidence. Audit includes event filters, governed export creation, job progress, receipts/downloads and expiry. Privacy retains review/blocking/retention context and existing identity scope. Settings & content contains publishing/version history, catalogue management, gateway configuration and operator security with capability-based controls.

**Files:** operations/privacy/audit/content/catalogue/security/payment configuration routes; `IncidentControls.jsx`, `PrivacyFulfillment.jsx`, `AuditBrowser.jsx`, `OperatorSecurity.jsx`, `PaymentGatewaySettings.jsx`.

**Backend/database:** existing contracts first; publication previews, governed exports and security workflows are preserved. No new capability names or stored preferences until justified by an approved contract.

**Acceptance/QA:** event/export details and private downloads remain reachable; read-only roles cannot mutate content/security; 2FA/recovery/session behavior survives styling; gateway settings cannot be mistaken for payment investigation; no unsupported privacy scope is implied.

### Phase 11 — Global search and cross-workspace links

**IDs:** ADM-SEARCH-01–04 · **Priority:** Medium · **Depends on:** route map stabilized; Phase 3.

First improve current authorized directory search and root application links. Then expand to properties and booking references, followed by case/support references where existing query contracts support them. Add type filters and independent pagination. State supported search scopes accurately in the placeholder. Check capability before making each section request, not just before rendering results.

**Files:** `AdminShell.jsx`, search page, admin API adapters; relevant backend list/search services and validators.

**Backend/database:** proposed authorized unified search endpoint only if existing endpoints cannot provide correct paginated results. Validate literal wildcard handling, bounded queries and supported reference matching. Exclude private message bodies/documents and unauthorized identities.

**Acceptance/QA:** no cross-role leakage; partial failure retains other permitted results; searches and drill-downs survive refresh; copy/open/full-page links preserve allowed context; search-only eligible roles can access the header affordance.

### Phase 12 — Responsive, accessibility, performance and release verification

**IDs:** ADM-QA-01–07 · **Priority:** High release gate · **Depends on:** all shipped module phases.

Run the complete redesigned journey with disposable fixtures: sign-in/2FA → dashboard → review → property verification/publication → booking/case → refund evidence → support → audit. Cover narrow phones, tablet, desktop, keyboard-only use and zoom. Confirm table containment, chart tables, field errors, modal focus, reduced motion and session recovery.

**Files:** affected routes/components, existing `test/**` and portal-gate infrastructure; add an admin-specific browser gate if existing scripts do not cover these paths.

**Backend/database:** validate new aggregates/search against an integration database, migration journal if schema changes occurred, realistic query plans and concurrent reviewer/finance cases. Production-provider checks are separate recorded evidence.

**Acceptance/QA:** targeted and required lint/format/test/build gates pass, or outstanding unrelated failures are explicitly recorded; no new hydration/accessibility/page-overflow defects; permissions validated by API and direct URLs; no lost admin workflow. Measure representative cold-load bundles and interaction performance against a baseline before setting the final budget. Do not inherit the owner plan's already-failing budget as a claimed pass.

## 6. Delivery order and progress

| Release | Phases | Reviewable outcome                                                                | Status                              |
| ------- | ------ | --------------------------------------------------------------------------------- | ----------------------------------- |
| A0      | 1      | Verified inventory and baseline                                                   | Complete (audit); findings recorded |
| A1 | 2–3 | Clear sidebar, section tabs and consistent primitives; application route migrated | Complete; locally verified, not deployed |
| A2 | 4 | Authorized dashboard, actionable queues and defined analytics | Complete; locally verified, not deployed |
| A3 | 5–7 | Review, booking/case and people workspaces | Complete; locally verified, not deployed |
| A4      | 8–9    | Finance, guest-review and support workflows                                       | Complete (locally verified)                         |
| A5      | 10–11  | Operations/configuration and expanded search                                      | Complete (locally verified) |
| A6 | 12 | Full regression evidence and release readiness decision | Complete; locally verified, not deployed |

Phase 4 API definition can begin during Phase 1. Module phases can ship independently after the shared foundation; finance remains high priority even though it is listed later. Every release receives targeted accessibility, role and workflow checks. A6 adds the complete journey rather than postponing verification until the end.

### Per-phase completion record

Update this single document as work progresses. Record implemented IDs, changed files, API/migration impact, checks actually run and their results, screenshot/evidence paths, unresolved issues and next phase. Distinguish implementation complete, locally verified and deployed. Do not mark a phase complete because its screen looks finished while a preserved command, permission or link is broken.

### Phase 4 — Complete (locally verified, 5 October 2026)

Implemented ADM-HOME-01–07. Root now loads independently authorized dashboard modules with IST period/environment filters and Refresh. Six prioritized summary tiles separate current queues from period/today figures; additional money and queue totals remain visible in a table. Urgent attention uses actual 48-hour application SLA, finance exceptions, support priority and service incidents. Daily booking/rent and review-decision charts have exact semantic data tables; booking-status distribution states its created-order cohort. Needs-attention, unique today's visits, recent decision events and compact service health link to permitted destinations. Missing evidence and failed modules display unavailable, with retry retaining the URL.

**Contract and API:** [Dashboard contract](ADMIN-DASHBOARD-CONTRACT.md) documents each metric's unit, date basis, namespace, boundaries and matching filters. Added `GET /api/v1/admin/dashboard` and capability-protected application decision history. Bookings gain admin creation-date/environment/rent/visit-unit filters; payments gain verified-capture date basis, keeping payment status based on lifetime facts; refunds gain successful-evidence/pending/exception scopes; properties gain current-submission filtering; support gains unresolved filtering. Existing command, ownership and capability boundaries remain in use. No schema migration, provider call, money command, dependency, CSV or calendar editor was added.

**Changed files:** frontend admin root/property list and new application-history page, `AdminDashboard`, `AdminAnalytics`, booking/payment/refund/support list adapters and `adminApi`; backend admin router/dashboard controller, new dashboard/scope services and narrow existing list-service/validation extensions. Verification adds the dashboard integration test, opt-in dashboard browser dataset in `admin-experience-browser.mjs`, two explicit finance-fixture date options and `scripts/portal-gate/admin-dashboard.py`.

**Verification:** [Check record](evidence/admin-phase4/checks.json); [browser/API evidence](evidence/admin-phase4/browser-checks.json); [query plan](evidence/admin-phase4/query-plan.json). Frontend: **92 tests passed**. Backend: **8 targeted tests passed, 0 skipped** (scope unit plus seven disposable integrations), covering multi-visit deduplication, requested/cancelled/held rent, full-dataset pagination, zero-filled dates, exact inclusive/exclusive order/capture edges, capture-date versus order-date independence, positive submitted-property/unresolved-support totals, Live/Test/Simulated separation, restricted/empty roles and partial module failure. Existing owner booking/Today, application review, support, payment reconcile and refund behaviors passed their affected regressions.

Browser: **36 checks, 10 axe runs, 0 violations, 0 page errors** at 360/768/1280 px, with local table scroll/focus, native filters, matching money/visit/decision drill-downs, retained filter context, legacy application bookmarks, finance/records/application/customer-only/empty homes and health-panel failure/recovery. [Desktop](evidence/admin-phase4/dashboard-1280.png), [tablet](evidence/admin-phase4/dashboard-768.png), [phone](evidence/admin-phase4/dashboard-360.png), [partial failure](evidence/admin-phase4/partial-failure-1280.png). Bounded visual inspection and confirmation completed; detector found no primary issues in the new dashboard/analytics components.

Changed-file lint/format, backend repository lint and frontend production build pass. The existing migration checker verifies **64** journal entries. A **1,009-order** local aggregate plan uses the existing visit index; its timing is recorded as fixture evidence, not a production budget. No speculative index was added.

**Remaining limits:** frontend repository lint still has 418 unchanged review-script formatting errors and three icon image warnings; frontend formatting still flags the unchanged launch roadmap; backend formatting still flags unchanged `.prettierrc`. Build emits configured public sitemap policy API warnings. Production/provider and Phase 12 journey checks remain pending. Cases have no stored high-priority/SLA field, so their open queue is shown without invented urgency. Larger production finance/event volumes need measured query plans. Reproduction and cleanup instructions are in the dashboard contract; recorded evidence contains no private fixture tokens.

**Next phase:** Phase 5 — owner applications and property review.

### Phase 5 — Complete (locally verified, 5 October 2026)

| ID | Delivered result |
| --- | --- |
| ADM-REV-01 | Existing shared application queue retained; property queue now uses `AdminTable`, `AdminFilterBar`, URL-backed status/reviewer/search and shared pagination. Rows show property thumbnail/name, owner, submitted revision/state/date, recorded verification facts, reviewer and Review. Counts are full-dataset backend aggregates under the selected search/reviewer/submission scope, across status filters. Application SLA rows now use the same exact 48-hour threshold as counters, independently of rounded age. No property SLA was invented. |
| ADM-REV-02 | Application Overview, Documents, Decision and History retain their evidence and commands. Document read/write grants independently control private-file links and moderation buttons; metadata stays available for application review/completion. Owner-record links require their own read grant. Dates use the deterministic IST formatter. |
| ADM-REV-03 | Property Submission, Review decision, Verification, Visibility and History retain direct URLs and list context. Submitted/current/published versions are labelled separately. Immutable comparison sits alongside the selected submission; current unsubmitted changes have a separate comparison table. Venue court/rate/booking-setting changes are included. Unknown revision URLs never fall back to an actionable current revision. |
| ADM-REV-04 | Existing assignment, expected-version/submission checks, reasons, flagged corrections, strikes and appeal/account workflows retained. Application decisions preserve the safe filtered queue and the server's committed outcome (including blocked), with feedback surviving refresh. Property decisions show the durable backend decision record after the form disappears. |
| ADM-REV-05 | Existing scheduling, outcome evidence, publication, restriction/correction and version guards remain authoritative. Historical inspection suppresses write controls and evidence previews; superseded/deleted private-file URLs return 404 before accessing storage. Failed/missing verification never exposes a publication shortcut. |
| ADM-REV-06 | Responsive, keyboard, role, document, decision and publication checks recorded. Property loading geometry follows the new queue. No new dependency, schema migration or provider operation. |

**Changed files:** application/property detail pages, property queue/loading, `DocumentViewer`, `DecisionPanel`, `PropertyCommandForm`, `VerificationPanel`, `AdminLoading`, action/return helpers, status/revision-diff domains and their tests. Backend changes are scoped to application SLA projection, property review read models and private-document live-file validation. Verification adds `admin-review-experience.integration.test.js`, the opt-in `ADMIN_REVIEW_FIXTURE=1` browser dataset and `scripts/portal-gate/admin-reviews.py`.

**API/database:** no new endpoints or capabilities. Property list adds aggregate `counts` (total, waiting submitted, unassigned waiting and pending verification), owner/normalized public-photo metadata and current-submission verification facts. The verification column deliberately reports recorded evidence, not publication eligibility. Property detail adds `draftSnapshot` from the existing snapshot projector, in a repeatable-read/read-only transaction so current/submitted/publication context stays consistent. Snapshots expose no storage keys or signed links. Document streaming retains private no-store headers, live admin authorization and audit evidence; replaced/deleted files are unavailable. Write protocols and publication prerequisites remain unchanged.

**Verification:** [Check record](evidence/admin-phase5/checks.json) and [browser evidence](evidence/admin-phase5/browser-checks.json). Frontend **94 tests passed**; **five disposable backend integrations passed, zero skipped**, covering new count/revision/SLA/document behavior and existing application assignment/all decisions/strikes/resubmission, property reviewer races/stale submissions/corrections, revision-exact verification/publication and restrictions. Document proxy tests use a mocked upstream and verify the audit entry plus refusal of replaced/deleted evidence without a storage request.

Browser **40 checks, 12 axe runs, zero violations and zero page errors**. Coverage includes 360/768/1280 px containment and 44 px controls, property table semantics/local scroll/focus, immutable comparison, current/historical revision context, unknown revision refusal, queue-preserving tabs/refresh, document read/write roles in UI/API, read-only property decisions, all three application Server Actions with retained filters/durable feedback, property approval and scheduled failed verification, hidden publish controls and API 409. [Desktop submission](evidence/admin-phase5/property-submission-1280.png), [phone queue](evidence/admin-phase5/property-queue-360.png), [phone document review](evidence/admin-phase5/application-documents-360.png). Other queue/detail sizes are saved alongside these. Bounded visual inspection corrected phone search containment; the detector and confirmation pass found no primary issues.

Changed-file lint/format, backend repository lint and production build pass. The migration checker still verifies **64 journal entries**; no migration added. Existing unrelated global failures remain: frontend lint's 418 review-script formatting errors and three icon image warnings, frontend formatting's unchanged launch roadmap and backend formatting's unchanged `.prettierrc`. Build emits the existing configured public sitemap policy API warnings.

**Reproduce:** use a disposable localhost PostgreSQL server and set `PORTAL_TEST_DATABASE_URL` without loading backend `.env`. Run the five integration files named above using `node --import ./loader/register.mjs --test`. For the browser fixture, run `test/helpers/admin-experience-browser.mjs` with `ADMIN_REVIEW_FIXTURE=1`, private `ADMIN_BASELINE_FIXTURE`, `ADMIN_BASELINE_EVIDENCE_DIR`, API port 4163 and web origin 3163. Start frontend with that API URL, `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=admin-phase5` and port 3163; run `python scripts/portal-gate/admin-reviews.py` with the private fixture path. The action gate requires a fresh fixture. Send `stop` to the backend fixture, stop the isolated frontend/PostgreSQL cluster and remove private tokens. Recorded evidence contains no session tokens or configured credentials.

**Remaining limits:** locally verified, not deployed. Production providers and the complete Phase 12 journeys remain pending. Existing application approval rules were preserved; this phase adds no new approval prerequisites. ADM-F02's reviewed application/document/property controls are verified; other module permissions remain their own phases. ADM-F03, ADM-F05 and ADM-F06 remain open. A3 continues with Phases 6–7.

**Next phase:** Phase 6 — bookings and booking cases.

### Phase 6 — Complete (locally verified, 5 October 2026)

Implemented ADM-BOOK-01–05. Booking records and cases use shared semantic tables with local horizontal scrolling, readable state labels and 44 px View actions. Booking rows show property/reference, owner/protected guest identity, visit range, order state, rent basis and payment environment. URL-driven booking and case sheets retain supported list filters and pagination; booking sections have independent `recordTab` state. Every sheet has a full-page route and filtered return link. All visits, guest/arrival, payment evidence, cases, accepted policy, lifecycle history and protected downloads remain accessible.

Records read/write grants now control lifecycle, incident, correction, case creation, assignment, updates and resolution forms. Related property/owner/customer/finance links respect their separate grants. Existing preview hashes, versions, request keys, audit and private file boundaries remain authoritative. Live capture/refund totals exclude Test evidence; original booked rent is explicitly distinct from cash. Failed and pending shared evidence/case saves remain dirty until confirmed success. Admin parent booking routes now revalidate after mutations so sheet evidence and state refresh correctly.

**API/database:** existing record/case endpoints and commands retained. Admin list DTO adds owner identity, fulfillment-protected guest name and last visit date in order and today-visit scopes. Owner/customer DTOs retain their existing contract. No migration, application dependency, provider call, editable calendar or new money command was added.

**Verification:** frontend **97/97** tests; three targeted disposable integrations **3/3** for admin booking DTO/privacy, exact-visit cases with races/idempotency/refunds and private evidence/corrections/lifecycle prerequisites. Browser **39 checks, 15 axe scans, zero violations, zero page errors** across 1280/768/360 px. Includes list/sheet/full-page/filter/tab/refresh/Escape/Back behavior, all detail sections and downloads, stale assignment refusal with retained input and guarded dismissal, preview/confirm cancellation with one refund obligation and an unaffected visit, distinct Live/Test capture totals, actual check-in and durable refreshed evidence, and restricted/read-only direct URLs plus API 403. The failed-save guard regression was also run against the original hook and failed, then passed with the fix. Final confirmation checks five case filter modes have one active link and record downloads have 44 px targets. Fresh reviewer found no production issues.

Frontend repository lint, changed-file formatting, backend lint/format and migration journal check (**64 entries**) pass. Production verification build passes with `next build --webpack`; default Turbopack worker port binding is denied by this execution environment. Full backend suite reports **233 passed, 1 failed, 3 skipped**: unchanged `CP25 publication, immutable history, rollback and checkout acceptance` expects four history entries but receives five; isolated rerun reproduces it. Frontend global formatting still flags the unchanged `Rentra_Post_Development_Launch_Roadmap.md`. These are recorded limitations, not passing gates.

**Evidence and reproduction:** [checks](evidence/admin-phase6/checks.json), [browser results](evidence/admin-phase6/browser-checks.json), [desktop records](evidence/admin-phase6/bookings-1280.png), [phone booking sheet](evidence/admin-phase6/booking-visits-360.png), [phone case sheet](evidence/admin-phase6/case-360.png), and [workspace runbook](ADMIN-BOOKING-WORKSPACE.md). The runbook names changed files and disposable commands. Local only; not deployed. Production providers and Phase 12 full release journeys remain unverified.

**Next phase:** Phase 7 — people: owners and customers.

### Phase 7 — Complete (locally verified, 5 October 2026)

**Status:** ADM-PEOPLE-01–04 implemented on the same frontend `main` branch. The backend's existing `master` branch is unchanged except for a disposable test helper. Release A3 is complete locally; nothing was deployed.

**Delivered:** Owners and Customers reuse the existing People section tabs, shared semantic tables/filter bars/native fields, API counts, status/search/pagination and matching loading states. UI uses Owner while `/admin/clients/**` and existing API terminology remain compatible. Independent full-page details retain every record section, filtered return context, history and authorized application/property/booking/support/review/privacy links. Optional View sheets are deferred; View opens the complete full-page record. No admin impersonation or account switching changes were introduced.

Account lifecycle, customer profile correction/session revocation and payout-method failure use explicit directory write grants. Read-only operators see inspection states, and related record links use independent module read grants. Existing API denial, reason/version checks, payout preview/apply/request-key/recent-authentication safeguards and masked destination history remain authoritative. Operator events use deterministic IST dates; visits keep the property timezone. Shared tables now contain visually hidden row labels inside their local scroll region.

**Regressions proved and fixed:** the initial read-only gate failed because owner account forms remained visible. A real competing profile update also reproduced a controlled Language select resetting from Gujarati to English after a refused save. Existing reset-cancellation behavior now preserves all profile fields; lifecycle confirmation stays checked after refusal and resets after success. Both cases pass in the final authenticated browser run, including retained reasons, stale-update refusal, reinstatement, session revocation and durable audit history.

**Verification:** frontend tests **97 passed**. Disposable owner lifecycle, customer controls and payout-destination integrations: **3 passed, 0 skipped**. [Browser gate](evidence/admin-phase7/browser-checks.json): **30 checks, 12 WCAG axe scans, zero violations, zero page errors**, across 1280/768/360 px, full/read-only/customer-only roles, literal search, page reset, encoded filtered returns, tab refresh, empty states, direct document/command denial, linked records, payout concurrency and account controls. Frontend/backend lint, changed-frontend formatting, backend formatting, Python syntax and production Webpack build pass. Migration journal: **64 entries; no migration added**. Fresh code review has no unresolved findings.

**Recorded unrelated limits:** full backend suite: **233 passed, 1 failed, 3 skipped**; unchanged `CP25 publication, immutable history, rollback and checkout acceptance` still expects four history entries but receives five at `content.integration.test.js:204`. Frontend global formatting still flags the unchanged `Rentra_Post_Development_Launch_Roadmap.md`. Disk exhaustion interrupted initial checks; inactive generated caches were removed and the disposable services recovered before final verification. Intermittent local dev-manifest JSON errors were avoided by running the final browser gate against the verified production build. These interruptions are not reported as passing checks. Existing detail result limits remain documented; production providers and Phase 12 release journeys remain unverified.

**Evidence and reproduction:** [checks](evidence/admin-phase7/checks.json), [desktop owners](evidence/admin-phase7/clients-1280.png), [phone customers](evidence/admin-phase7/customers-360.png), [phone account controls](evidence/admin-phase7/customers-account-360.png) and [People workspace runbook](ADMIN-PEOPLE-WORKSPACE.md). Backend production services, scoped read contracts, schema and identity separation are unchanged. Disposable fixtures use no production credentials or providers.

**Next phase:** Phase 8 — finance workspace.

### Phase 8 — Complete (locally verified, 5 October 2026)

**Implemented IDs:** ADM-FIN-01–06. Existing Finance tabs and Gateway settings placement are retained. Refunds, statements, payouts and disputes use shared semantic admin tables; financial evidence details use admin headers. Provider capture/refund evidence no longer claims to be “Actual bank money.” Booking quotes, verified receipts, successful refunds, reservations, accounting eligibility and recorded payout evidence remain distinct; bank verification and live payout execution remain unavailable.

**Authorization and preserved tasks:** read-only operators see evidence without reconciliation/refund/dispute command forms; new command pages check Finance write capability before fetching command context. Independent read capabilities govern links into Bookings, People and Properties. Backend authority, private dispute attachments, replies/history, refund preview hash/request keys, CSV scope/audit and payout destination pinning remain intact. Refund preview retains unsaved protection until a recorded result; changed amounts require a fresh preview.

**Backend impact:** statements, CSV and payout periods now use explicit inclusive/exclusive IST month boundaries and default month, matching owner evidence and dashboard scope. The former admin UTC cohort is intentionally replaced. No route/DTO/schema/migration additions; migration journal remains **64 entries**.

**Verified checks:** frontend **97 tests passed**; **five focused backend finance/refund/dispute integration checks passed**; production browser gate **15 checks, 21 axe scans, zero violations, zero page errors** at 1280/768/390 px. Scoped CSV excludes other environments and denies missing Finance read access. Seeded statement receipts/refunds reconcile to allocation details. Frontend/backend lint, changed-frontend formatting, backend formatting, Python gate syntax, production Webpack build and diff whitespace checks pass. Old boundary allocation selection and lost preview guard both fail before their fixes and pass afterward. Fresh code review, screenshot review and Impeccable detector have no unresolved findings.

**Recorded unrelated limits:** full backend suite **234 passed, 1 failed, 3 skipped**; existing CP25 history-length assertion still expects four entries and receives five at `content.integration.test.js:204`. Frontend global formatting still flags only unchanged `Rentra_Post_Development_Launch_Roadmap.md`. No production provider calls or transfers were made; full release journeys remain Phase 12 work.

**Evidence and reproduction:** [checks](evidence/admin-phase8/checks.json), [browser results](evidence/admin-phase8/browser-results.json), [phone statements](evidence/admin-phase8/statement-allocations-390.png), [refund preview](evidence/admin-phase8/refund-preview.png) and [Finance workspace runbook](ADMIN-FINANCE-WORKSPACE.md). Changes remain on the existing branches; Phase 7 work is preserved.

**Next phase:** Phase 9 — guest reviews, support and message delivery. Release A4 remains in progress.

### Phase 9 — Complete (locally verified, 5 October 2026)

**Implemented IDs:** ADM-COMMS-01–05. Guest reviews, Support inbox and Message delivery use the shared semantic, keyboard-scrollable admin tables in their existing navigation groups. Scores, complete submitted feedback, owner replies, moderation states and separate open reports remain visible. Page-derived counts explicitly identify their loaded scope. Support retains subject, category, participant, state, assignment, matching total and pagination; owner categories now resolve correctly. Review and delivery details retain list-page return context. Operator dates use deterministic IST.

**Preserved workflows and authorization:** publication preview/confirmation, original immutable score/text, public rating aggregates, report resolution and history remain authoritative. Support retains assignment, escalation, replies, internal notes, private photos, history and separate booking/privacy workflows. Read-only operators inspect without command forms; independent read grants govern related owner/customer/property/booking/privacy links. Private photos remain audited, authenticated, non-prefetching downloads. Delivery distinguishes Queued, Provider accepted, Delivered, Failed, Dispatch unknown and Suppressed. Only definitely undispatched failures offer retry; unknown dispatch uses original-SID reconciliation. Existing atomic backend predicates refuse repeated or ambiguous retries.

**Regression proved and fixed:** a committed support reply could leave the inspected conversation stale through the streamed action response. Successful admin replies now redirect back to the same canonical conversation with a validated filtered return link and replace history. Failed/stale replies keep the entered draft. The browser gate verifies refreshed saved replies and internal notes, durable reloads and stale-refusal input retention. Owner/customer reply protocols remain unchanged.

**API/database:** existing APIs and capabilities only; backend production services are unchanged. The sole backend edit is an opt-in disposable communication fixture. Admin unread tracking and manual suppression have no supported command/read contract: no fabricated unread count, suppression control, live-chat promise or external channel was added. Existing owner unread behavior is covered by support integrations. No migration or dependency additions; journal remains **64 entries**.

**Verification:** frontend **98 tests passed**; **five focused backend integrations passed, zero skipped**, covering score-neutral previews/immutable review history/public aggregates, participant isolation/internal notes/private photos/owner unread updates, assignment/replay/races/storage refusal and safe delivery retry/reconciliation. Production browser gate **11 checks, 24 axe scans, zero violations, zero page errors**, across 1280/768/360 px, all three queues/details, keyboard/local table scroll, restricted communication roles and direct API denial, durable replies/notes/escalation, stale drafts, low-score publication and separate report closure. Changed-source lint/format, backend lint, fixture formatting, Python syntax, production Webpack build and diff whitespace checks pass. Bounded screenshot review and Impeccable detector have no unresolved primary findings.

**Recorded unrelated limits:** full frontend lint still reports 418 existing review-script formatting errors and three icon image warnings; frontend global formatting flags the unchanged launch roadmap; backend global formatting flags the unchanged `.prettierrc`. Build retains configured public sitemap policy API warnings. The full backend suite was not rerun for this frontend phase; focused communication integrations are recorded separately. Production providers, delivery workers and Phase 12 release journeys remain unverified. Not deployed.

**Evidence and reproduction:** [checks](evidence/admin-phase9/checks.json), [browser results](evidence/admin-phase9/browser-results.json), [phone support](evidence/admin-phase9/support-requests-360.png), [desktop delivery](evidence/admin-phase9/message-delivery-1280.png) and [Communication workspace runbook](ADMIN-COMMUNICATION-WORKSPACE.md). The runbook documents endpoint limits and disposable commands. Evidence contains no session tokens or configured credentials. Release A4 is complete locally.

**Next phase:** Phase 10 — operations, privacy, audit and configuration.

### Phase 10 — Complete (locally verified, 5 October 2026)

**Implemented IDs:** ADM-OPS-01–06. Service health places incident signals and worker evidence before summary metrics and diagnostics. Audit events, governed exports, privacy requests, public content, catalogues and operators use shared semantic tables with local keyboard scrolling. Details preserve commands, previews, histories, receipts and private files. Dates use deterministic IST; money retains precise minor-unit formatting. Gateway settings is explicitly distinct from Finance investigation.

**Authorization and scope:** read-only operators inspect without mutation forms; independent read capabilities govern customer, property and incident record links. Privacy explicitly covers customer accounts and partial anonymization with retained historical evidence; authority, receipt delivery references, blocking conditions and worker progress remain visible. Exports preserve UTC scope, creator ownership, job progress, unavailable-copy messaging and private non-cacheable download/receipt guards. Content review/publication, catalogue impact checks and operator enrollment/recovery/session safeguards retain existing contracts. No new API, capability, migration, dependency or provider call.

**Tracked findings resolved:** Owner guide (`owner_help`) now passes all frontend route/action/archive allowlists, with save/review/preview/publication and immutable history verified in the browser. CP25 now checks preservation of every seeded publication and both newly published versions instead of assuming a fixed number of built-in versions. The previously recorded history assertion passes.

**Verification:** frontend **98 tests passed**; **seven focused backend tests passed, zero skipped**, covering audit exports, privacy retention, catalogue impact, incidents/delivery safeguards, operator 2FA/recovery/session revocation and content publication/checkout snapshots. Production browser gate **15 checks, 37 axe scans, zero violations and page errors**, at 1280/768/360 px. It checks seven queues, details, read-only UI and direct command denial, scoped private downloads/receipts/expiry, exact filters and queued exports, incident evidence, privacy review, Test gateway persistence, Owner guide publication and actual single-use authenticator enrollment. Production Webpack build, changed-source lint/format, backend lint, fixture/test formatting, Python syntax and diff whitespace pass; migration journal remains **64 entries**. Bounded visual review and Impeccable detector have no unresolved primary findings.

**Remaining limits:** existing frontend global lint review-script errors/icon warnings, launch-roadmap formatting and backend `.prettierrc` formatting remain outside this phase. Build retains configured public sitemap policy API warnings. Full backend suite and production workers/providers were not rerun; complete release journeys remain Phase 12 work. Not deployed.

**Evidence and reproduction:** [checks](evidence/admin-phase10/checks.json), [browser results](evidence/admin-phase10/browser-results.json), [desktop health](evidence/admin-phase10/operational-alerts-1280.png), [phone audit](evidence/admin-phase10/audit-events-360.png) and [Operations workspace runbook](ADMIN-OPERATIONS-WORKSPACE.md). Evidence contains no session tokens or enrollment secrets. Release A5 is in progress.

**Next phase:** Phase 11 — global search and cross-workspace links.

### Phase 11 — Complete (locally verified, 5 October 2026)

**Implemented IDs:** ADM-SEARCH-01–04. Search covers owners, customers, applications, properties, booking/visit references and booking cases using existing paginated APIs. The shell affordance and type selector share the same capability map, including application-only, property-only and booking-record-only roles. Capability checks occur before directory requests; blank queries make no request. Each type retains its own full matching total, 20-row page and independently named URL page parameter. Changing the term/type resets pages; literal percent/underscore queries cannot widen matches.

**Links and failure handling:** full record links preserve a canonical, bounded search return through record tabs and reload; directory links carry matching scope, term and page. Application decisions keep the matching application queue and committed outcome; old root application bookmarks remain compatible. Copy uses the existing shared control with accessible success confirmation and visible clipboard-denial feedback. A real directory 503 leaves other permitted results available. Retry reuses the existing refresh button to refetch the current server render; a same-URL link had reused the cached failure, and the browser proves recovery after the fix.

**Contract limits:** Support has no text/reference query contract, so support requests are explicitly excluded along with documents and private message bodies. Applications advertise name/email, not phone. Property codes retain their exact comparison; existing reference/name searches retain literal substring matching. No unified endpoint, new production service, capability, schema, migration, dependency or stored preference was introduced. Backend edits are disposable fixture changes only.

**Verification:** frontend **102 tests passed**, including pre-request permission gating, selected scope, bounded/repeated inputs, partial failure, safe returns and application decision context; **five focused backend regression tests passed, zero skipped**, covering dashboard scopes/aggregates, booking records, property/application review and the original busy owner-visit fixture. Production browser gate **12 checks, 14 axe scans, zero violations and page errors** at 1280/768/360 px. Each supported type has 23 synthetic matches: pages contain 20 and 3 records without overlap. APIs verify literal wildcards/private-body exclusion and property, booking, visit and case reference lookups. The gate checks copy/clipboard denial, six full-page drill-downs and tabs/refresh, independent pagination, changed-query reset, five eligible restricted roles, unsupported/empty roles, direct API denials, unavailable-type URLs, actual directory failure/recovery and legacy root bookmarks. Production Webpack build, changed-source lint/format, backend lint, fixture formatting, Python syntax and diff whitespace pass; the migration checker verifies **64 entries**. Bounded screenshot review and Impeccable detector have no unresolved primary findings.

**Remaining limits:** existing frontend global lint has 418 review-script formatting errors and three icon warnings; global formatting still flags the launch roadmap and backend `.prettierrc`. Build retains configured public sitemap policy API warnings. Full backend suite, production providers and the complete release/performance journey were not rerun; those remain Phase 12 work. Not deployed.

**Evidence and reproduction:** [checks](evidence/admin-phase11/checks.json), [browser results](evidence/admin-phase11/browser-results.json), [desktop search](evidence/admin-phase11/search-1280.png), [phone property page](evidence/admin-phase11/property-page2-360.png), [partial failure](evidence/admin-phase11/partial-failure.png) and [Search workspace runbook](ADMIN-SEARCH-WORKSPACE.md). Evidence contains no credentials or session tokens. Release A5 is complete locally.

**Next phase:** Phase 12 — responsive, accessibility, performance and release verification.

### Phase 12 — Complete (locally verified, 5 October 2026)

**Implemented IDs:** ADM-QA-01–07. The new release gate `scripts/portal-gate/admin-release.py` runs the complete redesigned journey with one operator, in this order:

1. Password and authenticator sign-in.
2. Dashboard attention link to an application approval.
3. Property decision, then scheduled and passed verification, then exact-revision publication.
4. Booking-case preview and confirmation, which cancels one visit.
5. Inspection of the single resulting Test refund obligation.
6. Support reply, audit trail, then sign-out.

Each step is checked in the UI and in the disposable database. The gate then:

- sweeps every admin page at 320, 640, 768 and 1280 px (400 % and 200 % zoom equivalents);
- runs WCAG 2.2 AA axe at 320 and 1280 px;
- checks the skip link, visible focus, sheet and drawer focus, Escape restoration and reduced motion;
- checks revoked and expired session recovery;
- probes the full API capability matrix and direct URLs for an operator with no grants.

`admin-release-perf.py` compares cold-load JavaScript and timings against a pre-redesign build (`90b0900`) served on the same API. `admin-release-volume.py` times admin APIs at synthetic volume.

**Regressions proved and fixed:**

- **Admin sign-in:** rate-limit and outage errors were never shown, field errors were not linked to their inputs, and React's post-action reset cleared the email after every failed attempt. The form now uses the shared `Field`, shows a form-level alert and keeps the email. Passwords are never echoed back.
- **Saving after a session ended:** the form said only "Admin sign-in required." `ApiError` now maps `ADMIN_REQUIRED` to copy that says the entry is kept and how to sign in again. The draft stays in the form, and the next load redirects to sign-in.
- A unit test covers the session copy.

**Phase 1 findings:** ADM-F01–F07 are closed:

- ADM-F01 in Phase 2.
- ADM-F02 across Phases 3, 5–8 and 10.
- ADM-F03 and ADM-F05 in Phase 10. The F05 assertion now passes in the full backend suite.
- ADM-F04 in Phase 3.
- ADM-F06 in Phase 9, where counts state the scope they were loaded from.
- ADM-F07 in Phase 11.

The release journey and permission matrix re-verify the reachable behavior.

**API/database:** no production backend change, endpoint, capability, migration or dependency. The backend adds only `test/helpers/seed-admin-release-gate.mjs`. It layers the booking/case/refund dataset over the review fixture and restores the review property state. The migration journal still has **64 entries**.

**Verification:**

- **Frontend:** **103 tests passed**; repository ESLint is clean; the production Webpack build has no warnings.
- **Backend:** full suite **237 passed, 1 failed, 0 skipped**. The failure is `owner-ownership-continue`, which needs Cloudinary configured; it passes on its own with dummy values and no network call. The CP25 history failure recorded in Phases 6–8 now passes. Backend lint, format and the migration check pass.
- **Browser:** **19 checks, 97 axe scans, zero violations, zero page errors and zero hydration errors** across 47 pages.
- **Permissions:** all **115** protected API routes refuse the no-grant operator; **53** writes refuse read-only and **62** reads admit it.
- **Cold-load JavaScript:** within **−1.9 % to +4.2 %** of the pre-redesign build; the largest is `/admin/bookings` at 346.7 KiB compressed.
- **Warm medians:** booking sheet opens in 101 ms, a sheet tab switches in 68 ms, a filter applies in 47 ms.
- **Budget:** at most 360 KiB compressed JavaScript per admin route, and the sheet opens in at most 300 ms on the local production build.
- **Volume:** at about 20,000 users, orders and visits, the dashboard and searches respond in 2–35 ms. Booking records page 1 takes 119 ms; page 500 takes 359 ms because of OFFSET pagination.
- **Concurrency:** reviewer, case, refund and payout races pass in the backend suite.

**Remaining limits:**

- Frontend global formatting still flags the unchanged launch roadmap.
- Six detail routes had no seeded record for sweep discovery: audit export, dispute, allocation, payout, statement and privacy. Their Phase 8–10 gates cover them.
- Session recovery returns to the dashboard rather than the original page.
- Deep booking-record pages need keyset pagination or index review once production volume is measured.
- Production providers, workers, hosted-database plans and deployment were not exercised. Nothing is deployed.

**Evidence and reproduction:** [checks](evidence/admin-phase12/checks.json), [browser results](evidence/admin-phase12/browser-results.json), [performance](evidence/admin-phase12/performance.json), [volume](evidence/admin-phase12/volume.json), [journey audit](evidence/admin-phase12/journey-audit-1280.png), [phone dashboard](evidence/admin-phase12/dashboard-320.png) and the [release verification runbook](ADMIN-RELEASE-VERIFICATION.md). Evidence contains no session tokens or credentials. Disposable services, the database, the baseline worktree and the private fixture JSON were removed after the run. Release A6 is complete locally.

## 7. Implementation defaults and boundaries

- Use existing Rentra tokens/components; no new brand theme or chart dependency is required by this plan.
- Keep deep links and backend domain terminology compatible; UI copy uses Owner, Property, Booking and Visit.
- Treat each capability independently. The dashboard has no implied super-admin access.
- Use tables and inspection sheets to match the latest owner workflow; complex decisions keep full-page evidence initially.
- Charts require real aggregates, explicit money/date definitions and accessible tables. Queue urgency takes precedence over decorative analytics.
- Add no editable platform calendar, admin impersonation, automated bulk approvals, live chat or payout execution as part of this UI redesign.
- UI-only phases should need no migration. Dashboard/search/index changes are scoped and verified separately when evidence requires them.

Phases 1–12 are complete and locally verified. The release is locally ready. Deploying it needs the separately recorded production-provider and hosted-database checks.
