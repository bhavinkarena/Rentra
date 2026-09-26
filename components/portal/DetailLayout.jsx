import Link from 'next/link';
import Breadcrumbs from '@/components/portal/Breadcrumbs';
import CopyChip from '@/components/portal/CopyChip';

/**
 * Shared admin detail-page layout: identity header, key metrics, URL-backed
 * tabs (`?tab=`) and focused panels. Tabs are links, so a tab is bookmarkable,
 * survives reload and keeps the `from` list context.
 */

const BADGE = {
  success: 'bg-brand-50 text-brand-800 ring-brand-200',
  warning: 'bg-warning-bg text-amber-800 ring-warning/20',
  danger: 'bg-danger-bg text-danger ring-danger/15',
  info: 'bg-info-bg text-ink-800 ring-ink-200',
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
};

const METRIC = {
  neutral: 'text-ink-900',
  success: 'text-brand-700',
  warning: 'text-amber-800',
  danger: 'text-danger',
};

export function initials(text) {
  return (
    String(text || '?')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/** The requested tab when known, otherwise the first. */
export function pickTab(value, tabs) {
  return tabs.some((tab) => tab.key === value) ? value : tabs[0].key;
}

export function DetailHeader({ breadcrumbs, avatar, title, badges = [], id, chips = [], actions }) {
  return (
    <header className="border-b border-border pb-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-700 text-h4 font-bold text-white sm:size-16"
        >
          {initials(avatar ?? title)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-1 text-h2 font-bold break-words text-ink-900">{title}</h1>
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-tiny font-bold capitalize ring-1 ${BADGE[badge.tone ?? 'neutral']}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Key details">
            {id ? (
              <li>
                <CopyChip label={id.label} value={id.value} display={id.display} />
              </li>
            ) : null}
            {chips.filter(Boolean).map((chip) => {
              const Icon = chip.icon;
              const body = (
                <>
                  {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  {chip.label ? <span className="text-ink-500">{chip.label}</span> : null}
                  <span className="truncate">{chip.value}</span>
                </>
              );
              const cls =
                'inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 text-tiny font-medium text-ink-800';
              return (
                <li key={`${chip.label ?? ''}${chip.value}`}>
                  {chip.href ? (
                    <Link href={chip.href} className={`${cls} hover:bg-ink-50`}>
                      {body}
                    </Link>
                  ) : (
                    <span className={cls}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}

export function MetricStrip({ items, label = 'Key figures' }) {
  return (
    <section
      aria-label={label}
      className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card p-4 sm:p-5">
          <p className="text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
            {item.label}
          </p>
          <p className={`mt-1.5 text-h3 font-bold tabular ${METRIC[item.tone ?? 'neutral']}`}>
            {item.value}
          </p>
          {item.hint ? <p className="mt-0.5 text-tiny text-ink-500">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}

/**
 * Tabs as links. `params` are the current search params to keep (e.g. `from`);
 * the first tab has no `tab` parameter so the canonical URL stays clean.
 */
export function DetailTabs({ tabs, active, basePath, params = {} }) {
  const href = (key) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(([name, value]) => name !== 'tab' && typeof value === 'string'),
    );
    if (key !== tabs[0].key) search.set('tab', key);
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav
      aria-label="Record sections"
      className="mt-6 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:thin]"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={href(tab.key)}
                scroll={false}
                aria-current={current ? 'page' : undefined}
                className={`relative inline-flex min-h-11 items-center gap-1.5 px-3 text-meta font-semibold ${
                  current ? 'text-brand-800' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {tab.label}
                {tab.count != null ? (
                  <span
                    className={`rounded-full px-1.5 text-[0.65rem] tabular ${current ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-700'}`}
                  >
                    {tab.count}
                  </span>
                ) : null}
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-700"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SectionCard({ id, title, description, action, children, flush = false }) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
    >
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={id ? `${id}-title` : undefined} className="text-h4 font-bold text-ink-900">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-tiny text-ink-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/** Labelled values in a responsive two-column grid, like an account sheet. */
export function FieldGrid({ fields }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {fields.filter(Boolean).map((field) => (
        <div key={field.label} className="min-w-0">
          <dt className="text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
            {field.label}
          </dt>
          <dd
            className={`mt-1 text-meta break-words text-ink-900 ${field.mono ? 'font-mono text-tiny' : 'font-medium'}`}
          >
            {field.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Row list inside a flush SectionCard. */
export function RowList({ items, empty, render }) {
  if (!items.length) return <p className="p-5 text-meta text-ink-600">{empty}</p>;
  return <ul className="divide-y divide-border">{items.map(render)}</ul>;
}

export function Row({ primary, secondary, trailing, href, hrefLabel }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <span className="min-w-0">
        <span className="block font-semibold text-ink-900">{primary}</span>
        {secondary ? <span className="block text-tiny text-ink-500">{secondary}</span> : null}
      </span>
      <span className="flex items-center gap-3">
        {trailing}
        {href ? (
          <Link href={href} className="text-tiny font-bold text-brand-700 hover:underline">
            {hrefLabel ?? 'Open'} →
          </Link>
        ) : null}
      </span>
    </li>
  );
}
