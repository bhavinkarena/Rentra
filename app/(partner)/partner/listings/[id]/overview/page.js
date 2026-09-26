import Link from 'next/link';
import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Images,
  PencilLine,
  Users,
  Wand2,
} from 'lucide-react';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import { listingCompletion } from '@/lib/domain/listing-completion';
import { firstIncompleteStepId, sectionAnchorId, stepHref } from '@/lib/domain/listing-steps';
import { formatINR } from '@/lib/domain/pricing';
import PortalState from '@/components/portal/PortalState';
import RetryButton from '@/components/portal/RetryButton';
import {
  DetailHeader,
  FieldGrid,
  MetricStrip,
  SectionCard,
} from '@/components/portal/DetailLayout';
import { listingStatusMeta } from '@/components/partner/ListingStatusBadge';
import { SubmitBar } from '@/components/partner/listing/ListingSections';
import { submitListing } from '@/lib/actions/partner';

export const metadata = {
  title: 'Property overview',
  robots: { index: false, follow: false, nocache: true },
};

const TONE = {
  live: 'success',
  pending_review: 'warning',
  pending_verification: 'warning',
  rejected: 'danger',
  hidden: 'danger',
};
const SECTION_LABEL = {
  basics: 'Basics',
  location: 'Location',
  capacity: 'Capacity',
  amenities: 'Amenities',
  rules: 'House rules',
  pricing: 'Pricing',
  terms: 'Deposit & cancellation',
  photos: 'Photos',
  ownership: 'Ownership proof',
};
const ACTIVITY = {
  listing_draft_created: 'You created the draft',
  listing_submitted: 'You submitted it for review',
  listing_review_decided: 'Rentra recorded a review decision',
  verification_scheduled: 'Rentra scheduled verification',
  verification_rescheduled: 'Rentra moved the verification',
  verification_cancelled: 'Rentra cancelled the verification',
  verification_recorded: 'Verification completed',
  listing_published: 'Rentra published it',
  listing_hidden: 'Rentra hid it',
  listing_restored: 'Rentra restored it',
  listing_corrected: 'Rentra corrected it',
  listing_paused: 'You paused bookings',
  listing_resumed: 'You resumed bookings',
  listing_photos_added: 'You added photos',
  listing_photos_reordered: 'You reordered photos',
  ownership_document_uploaded: 'You uploaded ownership proof',
  calendar_dates_added: 'You opened calendar dates',
  booking_price_override_changed: 'You changed a date price',
};
const OUTCOME = {
  changes_requested: 'changes requested',
  rejected: 'rejected',
  approved_for_visit: 'approved for verification',
  passed: 'passed',
  failed: 'did not pass',
  no_show: 'missed',
};
const ist = (value, withTime = true) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
      })
    : '—';
const day = (value) => (value ? ist(`${value}T12:00:00+05:30`, false) : '—');
const yesNo = (value) => (value ? 'Yes' : 'No');

/**
 * The property operations hub (CP09): where the owner sees what state the
 * property is in and what to do next, before opening the editor or calendar.
 * `from` keeps the filtered directory the owner came from on every link.
 */
