import { readFileSync, writeFileSync } from 'node:fs';

const file = 'docs/rentra-customer-plan.html';
let html = readFileSync(file, 'utf8');
const edits = [];

function replace(name, from, to) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`${name}: expected 1 match, found ${count}`);
  html = html.replace(from, to);
  edits.push(name);
}

/* 1 — hero metadata tells the reader where the build actually is. */
replace('hero metadata',
  '<span>Implementation started · <a href="rentra-customer-sessions.md">22-session roadmap</a></span>',
  '<span>Part 01 of 22 complete · Part 02 in progress · <a href="rentra-customer-sessions.md">session roadmap</a></span>');

/* 2 — sidebar: recorded delivery status, kept separate from the browser-local checklist. */
replace('sidebar status',
  '<div class="divider"></div><div class="label">Your build checklist</div>',
  '<div class="divider"></div><div class="label">Delivery status</div>'
  + '<div class="progress-label">1 of 22 parts complete · Part 02 in progress</div>'
  + '<progress max="22" value="1" aria-label="Implementation parts complete"></progress>'
  + '<p class="print-note"><a href="#build-status">Recorded status ↗</a> · <a href="rentra-customer-sessions.md">Session roadmap ↗</a></p>'
  + '<div class="divider"></div><div class="label">Your build checklist</div>');

/* 3 — the roadmap lede no longer claims everything is unstarted. */
replace('roadmap lede',
  'All checklist items start as planned work. Phases U0–U5',
  'The checklist below is the original requirements checklist; the recorded delivery status sits directly beneath it. Phases U0–U5');

/* 4 — replace the generic session callout with a dated, evidence-backed status panel. */
const oldCallout = '  <div class="callout blue"><strong>Implementation is now divided into 22 session-sized parts.</strong> <a href="rentra-customer-sessions.md">Open the implementation roadmap and session handoff</a> for each part’s scope, dependencies, completion checks and current status. Parts 01–19 deliver the customer release with simulated payments; Parts 20–22 cover the later real-payment integration. One session implements and verifies one part. The checklist below remains the original requirements checklist.</div>\n';

const milestones = [
  ['U0', 'Availability and money definitions', '01–04', 'chip amber', '1 of 4 parts complete',
    'Part 01 landed the booking policy, property-local date and interval helpers, integer minor-unit pricing and public location privacy. No schema migration, authoritative quote service or transactional overlap constraint exists yet.'],
  ['U1', 'Customer identity and the shared visual system', '05–07', 'chip', 'Not started',
    'Customer OTP, the customer shell and favourites are unimplemented. The existing authentication infrastructure serves partners and admins only.'],
  ['U2', 'Discovery and a detail page people understand', '08–10', 'chip', 'Not started',
    'Search, city and area routes and the multi-date picker are unimplemented. Existing price boxes still use legacy whole-rupee local estimates.'],
  ['U3', 'End-to-end booking with a dummy transaction', '11–13', 'chip', 'Not started',
    'No hold, confirmation, dummy transaction or booking history exists. The legacy <code>availability</code> composite key remains the only double-booking lock.'],
  ['U4', 'After booking: cancellation, support and reviews', '14–17', 'chip', 'Not started',
    'Cancellation, the notification outbox, verified-visit reviews and support requests are unimplemented.'],
  ['U5', 'Customer release quality', '18–19', 'chip', 'Not started',
    'No accessibility, performance or release-acceptance evidence has been recorded for the customer surfaces.'],
  ['U6', 'Real payment provider integration', '20–22', 'chip blue', 'Deferred by decision',
    'Blocked on explicit commercial answers: provider, maximum settlement-hold period, collection schedule, tax and refund policy. Real payments stay disabled until Parts 20–22.'],
];

const rows = milestones.map(([code, name, parts, chip, status, truth]) =>
  `    <tr><td><strong>${code} · ${name}</strong></td><td><code>${parts}</code></td><td><span class="${chip}">${status}</span></td><td>${truth}</td></tr>`
).join('\n');

