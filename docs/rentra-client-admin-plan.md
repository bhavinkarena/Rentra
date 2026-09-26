# Rentra client and Super Admin implementation plan

Prepared: **26 September 2026**. Status: **planning complete; implementation not started under this roadmap**.

This is the current plan for the property-owner/agent portal (`/partner`, database role `client`) and the Super Admin console (`/admin`). It incorporates the customer delivery work, subsequent UI refresh and the Express backend extraction. It specifies operational workflows as well as screens: a polished table without the permission, detail page, state transition and recovery path is incomplete.

Read alongside:

- [Standalone HTML plan](rentra-client-admin-plan.html): the customer-plan-style presentation, with navigation, session cards and Print / PDF. Regenerate it with `python scripts/build-client-admin-plan.py` after editing these Markdown sources (requires Python Markdown and beautifulsoup4).

- [Source-backed UI and capability audit](rentra-client-admin-ui-audit.md): what exists, what is partial and what is missing.
- [32 session-sized implementation parts](rentra-client-admin-sessions.md): dependencies, deliverables and acceptance gates.
- [Customer experience refresh](customer-experience-refresh.md) and [architecture alignment](architecture-alignment.md): preserve the newer customer UI and the current frontend/backend boundary.
- [Customer session history](rentra-customer-sessions.md), [payment flow](rentra-payment-flow.md) and [Part 20 readiness](rentra-customer-part20.md): historical delivery evidence and outstanding payment release decisions.
- [Earlier client concept](rentra-client-plan.html): historical reference. This roadmap takes precedence for conflicting client/admin workflows; it does not rewrite historical completion records.

## 1. What this plan is based on

Source review covers the Next frontend at `Rentra/` (HEAD `86f3e5a`) and Express backend at `rentra-backend/` (HEAD `ad320ae`). Paths in this document are relative to those repositories unless stated otherwise. Both working trees were inspected before planning; no runtime data, credentials, gateway configuration or migrations were changed.

This is a **source and requirements audit**, not a new authenticated browser test or deployed-database certification. Existing test reports are historical evidence. Responsive layout, focus, contrast and deployed behavior must be measured during implementation; they are not declared broken or passing merely from reading JSX.

The current UI already has partner/admin shells, loading states, application review, property editing, calendars, booking details, review moderation, support conversations and operational monitoring. Reuse those investments. The largest missing workflow is **Gate 2 property review and publication**: partner submission can enter `pending_review`, but the mounted admin API has no listing-review/publication workflow.

The customer tracker calls Part 19 complete while explicitly carrying actual hosted Test acceptance into Parts 20–22. Preserve that recorded distinction. A fixture pass or Test API credential probe does not establish a successful hosted capture, refund or deployed webhook.

## 2. Product outcomes and scope

**Client outcome:** an approved owner or authorized agent can create and maintain a property, understand approval requirements, manage inventory, prepare for visits, record what happened, resolve issues, read reviews and reconcile understandable financial records. An unapproved client can finish onboarding and understand the next action.

**Super Admin outcome:** authorized staff can find every relevant business record, inspect its relationships, correct editable data, control publication/access/configuration, manage operational cases, investigate money movement, fulfill reviewed data requests and see who changed what. Routine operations should not need SQL scripts.

**Full control means complete business authority with recorded consequences.** Super Admin can manage all supported domains, including account lifecycle, properties, reference data, policies, operational cases and service settings. Financial facts, accepted booking terms and audit evidence are corrected through explicit reversal, revision or adjudication workflows. A generic edit/delete button must not silently erase the explanation of a payment or change a customer's accepted booking.

| Release | Included | Exit condition |
| --- | --- | --- |
| R1: operational core | Identity controls, client/customer records, both approval gates, property hubs, calendars and booking operations | A submitted property can be reviewed and published without a seed/script; an actual persisted booking can be operated by the correct owner/admin |
| R2: complete Test back office | Staff, support, review detail, Test financial investigation/refunds, reference data, policy management, privacy fulfillment, audit and reporting | Cross-role flows and actual hosted Test acceptance pass; unknown outcomes remain visible and recoverable |
| R3: live finance | Approved live provider configuration, actual settlement/payout execution and provider-backed deposit flows where selected | Customer Parts 20–22 and the associated business/provider prerequisites pass before live UI actions activate |

No new owner “accept booking” step is assumed. Current checkout confirms after verified capture and inventory reservation. Owner acknowledgement is an operational note, not a second confirmation gate. An approval-before-payment model would be a separately approved change to the customer product and payment/hold contracts.

