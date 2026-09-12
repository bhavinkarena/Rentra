import 'server-only';

import { revalidatePath } from 'next/cache';
import { listingPath } from '@/lib/domain/listing-url';

/**
 * Everything a listing edit invalidates, in one place.
 *
 * The public listing page is classic ISR on a one-hour window
 * (`export const revalidate = 3600` in app/(marketing)/listing/[handle]/page.js),
 * and until this existed nothing ever called it in. An owner would edit a
 * price, refresh the public page, see the old number and edit it again — then
 * phone us. A stale price is also the only kind of staleness that reaches a
 * guest as a broken promise, because checkout quotes from the same row.
 *
 * One module rather than a `revalidatePath` sprinkled through each action, for
 * the same reason the refund calculator is one function: the set of paths a
 * listing appears on will grow (city pages, area pages, category pages are all
 * in the plan), and the day it grows there must be exactly one place to add
 * them.
 */

/**
 * @param {object} listing                 the row as it was BEFORE the update
 * @param {object} [opts]
 * @param {string} [opts.previousSlug]     pass when the title changed
 * @param {boolean} [opts.statusChanged]   pass when the listing entered or left `live`
 */
export function revalidateListing(listing, { previousSlug = null, statusChanged = false } = {}) {
  if (!listing) return;
  const { slug, publicCode, id } = listing;

  if (slug && publicCode) revalidatePath(listingPath(slug, publicCode));

  /**
   * A retitle writes a new slug, and the page resolves by publicCode — so the
   * old path and the new path are two different cache entries. Only purging
   * the new one leaves the old URL serving the old title for up to an hour,
   * which is precisely the link someone already forwarded on WhatsApp.
   */
  if (previousSlug && previousSlug !== slug && publicCode) {
    revalidatePath(listingPath(previousSlug, publicCode));
  }

  // The owner's own surfaces. Neither is cached today — both are noindex
  // Server Components reading live — but naming them here means adding a cache
  // to either one later cannot silently go stale behind our backs.
  revalidatePath('/partner/listings');
  if (id) revalidatePath(`/partner/listings/${id}`);

  /**
   * A status change is the only edit that adds or removes the listing from the
   * surfaces that LIST it rather than render it. Everything else changes what
   * a page says about a listing that was already on it.
   */
  if (statusChanged) {
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
  }
}
