# Rentra client and Super Admin session roadmap

Planning date: 26 September 2026. **Implementation: 14/32 parts complete. Next: CP15.** CP01 migration `0022` was applied to the configured database on 26 September 2026; apply it to any other target database before deploying CP01 backend code. CP02 has no migration. CP03 migration `0023` is applied to the configured database (verified read-only). CP04 has no migration. CP05–CP08 migrations `0024`–`0027` were applied to the configured database on 26 September 2026 (verified read-only afterwards: 28 of 28 recorded, none pending). CP09–CP12 have no migration. CP13 migration `0028_visit_evidence_records` was applied to the configured database on 27 September 2026 (verified read-only afterwards: 29 of 29 recorded, none pending). CP14 migration `0029_booking_cases` is **not applied** to the configured database; apply it before deploying CP14 backend code.

Read the [requirements plan](rentra-client-admin-plan.md) and [source-backed gap audit](rentra-client-admin-ui-audit.md) together with this roadmap. These CP numbers are a new workstream; they do not replace customer Parts 01–22 or change their completion claims. Client means the existing owner/authorized-agent portal.

## How to use this roadmap

One part is the target for one implementation session, including its meaningful checks and handoff. This is a scope boundary, not a promise about token capacity or elapsed time. Recheck the current source and dependencies before starting; other developers may have changed the baseline. If a part exceeds the available session, leave it in progress with a precise continuation record. Do not declare it complete because its UI or schema alone exists.

Each part owns its end-to-end slice: necessary Express API/service/schema changes, frontend integration, server-side permissions, persisted loading/error/success behavior, and regression evidence. Reuse existing foundations. Routes and models in the requirements plan are proposals until implemented. Never bypass the backend by adding direct frontend database access.

CP01–CP14 are **COMPLETE**. All later parts are **PLANNED**, including externally gated parts. The dependency column means the relevant behavior must be available and verified, whether delivered here or already present in the current source.

| Part | Session scope | Dependencies | Status |
| --- | --- | --- | --- |
| CP01 | Access, capabilities and session revocation | Current auth baseline | COMPLETE |
| CP02 | Shared portal interaction foundations | CP01 | COMPLETE |
| CP03 | Client directory, detail and lifecycle | CP01–02 | COMPLETE |
| CP04 | Customer directory and account controls | CP01–02 | COMPLETE |
| CP05 | Gate 1 application review | CP03 | COMPLETE |
| CP06 | Gate 2 property review | CP03, CP05 | COMPLETE |
| CP07 | Verification and publication | CP06 | COMPLETE |
| CP08 | Revisions and admin publication restrictions | CP06–07 | COMPLETE |
| CP09 | Client property operations hub | CP02, CP06–08 | COMPLETE |
| CP10 | Portfolio calendar and interval operations | CP09 | COMPLETE |
| CP11 | Versioned pricing and booking policy | CP08, CP10; applicable business decisions | COMPLETE |
| CP12 | Booking work queues and operational detail | CP02–04, CP09 | COMPLETE |
| CP13 | Visit evidence and incidents | CP12 | COMPLETE |
| CP14 | Admin booking resolution cases | CP12–13 | COMPLETE |
| CP15 | Client tasks, updates and preferences | CP05–14 | PLANNED |
| CP16 | Caretaker invitations and property access | CP01, CP09, CP12–13 | PLANNED |
| CP17 | Client support and admin case assignment | CP03–04, CP12 | PLANNED |
| CP18 | Review detail and moderation history | CP02–04, CP09 | PLANNED |
| CP19 | Payment investigation console | CP04, CP12 | PLANNED |
| CP20 | Refund operations | CP14, CP19 | PLANNED |
| CP21 | Versioned payout destinations | CP01, CP03 | PLANNED |
| CP22 | Statements and payout read models | CP19–21; approved display definitions | PLANNED |
| CP23 | Dispute and deposit cases | CP13–14, CP17, CP19–20 | PLANNED |
| CP24 | Reference-aware catalogue administration | CP08–09 | PLANNED |
| CP25 | Content and policy publication | CP11, CP24 | PLANNED |
| CP26 | Admin operator and security management | CP01–02 | PLANNED |
| CP27 | Privacy fulfillment | CP04, CP17, CP26 | PLANNED |
| CP28 | Audit browser and governed exports | CP03–27 | PLANNED |
| CP29 | Operational incidents and service controls | CP15, CP19–20, CP26, CP28 | PLANNED |
| CP30 | Cross-role regression and hosted Test acceptance | CP01–29; hosted Test environment | PLANNED |
| CP31 | Accessibility, performance and operator handoff | CP30 for release; UI checks may start earlier | PLANNED |
| CP32 | Later live-finance activation | CP30–31, customer Parts 20–22 and external gates | PLANNED |

## Release boundaries