## 3. Roles, ownership and full-control rules

Start with the existing separate admin identity and client/customer identities. Super Admin has all application capabilities. Design permissions now so later staff invitations can grant narrower access without duplicating services.

| Domain | Client / assigned caretaker | Super Admin |
| --- | --- | --- |
| Client identity and KYC | Own profile, verified contact changes, submit/re-submit own documents; caretaker has no KYC access | Search, inspect, approve/request changes/reject, suspend/reinstate, review documents and account correction requests |
| Customer accounts | Booking-scoped contact only when operationally authorized; no customer directory | Directory, account detail, suspend/reinstate, session revocation, identity correction and privacy case handling |
| Listings and publication | Create/edit own listings; pause/resume eligible own listings; caretaker sees assigned properties only | All listings, revision review, verification scheduling, publish/hide/restore/archive, documented edits and restricted ownership-transfer workflow |
| Inventory and prices | Own schedule, blocks and overrides; caretaker permissions do not include pricing by default | Inspect all inventory, correct configuration and owner blocks through the same conflict-safe services |
| Bookings and visits | Own property bookings, permitted contact, handover/return/completion; report a problem | All bookings, case-based cancellation/change resolution, evidence review, disputes and audited operational corrections |
| Payments and refunds | Own statement and refund impact; never arbitrary payment-state editing | All payment/refund evidence, reconciliation and bounded refund commands; provider outcomes establish success |
| Payout destination and payouts | Own destination submission, masked display, statements and explanation of holds | Review destination changes, suspend eligibility, inspect/reconcile payouts; live execution remains provider-gated |
| Reviews and conversations | Reply/report own property reviews; own support threads; no deletion of unfavorable reviews | Moderate according to policy, investigate reports, assign/reply/escalate cases and retain action history |
| Configuration and content | Read applicable policies and client preferences | Versioned business settings, taxonomy, public content, support hours, service enablement and approved provider selection |
| Audit, exports and privacy | Own authorized downloads and own privacy requests | Scoped, logged exports; sensitive access history; reviewed privacy fulfillment and retention exceptions |
| Access management | Invite/revoke own narrowly scoped caretakers once implemented | Manage admin operators and permissions, revoke sessions, recover access, preserve at least one usable Super Admin |

Every mutation needs server-side actor/ownership checks, input allowlists, expected version or equivalent concurrency protection, an idempotency key where retries can duplicate effects, and an audit entry committed with the business change. UI visibility is a convenience, not authorization.

### Data lifecycle policy

| Record | Editable information | Removal/correction behavior |
| --- | --- | --- |
| Unreferenced draft / unused reference item | Validated fields | Delete only after a server-side dependency check; show impact and audit the action |
| Published property / referenced taxonomy | Allowed current metadata and explicit revisions | Archive/deactivate or redirect; preserve booking relationships and historical labels |
| Client/customer account | Correctable profile fields; verified contact-change workflow | Suspend/reinstate operational access; separately reviewed anonymization/deletion with retention result |
| Accepted booking and visit terms | Operational annotations; explicit change/cancellation case | Preserve original snapshots; show original and resulting records, financial effect and inventory effect |
| Verified capture/refund/payout | Provider reconciliation metadata and appended corrections | No manual “paid” toggle and no historical deletion; use supported refund/reversal/recovery commands |
| Evidence, KYC and support attachments | Replacement through versioned records where appropriate | Restricted storage/access and reviewed retention/deletion; never public URLs for private evidence |
| Audit log | Nothing through normal admin CRUD | Append events; restricted retention/archival procedure and access audit |

Provide an **impact preview** before suspension, ownership transfer, archive, bulk status changes, refund, destination changes or configuration publication. It identifies affected records, effective time, financial implications and customer/client-visible consequences. Ordinary low-impact edits can use inline save; do not surround every action with a confirmation dialog.

## 4. Navigation and shared UI contract

Retain Rentra's green palette, typography, existing portal shells and current customer booking-card improvements. Improve workflow density and discoverability before redesigning the visual identity again.

**Client navigation:** Overview; Properties; Portfolio calendar; Bookings; Reviews; Support; Updates; Finance (statements, payouts and destination); Team; Settings. Keep onboarding visible until approved. Restricted items explain the required step. Show finance readiness honestly; an unconfigured payout destination is not a working payout system.

