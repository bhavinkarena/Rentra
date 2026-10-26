import Link from '@/components/navigation/NavigationLink';
import PortalState from '@/components/portal/PortalState';
import { CommissionRules } from '@/components/admin/HotelFinance';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Hotel commission', robots: { index: false, follow: false } };

export default async function Page() {
  const { data, failure } = await settle(adminApi.hotelCommission());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return (
    <>
      <p
        role="note"
        className="mx-auto mt-6 max-w-5xl rounded-md bg-warning-bg p-4 text-meta text-warning"
      >
        Hotel commission is retired: new stays pay the guest Rentra service fee instead. These rules
        stay as history for stays booked under them and can only be ended.{' '}
        <Link className="underline" href="/admin/finance/service-fee">
          Set the service fee
        </Link>
      </p>
      <CommissionRules data={data} />
    </>
  );
}