- **R1 — Core operations:** CP01–18. Clients can submit, correct and operate properties; admins can review, publish, control accounts and resolve operational cases. Run relevant customer regression and accessibility checks for these journeys before an R1 deployment. Incomplete finance controls remain unavailable.
- **R2 — Complete Test back office:** CP19–31, including security, privacy, audit and operator handoff. Actual hosted Test evidence is required for the payment acceptance claim. Fixture success alone cannot complete that gate.
- **R3 — Live finance:** CP32 only after the existing customer live-payment, refund and payout workstream and external prerequisites pass. R1/R2 do not imply permission or readiness to collect or disburse live money.

The sequence favors closing the missing property approval workflow early. Independent parts can be reordered when their dependencies pass. Do not launch unverified later controls simply because navigation has been added.

## Session specifications

### CP01 — Access, capabilities and revocable sessions

**Deliver:** Inventory protected routes and define explicit Super Admin, client and future caretaker capabilities. Enforce the capability checks in Express; add a revocable-session or equivalent server-checked version mechanism across protected operations. Agree the suspended-client fulfillment rule and distinguish restricted fulfillment access from creating new business. Frontend receives only permitted actions and clear expired/revoked/restricted states.

**Gate:** Verify cross-audience cookie rejection, direct API denial, session revocation and suspension on the next protected request, including downloads. Record a permission matrix and session migration/logout behavior. Acceptance: CA01–02, CA19. Defer operator management screens to CP26; preserve existing valid sign-in journeys.

**Gate passed — 26 September 2026:** the disposable-PostgreSQL integration test passed against the real `0022` SQL, DAL and Express middleware. It covered cross-audience cookie rejection, 403 on a permission-less document download, revocation on logout, suspension, permission, password, TOTP and deactivation changes, expiry, legacy tokens and an issuance/suspension race. Backend `npm test` (75 pass, 1 skipped without the disposable URL), `db:check`, ESLint/Prettier, frontend tests (15/15) and the Webpack build also passed. Customer tokens remain valid; client/admin users sign in once. Suspended clients have no portal access; admins fulfill existing bookings. Migration `0022` was applied to the configured database on 26 September 2026. [CP01 handoff and permission matrix](rentra-client-admin-part01.md).

### CP02 — Shared list, detail and form behavior

**Deliver:** Extend existing portal primitives with consistent page headers, breadcrumbs, URL-backed filtering/pagination, detail tabs, contextual actions, validation summaries and explicit empty/error/forbidden/not-found states. Add the planned navigation structure with only available destinations enabled; expose the existing partner reviews route. Define mobile list/card and action-menu behavior, dialog focus, dirty-form handling and retry preservation.

**Gate:** Demonstrate representative client and admin list/detail/form flows with keyboard and narrow viewport checks. An API outage must not become an empty list or false 404. Acceptance: CA21–22. Do not restyle every page in this session.

**Gate passed — 26 September 2026:** a 35-check headless Chrome gate passed against a disposable local stack. It covered the client property list/editor/calendar at 1280px and 390px, a filtered list carried into the detail breadcrumb, not-found for foreign and malformed ids, and a focused server validation summary with preserved input. It also covered the unsaved-change warning, the keyboard drawer (focus in, trapped, Escape, focus restored), capability navigation, and the forbidden state for a limited admin. With the API stopped, saves announced the failure and kept the input, and pages showed a retryable outage instead of a 404 or an empty list. axe found no serious/critical WCAG A/AA issues on the scanned routes. Frontend tests (17/17), ESLint, Prettier and the Webpack build passed. No backend or schema change. [CP02 handoff](rentra-client-admin-part02.md).

### CP03 — Admin client directory and lifecycle

**Deliver:** Searchable, paginated client directory and detail with profile, onboarding status, linked properties/bookings and lifecycle history. Implement explicit suspension/reinstatement commands with reason, impact preview and concurrency protection. Apply CP01's fulfillment policy; show upcoming obligations and a safe resolution path. Reserve financial/team tabs for their later real integrations.

**Gate:** Suspend and reinstate through the UI and direct API, verify permission changes, stale-version conflicts and upcoming-booking visibility. Acceptance: CA01–03, CA19, CA21. Do not implement property ownership transfer as an unguarded owner-ID edit; list it as unavailable until historical attribution is preserved.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 35-check browser/API gate passed. They covered the directory with authoritative counts, URL-backed search/filter and mobile layout, and client detail with upcoming visits and an impact preview. UI suspend and reinstate each committed once with a reason and audit entry. The client's session ended on the next request, and the owner's listing left and returned to public pages while the upcoming visit stayed confirmed. A second admin's stale view got 409 with reload, and a concurrent race let exactly one command win. Direct API: 401 for anonymous and client cookies, 403 for a read-only operator writing, 422 for a missing reason, 409 for stale or invalid transitions. Reinstatement restores the pre-suspension status. axe found no serious/critical issues; backend and frontend checks passed. Ownership transfer is listed as unavailable. [CP03 handoff and API contract](rentra-client-admin-part03.md).

