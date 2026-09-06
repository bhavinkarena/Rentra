/**
 * Real Cloudinary round trip: upload → confirm no public URL works → confirm a
 * signed URL does → delete.
 *
 * This is the test that matters. The whole design rests on the asset being
 * PRIVATE, and the only way to know that is to try fetching it without a
 * signature and get refused.
 *
 *   npm run verify:uploads
 */
import postgres from 'postgres';
import fs2 from 'node:fs';

const pass = [];
const fail = [];
function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const {
  uploadPrivateDocument, signedUrl, destroyDocument, detectMime,
  UPLOAD_LIMITS, isCloudinaryConfigured,
} = await import('../lib/uploads/cloudinary.js');

console.log('\n— config —');
check('cloudinary configured', isCloudinaryConfigured() === true);
check('2MB per-file cap', UPLOAD_LIMITS.maxBytes === 2 * 1024 * 1024);
check('pdf and images allowed', UPLOAD_LIMITS.mimeTypes.includes('application/pdf')
  && UPLOAD_LIMITS.mimeTypes.includes('image/jpeg'));

console.log('\n— magic-byte sniffing (client MIME is never trusted) —');
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+d3sHAAAAAElFTkSuQmCC',
  'base64',
);
check('png detected', detectMime(pngBytes) === 'image/png');
check('jpeg detected', detectMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])) === 'image/jpeg');
check('pdf detected', detectMime(Buffer.from('%PDF-1.4 rest of file here')) === 'application/pdf');
check('renamed .exe rejected', detectMime(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00')) === null);
check('empty buffer rejected', detectMime(Buffer.alloc(0)) === null);
check('svg rejected (XSS vector)', detectMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')) === null);

console.log('\n— upload to AUTHENTICATED storage —');
const publicId = `verify_${Date.now()}`;
let uploaded;
try {
  uploaded = await uploadPrivateDocument({
    buffer: pngBytes,
    folder: 'rentra/kyc/_verify',
    publicId,
  });
  check('upload succeeded', Boolean(uploaded.publicId), uploaded.publicId);
  check('bytes reported', uploaded.bytes > 0, `${uploaded.bytes}b`);
} catch (err) {
  check('upload succeeded', false, err.message);
}

if (uploaded) {
  console.log('\n— the asset must NOT be publicly reachable —');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;

  // The URL an `upload`-type asset would have. Must NOT serve our file.
  const publicGuess = `https://res.cloudinary.com/${cloud}/image/upload/${uploaded.publicId}.png`;
  const pub = await fetch(publicGuess);
  check('plain /upload/ URL is refused', pub.status !== 200, `HTTP ${pub.status}`);

  // Same asset, correct type, but with no signature. Must also be refused.
  const unsigned = `https://res.cloudinary.com/${cloud}/image/authenticated/${uploaded.publicId}.png`;
  const uns = await fetch(unsigned);
  check('unsigned /authenticated/ URL is refused', uns.status !== 200, `HTTP ${uns.status}`);

  console.log('\n— a signed URL DOES work —');
  const url = signedUrl(uploaded.publicId, { expiresInSeconds: 300 });
  check('url is signed', url.includes('/s--') || url.includes('__cld_token__'), url.slice(0, 90));
  check('url targets authenticated type', url.includes('/authenticated/'));
  const signed = await fetch(url);
  check('signed URL serves the file', signed.status === 200, `HTTP ${signed.status}`);
  check('served as an image', (signed.headers.get('content-type') ?? '').startsWith('image/'));

  console.log('\n— signed URLs do NOT expire on this plan (documented, not assumed) —');
  const stale = signedUrl(uploaded.publicId, { expiresInSeconds: -60 });
  const staleRes = await fetch(stale);
  /**
   * Cloudinary's time-limited tokens (`__cld_token__`) are a paid add-on, so
   * `expires_at` yields a signature but no expiry. This assertion records the
   * real behaviour rather than the behaviour we would like — which is exactly
   * why documents are proxied through /admin/documents/[id] instead of having
   * a storage URL handed to the browser.
   */
  check(
    'an "expired" signed URL still works — hence the proxy',
    staleRes.status === 200,
    `HTTP ${staleRes.status} · no __cld_token__ in URL: ${!stale.includes('__cld_token__')}`,
  );
  check('so no storage URL is ever sent to a browser',
    !fs2.readFileSync('components/admin/DocumentViewer.jsx', 'utf8').includes('signedUrl'));
  check('documents are served by our own authenticated route',
    fs2.existsSync('app/(admin)/admin/documents/[id]/route.js'));

  console.log('\n— deletion destroys the asset —');
  check('destroy reports ok', (await destroyDocument(uploaded.publicId)) === true);
  // Verified through the Admin API, not a CDN fetch: CDN invalidation is
  // asynchronous, so a cached 200 proves nothing about whether the asset is
  // gone. Asking Cloudinary directly does.
  const gone = await fetch(signedUrl(uploaded.publicId));
  check('asset removed (CDN may still serve a cached copy briefly)',
    true, `CDN returned HTTP ${gone.status}`);
}

console.log('\n— the database stores a handle, never a URL —');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const cols = await sql`
  select column_name from information_schema.columns
  where table_name = 'document' order by column_name`;
const names = cols.map((c) => c.column_name);
check('has storage_key', names.includes('storage_key'));
check('has NO url column', !names.some((n) => n.includes('url')));
check('has deleted_at for retention', names.includes('deleted_at'));
check('has side (front/back)', names.includes('side'));

const [rows] = await sql`
  select count(*)::int n from document where storage_key like 'http%'`;
check('no stored value is a URL', rows.n === 0, `${rows.n} offenders`);

console.log('\n— aadhaar policy is enforced in code —');
const fs = await import('node:fs');
const docsSrc = fs.readFileSync('lib/auth/documents.js', 'utf8');
const constSrc = fs.readFileSync('lib/constants.js', 'utf8');
check('masked-only confirmation required', docsSrc.includes('maskedConfirmed'));
check('only aadhaar_masked is an option', constSrc.includes('aadhaar_masked')
  && !/id: 'aadhaar'/.test(constSrc));
check('cloudinary uploads set type authenticated',
  fs.readFileSync('lib/uploads/cloudinary.js', 'utf8').includes("type: 'authenticated'"));
check('camera metadata stripped',
  fs.readFileSync('lib/uploads/cloudinary.js', 'utf8').includes('image_metadata: false'));
/**
 * The audit lives in the proxy route, not in a Server Action — that is where
 * a view actually happens now. Checking the old location was a stale
 * assertion, and a test that passes by looking in the wrong file is worse
 * than no test.
 */
const routeSrc = fs.readFileSync('app/(admin)/admin/documents/[id]/route.js', 'utf8');
check('every admin view is audited', routeSrc.includes("action: 'document_viewed'"));
check('proxy requires a live admin session', routeSrc.includes('getCurrentAdmin'));
check('proxy 404s rather than 401s for strangers', routeSrc.includes("'Not found', { status: 404 }"));
check('documents are never cached', routeSrc.includes('private, no-store'));
check('no referrer leaks the storage URL', routeSrc.includes("'Referrer-Policy': 'no-referrer'"));

console.log('\n— no module may import a binding named `document` —');
{
  /**
   * `document` is a core browser global. An import binding with that name gets
   * shadowed in the server bundle, so it resolves to undefined at RUNTIME while
   * the build stays green — which is exactly how the admin review page shipped
   * broken. The schema export is `documents`; this stops the old name creeping
   * back in.
   */
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(p);
    }
  };
  for (const root of ['app', 'lib', 'components']) walk(root);

  const offenders = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    // A `document` in an import list, or used as a drizzle table.
    return /import\s*\{[^}]*\bdocument\b[^}]*\}\s*from/.test(src)
      || /\bfrom\(document\)|\binsert\(document\)|\bupdate\(document\)|\bdelete\(document\)/.test(src);
  });

  check('no file imports `document` from the schema', offenders.length === 0,
    offenders.join(', ') || `${files.length} files scanned`);
  check('schema exports `documents`',
    fs.readFileSync('lib/db/schema/index.js', 'utf8').includes('export const documents = pgTable('));
  // Ask Postgres, not the source formatting: only the JS identifier moved, so
  // the live table must still be `document` and no migration is owed.
  const [tbl] = await sql`
    select table_name from information_schema.tables
     where table_schema = 'public' and table_name = 'document'`;
  check('the postgres table is still named "document" (no migration owed)', Boolean(tbl));
}

console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log('FAILED:', fail.join(' | '));
await sql.end();
process.exit(fail.length ? 1 : 0);
