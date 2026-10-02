import PortalPage from '@/components/portal/PortalPage';
import SettingsTabs from '@/components/partner/SettingsTabs';
import Link from '@/components/navigation/NavigationLink';
import { Mail, Phone, ShieldCheck, WalletCards } from 'lucide-react';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { AccountForm } from '@/components/partner/SettingsForms';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';

export const metadata = {
  title: 'Settings',
  robots: { index: false, follow: false, nocache: true },
};

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireClient();
  const application = await partnerApi.application();

  return (
    <PortalPage width="settings">
      {params?.notice === 'verified' ? (
        <p role="status" className="mb-4 rounded-md bg-brand-50 p-4">
          You’re already verified. Update your account details here.
        </p>
      ) : null}
      <PartnerPageHeader
        eyebrow="Account"
        title="Profile settings"
        description="Keep your partner profile, contact details and payout destination accurate."
      />

      <SettingsTabs />
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
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
              <AccountForm
                user={user}
                nameLocked={['submitted', 'approved'].includes(application?.status)}
              />
              <div className="mt-4 text-sm">
                <strong>Legal name:</strong>{' '}
                {application?.legalName || application?.kycNameOnDoc || 'Not added yet'}
                <p>
                  Legal details are kept separately for verification.{' '}
                  <Link href="/partner/support/new?category=account" className="underline">
                    Contact support to change submitted details.
                  </Link>
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <WalletCards className="size-[18px]" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-h4 font-bold text-ink-900">Where we send your money</h2>
                <p className="mt-0.5 text-tiny leading-5 text-ink-500">
                  Every change is kept as a version. Payouts already scheduled keep the version they
                  were created with, and payouts stay disabled until a provider verifies the
                  destination.
                </p>
              </div>
            </div>
            <div className="mt-5 max-w-2xl space-y-3 text-meta">
              <p>
                {application?.payoutUpiId
                  ? `UPI ${application.payoutUpiId.slice(0, 2)}•••@${application.payoutUpiId.split('@')[1] ?? ''}`
                  : application?.payoutAccountRef
                    ? `Bank ${application.payoutAccountRef}${application.payoutIfsc ? ` · ${application.payoutIfsc}` : ''}`
                    : 'No payout destination yet.'}
              </p>
              <Link
                href="/partner/settings/payout"
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-semibold text-brand-700 hover:bg-brand-50"
              >
                Manage payout destination
              </Link>
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5 lg:sticky lg:top-20">
          <p className="text-tiny font-bold tracking-[0.1em] text-ink-500 uppercase">
            Sign-in & identity
          </p>
          <ul className="mt-4 divide-y divide-border">
            <li className="flex gap-3 pb-4">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-tiny font-semibold text-ink-900">
                  {user.email}
                </span>
                <span className="mt-1 block text-tiny leading-4 text-ink-500">
                  Your verified sign-in address. Change your email using a verification code in
                  Login & security.
                </span>
              </span>
            </li>

            <li className="flex gap-3 py-4">
              <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-tiny font-semibold text-ink-900">
                  {user.phone ?? 'No mobile number yet'}
                </span>
                <span className="mt-1 block text-tiny leading-4 text-ink-500">
                  Guests call this number on the visit day. Choose your update channels in
                  Notifications.
                </span>
                <Link
                  href="/partner/settings/security"
                  className="mt-2 inline-flex text-tiny font-bold text-brand-700 hover:underline"
                >
                  {user.phone ? 'Change number' : 'Add number'} →
                </Link>
              </span>
            </li>

            <li className="flex gap-3 pt-4">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-tiny font-semibold text-ink-900">
                  Identity{' '}
                  {user.kycStatus === 'verified'
                    ? 'documents reviewed by Rentra'
                    : user.kycStatus === 'none'
                      ? 'check not submitted yet'
                      : (user.kycStatus || 'pending').replace(/_/g, ' ')}
                </span>
                <span className="mt-1 block text-tiny leading-4 text-ink-500">
                  {user.kycStatus === 'verified'
                    ? 'A Rentra reviewer checked your ID documents. No automated KYC provider is connected.'
                    : 'Your ID is checked as part of partner verification.'}
                </span>
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </PortalPage>
  );
}
