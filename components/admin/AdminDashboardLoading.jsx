import Skeleton from '@/components/ui/skeleton';
import { AdminPage } from './AdminPrimitives';

export default function AdminDashboardLoading({ view = 'overview' }) {
  return (
    <AdminPage>
      <div role="status" aria-busy="true" aria-label="Loading dashboard">
        <span className="sr-only">Loading dashboard</span>
        <div aria-hidden="true">
          <Skeleton className="h-9 w-52 max-w-full" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <div className="mt-6 flex gap-6 border-b border-border py-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          <div className="mt-5 mb-8 flex flex-wrap gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-28" />
            ))}
          </div>
          <div
            className={
              view === 'overview'
                ? 'grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]'
                : view === 'activity'
                  ? 'grid gap-8 xl:grid-cols-2'
                  : ''
            }
          >
            {(view === 'analytics' ? [0] : [0, 1]).map((i) => (
              <div key={i} className="min-w-0">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="mt-2 mb-4 h-4 w-72 max-w-full" />
                <div className="rounded-lg border border-border bg-card">
                  {[0, 1, 2, 3].map((r) => (
                    <div key={r} className="space-y-3 border-b border-border p-6 last:border-0">
                      <Skeleton className="h-4 w-56 max-w-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {view === 'overview' ? (
            <>
              <Skeleton className="mt-10 h-6 w-48" />
              <div className="mt-4 space-y-6 rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