**Admin navigation:** Overview; Work queues (applications, listing reviews, verification); People (clients, customers, team); Properties; Bookings; Finance (payments, refunds, payouts, disputes); Support; Reviews; Content and catalogues; Privacy; Operations; Audit; Settings. Keep gateway settings at a stable bookmark, with an explicit link from finance; do not silently replace `/admin/payments`' current settings meaning.

**Every list:** descriptive title; authoritative total; filter scope; bounded search; URL-backed filters/sort/page; labeled status; row primary link; accessible actions; last refresh; pagination; empty/loading/error/permission states. Counts based on the current page must explicitly say “on this page.” High-impact bulk actions use selection summaries, server eligibility checks, partial-result reporting and a receipt.

**Every detail page:** breadcrumb/back to filtered list; human reference plus copyable internal ID; name/title; state and environment badges; owner/assignee; meaningful primary action; last-updated/version indicator; summary; related records; timeline; attachments; action history. Deep-link tabs or sections. Separate internal notes, shared messages and provider/system events.

**Every form:** labeled controls; units/timezone; saved values; inline errors; focused error summary where needed; pending/success/error state; preserved input on validation/network failure; conflict/reload flow for stale versions; unsaved-change warning when leaving a dirty multi-section editor. Never turn an API outage into a false empty list or “not found.”

**Responsive behavior:** test 360/390px, tablet and desktop. Lists can switch to compact cards or focusable horizontal table regions. Primary actions remain reachable; long references wrap/copy; sticky controls do not cover content. Drawers/dialogs restore focus, trap it where appropriate and support Escape. Actions require accessible names, keyboard operation and reduced-motion behavior. No icon-only unexplained destructive commands.

**Operational details:** all visit times show the property's timezone, overnight end day and turnover buffers; money shows currency and whether it is quoted, collected, refunded, deposit or payout. Test/simulated/legacy/live namespaces remain distinct in badges, filters, totals, downloads and drill-downs.

## 5. Client screens and detail-page requirements

Routes below are **proposed** unless the audit identifies them as existing. Preserve working bookmarks with redirects when adding a property overview separate from editing.

| Destination | Required experience and actions | Data / acceptance requirement |
| --- | --- | --- |
| `/partner` | Existing onboarding or approved overview; add today's arrivals/departures, incomplete handovers, review requests, blocked availability and unread updates; property/date filters and actionable cards | Counts come from operational read models; no invented earnings or occupancy; every card drills into its matching filtered list |
| `/partner/onboarding/*` | Keep current stepper; show flagged fields/documents, submission receipt, decision history, next action and actual review status; allow resubmission without retyping unrelated data | Gate 1 server decisions and client progress agree; no claim that a masked bank suffix proves a verified beneficiary |
| `/partner/listings` | Reuse current property table/filter; cover draft/review/verification/live/paused/hidden/rejected/archived; display next action, public visibility, booking readiness and owner action restrictions | “Live” and “bookable” are separate: missing hours/open inventory or suspended account must be explained |
| `/partner/listings/[id]/overview` | Property operations hub: cover photo, public preview, approval/readiness summary, upcoming visits, calendar link, latest change request, verification appointments and activity | Existing `/partner/listings/[id]` can remain the editor initially; no duplicate editors or loss of wizard resume URLs |
| Existing property editor and wizard | Reuse independently saved sections; add field-level feedback, draft/revision diff, save status and effect preview before trust changes | Current confirmed bookings retain accepted snapshots; price/calendar edits and trust edits follow different review policies |
| `/partner/calendar` and existing per-property calendar | Portfolio agenda/week/month with property/slot filters; distinguish owner blocks, held inventory, committed visits, closed dates and maintenance; click opens interval detail | Mutations continue through shared inventory locks; bulk date actions preview all conflicts and never partly apply silently |
| Calendar/price detail panel | Exact interval including buffers, owner-block reason, source record, override price, expiry if held and actions permitted in this state | Releasing an owner block cannot release a booking reservation; stale price/config writes return a conflict |
| `/partner/bookings` | Existing records list adapted to owner tasks: arriving, in house, departing, action needed, completed, cancelled; filters for property, dates, visit state and payment environment | Avoid mixing parent-order state with individual visit state; an order with several visits is still one order |
| `/partner/bookings/[orderId]` | Keep accepted terms, visit cards, lifecycle forms, payments, downloads and arrival information. Add operational checklist, linked issues/support, internal notes and action receipts | No new accept/decline gate. Any proposed owner cancellation goes through the admin case workflow rather than a direct status edit |
| Visit evidence / incident panel | Record handover, return and completion; display who/when, attestation and state sequence; add protected condition photos and incident submission | Retry-safe uploads/transitions; timestamps and ownership checked; Test/seed evidence never becomes actual-visit evidence |
| `/partner/reviews` and optional `[reviewId]` | Make the existing route discoverable; show property/visit context, score/subscores, moderation visibility, response history and report outcome | Reply/report services already exist; no rating-selective suppression or replacement of the guest's text |
| `/partner/support` and `[id]` | Client-originated cases linked to own property, application, booking or payout; thread, status, attachment limits and escalation category | Separate authorization from customer support. Clients must not gain access to customer private threads via a shared booking ID |
| `/partner/updates` | Persisted operational inbox with unread/read, type filters and links; distinguish stored notification, delivery acceptance, delivery failure and SMS opt-out | No automatic historical-message replay; no promise that a provider accepted message was delivered |
| `/partner/finance` and `/partner/statements/[id]` | Period/property-filtered quote value, verified receipts, refunds, net eligible amounts and adjustments with downloadable statements | Existing live-only accounting is the authority; Test overview is visibly separate and produces zero bank-money payout eligibility |
| `/partner/payouts` and `[id]` | Itemized payout/hold history, contributing visits, deductions, destination version, provider reference and failed/unknown recovery status | No fabricated settlement date or UTR. Disbursement remains disabled until the live readiness gates pass |
| `/partner/settings/payout` | Destination submission, masked history, verification state and pending-change effect; never expose full stored credentials in normal UI | Existing settings currently perform name comparison and retain a masked bank suffix, not a provider-verified payout destination |
| `/partner/team` and `[id]` | Invite assigned caretakers, choose property scopes and allowed tasks, revoke immediately, review recent actions | Default no pricing, finance, KYC or staff-invitation rights; direct API requests obey the same scope |
| `/partner/settings` | Profile/contact verification, actual notification preferences, timezone/language display, consent versions, own sessions and access help | A language choice is not a translated UI; publish only implemented languages/channels |

