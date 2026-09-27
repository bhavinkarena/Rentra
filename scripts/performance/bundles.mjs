import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

// Count each chunk once per route. This is a cold-load estimate, not actual
// transferred bytes: shared chunks are reused on subsequent navigations.
export function summarizeRoutes(routes, readChunk) {
  return routes.map(({ route, firstLoadChunkPaths }) => {
    const chunks = [...new Set(firstLoadChunkPaths)].map(readChunk);
    return {
      route,
      rawBytes: chunks.reduce((total, chunk) => total + chunk.length, 0),
      gzipBytes: chunks.reduce((total, chunk) => total + gzipSync(chunk).length, 0),
    };
  });
}

export function compareRoutes(current, baseline) {
  const previous = new Map(baseline.map((row) => [row.route, row]));
  return current.map((row) => {
    const before = previous.get(row.route)?.gzipBytes;
    return { ...row, before, reduction: before ? (1 - row.gzipBytes / before) * 100 : null };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, '../..');
  const statsPath = resolve(root, '.next/diagnostics/route-bundle-stats.json');
  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
    const baseline = JSON.parse(readFileSync(resolve(root, 'docs/performance-baseline.json')));
    const current = summarizeRoutes(stats, (path) =>
      readFileSync(resolve(root, path.replaceAll('\\', sep))),
    );
    const compared = compareRoutes(current, baseline.routes);
    console.table(
      compared.map((row) => ({
        route: row.route,
        'raw KiB': (row.rawBytes / 1024).toFixed(1),
        'gzip KiB': (row.gzipBytes / 1024).toFixed(1),
        'gzip reduction %': row.reduction?.toFixed(1) ?? 'new route',
      })),
    );
    // Guard against exceeding the pre-audit baseline. Tighten after production
    // measurements; new routes need an explicit review rather than a false pass.
    if (process.argv.includes('--check')) {
      const regressions = compared.filter((row) => row.before == null || row.reduction < -2);
      if (regressions.length) {
        console.error(
          'Bundle baseline review required:',
          regressions.map((row) => row.route),
        );
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error('Run npm run build first, then retry the bundle report:', error.message);
    process.exitCode = 1;
  }
}
