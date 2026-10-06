import { AdminPage } from './AdminPrimitives';
import Skeleton from '@/components/ui/skeleton';

export default function BookingsLoading({ detail = false }) {
  return (
    <AdminPage>
      <div role="status" aria-busy="true" aria-label="Loading booking records">
        <span className="sr-only">Loading booking records</span>
        <div aria-hidden="true">
          {detail ? <Skeleton className="mb-5 h-4 w-28" /> : null}
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <div className="my-6 flex flex-wrap gap-4 border-b border-border py-4">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-5 w-24" />
            ))}
          </div>
          {!detail ? (
            <div className="mb-6 flex flex-wrap gap-3">
              <Skeleton className="h-11 w-full sm:w-96" />
              <Skeleton className="h-11 w-32" />
            </div>
          ) : null}
          <div
            className={detail ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]' : ''}
          >
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6">
                  <Skeleton className="h-5 w-72 max-w-full" />
                  <Skeleton className="mt-4 h-4 w-48 max-w-full" />
                  <Skeleton className="mt-3 h-4 w-64 max-w-full" />
                </div>
              ))}
            </div>
            {detail ? (
              <div className="rounded-lg border border-border bg-card p-5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-5 h-8 w-40" />
                <Skeleton className="mt-5 h-4 w-full" />
                <Skeleton className="mt-3 h-4 w-full" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
