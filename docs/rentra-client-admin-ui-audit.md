# Client and Super Admin: current UI and capability audit

Source audit: **26 September 2026**. Frontend HEAD `86f3e5a`; backend HEAD `ad320ae`.

This audit supports the [requirements plan](rentra-client-admin-plan.md) and [implementation sessions](rentra-client-admin-sessions.md). It includes later customer UI changes and the Express extraction. Findings are based on mounted routes, services, schemas and page/component source. No new authenticated browser or production database audit was performed for this document.

**Existing** means a current page/route/service was found, not that every edge case passed a new test. **Partial** means a useful foundation exists but the proposed operational workflow is incomplete. **Missing** means the required application surface was not found in the inspected mounted routes/pages; a schema table or historical plan may still exist. **Verify** identifies a source-visible risk or runtime assertion to test. Priorities are P0 (core operational blocker), P1 (required back-office capability), P2 (polish/scale after core).

## Current foundations to preserve

| Area | Source evidence | Current capability |
| --- | --- | --- |
| Partner/admin shells | `components/partner/PartnerShell.jsx`, `components/admin/AdminShell.jsx` | Grouped navigation, desktop/mobile shell components, pending-link indicators and role-specific chrome already exist |
| Client onboarding | `app/(partner)/partner/onboarding/*`, backend `src/routes/partner.route.js` | Details, phone, documents, consent/payout setup, application submission and withdrawal |
| Gate 1 admin review | `app/(admin)/admin/applications/[id]/page.js`; backend `src/services/auth/admin-actions.js` | Application inspection, KYC document review, approve/more-info/reject and client suspension |
| Property creation/editing | Wizard routes, existing `/partner/listings/[id]`, backend `src/services/auth/listings.js` | Independent section saves, ownership-scoped reads, uploads, submission, trust-field re-review and pause/resume |
| Booking calendar | `BookingCalendarSettings.jsx`; backend `src/services/booking/owner-settings.js`, `inventory.js` | Schedule, guest limits, open dates, owner blocks and price overrides; use the existing authoritative inventory logic |
| Owner/admin records | Existing role booking routes, `AdminBookingDetail.jsx`, operational `BookingRecords.jsx` | Lists/details, accepted terms, customer/purpose, visits, payments, arrival data, summary/calendar downloads and evidence-based transitions |
| Reviews | `/partner/reviews`, `/admin/reviews`; backend `src/services/reviews/service.js` | Owner replies/reports and admin moderation/report decisions; add discoverability/detail workflow rather than rebuilding eligibility |
| Customer support | `/admin/support`, `/admin/support/[id]`; backend `src/services/support/service.js` | Persisted private customer conversations, admin replies and status management |
| Financial foundations | Backend `src/services/payments/*`, schema and worker | Test adapter/configuration, verification/webhooks/reconciliation/refunds, allocation accounting and live-funding boundaries |
| Operational foundations | `/admin/operations`, `/admin/notifications`; backend operations/notifications services | Health, aggregate metrics, namespace totals, outbox monitoring and constrained retry/reconciliation |
| API architecture | Frontend `lib/api/*`, `lib/services/*`; backend routes/controllers/services | Next frontend over Express API, response metadata, auth middleware, validated services, cron registry and forward migrations |

## Gap register

