import Skeleton from '@/components/ui/skeleton';
import { AdminPage } from './AdminPrimitives';

export default function FinanceLoading({ label = 'Finance', view = 'list' }) {
  return (
    <AdminPage>
      <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
        <span className="sr-only">Loading {label}</span>
        <div aria-hidden="true" className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          {view !== 'overview' ? (
            <div className="flex flex-wrap gap-3 border-b border-border pb-5">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-11 w-28" />
              ))}
            </div>
          ) : null}
          <div
            className={view === 'overview' ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]' : ''}
          >
            <div className="space-y-6">
              {(view === 'overview' ? [0, 1] : [0]).map((panel) => (
                <div
                  key={panel}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <Skeleton className="m-5 h-6 w-40" />
                  {(view === 'overview' ? [0] : [0, 1, 2]).map((key) => (
                    <div key={key} className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-48 max-w-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {view === 'overview' ? (
              <div className="mt-6 space-y-6 border-t border-border pt-5 xl:mt-0">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-14 w-full" />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
