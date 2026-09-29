import Link from '@/components/navigation/NavigationLink';
import { customerApi } from '@/lib/api/endpoints';
import { PrivacyForm } from '@/components/customer/AccountForms';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldCheck } from 'lucide-react';
export const metadata = { title: 'Privacy requests' };
export default async function PrivacyPage() {
  const account = await customerApi.account();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: '/account', label: 'Account' }}
        title="Privacy and account requests"
      />
      <section
        aria-labelledby="new-privacy-request"
        className="rounded-lg border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="new-privacy-request" className="mb-4 text-h4">
          New request
        </h2>
        <PrivacyForm />
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
          href="/policies/privacy"
        >
          Privacy and retained-record policy
        </Link>
      </section>
      <section className="mt-10">
        <h2 className="text-h3">Your requests</h2>
        {account.requests.length ? (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {account.requests.map((r) => (
              <li key={r.id} className="space-y-1 p-4 text-meta">
                <p className="flex flex-wrap items-center gap-2 text-body font-semibold">
                  {r.kind === 'access' ? 'Account data copy' : 'Account deletion'}
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-tiny font-semibold text-ink-700 capitalize">
                    {r.state.replaceAll('_', ' ')}
                  </span>
                </p>
                <p className="font-mono text-tiny break-all text-ink-500">Reference: {r.id}</p>
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
          <EmptyState as="h3" icon={ShieldCheck} title="You have no recorded privacy requests." />
        )}
      </section>
    </div>
  );
}
