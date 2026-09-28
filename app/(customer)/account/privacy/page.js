import Link from '@/components/navigation/NavigationLink';
import { customerApi } from '@/lib/api/endpoints';
import { PrivacyForm } from '@/components/customer/AccountForms';
export const metadata = { title: 'Privacy requests' };
export default async function PrivacyPage() {
  const account = await customerApi.account();
  return (
    <div className="space-y-6">
      <Link href="/account" className="text-brand-700 underline">
        Back to account
      </Link>
      <h1 className="text-h1">Privacy and account requests</h1>
      <PrivacyForm />
      <p>
        <Link className="text-brand-700 underline" href="/policies/privacy">
          Privacy and retained-record policy
        </Link>
      </p>
      <section>
        <h2 className="text-h3">Your requests</h2>
        {account.requests.length ? (
          <ul className="mt-4 space-y-3">
            {account.requests.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-4">
                <p className="font-semibold">
                  {r.kind === 'access' ? 'Account data copy' : 'Account deletion'} ·{' '}
                  {r.state.replace('_', ' ')}
                </p>
                <p className="mt-1 break-all text-meta">Reference: {r.id}</p>
                <p className="text-meta">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                {r.jobState && (
                  <p>
                    Fulfillment: {r.jobState.replaceAll('_', ' ')} · checkpoint {r.stage}
                  </p>
                )}
                {r.errorCode && (
                  <p>
                    Some stages need staff attention. Earlier stages may already have completed.
                  </p>
                )}
                {r.receipt && (
                  <>
                    <p>{r.receipt.limitations}</p>
                    <a
                      className="inline-flex min-h-11 items-center text-brand-700 underline"
                      href={`/account/privacy/${r.id}/receipt`}
                    >
                      Download outcome receipt
                    </a>
                  </>
                )}
                {r.exportAvailable && (
                  <>
                    <p>Data copy expires: {new Date(r.expiresAt).toLocaleString('en-IN')}</p>
                    <a
                      className="inline-flex min-h-11 items-center text-brand-700 underline"
                      href={`/account/privacy/${r.id}/export`}
                    >
                      Download scoped data copy
                    </a>
                  </>
                )}
                {r.kind === 'access' && r.state === 'closed' && !r.exportAvailable && (
                  <p>This data copy has expired or was revoked. Request a new copy if needed.</p>
                )}
                <Link
                  className="inline-flex min-h-11 items-center text-brand-700 underline"
                  href={`/support/new?privacy=${r.id}&topic=privacy`}
                >
                  Ask about this privacy request
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-ink-600">You have no recorded privacy requests.</p>
        )}
      </section>
    </div>
  );
}