| ID | State / priority | Observed gap and source | Required outcome | Parts |
| --- | --- | --- | --- | --- |
| G01 | Missing / P0 | Backend `src/routes/admin.route.js` mounts application review but no property review/publication API; partner `submitListing` enters `pending_review` | Complete Gate 2 queue, property detail, revision decision, verification and publication workflow | CP06–CP08 — **CP06: Gate 2 queue, submitted-revision detail and decisions complete, 26 September 2026** ([handoff](rentra-client-admin-part06.md)); **CP07: verification scheduling, evidence and revision-exact publication complete, 26 September 2026** ([handoff](rentra-client-admin-part07.md)); **CP08: revision comparison, admin hide/restore, documented corrections and activity history complete, 26 September 2026** ([handoff](rentra-client-admin-part08.md)) |
| G02 | Partial / P1 | Partner detail is a full editor; wizard also exists, but no separate property operations hub | Overview tying approval, readiness, upcoming visits, calendar, issues and public preview together | CP09 — **complete, 26 September 2026**: `/partner/listings/[id]/overview` with status, corrections, bookability, visits, activity and context-keeping links ([handoff](rentra-client-admin-part09.md)) |
| G03 | Partial / P1 | Partner overview emphasizes onboarding/property portfolio counts rather than today's fulfillment | Task-based arrivals/departures/attention dashboard with real counts and drill-downs | CP12/CP15 |
| G04 | Verify / P1 | Partner overview hard-codes an ₹8,000–₹14,500 earnings range; its live-listing hint says “Visible and bookable by guests” | Remove or substantiate earnings claims; distinguish publication from actual availability/readiness | CP09/CP15 — **CP09: earnings range removed; live and bookable counted separately, 26 September 2026** ([handoff](rentra-client-admin-part09.md)); finance figures remain CP15 |
| G05 | Missing / P0 | Admin navigation/routes lack a general client directory/detail and reinstatement workflow; suspension exists as an action | Search all clients, inspect relationships, manage account lifecycle and preserve fulfillment obligations | CP03 — **complete, 26 September 2026** ([handoff](rentra-client-admin-part03.md)) |
| G06 | Missing / P1 | No admin customer directory/detail/session-control workflow was found | Customer account operations with verified corrections and cross-record links | CP04 — **complete, 26 September 2026** ([handoff](rentra-client-admin-part04.md)) |
| G07 | Partial / P0 | Admin guards establish an active admin, but no capability grants or per-session admin-management surface exists; client routes broadly require active status | Capability foundation, revocable access, explicit suspended-client fulfillment contract | CP01/CP26 — **CP01 foundation complete, 26 September 2026** ([handoff](rentra-client-admin-part01.md)); operator management remains CP26 |
| G08 | Partial / P1 | Gate 1 queue query returns submitted applications without bounded pagination/filter contract; review/decision pages already exist | Paginated assigned queue, field-level correction history and stale-decision protection | CP05 — **complete, 26 September 2026** ([handoff](rentra-client-admin-part05.md)) |
| G09 | Partial / P1 | `listing_review` and `verification_visit` exist in schema but no mounted operational admin workflow was found | Scheduled verification detail, evidence checklist, outcome and authorized publication | CP07 — **complete, 26 September 2026**: scheduling, reschedule/cancel, checklist/findings/coordinates evidence, outcomes and publication of the verified revision ([handoff](rentra-client-admin-part07.md)) |
| G10 | Partial / P1 | `applyEdit` sends live trust edits back to review; pause/resume is a current-state toggle | Explicit revision diff and optimistic versioning; review/hide/edit/resume race safety and separate admin restrictions | CP08 — **complete, 26 September 2026**: revision diff against the published revision, `lifecycle_version`/`content_version` guards, locked owner edits and conditional pause/resume, admin hide/restore that the owner cannot undo ([handoff](rentra-client-admin-part08.md)) |
| G11 | Partial / P1 | Calendar screen is schedule/block/override forms for one property | Portfolio visual agenda and interval drill-down while preserving backend inventory authority | CP10 — **complete, 26 September 2026**: portfolio/property agenda, week and rolling month, safe interval details, atomic previews and stale guards; 37 browser/API checks plus two outage checks ([handoff](rentra-client-admin-part10.md)) |
| G12 | Partial / P1 | Partner booking pages reuse the customer record component with `operational`; useful detail and transitions exist | Owner-focused work views/checklists, linked issues and visit-level state clarity | CP12/CP13 — **CP12 complete, 26 September 2026**: owner/admin Today and Action needed queues, mixed-visit detail, per-visit evidence actions and scoped contact/arrival; 44 browser/API checks plus 22 outage checks ([handoff](rentra-client-admin-part12.md)). Visit-linked incidents and evidence photos delivered in CP13 |
| G13 | Missing / P1 | No mounted admin booking amendment/owner-cancellation case workflow | Previewed, idempotent case resolution using accepted rules and available inventory | CP14 |
| G14 | Partial / P1 | Visit evidence stores note/attestation/time; no dedicated condition-photo/incident case workflow found | Restricted evidence attachments, incident detail and superseding correction history | CP13/CP23 — **CP13 complete, 27 September 2026**: private audited evidence photos, visit-linked incidents with admin closure, superseding admin corrections that keep the original; 31 browser/API checks plus 6 failure-path checks ([handoff](rentra-client-admin-part13.md)). Dispute and liability decisions remain CP23 |
| G15 | Discoverability / P1 | `/partner/reviews` exists but `PartnerShell`'s nav groups omit Reviews | Link and improve the existing feature; connect review detail/report status to the eligible visit | CP02/CP18 — **CP02: Reviews added to owner navigation, 26 September 2026** ([handoff](rentra-client-admin-part02.md)); review detail remains CP18 |
| G16 | Missing / P1 | Partner routes have no client-originated support or operational inbox surface | Client support cases and persisted updates with participant isolation | CP15/CP17 |
| G17 | Schema only / P1 | `client_staff` schema exists; mounted partner routes expose no staff invitation/auth/property-scoping management | Working caretaker permissions, invitation/revocation and property assignment UI/API | CP16 |
| G18 | Partial / P1 | `/admin/payments` is **Gateway settings**, not a searchable payment investigation console | Separate finance payment list/detail, attempts, allocation/event timeline and reconcile action | CP19 |
| G19 | Partial / P1 | Refund accounting/services exist; no dedicated admin refund list/detail/preview command interface | Bounded refund operations and recovery; unknown outcomes cannot create duplicate obligations | CP20 |
| G20 | Partial / P1 | Partner payout settings compare entered names and save a masked bank suffix; no provider-backed beneficiary verification or versioned approval surface | Accurate readiness copy, destination history/verification workflow and pinned payout destinations | CP21 |
| G21 | Missing UI / P1 | Live-only accounting readers and payout schema exist; no dedicated owner statement/payout detail or admin payout console | Reconciled read-only finance screens first; actual execution behind the existing live release gates | CP22/CP32 |
| G22 | Schema/enum foundation / P1 | Booking `disputed` and payout `frozen` values exist without a complete dispute/deposit case interface | Evidence-based case detail, party responses, adjudication and verifiable financial effect | CP23 |
| G23 | Missing / P1 | Cities/areas/categories/amenities are read by listing/catalogue APIs; mounted admin routes have no catalogue CRUD | Validated admin management, reference-aware archive/replacement and public invalidation | CP24 |
| G24 | Code-defined / P1 | `src/services/constants.js`, booking policy and frontend equivalents contain intents/labels/limits; public policy versions are code data | Separate editorial/business settings from technical limits; draft/publish/version/rollback workflows | CP11/CP25/CP29 — **CP11 complete, 26 September 2026**: constants classified; supported property pricing/terms/schedule controls previewed, versioned and audited; accepted snapshots preserved and stale quotes refused ([handoff](rentra-client-admin-part11.md)). Editorial publication remains CP25/CP29 |
| G25 | Partial / P1 | Privacy admin can list requests and start review; UI explicitly says export/deletion are separate | Request detail, reviewed retention plan, export/anonymization jobs and verified completion receipt | CP27 |
| G26 | Backend foundation / P1 | `audit_log` and audited actions exist, but no admin audit browser or governed export console | Searchable/redacted event history, sensitive-read audit and scoped export jobs | CP28 |
| G27 | Partial / P1 | Operations and delivery pages exist; no incident assignment/escalation/detail path for every alert | Actionable alert links, incident workflow and safe provider/delivery recovery | CP29 |
| G28 | Verify / P1 | Property edit page uses `partnerApi.listing(id).catch(() => null)` before `notFound()` | Distinguish missing/unauthorized records from API outage; preserve recovery and do not mislabel a service failure as a missing property | CP02/CP09 — **CP02: editor, calendar, walkthrough and admin application now separate not-found, forbidden and outage, 26 September 2026** ([handoff](rentra-client-admin-part02.md)); property hub remains CP09 |
| G29 | Verify / P1 | Current KYC and payout settings copy can read as stronger verification than name comparison; old client plan includes unverified targets and policy assumptions | Copy tied to recorded evidence, configured capabilities and approved commercial rules | CP05/CP21/CP25 — **CP05: Gate 1 identity and approval wording now states staff review, not provider verification, 26 September 2026** ([handoff](rentra-client-admin-part05.md)); payout copy remains CP21 |
| G30 | Runtime verification pending / P1 | Shells/loaders/tables exist, but this review did not interact with authenticated mobile/keyboard journeys | Measured route-level responsive/accessibility/performance and permission coverage | CP30/CP31 |
| G31 | External gate / P0 for release | Part 19 provider acceptance record remains unexecuted in the inspected customer handoff; Part 20 is in progress | Actual hosted Test capture/refund/webhook evidence before live enablement; no success inference from fixtures | CP30/CP32 |
| G32 | Cross-application / P0 | Customer UI and API extraction changed after older runbooks; source paths and some historical commands no longer describe the live code layout | Build in Express/Next current architecture, keep shared contracts coherent and re-run current customer flows | Every part; CP30 |