## 6. Super Admin screens and detail-page requirements

### 6.1 Overview and work queues

Add a business overview at `/admin/overview`; retain `/admin` as the current application queue until an explicit navigation migration. Summary cards cover outstanding applications, listing reviews, visits needing verification, today's bookings, refund/payment exceptions, support, privacy and service health. Each metric declares its period and namespace and links to source records. Do not sum Test booking value into live revenue.

Queues need status, age, assignee, priority/reason, pagination and saved personal views. Define elapsed hours versus staffed/business hours before publishing SLA language; current `SLA_HOURS = 48` uses elapsed time.

### 6.2 People and account control

| Route | Detail sections | Commands and safeguards |
| --- | --- | --- |
| `/admin/clients`, `/admin/clients/[id]` | Identity, owner/agent status, application/KYC, verified contacts, properties, bookings, staff, payout destination versions, cases and audit | Edit permitted profile data, request verification, suspend/reinstate, revoke sessions, archive through reviewed retention workflow. Preview upcoming bookings and support continuity before restricting access |
| `/admin/customers`, `/admin/customers/[id]` | Profile/contact verification, booking history, payment/refund summary, reviews, support/privacy requests and account activity | Correct permitted data, initiate verified contact change, restrict/reinstate access, revoke sessions and open a privacy case. Never expose passwords/OTP secrets or silently merge accounts sharing a phone |
| Existing `/admin/applications/[id]` | Retain current reviewer detail and document viewer; add assignee, changed-field comparison, review pass, decision history and linked client detail | Approve/request information/reject with reason and stale-version check. Sensitive document reads remain protected and audited |
| `/admin/team`, `/admin/team/[id]`, `/admin/security` | Operators, permission sets, active sessions, MFA enrollment/recovery state and activity | Super Admin invites/revokes operators, changes permissions, revokes sessions; protect the last active Super Admin; recovery must not depend on exposing a TOTP secret in the UI |

Define a restricted suspension mode for clients who still have future bookings: prevent new listings/checkouts while allowing only explicitly approved fulfillment/help access, or assign fulfillment to an admin. Current active-client guards broadly deny suspended clients; do not promise continued owner access without implementing that distinction.

Ownership transfer is exceptional: show all affected listing permissions, future visits, statements and current destination relationships; require a reason and recent authentication. Do not silently change historical booking owner/payee attribution. Until a complete safe transfer service exists, show a case action rather than a raw `client_id` editor.

