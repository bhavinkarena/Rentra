import Skeleton from '@/components/ui/skeleton';

export default function EarningsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading earnings" className="space-y-5">
      <span role="status" className="sr-only">
        Loading earnings
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="contents">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="col-span-2 row-start-2 h-4 w-80" />
        </div>
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${i ? 'hidden sm:block' : ''} space-y-2`}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <div className="flex justify-between gap-4 sm:hidden">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-28 rounded-full" />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-56" />
              <Skeleton className="h-3 w-60" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-7 h-36 w-full sm:h-40" />
            <Skeleton className="mt-4 h-3 w-64" />
          </div>
          <Skeleton className="mt-5 h-16 w-full" />
        </div>
        <div className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6 [&>span:not(:first-child)]:hidden xl:[&>span:not(:first-child)]:block">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="space-y-2 p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-3 border-t border-border p-5 sm:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
