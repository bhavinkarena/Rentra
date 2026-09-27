export default function QuoteLoading() {
  return (
    <div role="status" aria-label="Updating availability and price" className="space-y-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-brand-700">
        <span
          aria-hidden="true"
          className="size-3.5 rounded-full border-2 border-brand-200 border-t-brand-600 motion-safe:animate-spin"
        />
        Updating your booking…
      </div>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center justify-between">
            <span className="h-3 w-32 rounded bg-ink-100" />
            <span className="h-3 w-14 rounded bg-ink-100" />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="h-4 w-16 rounded bg-ink-100" />
          <span className="h-5 w-24 rounded bg-ink-100" />
        </div>
        <div className="h-20 rounded-xl bg-ink-50" />
        <div className="h-12 rounded-xl bg-brand-100" />
        <div className="mx-auto h-3 w-36 rounded bg-ink-100" />
      </div>
    </div>
  );
}
