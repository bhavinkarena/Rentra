import PortalState from '@/components/portal/PortalState';
import { HotelPayouts } from '@/components/admin/HotelPayouts';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Hotel payouts', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const { environment } = await searchParams;
  const query = ['live', 'test'].includes(environment) ? { environment } : {};
  const [preview, runs] = await Promise.all([
    settle(adminApi.hotelPayoutPreview(query)),
    settle(adminApi.hotelPayoutRuns()),
  ]);
  const failure = preview.failure ?? runs.failure;
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <HotelPayouts preview={preview.data} runs={runs.data} />;
}
