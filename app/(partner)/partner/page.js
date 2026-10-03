import OwnerTable from '@/components/partner/OwnerTable';
import { normalizeBookings } from '@/lib/partner/query-args';
import PortalPage from '@/components/portal/PortalPage';
import { EmptyState } from '@/components/ui/empty-state';
import OwnerToday from '@/components/partner/OwnerToday';
import OwnerHelpHeader from '@/components/partner/OwnerHelpHeader';
import Link from '@/components/navigation/NavigationLink';
import { Bell } from 'lucide-react';
import { requireClient, getCurrentUserWithCompletion } from '@/lib/api/session';
import { verificationOutcome } from '@/lib/domain/owner-onboarding';
import OwnerApprovalNotice from '@/components/partner/OwnerApprovalNotice';
import OwnerSetupGuide from '@/components/partner/OwnerSetupGuide';
import { lockedCtaMessage } from '@/lib/domain/profile-completion';
import { recordLockedCtaClick } from '@/lib/actions/auth';
import { withdrawApplication } from '@/lib/actions/partner';
import { partnerApi } from '@/lib/api/endpoints';
import CompletionStepper from '@/components/partner/CompletionStepper';
import GatedAddPlaceButton from '@/components/partner/GatedAddPlaceButton';
import ApplicationCommand from '@/components/partner/ApplicationCommand';
import PropertyTable from '@/components/partner/PropertyTable';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import RetryButton from '@/components/portal/RetryButton';
import { settle } from '@/lib/api/page-state';
import { updateTitle, updateHref } from '@/lib/domain/client-updates';

export const metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: false },
};

/**
 * The owner overview keeps identity onboarding and portfolio operations on the
 * same URL. Before approval, the next required step is dominant. Afterwards,
 * the screen becomes a dense operational dashboard backed only by real data.
 */
export default async function PartnerDashboard({ searchParams }) {
  const params = await searchParams;
  const user = await requireClient();
  /* `/auth/me` returns the completion state alongside the actor, so the
     application and the KYC list are not two further round trips. */
  const { completion } = await getCurrentUserWithCompletion();
  const locked = lockedCtaMessage(completion);
  // Independent reads start together after authorization. Approved partners
  // never render the onboarding application, so do not fetch it for them.
  const approved = completion.approved;
  const [
    summary,
    needs,
    visits,
    week,
    earnings,
    properties,
    updates,
    setup,
    records,
    portfolio,
    analytics,
  ] = await Promise.all([
    !approved ? settle(partnerApi.summary()) : null,
    ...['needsYou', 'visits', 'week', 'earnings', 'properties'].map((section) =>
      approved ? settle(partnerApi.today({ section })) : null,
    ),
    settle(partnerApi.updates({ page: 1 })),
    approved ? settle(partnerApi.setupGuide()) : null,
    approved
      ? settle(partnerApi.records(normalizeBookings({ ...params, tab: params.tab || 'all' })))
      : null,
    approved ? settle(partnerApi.summary()) : null,
    approved ? settle(partnerApi.today({ section: 'analytics' })) : null,
  ]);

  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <PortalPage>
      <div id="owner-today-card">
        <PartnerPageHeader
          eyebrow={completion.approved ? 'Verified owner' : 'Getting set up'}
          title={approved ? 'Dashboard' : 'Get verified'}
          description={
            approved
              ? `Hello${firstName ? `, ${firstName}` : ''}. Your visits and next actions, all in IST.`
              : 'Finish verification to publish. You can start a property draft now.'
          }
          action={
            <GatedAddPlaceButton
              unlocked={user.capabilities?.includes('client.listings.write')}
              message={locked}
              onLockedClick={recordLockedCtaClick}
            />
          }
        />
      </div>
      {params?.submitted ? (
        <p role="status" className="mt-4 rounded-md bg-brand-50 p-4 text-brand-900">
          Verification submitted. Check back here for the decision.
        </p>
      ) : null}
      {params?.locked === 'in_review' ? (
        <p role="status" className="mt-4 rounded-md bg-warning-bg p-4">
          Your application is read-only while Rentra reviews it. Withdraw to edit.
        </p>
      ) : null}
      {completion.approved ? (
        <>
          {!user.ownerGuide?.approvalSeenAt ? <OwnerApprovalNotice /> : null}
          {setup?.failure ? (
            <div role="alert" className="mt-5 rounded-md border border-danger/30 p-4">
              Setup guide could not load. <RetryButton label="Try again" />
            </div>
          ) : setup?.data ? (
            <OwnerSetupGuide guide={setup.data} expanded={!properties?.data?.length} />
          ) : null}
          <OwnerToday
            analytics={analytics}
            records={records}
            portfolio={portfolio}
            filters={params}
            needs={needs}
            visits={visits}
            week={week}
            earnings={earnings}
            properties={properties}
          />
          <div className="mt-5">
            <LatestUpdates updates={updates} />
          </div>
        </>
      ) : (
        <>
          <OnboardingDashboard completion={completion} />
          {summary?.data?.total > 0 ? (
            <div className="mt-5">
              <PropertyTable listings={summary.data.recent} compact />
            </div>
          ) : null}
          <div className="mt-5 max-w-[720px]">
            <OwnerHelpHeader tabs={false} />
          </div>
          {updates?.failure || updates?.data?.items?.length ? (
            <div className="mt-5 max-w-[720px]">
              <LatestUpdates updates={updates} />
            </div>
          ) : null}
          {summary?.failure ? (
            <p role="alert" className="mt-5 text-danger">
              Property drafts could not load. <RetryButton />
            </p>
          ) : null}
        </>
      )}
    </PortalPage>
  );
}

