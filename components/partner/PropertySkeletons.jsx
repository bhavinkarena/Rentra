import Skeleton from '@/components/ui/skeleton';

export function PortfolioSkeleton({ label = 'Loading your properties' }) {
  return (
    <div
      className="mx-auto w-full max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        {label}
      </span>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-6 w-80 max-w-full sm:w-[560px]" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
      <div className="mt-7 flex items-center justify-between">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-28" />
        </div>
        <Skeleton className="hidden h-4 w-44 sm:block" />
      </div>
      <div className="mt-4 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex gap-1 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-11 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 min-w-0 flex-1 rounded-full" />
          <Skeleton className="h-12 w-24 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="overflow-hidden rounded-lg border border-border bg-card">
            <Skeleton className="aspect-[8/5] w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-full" />
              <Skeleton className="mt-2 h-5 w-36" />
              <Skeleton className="mt-4 h-4 w-40" />
              <Skeleton className="mt-4 h-1 w-full" />
              <Skeleton className="mt-5 h-5 w-48" />
              <Skeleton className="mt-3 h-11 w-full rounded-full" />
              <Skeleton className="mt-3 h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between border-t border-border py-5">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}

export function PropertyOverviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading property overview
      </span>
      <Skeleton className="h-5 w-60" />
      <Skeleton className="mt-5 h-52 w-full rounded-lg sm:h-72 lg:h-80" />
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
      <div className="mt-5 flex gap-3 overflow-hidden border-b border-border pb-3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Skeleton key={n} className="h-8 w-20 shrink-0" />
        ))}
      </div>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-6 w-44" />
            <div className="mt-7 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((n) => (
                <div key={n}>
                  <Skeleton className="h-1.5 w-full" />
                  <Skeleton className="mt-2 h-4 w-14" />
                  <Skeleton className="mt-1 h-4 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-5 h-6 w-full" />
            <Skeleton className="mt-4 h-11 w-36 rounded-full" />
          </div>
          <div className="grid grid-cols-2 rounded-lg border border-border bg-card sm:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="p-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-6 w-12" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-full" />
            {[0, 1].map((n) => (
              <div
                key={n}
                className="flex items-center justify-between gap-3 border-t border-border py-5 first:mt-5"
              >
                <div>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-6 h-8 w-full" />
            <Skeleton className="mt-3 h-2 w-full" />
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="mt-4 h-5 w-3/4" />
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-6 h-11 w-44 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
