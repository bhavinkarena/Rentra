import Link from '@/components/navigation/NavigationLink';
import { ArrowLeft } from 'lucide-react';
import { cn } from 'cn';

/** One back-link style for every customer sub-page. */
export function BackLink({ href, children, className }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-brand-700 hover:text-brand-800',
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Back link, h1, one-line description and optional actions on the right. */
export function PageHeader({ back, title, description, actions, className }) {
  return (
    <header className={cn('mb-8', className)}>
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-ink-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
