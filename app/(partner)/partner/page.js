import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CircleAlert,
  Clock3,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { requireClient } from '@/lib/auth/dal';
import { profileCompletion, lockedCtaMessage } from '@/lib/auth/profile';
import { recordLockedCtaClick } from '@/lib/auth/actions';
import {
  getOrCreateApplication, submitApplication, withdrawApplication,
} from '@/lib/auth/application';
import { listDocuments } from '@/lib/auth/documents';
import { getClientListingSummary } from '@/lib/db/listing-queries';
import CompletionStepper from '@/components/partner/CompletionStepper';
import GatedAddPlaceButton from '@/components/partner/GatedAddPlaceButton';
import PendingSubmitButton from '@/components/partner/PendingSubmitButton';
import PropertyTable from '@/components/partner/PropertyTable';
import { KpiCard, PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import { formatINR } from '@/lib/domain/pricing';

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
  const application = await getOrCreateApplication(user.id);
  const documents = await listDocuments({
    ownerType: 'client_application', ownerId: application.id,
  });

  const completion = profileCompletion(user, application, documents);
  const locked = lockedCtaMessage(completion);
  const summary = completion.canPublish
    ? await getClientListingSummary(user.id)
    : EMPTY_SUMMARY;

  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PartnerPageHeader
        eyebrow={completion.approved ? 'Verified partner' : 'Getting set up'}
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome to Rentra'}
        description={completion.approved
          ? summary.total > 0
            ? `Here’s a clear view of all ${summary.total} ${summary.total === 1 ? 'property' : 'properties'} in your Rentra portfolio.`
            : 'Your partner account is ready. Add your first property to start building your portfolio.'
          : (
            <>
              Farmhouses around Surat earn between{' '}
              <strong className="font-semibold text-ink-800">{formatINR(8000)}</strong> and{' '}
              <strong className="font-semibold text-ink-800">{formatINR(14500)}</strong> a night.
              Finish your verification so you can publish with confidence.
            </>
          )}
        action={(
          <GatedAddPlaceButton
            unlocked={completion.canPublish}
            message={locked}
            onLockedClick={recordLockedCtaClick}
          />
        )}
      />

      {completion.approved ? (
        <ApprovedDashboard summary={summary} />
      ) : (
        <OnboardingDashboard
          completion={completion}
          application={application}
        />
      )}
    </div>
  );
}

function ApprovedDashboard({ summary }) {
  const liveRate = summary.total ? Math.round((summary.live / summary.total) * 100) : 0;
  const other = Math.max(0, summary.total - summary.live - summary.inReview - summary.attention);

  return (
    <>
      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Portfolio summary">
        <KpiCard
          label="Total properties"
          value={summary.total}
          hint="Across your complete portfolio"
          icon={Building2}
        />
        <KpiCard
          label="Live listings"
          value={summary.live}
          hint="Visible and bookable by guests"
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

      <section className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-h4 font-bold text-ink-900">Recent properties</h2>
              <p className="mt-0.5 text-tiny text-ink-500">Most recently updated across your portfolio</p>
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

        <div className="space-y-5">
          <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Portfolio health</p>
                <p className="mt-1 text-h4 font-bold text-ink-900">{liveRate}% live</p>
              </div>
              <span
                className="grid size-12 place-items-center rounded-full text-tiny font-bold text-brand-800"
                style={{
                  background: summary.total
                    ? `radial-gradient(circle at center, white 59%, transparent 61%), conic-gradient(#2E6449 ${liveRate}%, #EBEEEB 0)`
                    : '#EBEEEB',
                }}
                aria-label={`${liveRate}% of properties are live`}
              >
                {liveRate}%
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <StatusLine label="Live" value={summary.live} total={summary.total} tone="bg-success" />
              <StatusLine label="In review" value={summary.inReview} total={summary.total} tone="bg-warning" />
              <StatusLine label="Needs attention" value={summary.attention} total={summary.total} tone="bg-danger" />
              {other > 0 ? <StatusLine label="Paused or hidden" value={other} total={summary.total} tone="bg-ink-400" /> : null}
            </div>
          </article>

          <NextAction summary={summary} />
        </div>
      </section>
    </>
  );
}

function StatusLine({ label, value, total, tone }) {
  const width = total ? Math.max(value > 0 ? 5 : 0, (value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-tiny">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-800 tabular">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function NextAction({ summary }) {
  if (summary.attention > 0) {
    return (
      <article className="rounded-lg border border-danger/20 bg-danger-bg p-5">
        <span className="grid size-9 place-items-center rounded-md bg-white/65 text-danger ring-1 ring-danger/10">
          <CircleAlert className="size-[18px]" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-meta font-bold text-ink-900">Finish what needs attention</h2>
        <p className="mt-1 text-tiny leading-5 text-ink-600">
          {summary.attention} {summary.attention === 1 ? 'property is' : 'properties are'} still a draft or needs changes before going live.
        </p>
        <Link
          href="/partner/listings?status=attention"
          className="mt-4 inline-flex items-center gap-1.5 text-tiny font-bold text-danger hover:underline"
        >
          Review properties <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </article>
    );
  }

  if (summary.inReview > 0) {
    return (
      <article className="rounded-lg border border-warning/20 bg-warning-bg p-5">
        <span className="grid size-9 place-items-center rounded-md bg-white/65 text-warning ring-1 ring-warning/10">
          <Clock3 className="size-[18px]" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-meta font-bold text-ink-900">Review in progress</h2>
        <p className="mt-1 text-tiny leading-5 text-ink-600">
          Rentra is checking {summary.inReview} {summary.inReview === 1 ? 'property' : 'properties'}. We normally reply within 2 working days.
        </p>
        <Link
          href="/partner/listings?status=review"
          className="mt-4 inline-flex items-center gap-1.5 text-tiny font-bold text-warning hover:underline"
        >
          See review status <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-brand-200 bg-brand-50 p-5">
      <span className="grid size-9 place-items-center rounded-md bg-white text-brand-700 ring-1 ring-brand-100">
        <ShieldCheck className="size-[18px]" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-meta font-bold text-brand-900">
        {summary.total ? 'Everything is in good shape' : 'Ready for your first property'}
      </h2>
      <p className="mt-1 text-tiny leading-5 text-brand-800">
        {summary.total
          ? 'There are no drafts or review items needing your attention right now.'
          : 'Your verified account can publish as soon as your first property is ready.'}
      </p>
    </article>
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
              We reply within 2 working days, by email and WhatsApp.
            </p>
          </form>
        ) : null}

        {completion.submitted ? (
          <div className="rounded-lg border border-warning/25 bg-warning-bg p-4">
            <p className="text-h4 font-bold text-warning">With us for review</p>
            <p className="mt-1 text-meta text-ink-700">
              Nothing more to do. We reply within 2 working days either way. Need to change something first?
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
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <p className="text-[0.68rem] font-bold tracking-[0.1em] text-brand-700 uppercase">What happens next</p>
        <ol className="mt-4 space-y-4">
          {[
            ['Complete your details', 'Add the identity and payout information Rentra needs.'],
            ['Rentra reviews them', 'A person checks your application within 2 working days.'],
            ['Publish properties', 'Once approved, add and manage every property from this workspace.'],
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
