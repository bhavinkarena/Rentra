import PortalState from '@/components/portal/PortalState';
import { SectionCard } from '@/components/portal/DetailLayout';
import PropertyHub from '@/components/partner/property/PropertyHub';
import { PolicyHistory } from '@/components/partner/listing/PolicyPreview';
import { loadPropertyHub } from '@/lib/partner/property-hub';

export const metadata = { title: 'Property activity', robots: { index: false, follow: false } };

const ACTIVITY = {
  listing_draft_created: 'You created the draft',
  listing_submitted: 'You submitted it for review',
  listing_review_decided: 'Rentra reviewed it',
  verification_scheduled: 'Rentra scheduled a verification call or visit',
  verification_rescheduled: 'Rentra moved the verification',
  verification_cancelled: 'Rentra cancelled the verification',
  verification_recorded: 'Verification finished',
  listing_published: 'Rentra published it',
  listing_hidden: 'Rentra hid it',
  listing_restored: 'Rentra restored it',
  listing_corrected: 'Rentra corrected it',
  listing_paused: 'You paused bookings',
  listing_resumed: 'Bookings resumed',
  listing_photos_added: 'You added photos',
  listing_photos_reordered: 'You reordered photos',
  ownership_document_uploaded: 'You uploaded ownership proof',
  calendar_dates_added: 'You opened calendar dates',
  booking_price_override_changed: 'You changed a date price',
};
const OUTCOME = {
  changes_requested: 'changes requested',
  rejected: 'not approved',
  approved_for_visit: 'approved for verification',
  passed: 'passed',
  failed: 'did not pass',
  no_show: 'missed',
};
const ist = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Review history, edits and policy changes, newest first (Phase 6 §6.1). */
export default async function PropertyActivityPage(props) {
  const { failure, data, overview, hub, listHref } = await loadPropertyHub(props);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;
  return (
    <div className="mx-auto w-full max-w-300 px-4 py-6 sm:px-6 sm:py-8">
      <PropertyHub {...hub} active="activity" />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
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
        <SectionCard id="policy" title="Prices and policies">
          <PolicyHistory listing={data.listing} />
        </SectionCard>
      </div>
    </div>
  );
}