### CP04 — Admin customer directory and account controls

**Deliver:** Customer search and detail with linked bookings, support, reviews and privacy records. Add permitted profile corrections, account restriction/reinstatement and session revocation with reason/history. Separate identity corrections from authentication recovery; no plaintext credentials, secrets or unrestricted impersonation.

**Gate:** Verify object-level permissions, sensitive-field minimization, duplicate/invalid correction handling and revocation while a session is active. Acceptance: CA02, CA19, CA21, CA23. Deletion/export requests link to the privacy workflow; fulfillment arrives in CP27.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 38-check browser/API gate passed. They covered the directory with masked phones (the full number never appears in list output), search by phone digits, and detail with bookings, support, reviews, privacy requests and sessions, with no secrets in the response. Corrections rejected invalid values, duplicate emails, no-op edits and stale versions, and kept typed input. Audit entries record field names, not values. The phone credential is not editable, and a correction does not sign the customer out. Sign out everywhere ended an active customer session on the next request. Restriction and reinstatement are version guarded, with one winner in a race, and never revive sessions. Direct API: 401 for anonymous and customer cookies, 403 for read-only or clients-only operators, 404 for client ids. CP02 and CP03 gates passed as regression; backend 81/81 with all disposable-DB tests. No migration. [CP04 handoff and API contract](rentra-client-admin-part04.md).

### CP05 — Gate 1 application review

**Deliver:** Upgrade the existing application queue with pagination, filters, assignment, aging and stable return-to-list context. Detail includes safe document access, application history, structured correction requests and approve/reject decisions tied to the reviewed version. Client sees actionable correction requirements and resubmission progress. Replace unsupported verification claims with the actual evidence status.

**Gate:** Two reviewers cannot commit contradictory decisions; duplicate submissions cannot send duplicate decision notifications. Check private document authorization and correction/resubmission. Acceptance: CA01, CA03, CA19, CA21. Reuse current review services instead of introducing a parallel approval system.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 35-check browser/API gate passed. They covered the paginated queue with filters, aging and return context, and claim/take-over/release. Two reviewers deciding the same version produced exactly one decision and one audit record (field fingerprints, never values), and duplicate or pre-resubmission decisions got 409. The client saw structured corrections on the flagged steps and resubmitted, and the review showed what changed. Approval was blocked for a payout mismatch or a non-pending account. An approved client stayed signed in. The third strike blocked the account and ended its sessions. Document access was authorized, and cross-client deletion was refused. Existing routes were reused. Fixed on the way: KYC documents were queried by the wrong owner, so the stepper never completed. This session also shipped the owner-requested portal UI refresh: shared shell, collapsible sidebar, workspace type scale, search and tabbed detail pages. CP02–CP04 gates passed on it. [CP05 handoff](rentra-client-admin-part05.md).

### CP06 — Gate 2 listing queue and review detail

**Deliver:** Add the missing admin listing-review API and UI. Queue filters identify pending work and responsible reviewer. Detail renders a specific submitted revision, readiness failures, photos, location, rules, amenities and owner/application links. Persist request-changes, rejection and approval-for-verification decisions with reasons and exact revision attribution; clients can see and address them.

**Gate:** Exercise submission, request changes and resubmission without database editing. Reject stale decisions and unauthorized publication attempts. Acceptance: CA03–04, CA19, CA21. Approval for verification is not publication; CP07 owns that transition.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 39-check browser/API gate passed. Submitted revisions are immutable snapshots; content and child-record edits make them stale, so an old screen cannot decide. The gate covered the queue and detail at 1280/390px with axe clean, assignment conflicts, and required correction sections with the typed reason preserved on failure. The client saw the reason and sections and resubmitted through the UI; approval stopped at pending verification, and `published` was refused. Concurrent contradictory decisions produced one review record and one audit entry. Access checks: 401/403/404/400 on the direct API, and private evidence limited to the current revision. A `status=all` queue failure was fixed. CP02–CP05 gates passed as regression. Migrations `0024`–`0025` were pending at the gate; since applied (26 September 2026). [CP06 handoff](rentra-client-admin-part06.md).

### CP07 — Verification scheduling and publication

**Deliver:** Build on existing verification schema for assignment, appointments, cancellation/rescheduling, evidence, findings and history. Specify required evidence and any explicitly authorized waiver policy. Publish only the eligible reviewed revision after server-side checks; record actor, revision, time and decision. Update client progress and public visibility/cache behavior.

