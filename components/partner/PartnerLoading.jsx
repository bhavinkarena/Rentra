import BrandLoader from '@/components/ui/rentra-loader';

import Skeleton from '@/components/ui/skeleton';

export function RentraLoader({ label = 'Opening your workspace', inverse = false }) {
  return <BrandLoader variant="page" label={label} inverse={inverse} />;
}

export function FullScreenRentraLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-950 px-6">
      <RentraLoader inverse />
    </div>
  );
}

function LoadingHeader({ narrow = false }) {
  return (
    <div className={`flex items-end justify-between gap-5 ${narrow ? 'max-w-3xl' : ''}`}>
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-full max-w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="hidden h-11 w-36 sm:block" />
    </div>
  );
}

function KpiSkeletons() {
  return (
    <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border border-border bg-card p-5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="size-10 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-3 h-3 w-36 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-44" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="border-b border-border bg-ink-25/80 px-5 py-3">
        <Skeleton className="hidden h-3 w-2/3 sm:block" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_80px] items-center gap-6 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_1fr_0.8fr_0.8fr]"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="mt-2 h-2.5 w-1/2" />
              </div>
            </div>
            <Skeleton className="hidden h-3 w-2/3 sm:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-8 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Dashboard skeleton mirrors the bento in OwnerToday: same grid, spans, tile padding and heights. */
const onDark = { background: 'rgb(255 255 255 / 0.1)' };
const darkSweep = { '--skeleton-highlight': 'rgb(255 255 255 / 0.06)' };

function TileSkeleton({ className = '', action = true, children }) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        {action ? <Skeleton className="h-4 w-16" /> : null}
      </div>
      {children}
    </div>
  );
}