function LatestUpdates({ updates }) {
  const data = updates?.data;
  return (
    <section
      aria-labelledby="latest-updates-title"
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="latest-updates-title"
          className="flex items-center gap-2 text-h4 font-bold text-ink-900"
        >
          <Bell className="size-4" aria-hidden="true" /> Latest updates
        </h2>
        <Link href="/partner/updates" className="text-tiny font-semibold text-brand-700 underline">
          {data?.unread ? `${data.unread} unread` : 'All updates'}
        </Link>
      </div>
      {updates?.failure ? (
        <div className="mt-2">
          <p role="alert" className="text-meta text-danger">
            Updates could not load.
          </p>
          <div className="mt-2">
            <RetryButton label="Try again" />
          </div>
        </div>
      ) : data?.items.length ? (
        <OwnerTable
          label="Latest updates"
          columns={['Update', 'Context', 'Received', 'Status', 'Action']}
        >
          {data.items.slice(0, 5).map((update) => (
            <tr key={update.id}>
              <td className="font-semibold">{updateTitle(update)}</td>
              <td>{update.propertyTitle ?? update.detail?.reference ?? 'Account'}</td>
              <td className="whitespace-nowrap">
                {new Date(update.createdAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                IST
              </td>
              <td>{update.read ? 'Read' : 'Unread'}</td>
              <td>
                <Link
                  className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800"
                  href={updateHref(update)}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </OwnerTable>
      ) : (
        <EmptyState
          variant="compact"
          title="You're all caught up"
          description="Bookings, review results and Rentra messages appear here."
        />
      )}
    </section>
  );
}

function OnboardingDashboard({ completion }) {
  const outcome = verificationOutcome(completion);
  return (
    <section className="mt-7 max-w-[720px] space-y-4">
      {outcome ? (
        <div
          className={`rounded-lg border p-5 ${completion.submitted ? 'border-warning/30 bg-warning-bg' : 'border-danger/30 bg-danger-bg'}`}
        >
          <h2 className="text-h3">{outcome.title}</h2>
          <p className="mt-2 text-meta text-ink-700">{outcome.body}</p>
          {outcome.href ? (
            <Link
              href={outcome.href}
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700"
            >
              {outcome.action}
            </Link>
          ) : null}
          {completion.submitted ? (
            <ApplicationCommand
              confirm
              action={withdrawApplication}
              pendingLabel="Withdrawing…"
              className="mt-3 min-h-11 font-semibold text-brand-700 underline"
            >
              Withdraw to edit
            </ApplicationCommand>
          ) : null}
          {completion.status === 'rejected' ? (
            <Link
              href="/partner/help/requests"
              className="ml-5 inline-flex min-h-11 items-center text-brand-700 underline"
            >
              Contact support
            </Link>
          ) : null}
        </div>
      ) : null}
      <CompletionStepper completion={completion} />
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-h3">What you’ll need</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-meta text-ink-600">
          <li>A PAN, driving licence, or masked Aadhaar photo or PDF</li>
          <li>Your mobile for a verification code</li>
          <li>Your UPI ID or bank details</li>
          <li>An ownership document and six property photos for your draft</li>
        </ul>
        <Link
          href="/partner/listings/new"
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
        >
          Start your property draft
        </Link>
      </div>
      {!completion.submitted ? (
        <Link
          href={
            completion.canSubmit
              ? '/partner/onboarding/review'
              : (completion.remaining[0]?.href ?? '/partner/onboarding/review')
          }
          className="flex min-h-12 items-center justify-center rounded-md bg-primary px-4 py-3 font-semibold text-white"
        >
          {completion.canSubmit ? 'Review and submit' : 'Continue verification'}
        </Link>
      ) : null}
      <p className="text-meta text-ink-600">
        You can draft your property while Rentra reviews your account. Publishing opens after
        approval.
      </p>
    </section>
  );
}
