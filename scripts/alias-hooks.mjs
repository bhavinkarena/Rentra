/**
 * Resolve the `@/*` import alias when running lib files directly in node.
 *
 * Next.js resolves `@/*` through jsconfig.json, but plain `node` knows nothing
 * about it — so verification scripts that import from lib/ need this hook.
 * Registered via scripts/register-alias.mjs.
 */
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

function isFile(url) {
  try {
    return statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

export function resolve(specifier, context, next) {
  // Neutralise the server-only guard for scripts — see the stub for why.
  if (specifier === 'server-only') {
    return next(new URL('./server-only-stub.mjs', import.meta.url).href, context);
  }

  // Mirror the bundler's extension resolution: exact, then .js/.jsx, then
  // /index.js. Must check isFile, not merely existence — `@/lib/db` matches a
  // DIRECTORY, and node cannot import one (ERR_UNSUPPORTED_DIR_IMPORT).
  const withExtensions = (base, root) => {
    for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`]) {
      const url = new URL(candidate, root);
      if (isFile(url)) return url.href;
    }
    return null;
  };

  if (specifier.startsWith('@/')) {
    return next(withExtensions(specifier.slice(2), ROOT) ?? specifier, context);
  }

  /**
   * Extensionless RELATIVE imports — `./booking`, `../db/index`.
   * Next.js resolves these; plain node does not, so a script importing any
   * lib file that uses them would fail on a module several levels down.
   */
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (/\.[a-z]+$/i.test(specifier)) return next(specifier, context);
    const resolved = context.parentURL
      ? withExtensions(specifier, context.parentURL)
      : null;
    return next(resolved ?? specifier, context);
  }

  return next(specifier, context);
}
