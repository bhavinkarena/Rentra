import { EmptyState } from '@/components/ui/empty-state';
import InlineAlert from '@/components/portal/InlineAlert';
import Link from '@/components/navigation/NavigationLink';
import { CircleAlert, CircleCheck, Eye } from 'lucide-react';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { firstIncompleteStepId, listingModel, stepHref } from '@/lib/domain/listing-steps';
import PortalState from '@/components/portal/PortalState';
import RetryButton from '@/components/portal/RetryButton';
import { MetricStrip, SectionCard } from '@/components/portal/DetailLayout';
import PropertyHub from '@/components/partner/property/PropertyHub';
import SubmitForReview from '@/components/partner/property/SubmitForReview';

export const metadata = {
  title: 'Property overview',
  robots: { index: false, follow: false, nocache: true },
};

/** The field a Fix link focuses on each wizard step (PROP-02); unknown → first field. */
const FIX_FIELD = {
  type: 'categoryId',
  location: 'cityId',
  space: 'capacity',
  story: 'title',
  pricing: 'day_weekday',
  rules: 'checkInFrom',
  ownership: 'docType',
};
const STEP_LABEL = {
  type: 'type',
  location: 'location',
  space: 'space',
  amenities: 'amenities',
  photos: 'photos',
  story: 'title and description',
  pricing: 'pricing',
  availability: 'availability',
  rules: 'rules and cancellation',
  ownership: 'ownership proof',
};
const ist = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
      })
    : null;
const day = (value) => (value ? ist(`${value}T12:00:00+05:30`) : '—');

