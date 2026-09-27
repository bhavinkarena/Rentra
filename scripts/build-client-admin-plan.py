"""Build the offline HTML plan from its Markdown sources.

Run: python scripts/build-client-admin-plan.py
Requires the Python Markdown and beautifulsoup4 packages.
"""

from pathlib import Path
import re
from html import escape

import markdown
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUTPUT = DOCS / "rentra-client-admin-plan.html"


def read(name):
    return (DOCS / name).read_text(encoding="utf-8")


def render(text, prefix):
    soup = BeautifulSoup(markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"]), "html.parser")
    for i, heading in enumerate(soup.find_all(["h3", "h4"]), 1):
        heading["id"] = f"{prefix}-heading-{i}"
    for i, table in enumerate(soup.find_all("table"), 1):
        wrapper = soup.new_tag("div", attrs={"class": "table-scroll", "tabindex": "0", "role": "region", "aria-label": f"{prefix.replace('-', ' ')} table {i}"})
        table.wrap(wrapper)
        for cell in table.select("thead th"):
            cell["scope"] = "col"
    return str(soup)


def split_sections(text):
    chunks = re.split(r"(?m)^## (.+)\n", text)
    return chunks[0], list(zip(chunks[1::2], chunks[2::2]))


sections = []


def section(key, label, title, body):
    sections.append((key, label, f'<section class="section" id="{key}"><div class="label">{escape(label)}</div><h2>{escape(title)}</h2><div class="prose">{body}</div></section>'))


plan = read("rentra-client-admin-plan.md")
_, plan_sections = split_sections(plan)
keys = ["baseline", "scope", "controls", "experience", "client", "admin", "architecture", "acceptance", "decisions", "delivery"]
labels = ["Current app", "Product scope", "Admin controls", "UI & navigation", "Client screens", "Super Admin screens", "Backend & data", "Acceptance checks", "Business decisions", "Delivery discipline"]
for i, ((title, body), key, label) in enumerate(zip(plan_sections, keys, labels), 1):
    section(key, f"{i:02} / {label}", re.sub(r"^\d+\. ", "", title), render(body, key))

_, audit_sections = split_sections(read("rentra-client-admin-ui-audit.md"))
audit_body = '<p class="lede">Source review dated 26 September 2026. Existing, partial and missing capabilities are distinguished from runtime behavior that still needs verification.</p>'
for title, body in audit_sections:
    audit_body += f'<h3>{escape(title)}</h3>' + render(body, "audit-" + re.sub(r"[^a-z]+", "-", title.lower()).strip("-"))
section("gaps", "11 / Source-backed audit", "32 gaps, with a clear path to resolution.", audit_body)

sessions = read("rentra-client-admin-sessions.md")
intro, session_sections = split_sections(sessions)
assert len(plan_sections) == 10, "Update navigation when requirements sections change"
specs = dict(session_sections)["Session specifications"]
parts = re.split(r"(?m)^### (CP\d{2}) — (.+)\n", specs)
assert (len(parts) - 1) // 3 == 32, "Expected CP01–CP32"
status_rows = re.findall(r"(?m)^\| (CP\d{2}) \| (.*?) \| (.*?) \| ([A-Z ]+) \|", sessions)
assert len(status_rows) == 32, "Expected 32 roadmap statuses"
statuses = {key: status.strip() for key, _, _, status in status_rows}
completed = sum(status == "COMPLETE" for status in statuses.values())
next_part = next((key for key, status in statuses.items() if status != "COMPLETE"), "All complete")
releases = [("R1 — Core operations", 1, 18), ("R2 — Complete Test back office", 19, 31), ("R3 — Live finance", 32, 32)]
milestones = "".join(
    f'<tr><td>{escape(name)}</td><td>{f"CP{lo:02}–CP{hi:02}" if hi > lo else f"CP{lo:02}"}</td><td>{done} of {hi - lo + 1}</td><td>{"Complete" if done == hi - lo + 1 else "In progress" if done else "Planned"}</td></tr>'
    for name, lo, hi in releases
    for done in [sum(statuses[f"CP{n:02}"] == "COMPLETE" for n in range(lo, hi + 1))]
)
# Detailed delivery cards, one "complete" card (plus optional limits card) per COMPLETE part.
# Add an entry in the same change that marks a part COMPLETE in the session tracker.
DELIVERED = {
    "CP01": '''<div class="card"><span class="num">CP01 · complete</span><h3>Access, capabilities and revocable sessions</h3><p>Server-enforced access for every client and Super Admin route:</p>
      <ul><li><code>src/services/auth/capabilities.js</code> — explicit Super Admin, pending/active client and contract-only caretaker capability sets; unmapped routes fail closed.</li>
      <li><code>requirePortalCapability</code> mounted before all <code>/partner</code> and <code>/admin</code> controllers, including document downloads: 401 when the session ended, 403 <code>CAPABILITY_REQUIRED</code> otherwise.</li>
      <li>Migration <code>0022_portal_access</code>: <code>portal_session</code> table, <code>admin_user.permissions</code> and a trigger that revokes sessions on role, status, email, permission, password, TOTP or deactivation changes.</li>
      <li>Audience-bound tokens; issuance locks the principal so a sign-in racing a suspension never yields a valid session. Logout revokes and audits once.</li>
      <li>Suspended/blocked clients have no portal access; new business was already blocked; admins fulfil existing bookings.</li>
      <li>Frontend navigation follows returned capabilities; login pages explain ended and restricted sessions; an API outage is no longer shown as a sign-out.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> the disposable-PostgreSQL integration test passed against the real <code>0022</code> SQL, DAL and Express middleware (cross-audience cookies, permission-less download denial, revocation, suspension, credential changes, expiry, legacy tokens, issuance race, customer session preserved). Backend <code>npm test</code> 75 pass / 1 skipped without the disposable URL, <code>db:check</code> 23 files, ESLint/Prettier; frontend tests 15/15 and the Webpack build passed. Customer tokens stay valid; client/admin users sign in once. <strong>Migration 0022 was applied</strong> to the configured database on 26 September 2026 (23 migrations, table, column and triggers verified); other targets need it before deployment. <a href="rentra-client-admin-part01.md">Handoff, permission matrix and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP01 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No screen or API to edit <code>admin_user.permissions</code>; <code>NULL</code> keeps full Super Admin access. Operator management is CP26.</li>
      <li>No restricted-fulfillment mode for suspended clients; fulfillment is admin-controlled. Suspension impact preview is CP03.</li>
      <li>Caretaker capabilities are a contract only; authentication and property assignment are CP16.</li>
      <li>Hidden admin pages still open by URL; their API calls return 403. Explicit forbidden states are CP02.</li>
      <li>No authenticated browser, hosted environment or deployment checks were run.</li></ul></div>''',
    "CP02": '''<div class="card"><span class="num">CP02 · complete</span><h3>Shared list, detail and form behavior</h3><p>Shared portal pieces, applied to representative client and admin flows:</p>
      <ul><li><code>settle()</code> + <code>PortalState</code> — only a definite missing record is not-found; 403 is forbidden; network/5xx is a retryable outage, never an empty list or false 404 (fixes G28).</li>
      <li>Breadcrumbs with return-to-list context: list rows carry <code>?from=</code>, validated to the same list prefix.</li>
      <li>Focused validation summary; failed saves keep typed input (React 19 form reset) and network/conflict errors are no longer silent.</li>
      <li>Unsaved-change warning for the multi-section property editor; native modal <code>&lt;dialog&gt;</code> navigation drawer.</li>
      <li>Capability navigation grouped per plan: owner Reviews link (G15); admin “Gateway settings” keeps the <code>/admin/payments</code> bookmark.</li>
      <li>Named row actions, focusable table regions and contrast fixes found by axe.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> headless Chrome gate <strong>35/35</strong> on a disposable local stack. It covered 1280/390px lists and editor, filtered-list breadcrumbs, not-found for foreign and malformed ids, a focused validation summary with preserved input and the unsaved-change warning. Also: the keyboard drawer (focus trapped, Escape, focus restored), a limited admin seeing only Bookings and a forbidden state, and API-down saves and pages showing retryable outages with filters kept. axe: no serious/critical WCAG A/AA issues on the scanned routes. Frontend tests 17/17, ESLint, Prettier and the Webpack build passed. No backend or schema change. <a href="rentra-client-admin-part02.md">Handoff, gate reproduction and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP02 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>Browser Back is not intercepted by the unsaved-change guard; reload, close and in-app links are.</li>
      <li>A streamed not-found detail returns HTTP 200 (the page is <code>noindex</code>).</li>
      <li>Pages outside the representative flows still use the route-level error fallback, which cannot tell forbidden from outage.</li>
      <li>Fixture database without PostGIS: maps and geo search were not under test.</li>
      <li>No human screen-reader pass and no hosted environment.</li></ul></div>''',
    "CP03": '''<div class="card"><span class="num">CP03 · complete</span><h3>Admin client directory and lifecycle</h3><p>New backend API and admin screens:</p>
      <ul><li><code>GET /admin/clients</code> (search, status, authoritative counts, pagination), <code>GET /admin/clients/:id</code> and <code>/lifecycle-preview</code>; <code>POST …/suspend</code> and <code>…/reinstate</code> with reason and <code>expectedVersion</code>.</li>
      <li>Migration <code>0023_client_lifecycle</code>: <code>user.lifecycle_version</code>, bumped only by lifecycle commands; stale or invalid transitions answer 409.</li>
      <li>One transaction per command: lock, version and transition check, update, admin audit with reason and impact; CP01 trigger revokes sessions.</li>
      <li>Suspended owner = no new business: every public listing read uses one “live and owner active” predicate; upcoming visits stay confirmed and are listed for admin fulfillment.</li>
      <li>Reinstatement restores the recorded pre-suspension status; blocked accounts stay with application review.</li>
      <li>Unguarded <code>POST /admin/clients/suspend</code> removed. People → Clients navigation.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>35/35</strong> browser/API gate: directory 1280/390px, detail with upcoming visits and impact preview, UI suspend/reinstate with audit, the client session ending, and public listing hide/return. Also: a stale second-admin view (409 + reload), a concurrent race with one winner, and 401/403/422/409/404 on the direct API; axe clean. Backend 77 pass / 2 skipped without the disposable URL; frontend tests, lint and build pass; CP02 gate regression passed. Migration 0023 is applied to the configured database (verified read-only). <a href="rentra-client-admin-part03.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP03 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No profile corrections, verification requests, archive/retention or session revocation without suspension (CP04/CP26/CP27).</li>
      <li>Statements, payouts and team tabs are placeholders (CP16, CP21–CP22).</li>
      <li>Ownership transfer is listed as unavailable; there is no owner-ID edit.</li>
      <li>Legacy visits without a booking order show without a record link.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP04": '''<div class="card"><span class="num">CP04 · complete</span><h3>Admin customer directory and account controls</h3><p>New backend API and admin screens:</p>
      <ul><li><code>GET /admin/customers</code> (search by name, email or phone digits; masked phones) and <code>GET /admin/customers/:id</code> with bookings, support, reviews, privacy requests, sessions and history.</li>
      <li><code>POST …/profile</code> corrects name, email and language only; the phone credential is not editable. Duplicate, invalid, no-op and stale edits are refused; audit records field names, not values.</li>
      <li><code>POST …/sessions/revoke</code> signs out everywhere; <code>…/restrict</code> and <code>…/reinstate</code> change access. The 0011 trigger revokes sessions and reinstatement never revives them.</li>
      <li>Every command takes a reason and <code>expectedVersion</code>; corrections also check the customer’s own profile version.</li>
      <li>New <code>admin.customers.*</code> capability; People → Customers navigation; shared account lifecycle panel.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>38/38</strong> browser/API gate. It covered masked phones (the full number never appears in lists), no secrets in detail, and a duplicate email keeping typed input. It also covered a field-only audit, an active customer session ended on the next request, a stale admin view (409 + reload), UI restrict and reinstate, and 401/403/404/409/422 on the direct API; axe clean. Backend 81/81 with all disposable-DB tests; CP02 and CP03 gates passed as regression. No migration. <a href="rentra-client-admin-part04.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP04 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No authentication recovery for a lost phone and no staff phone change; no impersonation.</li>
      <li>Privacy export and deletion fulfillment is CP27 (linked, not performed).</li>
      <li>Payment and refund summaries are CP19–CP20.</li>
      <li>Legacy visits without a booking order are not listed.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP05": '''<div class="card"><span class="num">CP05 · complete</span><h3>Gate 1 application review</h3><p>Existing review routes upgraded end to end:</p>
      <ul><li>Paginated queue (<code>status</code>, <code>assignee</code>, <code>q</code>, <code>page</code>) with authoritative counts, overdue aging and return-to-list context; <code>POST /admin/applications/:id/assign</code> to claim, release or take over.</li>
      <li>Migration <code>0024</code>: <code>review_version</code> and assignment columns. Every submit, withdraw and decision bumps the version, so contradictory, duplicate and pre-resubmission decisions answer 409.</li>
      <li>One transaction per decision with a single audit entry holding field fingerprints (never values), and “changed since last decision” for reviewers.</li>
      <li>Structured correction requests appear on the client’s flagged steps; approval no longer signs the client out and never re-activates a suspended account.</li>
      <li>Fixed: KYC documents were read by the wrong owner, so the stepper could never complete. Honest “reviewed by Rentra” wording.</li>
      <li>Owner-requested portal refresh: shared shell, collapsible brand sidebar, search, workspace type scale and tabbed detail pages.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>35/35</strong> browser/API gate. It covered a two-reviewer race with one winner and one record, assignment conflicts, the correction → resubmission → approval journey with 409 on stale and duplicate decisions, the client staying signed in, the third strike blocking the account, and authorized documents with cross-client deletion refused. CP02–CP04 gates passed on the refreshed UI (34/34, 35/35, 38/38). Migration 0024 were pending at the gate; <strong>applied to the configured database on 26 September 2026</strong>. <a href="rentra-client-admin-part05.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP05 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No client decision notification channel; outcomes appear in the workspace.</li>
      <li>Blocked (third-strike) accounts still reopen only by manual appeal.</li>
      <li>Listing copy promising email/WhatsApp replies is left for CP06/CP09.</li>
      <li>Partner booking detail and editor bodies keep their existing layout.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP06": '''<div class="card"><span class="num">CP06 · complete</span><h3>Gate 2 listing queue and review detail</h3><p>The missing property review API and screens:</p>
      <ul><li><code>GET /admin/properties</code> (status, reviewer, search) and <code>GET /admin/properties/:id</code> render the exact submitted revision: fields, photos, amenities, prices, private evidence and readiness.</li>
      <li>Migration <code>0025</code>: immutable <code>listing_submission</code> snapshots plus a trigger-maintained <code>content_version</code>. Content or child-record edits make a revision stale, so old screens answer 409.</li>
      <li><code>POST …/assign</code> and <code>…/decision</code>: request changes (with sections), reject, or approve for verification. One review row and one audit entry per revision; <code>published</code> is refused.</li>
      <li>The client sees the reason and the sections to correct, resubmits through the shared submit service, and gets a confirmation.</li>
      <li>Fixed: <code>status=all</code> queue failure; decision reason kept on failure. Queue and detail on the shared layout.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>39/39</strong> browser/API gate. It covered 401/403/404/400 access checks, every filter, 1280/390px layouts with axe clean, assignment conflicts, and required sections with the reason preserved. Also: UI resubmission with a new pass identity, 409 for an old screen, approval stopping at pending verification, and <code>published</code> refused. CP02–CP05 gates passed as regression. Migrations 0024–0025 were pending at the gate; <strong>applied to the configured database on 26 September 2026</strong>. <a href="rentra-client-admin-part06.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP06 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No publication: verification scheduling and publishing are CP07.</li>
      <li>Properties already pending review before 0025 need one resubmission.</li>
      <li>Reviewers flag sections, not individual fields.</li>
      <li>Listing copy promising email/WhatsApp replies remains for CP09.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP07": '''<div class="card"><span class="num">CP07 · complete</span><h3>Verification scheduling and publication</h3><p>The verification and publication workflow on the existing schema:</p>
      <ul><li>Migration <code>0026</code> ties each <code>verification_visit</code> to the exact submitted revision, allows one open visit per property, and adds version, cancellation and attribution columns. It also adds <code>published_submission_id/at/by</code> to <code>rentable</code>.</li>
      <li><code>POST …/verifications</code>, <code>…/reschedule</code>, <code>…/cancel</code> and <code>…/outcome</code>: video call or site visit in IST. A pass needs all six checklist items, written findings and, on site, coordinates. A failure returns the property to the client; a no-show keeps it waiting.</li>
      <li><code>POST …/publish</code> publishes only the verified revision. It records the actor, revision and time, invalidates the public caches, and reports whether the property is bookable. There is no waiver.</li>
      <li>New <strong>Verification &amp; publication</strong> tab with blockers, the inventory note, visit history and command forms. The client sees the scheduled visit, then live with a cannot-book-yet note.</li>
      <li>Fixed: refused commands no longer drop checkbox state (also in the CP06 decision form).</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>53/53</strong> browser/API gate, twice. It covered 401/403/400/409 on all five commands and the tab at 1280/390px with axe clean. Scheduling, rescheduling and evidence were recorded through the UI; incomplete evidence was refused with typed values kept. Unverified, other-revision and repeat publishing were refused. UI publication went live; the public page shows no address or evidence, and the client state is correct. CP02–CP06 gates passed as regression. Migrations 0024–0026 were pending at the gate; <strong>applied to the configured database on 26 September 2026</strong>. <a href="rentra-client-admin-part07.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP07 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No waiver path; no photo or file attachments on verification evidence.</li>
      <li>No email, SMS or calendar invite for appointments.</li>
      <li>No separate visit reassignment; the scheduling operator is assigned.</li>
      <li>Publishing does not open inventory; owners still confirm hours and dates.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP08": '''<div class="card"><span class="num">CP08 · complete</span><h3>Listing revisions and administrative restrictions</h3><p>Race-safe visibility control, separate from the owner's pause:</p>
      <ul><li>Migration <code>0027</code> adds restriction columns and a trigger-maintained <code>lifecycle_version</code> that every status change bumps. Review, verification and customer-review FKs now restrict deletion instead of cascading.</li>
      <li><code>POST …/hide</code> and <code>…/restore</code> are version-guarded, with a reason and an impact preview (confirmed visits, holds). The owner cannot resume, submit or publish a hidden property. A trust edit while hidden makes restore return to review.</li>
      <li>Owner edits decide under the row lock; pause/resume is a conditional update. A trust edit on a paused property now needs review too.</li>
      <li><code>POST …/correction</code>: documented admin edits of public text, guarded by <code>content_version</code>. The status and published revision are kept; before/after values are audited, and the owner is told.</li>
      <li>New <strong>Visibility &amp; corrections</strong> tab, revision comparison against the published revision, and an activity timeline. Confirmed bookings keep their accepted snapshot.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> service and unit tests plus a <strong>56/56</strong> browser/API gate, twice. It covered 401/403/400 on all three commands and the tab at 1280/390px with axe clean. Owner pause made an earlier hide stale; the owner could not undo the hide through the UI or API; the public page was gone while the customer booking stayed available. Restore went to pause, then to review after a trust edit; the comparison showed capacity 12 → 14. The UI correction stayed live, a stale correction got 409, and the activity was complete. CP02–CP07 gates passed as regression. Migrations 0024–0027 were pending at the gate; <strong>applied to the configured database on 26 September 2026</strong>. <a href="rentra-client-admin-part08.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP08 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No archived state or redirect policy; hide is the retirement control.</li>
      <li>No separate public and working revisions: trust edits still leave search until re-published.</li>
      <li>Corrections cover public text only; trust facts go back through review.</li>
      <li>No internal-only restriction note; no email or SMS to the owner.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP09": '''<div class="card"><span class="num">CP09 · complete</span><h3>Client property operations hub</h3><p>A property overview in front of the editor:</p>
      <ul><li><code>/partner/listings/[id]/overview</code>: status and next step, Rentra's requested changes with links to each flagged section, bookability (live vs bookable, hours, open dates), upcoming visits, content summary, setup and client-safe activity.</li>
      <li><code>GET /partner/listings/:id/overview</code> is owner-scoped. Its activity never includes findings, notes, assignment or operator identities. The summary now counts <code>bookable</code>.</li>
      <li>Editor saves carry the content version they were rendered from. A stale save gets 409 <code>LISTING_CHANGED</code>, writes nothing, keeps the typed values and offers a reload. Flagged sections carry Rentra's reason.</li>
      <li>Directory, editor and calendar keep the filtered list through the overview.</li>
      <li>The invented earnings range, the “visible and bookable” claim and the email/WhatsApp reply promise are gone.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>41/41</strong> browser/API gate, twice. It covered another owner's ids (404, not found, no save), the overview at 1280/390px with axe clean, not-bookable live state, visit and public links, no private evidence, calendar and editor context, the stale-save conflict with typed values kept, the correction journey from the attention list to resubmission, honest copy, and the outage state. CP02–CP08 gates passed as regression. No migration. <a href="rentra-client-admin-part09.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP09 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No owner photo previews (private store until a public delivery bucket exists).</li>
      <li>No owner-side field diff or effect preview before a trust edit.</li>
      <li>Date-operation stale guards and previews were subsequently delivered in CP10.</li>
      <li>Review SLA copy unchanged; statement and payout figures are CP22.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP10": '''<div class="card"><span class="num">CP10 · complete</span><h3>Portfolio calendar and interval operations</h3><p>Shared visual and agenda calendars over the authoritative inventory services:</p>
      <ul><li>Portfolio and property week/31-day month/agenda views, URL-backed filters and property pagination.</li>
      <li>Bookings, temporary holds, owner blocks, overnight intervals, buffers, closed dates and price overrides have text labels and source/action links. Expired holds are excluded.</li>
      <li>Date additions, overrides, blocks and releases require exact-input previews and a current calendar snapshot. Previews roll back every write; confirmations commit atomically under the existing inventory mutex.</li>
      <li>Up to 31 dates per property; affected-slot preview and addition receipt. Closed rows and booking reservations are preserved. Owner unblock cannot release a booking.</li>
      <li>Stale changes keep typed input and offer reload. Foreign records, revoked sessions and API outages are handled explicitly.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-PostgreSQL concurrency/inventory gate; <strong>37/37 browser/API checks plus 2/2 outage checks</strong>. Desktop/mobile and filtered month: no overflow or serious/critical axe violations. Backend 92/92; frontend 19/19; lint, format, migration-file checks and Webpack build passed. No migration or configured-database write. <a href="rentra-client-admin-part10.md">Handoff, API contract and runbook ↗</a></p></div>
      <div class="card"><span class="num">CP10 · limits</span><h3>Recorded scope boundaries</h3><ul><li>Rolling 31-day month; property filters list the current page of up to 10 properties.</li><li>One-property bulk changes only. Existing legacy closed slots remain closed.</li><li>No hosted deployment, live-finance activation, large-portfolio benchmark or human screen-reader pass.</li></ul></div>''',

    "CP11": '''<div class="card"><span class="num">CP11 · complete</span><h3>Versioned pricing and supported booking policy</h3><p>Existing owner controls, now previewed, versioned and audited:</p>
      <ul><li>Weekday/weekend slot rates, extra-guest charge, cancellation tier, deposit estimate and schedule limits preview before confirmation; previews write nothing and keep typed input.</li>
      <li>Typed validation, ownership/active-client checks, content-version and signed-preview guards under the shared inventory lock; racing confirmations have one winner and one audit entry.</li>
      <li>New quotes snapshot cancellation bands and pricing constants; stale quotes are refused with <code>QUOTE_CHANGED</code>; accepted booking snapshots are never rewritten.</li>
      <li>Constants classified: business controls versus technical/security limits. Documented precedence: slot rate → weekend → legacy override → explicit date-slot override → extra guests.</li>
      <li>Safe pricing/policy history with India-local times; the setup wizard previews before advancing.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-PostgreSQL integration test; <strong>44/44 browser/API checks plus 22/22 outage checks</strong> (shared with CP12). Stale price → reload → save verified in the form and through the API; 1280/390px, no overflow and no serious/critical axe violations. Backend 96/96; frontend 19/19; lint, format and isolated production build passed. No migration or configured-database write. <a href="rentra-client-admin-part11.md">Handoff, API contract and runbook ↗</a></p></div>
      ''',
    "CP12": '''<div class="card"><span class="num">CP12 · complete</span><h3>Booking work queues and operational detail</h3><p>Operational views over the existing booking records:</p>
      <ul><li>Owner/admin <strong>Today</strong> and <strong>Action needed</strong> queues (overnight stays, due handovers, overdue returns, disputes, unknown hours) with ownership-scoped property filters and preserved list context.</li>
      <li>Booking-wide payment state is separate from mixed visit states; each visit shows only its applicable evidence action. No owner accept/reject step.</li>
      <li>Arrival and contact limited to active fulfilment; admin detail links customer, client and property records.</li>
      <li>Shared not-found, forbidden and retryable outage states with in-place recovery.</li></ul>
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> mixed confirmed/cancelled visits, foreign-owner denial, replay-safe handover/return/completion, automatic confirmation after a signed Test capture through the real checkout services, and idempotent customer cancellation on the accepted snapshot. Browser: 390px axe clean, keyboard focus, real handover submission and replay, revocation. The regression exposed and fixed a pre-existing double-encoded JSON write in checkout. <a href="rentra-client-admin-part12.md">Handoff, rules and runbook ↗</a></p></div>
      <div class="card"><span class="num">CP11–CP12 · limits</span><h3>Recorded scope boundaries</h3><ul><li>No live tax, commission, deposit collection or settlement policy selected (customer Part 20).</li><li>Policy changes apply immediately; no scheduled publication.</li><li>Webhook confirmation stores a double-encoded payload and is a silent no-op; signed verification and the reconcile worker still confirm. Recorded follow-up.</li><li>No hosted deployment or human screen-reader pass.</li></ul></div>''',
    "CP13": '''<div class="card"><span class="num">CP13 · complete</span><h3>Visit evidence and incident records</h3><p>Append-only evidence with private photos and superseding corrections:</p>
      <ul><li>Handover, return and completion carry up to 3 private photos (JPEG/PNG/WebP from magic bytes, 2MB each, 30 per visit), stored content-addressed with no overwrite.</li>
      <li>Photos are read only through an authorized, audited same-origin proxy; foreign, guessed and mismatched ids get 404, and nothing auto-loads.</li>
      <li>Visit-linked incidents (category, time, description, photos) from owners and admins; admins close them with a version guard and an operational note, not a liability decision.</li>
      <li>Admin corrections supersede evidence in one linear chain; the original stays visible, stale or out-of-order changes are refused, and state and actual/Test nature never change.</li>
      <li>Actor, times, visit version and an Actual or Test badge on every item; an open incident is admin Action needed work.</li></ul>
      <p class="small"><strong>Gate passed — 27 September 2026:</strong> disposable-PostgreSQL integration test and 4 unit tests; <strong>31/31 browser/API checks plus 6/6 failure-path checks</strong>; CP11/CP12 gate 44/44 as regression. Replays are one effect, unsafe or stale submissions write and upload nothing, forms keep input, and triggers refuse direct edits and deletes. 390px views with forms open: no overflow, axe clean. Backend 101/101; frontend 19/19; lint, format and build passed. Migration 0028 applied to the configured database on 27 September 2026 (29 of 29 recorded). <a href="rentra-client-admin-part13.md">Handoff, contract and runbook ↗</a></p></div>
      <div class="card"><span class="num">CP13 · limits</span><h3>Recorded scope boundaries</h3><ul><li>Migration 0028 applied to the configured database; apply it to any other target first and deploy frontend and backend together.</li><li>No automatic retention deletion (CP27), no incident reopening or assignment (CP14/CP17), no liability or deposit decisions (CP23).</li><li>Unreferenced upload objects after a failed write have no sweeper yet; no hosted Cloudinary upload or screen-reader pass.</li></ul></div>''',
    "CP14": '''<div class="card"><span class="num">CP14 · complete</span><h3>Admin booking change and cancellation cases</h3><p>Case-based resolution for exact visits, reusing the cancellation engine:</p>
      <ul><li>Owners request cancellation or report no-shows, late arrivals and operational issues from their booking; admins open customer cancellation and change cases from the booking's Cases tab.</li>
      <li>Case queue (open, unassigned, mine, resolved), version-guarded assignment, and updates that each name their audience: internal, owner, customer or everyone.</li>
      <li>The preview shows the exact visits cancelled or unaffected, inventory released, refunds per visit capped by remaining capture, and the order's final state. Change requests get a non-reserving availability check.</li>
      <li>Resolved once: previewed cancellation, decline or no change. Stale previews, repeats and races are refused without a second release or refund; accepted booking terms are never edited.</li>
      <li>Recorded default: full refund when the owner cancels, accepted policy otherwise. Customers see only shared updates.</li></ul>
      <p class="small"><strong>Gate passed — 27 September 2026:</strong> disposable-PostgreSQL integration test with a real paid two-visit order and 3 unit tests; <strong>34/34 browser/API checks plus 6/6 failure-path checks</strong> (including a lost response after commit that replays on retry); CP13 31/31 and CP11/CP12 44/44 as regression. Backend 105/105; frontend 19/19; lint, format and build passed. <strong>Migration 0029 not yet applied to the configured database.</strong> <a href="rentra-client-admin-part14.md">Handoff, contract and runbook ↗</a></p></div>
      <div class="card"><span class="num">CP14 · limits</span><h3>Recorded scope boundaries</h3><ul><li>Apply migration 0029 before deploying the backend; deploy frontend and backend together.</li><li>Refunds are Test obligations: provider execution is CP20, live money CP32; a change is cancel-and-rebook only, with no amendment.</li><li>No SMS/email template for case updates, no customer-opened cases (CP17) and no charges or liability decisions (CP23).</li></ul></div>''',
    "CP15": '''<div class="card"><span class="num">CP15 · complete</span><h3>Client task dashboard and persisted updates</h3><p>Real work and a durable inbox for owners:</p>
      <ul><li><strong>Your tasks</strong> on <code>/partner</code>: required work first, then information. Each count comes from the same query as the list it opens (bookings needing action, drafts/changes, resubmit, live-not-bookable, hidden, review, today, unread). The decorative health ring is gone.</li>
      <li>Migration <code>0030</code>: <code>client_update</code> rows written by triggers on audit, booking lifecycle and case updates, in the causing transaction. Unique event keys make replays no-ops; only client-safe detail is stored.</li>
      <li><code>/partner/updates</code>: unread/read, needs-action and type filters, deep links that mark read, mark all read, and a badge that only shows a real count.</li>
      <li>Version-guarded preferences: property, booking and case information can arrive already read; required work cannot be muted. The copy says owner updates are not sent by SMS or email.</li></ul>
      <p class="small"><strong>Gate passed — 27 September 2026:</strong> disposable-DB service test plus a <strong>38/38</strong> browser/API gate, twice. It covered 401/404/422 permissions; counts that matched their lists before and after a hide; repeat case delivery as one update; open-marks-read; mark-all-read persisting across reload; muting through the UI with stale-save 409; and a failed-load retry state. CP02–CP14 gates passed as regression. Migration 0030 was pending at the gate; <strong>since applied to the configured database</strong>. <a href="rentra-client-admin-part15.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP15 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>In-app only: no SMS, email or push to owners.</li>
      <li>No historical backfill; updates start when 0030 is applied.</li>
      <li>Incident closure and pricing events produce no updates.</li>
      <li>Client support threads remain CP17; no retention control yet.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP16": '''<div class="card"><span class="num">CP16 · complete</span><h3>Caretaker and team access</h3><p>Owner-managed caretakers with a narrow, live scope:</p>
      <ul><li><code>/partner/team</code>: invite by name and mobile with a one-time, hashed, 72-hour link shown once (the owner shares it; Rentra sends nothing). Choose properties and the evidence grant; reassign, revoke with a reason; membership history.</li>
      <li>Migration <code>0031</code>: <code>staff_property</code>, <code>staff_invitation</code>, <code>portal_session.staff_id</code>, the <code>staff</code> audit actor, and a caretaker branch in the database evidence trigger.</li>
      <li><code>/staff</code>: join with the link plus a code to the invited phone; separate <code>rentra_staff</code> session; phone sign-in with no account discovery.</li>
      <li>Caretakers see assigned visits only (address, owner contact, accepted house rules, evidence). They record handover/return/completion only with the grant. No money, pricing, KYC, team or guest identity.</li>
      <li>Reassignment, revocation and owner suspension apply on the next request; caretaker evidence is attributed as “Caretaker · name”.</li></ul>
      <p class="small"><strong>Gate passed — 27 September 2026:</strong> service and capability tests plus a <strong>51/51</strong> browser/API gate. It covered guessed property and booking ids, used and replaced links, wrong codes, view-only 403, a UI evidence grant and caretaker handover, reassignment to 404, UI revocation ending the active session, the revoked number's sign-in, and 401 on owner/admin APIs with a caretaker cookie. CP02–CP15 gates passed as regression. <strong>Migration 0031 is not yet applied</strong> to the configured database. <a href="rentra-client-admin-part16.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP16 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No SMS provider: outside development caretaker codes cannot be delivered (same as owner sign-in).</li>
      <li>Caretakers cannot report incidents or see guest identity.</li>
      <li>No owner picker for a caretaker working for several owners.</li>
      <li>No per-caretaker activity reports beyond attribution and history.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP17": '''<div class="card"><span class="num">CP17 · complete</span><h3>Client support and assigned admin cases</h3><p>Participant-scoped support for owners alongside customer support:</p>
      <ul><li><code>/partner/support</code>: threads about the owner's own property or booking; foreign ids are refused and client and customer threads never share messages.</li>
      <li>Admin inbox filters by participant, state and assignment. Detail offers version-guarded assignment to active support operators, priority, and an admin-only related-case link.</li>
      <li>Replies are either participant-visible or internal notes. Up to 3 private photos per message are sniffed from bytes and audited; internal photos are admin-only.</li>
      <li>Duplicate replies persist once, stale replies keep the typed text, a key reused on another case is refused, and a storage failure saves nothing.</li>
      <li>A public reply creates one CP15 update that opens the thread; customers reply with private photos too.</li></ul>
      <p class="small"><strong>Gate passed — 27 September 2026:</strong> backend <strong>112/112</strong> with the original and extended CP17 integration tests; <strong>39/39</strong> browser/API checks (<code>completed: true</code>) plus <strong>4/4</strong> outage checks; CP14 34/34 and CP13 31/31 as regression. Frontend 23/23, lint, format and webpack build passed. Migration <code>0032</code> applied to the configured database (33 of 33 recorded). <a href="rentra-client-admin-part17.md">Handoff, scope resolution and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP17 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No email or SMS for support replies; owners get the in-app update, and customers return to their thread.</li>
      <li>No application or payout references (applicants use the application flow; payouts wait for CP22) and no direct link from a support thread to a booking case.</li>
      <li>No orphan-object sweeper and no automatic retention deletion for private photos.</li>
      <li>The CP15/CP16 Python regression runners were not run here; no hosted environment or human screen-reader pass.</li></ul></div>''',
    "CP18": '''<div class="card"><span class="num">CP18 · complete</span><h3>Review detail and moderation history</h3><ul><li>Owner/admin detail with property and booking links, scoped reports, resolutions and retained reply/moderation history.</li><li>Signed publication/reply previews, version checks and reasoned policy decisions; guest text and ratings remain immutable.</li><li>Score-neutral publication, independent report closure and consistent public listing/search aggregates.</li></ul><p>Gate: backend 111/111, frontend 23/23, browser/API 34/34 and outage 4/4. No CP18 migration. CP17 remains in progress independently. <a href="rentra-client-admin-part18.md">CP18 handoff and limits ↗</a></p></div>''',
}
missing = [key for key, status in statuses.items() if status == "COMPLETE" and key not in DELIVERED]
assert not missing, f"Add DELIVERED cards for {missing}"
delivered_cards = "".join(DELIVERED[key] for key in statuses if statuses[key] == "COMPLETE")
cards = []
for i in range(1, len(parts), 3):
    key, title, body = parts[i:i + 3]
    done = statuses[key] == "COMPLETE"
    runbook = f'<p class="small"><a href="rentra-client-admin-part{key[2:]}.md">{key} handoff and runbook ↗</a></p>' if done else ""
    cards.append(f'<article class="card session-card{" complete" if done else ""}" id="{key.lower()}"><span class="num">{key} · {escape(statuses[key].lower())}</span><h3>{escape(title)}</h3>{render(body, key.lower())}{runbook}</article>')
roadmap_body = f'<div class="callout blue" id="build-status"><strong>Recorded implementation status: {completed} of 32 parts complete.</strong> Next: {next_part}. This HTML presents the requirements and session roadmap; it does not certify implementation. The <a href="rentra-client-admin-sessions.md">Markdown session tracker</a> remains the status source. Regenerate this page when the source documents change.</div><div class="table-scroll" tabindex="0" role="region" aria-label="Release milestones"><table><caption>Recorded release status. A release is complete only when every one of its parts has passed its own gate.</caption><thead><tr><th scope="col">Release</th><th scope="col">Parts</th><th scope="col">Complete</th><th scope="col">Status</th></tr></thead><tbody>' + milestones + '</tbody></table></div>' + (f'<h3>Delivered parts</h3><div class="cards three">{delivered_cards}</div>' if delivered_cards else '')
for title, body in session_sections:
    if title == "Session specifications":
        roadmap_body += '<h3>One bounded part per session</h3><p>Each card includes deliverables and a verification gate. Session size is a target, not a token or delivery-time guarantee.</p><div class="cards session-grid">' + "".join(cards) + '</div>'
    else:
        roadmap_body += f'<h3>{escape(title)}</h3>' + render(body, "roadmap-" + re.sub(r"[^a-z]+", "-", title.lower()).strip("-"))
section("roadmap", "12 / Build plan", "32 sessions. Three release boundaries.", roadmap_body)

checks = ["Review the client screen and property-detail requirements", "Review Super Admin data controls and approval workflows", "Settle the business decisions needed by the next part", "Review UI gaps, dependencies and acceptance scenarios", "Record implementation evidence before changing delivery status"]
review = '<p class="lede">A personal review checklist, saved only in this browser. These checks do not change recorded delivery status or verify application behavior.</p><div class="card review-list">'
for i, text in enumerate(checks):
    review += f'<label><input type="checkbox" data-review="{i}"><span>{escape(text)}</span></label>'
review += '</div><p class="small muted" id="review-status" aria-live="polite">0 of 5 reviewed</p>'
section("review", "13 / Your review", "Ready for the next implementation session.", review)
section("sources", "14 / Companion documents", "One plan, in the format you need.", '<div class="cards"><article class="card"><h3>Requirements & evidence</h3><p><a href="rentra-client-admin-plan.md">Full requirements Markdown</a></p><p><a href="rentra-client-admin-ui-audit.md">Source-backed UI audit</a></p><p><a href="rentra-client-admin-sessions.md">Authoritative session tracker</a></p></article><article class="card"><h3>Existing Rentra plans</h3><p><a href="rentra-customer-plan.html">Customer experience plan</a></p><p><a href="rentra-client-plan.html">Earlier client concept</a></p><p><a href="architecture-alignment.md">Frontend/backend architecture</a></p></article></div><p class="small muted">This is a standalone, offline document generated from the three client/admin Markdown files. No credentials, network assets or application data are loaded.</p>')

css = re.search(r"<style>(.*?)</style>", read("rentra-customer-plan.html"), re.S).group(1)
nav = "".join(f'<a href="#{key}">{escape(label)}</a>' for key, label, _ in sections)
page = '''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Rentra client and Super Admin plan: UI gaps, detail pages, data controls and 32 implementation sessions."><title>Rentra — Client & Super Admin plan</title><style>''' + css + '''
.hero h1{max-width:15ch}.hero-card{padding:26px;transform:none}.flow-row{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.hero-card hr{border:0;border-top:1px solid var(--line);margin:24px 0}.hero-card .caption{padding:0}.prose>p,.prose>ul,.prose>ol{margin-bottom:16px}.prose>h3{margin-top:30px}.prose blockquote{margin:20px 0;padding:18px 22px;background:var(--pale);border-left:3px solid var(--green)}.session-card h3{margin-top:0!important}.session-card p+p{margin-top:16px}.session-card{scroll-margin-top:100px}.session-card.complete{border-color:var(--green);box-shadow:inset 3px 0 0 var(--green)}.review-list label{display:flex;gap:12px;padding:12px 0;cursor:pointer}.review-list input{width:20px;height:20px;flex-shrink:0;accent-color:var(--green);margin-top:3px}.mobile-index{display:none}.table-scroll:focus-visible{outline-offset:2px}.prose a,td{overflow-wrap:anywhere}.section{scroll-margin-top:10px}#review-status{margin-top:14px}.hero-card .label{margin-bottom:12px}.footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:12px}
@media(max-width:760px){.mobile-index{display:block;margin-top:24px;border:1px solid var(--line);padding:16px;border-radius:12px;background:white}.mobile-index nav{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.mobile-index a{font-size:12px}.hero h1{font-size:42px}.hero-card{padding:22px}.session-grid{grid-template-columns:1fr}.topnav a:nth-child(n+3){display:none}}
@media print{.mobile-index,.review-list input{display:none}.session-grid{display:block}.session-card{margin:14px 0;break-inside:auto}.prose>h3{break-after:avoid}.hero-card{break-inside:avoid}.table-scroll{border-radius:0}thead{display:table-header-group}.section{overflow:visible}.hero h1{font-size:34pt}}
</style></head><body><a class="skip" href="#main">Skip to the plan</a>
<div class="topbar"><div class="wrap"><a class="wordmark" href="#top" aria-label="Rentra client and Super Admin plan, top"><span class="mark" aria-hidden="true"></span>rentra</a><nav class="topnav" aria-label="Primary document navigation"><a href="#client">Client</a><a href="#admin">Super Admin</a><a href="#gaps">UI gaps</a><a href="#controls">Data controls</a><a href="#roadmap">Build plan</a></nav><button class="button secondary print-button" id="print-plan" type="button">Print / PDF ↗</button></div></div>
<header class="hero" id="top"><div class="wrap hero-grid"><div><div class="label">Product blueprint / Client & Super Admin</div><h1>Every property.<br>Every operation.<br><em>A clear next step.</em></h1><p class="intro">A complete plan for the people who run Rentra: client workspaces, Super Admin controls, useful detail pages and the workflows behind them.</p><div class="actions"><a class="button" href="#client">Explore the screens ↗</a><a class="button secondary" href="#roadmap">Go to delivery plan</a></div><div class="metadata"><span>26 September 2026</span><span>Source audit + requirements</span><span>''' + f'{completed} of 32 parts complete · Next: {next_part}' + '''</span></div></div>
<div class="hero-card"><div class="label">Two workspaces. One connected operation.</div><h3>Client / owner & agent</h3><p class="small muted">Understand approval, prepare the property, manage visits and follow every outcome.</p><div class="flow-row"><span class="chip">Submit</span><span class="chip">Prepare</span><span class="chip">Host</span><span class="chip">Reconcile</span></div><hr><h3>Super Admin</h3><p class="small muted">Find the record, inspect the evidence, take the right action and preserve its history.</p><div class="flow-row"><span class="chip blue">Review</span><span class="chip blue">Publish</span><span class="chip blue">Resolve</span><span class="chip blue">Audit</span></div><div class="callout amber"><strong>First operational priority:</strong> close the missing property-review and publication workflow.</div><div class="caption"><span class="small muted">32 source-backed gaps</span><span class="chip">''' + f'{completed} of 32 sessions complete' + '''</span></div></div></div></header>
<div class="principles"><div class="wrap"><div><strong>Build on what exists</strong><p>Keep the updated customer experience and current portal foundations.</p></div><div><strong>Detail before action</strong><p>Show relationships, evidence, history and the effect of a change.</p></div><div><strong>Full control, clear history</strong><p>Manage business data through explicit, accountable commands.</p></div><div><strong>Prove each part</strong><p>Separate delivered work, browser review and provider acceptance.</p></div></div></div>
<div class="wrap"><details class="mobile-index"><summary>Inside this plan</summary><nav aria-label="Mobile document sections">''' + nav + '''</nav></details></div>
<div class="wrap doc-layout"><aside class="index"><div class="label">Inside this plan</div><nav aria-label="Document sections">''' + nav + '''</nav><div class="divider"></div><div class="label">Delivery status</div><p class="progress-label">''' + f'{completed} of 32 parts complete · Next: {next_part}</p><progress max="32" value="{completed}" aria-label="Recorded implementation parts complete"></progress>' + '''<p class="small muted"><a href="#build-status">Recorded status ↗</a></p><div class="divider"></div><a href="rentra-customer-plan.html">Customer plan ↗</a><a href="rentra-client-admin-sessions.md">Session roadmap ↗</a></aside><main id="main">''' + "".join(body for _, _, body in sections) + '''</main></div>
<footer class="footer"><div class="wrap">Rentra / Client & Super Admin blueprint · ''' + f'{completed} of 32 parts complete · Next: {next_part}' + ''' · Status source: <a href="rentra-client-admin-sessions.md">session tracker</a>.</div></footer>
<script>
document.getElementById('print-plan').addEventListener('click', () => window.print());
const storageKey = 'rentra-client-admin-plan-review-v1';
const checks = [...document.querySelectorAll('[data-review]')];
let saved = [];
let storageAvailable = true;
try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(value)) saved = value; } catch { storageAvailable = false; }
const updateReview = () => { document.getElementById('review-status').textContent = `${checks.filter(input => input.checked).length} of ${checks.length} reviewed · Delivery status is unchanged.${storageAvailable ? '' : ' Browser storage unavailable; checks last only for this page visit.'}`; };
checks.forEach(input => {
  input.checked = saved.includes(input.dataset.review);
  input.addEventListener('change', () => {
    try { localStorage.setItem(storageKey, JSON.stringify(checks.filter(item => item.checked).map(item => item.dataset.review))); } catch { storageAvailable = false; }
    updateReview();
  });
});
updateReview();
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.index nav a, .topnav a')];
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    links.forEach(link => { const active = link.hash === '#' + visible.target.id; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }, {rootMargin: '-90px 0px -65% 0px', threshold: 0});
  document.querySelectorAll('main > section').forEach(section => observer.observe(section));
}
</script></body></html>
'''
OUTPUT.write_text(page, encoding="utf-8")
print(f"Generated {OUTPUT.name}: {len(sections)} sections, 32 session cards, {completed} completed parts")