### 6.3 Properties, Gate 2 and verification

Provide `/admin/listings`, `/admin/listings/[id]`, `/admin/listing-reviews` and `/admin/verifications/[id]`.

The listing detail has **Overview, Content, Location, Schedule & pricing, Documents, Review & verification, Bookings, Activity** sections. Include public/private preview modes, owner link, exact versus publicly approximate location, readiness blockers, current publication state and the submitted revision under review.

Review compares the submitted immutable revision with the last approved revision. Approve only the reviewed version; if the owner changes material content, surface the conflict. Admin may request field-specific changes, reject with reason, approve for verification, record verification outcome, publish, hide, restore or archive according to the transition contract.

Verification detail includes property/revision, mode (video/physical), assignee, scheduled timezone/date, reschedule history, checklist, restricted evidence, outcome and decision reason. A completed form does not itself prove a site visit. Publication checks document/content requirements, account eligibility, inventory readiness and the applicable verification rule.

| Current state / trigger | Proposed transition | Guard and visible consequence |
| --- | --- | --- |
| Complete draft or corrected rejected listing | Pending review | Capture revision and review pass; client gets a receipt |
| Pending review needs correction | Changes requested | Use existing review outcome plus correction metadata; choose whether a new listing enum is necessary during schema design rather than assuming it exists |
| Review accepted for inspection | Pending verification | Schedule/record actual verification; publication remains blocked |
| Verification and review requirements satisfied | Live | Authorized publish with evidence and revision match; refresh discovery/detail/sitemap caches |
| Live owner pause | Paused | Stops new discovery/checkout as appropriate; preserves bookings and records |
| Admin safety restriction | Hidden / admin restriction | Record reason and affected bookings; owner resume cannot undo admin restriction |
| Trust-field edit on live content | Pending revision/re-review | Current code removes live status on trust edits. Preserve that behavior initially and show its impact; retaining the old approved public version needs a separately implemented revision model |
| Restore/re-publish | Eligible prior publication state | Recheck current restrictions, account state and material review requirements; never blind status toggling |
| Retirement | Archived | Add explicit archive metadata/state if required; preserve referenced history and URLs according to approved redirect policy |

Admin editing is available through typed sections and the same validation used by clients. Price changes affect future quotes; accepted bookings remain unchanged. Admin calendar overrides must resolve or refuse conflicts, not bypass the reservation exclusion constraint.

### 6.4 Booking operations and case detail

Extend the existing `/admin/bookings` and `/admin/bookings/[orderId]`; do not rebuild them as unrelated records. Detail sections: **Summary, Visits, Customer & client, Accepted terms, Payments & refunds, Issues, Notes & communications, Timeline & audit**. Include links to both people, property and payment/refund details.

Distinguish parent order, individual visit, payment, refund, fulfillment and support state. A refund can be pending after cancellation; closing support does not close a refund. Notes must state whether they are internal or customer/client-visible.

Add `/admin/booking-cases/[id]` for owner cancellation, date/guest change requests, no-show, late arrival and operational corrections. Show original terms, requested outcome, affected visits, recalculated availability/policy/financial result and customer communications. Execute a previewed, idempotent command. A requested rebooking does not reserve replacement dates. Use existing cancel-and-rebook behavior until an atomic amendment product is explicitly selected and built.

Visit evidence detail retains original evidence and actor/time. Correct mistakes through a superseding evidence decision with reason; do not fabricate actual evidence by relabeling Test/seed visits or allowing a global “completed” dropdown.

### 6.5 Finance and disputes

Keep `/admin/payments` as gateway settings initially. Add `/admin/finance/payments`, `/admin/finance/payments/[id]`, `/admin/refunds/[id]`, `/admin/payouts/[id]` and `/admin/disputes/[id]` with corresponding searchable lists.

| Detail | Required information | Permitted operator actions |
| --- | --- | --- |
| Payment | Provider/environment, booking/customer, expected amount and collection purpose, attempts, server verification, capture allocations, sanitized event history, reconciliation state, linked refunds | Re-fetch/reconcile existing outcome, inspect safe errors, open case. Never mark captured from a callback screenshot or manually change a transaction amount |
| Refund | Original capture, per-visit/component caps, prior obligations, reason/policy, requested versus verified result, retry history and destination/provider reference | Preview then request eligible refund; retry/reconcile the original unknown obligation; escalation. No second refund for an uncertain first result |
| Payout | Verified live funding sources, owner and destination version, adjustments/holds, execution attempts, provider reference and reconciliation | Review/hold/release eligibility and reconcile. Actual send requires Parts 20–22, provider adapter and permission checks; Test cannot fund payout |
| Deposit / dispute | Whether a deposit was actually collected and by whom; visit/evidence, claimed damage, responses, deadlines, decision, financial effect and appeal/escalation | Open/assign/request evidence/adjudicate; release or refund only verifiable collected funds under the selected policy. A listing deposit estimate is not a refundable balance |

