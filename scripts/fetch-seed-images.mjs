import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Downloads development seed photography into public/seed/.
 *
 * These are FIXTURES, not source — public/seed is gitignored, so a fresh
 * clone runs `npm run seed:images` once. Keeps ~4MB of stock photos out of
 * the repo while making the landing page look like the real product.
 *
 * Source: Unsplash. The Unsplash License grants free commercial use with no
 * attribution required for direct downloads (we are not using their API, so
 * the API attribution terms do not apply). Credits are recorded in
 * public/seed/CREDITS.txt anyway, because it is the decent thing to do.
 *
 * NOTE: no competitor imagery is used anywhere. The plan's own moderation
 * rules call for reverse-image checks to catch exactly that.
 */

const OUT = 'public/seed';

/**
 * Fetch LARGE and CLEAN, then let next/image downscale.
 *
 * The first pass used w=1200&q=55 and the optimizer's WebP output came back
 * BIGGER than the JPEG source (308KB vs 301KB) — re-encoding an already-lossy
 * file at a higher quality adds bytes without adding information. Downscaling
 * from a generous source is what actually produces small, clean output.
 */
const PARAMS = 'w=2400&q=82&fm=jpg&fit=crop';

const MANIFEST = {
  pool: [
    '1652878856832-887df545cb0c', '1621437102383-99e5cf9859c7',
    '1603034203013-d532350372c6', '1603033825246-53b4d1e5c509',
    '1689113690645-108964df3f56', '1593029015621-ac5adbfb10aa',
    '1717284354680-e82031572749', '1775923293081-598283c494bc',
    '1771354146834-feed2e0aee28', '1779269751207-3fea011ce0d1',
  ],
  room: [
    '1638840992956-142399e7e2df', '1664538922512-127ff7e30aef',
    '1710224002849-a76ea1068b0d', '1613553474179-e1eda3ea5734',
    '1635321349359-333da6bb6da9', '1710883734891-93709398496d',
    '1621626806480-53591486f446', '1601221998768-c0cdf463a393',
    '1635286791516-26a3b167864b', '1635286785966-512198a553ca',
  ],
  lawn: [
    '1595037935521-15ce2282a03e', '1571129618841-7884a7a26c93',
    '1557296440-0dc5e8ba9bc8', '1584304474743-a04b149f4210',
    '1758646652296-9273b2422686', '1773433230374-936739342549',
    '1774643460689-0eb3452bcf31', '1772657850449-d39dac1640af',
  ],
};

await mkdir(OUT, { recursive: true });

let ok = 0;
let skipped = 0;
let failed = 0;
const credits = ['Development seed photography — Unsplash License', ''];

for (const [group, ids] of Object.entries(MANIFEST)) {
  for (const id of ids) {
    const name = `${group}-${id.split('-')[0]}.jpg`;
    const dest = path.join(OUT, name);
    credits.push(`${name}  https://unsplash.com/photos/${id}`);

    if (existsSync(dest)) { skipped += 1; continue; }

    const url = `https://images.unsplash.com/photo-${id}?${PARAMS}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 15000) throw new Error(`too small (${buf.length}b)`);
      await writeFile(dest, buf);
      ok += 1;
      process.stdout.write(`  ${name} ${Math.round(buf.length / 1024)}KB\n`);
    } catch (err) {
      failed += 1;
      process.stdout.write(`  FAILED ${name}: ${err.message}\n`);
    }
  }
}

await writeFile(path.join(OUT, 'CREDITS.txt'), `${credits.join('\n')}\n`);

const files = (await readdir(OUT)).filter((f) => f.endsWith('.jpg'));
let bytes = 0;
for (const f of files) bytes += (await stat(path.join(OUT, f))).size;

console.log(`\ndownloaded ${ok}, skipped ${skipped}, failed ${failed}`);
console.log(`${files.length} images, ${(bytes / 1024 / 1024).toFixed(1)}MB total`);
