'use client';

import { useFormStatus } from 'react-dom';
import { LoaderCircle } from 'lucide-react';

export default function PendingSubmitButton({
  children,
  pendingLabel = 'Working…',
  className = '',
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      aria-live="polite"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