Super Admin manages installed provider enablement, full/advance policy and readiness. Secret values stay in deployment secret management; UI shows readiness and masked references. New gateways require reviewed code adapters; admin configuration cannot upload executable provider code. Disable blocks **new** attempts while callbacks, webhooks, refunds and reconciliation for existing obligations continue.

Finance exports must reconcile to source facts, preserve integer minor-unit accuracy, explicitly separate Test/simulation/live and show filters/as-of time. Do not derive revenue from a booking total, saved destination or legacy payout cache. Tax rates, settlement promises and deposit policy remain business inputs requiring their own review; this plan supplies no legal/tax determination.

### 6.6 Support, reviews, privacy and operations

| Destination | Extend or add | Required detail behavior |
| --- | --- | --- |
| Existing support inbox/thread | Add assignment, priority, internal notes, client-originated cases, related-record links, escalation and controlled attachments | Separate private participant channels; save before success; stale replies and concurrent status changes handled; message delivery distinct from thread persistence |
| Existing review queue; `/admin/reviews/[id]` | Detail-first moderation and report history | Author/eligible visit, exact text and subscores, owner reply, reports, publication decisions and reasons; consistent treatment of low/high scores |
| Existing privacy queue; `/admin/privacy/[id]` | Fulfillment workflow beyond the current “start review” | Requester verification, inventory of affected data, retention decisions, approvals, export artifact/expiry, deletion/anonymization job outcome and completion receipt; partial failures visible |
| Existing delivery list; `/admin/notifications/[id]` | Searchable outbox/event detail and safe replay controls | Template/version/channel, recipient access restrictions, attempts, provider acceptance/delivery, suppression reason; uncertain POSTs reconciled before retry |
| Existing operations; `/admin/operations/incidents/[id]` | Alert drill-down, ownership, acknowledge/snooze/escalate/resolve, related job/record links | Acknowledgement does not clear the underlying failure; missing heartbeat stays unknown/stale; recovered service and human incident resolution are separate |
| `/admin/audit` and event detail | Search/filter immutable business events and sensitive reads | Actor, entity, request/correlation reference, reason, redacted before/after, result and links; document access/export is itself audited |

### 6.7 Catalogues, content and settings

Create a typed management area rather than a generic database-table editor.

| Admin-managed resource | Required controls | Dependency behavior |
| --- | --- | --- |
| Cities and areas | Name, slug, hierarchy, active status, approved approximate map centre | Validate coordinate ranges and city membership; preserve referenced locations; preview affected discovery URLs and redirects |
| Categories and amenities | Labels, active status, ordering, allowed attribute/value types, requirements | Do not change an amenity's value type in place when data exists; use migration/replacement with affected-listing preview |
| Search intents | Slug, label, compatible filters, publication and ordering | Existing `INTENTS` is code-defined in frontend/backend. Migrate both consumers to a validated registry; arbitrary routes/query expressions are not editable input |
| Help, terms, privacy and cancellation explanations | Draft, preview, review, publish version and effective date, rollback by new version | Keep previously accepted versions addressable; public explanation changes alone cannot change booking computation |
| Business policy | Versioned supported fee/collection/limits/cancellation settings and effective date | Separate business-configurable values from code-enforced safety limits; re-quote changed future selections and preserve accepted snapshots |
| Support contact/hours and templates | Verified channels, timezone/staffed hours, validated template variables, preview and test recipient control | No fake live chat, fabricated response promises or arbitrary bulk sends; actual sends require the documented operator action |
| Public media/content | Approved image assets, alt text, ordering, publication schedule where supported | Reuse upload validation; no arbitrary scripts/HTML/remote code; keep private KYC/evidence outside the public media library |
| Feature/provider controls | Installed capability, role/cohort scope if supported, readiness, version and reason | A feature toggle cannot activate an unimplemented payment method or bypass an external release gate |

