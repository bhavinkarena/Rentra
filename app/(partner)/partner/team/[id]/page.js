import { notFound } from 'next/navigation';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortalPage from '@/components/portal/PortalPage';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import { MemberStatus, TeamBack, teamDate } from '@/components/partner/team/TeamDisplay';
import { AccessForm, LinkForm, RevokeForm } from '@/components/partner/team/TeamForms';
import Link from '@/components/navigation/NavigationLink';
import { ChevronDown } from 'lucide-react';

export const metadata = { title: 'Caretaker access', robots: { index: false, follow: false } };
export default async function MemberPage({ params }) {
  await requireActiveClient();
  const { id } = await params;
  const { data, failure } = await settle(partnerApi.team());
  if (failure)
    return <PortalState kind={failure} backHref="/partner/team" backLabel="Caretakers" />;
  const member = data.members.find((m) => m.id === id);
  if (!member) notFound();
  return (
    <PortalPage width="reading">
      <TeamBack />
      <PartnerPageHeader
        title={member.name}
        description={member.phone}
        action={<MemberStatus member={member} />}
      />
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-tiny text-ink-500">
        {member.lastSessionAt ? (
          <p>Last signed in {teamDate(member.lastSessionAt)} IST</p>
        ) : (
          <p>Has not signed in yet</p>
        )}
        {member.pendingInvite ? (
          <p>Invitation expires {teamDate(member.pendingInvite.expiresAt)} IST</p>
        ) : null}
      </div>
      {member.state === 'revoked' ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5 sm:p-7">
          <h2 className="text-h3 font-semibold text-ink-900">Access has ended</h2>
          <p className="mt-3 text-meta text-ink-600">Removed {teamDate(member.revokedAt)} IST</p>
          <p className="mt-2 break-words text-meta text-ink-600">{member.revokedReason}</p>
          <p className="mt-5 text-meta text-ink-600">
            Invite this mobile number again to restore access with fresh permissions.
          </p>
          <Link
            href="/partner/team/invite"
            className="mt-3 inline-flex min-h-11 items-center text-meta font-semibold text-brand-800 hover:underline"
          >
            Invite caretaker again
          </Link>
        </section>
      ) : (
        <>
          <section
            className="mt-6 rounded-lg border border-border bg-card p-5 sm:p-7"
            aria-labelledby="access-title"
          >
            <h2 id="access-title" className="text-h3 font-semibold text-ink-900">
              Properties & visit access
            </h2>
            <p className="mt-2 mb-6 text-meta leading-6 text-ink-500">
              Changes apply on their next action. Only selected properties are available to this
              caretaker.
            </p>
            <AccessForm
              key={`access-${member.version}`}
              member={member}
              properties={data.properties}
            />
          </section>
          <details className="group mt-5 rounded-lg border border-border bg-card p-5 sm:p-7">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-meta font-semibold text-ink-800">
              {member.state === 'active' ? 'Sign-in link' : 'Invitation link'}
              <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 mb-4 text-meta leading-6 text-ink-500">
              Create a fresh one-time link. Any previous unused link will stop working.
            </p>
            <LinkForm member={member} />
          </details>
          <details className="group mt-5 border-t border-border pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-meta font-medium text-danger">
              Revoke access
              <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-4">
              <RevokeForm key={`revoke-${member.version}`} member={member} />
            </div>
          </details>
        </>
      )}
    </PortalPage>
  );
}
