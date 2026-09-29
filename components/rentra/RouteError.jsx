'use client';
import { useTransition } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

/**
 * Shared body for customer-facing error.js boundaries. `retry` is Next's
 * boundary prop: it re-fetches the segment, so a passing outage recovers
 * without a full reload. `link` is the one route-appropriate way out.
 */
export default function RouteError({
  retry,
  title = 'This page is temporarily unavailable',
  description = 'Nothing has been changed. Please try again in a moment.',
  link = { href: '/', label: 'Go to home' },
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6 sm:py-16">
      <EmptyState
        as="h1"
        tone="warning"
        icon={TriangleAlert}
        title={title}
        description={description}
      >
        <button
          type="button"
          onClick={() => startTransition(() => retry())}
          disabled={pending}
          className={cn(buttonVariants(), 'rounded-full px-5 disabled:cursor-wait')}
        >
          <RefreshCw
            className={pending ? 'motion-safe:animate-spin' : undefined}
            aria-hidden="true"
          />
          {pending ? 'Trying again…' : 'Try again'}
        </button>
        {link ? (
          <Link
            href={link.href}
            className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-5')}
          >
            {link.label}
          </Link>
        ) : null}
      </EmptyState>
    </div>
  );
}
