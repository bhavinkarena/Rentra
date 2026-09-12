import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';
import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import { AccountForm, PayoutDestinationForm } from '@/components/partner/SettingsForms';

export const metadata = {
  title: 'Settings',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Everything onboarding collects once, made changeable afterwards.
 *
 * Until this page existed, a Client's name, language and payout destination
 * were writable only while walking the onboarding stepper and never again —
 * so an owner who mistyped a UPI ID, or moved bank, had no route back to it
 * except a support call.
 *
 * `requireClient` rather than `requireActiveClient`: a Client sent back over a
 * payout-name mismatch is by definition not active, and this is the page that
 * fixes it.
 */
export default async function SettingsPage() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/partner"
        className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Dashboard
      </Link>

      <h1 className="mt-5 text-h1">Settings</h1>

      {/* --- what cannot be changed here, and where it is changed instead --- */}
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-h4 font-bold">Sign-in and identity</h2>
        <ul className="mt-3 space-y-3">
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Mail className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-meta font-semibold text-ink-900">{user.email}</span>
              <span className="block text-tiny text-ink-500">
                Your sign-in address. Changing it means proving the new one, so write to us
                and we will move the account across.
              </span>
            </span>
          </li>

          <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
            <Phone className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-meta font-semibold text-ink-900">
                {user.phone ?? 'No mobile number yet'}
              </span>
              <span className="block text-tiny text-ink-500">
                Where booking alerts arrive. A new number has to be verified by SMS.
              </span>
            </span>
            <Link
              href="/partner/onboarding/phone"
              className="shrink-0 rounded-md border border-input px-3 py-1.5 text-tiny font-semibold text-ink-700 hover:bg-ink-50"
            >
              {user.phone ? 'Change' : 'Add'}
            </Link>
          </li>

          <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
            <ShieldCheck className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-meta font-semibold text-ink-900">
                Identity check — {user.kycStatus === 'verified' ? 'verified' : user.kycStatus.replace(/_/g, ' ')}
              </span>
              <span className="block text-tiny text-ink-500">
                {user.kycStatus === 'verified'
                  ? 'Done once and reused. You will not be asked again.'
                  : 'Your ID is with us. We check it as part of your application.'}
              </span>
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="text-h4 font-bold">Your details</h2>
        <div className="mt-4">
          <AccountForm user={user} />
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="text-h4 font-bold">Where we send your money</h2>
        <p className="mt-1 text-meta text-ink-600">
          Changing this re-runs the name check against your ID. Bookings already confirmed pay
          out to whichever destination is saved when they settle.
        </p>
        <div className="mt-4">
          <PayoutDestinationForm user={user} application={application} />
        </div>
      </section>
    </div>
  );
}
