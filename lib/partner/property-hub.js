import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';

/** What every property-hub tab reads: the listing, its operations overview and the list it came from. */
export async function loadPropertyHub({ params, searchParams }) {
  const user = await requireClient();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/partner/listings');
  const [listing, ops] = await Promise.all([
    settle(partnerApi.listing(id)),
    settle(partnerApi.overview(id)),
  ]);
  const overview = ops.data;
  return {
    user,
    id,
    query,
    listHref,
    failure: listing.failure,
    data: listing.data,
    overview,
    opsFailure: ops.failure,
    hub: listing.data
      ? {
          listing: listing.data.listing,
          photos: listing.data.photos,
          listHref,
          publicPath: overview?.publicPath ?? null,
          upcoming: overview?.upcomingVisits.total ?? 0,
          pausedUntil: overview?.pausedUntil ?? null,
          ownerApproved: user.accountStatus === 'active',
        }
      : null,
  };
}
