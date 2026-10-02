import { EmptyState } from '@/components/ui/empty-state';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import SettingsTabs from '@/components/partner/SettingsTabs';
import OwnerPrivacyForm from '@/components/partner/OwnerPrivacyForm';
export const metadata = { title: 'Privacy requests', robots: { index: false, follow: false } };
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerPrivacy());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <h1 className="text-h1">Privacy</h1>
      <SettingsTabs />
      <OwnerPrivacyForm blocked={data.deletionBlocked} />
      <h2 className="text-h3">Your requests</h2>
      <ul className="space-y-3">
        {data.requests.map((r) => (
          <li key={r.id} className="rounded-lg border p-4 space-y-2">
            <strong>
              {r.kind === 'access' ? 'Account data copy' : 'Account deletion'} ·{' '}
              {r.state.replaceAll('_', ' ')}
            </strong>
            <p>
              {new Date(r.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
            {r.job_state && <p>Fulfillment: {r.job_state.replaceAll('_', ' ')}</p>}
            {r.error_code && <p>Staff attention is needed. Earlier stages may have completed.</p>}
            {r.export_available && (
              <a
                className="min-h-11 inline-flex items-center underline"
                href={`/partner/settings/privacy/${r.id}/export`}
              >
                Download data copy
              </a>
            )}
            {r.receipt && (
              <>
                <p>{r.receipt.limitations}</p>
                <a
                  className="min-h-11 inline-flex items-center underline"
                  href={`/partner/settings/privacy/${r.id}/receipt`}
                >
                  Download outcome receipt
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
      {!data.requests.length && (
        <EmptyState
          variant="compact"
          title="No privacy requests yet"
          description="Your account export and deletion requests appear here."
        />
      )}
    </section>
  );
}