function RowSkeletons({ rows, lead = 'size-9 rounded-md', trail = 'h-11 w-20', stack = false }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`flex gap-3 py-3 ${stack ? 'items-start sm:items-center' : 'items-center'}`}
        >
          <Skeleton className={`shrink-0 ${lead}`} />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-4/5" />
            {stack ? <Skeleton className="mt-2 h-3.5 w-3/5 sm:hidden" /> : null}
            <Skeleton className="mt-2 h-3 w-2/5" />
            {stack && trail ? <Skeleton className={`mt-2 sm:hidden ${trail}`} /> : null}
          </div>
          {trail ? (
            <Skeleton className={`shrink-0 ${stack ? 'hidden sm:block' : ''} ${trail}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Loading your dashboard
      </span>
      {/* Greeting header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <Skeleton className="h-9 w-72 max-w-full sm:w-80" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <Skeleton className="mt-2 h-4 w-40 sm:hidden" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-12">
        {/* Today */}
        <div
          className="flex min-w-0 flex-col rounded-lg bg-brand-900 p-5 sm:p-6 lg:col-span-7"
          style={darkSweep}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div>
              <Skeleton className="h-6 w-20" style={onDark} />
              <Skeleton className="mt-2 h-3.5 w-44" style={onDark} />
            </div>
            <Skeleton className="h-4 w-24" style={onDark} />
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-forest-line rounded-md border border-forest-line">
            {[0, 1, 2].map((item) => (
              <div key={item} className="px-4 py-3 sm:px-5">
                <Skeleton className="h-3.5 w-16" style={onDark} />
                <Skeleton className="mt-2 h-7 w-8" style={onDark} />
              </div>
            ))}
          </div>
          <div className="mt-3 divide-y divide-forest-line">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 py-3">
                <Skeleton className="hidden h-4 w-16 shrink-0 sm:block" style={onDark} />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40 max-w-full" style={onDark} />
                  <Skeleton className="mt-2 h-3.5 w-28 sm:hidden" style={onDark} />
                  <Skeleton className="mt-2 h-3.5 w-56 max-w-full" style={onDark} />
                </div>
                <Skeleton className="h-11 w-24 shrink-0" style={onDark} />
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-forest-line pt-4">
            <Skeleton className="h-3.5 w-64 max-w-full" style={onDark} />
            <Skeleton className="mt-2 h-3.5 w-36 sm:hidden" style={onDark} />
          </div>
        </div>

        {/* Needs you */}
        <TileSkeleton className="lg:col-span-5">
          <RowSkeletons rows={3} stack />
        </TileSkeleton>

        {/* Booked rent */}
        <div className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-3 h-9 w-48" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-48" />
              <Skeleton className="size-11" />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="relative mt-3 pb-7 pl-11">
            <div className="h-52 border-b border-ink-200 sm:h-60">
              <Skeleton className="h-full w-full rounded-sm opacity-60" />
            </div>
            <div className="absolute right-0 bottom-0 left-11 flex justify-between">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-3 w-9" />
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-5 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-7 h-4 w-28" />
          <Skeleton className="mt-6 h-3 w-64 max-w-full" />
        </div>

        {/* Next 7 days */}
        <TileSkeleton className="lg:col-span-4">
          <Skeleton className="h-7 w-40" />
          <div className="mt-4 grid grid-cols-7 gap-1">
            {[60, 30, 8, 45, 30, 80, 100].map((height, index) => (
              <div key={index} className="flex flex-col items-center px-0.5 pt-1 pb-2">
                <div className="mt-5 flex h-32 w-full items-end justify-center">
                  <Skeleton
                    className="w-full max-w-6 rounded-t-[4px] rounded-b-none"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <Skeleton className="mt-2 h-3 w-7" />
              </div>
            ))}
          </div>
          <div className="mt-4 divide-y divide-border border-t border-border">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 py-3">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3.5 w-4" />
              </div>
            ))}
          </div>
        </TileSkeleton>

        {/* Properties */}
        <TileSkeleton className="lg:col-span-8">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-3 p-2">
                <Skeleton className="size-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2 h-6 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </TileSkeleton>

        {/* Latest updates */}
        <TileSkeleton className="lg:col-span-4">
          <RowSkeletons rows={3} lead="size-2 rounded-full" trail={null} />
        </TileSkeleton>

        {/* Upcoming & recent bookings */}
        <TileSkeleton className="lg:col-span-8 lg:self-start">
          <RowSkeletons rows={3} lead="size-10 rounded-full" trail="h-4 w-16" />
        </TileSkeleton>

        {/* Booking outcomes */}
        <TileSkeleton className="lg:col-span-4 lg:self-start" action={false}>
          <Skeleton className="h-7 w-44" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-14" />
                </div>
                <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </TileSkeleton>
      </div>
    </div>
  );
}

export function PropertiesSkeleton({ label = 'Loading your properties' } = {}) {
  return (
    <div
      className="mx-auto w-full max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        {label}
      </span>
      <LoadingHeader />
      <KpiSkeletons />
      <div className="mt-6">
        <TableSkeleton rows={7} />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Loading settings and payouts
      </span>
      <LoadingHeader narrow />
      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {[0, 1].map((card) => (
            <div key={card} className="rounded-lg border border-border bg-card p-6">
              <div className="flex gap-3 border-b border-border pb-4">
                <Skeleton className="size-10 shrink-0 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                </div>
              </div>
              <Skeleton className="mt-5 h-3 w-24" />
              <Skeleton className="mt-2 h-11 w-full" />
              <Skeleton className="mt-5 h-3 w-28" />
              <Skeleton className="mt-2 h-11 w-full" />
              <Skeleton className="mt-5 h-10 w-28" />
            </div>
          ))}
        </div>
        <div className="hidden rounded-lg border border-border bg-card p-5 lg:block">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-5 h-12 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the property workspace
      </span>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-6 h-9 w-72 max-w-full" />
      <div className="mt-5 rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <Skeleton className="mt-4 h-3 w-4/5" />
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="mt-5 rounded-lg border border-border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-3 w-3/4" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading your verification step
      </span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-7 h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      <div className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-11 w-full" />
        <Skeleton className="mt-5 h-3 w-36" />
        <Skeleton className="mt-2 h-11 w-full" />
        <Skeleton className="mt-6 h-11 w-36" />
      </div>
    </div>
  );
}

export function WizardSkeleton() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-25" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the guided property setup
      </span>
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-4 px-4 py-2.5 sm:px-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="ml-auto hidden h-3 w-28 md:block" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex gap-1.5 px-4 pb-2.5 sm:px-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-[1180px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
          <aside className="hidden rounded-lg border border-border bg-card p-4 lg:block">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10" />
            </div>
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
            {[0, 1, 2, 3, 4].map((chapter) => (
              <div key={chapter} className="mt-5">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="mt-2 h-8 w-full" />
                <Skeleton className="mt-1 h-8 w-5/6" />
              </div>
            ))}
          </aside>

          <div className="overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-8 lg:p-10">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-3 h-9 w-80 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />
            <div className="mt-8 border-b border-border pb-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-2 h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="mt-5 h-3 w-24" />
            <Skeleton className="mt-2 h-12 w-full" />
            <Skeleton className="mt-5 h-3 w-32" />
            <Skeleton className="mt-2 h-12 w-full" />
            <Skeleton className="mt-5 h-3 w-28" />
            <Skeleton className="mt-2 h-28 w-full" />
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 lg:pl-[284px]">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="ml-auto h-11 w-40 rounded-full" />
        </div>
      </footer>
    </div>
  );
}

export function PreparingWorkspaceLoader() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-6">
      <RentraLoader label="Preparing your property workspace…" />
    </div>
  );
}
