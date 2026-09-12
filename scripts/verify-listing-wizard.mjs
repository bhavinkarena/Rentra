/**
 * Drives listing creation and the full-screen walkthrough over real HTTP.
 *
 * The pages are Server Components behind `requireActiveClient`, so this
 * creates an isolated active Client, mints a genuine session cookie with the
 * same crypto the app uses, and submits the first step through React's native
 * progressive-enhancement form. The temporary Client and its exact records
 * are removed in `finally`.
 *
 *   npm run dev            (in another terminal)
 *   npm run verify:wizard
 */
import postgres from 'postgres';

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const pass = [];
const fail = [];

function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  onnotice: () => {},
});

const { encryptSession, SESSION_COOKIE } = await import('../lib/auth/session-crypto.js');
const steps = await import('../lib/domain/listing-steps.js');
const { listingCompletion } = await import('../lib/domain/listing-completion.js');

/* ------------------------- pure step-maths checks ------------------------- */
console.log('\nStep registry');
check(
  'ten steps in order',
  steps.LISTING_STEP_IDS.length === 10,
  steps.LISTING_STEP_IDS.join(' → '),
);
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
check(
  'resume prefers a REJECTED section over an unstarted one',
  steps.firstIncompleteStepId(fakeCompletion) === 'ownership',
  steps.firstIncompleteStepId(fakeCompletion),
);

const allDone = {
  sections: steps.INPUT_STEP_IDS.map((id) => ({ id, done: true, failed: false })),
  done: 9,
  total: 9,
  minutesLeft: 0,
};
check(
  'resume lands on review when everything is done',
  steps.firstIncompleteStepId(allDone) === 'review',
);

const prog = steps.wizardProgress(fakeCompletion, 'pricing');
check(
  'progress separates position from completion',
  prog.chapterNumber === 3 && prog.doneCount === 5,
  `chapter ${prog.chapterNumber}/${prog.chapterTotal}, ${prog.doneCount}/${prog.doneTotal} done`,
);
check(
  'a rejected section marks its chapter failed',
  prog.chapters.find((chapter) => chapter.id === 'publish')?.failed === true,
);

/**
 * React splits interpolated text with hydration comments and escapes form
 * action state as HTML attributes. Normalise both before visible-copy checks
 * and before replaying the opaque action values.
 */
