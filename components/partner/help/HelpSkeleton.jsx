import Skeleton from '@/components/ui/skeleton';
export default function HelpSkeleton({ screen = 'guide' }) {
  const form = screen === 'form' || screen === 'thread';
  if (screen === 'guide') {
    return (
      <section
        aria-busy="true"
        aria-label="Loading help and support"
        className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12"
      >
        <span className="sr-only" role="status">
          Loading help and support
        </span>
        <div className="min-w-0">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="mt-2 h-6 w-full max-w-lg" />
          <Skeleton className="mt-6 h-14 w-full" />
          <div className="mt-7 flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex min-h-20 items-center justify-between gap-4 px-5 py-5"
              >
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <Skeleton className="mt-2 h-4 w-full max-w-md" />
                </div>
                <Skeleton className="size-4 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <aside
          aria-hidden="true"
          className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-8"
        >
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mx-auto mt-4 h-5 w-36" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </aside>
      </section>
    );
  }
  return (
    <section aria-busy="true" aria-label="Loading help and support">
      <span className="sr-only" role="status">
        Loading help and support
      </span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div className="min-w-0">
          {!form && <Skeleton className="mb-6 h-14 w-full" />}
          <div className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-7">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className={form && i === 2 ? 'h-36 w-full' : 'h-11 w-full'} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </section>
  );
}
