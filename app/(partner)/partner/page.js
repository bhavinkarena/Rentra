import Link from '@/components/navigation/NavigationLink';
import { ArrowRight, Bell, Building2, CircleAlert, Clock3, Eye, ShieldCheck } from 'lucide-react';
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
import { KpiCard, PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import RetryButton from '@/components/portal/RetryButton';
import { settle } from '@/lib/api/page-state';
import { updateTitle, visibleTasks } from '@/lib/domain/client-updates';

export const metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: false },
};

const EMPTY_SUMMARY = {
  total: 0,
  live: 0,
  inReview: 0,
  attention: 0,
  counts: {},
  recent: [],
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
  const [summary, tasks, updates, setup] = await Promise.all([
    user.capabilities?.includes('client.listings.read') ? partnerApi.summary() : EMPTY_SUMMARY,
    completion.approved ? settle(partnerApi.tasks()) : null,
    settle(partnerApi.updates({ page: 1 })),
    completion.approved ? settle(partnerApi.setupGuide()) : null,
  ]);

  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div id="owner-today-card">
        <PartnerPageHeader
          eyebrow={completion.approved ? 'Verified owner' : 'Getting set up'}
          title={firstName ? `Welcome back, ${firstName}` : 'Welcome to Rentra'}
          description={
            completion.approved
              ? summary.total > 0
                ? `Here’s a clear view of all ${summary.total} ${summary.total === 1 ? 'property' : 'properties'} in your Rentra portfolio.`
                : 'Your partner account is ready. Add your first property to start building your portfolio.'
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
            <OwnerSetupGuide guide={setup.data} />
          ) : null}
          {summary.total > 0 ? (
            <ApprovedDashboard summary={summary} tasks={tasks} updates={updates} />
          ) : (
            <p className="mt-5 text-body text-ink-600">
              Your account is verified. Add your first property to start getting ready for bookings.
            </p>
          )}
        </>
      ) : (
        <>
          <OnboardingDashboard completion={completion} />
          {summary.total > 0 ? (
            <div className="mt-5">
              <PropertyTable listings={summary.recent} compact />
            </div>
          ) : null}
          <div className="mt-5 max-w-[720px]">
            <LatestUpdates updates={updates} />
          </div>
        </>
      )}
    </div>
  );
}

function ApprovedDashboard({ summary, tasks, updates }) {
  return (
    <>
      <section
        className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Portfolio summary"
      >
        <KpiCard
          label="Total properties"
          value={summary.total}
          hint="Across your complete portfolio"
          icon={Building2}
        />
        <KpiCard
          label="Live listings"
          value={summary.live}
          hint={`Visible to guests · ${summary.bookable ?? 0} bookable now`}
          icon={Eye}
          tone="success"
        />
        <KpiCard
          label="In review"
          value={summary.inReview}
          hint="Currently with the Rentra team"
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Needs attention"
          value={summary.attention}
          hint="Drafts or listings needing changes"
          icon={CircleAlert}
          tone={summary.attention > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Tasks tasks={tasks} />
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-h4 font-bold text-ink-900">Recent properties</h2>
                <p className="mt-0.5 text-tiny text-ink-500">
                  Most recently updated across your portfolio
                </p>
              </div>
              <Link
                href="/partner/listings"
                className="inline-flex shrink-0 items-center gap-1.5 text-tiny font-semibold text-brand-700 hover:text-brand-900"
              >
                View all <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            {(summary.verticals ?? []).length > 1 ? (
              // Owners with farmhouses and venues: jump to one kind (entertainment plan, Phase 11).
              <nav
                aria-label="Properties by kind"
                className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-5"
              >
                {summary.verticals.map((code) => (
                  <Link
                    key={code}
                    href={`/partner/listings?vertical=${code}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-tiny font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50"
                  >
                    {{ farmhouse: 'Farmhouses', entertainment: 'Venues' }[code] ?? code}
                  </Link>
                ))}
              </nav>
            ) : null}
            <PropertyTable
              listings={summary.recent}
              compact
              emptyTitle="No properties yet"
              emptyDescription="Add your first property to start your Rentra portfolio."
            />
          </div>
        </div>
        <LatestUpdates updates={updates} />
      </section>
    </>
  );
}

/**
 * Work derived from current state: required work first, then information.
 * Each count is the total of the list it opens.
 */
function Tasks({ tasks }) {
  if (tasks?.failure) {
    return (
      <section
        aria-labelledby="tasks-title"
        className="rounded-lg border border-danger/30 bg-danger-bg p-5"
      >
        <h2 id="tasks-title" className="text-h4 font-bold text-ink-900">
          Your tasks
        </h2>
        <p role="alert" className="mt-1 text-meta text-danger">
          Tasks could not load. Nothing was changed.
        </p>
        <div className="mt-3">
          <RetryButton label="Try again" />
        </div>
      </section>
    );
  }
  const list = visibleTasks(tasks?.data?.tasks);
  const required = list.filter((task) => task.kind === 'action');
  const info = list.filter((task) => task.kind === 'info');
  return (
    <section
      aria-labelledby="tasks-title"
      className="rounded-lg border border-border bg-card p-5 shadow-xs"
    >
      <h2 id="tasks-title" className="text-h4 font-bold text-ink-900">
        Your tasks
      </h2>
      {!list.length ? (
        <p className="mt-2 flex items-center gap-2 text-meta text-brand-800">
          <ShieldCheck className="size-4" aria-hidden="true" /> Nothing needs your attention right
          now.
        </p>
      ) : null}
      {[
        ['Needs your action', required, 'text-danger'],
        ['For your information', info, 'text-ink-500'],
      ].map(([heading, items, tone]) =>
        items.length ? (
          <div key={heading} className="mt-4">
            <h3 className={`text-tiny font-bold tracking-[0.1em] uppercase ${tone}`}>{heading}</h3>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {items.map((task) => (
                <li key={task.key}>
                  <Link
                    href={task.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-meta hover:bg-ink-50"
                  >
                    <span>{task.label}</span>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}

function LatestUpdates({ updates }) {
  const data = updates?.data;
  return (
    <section
      aria-labelledby="latest-updates-title"
      className="rounded-lg border border-border bg-card p-5 shadow-xs"
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
        <ul className="mt-3 space-y-3">
          {data.items.slice(0, 5).map((update) => (
            <li key={update.id} className="text-meta">
              <p className={update.read ? 'text-ink-700' : 'font-semibold text-ink-900'}>
                {updateTitle(update)}
                <span className="sr-only">{update.read ? ' (read)' : ' (unread)'}</span>
              </p>
              <p className="text-tiny text-ink-500">
                {update.propertyTitle ?? update.detail?.reference ?? 'Account'} ·{' '}
                {new Date(update.createdAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                IST
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-meta text-ink-600">No updates yet.</p>
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