**Gate:** Complete the full submission-to-publication journey through UI/API; insufficient evidence and stale revisions cannot publish. Exact/private location and verification attachments stay protected. Acceptance: CA03–05, CA19, CA23. Publication must not falsely imply saleable inventory exists.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 53-check browser/API gate passed. Verification uses the existing `verification_visit` table, extended by migration `0026`. Each visit is tied to the exact submitted revision, allows one open visit per property, and is version-guarded for reschedule and cancel. Evidence policy: a passed outcome needs all six checklist items, at least 20 characters of findings and, for a site visit, on-site coordinates. There is no waiver. The gate scheduled, rescheduled and recorded evidence through the UI; incomplete evidence was refused and the typed values were kept. Publishing without evidence, publishing another revision and a second publish were refused, and a records-only operator got 403. UI publication made the verified revision live with attribution. The public page appeared without the address, findings, coordinates or checklist. The client saw the scheduled visit, then live with a cannot-book-yet note. A React form-reset bug that dropped checkboxes after a refused command was fixed here and in the CP06 decision form. CP02–CP06 gates passed as regression. Migrations `0024`–`0026` were pending at the gate; since applied (26 September 2026). [CP07 handoff](rentra-client-admin-part07.md).

### CP08 — Listing revisions and administrative restrictions

**Deliver:** Add version-aware admin corrections and revision comparison/history. Distinguish owner pause from admin visibility restriction and implement hide/restore with reasons, preview and version guards. Preserve current re-review behavior for material edits unless a reviewed design explicitly introduces separate public/working revisions. Confirmed bookings retain their accepted snapshots.

**Gate:** Race material edit, publication, admin hide and owner resume; an owner cannot undo an admin restriction. Verify existing booking fulfillment remains accessible under the chosen policy. Acceptance: CA03, CA05, CA23. Property archival must handle references; no cascading deletion of business history.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test, a pure-rule unit test and a 56-check browser/API gate passed. Admin hide/restore is separate from owner pause and carries a reason, an impact preview and a `lifecycle_version` guard. That version is bumped by the content trigger on every status change, so every writer is covered. Owner edits and pause/resume now decide under the row lock. An owner cannot resume, submit or publish a hidden property, and a trust edit while hidden makes restore return to review. A trust edit on a paused property now also needs review. Races covered: owner pause vs hide (409), hide vs owner resume (refused), concurrent restores (one winner) and publish vs hide (exactly one commits). Confirmed bookings stay confirmed with their accepted snapshot and arrival details. Documented admin corrections of public text are guarded by `content_version`, keep the published revision and are audited with before/after values. The submission tab compares revisions against the published one, and the history tab shows all activity. Review, verification and customer-review foreign keys now restrict deletion; there is no archive state (hide is the retirement control). CP02–CP07 gates passed as regression. Migrations `0024`–`0027` were applied after the gate (26 September 2026). [CP08 handoff](rentra-client-admin-part08.md).

### CP09 — Client property operations hub

**Deliver:** Give a property a real overview distinct from its editor: approval/readiness, saleable inventory, upcoming visits, calendar, pricing, rules, photos and action history. Improve editor section errors, save/conflict feedback and actionable review corrections. Replace unsupported earnings ranges and misleading live/bookable copy. Preserve public preview and setup routes where useful.

**Gate:** A client can move from directory to property status, correction, save and calendar without losing context. Verify another owner's IDs are denied and network errors remain recoverable. Acceptance: CA01, CA04–05, CA21–22. Do not invent earnings estimates without a documented data basis.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL service test and a 41-check browser/API gate passed. The new `/partner/listings/[id]/overview` hub shows status and next step, Rentra's requested changes with links to each flagged section, bookability (live vs bookable, hours, open dates, next open date), upcoming visits linked to their bookings, a content summary, setup progress and client-safe activity. Verification findings, notes, assignment and operator identities are never shown. Directory rows open the overview; editor and calendar breadcrumbs return through it to the filtered list. Editor saves send the content version they were rendered from; a stale save gets 409 `LISTING_CHANGED`, writes nothing, keeps the typed values and offers a reload. Flagged editor sections carry Rentra's reason. The invented earnings range and the "visible and bookable" claim are gone, and the KPI counts bookable properties. Another owner's ids give 404/not found, and an API outage shows a retryable state, not not-found. No migration. CP02–CP08 gates passed as regression. [CP09 handoff](rentra-client-admin-part09.md).

### CP10 — Portfolio calendar and interval detail

**Deliver:** Add a visual portfolio/per-property calendar over current availability services. Show bookings, owner blocks, holds, buffers and overrides distinctly, with a keyboard-accessible list alternative. Interval detail links its source record and allowed actions. Bound bulk changes with affected-interval preview and explicit atomicity/result semantics.

**Gate:** Exercise last-space booking versus blocking, overnight intervals, buffers, expired holds and stale overrides. Owner unblock never releases a booking reservation. Acceptance: CA01, CA06, CA21–22. Reuse authoritative inventory transactions; calendar color is not availability authority.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL integration gate and a 37-check browser/API gate passed, plus two outage checks. Portfolio and property calendars now show agenda/week/31-day month views with URL-backed property/slot/date filters, bookings, active holds, owner blocks, buffers, closed dates and overrides. Keyboard disclosures link the source booking or permitted owner action. Date additions (up to 31 dates), price overrides, blocks and releases use exact-input previews, shared inventory locks and stale-snapshot refusal. Previews roll back all writes and audit entries; confirmation commits atomically. The gate covered overnight buffers, expired holds, one winner in a booking-vs-block race, preserved closed dates, booking-id unblock refusal and concurrent releases. Browser checks covered 1280/390px, axe clean, keyboard expansion, month filters, persisted blocks/releases, stale typed price preservation/reload, foreign ids, audience rejection and immediate session revocation. Both outage routes offered retry. Backend 92/92, frontend 19/19, lint/format, migration-file checks and Webpack build passed. No migration or configured-database write. [CP10 handoff and contract](rentra-client-admin-part10.md).

