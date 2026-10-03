import Link from '@/components/navigation/NavigationLink';
import ApplicationCommand from './ApplicationCommand';
import { submitApplication, withdrawApplication } from '@/lib/actions/partner';
export default function ApplicationReview({ user, application, completion, readOnly = false }) {
  const summaries = {
    details: `${user.name ?? 'Name not saved'} · ${application.residentialAddress ?? 'Address not saved'} · ${user.phoneVerifiedAt ? `Mobile verified: ${user.phone}` : 'Mobile not verified'}`,
    kyc: application.kycNameOnDoc
      ? `${application.kycNameOnDoc} · ${application.kycDocType?.replaceAll('_', ' ')}`
      : 'Identity not uploaded',
    payout: application.payoutAccountRef
      ? `Bank account ${application.payoutAccountRef} · ${application.payoutIfsc}`
      : application.payoutUpiId
        ? `UPI · ${application.payoutUpiId}`
        : 'Payout method not saved',
    consent: application.consentAt
      ? `Agreed on ${new Date(application.consentAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`
      : 'Terms not agreed yet',
  };
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-border rounded-lg border border-border bg-card px-4">
        {completion.steps.map((step) => (
          <div key={step.id} className="py-4">
            <dt className="flex items-center justify-between gap-3 font-semibold">
              {step.label}
              {!readOnly ? (
                <Link
                  href={step.href}
                  className="min-h-11 p-3 text-meta text-brand-700"
                  aria-label={`Edit ${step.label}`}
                >
                  Edit
                </Link>
              ) : null}
            </dt>
            <dd className="text-meta break-words text-ink-600">{summaries[step.id]}</dd>
            {step.flagged || !step.done ? (
              <dd className="mt-1 text-meta text-warning">
                {step.note ?? 'Please finish this step.'}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      {readOnly ? (
        <>
          <p role="status">
            With Rentra for review. A person checks your details within 2 working days. Check back
            here for the decision.
          </p>
          <ApplicationCommand
            confirm
            action={withdrawApplication}
            pendingLabel="Withdrawing…"
            className="min-h-11 text-brand-700 underline"
          >
            Withdraw to edit
          </ApplicationCommand>
        </>
      ) : completion.canSubmit ? (
        <ApplicationCommand
          action={submitApplication}
          pendingLabel="Submitting…"
          className="min-h-12 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white"
        >
          Submit for review
        </ApplicationCommand>
      ) : (
        <Link
          href={completion.remaining[0]?.href ?? '/partner'}
          className="block min-h-11 py-3 font-semibold text-brand-700"
        >
          Finish verification
        </Link>
      )}
    </div>
  );
}
