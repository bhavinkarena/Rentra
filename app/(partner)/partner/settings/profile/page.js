import Link from '@/components/navigation/NavigationLink';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AccountForm } from '@/components/partner/SettingsForms';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
export const metadata = { title: 'Profile settings', robots: { index: false, follow: false } };
export default async function Page() {
  const user = await requireClient();
  const { data: application, failure } = await settle(partnerApi.application());
  if (failure)
    return <PortalState kind={failure} backHref="/partner/settings" backLabel="Settings" />;
  return (
    <section>
      <SettingsHeading
        title="Profile"
        description="Manage the name guests see and the language Rentra uses with you."
      />
      <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
        <h2 className="mb-6 text-h3 font-semibold">Personal details</h2>
        <AccountForm
          user={user}
          nameLocked={['submitted', 'approved'].includes(application?.status)}
        />
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-h3 font-semibold">Legal details</h2>
        <p className="mt-3 text-meta text-ink-700">
          {application?.legalName || application?.kycNameOnDoc || 'Legal name not added yet'}
        </p>
        <p className="mt-2 max-w-[65ch] text-meta leading-6 text-ink-600">
          Legal details are kept separately for verification. Submitted details need Rentra support
          to change them.
        </p>
        <Link
          href="/partner/support/new?category=account"
          className="mt-2 inline-flex min-h-11 items-center text-meta font-semibold text-brand-800 hover:underline"
        >
          Contact support
        </Link>
      </section>
    </section>
  );
}