### CP11 — Versioned pricing and supported booking policy

**Deliver:** Classify current code constants into business-editable settings versus security/technical limits. Implement only approved pricing/policy controls with typed validation, preview, effective version and audit history. Persist accepted policy snapshots and invalidate/revalidate stale quotes. Document precedence between property prices, overrides and permitted platform settings.

**Gate:** Verify invalid/racing updates, boundary dates, existing booking snapshots and customer quote totals. Acceptance: CA06, CA17, CA23. Customer Part 20 still owns unresolved live commercial decisions; do not silently select taxes, commission, deposits or settlement promises to finish this part.

**Gate passed — 26 September 2026:** a disposable-PostgreSQL integration test, a 44-check browser/API gate and a 22-check outage gate passed (shared with CP12). Existing owner rates, terms and schedule controls now use exact-input previews, versioned confirmation and safe before/after history. Previews write nothing. Invalid, foreign and unpreviewed writes are refused, and racing confirmations have one winner and one audit entry. New quotes snapshot cancellation bands and pricing constants; old quotes are refused with `QUOTE_CHANGED`, and accepted booking snapshots are unchanged. Stale prices keep typed input, reload to the latest saved value and then save. The setup wizard previews before advancing. The policy page passed at 1280/390px with axe clean, and the editor and setup step show a retryable outage state. No live tax, commission, deposit or settlement policy was selected. Backend 96/96, frontend 19/19, lint/format and the isolated production build passed. No migration or configured-database write. [CP11 handoff and contract](rentra-client-admin-part11.md).

### CP12 — Booking work queues and operational detail

**Deliver:** Extend existing booking records/detail rather than rebuilding them. Add role-specific upcoming/today/action-needed filters, property links and per-visit status/action presentation. Clearly distinguish booking-wide payment status from mixed visit states. Scope arrival instructions and customer contact to authorized operational need; connect admin customer/client details.

**Gate:** Verify multi-visit and mixed-state bookings, empty/error states and cross-owner access. Existing automatic confirmation after verified capture remains intact. Acceptance: CA01, CA07, CA21–23. Do not add owner accept/reject booking decisions.

**Gate passed — 26 September 2026:** the same integration, browser/API (44/44) and outage (22/22) gates passed. Owner/admin Today and Action needed queues work over existing records with ownership-scoped property filters and preserved list context. Mixed confirmed/cancelled visits and booking-wide payment state are shown separately. Per-visit cues offer only the applicable evidence action; handover/return/completion replays produce one effect. Arrival and contact are limited to active fulfilment, and admin detail links customer, client and property. Access checks passed: foreign owner, audience, read-only admin and revocation. Owner queue/detail and admin detail passed at 390px with axe clean. A records-service outage shows a retryable state that keeps filters and recovers on **Try again**. Verified Test capture still confirms automatically through the real checkout services, and customer cancellation still honours the accepted snapshot idempotently. Running that regression exposed and fixed a pre-existing double-encoded JSON write in checkout; the webhook path has the same defect and is recorded as a follow-up. No owner accept/reject step. No migration. [CP12 handoff](rentra-client-admin-part12.md).

### CP13 — Visit evidence and incident records

**Deliver:** Extend existing visit transitions with private attachments, permitted evidence types, upload limits, server validation and retention classification. Add visit-linked incidents and correction records that supersede earlier evidence without erasing it. Record actor, time, provenance and version for handover/return/completion evidence.

**Gate:** Duplicate or stale transitions produce one effect; unsafe/unauthorized uploads and guessed downloads fail. Distinguish real from simulated evidence. Acceptance: CA01, CA07, CA19. Financial liability adjudication belongs to CP23, not an incident checkbox.

**Gate passed — 27 September 2026:** a disposable-PostgreSQL integration test, 4 unit tests, a 31-check browser/API gate and 6 failure-path checks passed; the CP11/CP12 gate re-ran 44/44 as regression. Handover, return and completion evidence can carry up to 3 private photos (JPEG/PNG/WebP detected from bytes, 2MB each, 30 per visit), stored with content-addressed keys and no overwrite. Photos are served only through an authorized, audited proxy; foreign, guessed and mismatched ids get 404. Owners and admins report visit-linked incidents with photos, and admins close them with a version guard and an operational note only; liability stays with CP23. Admin corrections supersede evidence in one linear chain without erasing the original, refuse stale or out-of-order changes, never reverse a visit state and never relabel Test evidence as actual. Evidence shows actor, times, visit version and an Actual or Test badge. Replays are one effect; unsafe or stale submissions write and upload nothing; forms keep input on failure; direct SQL edits and deletes are refused by triggers. An open incident is admin Action needed work. Backend 101/101, frontend 19/19, lint/format and the isolated build passed. Migration `0028` was applied to the configured database on 27 September 2026 (29 of 29 recorded). [CP13 handoff and contract](rentra-client-admin-part13.md).

