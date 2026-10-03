import Link from '@/components/navigation/NavigationLink';
import { Check, Wand2 } from 'lucide-react';
import { partnerApi } from '@/lib/api/endpoints';
import PortalState from '@/components/portal/PortalState';
import PropertyHub from '@/components/partner/property/PropertyHub';
import { loadPropertyHub } from '@/lib/partner/property-hub';
import { trustFieldSentence } from '@/lib/domain/listing-trust';
import { listingCompletion } from '@/lib/domain/listing-completion';
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
  SubmitBar,
  ReviewFlags,
} from '@/components/partner/listing/ListingSections';
import { ListingChrome } from '@/components/partner/listing/chrome';
import {
  firstIncompleteStepId,
  listingModel,
  sectionAnchorId,
  stepHref,
} from '@/lib/domain/listing-steps';

/** Completion step → the editor section that holds it. */
const SECTION_OF_STEP = {
  type: 'basics',
  story: 'basics',
  space: 'capacity',
  availability: 'hours',
};

export const metadata = {
  title: 'Edit property',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The MANAGE view — every section on one page, each saving independently.
 *
 * Its counterpart is the walkthrough at /partner/listings/[id]/setup/[step],
 * which renders these same components one per screen. Two chromes, one set of
 * sections (see components/partner/listing/chrome.jsx) — so this is not the
 * same thing built twice.
 *
 * Which surface for which job:
 *   · walkthrough — a DRAFT. The job is "get to the end", so one question at
 *     a time with a thumb-reachable Continue wins.
 *   · this page   — a LIVE listing. The job is "change the Saturday price",
 *     which is random access. Walking nine steps to reach one field would be
 *     hostile, and a Client with three farmhouses edits far more than they
 *     create.
 */
export default async function ListingBuilderPage(props) {
  const { user, id, query, listHref, failure, data, hub } = await loadPropertyHub(props);
  // Scoped to this Client on the API — another Client's listing id returns
  // 404, not their property. An outage is shown as an outage, not as a missing listing.
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;

  const venue = data.listing.rentalUnit === 'hour';
  const vertical = data.listing.vertical;
  const [catalogue, categories, cities, calendar] = await Promise.all([
    partnerApi.amenityCatalogue(vertical),
    partnerApi.categories(vertical),
    partnerApi.places(),
    // Opening hours are edited here for venues; they need the calendar version.
    venue ? partnerApi.calendar(id) : null,
  ]);

  const { listing, prices, amenities, photos, documents, resources = [], hourlyRates = [] } = data;
  const completion = listingCompletion(listing, {
    prices,
    amenities,
    photos,
    documents,
    resources,
    hourlyRates,
  });
  // Review corrections are actionable only while the owner is fixing them.
  const needsChanges =
    ['draft', 'rejected'].includes(listing.status) &&
    ['changes_requested', 'rejected'].includes(listing.reviewOutcome);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {query.submitted && listing.status === 'pending_review' ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-brand-200 bg-success-bg p-4 text-meta text-brand-900"
        >
          <strong className="font-bold">Submitted for review.</strong> Rentra reviews this exact
          version. The decision appears here; if you edit the property first, submit it again.
        </p>
      ) : null}
      <PropertyHub {...hub} active="edit" />

      {listing.trustFields?.length ? (
        <p className="mt-5 rounded-lg border border-border bg-card p-4 text-meta text-ink-700">
          <strong className="font-semibold text-ink-900">You can change these any time:</strong>{' '}
          prices, the calendar, the description, the highlight, deposit and cancellation, check-in
          times and photo order.{' '}
          <strong className="font-semibold text-ink-900">Rentra reviews changes to</strong>{' '}
          {trustFieldSentence(listing.trustFields)}
          {venue ? ' or courts' : ''} before guests see them.
        </p>
      ) : null}

      {/* Progress rail: the same two-phase honesty as onboarding — the review
          step is visible from the first visit, so a full bar never sits next
          to a listing that is still not live. */}
      <section className="mt-5 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
          <p className="font-semibold">
            {completion.isLive
              ? 'Complete and live'
              : completion.inReview
                ? `${completion.done} of ${completion.total} submitted · in review`
                : `${completion.done} of ${completion.total} sections done`}
            {!completion.inReview && !completion.isLive && completion.minutesLeft > 0 ? (
              <span className="font-normal text-ink-500">
                {' '}
                · about {completion.minutesLeft} min left
              </span>
            ) : null}
          </p>
          <p className="text-ink-500">{completion.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-ink-100">
          <span
            className={completion.isLive || !completion.inReview ? 'bg-brand-600' : 'bg-warning'}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {completion.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${sectionAnchorId(
                  s.id === 'space' && venue ? 'venue' : (SECTION_OF_STEP[s.id] ?? s.id),
                )}`}
                className={`inline-flex items-center gap-1 text-tiny font-medium ${
                  s.failed
                    ? 'text-danger'
                    : s.done
                      ? 'text-brand-700'
                      : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {s.done ? <Check className="size-3" aria-hidden="true" /> : null}
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Offer the walkthrough while work remains — it resumes where they
          stopped. Once complete, this page is the right screen and the
          prompt disappears rather than nagging. */}
      {!completion.isLive && !completion.inReview && completion.remaining.length > 0 ? (
        <Link
          href={stepHref(id, firstIncompleteStepId(completion, listingModel(listing)))}
          className="mt-5 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 hover:border-brand-300 hover:bg-brand-100"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-600">
            <Wand2 className="size-4 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-meta font-bold text-brand-900">Finish it step by step</span>
            <span className="block text-tiny text-brand-800">
              {completion.remaining.length} left · picks up at{' '}
              {completion.remaining[0].label.toLowerCase()}
            </span>
          </span>
          <span className="shrink-0 text-tiny font-semibold text-brand-700">Continue →</span>
        </Link>
      ) : null}

      <div className="mt-5">
        <SubmitBar
          listing={listing}
          completion={completion}
          ownerApproved={user.accountStatus === 'active'}
        />
      </div>

      <ListingChrome variant="card" listing={listing}>
        <ReviewFlags
          sections={needsChanges ? (listing.reviewFlaggedFields ?? []) : []}
          reason={needsChanges ? listing.rejectionReason : null}
        >
          <div className="mt-6 space-y-5">
            <BasicsSection listing={listing} categories={categories} />
            <LocationSection listing={listing} cities={cities} />
            {venue ? (
              <VenueSection listing={listing} resources={resources} activities={categories} />
            ) : (
              <CapacitySection listing={listing} />
            )}
            <AmenitiesSection listing={listing} catalogue={catalogue} selected={amenities} />
            {venue ? <HoursSection listing={listing} calendar={calendar} /> : null}
            <RulesSection listing={listing} />
            {venue ? (
              <HourlyPricingSection
                listing={listing}
                hourlyRates={hourlyRates}
                resources={resources}
                activities={categories}
              />
            ) : (
              <PricingSection listing={listing} prices={prices} />
            )}
            <TermsSection listing={listing} />
            <PhotosSection listing={listing} photos={photos} />
            <OwnershipSection
              listing={listing}
              documents={documents}
              clientType={user.clientType}
              kycName={user.name}
            />
          </div>
        </ReviewFlags>
      </ListingChrome>
    </div>
  );
}
