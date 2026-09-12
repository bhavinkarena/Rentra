import { requireActiveClient } from '@/lib/auth/dal';
import { getCategories, getCitiesWithAreas } from '@/lib/db/listing-queries';
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

  const [categories, cities] = await Promise.all([
    getCategories(),
    getCitiesWithAreas(),
  ]);
  const progress = wizardProgress(listingCompletion(null), 'basics');

  return <NewListingStart categories={categories} cities={cities} progress={progress} />;
}
