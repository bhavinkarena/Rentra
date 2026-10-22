import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { BetaGuests } from '@/components/catalogues/Catalogues';

export const metadata = { title: 'Hotel beta', robots: { index: false, follow: false } };

export default async function Page() {
  const { data, failure } = await settle(
    api.get('/admin/catalogues/verticals/hotel/beta', { cache: 'no-store' }),
  );
  if (failure) return <PortalState kind={failure} />;
  return <BetaGuests data={data} />;
}
