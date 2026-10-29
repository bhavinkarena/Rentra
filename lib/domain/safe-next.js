/**
 * Where customer login may return to: a same-origin path only. The search page keeps its
 * query (Story 3.1, capped at 2000 characters); customer pages are path-only (Story 2.3).
 * The API re-checks the same rule (`safeCustomerAreaPath`) before redirecting.
 */
export function safeNext(next) {
  if (typeof next !== 'string') return '/';
  if (
    next.length <= 2000 &&
    /^\/search(\?[A-Za-z0-9_.~%&=+,:-]*)?$/.test(next) &&
    !unsafeDecoded(next)
  )
    return next;
  return next.length <= 240 &&
    /^\/(checkout|bookings|account|support|disputes|reviews|saved)(\/[\w-]+)*$/.test(next)
    ? next
    : '/';
}

/** Encoded control characters, whitespace, backslashes, `@` or `//` never pass. */
function unsafeDecoded(value) {
  try {
    return /[\s\\@]|\/\/|[\u0000-\u001f\u007f]/.test(decodeURIComponent(value));
  } catch {
    return true;
  }
}