### CP14 — Admin booking change and cancellation cases

**Deliver:** Add cases linked to exact visits with requester, reason, assignment, evidence and outcome. Preview cancellation effects on inventory and refund eligibility using existing rules. For changes, expose the supported cancel-and-rebook route and replacement-inventory limitations; do not mutate confirmed booking snapshots in place. Provide customer/client progress communication.

**Gate:** Repeat and race resolution requests without duplicate releases or refunds. Make partial/multi-visit effects explicit and do not promise replacement inventory before it is reserved. Acceptance: CA07–08, CA11, CA23. Refund-provider operations are CP20.

**Gate passed — 27 September 2026:** a disposable-PostgreSQL integration test with a real paid two-visit order, 3 unit tests, a 34-check browser/API gate and 6 failure-path checks passed; the CP13 (31/31) and CP11/CP12 (44/44) gates re-ran as regression. Owners request cancellation or report no-shows, late arrivals and operational issues from their booking; admins open customer cancellation and change cases for exact visits, assign them and message with explicit audiences (internal, owner, customer, everyone). A preview shows exactly which visits are cancelled or unaffected, the inventory released, refunds per visit capped by remaining verified capture, and whether the booking stays confirmed. For change requests it runs a non-reserving availability check and says nothing is reserved; the customer uses Book again. Resolution happens once: confirming reuses the customer cancellation engine with one refund obligation per capture, and stale previews, repeats, admin races and a customer cancellation landing first are refused without a second release or refund. A lost response after commit replays on retry. Owner cancellations default to a full refund and other cases to the accepted policy (recorded decision). Customers see only shared updates, and the customer booking page still renders. Backend 105/105, frontend 19/19, lint/format and the isolated build passed. **Migration `0029` is not applied to the configured database; apply it before deploying.** [CP14 handoff and contract](rentra-client-admin-part14.md).

### CP15 — Client task dashboard and persisted updates

**Deliver:** Replace decorative overview content with scoped tasks derived from existing approval, readiness, visit and case states. Add a persisted client updates inbox with read status, deep links and supported notification preferences. Ensure task counts and destinations agree; distinguish informational updates from required work.

**Gate:** Verify counts and permissions after state changes, repeat delivery, read/unread persistence and failed-load recovery. Acceptance: CA01, CA20–21. Scope to current channels and defined operational events; this is not a marketing campaign builder or a new chat system.

### CP16 — Caretaker and team access

**Deliver:** Turn existing staff foundations into owner-managed invitation, acceptance, assigned-property access and revocation. Enforce a narrow caretaker capability set for assigned visits/evidence and permitted operational contact. Expire/revoke invitations and active sessions; show owner-visible membership history.

**Gate:** Test guessed property IDs, reassignment, expired/reused invites and revoked active sessions. Caretakers cannot access earnings, KYC, pricing or staff administration. Acceptance: CA01–02, CA13, CA19. Owner permission does not grant platform administration.

### CP17 — Client support and assigned admin cases

**Deliver:** Add client-originated cases and threads alongside current customer support. Admin detail supports assignment, status, internal notes, attachments and links to relevant records. Keep participants explicit; linking client/customer cases never shares their private threads. Persist messages before showing success.

**Gate:** Verify customer/client/internal-note isolation, reassignment conflicts, duplicate reply handling and private attachments. Acceptance: CA01, CA14, CA19, CA21. Reuse configured delivery and existing thread semantics where appropriate.

### CP18 — Review detail and moderation history

**Deliver:** Complete client review discoverability and admin review/report detail with booking/property links, response/report history and reasoned moderation. Show what becomes public before a reply or moderation decision is committed. Keep evidence and previous decisions while updating visible content and aggregates consistently.

**Gate:** Check score-neutral moderation, report resolution, concurrent changes and public review count/rating invalidation. Acceptance: CA01, CA15, CA21, CA23. Negative sentiment alone is not a removal reason; no rewriting guest ratings through admin profile editing.

### CP19 — Payment investigation console

**Deliver:** Add transaction lists and details separate from gateway settings: environment/provenance, attempt/order/payment IDs, allocations, linked bookings, evidence, events and reconciliation state. Build accurate filters, pagination and totals from authoritative records. Expose only supported safe reconciliation commands with idempotency and audit.