/** Draft → In review → Verification → Live, with the date each stage last happened. */
function Timeline({ listing, timeline }) {
  const at = {
    draft: 0,
    rejected: 0,
    pending_review: 1,
    pending_verification: 2,
    live: 3,
    paused: 3,
    hidden: 3,
  }[listing.status];
  const stages = [
    ['Draft', timeline?.draft],
    ['In review', timeline?.submitted],
    ['Verification', timeline?.visit ?? timeline?.approved],
    ['Live', timeline?.live],
  ];
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Property progress">
      {stages.map(([label, date], index) => {
        const done = index < at || (index === at && index === 3);
        const current = index === at && index !== 3;
        return (
          <li key={label} className="min-w-0">
            <span
              aria-hidden="true"
              className={`block h-1.5 rounded-full ${done ? 'bg-brand-600' : current ? 'bg-warning' : 'bg-ink-100'}`}
            />
            <p
              className={`mt-2 text-tiny font-semibold ${done || current ? 'text-ink-900' : 'text-ink-500'}`}
            >
              {label}
              <span className="sr-only">
                {done ? ' — done' : current ? ' — current stage' : ' — not yet'}
              </span>
            </p>
            {date && index <= at ? <p className="text-tiny text-ink-500">{ist(date)}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** One sentence and at most one button: what happens now, and the next thing to do. */
function NextStep({ listing, completion, overview, ownerApproved, keep }) {
  const id = listing.id;
  const btn =
    'inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover';
  const flags = listing.reviewFlags ?? [];
  const sentBack =
    ['draft', 'rejected'].includes(listing.status) &&
    ['changes_requested', 'rejected'].includes(listing.reviewOutcome);
  if (sentBack && flags.length) {
    const first = flags[0];
    return (
      <>
        <p className="text-body text-ink-800">
          Rentra asked for {flags.length} change{flags.length === 1 ? '' : 's'}:{' '}
          {flags.map((flag) => STEP_LABEL[flag.step] ?? flag.step).join('; ')}.
          {listing.rejectionReason ? ` “${listing.rejectionReason}”` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${stepHref(id, first.step)}#field-${FIX_FIELD[first.step] ?? 'first'}`}
            className={btn}
          >
            Fix now
          </Link>
          {completion.canSubmit ? (
            <SubmitForReview listing={listing} ownerApproved={ownerApproved} label="Submit again" />
          ) : null}
        </div>
        {flags.length > 1 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Sections to correct">
            {flags.map((flag) => (
              <li key={flag.section}>
                <Link
                  href={`${stepHref(id, flag.step)}#field-${FIX_FIELD[flag.step] ?? 'first'}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-warning/30 bg-warning-bg px-3 text-tiny font-semibold text-warning"
                >
                  <CircleAlert className="size-4" aria-hidden="true" />
                  Fix {STEP_LABEL[flag.step] ?? flag.step}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }
  if (['draft', 'rejected'].includes(listing.status)) {
    if (completion.canSubmit)
      return (
        <>
          <p className="text-body text-ink-800">
            {listing.status === 'rejected'
              ? `Rentra did not approve it${listing.rejectionReason ? `: “${listing.rejectionReason}”` : '.'} Fix it, then submit again.`
              : 'Every step is done. Submit it and Rentra checks it within 2 working days.'}
          </p>
          <SubmitForReview listing={listing} ownerApproved={ownerApproved} />
        </>
      );
    const step = firstIncompleteStepId(completion, listingModel(listing));
    return (
      <>
        <p className="text-body text-ink-800">
          {completion.remaining.length} step{completion.remaining.length === 1 ? '' : 's'} left
          before you can submit — about {completion.minutesLeft} minutes.
        </p>
        <Link href={stepHref(id, step)} className={btn}>
          Continue setup
        </Link>
      </>
    );
  }
  if (listing.status === 'pending_review') {
    if (listing.reviewNeedsResubmission)
      return (
        <>
          <p className="text-body text-ink-800">
            You changed it after submitting. Submit again so Rentra reviews this version.
          </p>
          <SubmitForReview listing={listing} ownerApproved={ownerApproved} label="Submit again" />
        </>
      );
    return (
      <p className="text-body text-ink-800">
        Rentra is reviewing it, usually within 2 working days. Nothing to do until then.
      </p>
    );
  }
  if (listing.status === 'pending_verification') {
    const visit = listing.reviewVerification;
    return (
      <p className="text-body text-ink-800">
        {visit
          ? `${visit.mode === 'physical' ? 'Site visit' : 'Video call'} on ${new Date(visit.scheduledAt).toLocaleString('en-IN', { timeZone: visit.timeZone, dateStyle: 'medium', timeStyle: 'short' })}. Rentra publishes it after the check.`
          : 'Approved. Rentra will arrange a short video call or site visit with you.'}
      </p>
    );
  }
  if (listing.status === 'hidden') {
    const reason = listing.restriction?.reason ?? listing.restrictionReason;
    return (
      <>
        <p className="text-body text-ink-800">
          Rentra has hidden it{reason ? `: “${reason}”` : ''}. Only Rentra can restore it.
        </p>
        <Link href={`/partner/support/new?propertyId=${id}`} className={btn}>
          Contact support
        </Link>
      </>
    );
  }
  const inventory = overview?.inventory;
  if (listing.status === 'live' && inventory && !inventory.bookable)
    return (
      <>
        <p className="text-body text-ink-800">Live, no open dates — guests can&apos;t book yet.</p>
        <Link href={`/partner/listings/${id}/calendar${keep}`} className={btn}>
          Open calendar
        </Link>
      </>
    );
  if (listing.status === 'live')
    return (
      <>
        <p className="text-body text-ink-800">
          Guests can book it
          {inventory?.nextOpenDate ? `. Next open date: ${day(inventory.nextOpenDate)}` : ''}.
        </p>
        <Link href={`/partner/listings/${id}/calendar${keep}`} className={btn}>
          Open calendar
        </Link>
      </>
    );
  return (
    <p className="text-body text-ink-800">Guests can&apos;t book new dates while it is paused.</p>
  );
}

/** Where each strength item is fixed. */
function strengthHref(target, id, keep) {
  return {
    photos: `/partner/listings/${id}/photos${keep}`,
    story: `/partner/listings/${id}${keep}#section-basics`,
    pricing: `/partner/listings/${id}${keep}#section-pricing`,
    calendar: `/partner/listings/${id}/calendar${keep}`,
    reviews: `/partner/listings/${id}/reviews${keep}`,
    team: '/partner/team',
  }[target];
}

function Strength({ strength, id, keep }) {
  const angle = Math.round((strength.percent / 100) * 360);
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div
        role="img"
        aria-label={`Property strength ${strength.percent}%`}
        className="grid size-24 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-brand-600) ${angle}deg, var(--color-ink-100) 0)`,
        }}
      >
        <span className="grid size-18 place-items-center rounded-full bg-card text-h4 font-bold tabular">
          {strength.percent}%
        </span>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {strength.items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-meta">
            {item.done ? (
              <CircleCheck className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
            ) : (
              <span
                className="size-4 shrink-0 rounded-full border-2 border-ink-300"
                aria-hidden="true"
              />
            )}
            {item.done ? (
              <span className="text-ink-600">
                {item.label}
                <span className="sr-only"> — done</span>
              </span>
            ) : (
              <Link
                href={strengthHref(item.target, id, keep)}
                className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The property hub's default tab (PROP-01, PROP-06, PROP-08). */
export default async function PropertyOverviewPage({ params, searchParams }) {
  const user = await requireClient();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/partner/listings');
  const keep = listHref === '/partner/listings' ? '' : `?from=${encodeURIComponent(listHref)}`;

  const [{ data, failure }, ops] = await Promise.all([
    settle(partnerApi.listing(id)),
    settle(partnerApi.overview(id)),
  ]);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;

  const { listing, photos } = data;
  const completion = listingCompletion(listing);
  const overview = ops.data;
  const published = ['live', 'paused'].includes(listing.status);
  const ownerApproved = user.accountStatus === 'active';
  const visits = overview?.upcomingVisits.items.slice(0, 3) ?? [];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <PropertyHub
        listing={listing}
        photos={photos}
        active="overview"
        listHref={listHref}
        publicPath={overview?.publicPath}
        upcoming={overview?.upcomingVisits.total ?? 0}
        pausedUntil={overview?.pausedUntil}
        ownerApproved={ownerApproved}
      />

      {ops.failure ? (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-meta text-danger"
        >
          <p>Bookability, visits and strength could not load. The property itself is unchanged.</p>
          <RetryButton label="Try again" />
        </div>
      ) : null}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <SectionCard id="status" title="Status">
            <div className="space-y-4">
              <Timeline listing={listing} timeline={overview?.timeline} />
              <NextStep
                listing={listing}
                completion={completion}
                overview={overview}
                ownerApproved={ownerApproved}
                keep={keep}
              />
            </div>
          </SectionCard>

          {published && overview ? (
            <MetricStrip
              label="This property at a glance"
              items={[
                { label: 'Bookings this month', value: overview.stats.bookingsThisMonth },
                {
                  label: 'Rating',
                  value: overview.stats.rating ? overview.stats.rating.toFixed(1) : '—',
                  hint: overview.stats.reviewCount
                    ? `${overview.stats.reviewCount} review${overview.stats.reviewCount === 1 ? '' : 's'}`
                    : 'No reviews yet',
                },
                { label: 'Upcoming visits', value: overview.upcomingVisits.total },
                {
                  label: 'Open dates',
                  value:
                    listing.rentalUnit === 'hour' ? 'Weekly hours' : overview.inventory.openDates,
                },
              ]}
            />
          ) : null}

          <SectionCard
            id="visits"
            title="Next visits"
            description="Confirmed visits keep the terms the guest accepted, whatever you edit."
            flush
          >
            {visits.length ? (
              <ul className="divide-y divide-border">
                {visits.map((visit) => (
                  <li
                    key={visit.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <div className="min-w-0 text-meta">
                      <p className="font-semibold text-ink-900">
                        {visit.slot === 'hourly'
                          ? visit.label
                          : `${day(visit.date)} · ${visit.slot.replaceAll('_', ' ')}`}
                      </p>
                      <p className="text-tiny text-ink-500">
                        {visit.reference} · {visit.guests}{' '}
                        {visit.slot === 'hourly' ? 'player(s)' : 'guest(s)'}
                      </p>
                    </div>
                    {visit.orderId ? (
                      <Link
                        href={`/partner/bookings/${visit.orderId}`}
                        className="inline-flex min-h-11 items-center text-tiny font-semibold text-brand-700 underline"
                      >
                        Open booking<span className="sr-only"> {visit.reference}</span>
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : overview ? (
              <EmptyState
                variant="compact"
                title="No upcoming visits"
                description="Keep your calendar open and prices current to get booked."
              />
            ) : (
              <InlineAlert action={<RetryButton />}>
                This section could not load. Try again.
              </InlineAlert>
            )}
            {overview && overview.upcomingVisits.total > visits.length ? (
              <p className="border-t border-border px-5 py-3 text-tiny text-ink-500">
                Showing the next {visits.length} of {overview.upcomingVisits.total}.{' '}
                <Link
                  href={`/partner/bookings?property=${id}`}
                  className="font-semibold text-brand-700 underline"
                >
                  All bookings
                </Link>
              </p>
            ) : null}
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-5">
          {published && overview ? (
            <SectionCard
              id="strength"
              title="Property strength"
              description="Things guests look for. Each one links to where you add it."
            >
              <Strength strength={overview.strength} id={id} keep={keep} />
            </SectionCard>
          ) : null}
          <SectionCard
            id="guest-view"
            title="What guests see"
            description="Your saved property, exactly as the public page shows it."
          >
            <Link
              href={`/partner/listings/${id}/preview`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-ink-50"
            >
              <Eye className="size-4" aria-hidden="true" /> Preview as a guest
            </Link>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
