export default function SearchLoading() {
  return <section className="mx-auto min-h-screen max-w-(--container-page) px-4 py-10 sm:px-6" aria-busy="true">
    <h1 className="text-h1">Find a place</h1>
    <p className="mt-2 text-ink-600">Compare places by location, facilities and your visit dates.</p>
    <p role="status" className="sr-only">Checking places and your selected dates…</p>
    <div aria-hidden="true" className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-19 rounded-md bg-ink-100" />)}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{[0, 1].map(i => <div key={i} className="h-19 rounded-md bg-ink-100" />)}</div>
      <div className="mt-5 h-11 w-28 rounded-full bg-ink-100" />
      <div className="mt-5 h-12 w-44 rounded-full bg-ink-100" />
      <div className="mt-3 h-12 rounded-md bg-ink-50" />
    </div>
    <div aria-hidden="true" className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-4/3 rounded-lg bg-ink-100" />)}</div>
  </section>;
}
