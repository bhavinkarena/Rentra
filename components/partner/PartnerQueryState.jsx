import PortalState from '@/components/portal/PortalState';
import InlineAlert from '@/components/portal/InlineAlert';
import ScreenSkeleton from '@/components/loading/ScreenSkeleton';
import { PropertiesSkeleton } from './PartnerLoading';
export function isAccessFailure(error) {
  return [401, 403, 'PORTAL_REDIRECT'].includes(error?.status);
}
export default function PartnerQueryState({
  queries,
  children,
  screen = 'bookings',
  label = 'Loading your bookings',
}) {
  if (queries.some((q) => isAccessFailure(q.error)))
    return (
      <PortalState
        kind={queries.some((q) => q.error?.status === 403) ? 'forbidden' : 'unavailable'}
        title="Your access changed"
        description="Sign in again or reopen this page to check your access."
        backHref="/partner/login"
        backLabel="Sign in again"
      />
    );
  if (queries.some((q) => !q.currentData?.data)) {
    const failed = queries.some((q) => q.isError);
    if (!failed)
      return screen === 'properties' ? (
        <PropertiesSkeleton label={label} />
      ) : (
        <ScreenSkeleton screen={screen} label={label} />
      );
    return <PortalState onRetry={() => queries.forEach((q) => q.refetch())} />;
  }
  return (
    <>
      {queries.some((q) => q.isError) ? (
        <InlineAlert className="mx-6 mt-4">
          Could not refresh these records. Showing the last loaded version.{' '}
          <button className="underline" onClick={() => queries.forEach((q) => q.refetch())}>
            Retry
          </button>
        </InlineAlert>
      ) : queries.some((q) => q.isFetching) ? (
        <p role="status" className="px-6 pt-4 text-sm">
          Updating…
        </p>
      ) : null}
      {children}
    </>
  );
}
