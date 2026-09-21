import Link from 'next/link';

export function AdminPage({ children, width = 'max-w-[1480px]' }) {
  return <div className={`mx-auto w-full ${width} px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>{children}</div>;
}

export function AdminPageHeader({ eyebrow, title, description, action, backHref, backLabel = 'Back' }) {
  return (
    <header>
      {backHref ? <Link href={backHref} className="mb-4 inline-flex min-h-9 items-center text-tiny font-semibold text-brand-700 hover:underline">← {backLabel}</Link> : null}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          {eyebrow ? <p className="text-[0.68rem] font-bold tracking-[0.12em] text-brand-700 uppercase">{eyebrow}</p> : null}
          <h1 className="mt-1 text-h1 text-ink-900">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-meta leading-6 text-ink-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function AdminKpiCard({ label, value, hint, icon: Icon, tone = 'neutral' }) {
  const styles = {
    neutral: 'border-border bg-card text-ink-600',
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    warning: 'border-warning/25 bg-warning-bg text-amber-800',
    danger: 'border-danger/25 bg-danger-bg text-danger',
  };
  return (
    <article className={`rounded-lg border p-4 shadow-xs sm:p-5 ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-tiny font-semibold text-ink-500">{label}</p><p className="mt-1 text-[1.75rem] leading-none font-extrabold text-ink-900 tabular">{value}</p></div>
        {Icon ? <span className="grid size-9 place-items-center rounded-md bg-white/70 ring-1 ring-current/10"><Icon className="size-[18px]" aria-hidden="true" /></span> : null}
      </div>
      {hint ? <p className="mt-3 hidden text-[0.68rem] leading-4 text-ink-500 sm:block">{hint}</p> : null}
    </article>
  );
}

export function AdminEmpty({ icon: Icon, title, description }) {
  return (
    <div className="px-6 py-14 text-center">
      {Icon ? <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink-50 text-ink-500 ring-1 ring-border"><Icon className="size-6" aria-hidden="true" /></span> : null}
      <h3 className="mt-4 text-h4 font-bold text-ink-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-meta leading-6 text-ink-500">{description}</p>
    </div>
  );
}

export function StatusBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
    success: 'bg-brand-50 text-brand-800 ring-brand-100',
    warning: 'bg-warning-bg text-amber-800 ring-warning/15',
    danger: 'bg-danger-bg text-danger ring-danger/10',
    info: 'bg-info-bg text-ink-700 ring-blue/10',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold capitalize ring-1 ${tones[tone]}`}>{children}</span>;
}

export function Pager({ page, hasNext, previousHref, nextHref, label = 'Page' }) {
  return (
    <nav className="flex items-center gap-2" aria-label={`${label} pages`}>
      {page > 1 ? <Link href={previousHref} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-50">← Previous</Link> : null}
      <span className="px-1 text-tiny text-ink-500">{label} {page}</span>
      {hasNext ? <Link href={nextHref} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-50">Next →</Link> : null}
    </nav>
  );
}