`src/services/constants.js` contains search intents, accepted document types and upload limits. Classify each before exposing controls: editorial taxonomy can become data-managed; document-policy changes need a reviewed effective version; upload/type/security ceilings remain bounded implementation controls. Do not make every constant freely editable simply because Super Admin has global authority.

## 7. Backend, API and data design

Keep database/auth/payment mutations in **rentra-backend**, using its routes → controllers → services → Drizzle structure. The Next app uses existing server API wrappers/actions or RTK Query services for interactive screens. Do not recreate old Next direct-database services from historical runbook paths.

Backend API examples below are **proposed relative to the configured API prefix**, not currently available promises: `/admin/clients/:id`, `/admin/customers/:id`, `/admin/listings/:id/reviews`, `/admin/verifications/:id`, `/admin/finance/payments/:id`, `/admin/refunds/:id/reconcile`, `/partner/support/:id`, `/partner/team/:id`, `/admin/catalogues/:type` and `/admin/audit`.

Every part documents exact method/path/body/response/error/permission contracts before wiring a button. Keep the existing response envelope, 401/403 semantics, redirect/revalidation metadata, request correlation and raw signed-webhook ordering. Use 409 for stale/conflicting operations where appropriate; distinguish missing records from service unavailability. Scope object reads as strictly as writes, including downloads, attachments and related-record suggestions.

Use a consistent bounded query contract: validated `q`, status, property/owner, date interval, environment, sort allowlist and pagination. Cap export/list size, return authoritative totals where promised and index the actual predicates. Full-text search and joins must not leak another client's record through counts or autocomplete.

### Reuse versus new schema

| Existing foundation to reuse | Likely addition / explicit design work |
| --- | --- |
| `user`, `admin_user`, `client_application`, document records | Admin capability grants, revocable admin/client session records where missing, identity correction and account action history |
| `rentable`, `listing_review`, `verification_visit`, prices/availability | Immutable submitted revisions, review assignment/versioning, verification artifacts, archive/restriction metadata and controlled transfer records |
| Booking orders/visits, inventory reservations, visit evidence | Operational cases, evidence attachments and correction decisions; never replace the reservation/ledger model |
| Payment/refund/allocation/payout foundations | Read models and safe operator command records; beneficiary versions and payout execution only with the live finance work |
| Customer support, review reports, privacy requests, notification outbox | Participant-aware partner support, assignments/internal notes, case attachments, privacy fulfillment/export jobs and operator alert cases |
| `client_staff` | Real invitation/authentication/property-scoping/revocation; an existing table is not a delivered staff feature |
| Audit log, service health, aggregate measurement | Admin audit readers, append-only enforcement review, export manifests, scoped configuration versions and operational event links |

Inspect the current backend migration journal before choosing migration numbers. The customer refresh documents `0021_customer_profile_photo`, but file registration is not proof of deployment. Add forward migrations with data backfill verification where needed; never edit applied history or duplicate backend schema in the frontend.

Customer-visible invalidation is part of admin correctness: publication, property edits, review moderation and reference changes must update listing/search/home/sitemap data; private state changes must invalidate only the affected authenticated caches. Clear RTK private caches on identity changes. Multi-step service transitions need database transactions; external calls run through durable state/outbox patterns with uncertain outcomes preserved.

## 8. Acceptance scenarios