## UI improvements by surface

| Surface | Keep | Add / refine |
| --- | --- | --- |
| Partner shell | Existing responsive navigation, account state and pending navigation feedback | Reviews, calendar, support, updates, finance and team only when real routes are delivered; accurate current breadcrumb and capability-based navigation |
| Admin shell | Existing grouped dark sidebar and reusable admin primitives | People, properties/reviews/verification, finance, audit/content/settings; avoid a very long flat navigation list |
| Property editor | Existing stepwise creation and independent section editing | Operations overview, revision state, field feedback, unsaved state, conflict recovery and change-effect preview |
| Calendar | Existing hours/price/block mutations | Readable slot/status legend, buffer/overnight presentation, event detail and bulk impact preview |
| Booking detail | Accepted snapshots, per-visit timeline, payment information, arrival data and downloads | Task-oriented owner header, admin linked records, internal note boundaries, cases and action receipts |
| Admin application | Existing complete review page and private document viewer | Queue context, assignment, decision/history diff and conflict-safe review |
| Payment settings | Existing Test gateway/version controls | Clear separation from transaction investigation; readiness without showing secret values |
| Support and review queues | Current persistence, replies/moderation and honest on-page counts | Search/filter/pagination consistency, dedicated review detail, assignment/internal notes and related-record navigation |
| Privacy/operations | Existing acknowledgement, health, delivery and namespace separation | Fulfillment/detail/recovery workflows; no “resolved” or “completed” claims without the underlying operation |