**Gate:** Verify totals against fixture ledger cases without duplicated joins or live/Test mixing. Invalid callback evidence cannot mark paid; disabled gateway behavior still handles outstanding obligations. Acceptance: CA09–10, CA19, CA21. Provider credentials and raw sensitive payloads are not general UI fields.

### CP20 — Refund operations queue and detail

**Deliver:** Implement refund eligibility preview, exact allocation/amount breakdown, guarded submission and processing/uncertain/failed/succeeded detail. Link cancellation cases and provider events; retry or reconcile the same obligation after ambiguity. Explain rejection and recovery paths without optimistic refunded labels.

**Gate:** Concurrent requests cannot exceed remaining captured funds. Verify duplicate callbacks, timeout-after-provider-acceptance and repeated operator commands. Acceptance: CA08–11, CA19. Test fixtures validate logic; real provider acceptance is recorded separately in CP30.

### CP21 — Versioned payout destinations

**Deliver:** Replace misleading name-match claims with explicit draft/submitted/verified/failed states based on actual available evidence. Introduce safe destination versions, masked display, access controls, recent-authentication requirements and a provider verification boundary. Obligations pin their destination version; unsupported verification remains visibly unavailable/pending.

**Gate:** Verify private field handling, failed verification, stale changes and destination pinning. Acceptance: CA02, CA12, CA19. No live payout activation or provider verification success claim without corresponding integration/evidence; a last-four-digit comparison is not verification.

### CP22 — Statements and payout read models

**Deliver:** Define and implement owner/admin statements, period filters, booking/allocation links, adjustments and payout detail from current immutable evidence. Label pending, eligible, held and settled amounts precisely; separate all environments. Show unavailable capabilities honestly when live settlement has not shipped.

**Gate:** Reconcile list/detail/statement totals, partial refunds, old-owner attribution and pinned destinations. Acceptance: CA01, CA09, CA12, CA19. This is a read-model/UI session, not implementation of a new live payout engine or permission to disburse.

### CP23 — Dispute and deposit adjudication cases

**Deliver:** Add case intake, evidence, assignment, requested response and reasoned resolution linked to visits/payments. Distinguish service disputes from provider disputes. Where an approved deposit policy and actual collection exist, show the supported release/deduction consequences and money workflow links; otherwise show deposit collection as unavailable.

**Gate:** Verify isolated participants/evidence, conflicting resolutions and monetary effects routed through authoritative refund/payment services. Acceptance: CA07–11, CA14, CA19. Never refund an uncollected deposit or turn an incident into an automatic charge. Actual provider dispute submission is conditional on a supported adapter.

### CP24 — Reference-aware catalogue administration

**Deliver:** Add scoped catalogue screens and details for supported categories, amenities and location/reference data. Implement validation, ordering, active status, usage counts and replacement/deactivation previews. Preserve existing references, attribute types and public navigation semantics.

**Gate:** Referenced records cannot be blindly deleted; check replacement effects, duplicate labels/slugs, stale writes and customer discovery regression. Acceptance: CA16, CA19, CA23. Changes requiring data migration are explicit migrations, not unconstrained field edits.

### CP25 — Public help, content and policy publication

**Deliver:** Add structured draft/preview/publish/history workflows for the agreed help/contact/policy content. Keep immutable published policy versions and historical URLs where referenced. Link applicable versions to customer acceptance; invalidate appropriate public caches and provide rollback as a new publication.

**Gate:** Verify permissions, input sanitization, stale publication, historical references and customer rendering. Acceptance: CA17, CA19, CA23. Do not allow arbitrary scripts, invent legal promises or silently rewrite previously accepted terms.

### CP26 — Admin operator and security management

**Deliver:** Add Super Admin operator directory/detail, permitted capability assignment, activation/deactivation, session management and supported MFA enrollment/recovery. Use CP01 enforcement. Require recent authentication for high-impact access changes and prevent accidental removal of the last usable Super Admin.

**Gate:** Verify lost/revoked factors, role changes during active sessions, direct endpoint denial, self-lockout prevention and recovery auditing. Acceptance: CA02, CA19. Recovery does not expose existing passwords or TOTP seeds to operators.

### CP27 — Privacy fulfillment jobs

**Deliver:** Extend the existing acknowledgment screen into identity/authority review, scoped export and deletion/anonymization jobs with stage tracking, retries and outcome receipts. Exports expire and require authorized download. Document which financial/audit records remain under the approved retention policy and how identifying fields are handled.

**Gate:** Verify foreign-account exclusion, expired downloads, partial failure/restart and accurate retained/deleted results. Acceptance: CA18–19, CA23. Do not claim full deletion when required stages failed or retained records remain; privacy jobs must not erase financial evidence.

### CP28 — Audit browser and governed exports

**Deliver:** Build admin audit search/detail with actor, action, target, reason, correlation and safe before/after differences. Add bounded asynchronous exports for explicitly authorized datasets and receipts for supported bulk operations. Record sensitive reads/downloads and keep export access scoped and expiring.

