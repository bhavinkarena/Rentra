/**
 * Shared page-state rules for the client and Super Admin portals.
 *
 * Pure so they can be tested without Next. The rule that matters: only a
 * definite "no such record" answer becomes a not-found page. A network
 * failure, a 5xx or an unknown error is "unavailable" and never an empty list
 * or a false 404 (CA21).
 */

/** 'not_found' | 'forbidden' | 'unavailable' for an API failure. */
export function failureKind(error) {
  const status = error?.status;
  // A malformed id is rejected by validation before lookup; it names no record either.
  if (status === 404 || status === 400 || status === 422) return 'not_found';
  if (status === 403) return 'forbidden';
  return 'unavailable';
}

/**
 * A same-portal path to return to, or the fallback.
 *
 * Carries list filters into a detail page's breadcrumb without becoming an
 * open redirect: only a relative path under `prefix` is accepted.
 */
export function safeReturnPath(value, prefix, fallback = prefix) {
  if (typeof value !== 'string' || value.length > 500) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  const path = value.split(/[?#]/)[0];
  return path === prefix || path.startsWith(`${prefix}/`) ? value : fallback;
}