## How findings become verified

During each implementation part, record the route, role, fixture/data source, before/after behavior and executed check. Screenshots alone cannot prove authorization, finance correctness or persistence. Use screenshots for layout/focus evidence, API assertions for access boundaries, database concurrency checks for races and independent provider evidence for payment outcomes.

No existing shell should be discarded solely because it appears in this audit. “Missing” rows become complete only when their UI, API, data rules and acceptance gate are delivered together. Update the gap row with the completed part/runbook and date; do not rewrite this baseline as if the feature had always existed.

## Source entry points

- [Frontend architecture notes](architecture-alignment.md)
- [Customer refresh and later map/card work](customer-experience-refresh.md)
- [Admin navigation](../components/admin/AdminShell.jsx) and [partner navigation](../components/partner/PartnerShell.jsx)
- [Admin booking detail](../components/admin/AdminBookingDetail.jsx) and [shared booking records](../components/customer/BookingRecords.jsx)
- [Backend admin routes](../../rentra-backend/src/routes/admin.route.js) and [partner routes](../../rentra-backend/src/routes/partner.route.js)
- [Backend schema](../../rentra-backend/src/services/db/schema/index.js)
- [Listing edit/review transitions](../../rentra-backend/src/services/auth/listings.js)
- [Payout settings implementation](../../rentra-backend/src/services/auth/settings.js)
- [Current backend constants](../../rentra-backend/src/services/constants.js)
- [Existing hosted Test acceptance record](rentra-customer-part19-provider-acceptance.md)
