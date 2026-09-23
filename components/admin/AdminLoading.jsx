function Block({ className = '' }) {
  return (
    <span className={`block animate-pulse rounded bg-ink-100 ${className}`} aria-hidden="true" />
  );
}

export default function AdminLoading({
  cards = 4,
  rows = 6,
  detail = false,
  label = 'admin page',
}) {
  return (
    <div
      className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      role="status"
      aria-label={`Loading ${label}`}
    >
      <Block className="h-3 w-28" />
      <Block className="mt-3 h-9 w-64" />
      <Block className="mt-3 h-4 w-full max-w-xl" />
      <div
        className={`mt-7 grid grid-cols-2 gap-3 ${cards > 2 ? 'xl:grid-cols-4' : ''}`}
        aria-hidden="true"
      >
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5">
            <div className="flex justify-between">
              <Block className="h-3 w-24" />
              <Block className="size-9" />
            </div>
            <Block className="mt-3 h-8 w-12" />
            <Block className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div
        className={`mt-6 ${detail ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}
        aria-hidden="true"
      >
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-5">
            <Block className="h-5 w-44" />
            <Block className="mt-2 h-3 w-64" />
          </div>
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="border-b border-border px-5 py-4 last:border-0">
              <Block className="h-4 w-2/3" />
              <Block className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </section>
        {detail ? (
          <section className="rounded-lg border border-border bg-card p-5">
            <Block className="h-5 w-32" />
            {Array.from({ length: 5 }, (_, i) => (
              <Block key={i} className="mt-4 h-10 w-full" />
            ))}
          </section>
        ) : null}
      </div>
      <span className="sr-only">Loading {label}…</span>
    </div>
  );
}
