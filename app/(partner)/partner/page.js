import Link from 'next/link';
import { ArrowRight, Bell, Building2, CircleAlert, Clock3, Eye, ShieldCheck } from 'lucide-react';
import { requireClient, getCurrentUserWithCompletion } from '@/lib/api/session';
import { lockedCtaMessage } from '@/lib/domain/profile-completion';
import { recordLockedCtaClick } from '@/lib/actions/auth';
import { submitApplication, withdrawApplication } from '@/lib/actions/partner';
import { partnerApi } from '@/lib/api/endpoints';
import CompletionStepper from '@/components/partner/CompletionStepper';
import GatedAddPlaceButton from '@/components/partner/GatedAddPlaceButton';
import PendingSubmitButton from '@/components/partner/PendingSubmitButton';
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
export default async function PartnerDashboard() {
  const user = await requireClient();
  /* `/auth/me` returns the completion state alongside the actor, so the
     application and the KYC list are not two further round trips. */
  const { completion } = await getCurrentUserWithCompletion();
  const application = await partnerApi.application();

  const locked = lockedCtaMessage(completion);
  const summary = completion.canPublish ? await partnerApi.summary() : EMPTY_SUMMARY;
  // Tasks and updates load independently: a failure shows a retry, never zeros.
  const [tasks, updates] = await Promise.all([
    completion.approved ? settle(partnerApi.tasks()) : null,
    settle(partnerApi.updates({ page: 1 })),
  ]);

  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PartnerPageHeader
        eyebrow={completion.approved ? 'Approved partner' : 'Getting set up'}
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome to Rentra'}
        description={
          completion.approved
            ? summary.total > 0
              ? `Here’s a clear view of all ${summary.total} ${summary.total === 1 ? 'property' : 'properties'} in your Rentra portfolio.`
              : 'Your partner account is ready. Add your first property to start building your portfolio.'
            : 'Finish your verification so you can add and publish properties with confidence.'
        }
        action={
          <GatedAddPlaceButton
            unlocked={completion.canPublish}
            message={locked}
            onLockedClick={recordLockedCtaClick}
          />
        }
      />

      {completion.approved ? (
        <ApprovedDashboard summary={summary} tasks={tasks} updates={updates} />
      ) : (
        <>
          <OnboardingDashboard completion={completion} application={application} />
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
            <h3 className={`text-[0.68rem] font-bold tracking-[0.1em] uppercase ${tone}`}>
              {heading}
            </h3>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {items.map((task) => (
                <li key={task.key}>
                  <Link
                    href={task.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-meta hover:bg-ink-50"
                  >
                    <span>{task.label}</span>
                    <ArrowRight className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
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

function OnboardingDashboard({ completion, application }) {
  return (
    <section className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,720px)_minmax(260px,1fr)]">
      <div className="space-y-4">
        <CompletionStepper completion={completion} />

        {completion.canSubmit ? (
          <form action={submitApplication}>
            <PendingSubmitButton
              pendingLabel="Submitting for review…"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
            >
              Submit for review
            </PendingSubmitButton>
            <p className="mt-2 text-center text-tiny text-ink-500">
              A person reviews it within 2 working days. The decision appears here.
            </p>
          </form>
        ) : null}

        {completion.submitted ? (
          <div className="rounded-lg border border-warning/25 bg-warning-bg p-4">
            <p className="text-h4 font-bold text-warning">With us for review</p>
            <p className="mt-1 text-meta text-ink-700">
              Nothing more to do. We reply within 2 working days either way. Need to change
              something first?
            </p>
            <form action={withdrawApplication} className="mt-3">
              <PendingSubmitButton
                pendingLabel="Withdrawing…"
                className="inline-flex items-center gap-2 text-meta font-semibold text-brand-700 hover:underline disabled:cursor-wait"
              >
                Withdraw and edit
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}

        {completion.changesRequested ? (
          <div className="rounded-lg border border-danger/30 bg-danger-bg p-4">
            <p className="text-h4 font-bold text-danger">We need a bit more</p>
            <p className="mt-1 text-meta text-ink-700">
              {application.decisionReason || 'Please check the flagged steps above and resubmit.'}
            </p>
            <p className="mt-2 text-tiny text-ink-600">
              Update the steps marked above, then submit again. Your other details stay as they are.
            </p>
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <p className="text-[0.68rem] font-bold tracking-[0.1em] text-brand-700 uppercase">
          What happens next
        </p>
        <ol className="mt-4 space-y-4">
          {[
            ['Complete your details', 'Add the identity and payout information Rentra needs.'],
            ['Rentra reviews them', 'A person checks your application within 2 working days.'],
            [
              'Publish properties',
              'Once approved, add and manage every property from this workspace.',
            ],
          ].map(([title, body], index) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[0.68rem] font-bold text-brand-700 ring-1 ring-brand-100">
                {index + 1}
              </span>
              <span>
                <span className="block text-tiny font-bold text-ink-800">{title}</span>
                <span className="mt-0.5 block text-tiny leading-5 text-ink-500">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