**Gate:** Verify authorization at job creation and retrieval, revoked access, redaction, bounds and retry-safe execution. Acceptance: CA02, CA09, CA19. No generic SQL console, unrestricted table editor or delete-history control; bulk business mutations require their existing preview/command semantics.

### CP29 — Operational incidents and service settings

**Deliver:** Connect existing operations/delivery monitors to actionable record drill-downs, incident assignment/notes/resolution and supported retry/reconciliation commands. Add typed controls only for the settings approved in the requirements plan, with change history and impact preview. Separate alert acknowledgment from measured recovery.

**Gate:** Verify worker/provider backlog and failure fixtures, stale data, recovery evidence and duplicate retry commands. Acceptance: CA10, CA17, CA20–21. Gateway disable still preserves outstanding processing; changing a setting does not imply infrastructure deployment or provider readiness.

### CP30 — Cross-role regression and hosted Test acceptance

**Deliver:** Run integrated customer/client/caretaker/admin journeys against the completed code, including direct API abuse and concurrency cases. Validate the split frontend/backend deployment boundary. Exercise actual hosted Razorpay Test capture, cancellation/refund and webhook/reconciliation scenarios with server evidence, pinned revisions and sanitized provider identifiers.

**Gate:** Record CA01–24 results, fixes and unresolved blockers. Fixtures are separate evidence from actual provider execution. Required Test credentials belong in local/deployment secret storage, never documentation. Without a usable hosted environment/provider configuration, keep the provider gate blocked and this part incomplete; independent regression work can still finish.

### CP31 — Accessibility, performance and operator handoff

**Deliver:** Audit critical client/admin workflows on representative mobile/desktop sizes and keyboard/screen-reader paths. Measure list/detail responsiveness and pagination under a documented data volume; resolve material problems. Finish navigation, empty/error states, help text and operator runbooks for approvals, booking incidents, refunds, privacy and recovery.

**Gate:** Record tested routes, measured conditions, accessibility issues resolved and any remaining limitations. Acceptance: CA19–24 plus relevant release regressions. UI verification may start while CP30 is waiting for external input; the R2 release gate remains incomplete until required CP30 evidence passes.

### CP32 — Later live-finance activation

**Deliver:** Integrate and expose the already-delivered customer Parts 20–22 live payment/refund/payout capabilities in these admin/client screens. Check live configuration, commercial policy, destination verification, environment separation, reconciliation, operations ownership and rollout/rollback controls. Activate only capabilities whose underlying engine and external gates have passed.

**Gate:** Record required provider/business approval, actual environment-specific acceptance, accounting reconciliation and deployment evidence. Acceptance: CA09–12, CA19–20, CA23 plus the live-workstream gates. CP30 Test evidence does not certify live behavior. If the underlying live engine is missing, this slice stays blocked; building that engine is not hidden inside this one-session UI activation part.

## Verification and completion record

Choose meaningful feature checks for the changed behavior, including API permissions and concurrency where applicable. Run repository checks appropriate to the touched code. At this baseline the frontend provides `npm run lint`, `npm run format:check`, `npm test` and `npm run build`; use the documented Webpack build option when the environment requires it. The backend has its own checks and `npm run db:check`; inspect its current scripts before running them. A source review or successful build does not prove runtime or provider acceptance.

Schema work must record forward migration files, schema/journal agreement, compatibility and whether each target database was actually migrated. Use isolated verification data for destructive/concurrency tests. Do not assume a configured database is current because a historical handoff says a migration was generated.

For each completed part create `rentra-client-admin-partNN.md` with:

1. Scope delivered, affected frontend/backend revisions and linked CP/CA/G IDs.
2. Screens, business commands and schema/API changes, including important decisions.
3. Actual verification commands/scenarios and results; distinguish fixture, browser, hosted Test and live evidence.
4. Migration, configuration and deployment status for each environment, with no secrets.
5. Remaining limitations, external dependencies and the exact next step.

Update this table and the audit dispositions only when the evidence supports the status. Use PLANNED, IN PROGRESS, BLOCKED or COMPLETE. A blocked part names the dependency and what remains actionable; a completed part has working behavior and passed required gates, not merely a merged design.

## Prompt for the next implementation session

> Start CP15 from docs/rentra-client-admin-sessions.md. Read the requirements plan, UI gap audit and the CP01–CP14 handoffs, inspect current frontend/backend changes and applicable repository instructions, and confirm migration `0029` status and the CP13 incident and CP14 case records in the current source; client tasks should derive from them rather than duplicate them. Consider first fixing the recorded webhook `redacted_payload` double-encoding (CP12 follow-up), with a webhook integration test. Preserve the existing customer behavior. Verify the permission/session cases and appropriate repository checks, write the part handoff, and update status only for work actually completed.

Replace CP15 with the next ready part on later sessions. If a previous part is incomplete, continue its recorded remainder before claiming the dependent part is ready.
