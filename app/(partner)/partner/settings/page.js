import Link from 'next/link';
import { Mail, Phone, ShieldCheck, WalletCards } from 'lucide-react';
import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import { AccountForm, PayoutDestinationForm } from '@/components/partner/SettingsForms';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';

export const metadata = {
  title: 'Settings',
  robots: { index: false, follow: false, nocache: true },
};

export default async function SettingsPage() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PartnerPageHeader
        eyebrow="Account"
        title="Settings & payouts"
        description="Keep your partner profile, contact details and payout destination accurate."
      />

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <ShieldCheck className="size-[18px]" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-h4 font-bold text-ink-900">Your details</h2>
                <p className="mt-0.5 text-tiny text-ink-500">
                  The name shown to guests and the language Rentra uses with you.
                </p>
              </div>
            </div>
            <div className="mt-5 max-w-2xl">
              <AccountForm user={user} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <WalletCards className="size-[18px]" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-h4 font-bold text-ink-900">Where we send your money</h2>
                <p className="mt-0.5 text-tiny leading-5 text-ink-500">
                  Changing this re-runs the name check against your ID. Confirmed bookings pay to the destination saved when they settle.
                </p>
              </div>
            </div>
            <div className="mt-5 max-w-2xl">
              <PayoutDestinationForm user={user} application={application} />
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5 shadow-xs lg:sticky lg:top-20">
          <p className="text-[0.68rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Sign-in & identity</p>
          <ul className="mt-4 divide-y divide-border">
            <li className="flex gap-3 pb-4">
              <Mail className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-tiny font-semibold text-ink-900">{user.email}</span>
                <span className="mt-1 block text-[0.68rem] leading-4 text-ink-500">
                  Your verified sign-in address. Contact Rentra to move the account to a new email.
                </span>
              </span>
            </li>

            <li className="flex gap-3 py-4">
              <Phone className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-tiny font-semibold text-ink-900">
                  {user.phone ?? 'No mobile number yet'}
                </span>
                <span className="mt-1 block text-[0.68rem] leading-4 text-ink-500">
                  Booking alerts and important property updates arrive here.
                </span>
                <Link
                  href="/partner/onboarding/phone"
                  className="mt-2 inline-flex text-[0.68rem] font-bold text-brand-700 hover:underline"
                >
                  {user.phone ? 'Change number' : 'Add number'} →
                </Link>
              </span>
            </li>

            <li className="flex gap-3 pt-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-tiny font-semibold text-ink-900">
                  Identity {user.kycStatus === 'verified' ? 'verified' : user.kycStatus.replace(/_/g, ' ')}
                </span>
                <span className="mt-1 block text-[0.68rem] leading-4 text-ink-500">
                  {user.kycStatus === 'verified'
                    ? 'Completed once and securely reused for your Rentra account.'
                    : 'Your ID is checked as part of partner verification.'}
                </span>
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
