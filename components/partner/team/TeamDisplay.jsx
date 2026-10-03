import { ArrowLeft } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';

export const teamDate = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export function TeamBack() {
  return (
    <Link
      href="/partner/team"
      className="mb-5 inline-flex min-h-11 items-center gap-2 text-meta font-medium text-brand-800 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Caretakers
    </Link>
  );
}
export function MemberStatus({ member }) {
  const states = {
    active: ['Active', 'bg-success-bg text-success'],
    invited: [
      ['accepted', 'delivered'].includes(member.pendingInvite?.deliveryState)
        ? 'Invite sent'
        : 'Link not used',
      'bg-warning-bg text-warning',
    ],
    invite_expired: ['Invitation expired', 'bg-warning-bg text-warning'],
    revoked: ['Removed', 'bg-ink-100 text-ink-600'],
  };
  const [label, tone] = states[member.state] || ['Unavailable', 'bg-ink-100 text-ink-600'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-tiny font-medium ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
const historyLabels = {
  staff_invited: 'Invited',
  staff_link_issued: 'New link issued',
  staff_invite_accepted: 'Joined',
  staff_access_changed: 'Access changed',
  staff_revoked: 'Access revoked',
};
export function TeamHistory({ history }) {
  return history.length ? (
    <ol className="divide-y divide-border">
      {history.map((entry) => (
        <li key={entry.id} className="grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
          <div>
            <p className="text-meta font-semibold text-ink-900">
              {entry.staffName}
              <span className="ml-2 font-normal text-ink-600">
                {historyLabels[entry.action] || entry.action.replaceAll('_', ' ')}
              </span>
            </p>
            <p className="mt-1 text-tiny text-ink-500">
              By{' '}
              {entry.actor === 'you' ? 'you' : entry.actor === 'caretaker' ? 'caretaker' : 'Rentra'}
              {entry.properties != null
                ? ` · ${entry.properties} ${entry.properties === 1 ? 'property' : 'properties'}`
                : ''}
              {entry.evidence != null
                ? entry.evidence
                  ? ' · May record visits'
                  : ' · View only'
                : ''}
            </p>
            {entry.reason ? (
              <p className="mt-2 max-w-[65ch] break-words text-meta text-ink-600">{entry.reason}</p>
            ) : null}
          </div>
          <time className="text-tiny text-ink-500" dateTime={entry.at}>
            {teamDate(entry.at)} IST
          </time>
        </li>
      ))}
    </ol>
  ) : (
    <p className="px-6 py-12 text-center text-meta text-ink-500">
      Invitations and access changes will appear here.
    </p>
  );
}
