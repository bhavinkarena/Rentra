import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortalPage from '@/components/portal/PortalPage';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import { TeamBack } from '@/components/partner/team/TeamDisplay';
import { InviteForm } from '@/components/partner/team/TeamForms';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Invite caretaker', robots: { index: false, follow: false } };
export default async function InvitePage() {
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.team());
  if (failure)
    return <PortalState kind={failure} backHref="/partner/team" backLabel="Caretakers" />;
  return (
    <PortalPage width="reading">
      <TeamBack />
      <PartnerPageHeader
        title="Invite caretaker"
        description="Choose their properties and access before creating an invitation."
      />
      <section
        className="mt-6 rounded-lg border border-border bg-card p-5 sm:p-7"
        aria-label="Caretaker invitation"
      >
        {data.properties.length ? (
          <InviteForm properties={data.properties} />
        ) : (
          <EmptyState
            title="Add a property first"
            description="A caretaker needs at least one assigned property."
            actionHref="/partner/listings"
            actionLabel="Add property"
          />
        )}
      </section>
      <p className="mt-5 max-w-[65ch] text-meta leading-6 text-ink-500">
        They can see assigned visits, the property address and your phone number. Prices, earnings,
        documents and team management stay private.
      </p>
    </PortalPage>
  );
}
