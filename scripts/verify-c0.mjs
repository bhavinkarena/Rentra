/**
 * Verifies phase C0 — the features that existed but were unreachable.
 *
 * Two halves, for the same reason verify-listing-wizard.mjs has two:
 *   · pure rules asserted directly, no server needed
 *   · the surfaces driven over real HTTP with a genuine session cookie, which
 *     is the only way to know a page actually renders rather than merely
 *     compiles
 *
 *   npm run dev        (in another terminal)
 *   npm run verify:c0
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
const { movePhoto, targetIndex, renumberPhotos, photoId } = await import('../lib/domain/listing-photos.js');
const { listingPath } = await import('../lib/domain/listing-url.js');

/* ========================== 1. photo order rules ========================== */
console.log('\nPhoto order');

const shots = ['a', 'b', 'c', 'd'].map((key) => ({ key, alt: 'x' }));
const keysOf = (r) => r.photos.map((p) => p.key).join('');

check('promoting to cover puts it first',
  keysOf(movePhoto(shots, 'c', 'cover')) === 'cabd',
  keysOf(movePhoto(shots, 'c', 'cover')));

check('back moves one earlier',
  keysOf(movePhoto(shots, 'c', 'back')) === 'acbd');

check('forward moves one later',
  keysOf(movePhoto(shots, 'b', 'forward')) === 'acbd');

check('the cover cannot move back', !movePhoto(shots, 'a', 'back').changed);
check('the last photo cannot move forward', !movePhoto(shots, 'd', 'forward').changed);
check('the cover is already the cover', !movePhoto(shots, 'a', 'cover').changed);
check('an unknown key returns null, not a mangled list',
  movePhoto(shots, 'zzz', 'cover') === null);

// The invariant that matters: reordering must never lose a photo.
const everyMove = [];
for (const key of ['a', 'b', 'c', 'd']) {
  for (const move of ['cover', 'back', 'forward']) {
    const r = movePhoto(shots, key, move);
    everyMove.push([...r.photos.map((p) => p.key)].sort().join(''));
  }
}
check('no move ever adds, drops or duplicates a photo',
  everyMove.every((set) => set === 'abcd'),
  `${everyMove.length} permutations checked`);

check('an out-of-range index is clamped, never wrapped',
  targetIndex(0, 'back', 4) === 0 && targetIndex(3, 'forward', 4) === 3);

/**
 * `rentable.photos` holds two shapes: seeded photos are { url, alt } and
 * owner-uploaded ones are { key, alt }. Matching on `key` alone meant reorder
 * and delete did nothing at all on every seeded listing — which is to say, on
 * every listing anyone would actually open to look at.
 */
const mixed = [
  { url: '/seed/a.jpg', alt: 'x' },       // seeded shape
  { key: 'rentra/x/photo_1', alt: 'y' },  // uploaded shape
  { url: '/seed/b.jpg', alt: 'z' },
];
check('a seeded photo has an identity', photoId(mixed[0]) === '/seed/a.jpg');
check('an uploaded photo has an identity', photoId(mixed[1]) === 'rentra/x/photo_1');
check('a seeded photo can be promoted to cover',
  photoId(movePhoto(mixed, '/seed/b.jpg', 'cover').photos[0]) === '/seed/b.jpg');
check('an uploaded photo can be promoted to cover',
  photoId(movePhoto(mixed, 'rentra/x/photo_1', 'cover').photos[0]) === 'rentra/x/photo_1');
check('the two shapes reorder against each other',
  movePhoto(mixed, '/seed/a.jpg', 'forward').photos.map(photoId).join('|')
    === 'rentra/x/photo_1|/seed/a.jpg|/seed/b.jpg');

const renumbered = renumberPhotos(movePhoto(shots, 'd', 'cover').photos, 'Palm Court');
check('alt text follows the new position',
  renumbered[0].alt === 'Palm Court — photo 1' && renumbered[3].alt === 'Palm Court — photo 4',
  renumbered.map((p) => p.alt.slice(-7)).join(' · '));

/* ======================= 2. the cache paths purged ======================= */
console.log('\nRevalidation targets');

check('the public path is slug + code',
  listingPath('palm-court', 'rv8z5xby') === '/listing/palm-court-rv8z5xby',
  listingPath('palm-court', 'rv8z5xby'));

/* ====================== 3. the surfaces, over HTTP ====================== */
console.log('\nLive surfaces');

const [client] = await sql`
  select id, email from "user"
  where role = 'client' and account_status = 'active'
  order by created_at asc limit 1
`;

