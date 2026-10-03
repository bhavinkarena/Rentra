import { requireClient } from '@/lib/api/session';
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
  const user = await requireClient();

  // Verticals came with the entertainment plan; an older API answers 404, so fall back to none.
  const [categories, cities, verticals] = await Promise.all([
    partnerApi.categories(),
    partnerApi.places(),
    partnerApi.verticals().catch(() => []),
  ]);
  const progress = wizardProgress(listingCompletion(null), 'type');
  // The rail follows the "What are you listing?" choice.
  const venueProgress = wizardProgress(listingCompletion({ rentalUnit: 'hour' }), 'type', 'hour');

  return (
    <NewListingStart
      intendedVertical={user.ownerGuide?.intendedVertical}
      categories={categories}
      cities={cities}
      verticals={verticals}
      progress={progress}
      venueProgress={venueProgress}
    />
  );
}
