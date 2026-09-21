import { ApiError } from './client.js';

/**
 * Read from the API, but do not let a failure take the page down with it.
 *
 * WHY THIS IS NEEDED AT ALL.
 *
 * The public pages are statically rendered, and `next build` renders them
 * eagerly. They used to read the database directly, which a build can do.
 * They now read the API over HTTP — and during a build the API is simply not
 * running. On a hosted build it may not even exist yet, which makes the first
 * deploy of a new environment circular.
 *
 * Left unhandled, one unreachable endpoint fails the whole build. That is the
 * wrong trade: a deploy must not depend on a runtime dependency being up.
 *
 * WHAT IT DOES INSTEAD.
 *
 * On failure it returns the fallback and warns. For an ISR page the degraded
 * copy is what gets cached, and the next revalidation replaces it with the
 * real thing once the API is reachable — so the cost of an API outage during
 * a deploy is a thin page for one revalidation window, not a failed release.
 *
 * WHERE IT IS APPROPRIATE.
 *
 * Only where a fallback is genuinely better than an error: chrome that frames
 * a page (the footer's location links), or a list that reads correctly when
 * empty. It is NOT for a page whose whole purpose is the data — a booking
 * record must never quietly render as "no bookings", so those reads still
 * throw and surface a real error. Pass a fallback you would be happy for a
 * visitor to see.
 */
export async function degradeOnFailure(read, fallback, context = 'API read') {
  try {
    return await read();
  } catch (error) {
    /**
     * Only ever swallow an API-shaped failure. A `redirect()` from the
     * client, a programming error, anything else — those must propagate, or
     * this becomes the thing that hides real bugs.
     */
    if (!(error instanceof ApiError)) throw error;

    console.warn(
      `[api] ${context} failed (${error.code ?? error.status}): ${error.message}. ` +
        'Rendering the fallback; this page will fill in on the next revalidation.',
    );
    return fallback;
  }
}

/**
 * The shape `discoveryApi.registry()` returns, with nothing in it.
 *
 * Every consumer maps over these four arrays, so an empty registry renders a
 * page with no location links rather than throwing on `undefined.map`.
 */
export const EMPTY_REGISTRY = Object.freeze({
  cities: [],
  areas: [],
  categories: [],
  amenities: [],
});
