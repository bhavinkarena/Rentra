import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { requireActiveClient } from '@/lib/auth/dal';
import { getListingForEdit, getAmenityCatalogue, getCategories, getCitiesWithAreas } from '@/lib/db/listing-queries';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { submitListing } from '@/lib/auth/listings';
import {
  BasicsSection, LocationSection, CapacitySection, AmenitiesSection,
  RulesSection, PricingSection, TermsSection, PhotosSection,
  OwnershipSection, SubmitBar,
} from '@/components/partner/listing/ListingSections';

export const metadata = {
  title: 'Edit property',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The listing builder — nine sections on one page, each saving independently.
 *
 * The flow doc specifies nine separate step routes. One page instead, because
 * editing a LIVE listing needs exactly this screen: nine routes would mean
 * building the same thing twice, and a Client with three farmhouses spends far
 * more time editing than creating. The progress rail gives the same
 * "short steps, nothing lost" feel.
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

      <div className="mt-5">
        <SubmitBar listing={listing} completion={completion} submitAction={submitListing} />
      </div>

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
    </div>
  );
}
