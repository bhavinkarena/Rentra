import Link from '@/components/navigation/NavigationLink';
import { staffApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { JoinForm } from '@/components/staff/StaffForms';

export const metadata = { title: 'Join as a caretaker' };

const UNUSABLE = {
  used: 'This link has already been used. If that was you, sign in with your phone.',
  revoked: 'The owner replaced or cancelled this link. Ask them for a new one.',
  expired: 'This link has expired. Ask the owner for a new one.',
  unavailable: 'This owner’s account is not active right now.',
  invalid: 'This link is not valid. Check that you opened the full link.',
};

/** The owner's one-time link. Nothing is granted until the invited phone confirms a code. */
export default async function JoinPage({ params }) {
  const { token } = await params;
  const { data, failure } = await settle(staffApi.invite({ token }));
  if (failure)
    return <PortalState kind={failure} backHref="/staff/login" backLabel="Caretaker sign in" />;
  if (data.state !== 'valid') {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-h2 font-bold text-ink-900">This link cannot be used</h1>
        <p className="text-meta text-ink-700">{UNUSABLE[data.state] ?? UNUSABLE.invalid}</p>
        <Link href="/staff/login" className="font-semibold text-brand-700 underline">
          Caretaker sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-h2 font-bold text-ink-900">
        Join {data.ownerName ?? 'the owner'}’s team
      </h1>
      <p className="text-meta text-ink-700">
        {data.staffName}, you are invited as a caretaker for:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-meta text-ink-800">
        {data.properties.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
      <p className="text-tiny text-ink-500">
        You will see visits for these properties only. You cannot see prices, earnings, owner
        documents or the rest of the team. The link works once and expires{' '}
        {new Date(data.expiresAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        })}{' '}
        IST.
      </p>
      <JoinForm token={token} phoneHint={data.phoneHint} />
    </div>
  );
}
