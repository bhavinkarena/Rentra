import { notFound } from 'next/navigation';
import { requireActiveClient } from '@/lib/auth/dal';
import {
  getListingForEdit, getAmenityCatalogue, getCategories, getCitiesWithAreas,
} from '@/lib/db/listing-queries';
import { listingCompletion } from '@/lib/domain/listing-completion';
import {
  LISTING_CHAPTERS, getStep, isListingStep, nextStepId, prevStepId,
  stepHref, wizardProgress,
} from '@/lib/domain/listing-steps';
import { submitListing } from '@/lib/auth/listings';
import WizardShell from '@/components/partner/listing/WizardShell';
import WizardReview from '@/components/partner/listing/WizardReview';
import {
  BasicsSection, LocationSection, CapacitySection, AmenitiesSection,
  RulesSection, PricingSection, TermsSection, PhotosSection, OwnershipSection,
} from '@/components/partner/listing/ListingSections';

export const metadata = {
  title: 'Set up your property',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * One step of the walkthrough, full screen.
 *
 * Real routes rather than client-side step state, deliberately:
 *   · the browser Back button does the obvious thing
 *   · a half-finished setup is a link the Client can be sent over WhatsApp
 *   · each step server-renders only its own step, so a slow connection is
 *     not waiting on the whole nine-section form
 *
 * The manage page at /partner/listings/[id] renders these same sections all
 * at once for random-access editing. Same components, different chrome —
 * see components/partner/listing/chrome.jsx.
 */
export default async function SetupStepPage({ params }) {
  const user = await requireActiveClient();
  const { id, step: stepId } = await params;

  if (!isListingStep(stepId)) notFound();

  const data = await getListingForEdit(id, user.id);
  if (!data) notFound(); // scoped by clientId — another Client's id is a 404

  const { listing, prices, amenities, photos, documents } = data;
  const completion = listingCompletion(listing, data);
  const step = getStep(stepId);
  const progress = wizardProgress(completion, stepId);

  // Only fetch what this step actually renders. The amenity catalogue has no
  // business being queried on the pricing step.
  const [catalogue, categories, cities] = await Promise.all([
    stepId === 'amenities' ? getAmenityCatalogue() : null,
    stepId === 'basics' ? getCategories() : null,
    stepId === 'location' ? getCitiesWithAreas() : null,
  ]);

  const next = nextStepId(stepId);
  const prev = prevStepId(stepId);

  // The rail shows the full journey, but only saved, failed, and current
  // steps are links. That keeps an accidental jump from discarding unsaved
  // input; moving forward deliberately still happens through Skip/Continue.
  const navigableSteps = progress.steps.filter((s) => s.done || s.failed || s.isCurrent);
  const stepHrefs = Object.fromEntries(
    navigableSteps.map((s) => [s.id, stepHref(id, s.id)]),
  );
  const chapterHrefs = Object.fromEntries(
    LISTING_CHAPTERS
      .map((c) => [c.id, stepHrefs[c.steps[0].id]])
      .filter(([, href]) => Boolean(href)),
  );

  return (
    <WizardShell
      listingId={id}
      step={step}
      progress={progress}
      nextHref={next ? stepHref(id, next) : null}
      prevHref={prev ? stepHref(id, prev) : null}
      chapterHrefs={chapterHrefs}
      stepHrefs={stepHrefs}
    >
      {stepId === 'basics' ? (
        <BasicsSection listing={listing} categories={categories} />
      ) : null}
      {stepId === 'location' ? (
        <LocationSection listing={listing} cities={cities} />
      ) : null}
      {stepId === 'capacity' ? <CapacitySection listing={listing} /> : null}
      {stepId === 'amenities' ? (
        <AmenitiesSection listing={listing} catalogue={catalogue} selected={amenities} />
      ) : null}
      {stepId === 'rules' ? <RulesSection listing={listing} /> : null}
      {stepId === 'pricing' ? <PricingSection listing={listing} prices={prices} /> : null}
      {stepId === 'terms' ? <TermsSection listing={listing} /> : null}
      {stepId === 'photos' ? <PhotosSection listing={listing} photos={photos} /> : null}
      {stepId === 'ownership' ? (
        <OwnershipSection
          listing={listing}
          documents={documents}
          clientType={user.clientType}
          kycName={user.name}
        />
      ) : null}
      {stepId === 'review' ? (
        <WizardReview
          listingId={id}
          listing={listing}
          completion={completion}
          submitAction={submitListing}
        />
      ) : null}
    </WizardShell>
  );
}
