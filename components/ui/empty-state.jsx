import { cn } from 'cn';

/**
 * Empty, missing and failed states share one shape: an icon, a one-line
 * title, a short explanation and the real next action(s) as children.
 * `tone="warning"` is for failures; the default brand tint is for "nothing yet".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'brand',
  as: Heading = 'h2',
  className,
  children,
}) {
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center py-12 text-center', className)}>
      {Icon ? (
        <span
          className={cn(
            'grid size-14 place-items-center rounded-full',
            tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-brand-50 text-brand-700',
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <Heading className="mt-5 text-h3">{title}</Heading>
      {description ? <p className="mt-2 text-ink-600">{description}</p> : null}
      {children ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}
