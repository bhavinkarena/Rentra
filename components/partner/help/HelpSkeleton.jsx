import Skeleton from '@/components/ui/skeleton';
export default function HelpSkeleton({ screen = 'guide' }) {
  const form = screen === 'form' || screen === 'thread';
  return (
    <section aria-busy="true" aria-label="Loading help and support">
      <span className="sr-only" role="status">
        Loading help and support
      </span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
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
