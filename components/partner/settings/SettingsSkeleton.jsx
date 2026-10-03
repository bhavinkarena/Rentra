'use client';
import { usePathname } from 'next/navigation';
import Skeleton from '@/components/ui/skeleton';
import PortalPage from '@/components/portal/PortalPage';
export default function SettingsSkeleton({ shell = false }) {
  const overview = usePathname() === '/partner/settings';
  const content = (
    <section aria-busy="true" aria-label="Loading settings">
      <span role="status" className="sr-only">
        Loading settings
      </span>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80" />
      {overview ? (
        <>
          <div className="mt-7 flex items-center gap-4 border-y border-border py-6">
            <Skeleton className="size-14 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="mt-9 grid gap-8 xl:grid-cols-2">
            {[0, 1].map((g) => (
              <div key={g}>
                <Skeleton className="mb-4 h-6 w-32" />
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-3 p-6">
                      <Skeleton className="h-5 w-44" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-7 space-y-6 rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-6 w-48" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-36" />
        </div>
      )}
    </section>
  );
  return shell ? (
    <PortalPage>
      {overview ? (
        content
      ) : (
        <>
          <Skeleton className="mb-6 h-11 w-28" />
          <div className="grid gap-7 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="hidden h-12 w-full lg:block" />
              ))}
              <Skeleton className="h-12 w-full lg:hidden" />
            </div>
            {content}
          </div>
        </>
      )}
    </PortalPage>
  ) : (
    content
  );
}
