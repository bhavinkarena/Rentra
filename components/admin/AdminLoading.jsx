import ScreenSkeleton from '@/components/loading/ScreenSkeleton';
import Skeleton from '@/components/ui/skeleton';
import { AdminPage } from './AdminPrimitives';

export default function AdminLoading({ label = 'workspace', screen = 'table' }) {
  if (['applications', 'properties', 'payments', 'people'].includes(screen))
    return (
      <AdminPage>
        <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
          <span className="sr-only">Loading {label}</span>
          <div aria-hidden="true" className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            {['applications', 'properties'].includes(screen) ? (
              <div
                className={`grid gap-3 ${screen === 'properties' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'}`}
              >
                {(screen === 'properties' ? [0, 1, 2] : [0, 1, 2, 3]).map((key) => (
                  <div key={key} className="space-y-4 rounded-lg border border-border bg-card p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-4 rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap gap-3">
                {[0, 1, 2].map((key) => (
                  <Skeleton key={key} className="h-11 w-28" />
                ))}
              </div>
              <Skeleton className="h-11 w-64 max-w-full" />
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Skeleton className="h-12 w-full rounded-none" />
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="flex gap-4 border-t border-border p-5">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminPage>
    );
  return <ScreenSkeleton screen={screen} layout="portal" label={`Loading ${label}`} />;
}
