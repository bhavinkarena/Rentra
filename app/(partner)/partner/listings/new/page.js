import { createListingDraft } from '@/lib/auth/listings';
import { requireActiveClient } from '@/lib/auth/dal';

export const metadata = {
  title: 'New property',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Creates a draft and redirects straight into the builder.
 *
 * No "are you sure" step: an empty draft costs nothing, and making someone
 * confirm before they can start is friction for no benefit. Abandoned drafts
 * are what the listings index is for.
 */
export default async function NewListingPage() {
  await requireActiveClient();
  await createListingDraft(); // redirects to /partner/listings/[id]
  return null;
}