if (!client) {
  check('a seeded active client exists', false, 'run npm run db:seed');
} else {
  const token = await encryptSession({ userId: client.id, role: 'client' });
  const cookie = `${SESSION_COOKIE}=${token}`;
  const get = (path) => fetch(`${BASE}${path}`, {
    headers: { cookie }, redirect: 'manual',
  });

  const settings = await get('/partner/settings');
  const settingsHtml = settings.ok ? await settings.text() : '';
  check('/partner/settings renders', settings.status === 200, `HTTP ${settings.status}`);
  check('settings offers the payout destination',
    settingsHtml.includes('Where we send your money'));
  check('settings offers a language choice',
    settingsHtml.includes('ગુજરાતી') && settingsHtml.includes('हिन्दी'));
  check('settings shows the sign-in address',
    settingsHtml.includes(client.email ?? ''));

  const [listing] = await sql`
    select id, title, status, photos from rentable
    where client_id = ${client.id} and status = 'live'
    order by created_at asc limit 1
  `;

  if (!listing) {
    check('a live listing exists to exercise', false, 'run npm run db:seed');
  } else {
    const live = await get(`/partner/listings/${listing.id}`);
    const liveHtml = live.ok ? await live.text() : '';
    check('a live listing offers Pause', liveHtml.includes('Pause new bookings'),
      `HTTP ${live.status}`);
    check('a live listing explains what pausing does',
      liveHtml.includes('Takes it out of search without deleting anything'));

    const photos = Array.isArray(listing.photos) ? listing.photos : [];
    if (photos.length > 1) {
      check('photos offer a cover control', liveHtml.includes('the cover'));
      check('the first photo is labelled as the cover', liveHtml.includes('cover'));
    }

    /**
     * THE DEAD DROPZONE.
     *
     * `<Section id="photos">` rendered a <section id="photos"> directly above
     * <input id="photos">, so <label for="photos"> resolved to the section —
     * and a label pointing at an unlabelable element does nothing at all. The
     * "Add photos" box looked like a button and could not be clicked, on the
     * one step that cannot be completed any other way.
     *
     * Asserting no duplicate ids at all, rather than just this one pair, is
     * what stops the next section colliding the same way.
     */
    const photoStep = await get(`/partner/listings/${listing.id}/setup/photos`);
    const photoHtml = photoStep.ok ? await photoStep.text() : '';
    check('the photos step renders', photoStep.status === 200, `HTTP ${photoStep.status}`);

    const ids = [...photoHtml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    check('no duplicate DOM ids on the photos step', dupes.length === 0,
      dupes.length ? `duplicated: ${[...new Set(dupes)].join(', ')}` : `${ids.length} ids, all unique`);

    const labelFor = photoHtml.match(/<label[^>]*\sfor="photo-files"/);
    check('the dropzone label points at photo-files', Boolean(labelFor));
    check('an input actually carries id="photo-files"',
      /<input[^>]*\sid="photo-files"/.test(photoHtml));
    check('the dropzone target is a real form control',
      ids.filter((i) => i === 'photo-files').length === 1);
    check('drag and drop is offered', photoHtml.includes('drag them in'));

    // Same collision, same fix — this one was broken too and nobody had
    // noticed, because a label that does nothing looks exactly like a label.
    const capStep = await get(`/partner/listings/${listing.id}/setup/capacity`);
    const capHtml = capStep.ok ? await capStep.text() : '';
    const capIds = [...capHtml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    check('no duplicate DOM ids on the capacity step',
      capIds.filter((v, i) => capIds.indexOf(v) !== i).length === 0);

    /* ---------------------- full-screen wizard chrome ---------------------- */
    check('the walkthrough fills the viewport', photoHtml.includes('h-dvh'));
    check('the partner header is NOT above the walkthrough',
      !photoHtml.includes('for owners'),
      'wizard lives in its own route group');

    const barAt = photoHtml.indexOf('Chapter');
    const mainAt = photoHtml.indexOf('<main');
    check('progress sits ABOVE the step content',
      barAt > -1 && mainAt > -1 && barAt < mainAt,
      `chapter bar @${barAt}, main @${mainAt}`);

    const submitted = await get(`/partner/listings/${listing.id}/submitted`);
    const submittedHtml = submitted.ok ? await submitted.text() : '';
    check('the submitted screen renders', submitted.status === 200, `HTTP ${submitted.status}`);
    check('it names the property', submittedHtml.includes(listing.title ?? ''));
    check('it says what happens next', submittedHtml.includes('A walkthrough'));
    check('the tick is animated', submittedHtml.includes('animate-draw'));

    /**
     * The paused branch used to fall through to "0 sections left — ." on a
     * listing that was in fact complete. Flip a real row, look, put it back.
     */
    await sql`update rentable set status = 'paused', prior_status = 'live' where id = ${listing.id}`;
    try {
      const paused = await get(`/partner/listings/${listing.id}`);
      const pausedHtml = paused.ok ? await paused.text() : '';
      check('a paused listing says so', pausedHtml.includes('Paused by you'),
        `HTTP ${paused.status}`);
      check('a paused listing offers Resume',
        pausedHtml.includes('Take bookings again'));
      check('a paused listing never claims "0 sections left"',
        !pausedHtml.includes('0 section'));
    } finally {
      await sql`update rentable set status = 'live', prior_status = null where id = ${listing.id}`;
    }
  }
}

/* --------------------------------- result --------------------------------- */
console.log(`\n  ${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log(`  failed: ${fail.join(', ')}`);
await sql.end();
process.exit(fail.length ? 1 : 0);
