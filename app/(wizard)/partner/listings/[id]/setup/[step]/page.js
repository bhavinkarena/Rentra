import { TypeSection } from '@/components/partner/listing/TypeSection';
import { AvailabilitySection } from '@/components/partner/listing/AvailabilitySection';
import { notFound, redirect } from 'next/navigation';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { listingCompletion } from '@/lib/domain/listing-completion';
import {
  chaptersFor,
  legacyStep,
  getStep,
  isListingStep,
  listingModel,
  nextStepId,
  prevStepId,
  stepHref,
  wizardProgress,
} from '@/lib/domain/listing-steps';
import { submitListing } from '@/lib/actions/partner';
import WizardShell from '@/components/partner/listing/WizardShell';
import WizardReview from '@/components/partner/listing/WizardReview';
import {
  BasicsSection,
  LocationSection,
  CapacitySection,
  AmenitiesSection,
  RulesSection,
  PricingSection,
  TermsSection,
  PhotosSection,
  OwnershipSection,
  VenueSection,
  HoursSection,
  HourlyPricingSection,
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
  const user = await requireClient();
  const { id, step: requestedStep } = await params;
  const stepId = legacyStep(requestedStep);
  if (stepId !== requestedStep) redirect(stepHref(id, stepId));

  /* Scoped to this Client on the API — another Client's id answers 404. */
  const listingResult = await settle(partnerApi.listing(id));
  const { data, failure } = listingResult;
  if (failure)
    return <PortalState kind={failure} backHref="/partner/listings" backLabel="All properties" />;

  // Farmhouse (slot) or venue (hour): the steps and their reference data differ.
  const model = listingModel(data.listing);
  const vertical = data.listing.vertical;
  if (!isListingStep(stepId, model)) notFound();
  const referenceResult = await settle(
    stepId === 'amenities'
      ? partnerApi.amenityCatalogue(vertical)
      : ['type', 'space', 'pricing'].includes(stepId)
        ? partnerApi.categories(vertical)
        : stepId === 'location'
          ? partnerApi.places()
          : stepId === 'availability'
            ? partnerApi.listingHours(id)
            : Promise.resolve(null),
  );
  if (referenceResult.failure)
    return (
      <PortalState
        kind={referenceResult.failure}
        backHref="/partner/listings"
        backLabel="All properties"
      />
    );

  const { listing, prices, amenities, photos, documents, resources = [], hourlyRates = [] } = data;
  const completion = listingCompletion(listing, data);
  const step = getStep(stepId, model);
  const progress = wizardProgress(completion, stepId, model);

  // Only fetch what this step actually renders. The amenity catalogue has no
  // business being queried on the pricing step.
  const catalogue = stepId === 'amenities' ? referenceResult.data : null;
  const categories = ['type', 'space', 'pricing'].includes(stepId) ? referenceResult.data : null;
  const cities = stepId === 'location' ? referenceResult.data : null;
  const calendar = stepId === 'availability' ? referenceResult.data : null;

  const next = nextStepId(stepId, model);
  const prev = prevStepId(stepId, model);

  // The rail shows the full journey, but only saved, failed, and current
  // steps are links. That keeps an accidental jump from discarding unsaved
  // input; moving forward deliberately still happens through Skip/Continue.
  const navigableSteps = progress.steps.filter((s) => s.done || s.failed || s.isCurrent);
  const stepHrefs = Object.fromEntries(navigableSteps.map((s) => [s.id, stepHref(id, s.id)]));
  const chapterHrefs = Object.fromEntries(
    chaptersFor(model)
      .map((c) => [c.id, stepHrefs[c.steps[0].id]])
      .filter(([, href]) => Boolean(href)),
  );

  return (
    <WizardShell
      key={`${id}:${stepId}`}
      listing={listing}
      listingId={id}
      step={{ ...step, done: completion.sections.find((s) => s.id === step.id)?.done }}
      progress={progress}
      nextHref={next ? stepHref(id, next) : null}
      prevHref={prev ? stepHref(id, prev) : null}
      chapterHrefs={chapterHrefs}
      stepHrefs={stepHrefs}
      correction={
        ['draft', 'rejected'].includes(listing.status) &&
        listing.reviewFlags?.some((flag) => flag.step === stepId)
          ? { reason: listing.rejectionReason }
          : null
      }
    >
      {stepId === 'type' ? <TypeSection listing={listing} categories={categories} /> : null}
      {stepId === 'story' ? <BasicsSection listing={listing} storyOnly /> : null}
      {stepId === 'location' ? <LocationSection listing={listing} cities={cities} /> : null}
      {stepId === 'space' && model !== 'hour' ? <CapacitySection listing={listing} /> : null}
      {stepId === 'amenities' ? (
        <AmenitiesSection listing={listing} catalogue={catalogue} selected={amenities} />
      ) : null}
      {stepId === 'space' && model === 'hour' ? (
        <VenueSection listing={listing} resources={resources} activities={categories} />
      ) : null}
      {stepId === 'availability' ? (
        <AvailabilitySection listing={listing} calendar={calendar} prices={prices} />
      ) : null}
      {stepId === 'rules' ? <RulesSection listing={listing} /> : null}
      {stepId === 'pricing' && model === 'hour' ? (
        <HourlyPricingSection
          listing={listing}
          hourlyRates={hourlyRates}
          resources={resources}
          activities={categories}
        />
      ) : null}
      {stepId === 'pricing' && model !== 'hour' ? (
        <PricingSection listing={listing} prices={prices} />
      ) : null}
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
      {stepId === 'preview' ? (
        <WizardReview
          listingId={id}
          model={model}
          listing={listing}
          completion={completion}
          submitAction={submitListing}
          ownerApproved={user.accountStatus === 'active'}
        />
      ) : null}
    </WizardShell>
  );
}
