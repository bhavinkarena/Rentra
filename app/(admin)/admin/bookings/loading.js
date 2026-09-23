function Block({ className = '' }) {
  return (
    <span className={`block animate-pulse rounded bg-ink-100 ${className}`} aria-hidden="true" />
  );
}

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      role="status"
      aria-label="Loading booking records"
    >
      <Block className="h-3 w-28" />
      <Block className="mt-3 h-9 w-64" />
      <Block className="mt-3 h-4 w-full max-w-xl" />

      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex justify-between gap-3">
              <Block className="h-3 w-24" />
              <Block className="size-9" />
            </div>
            <Block className="mt-3 h-8 w-12" />
            <Block className="mt-3 hidden h-3 w-32 sm:block" />
          </div>
        ))}
      </section>

      <section
        className="mt-6 overflow-hidden rounded-lg border border-border bg-card"
        aria-hidden="true"
      >
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Block className="h-5 w-40" />
              <Block className="mt-2 h-3 w-64" />
            </div>
            <Block className="h-11 w-full max-w-xl" />
          </div>
          <div className="mt-5 flex gap-5">
            <Block className="h-8 w-24" />
            <Block className="h-8 w-20" />
            <Block className="h-8 w-14" />
            <Block className="h-8 w-20" />
          </div>
        </div>
        <div className="bg-ink-25 px-5 py-3">
          <Block className="h-3 w-full" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-6 px-5 py-4"
            >
              <div>
                <Block className="h-4 w-44" />
                <Block className="mt-2 h-3 w-28" />
              </div>
              <Block className="h-4 w-20" />
              <div>
                <Block className="h-4 w-16" />
                <Block className="mt-2 h-3 w-24" />
              </div>
              <Block className="h-7 w-20 rounded-full" />
              <Block className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-border px-5 py-4">
          <Block className="h-4 w-40" />
          <Block className="h-9 w-20" />
        </div>
      </section>
      <span className="sr-only">Loading booking records…</span>
    </div>
  );
}
