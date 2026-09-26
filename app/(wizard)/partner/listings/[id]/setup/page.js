import { redirect } from 'next/navigation';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
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
  await requireActiveClient();
  const { id } = await params; // Next 16: params is a Promise

  const { data, failure } = await settle(partnerApi.listing(id));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/listings" backLabel="All properties" />;

  const completion = listingCompletion(data.listing, data);
  redirect(stepHref(id, firstIncompleteStepId(completion)));
}
