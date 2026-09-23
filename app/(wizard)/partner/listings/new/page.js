import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { wizardProgress } from '@/lib/domain/listing-steps';
import NewListingStart from '@/components/partner/listing/NewListingStart';

export const metadata = {
  title: 'Add a property',
  robots: { index: false, follow: false, nocache: true },
};

/** A read-only first step. The form action performs the first database write. */
export default async function NewListingPage() {
  await requireActiveClient();

  const [categories, cities] = await Promise.all([partnerApi.categories(), partnerApi.places()]);
  const progress = wizardProgress(listingCompletion(null), 'basics');

  return <NewListingStart categories={categories} cities={cities} progress={progress} />;
}