export default async function PropertyOverviewPage({ params, searchParams }) {
  await requireActiveClient();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/partner/listings');
  const keep = `from=${encodeURIComponent(listHref)}`;

  const [{ data, failure }, ops] = await Promise.all([
    settle(partnerApi.listing(id)),
    settle(partnerApi.overview(id)),
  ]);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;

  const { listing, prices, amenities, photos, documents } = data;
  const completion = listingCompletion(listing, { prices, amenities, photos, documents });
  const title = listing.title === 'Untitled property' ? 'New property' : listing.title;
  const status = listingStatusMeta(listing.status);
  const editHref = `/partner/listings/${id}?${keep}`;
  const calendarHref = `/partner/listings/${id}/calendar?${keep}`;
  const overview = ops.data;
  const inventory = overview?.inventory;
  const needsChanges =
    ['draft', 'rejected'].includes(listing.status) &&
    ['changes_requested', 'rejected'].includes(listing.reviewOutcome);
  const flagged = needsChanges ? (listing.reviewFlaggedFields ?? []) : [];
  const rules = listing.houseRules && !Array.isArray(listing.houseRules) ? listing.houseRules : {};
  const unfinished = !completion.isLive && !completion.inReview && completion.remaining.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <DetailHeader
        breadcrumbs={[{ href: listHref, label: 'Properties' }, { label: title }]}
        title={title}
        badges={[{ label: status.label, tone: TONE[listing.status] ?? 'neutral' }]}
        id={
          listing.publicCode
            ? { label: 'Property reference', value: listing.publicCode }
            : undefined
        }
        chips={[
          { icon: Users, label: 'Up to', value: `${listing.capacity ?? '—'} guests` },
          {
            icon: CircleCheck,
            label: 'Setup',
            value: `${completion.done} of ${completion.total} sections`,
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {unfinished ? (
              <Link
                href={stepHref(id, firstIncompleteStepId(completion))}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-brand-700 px-3 text-tiny font-semibold text-white hover:bg-brand-800"
              >
                <Wand2 className="size-4" aria-hidden="true" /> Continue setup
              </Link>
            ) : null}
            <Link
              href={editHref}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
            >
              <PencilLine className="size-4" aria-hidden="true" /> Edit property
            </Link>
            <Link
              href={calendarHref}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
            >
              <CalendarDays className="size-4" aria-hidden="true" /> Booking calendar
            </Link>
            {overview?.publicPath ? (
              <Link
                href={overview.publicPath}
                target="_blank"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Public page
                <span className="sr-only">(opens in a new tab)</span>
              </Link>
            ) : null}
          </div>
        }
      />

      <MetricStrip
        items={[
          { label: 'Status', value: status.label, hint: status.hint },
          {
            label: 'Bookable now',
            value: inventory ? yesNo(inventory.bookable) : '—',
            hint: inventory
              ? inventory.bookable
                ? 'Guests can book open dates'
                : 'See what is missing below'
              : 'Unavailable',
            tone: inventory?.bookable ? 'success' : 'warning',
          },
          {
            label: 'Open dates',
            value: inventory ? inventory.openDates : '—',
            hint: 'Future dates on the calendar',
          },
          {
            label: 'Upcoming visits',
            value: overview ? overview.upcomingVisits.total : '—',
            hint: 'Confirmed or in progress',
          },
          { label: 'Photos', value: photos.length, hint: 'First photo is the cover' },
          {
            label: 'Setup',
            value: `${completion.done}/${completion.total}`,
            hint: completion.remaining.length ? `${completion.remaining.length} left` : 'Complete',
            tone: completion.remaining.length ? 'warning' : 'success',
          },
        ]}
      />

      {ops.failure ? (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-meta text-danger"
        >
          <p>Bookability, visits and activity could not load. The property itself is unchanged.</p>
          <RetryButton label="Try again" />
        </div>
      ) : null}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            id="status"
            title="Status and next step"
            description="What is happening now and what you can do."
          >
            <SubmitBar listing={listing} completion={completion} submitAction={submitListing} />
          </SectionCard>

          {needsChanges ? (
            <SectionCard
              id="corrections"
              title="Changes Rentra asked for"
              description="Fix these sections in the editor, then submit again."
            >
              {listing.rejectionReason ? (
                <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
                  {listing.rejectionReason}
                </p>
              ) : null}
              {flagged.length ? (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Sections to correct">
                  {flagged.map((section) => (
                    <li key={section}>
                      <Link
                        href={`${editHref}#${sectionAnchorId(section)}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-3 text-tiny font-semibold text-amber-800 hover:bg-amber-200"
                      >
                        <CircleAlert className="size-4" aria-hidden="true" />
                        Correct {SECTION_LABEL[section] ?? section}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard
            id="bookability"
            title="Bookability"
            description="Live means guests can see it. Bookable also needs confirmed hours and open dates."
            action={
              <Link
                href={calendarHref}
                className="text-tiny font-semibold text-brand-700 underline"
              >
                Open calendar
              </Link>
            }
          >
            {inventory ? (
              <>
                <FieldGrid
                  fields={[
                    { label: 'Live on Rentra', value: yesNo(listing.status === 'live') },
                    { label: 'Booking hours confirmed', value: yesNo(inventory.scheduleReady) },
                    { label: 'Open future dates', value: String(inventory.openDates) },
                    { label: 'Next open date', value: day(inventory.nextOpenDate) },
                  ]}
                />
                <p
                  className={`mt-4 rounded-md p-3 text-meta ${inventory.bookable && listing.status === 'live' ? 'bg-success-bg text-brand-900' : 'bg-warning-bg text-amber-900'}`}
                >
                  {listing.status === 'live'
                    ? inventory.note
                    : `Not bookable: the property is ${status.label.toLowerCase()}. ${inventory.note}`}
                </p>
              </>
            ) : (
              <p className="text-meta text-ink-600">Bookability is unavailable right now.</p>
            )}
          </SectionCard>

          <SectionCard
            id="visits"
            title="Upcoming visits"
            description="Confirmed visits keep the terms the guest accepted, whatever you edit."
            flush
          >
            {overview?.upcomingVisits.items.length ? (
              <ul className="divide-y divide-border">
                {overview.upcomingVisits.items.map((visit) => (
                  <li
                    key={visit.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <div className="min-w-0 text-meta">
                      <p className="font-semibold text-ink-900">
                        {day(visit.date)} · {visit.slot.replaceAll('_', ' ')}
                      </p>
                      <p className="text-tiny text-ink-500">
                        {visit.reference} · {visit.guests} guest(s) ·{' '}
                        {visit.state.replaceAll('_', ' ')}
                        {visit.startsAt ? ` · arrives ${ist(visit.startsAt)} IST` : ''}
                      </p>
                    </div>
                    {visit.orderId ? (
                      <Link
                        href={`/partner/bookings/${visit.orderId}`}
                        className="text-tiny font-semibold text-brand-700 underline"
                      >
                        Open booking<span className="sr-only"> {visit.reference}</span>
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-meta text-ink-600">
                {overview ? 'No upcoming visits.' : 'Visits are unavailable right now.'}
              </p>
            )}
            {overview && overview.upcomingVisits.total > overview.upcomingVisits.items.length ? (
              <p className="border-t border-border px-5 py-3 text-tiny text-ink-500">
                Showing the next {overview.upcomingVisits.items.length} of{' '}
                {overview.upcomingVisits.total}.{' '}
                <Link href="/partner/bookings" className="font-semibold text-brand-700 underline">
                  All bookings
                </Link>
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            id="content"
            title="What guests see"
            description="A summary of the saved property. Change it in the editor."
            action={
              <Link href={editHref} className="text-tiny font-semibold text-brand-700 underline">
                Edit property
              </Link>
            }
          >
            <FieldGrid
              fields={[
                {
                  label: 'Prices (weekday / weekend)',
                  value: prices.length
                    ? prices
                        .map(
                          (p) =>
                            `${p.slot.replaceAll('_', ' ')} ${formatINR(p.weekday)} / ${formatINR(p.weekend)}`,
                        )
                        .join(' · ')
                    : 'Not set',
                },
                {
                  label: 'Check-in window',
                  value:
                    listing.checkInFrom && listing.checkOutBy
                      ? `${listing.checkInFrom} to ${listing.checkOutBy}`
                      : 'Not set',
                },
                {
                  label: 'House rules',
                  value:
                    [
                      rules.petsAllowed ? 'Pets allowed' : 'No pets',
                      rules.alcoholAllowed ? 'Alcohol allowed' : 'No alcohol',
                      rules.musicCutoff ? `Music until ${rules.musicCutoff}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Not set',
                },
                {
                  label: 'Amenities',
                  value: amenities.length
                    ? amenities.map((a) => a.labelEn).join(', ')
                    : 'None selected',
                },
                {
                  label: 'Photos',
                  value: `${photos.length} uploaded`,
                },
                {
                  label: 'Deposit',
                  value: listing.depositAmount ? formatINR(listing.depositAmount) : 'None',
                },
              ]}
            />
            <p className="mt-4 flex items-center gap-1.5 text-tiny text-ink-500">
              <Images className="size-4" aria-hidden="true" />
              Photo previews appear on the public page once it is live.
            </p>
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-5">
          <SectionCard id="setup" title="Setup">
            <ul className="space-y-2 text-meta">
              {completion.sections.map((section) => (
                <li key={section.id} className="flex items-start gap-2">
                  {flagged.includes(section.id) || section.failed ? (
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0 text-danger"
                      aria-hidden="true"
                    />
                  ) : section.done ? (
                    <CircleCheck
                      className="mt-0.5 size-4 shrink-0 text-brand-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="mt-1 size-3 shrink-0 rounded-full border border-ink-300"
                      aria-hidden="true"
                    />
                  )}
                  <Link
                    href={`${editHref}#${sectionAnchorId(section.id)}`}
                    className="hover:underline"
                  >
                    {section.label}
                    <span className="sr-only">
                      {flagged.includes(section.id) || section.failed
                        ? ': needs changes'
                        : section.done
                          ? ': complete'
                          : ': not done'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="activity" title="Activity" description="Newest first.">
            {overview?.activity.length ? (
              <ol className="space-y-3">
                {overview.activity.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-border pl-3 text-meta">
                    <p className="font-semibold text-ink-900">
                      {ACTIVITY[entry.action] ?? entry.action.replaceAll('_', ' ')}
                      {entry.outcome ? `: ${OUTCOME[entry.outcome] ?? entry.outcome}` : ''}
                    </p>
                    <p className="text-tiny text-ink-500">{ist(entry.at)} IST</p>
                    {entry.fields?.length ? (
                      <p className="text-tiny text-ink-600">Changed: {entry.fields.join(', ')}</p>
                    ) : null}
                    {entry.reason ? <p className="mt-1 text-tiny">{entry.reason}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-meta text-ink-600">
                {overview ? 'No activity yet.' : 'Activity is unavailable right now.'}
              </p>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
