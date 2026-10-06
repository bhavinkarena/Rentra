import Skeleton from '@/components/ui/skeleton';
import { AdminPage } from './AdminPrimitives';

export default function ApplicationsLoading({ detail = false }) {
  return (
    <AdminPage>
      <div role="status" aria-busy="true" aria-label="Loading owner applications">
        <span className="sr-only">Loading owner applications</span>
        <div aria-hidden="true">
          {detail ? <Skeleton className="mb-4 h-4 w-32" /> : null}
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <div className="mt-6 flex flex-wrap gap-6 border-y border-border py-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-28" />
            ))}
          </div>
          {!detail ? (
            <div className="my-5 flex flex-wrap gap-3">
              <Skeleton className="h-16 w-64 max-w-full" />
              <Skeleton className="h-16 w-44" />
              <Skeleton className="h-11 w-28" />
            </div>
          ) : null}
          <div className={`mt-6 grid gap-8 ${detail ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 border-b border-border p-6 last:border-0">
                  <Skeleton className="h-5 w-64 max-w-full" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            {detail ? (
              <div className="space-y-4 rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-11 w-40" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
