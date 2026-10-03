import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import OwnerPrivacyForm from '@/components/partner/OwnerPrivacyForm';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
export const metadata = { title: 'Privacy requests', robots: { index: false, follow: false } };
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerPrivacy());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section>
      <SettingsHeading
        title="Privacy"
        description="Manage your account data and follow the progress of your privacy requests."
      />
      <OwnerPrivacyForm blocked={data.deletionBlocked} />
      <section className="mt-9">
        <h2 className="mb-4 text-h3 font-semibold">Your requests</h2>
        {data.requests.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.requests.map((r) => (
              <li key={r.id} className="space-y-3 p-5 text-meta sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {r.kind === 'access' ? 'Account data copy' : 'Account deletion'}
                  </h3>
                  <span className="text-ink-600">{r.state.replaceAll('_', ' ')}</span>
                </div>
                <p className="text-ink-600">
                  Requested{' '}
                  {new Date(r.created_at).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                  })}
                  {r.job_state ? ` / Fulfilment: ${r.job_state.replaceAll('_', ' ')}` : ''}
                </p>
                {r.error_code && (
                  <p className="text-warning">
                    Staff attention is needed. Earlier stages may have completed.
                  </p>
                )}
                {r.export_available && (
                  <a
                    className="inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
                    href={`/partner/settings/privacy/${r.id}/export`}
                  >
                    Download data copy
                  </a>
                )}
                {r.receipt && (
                  <div>
                    <p className="leading-6 text-ink-600">{r.receipt.limitations}</p>
                    <a
                      className="inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
                      href={`/partner/settings/privacy/${r.id}/receipt`}
                    >
                      Download outcome receipt
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-border bg-card p-6 text-meta text-ink-600">
            No requests yet. Your data copy and deletion requests will appear here.
          </p>
        )}
      </section>
    </section>
  );
}
