import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import TeamPanel from '@/components/partner/TeamPanel';
import PortalPage from '@/components/portal/PortalPage';
import Link from '@/components/navigation/NavigationLink';
import { buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Caretakers',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Owner-managed caretakers (CP16): invite with a one-time link, choose
 * properties and whether they may record evidence, reassign or revoke, and
 * see the membership history. Caretakers sign in at /staff, never here.
 */
export default async function TeamPage({ searchParams }) {
  const query = await searchParams;
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.team());
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return (
    <PortalPage width="portal">
      <PartnerPageHeader
        title="Caretakers"
        description="The people who keep visits running at your properties."
        action={
          <Link href="/partner/team/invite" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden="true" />
            Invite caretaker
          </Link>
        }
      />
      <div className="mt-6">
        <TeamPanel team={data} view={query.view === 'history' ? 'history' : 'team'} />
      </div>
    </PortalPage>
  );
}
