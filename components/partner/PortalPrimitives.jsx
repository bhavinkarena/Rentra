export function PartnerPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-h1 leading-tight font-bold tracking-[-0.03em] text-ink-900">
            {title}
          </h1>
          {eyebrow ? <p className="text-meta font-medium text-ink-600">{eyebrow}</p> : null}
        </div>
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
    <article className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-meta font-medium text-ink-600">{label}</p>
          <p className="mt-2 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-ink-900 tabular">
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={`grid size-8 place-items-center rounded-md ${tones[tone] ?? tones.brand}`}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-tiny text-ink-500">{hint}</p>
    </article>
  );
}
