import Skeleton from '@/components/ui/skeleton';
export default function ReviewsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading reviews"
      className="mx-auto w-full max-w-(--container-workspace) min-w-0 space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
    >
      <span role="status" className="sr-only">
        Loading reviews
      </span>
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-6 rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-14 w-40" />
        <Skeleton className="h-14 w-28" />
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap justify-between gap-3 border-b border-border p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-52" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4 border-b border-border p-5 sm:p-6">
            <div className="flex gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="space-y-3 sm:ml-14">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
