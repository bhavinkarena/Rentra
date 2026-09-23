'use client';
import LoaderCircle from '@/components/ui/rentra-loader';

import { useFormStatus } from 'react-dom';

export default function PendingSubmitButton({
  children,
  pendingLabel = 'Working…',
  className = '',
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-live="polite">
      {pending ? <LoaderCircle className="size-4 " aria-hidden="true" /> : null}
      {pending ? <span className="sr-only">{pendingLabel}</span> : children}
    </button>
  );
}
