import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import TeamPanel from '@/components/partner/TeamPanel';

export const metadata = {
  title: 'Caretakers',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Owner-managed caretakers (CP16): invite with a one-time link, choose
 * properties and whether they may record evidence, reassign or revoke, and
 * see the membership history. Caretakers sign in at /staff, never here.
 */
export default async function TeamPage() {
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.team());
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8">
      <PartnerPageHeader
        eyebrow="Account"
        title="Caretakers"
        description="Caretakers who run visits at your properties. They never see prices, earnings, your documents or your team."
      />
      <div className="mt-6">
        <TeamPanel team={data} />
      </div>
    </div>
  );
}
