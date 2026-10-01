import { BookingHistory } from '@/components/customer/BookingRecords';
import { customerApi, discoveryApi } from '@/lib/api/endpoints';
import { VERTICAL_UI } from '@/lib/domain/vertical-ui';
import MeasuredView from '@/components/customer/MeasuredView';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  const [data, registry] = await Promise.all([
    customerApi.records(await searchParams),
    discoveryApi.registry().catch(() => null),
  ]);
  // The empty state links each public home (Farmhouse, Entertainment).
  const homes = (registry?.verticals ?? []).map((v) => ({
    label: VERTICAL_UI[v.code]?.explore ?? `Explore ${v.name}`,
    href: VERTICAL_UI[v.code]?.path ?? '/',
  }));
  return (
    <>
      <MeasuredView event="history_viewed" />
      <BookingHistory base="/bookings" data={data} homes={homes} />
    </>
  );
}
