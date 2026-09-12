/**
 * Drives the full-screen listing walkthrough over real HTTP.
 *
 * The step pages are Server Components behind `requireActiveClient`, so this
 * mints a genuine session cookie with the same crypto the app uses and then
 * fetches each step exactly as a browser would. That is the only way to check
 * the chrome actually renders — the pure step maths is asserted separately at
 * the bottom.
 *
 *   npm run dev            (in another terminal)
 *   npm run verify:wizard
 */
import postgres from 'postgres';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const pass = [];
const fail = [];

function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

const { encryptSession, SESSION_COOKIE } = await import('../lib/auth/session-crypto.js');
const steps = await import('../lib/domain/listing-steps.js');
const { listingCompletion } = await import('../lib/domain/listing-completion.js');

/* ------------------------- pure step-maths checks ------------------------- */
console.log('\nStep registry');
check('ten steps in order', steps.LISTING_STEP_IDS.length === 10,
  steps.LISTING_STEP_IDS.join(' → '));
check('five chapters', steps.LISTING_CHAPTERS.length === 5);
check('nine gated steps + review', steps.INPUT_STEP_IDS.length === 9);
check('first step has no Back', steps.prevStepId('basics') === null);
check('last step has no Next', steps.nextStepId('review') === null);
check('unknown step rejected', !steps.isListingStep('nonsense'));

// Resume: a rejected section outranks an unstarted one.
const fakeCompletion = {
  sections: steps.INPUT_STEP_IDS.map((id, i) => ({
    id,
    done: i < 5,
    failed: id === 'ownership',
  })),
  done: 5,
  total: 9,
  minutesLeft: 10,
};
check('resume prefers a REJECTED section over an unstarted one',
  steps.firstIncompleteStepId(fakeCompletion) === 'ownership',
  steps.firstIncompleteStepId(fakeCompletion));

const allDone = {
  sections: steps.INPUT_STEP_IDS.map((id) => ({ id, done: true, failed: false })),
  done: 9, total: 9, minutesLeft: 0,
};
check('resume lands on review when everything is done',
  steps.firstIncompleteStepId(allDone) === 'review');

const prog = steps.wizardProgress(fakeCompletion, 'pricing');
check('progress separates position from completion',
  prog.chapterNumber === 3 && prog.doneCount === 5,
  `chapter ${prog.chapterNumber}/${prog.chapterTotal}, ${prog.doneCount}/${prog.doneTotal} done`);
check('a rejected section marks its chapter failed',
  prog.chapters.find((c) => c.id === 'publish')?.failed === true);

/* --------------------------- find a real client --------------------------- */
const [client] = await sql`
  SELECT id, name, email, account_status FROM "user"
   WHERE role = 'client' AND account_status = 'active'
   ORDER BY created_at LIMIT 1`;

if (!client) {
  console.log('\n  SKIP  no active client in the database — run npm run db:seed');
  await sql.end();
  process.exit(fail.length ? 1 : 0);
}

let [listing] = await sql`
  SELECT id, status, title FROM rentable
   WHERE client_id = ${client.id} ORDER BY created_at LIMIT 1`;

if (!listing) {
  console.log('\n  SKIP  that client owns no listing — cannot drive the pages');
  await sql.end();
  process.exit(fail.length ? 1 : 0);
}

const token = await encryptSession({
  userId: client.id, role: 'client', accountStatus: client.account_status,
});
const headers = { cookie: `${SESSION_COOKIE}=${token}` };

/**
 * React splits interpolated text with `<!-- -->` hydration markers, so
 * "Step 6 of 10" arrives as "Step <!-- -->6<!-- --> of <!-- -->10". Strip them
 * before asserting on copy, or every text check is a false negative.
 */
const text = (html) => html.replace(/<!--\s*-->/g, '');

const get = async (path, redirect = 'follow') => {
  const res = await fetch(`${BASE}${path}`, { headers, redirect });
  const html = redirect === 'follow' ? await res.text() : '';
  return {
    status: res.status,
    url: res.url,
    location: res.headers.get('location'),
    html,
    text: text(html),
  };
};

console.log(`\nWalkthrough over HTTP  (client ${client.email ?? client.name}, listing ${listing.id.slice(0, 8)})`);

