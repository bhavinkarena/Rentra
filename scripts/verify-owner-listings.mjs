/**
 * Verifies the five listings added by scripts/seed-owner-listings.mjs.
 *
 * Checks them where it matters — over real HTTP, on the public page a guest
 * would open and on the owner's own manage page — not just that the rows are
 * in the database. A listing row that renders a 500 is not a listing.
 *
 *   npm run dev                     (in another terminal)
 *   npm run verify:owner-listings
 */
import postgres from 'postgres';

const OWNER_EMAIL = 'kunjdetroja52@gmail.com';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const EXPECTED = { Ahmedabad: 2, Surat: 2, Rajkot: 1 };

const pass = [];
const fail = [];
function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const { encryptSession, SESSION_COOKIE } = await import('../lib/auth/session-crypto.js');

/**
 * Rendered HTML, normalised back to what a reader actually sees.
 *
 * Two transformations, both needed:
 *   · React splits interpolated text with `<!-- -->` hydration markers
 *   · it escapes entities, so "Shivalik Lawn & Farm" is `Lawn &amp; Farm` in
 *     the markup and a plain string match on the title silently misses it
 */
const text = (html) => html
  .replace(/<!--\s*-->/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const [owner] = await sql`
  select id, name from "user" where email = ${OWNER_EMAIL} and role = 'client'
`;

if (!owner) {
  check(`${OWNER_EMAIL} exists as a client`, false, 'run npm run seed:owner-listings');
  console.log(`\n  ${pass.length} passed, ${fail.length} failed`);
  await sql.end();
  process.exit(1);
}

const cookie = `${SESSION_COOKIE}=${await encryptSession({ userId: owner.id, role: 'client' })}`;
const get = (p, auth = false) =>
  fetch(`${BASE}${p}`, auth ? { headers: { cookie } } : undefined);

const rows = await sql`
  select r.id, r.slug, r.public_code, r.title, r.capacity, r.rating_avg, r.review_count,
         c.name as city, a.name as area,
         jsonb_array_length(r.photos)                                             as photos,
         (select count(*) from rentable_price  p  where p.rentable_id  = r.id)    as prices,
         (select count(*) from rentable_amenity ra where ra.rentable_id = r.id)   as amenities,
         (select count(*) from availability    av where av.rentable_id = r.id)    as avail,
         (select count(*) from document d
            where d.owner_type = 'rentable' and d.owner_id = r.id
              and d.status <> 'rejected')                                         as docs
  from rentable r
  join city c on c.id = r.city_id
  join area a on a.id = r.area_id
  where r.client_id = ${owner.id} and r.status = 'live'
  order by c.name, r.title
`;

/* ----------------------------- the spread ----------------------------- */
console.log(`\nCity spread  (owner ${owner.name})`);
const byCity = rows.reduce((m, r) => ({ ...m, [r.city]: (m[r.city] ?? 0) + 1 }), {});
check('five live listings in total', rows.length === 5, `${rows.length} found`);
for (const [city, n] of Object.entries(EXPECTED)) {
  check(`${city}: ${n}`, byCity[city] === n, `${byCity[city] ?? 0} found`);
}
check('no city outside the three asked for',
  Object.keys(byCity).every((c) => c in EXPECTED),
  Object.keys(byCity).join(', '));

/* --------------------------- completeness --------------------------- */
console.log('\nEach listing is actually complete');
for (const r of rows) {
  const gaps = [];
  if (r.photos < 6) gaps.push(`only ${r.photos} photos`);
  if (Number(r.prices) < 1) gaps.push('no price');
  if (Number(r.amenities) < 3) gaps.push(`${r.amenities} amenities`);
  if (Number(r.avail) < 180) gaps.push(`${r.avail} availability rows`);
  if (Number(r.docs) < 1) gaps.push('no ownership document');
  if (!r.rating_avg) gaps.push('no rating');
  check(`${r.city.padEnd(10)} ${r.title.slice(0, 34)}`, gaps.length === 0,
    gaps.length ? gaps.join(', ')
      : `${r.photos} photos · ${r.amenities} amenities · ★${r.rating_avg} (${r.review_count})`);
}

/* ---------------------- amenities on the taxonomy ---------------------- */
const [{ orphans }] = await sql`
  select count(*) as orphans from rentable r
  where r.client_id = ${owner.id} and r.status = 'live'
    and not exists (select 1 from rentable_amenity ra where ra.rentable_id = r.id)
`;
check('every listing uses the amenity taxonomy, not just jsonb labels',
  Number(orphans) === 0, `${orphans} on free text only`);

/* --------------------- reviews are backed by bookings --------------------- */
const [{ unbacked }] = await sql`
  select count(*) as unbacked from review rv
  join rentable r on r.id = rv.rentable_id
  where r.client_id = ${owner.id}
    and not exists (select 1 from booking b
                    where b.id = rv.booking_id and b.state = 'completed')
`;
check('no review without a completed booking behind it', Number(unbacked) === 0);

/* ----------------------------- over HTTP ----------------------------- */
console.log('\nRendered');
for (const r of rows) {
  const res = await get(`/listing/${r.slug}-${r.public_code}`);
  const html = text(await res.text());
  const ok = res.status === 200
    && html.includes(r.title)
    && html.includes(r.area)
    && /₹[\d,]+/.test(html);
  check(`public page · ${r.title.slice(0, 34)}`, ok,
    res.status === 200 ? (html.match(/₹[\d,]+/)?.[0] ?? 'no price shown') : `HTTP ${res.status}`);
}

for (const r of rows) {
  const res = await get(`/partner/listings/${r.id}`, true);
  const html = text(await res.text());
  // A live, complete listing must not be telling its owner work remains.
  const ok = res.status === 200
    && html.includes('Complete and live')
    && !/\d of 9 sections done/.test(html);
  check(`manage page · ${r.title.slice(0, 34)}`, ok,
    res.status === 200
      ? (html.match(/\d of \d sections done/)?.[0] ?? 'complete and live')
      : `HTTP ${res.status}`);
}

const idx = await get('/partner/listings', true);
const idxHtml = text(await idx.text());
check('all five appear on the owner index', idx.status === 200
  && rows.every((r) => idxHtml.includes(r.title)), `HTTP ${idx.status}`);

const home = await get('/');
const homeHtml = text(await home.text());
check('the new cities reach the public home page',
  home.status === 200 && homeHtml.includes('Ahmedabad') && homeHtml.includes('Rajkot'),
  `HTTP ${home.status}`);

console.log(`\n  ${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log(`  failed: ${fail.join(', ')}`);
await sql.end();
process.exit(fail.length ? 1 : 0);
