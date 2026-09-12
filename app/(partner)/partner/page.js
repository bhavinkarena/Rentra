import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rentable } from '@/lib/db/schema/index.js';
import { requireClient } from '@/lib/auth/dal';
import { profileCompletion, lockedCtaMessage } from '@/lib/auth/profile';
import { recordLockedCtaClick } from '@/lib/auth/actions';
import {
  getOrCreateApplication, submitApplication, withdrawApplication,
} from '@/lib/auth/application';
import { listDocuments } from '@/lib/auth/documents';
import CompletionStepper from '@/components/partner/CompletionStepper';
import GatedAddPlaceButton from '@/components/partner/GatedAddPlaceButton';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/domain/pricing';

export const metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: false },
};

/**
 * The Client dashboard.
 *
 * `requireClient`, not `requireActiveClient` — a Client who is logged in but
 * not yet approved belongs here, working the stepper. This is the whole point
 * of letting them in before verification: the row exists, it is nudgeable,
 * and the dashboard is what pulls them through the rest.
 */
export default async function PartnerDashboard() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);
  const documents = await listDocuments({
    ownerType: 'client_application', ownerId: application.id,
  });

  const completion = profileCompletion(user, application, documents);
  const locked = lockedCtaMessage(completion);

  const listings = completion.canPublish
    ? await db
      .select({ id: rentable.id, title: rentable.title, status: rentable.status })
      .from(rentable)
      .where(eq(rentable.clientId, user.id))
      .limit(50)
    : [];

  const live = listings.filter((l) => l.status === 'live').length;

  return (
    <div className="mx-auto w-full max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-tiny font-bold tracking-wider text-brand-700 uppercase">
        {completion.approved ? 'Verified partner' : 'Getting set up'}
      </p>
      <h1 className="mt-1 text-h1">
        {user.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to Rentra'}
      </h1>

      {!completion.approved ? (
        <p className="mt-2 max-w-prose text-body text-ink-600">
          Farmhouses around Surat earn between{' '}
          <strong className="font-semibold text-ink-900">{formatINR(8000)}</strong> and{' '}
          <strong className="font-semibold text-ink-900">{formatINR(14500)}</strong> a night.
          Finish the steps below and we will review your account within 2 working days.
        </p>
      ) : (
        <p className="mt-2 max-w-prose text-body text-ink-600">
          {listings.length === 0
            ? 'Your account is approved. Add your first property to start taking bookings.'
            : `You have ${listings.length} propert${listings.length === 1 ? 'y' : 'ies'}, ${live} live.`}
        </p>
      )}

      <div className="mt-6">
        <GatedAddPlaceButton
          unlocked={completion.canPublish}
          message={locked}
          onLockedClick={recordLockedCtaClick}
        />
      </div>

      {!completion.approved ? (
        <div className="mt-8 max-w-2xl space-y-4">
          <CompletionStepper completion={completion} />

          {/* Submit is re-checked server-side — rendering the button is not
              the authorisation, submitApplication() re-verifies every step. */}
          {completion.canSubmit ? (
            <form action={submitApplication}>
              <Button type="submit" size="lg" className="w-full">
                Submit for review
              </Button>
              <p className="mt-2 text-center text-tiny text-ink-500">
                We reply within 2 working days, by email and WhatsApp.
              </p>
            </form>
          ) : null}

          {completion.submitted ? (
            <div className="rounded-lg border border-amber-300 bg-amber-100 p-4">
              <p className="text-h4 font-bold text-amber-700">With us for review</p>
              <p className="mt-1 text-meta text-ink-700">
                Nothing more to do. We reply within 2 working days either way.
                Need to change something first?
              </p>
              {/* Gap 11: a submitted application is read-only. Withdrawing to
                  edit is explicitly NOT a strike — correcting your own typo is
                  not misconduct. */}
              <form action={withdrawApplication} className="mt-3">
                <button
                  type="submit"
                  className="text-meta font-semibold text-brand-700 hover:underline"
                >
                  Withdraw and edit
                </button>
              </form>
            </div>
          ) : null}

          {completion.changesRequested ? (
            <div className="rounded-lg border border-danger/30 bg-danger-bg p-4">
              <p className="text-h4 font-bold text-danger">We need a bit more</p>
              <p className="mt-1 text-meta text-ink-700">
                {application.decisionReason
                  || 'Please check the flagged steps above and resubmit.'}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {listings.length > 0 ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-h3">Your properties</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-meta font-semibold">{l.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-tiny font-bold ${
                    l.status === 'live'
                      ? 'bg-brand-50 text-brand-700'
                      : l.status === 'pending_review' || l.status === 'pending_verification'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {l.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
