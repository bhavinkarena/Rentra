import Link from '@/components/navigation/NavigationLink';
import Breadcrumbs from '@/components/portal/Breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge as SharedStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { adminStatusMeta, humaniseStatus } from '@/lib/domain/status';

export function AdminPage({ children, width = 'max-w-(--container-workspace)' }) {
  return (
    <div className={`mx-auto w-full min-w-0 ${width} px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>
      {children}
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  backHref,
  backLabel = 'Back',
  breadcrumbs,
}) {
  return (
    <div>
      {breadcrumbs ? (
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      <PageHeader
        title={title}
        description={description}
        back={!breadcrumbs && backHref ? { href: backHref, label: backLabel } : undefined}
        actions={action}
        className="mb-0 [&_h1]:break-words [&_p]:text-meta [&_p]:leading-6"
      />
      {eyebrow ? <p className="mt-2 text-meta text-ink-600">{eyebrow}</p> : null}
    </div>
  );
}

export function AdminKpiCard({ label, value, hint, icon: Icon, tone = 'neutral' }) {
  const styles = {
    neutral: 'border-border bg-card text-ink-600',
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    warning: 'border-warning/25 bg-warning-bg text-warning',
    danger: 'border-danger/25 bg-danger-bg text-danger',
    success: 'border-success/20 bg-success-bg text-success',
  };
  return (
    <article className={`rounded-lg border p-4 sm:p-5 ${styles[tone] ?? styles.neutral}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-meta font-medium text-ink-600">{label}</p>
          <p className="mt-2 text-stat font-semibold text-ink-900 tabular">{value}</p>
        </div>
        {Icon ? (
          <span className="grid size-8 place-items-center rounded-md bg-white/70">
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-tiny leading-5 text-ink-600">{hint}</p> : null}
    </article>
  );
}

/** Compatibility wrapper: shared empty and badge presentation, existing admin props. */
export function AdminEmpty({ icon, title, description, children }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      as="h3"
      className="px-6 text-meta"
    >
      {children}
    </EmptyState>
  );
}

export function StatusBadge({ children, tone, domain, state, className }) {
  const meta = state != null ? adminStatusMeta(domain, state) : null;
  const label = children ?? meta?.label;
  return (
    <SharedStatusBadge tone={tone ?? meta?.tone ?? 'neutral'} className={className}>
      {typeof label === 'string' ? humaniseStatus(label) : label}
    </SharedStatusBadge>
  );
}

/** Keyboard-focusable, locally scrollable semantic table; cells stay caller-owned. */
export function AdminTable({ label, columns, children, empty, minWidth = 760, framed = true }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`admin-table min-w-0 max-w-full overflow-x-auto overscroll-x-contain bg-card ${framed ? 'rounded-lg border border-border' : ''}`}
    >
      <table className="w-full border-collapse text-left text-meta" style={{ minWidth }}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-border bg-ink-25 px-4 py-3 text-meta font-semibold whitespace-nowrap text-ink-600"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdminFilterBar({ children, label = 'Record filters', className = '' }) {
  return (
    <div role="group" aria-label={label} className={`space-y-4 bg-card p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function AdminReadOnly({ title = 'Read-only access', children }) {
  return (
    <section className="rounded-lg border border-border bg-ink-25 p-5">
      <h2 className="text-h4 font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 text-meta leading-6 text-ink-600">
        {children ??
          'You can inspect this record. Changes require additional operator permissions.'}
      </p>
    </section>
  );
}

export function Pager({ page, hasNext, previousHref, nextHref, label = 'Page' }) {
  return (
    <nav className="flex items-center gap-2" aria-label={`${label} pages`}>
      {page > 1 ? (
        <Link
          href={previousHref}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-50"
        >
          ← Previous
        </Link>
      ) : null}
      <span className="px-1 text-tiny text-ink-500">
        {label} {page}
      </span>
      {hasNext ? (
        <Link
          href={nextHref}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-50"
        >
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