/* ------------------------------ resume entry ------------------------------ */
const entry = await get(`/partner/listings/${listing.id}/setup`, 'manual');
check('/setup redirects to a step',
  [302, 303, 307].includes(entry.status) && /\/setup\/[a-z]+$/.test(entry.location ?? ''),
  `${entry.status} → ${entry.location}`);

/* --------------------------- every step renders --------------------------- */
let chromeOk = 0;
for (const id of steps.LISTING_STEP_IDS) {
  const r = await get(`/partner/listings/${listing.id}/setup/${id}`);
  const step = steps.getStep(id);
  const isLast = steps.nextStepId(id) === null;
  const isFirst = steps.prevStepId(id) === null;

  const has = {
    ok: r.status === 200,
    chapter: r.text.includes(step.chapterLabel),
    counter: new RegExp(`Step ${steps.stepIndex(id) + 1} of ${steps.LISTING_STEPS.length}`)
      .test(r.text),
    exit: r.text.includes('Save and exit'),
    back: isFirst ? !r.text.includes('>Back<') : r.text.includes('Back'),
    next: isLast ? !r.text.includes('Save and continue') : true,
    formId: step.advance === 'submit' ? r.html.includes('id="listing-step-form"') : true,
    // Duplicate ids would mean the sticky bar submits the wrong form.
    oneForm: (r.html.match(/id="listing-step-form"/g) ?? []).length <= 1,
    skip: isLast ? !r.text.includes('Skip for now') : r.text.includes('Skip for now'),
    // Exactly one h1 per step: the section owns the heading, the shell owns
    // chrome. Two would be a duplicated title, zero an unlabelled screen.
    oneH1: (r.html.match(/<h1[\s>]/g) ?? []).length === 1,
    /**
     * The action bar must be reachable without scrolling — the guarantee, not
     * the class name. It used to be `sticky bottom-0` inside a scrolling page;
     * it is now the third row of an `h-dvh` flex column in which only <main>
     * scrolls, which pins it harder. Assert the structure that actually
     * provides the guarantee.
     */
    actionBarPinned: r.html.includes('h-dvh')
      && /<main[^>]*overflow-y-auto/.test(r.html)
      && /<footer[^>]*shrink-0/.test(r.html),

    /** Progress belongs above the question, not under the fold. */
    progressOnTop: r.html.indexOf('Chapter') > -1
      && r.html.indexOf('Chapter') < r.html.indexOf('<main'),
    // The bar sits outside the form and reaches it by id, so a nested form
    // would silently submit the wrong thing.
    noNestedForm: !/<form[^>]*>(?:(?!<\/form>)[\s\S])*?<form/.test(r.html),
  };
  const bad = Object.entries(has).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length === 0) chromeOk += 1;
  check(`step ${String(steps.stepIndex(id) + 1).padStart(2)}. ${id.padEnd(10)} ${step.advance}`,
    bad.length === 0, bad.length ? `missing: ${bad.join(', ')}` : `${r.status}`);
}
check(`all ${steps.LISTING_STEP_IDS.length} steps render full chrome`,
  chromeOk === steps.LISTING_STEP_IDS.length);

/* ------------------------------- edge cases ------------------------------- */
const bogus = await get(`/partner/listings/${listing.id}/setup/not-a-step`);
check('unknown step 404s', bogus.status === 404, String(bogus.status));

const otherId = '00000000-0000-4000-8000-000000000000';
const foreign = await get(`/partner/listings/${otherId}/setup/basics`);
check("another Client's listing 404s, not 500s", foreign.status === 404, String(foreign.status));

/* ------------------- manage page still works, card chrome ------------------- */
const manage = await get(`/partner/listings/${listing.id}`);
const manageForms = (manage.html.match(/id="listing-step-form"/g) ?? []).length;
check('manage page renders', manage.status === 200);
check('manage page has NO wizard form ids (would be duplicate ids)',
  manageForms === 0, `found ${manageForms}`);
check('manage page still shows every section heading',
  ['What it is', 'Where it is', 'Size and capacity', 'What it has', 'House rules',
    'Slots and pricing', 'Deposit and cancellation', 'Photos', 'Proof it is yours']
    .every((h) => manage.text.includes(h)));
check('manage page offers the walkthrough when work remains',
  manage.text.includes('Finish it step by step') || listing.status === 'live');

console.log(`\n  ${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log(`  failed: ${fail.join(', ')}`);
await sql.end();
process.exit(fail.length ? 1 : 0);
