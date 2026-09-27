import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { summarizeRoutes, compareRoutes } from '../../scripts/performance/bundles.mjs';

test('bundle report counts shared chunks once within each cold route load', () => {
  const files = { shared: Buffer.from('shared code'), page: Buffer.from('page code') };
  const rows = summarizeRoutes(
    [
      { route: '/', firstLoadChunkPaths: ['shared', 'page', 'shared'] },
      { route: '/help', firstLoadChunkPaths: ['shared'] },
    ],
    (path) => files[path],
  );
  assert.equal(rows[0].rawBytes, files.shared.length + files.page.length);
  assert.equal(rows[0].gzipBytes, gzipSync(files.shared).length + gzipSync(files.page).length);
  assert.equal(rows[1].rawBytes, files.shared.length);
});

test('comparison reports savings, regressions and new routes separately', () => {
  const result = compareRoutes(
    [
      { route: '/', gzipBytes: 50 },
      { route: '/help', gzipBytes: 120 },
      { route: '/new', gzipBytes: 30 },
    ],
    [
      { route: '/', gzipBytes: 100 },
      { route: '/help', gzipBytes: 100 },
    ],
  );
  assert.equal(result[0].reduction, 50);
  assert.ok(Math.abs(result[1].reduction + 20) < 0.001);
  assert.equal(result[2].reduction, null);
});