const statusPanel = `  <div class="callout blue" id="build-status"><strong>Build status — 12 September 2026.</strong> Implementation is divided into 22 session-sized parts; one session implements and verifies one part. <strong>Part 01 is complete. Part 02 is in progress.</strong> Parts 01–19 deliver the customer release with simulated payments; Parts 20–22 cover the later real-payment integration. <a href="rentra-customer-sessions.md">Open the implementation roadmap and session handoff</a> for each part’s scope, dependencies, gates and recorded evidence — that file, not this page, is the authoritative tracker. A part can deliver the primitives an item below needs without completing that item.</div>
  <div class="table-scroll"><table><caption>Recorded milestone status. A milestone is complete only when every one of its parts has passed its own gate.</caption>
    <thead><tr><th scope="col">Milestone</th><th scope="col">Session parts</th><th scope="col">Status</th><th scope="col">What is true in the repository today</th></tr></thead>
    <tbody>
${rows}
    </tbody></table></div>
  <div class="cards three">
    <div class="card"><span class="num">Part 01 · complete</span><h3>Booking and public-data foundations</h3><p>Shipped as pure, testable modules with no schema change:</p>
      <ul><li><code>lib/domain/booking-policy.js</code> — one booking configuration: currency, timezone, 10-visit cap, 10-minute hold, 8% platform fee.</li>
      <li><code>lib/domain/booking-dates.js</code> — property-local dates, explicit slot intervals, mandatory buffers, overnight end days and half-open overlap rules.</li>
      <li><code>lib/domain/booking-money.js</code> — integer minor-unit pricing and the single legacy rupee conversion boundary.</li>
      <li><code>lib/domain/booking-availability.js</code> — legacy calendar reader in which an owner block always wins.</li>
      <li><code>lib/validation/zod/booking.js</code> — strict 1–10 unique-visit selection; client-supplied totals are rejected.</li>
      <li>Public listing data no longer selects or serializes exact coordinates.</li></ul>
      <p class="small"><strong>Evidence:</strong> <code>verify:customer-foundation</code> — 28 scenario groups including child processes in Honolulu, New York and Tokyo; <code>lint</code> clean; <code>build</code> passed with 39 static pages; 102 generated listing artifacts scanned for private field keys.</p></div>
    <div class="card"><span class="num">Part 01 · explicitly not delivered</span><h3>Limits recorded at the gate</h3>
      <ul><li>No schema migration, customer login, or persisted quote, order, hold or payment.</li>
      <li>No authoritative overlap constraint. The <code>availability</code> composite key remains the only double-booking lock.</li>
      <li>Price boxes still use legacy whole-rupee local estimates and do not reconcile date overrides — Parts 04 and 10 replace that split.</li>
      <li>Legacy <code>full</code> availability is advisory day-plus-night availability, not evidence of a safe physical interval.</li>
      <li>Timezone support is <code>Asia/Kolkata</code> only; every other zone fails closed.</li>
      <li>No browser accessibility, concurrent database booking or production deployment checks were run.</li></ul></div>
    <div class="card"><span class="num">Part 02 · in progress</span><h3>Reservation schema, legacy audit and backfill</h3>
      <ul><li>Additive Drizzle migrations for <code>booking_quote</code>, <code>booking_order</code>, inventory reservations and extended visit fields.</li>
      <li>Quote version and policy snapshots, explicit currency, timezone, local day and timestamps, minor-unit amounts, idempotency keys and visit provenance.</li>
      <li>Existing booking IDs and their review and payout references are retained unchanged.</li>
      <li>A dry-run legacy audit, a repeatable conversion and backfill, and a reconciliation report over the 44 existing seeded bookings.</li></ul>
      <p class="small"><strong>Gate:</strong> additive schema and reviewed backfill are ready, unknown hours and unknown settlements are explicitly reported, and no legacy payment is invented. Authoritative inventory is constrained or switched over only after remediation.</p></div>
  </div>
`;

replace('status panel', oldCallout, statusPanel);

/* 5 — every phase states which session parts deliver it. */
const phaseParts = [
  ['u0-privacy', '01–04', 'Part 01 complete · Part 02 in progress · Parts 03–04 planned'],
  ['u1-favorites', '05–07', 'Planned'],
  ['u2-share', '08–10', 'Planned'],
  ['u3-history', '11–13', 'Planned'],
  ['u4-support', '14–17', 'Planned'],
  ['u5-regression', '18–19', 'Planned'],
  ['u6-release', '20–22', 'Deferred until the commercial decisions in Part 20 are answered'],
];

for (const [lastTask, parts, status] of phaseParts) {
  const anchor = '</ul><div class="gate">';
  const marker = `data-task="${lastTask}"`;
  const at = html.indexOf(marker);
  if (at === -1) throw new Error(`phase note: ${lastTask} not found`);
  const gateAt = html.indexOf(anchor, at);
  if (gateAt === -1) throw new Error(`phase note: gate after ${lastTask} not found`);
  const note = `</ul><p class="small muted">Session parts <b>${parts}</b> · ${status}. <a href="rentra-customer-sessions.md">Part detail ↗</a></p><div class="gate">`;
  html = html.slice(0, gateAt) + note + html.slice(gateAt + anchor.length);
  edits.push(`phase note ${lastTask}`);
}

writeFileSync(file, html, 'utf8');
console.log(`Applied ${edits.length} edits:\n- ${edits.join('\n- ')}`);