| ID | Scenario / pass condition |
| --- | --- |
| CA01 | A client cannot read/mutate another owner's property, visit, staff, statement or attachment through UI, API, download or guessed IDs |
| CA02 | Customer/partner cookies cannot access admin; revoked/suspended/permission-changed actors lose access on the next protected operation; suspended-client fulfillment follows the selected policy |
| CA03 | Two admins decide the same application/revision: one committed decision, one clear conflict; no duplicate notification or contradictory audit result |
| CA04 | Client submits a property, admin requests changes, client resubmits, verification is recorded and the reviewed revision publishes without SQL |
| CA05 | Material edit, admin hide and owner resume race safely; owner resume cannot undo admin restriction; old confirmed booking snapshots remain intact |
| CA06 | Last-space booking versus owner/admin block has one valid winner; overnight/buffer conflicts and bulk preview failures leave no partial surprise |
| CA07 | Multi-visit detail shows mixed visit states correctly; repeated handover/completion/cancellation commands create one business effect and evidence chain |
| CA08 | Admin booking change/cancellation preview identifies exact affected visits, amounts and replacement-inventory limitations; refresh/retry cannot release/refund twice |
| CA09 | Test/simulation/legacy amounts never enter live earnings/payout; payment/refund lists, detail, totals and exports reconcile without duplicated joins |
| CA10 | Invalid provider evidence cannot mark paid; disable blocks new payment attempts but preserves outstanding callback/webhook/refund/reconciliation handling |
| CA11 | Concurrent refund requests respect remaining captured allocations; uncertain outcomes retry/reconcile the same obligation and remain visibly pending |
| CA12 | Destination changes do not redirect already pinned payout obligations; failed verification prevents disbursement and exposes a recovery path |
| CA13 | Scoped caretaker can operate only assigned visits and cannot change prices, see owner earnings, review KYC or invite staff |
| CA14 | Client/customer support participants and internal notes stay isolated; assignment, replies, attachments and resolution persist before success |
| CA15 | Review moderation has score-neutral reasons/history; publication/removal updates the public detail and aggregates without deleting evidence |
| CA16 | Referenced taxonomy cannot be blindly deleted; deactivation/replacement preserves old records and expected URLs/canonical discovery behavior |
| CA17 | Policy/configuration publication has preview/version/history; stale quotes revalidate while historical accepted rules and URLs remain available |
| CA18 | Privacy export contains only authorized data, expires and logs access; deletion/anonymization reports retained records and failed stages accurately |
| CA19 | Export jobs, dangerous bulk operations and sensitive document reads are authorized, bounded and audited; secrets never appear in lists, logs or exports |
| CA20 | Stale or failed workers and provider queues produce actionable drill-downs; acknowledging an alert does not fake service recovery |
| CA21 | API outage differs from empty/not-found; filters, form input and context survive retry/back navigation; no optimistic financial success |
| CA22 | Keyboard and mobile critical journeys pass on measured routes; dialog focus, labels, errors, contrast, table access and loading states are verified |
| CA23 | Existing customer login, selection, quote, checkout, bookings, cancellation, privacy, review, support and approximate-location behavior do not regress |
| CA24 | Actual hosted Razorpay Test capture/refund/webhook scenarios have independent evidence; fixtures and screenshots of a success callback are insufficient |

CA24 and live-finance prerequisites are release gates, not checkboxes that documentation can satisfy. Record what ran, where, against which revision, and which provider/migration actions were actually performed.

## 9. Decisions to settle before dependent implementation

Planning can proceed with the defaults below; implementation must record the selected business rule before building a conflicting irreversible workflow.

| Decision | Proposed planning default | Needed by |
| --- | --- | --- |
| Client meaning | Existing owner and authorized-agent roles; no new rental-vendor category assumed | CP03/CP05 |
| Suspended clients with upcoming visits | Block new business; admin-controlled fulfillment/help path with narrow permissions | CP01/CP03 |
| Verification requirement | Keep existing pending-verification concept; define qualifying evidence and who may waive requirements, if anyone | CP07 |
| Live listing trust edits | Preserve current re-review/unpublish behavior initially; approved-public-revision continuity is an explicit follow-up design choice | CP08 |
| Owner cancellation and guest changes | Case-based admin resolution and existing cancel/rebook rules; no silent owner cancellation | CP14 |
| High-impact approvals | Recent authentication + reason + impact preview for Super Admin; optional second approver when an organization actually has another qualified operator | CP20/CP21/CP26/CP28 |
| Client-originated support | Separate participant-scoped cases with optional admin-linked customer case, not a shared private conversation | CP17 |
| Live commission/tax/deposit/settlement policy | Remains unanswered in customer Part 20 until the business records it; no rates or payout promises invented here | CP11/CP22/CP23/CP32 |
| Language and communications | Keep implemented English and configured channels; translate/add channels only through explicit deliverables | CP15/CP25 |
| Public content editor | Structured fields and validated media, no arbitrary scripts or executable HTML | CP25 |

## 10. Delivery discipline

Use the [session roadmap](rentra-client-admin-sessions.md). Every part includes frontend, backend, relevant schema/API work, meaningful verification and a handoff when required by that slice. A database table, route stub or beautiful mock does not count as a complete feature.

Start with **CP01**, then CP02–CP08: access foundations, directories and the two approval workflows close the highest operational gaps. Do not begin by replacing every shell or adding decorative dashboards. Preserve customer releases and their outstanding payment gates throughout.

For each completed part, update the session status, audit gap disposition and `rentra-client-admin-partNN.md` runbook with changes, actual check results, migration/deployment status, limitations and the next part. Keep historical customer completion counts separate from this new roadmap. This planning change itself does not complete any CP implementation part.
