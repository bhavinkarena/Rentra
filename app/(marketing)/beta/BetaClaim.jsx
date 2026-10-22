'use client';
import { useActionState } from 'react';
import { claimBetaAccess } from '@/lib/actions/beta';

export default function BetaClaim() {
  const [state, action, pending] = useActionState(claimBetaAccess, null);
  return (
    <form action={action}>
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Opening…' : 'Open Hotels'}
      </button>
      {state?.error ? (
        <p role="alert" className="mt-3 text-meta text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
