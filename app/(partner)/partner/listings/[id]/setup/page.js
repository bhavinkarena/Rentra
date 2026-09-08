import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { requireActiveClient } from '@/lib/auth/dal';
import { getListingForEdit } from '@/lib/db/listing-queries';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { firstIncompleteStepId, stepHref } from '@/lib/domain/listing-steps';

export const metadata = {
  title: 'Set up your property',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Resume point. Sends the Client to the first thing still outstanding —
 * a rejected section before an unstarted one, because a rejection is the more
 * urgent of the two.
 *
 * Derived from completion on every visit rather than stored. A saved
 * `current_step` is wrong the moment a photo is deleted or an admin rejects
 * the ownership document, and it would send someone to a step they already
 * finished.
 */
export default async function SetupEntryPage({ params }) {
  const user = await requireActiveClient();
  const { id } = await params; // Next 16: params is a Promise

  const data = await getListingForEdit(id, user.id);
  if (!data) notFound();

  const completion = listingCompletion(data.listing, data);
  redirect(stepHref(id, firstIncompleteStepId(completion)));
}
