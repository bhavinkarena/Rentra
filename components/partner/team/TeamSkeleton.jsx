import PortalPage from '@/components/portal/PortalPage';
import Skeleton from '@/components/ui/skeleton';

export default function TeamSkeleton({ form = false }) {
  return (
    <PortalPage
      width={form ? 'reading' : 'portal'}
      aria-busy="true"
      aria-label="Loading caretakers"
    >
      <span className="sr-only" role="status">
        Loading caretakers
      </span>
      {form ? <Skeleton className="mb-5 h-11 w-28" /> : null}
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        {!form ? <Skeleton className="h-11 w-44 rounded-md" /> : null}
      </div>
      {form ? (
        <div className="mt-6 space-y-6 rounded-lg border border-border bg-card p-5 sm:p-7">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
          <Skeleton className="h-11 w-36" />
        </div>
      ) : (
        <>
          <Skeleton className="mt-6 h-5 w-72" />
          <div className="mt-5 rounded-lg border border-border bg-card">
            <div className="space-y-5 border-b border-border p-5">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-11 w-full" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-wrap items-center gap-4 border-b border-border p-5">
                <Skeleton className="size-11 rounded-full" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-11 w-28" />
              </div>
            ))}
          </div>
        </>
      )}
    </PortalPage>
  );
}
