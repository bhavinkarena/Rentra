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
      <p class="small"><strong>Gate passed — 26 September 2026:</strong> disposable-DB service test plus a <strong>35/35</strong> browser/API gate: directory 1280/390px, detail with upcoming visits and impact preview, UI suspend/reinstate with audit, the client session ending, and public listing hide/return. Also: a stale second-admin view (409 + reload), a concurrent race with one winner, and 401/403/422/409/404 on the direct API; axe clean. Backend 77 pass / 2 skipped without the disposable URL; frontend tests, lint and build pass; CP02 gate regression passed. <strong>Migration 0023 is not yet applied</strong> to the configured database. <a href="rentra-client-admin-part03.md">Handoff, API contract and runbook ↗</a></p></div>
    <div class="card"><span class="num">CP03 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No profile corrections, verification requests, archive/retention or session revocation without suspension (CP04/CP26/CP27).</li>
      <li>Statements, payouts and team tabs are placeholders (CP16, CP21–CP22).</li>
      <li>Ownership transfer is listed as unavailable; there is no owner-ID edit.</li>
      <li>Legacy visits without a booking order show without a record link.</li>
      <li>No hosted environment or human screen-reader pass.</li></ul></div>''',
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