const text = (html) => html
  .replace(/<!--\s*-->/g, '')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=(['"])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? null;
}

/**
 * Server Actions progressively enhance to a normal multipart POST. React puts
 * its opaque action reference and state in hidden `$ACTION_*` fields, so copy
 * those exact fields rather than depending on a build-specific action id.
 */
function nativeActionBody(html, fields) {
  const opening = /<form\b(?=[^>]*\bid="listing-step-form")[^>]*>/i.exec(html);
  if (!opening) return null;

  const end = html.indexOf('</form>', opening.index + opening[0].length);
  if (end < 0) return null;

  const form = html.slice(opening.index, end + '</form>'.length);
  const body = new FormData();
  let hasActionReference = false;

  for (const tag of form.match(/<input\b[^>]*>/gi) ?? []) {
    if (attribute(tag, 'type')?.toLowerCase() !== 'hidden') continue;
    const name = attribute(tag, 'name');
    if (!name) continue;
    if (/^\$ACTION_(?:REF|ID)_/.test(name)) hasActionReference = true;
    body.append(name, text(attribute(tag, 'value') ?? ''));
  }

  if (!hasActionReference) return null;
  for (const [name, value] of Object.entries(fields)) {
    body.set(name, String(value));
  }
  return body;
}

function locationPath(location) {
  if (!location) return null;
  try {
    return new URL(location, BASE).pathname;
  } catch {
    return null;
  }
}

/* -------------------- isolated creation + real walkthrough -------------------- */
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testEmail = `listingwizard+${runId}@example.com`;
let client = null;
let listing = null;

try {
  const [[selectedCategory], [selectedPlace]] = await Promise.all([
    sql`
      SELECT id
        FROM category
       WHERE is_active = true
       ORDER BY name
       LIMIT 1
    `,
    sql`
      SELECT c.id AS city_id, a.id AS area_id
        FROM city c
        JOIN area a ON a.city_id = c.id
       WHERE c.is_active = true
       ORDER BY c.name, a.name
       LIMIT 1
    `,
  ]);

  check(
    'an active category and service area exist',
    Boolean(selectedCategory && selectedPlace),
  );
  if (!selectedCategory || !selectedPlace) {
    throw new Error('No active category with a city/area pair — run npm run db:seed');
  }

  [client] = await sql`
    INSERT INTO "user" (email, role, name, email_verified_at, account_status)
    VALUES (${testEmail}, 'client', 'Listing Wizard Test', now(), 'active')
    RETURNING id, name, email, account_status
  `;

  const token = await encryptSession({
    userId: client.id,
    role: 'client',
    accountStatus: client.account_status,
  });
  const headers = { cookie: `${SESSION_COOKIE}=${token}` };
  const actionHeaders = {
    ...headers,
    origin: new URL(BASE).origin,
    referer: `${BASE}/partner/listings/new`,
  };

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

  const postNewListing = async (pageHtml, fields) => {
    const body = nativeActionBody(pageHtml, fields);
    if (!body) return null;

    const res = await fetch(`${BASE}/partner/listings/new`, {
      method: 'POST',
      headers: actionHeaders,
      body,
      redirect: 'manual',
    });
    const html = await res.text();
    return {
      status: res.status,
      location: res.headers.get('location'),
      html,
      text: text(html),
    };
  };

  const listingCount = async () => {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count
        FROM rentable
       WHERE client_id = ${client.id}
    `;
    return count;
  };

  const creationAuditCount = async () => {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count
        FROM audit_log
       WHERE actor_type = 'client'
         AND actor_id = ${client.id}
         AND entity = 'rentable'
         AND action = 'listing_draft_created'
    `;
    return count;
  };

  console.log(`\nCreation boundary over HTTP  (isolated client ${client.email})`);
  check('isolated client starts with zero properties', await listingCount() === 0);

  const index = await get('/partner/listings');
  const addPropertyIsLink = /<a\b(?=[^>]*href="\/partner\/listings\/new")[^>]*>[\s\S]*?Add property[\s\S]*?<\/a>/i
    .test(index.text);
  const addPropertyIsForm = (index.text.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) ?? [])
    .some((form) => form.includes('Add property'));
  check(
    'Add property is navigation to /partner/listings/new',
    index.status === 200 && addPropertyIsLink && !addPropertyIsForm,
    `HTTP ${index.status}`,
  );
  check('rendering the properties page creates no row', await listingCount() === 0);

  // Two visits cover a normal click plus the refresh/back/prefetch class of
  // GETs that used to create a new blank row on every render.
  const newPage = await get('/partner/listings/new');
  const repeatedNewPage = await get('/partner/listings/new');
  check(
    'the unsaved first step renders on repeated GETs',
    newPage.status === 200 && repeatedNewPage.status === 200,
    `${newPage.status}, ${repeatedNewPage.status}`,
  );
  check(
    'the unsaved first step uses the wizard progress UI',
    newPage.text.includes('Step 1 of 10')
      && newPage.html.includes('aria-label="Property setup progress"')
      && newPage.html.includes('id="listing-step-form"')
      && steps.LISTING_STEPS.every((step) => newPage.text.includes(step.label)),
  );
  check('the unsaved first step cannot be skipped', !newPage.text.includes('Skip for now'));
  check('GET /partner/listings/new creates no row', await listingCount() === 0);
  check('GET creates no draft audit event', await creationAuditCount() === 0);

  const invalidFields = {
    categoryId: selectedCategory.id,
    cityId: selectedPlace.city_id,
    areaId: selectedPlace.area_id,
    title: 'Tiny',
    description: 'Too short',
    highlight: '',
  };
  const invalid = await postNewListing(newPage.html, invalidFields);
  check('the first step exposes a native Server Action form', Boolean(invalid));
  if (!invalid) throw new Error('Could not find the native Server Action fields');

  check(
    'invalid initial submission stays on the form with field errors',
    invalid.status === 200 && invalid.text.includes('At least 8 characters'),
    `HTTP ${invalid.status}`,
  );
  check('invalid initial submission creates no row', await listingCount() === 0);
  check(
    'invalid initial submission creates no draft audit event',
    await creationAuditCount() === 0,
  );

  // Fetch a fresh action state after the invalid response. This keeps the test
  // faithful to the browser and avoids coupling it to React's opaque action key.
  const freshNewPage = await get('/partner/listings/new');
  const validFields = {
    categoryId: selectedCategory.id,
    cityId: selectedPlace.city_id,
    areaId: selectedPlace.area_id,
    title: `Wizard Regression Farm ${runId}`,
    description: 'A genuine property description created only to verify the first listing step.',
    highlight: 'Creation boundary verified',
  };
  const created = await postNewListing(freshNewPage.html, validFields);
  check('valid initial submission invokes the Server Action', Boolean(created));
  if (!created) throw new Error('Could not submit the native Server Action form');

  const createdPath = locationPath(created.location);
  const expectedRedirect = /^\/partner\/listings\/([0-9a-f-]{36})\/setup\/location$/i
    .exec(createdPath ?? '');
  check(
    'valid initial submission redirects directly to Location',
    created.status === 303 && Boolean(expectedRedirect),
    `HTTP ${created.status} → ${created.location}`,
  );

  const createdRows = await sql`
    SELECT id, status, title, description, highlight, slug,
           public_code AS "publicCode",
           category_id AS "categoryId",
           city_id AS "cityId",
           area_id AS "areaId",
           deposit_amount AS "depositAmount",
           cancellation_tier AS "cancellationTier"
      FROM rentable
     WHERE client_id = ${client.id}
  `;
  check(
    'valid initial submission creates exactly one property',
    createdRows.length === 1,
    `${createdRows.length} rows`,
  );

  listing = createdRows[0] ?? null;
  const meaningful = listing
    && listing.status === 'draft'
    && listing.title === validFields.title
    && listing.description === validFields.description
    && listing.highlight === validFields.highlight
    && listing.categoryId === validFields.categoryId
    && listing.cityId === validFields.cityId
    && listing.areaId === validFields.areaId
    && listing.title !== 'Untitled property'
    && !listing.slug.startsWith('draft-')
    && listing.publicCode?.length === 8;
  check(
    'the one draft contains the submitted meaningful data',
    Boolean(meaningful),
    listing?.title ?? 'no row',
  );
  check(
    'the redirect identifies the row that was actually inserted',
    Boolean(listing && expectedRedirect?.[1] === listing.id),
    `${expectedRedirect?.[1] ?? 'no redirect id'} vs ${listing?.id ?? 'no row'}`,
  );
  check('one creation produces exactly one audit event', await creationAuditCount() === 1);

  if (!listing) throw new Error('Valid submission did not create a listing to walk through');
  const createdCompletion = listingCompletion(listing);
  check(
    'the submitted Basics section is complete',
    createdCompletion.sections.find((section) => section.id === 'basics')?.done === true,
  );
  check(
    'Location is the first incomplete step',
    steps.firstIncompleteStepId(createdCompletion) === 'location',
    steps.firstIncompleteStepId(createdCompletion),
  );

  console.log(`\nWalkthrough over HTTP  (listing ${listing.id.slice(0, 8)})`);

  /* ------------------------------ resume entry ------------------------------ */
  const entry = await get(`/partner/listings/${listing.id}/setup`, 'manual');
  check(
    '/setup resumes the meaningful draft at Location',
    [302, 303, 307].includes(entry.status)
      && locationPath(entry.location) === `/partner/listings/${listing.id}/setup/location`,
    `${entry.status} → ${entry.location}`,
  );

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
      counter: new RegExp(
        `Step ${steps.stepIndex(id) + 1} of ${steps.LISTING_STEPS.length}`,
      ).test(r.text),
      exit: r.text.includes('Exit setup'),
      back: isFirst ? !r.text.includes('>Back<') : r.text.includes('Back'),
      next: isLast ? !r.text.includes('Save and continue') : true,
      formId: step.advance === 'submit'
        ? r.html.includes('id="listing-step-form"')
        : true,
      // Duplicate ids would mean the sticky bar submits the wrong form.
      oneForm: (r.html.match(/id="listing-step-form"/g) ?? []).length <= 1,
      skip: isLast ? !r.text.includes('Skip for now') : r.text.includes('Skip for now'),
      // Exactly one h1 per step: the section owns the heading, the shell owns
      // chrome. Two would be a duplicated title, zero an unlabelled screen.
      oneH1: (r.html.match(/<h1[\s>]/g) ?? []).length === 1,
      /**
       * The action bar must be reachable without scrolling. The explicit data
       * marker is stable across visual restyling; the surrounding viewport
       * structure is what pins it below the scrolling main region.
       */
      actionBarPinned: r.html.includes('h-dvh')
        && /<main[^>]*overflow-y-auto/.test(r.html)
        && /<footer[^>]*data-wizard-actions/.test(r.html),
      /** Progress belongs above the question and exposes useful semantics. */
      progressOnTop: r.html.indexOf('aria-label="Property setup progress"') > -1
        && r.html.indexOf('aria-label="Property setup progress"') < r.html.indexOf('<main'),
      progressSemantic: r.html.includes('role="progressbar"')
        && r.html.includes('aria-label="Property setup steps"')
        && steps.LISTING_STEPS.every((item) => r.text.includes(item.label)),
      // The bar sits outside the form and reaches it by id, so a nested form
      // would silently submit the wrong thing.
      noNestedForm: !/<form[^>]*>(?:(?!<\/form>)[\s\S])*?<form/.test(r.html),
    };
    const bad = Object.entries(has)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (bad.length === 0) chromeOk += 1;
    check(
      `step ${String(steps.stepIndex(id) + 1).padStart(2)}. ${id.padEnd(10)} ${step.advance}`,
      bad.length === 0,
      bad.length ? `missing: ${bad.join(', ')}` : `${r.status}`,
    );
  }
  check(
    `all ${steps.LISTING_STEP_IDS.length} steps render full chrome`,
    chromeOk === steps.LISTING_STEP_IDS.length,
  );

  /* ------------------------------- edge cases ------------------------------- */
  const bogus = await get(`/partner/listings/${listing.id}/setup/not-a-step`);
  check('unknown step 404s', bogus.status === 404, String(bogus.status));

  const otherId = '00000000-0000-4000-8000-000000000000';
  const foreign = await get(`/partner/listings/${otherId}/setup/basics`);
  check(
    "another Client's listing 404s, not 500s",
    foreign.status === 404,
    String(foreign.status),
  );

  /* ------------------- manage page still works, card chrome ------------------- */
  const manage = await get(`/partner/listings/${listing.id}`);
  const manageForms = (manage.html.match(/id="listing-step-form"/g) ?? []).length;
  check('manage page renders', manage.status === 200);
  check(
    'manage page has NO wizard form ids (would be duplicate ids)',
    manageForms === 0,
    `found ${manageForms}`,
  );
  check(
    'manage page still shows every section heading',
    [
      'What it is',
      'Where it is',
      'Size and capacity',
      'What it has',
      'House rules',
      'Slots and pricing',
      'Deposit and cancellation',
      'Photos',
      'Proof it is yours',
    ].every((heading) => manage.text.includes(heading)),
  );
  check(
    'manage page offers the walkthrough when work remains',
    manage.text.includes('Finish it step by step') || listing.status === 'live',
  );
} catch (error) {
  check(
    'creation boundary and walkthrough complete without an unexpected error',
    false,
    error instanceof Error ? error.message : String(error),
  );
} finally {
  if (client) {
    try {
      // The Client is unique to this run. Delete only records owned or emitted
      // by that exact id; never sweep other verification or development data.
      await sql`
        DELETE FROM audit_log
         WHERE actor_type = 'client'
           AND actor_id = ${client.id}
      `;
      await sql`DELETE FROM rentable WHERE client_id = ${client.id}`;
      await sql`DELETE FROM client_application WHERE user_id = ${client.id}`;
      await sql`DELETE FROM "user" WHERE id = ${client.id}`;
      check('isolated verification data cleaned up', true);
    } catch (error) {
      check(
        'isolated verification data cleaned up',
        false,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  await sql.end();
}

console.log(`\n  ${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log(`  failed: ${fail.join(', ')}`);
process.exit(fail.length ? 1 : 0);
