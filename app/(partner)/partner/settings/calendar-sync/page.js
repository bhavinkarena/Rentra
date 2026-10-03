import OwnerTable from '@/components/partner/OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import SettingsTabs from '@/components/partner/SettingsTabs';
import Link from '@/components/navigation/NavigationLink';
export default async function Page() {
  const owner = await requireClient();
  if (owner.accountStatus !== 'active')
    return (
      <section className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        <h1 className="text-h1">Calendar sync</h1>
        <SettingsTabs />
        <p>Calendar feeds become available after owner verification.</p>
      </section>
    );
  const { data, failure } = await settle(partnerApi.listings());
  if (failure) return <PortalState kind={failure} />;
  const rows = Array.isArray(data) ? data : data.items || data.listings || [];
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <h1 className="text-h1">Calendar sync</h1>
      <SettingsTabs />
      <p>
        Choose a property to create or rotate its private calendar feed. Keep the feed link private.
      </p>
      <OwnerTable
        label="Calendar feeds"
        columns={['Property', 'Status', 'Action']}
        minWidth={520}
        empty={!rows.length ? 'Add a property to sync your calendar.' : null}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="font-semibold">{row.title}</td>
            <td className="capitalize">{row.status.replaceAll('_', ' ')}</td>
            <td>
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800"
                href={`/partner/listings/${row.id}/booking-rules`}
              >
                Manage feed
              </Link>
            </td>
          </tr>
        ))}
      </OwnerTable>
      {!rows.length && (
        <EmptyState
          title="Add a property to sync your calendar"
          description="Share occupied dates with your calendar app using a private feed."
          actionHref="/partner/listings"
          actionLabel="Add property"
        />
      )}
    </section>
  );
}
