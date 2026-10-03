import { Inbox } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { cn } from 'cn';

/**
 * Empty, missing and failed states share one shape: an icon, a one-line
 * title, a short explanation and the real next action(s) as children.
 * `tone="warning"` is for failures; the default brand tint is for "nothing yet".
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  tone = 'brand',
  as: Heading = 'h2',
  className,
  children,
  variant = 'first-use',
  actionHref,
  actionLabel,
}) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center text-center',
        variant === 'compact' ? 'py-5' : 'py-12',
        className,
      )}
    >
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
      {children || actionHref ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionHref && (
            <Link
              href={actionHref}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-semibold text-white"
            >
              {actionLabel}
            </Link>
          )}
          {children}
        </div>
      ) : null}
    </div>
  );
}
