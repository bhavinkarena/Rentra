import Link from '@/components/navigation/NavigationLink';
import ApplicationCommand from '@/components/partner/ApplicationCommand';
import { saveOwnerGuide } from '@/lib/actions/partner';
import OperatorHelp from '@/components/portal/OperatorHelp';
import { requireClient } from '@/lib/api/session';
export const metadata = { title: 'Owner guide', robots: { index: false, follow: false } };
export default async function HelpPage() {
  const owner = await requireClient();
  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/partner?tour=1" className="min-h-11 py-3 font-semibold text-brand-700">
            Show me around again
          </Link>
          {owner.accountStatus === 'active' ? (
            <ApplicationCommand
              action={async () => {
                'use server';
                const form = new FormData();
                form.set('checklistDismissedAt', 'false');
                form.set('next', '/partner');
                return saveOwnerGuide({}, form);
              }}
              pendingLabel="Opening guide…"
              className="min-h-11 font-semibold text-brand-700"
            >
              Show setup guide
            </ApplicationCommand>
          ) : null}
        </div>
        {[
          [
            'details',
            'About you and mobile',
            'Use your legal name and address. Save your details, then verify your Indian mobile with the SMS code.',
          ],
          [
            'kyc',
            'Identity check',
            'Choose a PAN, driving licence or masked Aadhaar. Photos resize automatically; PDFs must be under 5MB. Check all corners are visible, with no glare and readable text.',
          ],
          [
            'payout',
            'Payout method',
            'Use your own UPI ID or bank details. Enter a bank account twice; spaces and dashes are removed. An IFSC lookup helps identify your branch. Payouts are not available yet.',
          ],
          [
            'consent',
            'Agree to the terms',
            'Read the owner terms, privacy and cancellation policies. Save your consent, then review and submit.',
          ],
          [
            'review',
            'Review and submit',
            'Check your saved details. Rentra reviews within 2 working days. Submitted applications are read-only; withdraw to edit. Check Today for the decision.',
          ],
        ].map(([id, title, body]) => (
          <details
            key={id}
            id={`verification-${id}`}
            className="rounded-md border border-border p-4"
          >
            <summary className="min-h-11 cursor-pointer font-semibold">{title}</summary>
            <p className="mt-2 text-meta text-ink-600">{body}</p>
          </details>
        ))}
      </div>
      <OperatorHelp role="owner" capabilities={owner.capabilities} />
    </>
  );
}
