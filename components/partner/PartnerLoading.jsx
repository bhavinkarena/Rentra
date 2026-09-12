import { RentraMark } from '@/components/rentra/Logo';

function Skeleton({ className = '' }) {
  return <span className={`rentra-skeleton block rounded-sm bg-ink-100 ${className}`} aria-hidden="true" />;
}

export function RentraLoader({ label = 'Opening your Rentra workspace…', inverse = false }) {
  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <div className="relative grid size-20 place-items-center">
        <span
          className={`rentra-loader-orbit absolute inset-0 rounded-full border-2 border-transparent ${
            inverse ? 'border-t-brand-300 border-r-white/15' : 'border-t-brand-600 border-r-brand-100'
          }`}
          aria-hidden="true"
        />
        <span className={`grid size-14 place-items-center rounded-xl shadow-sm ${inverse ? 'bg-white/8' : 'bg-white ring-1 ring-brand-100'}`}>
          <RentraMark tone={inverse ? 'inverse' : 'brand'} className="size-9" />
        </span>
      </div>
      <p className={`mt-4 text-meta font-semibold ${inverse ? 'text-white' : 'text-ink-800'}`}>{label}</p>
      <p className={`mt-1 text-tiny ${inverse ? 'text-white/45' : 'text-ink-500'}`}>Your data is on its way.</p>
    </div>
  );
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
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,2fr)_1fr_0.8fr] items-center gap-6 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_1fr_0.8fr_0.8fr]">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="mt-2 h-2.5 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-8 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading your dashboard</span>
      <LoadingHeader />
      <KpiSkeletons />
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TableSkeleton rows={5} />
        <div className="hidden space-y-5 xl:block">
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-6 w-20" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
            <Skeleton className="mt-4 h-2 w-5/6 rounded-full" />
            <Skeleton className="mt-4 h-2 w-4/6 rounded-full" />
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="mt-4 h-4 w-4/5" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertiesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading your properties</span>
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
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading settings and payouts</span>
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
      <span className="sr-only" role="status">Loading the property workspace</span>
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
      <span className="sr-only" role="status">Loading your verification step</span>
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
      <span className="sr-only" role="status">Loading the guided property setup</span>
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
          <aside className="hidden rounded-xl border border-border bg-card p-4 shadow-xs lg:block">
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

          <div className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:p-10">
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
