export function PartnerPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[0.68rem] font-bold tracking-[0.15em] text-brand-700 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.03em] text-ink-900 sm:text-h1">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-meta leading-6 text-ink-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({ label, value, hint, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    success: 'bg-success-bg text-success ring-success/10',
    warning: 'bg-warning-bg text-warning ring-warning/10',
    danger: 'bg-danger-bg text-danger ring-danger/10',
    neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  };

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.1em] text-ink-500 uppercase">{label}</p>
          <p className="mt-2 text-[1.7rem] leading-none font-bold tracking-[-0.035em] text-ink-900 tabular sm:text-[2rem]">
            {value}
          </p>
        </div>
        {Icon ? (
          <span className={`grid size-10 place-items-center rounded-md ring-1 ring-inset ${tones[tone] ?? tones.brand}`}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-tiny text-ink-500">{hint}</p>
    </article>
  );
}
