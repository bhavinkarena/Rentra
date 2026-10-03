import OwnerTable from '@/components/partner/OwnerTable';
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
      <OwnerTable
        label="Privacy requests"
        columns={['Request', 'Status', 'Created', 'Fulfillment', 'Downloads']}
        empty={!data.requests.length ? 'No privacy requests yet.' : null}
      >
        {data.requests.map((request) => (
          <tr key={request.id}>
            <td className="font-semibold">
              {request.kind === 'access' ? 'Account data copy' : 'Account deletion'}
            </td>
            <td>{request.state.replaceAll('_', ' ')}</td>
            <td className="whitespace-nowrap">
              {new Date(request.created_at).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}
            </td>
            <td>
              {request.job_state?.replaceAll('_', ' ') || '—'}
              {request.error_code && (
                <p>Staff attention is needed. Earlier stages may have completed.</p>
              )}
            </td>
            <td>
              {request.export_available && (
                <a
                  className="inline-flex min-h-11 items-center text-brand-800 underline"
                  href={`/partner/settings/privacy/${request.id}/export`}
                >
                  Download data copy
                </a>
              )}
              {request.receipt && (
                <>
                  <p className="text-tiny">{request.receipt.limitations}</p>
                  <a
                    className="inline-flex min-h-11 items-center text-brand-800 underline"
                    href={`/partner/settings/privacy/${request.id}/receipt`}
                  >
                    Download outcome receipt
                  </a>
                </>
              )}
            </td>
          </tr>
        ))}
      </OwnerTable>
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
