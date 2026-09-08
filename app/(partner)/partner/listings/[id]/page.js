import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, Wand2 } from 'lucide-react';
import { requireActiveClient } from '@/lib/auth/dal';
import { getListingForEdit, getAmenityCatalogue, getCategories, getCitiesWithAreas } from '@/lib/db/listing-queries';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { submitListing } from '@/lib/auth/listings';
import {
  BasicsSection, LocationSection, CapacitySection, AmenitiesSection,
  RulesSection, PricingSection, TermsSection, PhotosSection,
  OwnershipSection, SubmitBar,
} from '@/components/partner/listing/ListingSections';
import { ListingChrome } from '@/components/partner/listing/chrome';
import { firstIncompleteStepId, stepHref } from '@/lib/domain/listing-steps';

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
export default async function ListingBuilderPage({ params }) {
  const user = await requireActiveClient();
  const { id } = await params; // Next 16: params is a Promise

  // Scoped by clientId — another Client's listing id returns null, not their
  // property.
  const data = await getListingForEdit(id, user.id);
  if (!data) notFound();

  const [catalogue, categories, cities] = await Promise.all([
    getAmenityCatalogue(),
    getCategories(),
    getCitiesWithAreas(),
  ]);

  const { listing, prices, amenities, photos, documents } = data;
  const completion = listingCompletion(listing, { prices, amenities, photos, documents });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/partner/listings"
        className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All properties
      </Link>

      <h1 className="mt-5 text-h1">
        {listing.title === 'Untitled property' ? 'New property' : listing.title}
      </h1>

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
              <span className="font-normal text-ink-500"> · about {completion.minutesLeft} min left</span>
            ) : null}
          </p>
          <p className="text-ink-500">{completion.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-ink-100">
          <span
            className={completion.isLive || !completion.inReview ? 'bg-brand-600' : 'bg-amber-500'}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {completion.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`inline-flex items-center gap-1 text-tiny font-medium ${
                  s.failed ? 'text-danger' : s.done ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900'
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
          href={stepHref(id, firstIncompleteStepId(completion))}
          className="mt-5 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 hover:border-brand-300 hover:bg-brand-100"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-600">
            <Wand2 className="size-4 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-meta font-bold text-brand-900">
              Finish it step by step
            </span>
            <span className="block text-tiny text-brand-800">
              {completion.remaining.length} left · picks up at{' '}
              {completion.remaining[0].label.toLowerCase()}
            </span>
          </span>
          <span className="shrink-0 text-tiny font-semibold text-brand-700">Continue →</span>
        </Link>
      ) : null}

      <div className="mt-5">
        <SubmitBar listing={listing} completion={completion} submitAction={submitListing} />
      </div>

      <ListingChrome variant="card">
        <div className="mt-6 space-y-5">
        <BasicsSection listing={listing} categories={categories} />
        <LocationSection listing={listing} cities={cities} />
        <CapacitySection listing={listing} />
        <AmenitiesSection listing={listing} catalogue={catalogue} selected={amenities} />
        <RulesSection listing={listing} />
        <PricingSection listing={listing} prices={prices} />
        <TermsSection listing={listing} />
        <PhotosSection listing={listing} photos={photos} />
        <OwnershipSection
          listing={listing}
          documents={documents}
          clientType={user.clientType}
          kycName={user.name}
        />
        </div>
      </ListingChrome>
    </div>
  );
}
