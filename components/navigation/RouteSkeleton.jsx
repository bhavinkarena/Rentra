export default function RouteSkeleton({ kind = 'table', label = 'Loading your page' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto w-full max-w-(--container-page) px-4 py-8 sm:px-6"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-56 rounded-md bg-ink-100" />
        <div className="h-4 w-72 max-w-full rounded-md bg-ink-100" />
        <div className="h-12 rounded-lg border border-border bg-ink-50" />
        {kind === 'cards' ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border">
                <div className="aspect-4/3 bg-ink-100" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-2/3 rounded bg-ink-100" />
                  <div className="h-4 w-1/2 rounded bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-border p-5">
            {Array.from({ length: kind === 'form' ? 4 : 6 }, (_, i) => (
              <div key={i} className={`${kind === 'form' ? 'h-16' : 'h-10'} rounded bg-ink-100`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
