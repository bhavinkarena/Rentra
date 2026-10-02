'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LoaderCircle from '@/components/ui/rentra-loader';

/**
 * Re-runs the server render in place. The URL — and so every filter, page and
 * tab — is unchanged, which is what "retry preserves context" means here.
 */
export default function RetryButton({ onRetry, label = 'Try again' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          router.refresh();
          onRetry?.();
        })
      }
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground active:bg-brand-900"
    >
      {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
      {pending ? 'Retrying…' : label}
    </button>
  );
}
