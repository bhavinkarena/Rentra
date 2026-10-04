'use client';

import { useActionState } from 'react';
import { switchToClient, switchToCustomer } from '@/lib/actions/auth';
import { runIdentityAction } from '@/lib/auth/identity-signal';

/** Role switching is a mutation, never a prefetched navigation. */
export default function AccountSwitchButton({
  role,
  children,
  className,
  ariaLabel,
  beforeSwitch,
}) {
  const [state, action, pending] = useActionState(
    () => runIdentityAction(role === 'client' ? switchToClient : switchToCustomer),
    null,
  );
  return (
    <form
      action={action}
      data-unsaved-guard="off"
      onSubmit={(event) => {
        if (beforeSwitch && !beforeSwitch()) event.preventDefault();
      }}
    >
      <button
        type="submit"
        className={className}
        disabled={pending}
        aria-busy={pending}
        aria-label={
          ariaLabel ??
          (typeof children === 'string'
            ? children
            : role === 'client'
              ? 'List your space'
              : 'Continue as customer')
        }
      >
        {pending ? 'Switching…' : children}
      </button>
      {state?.error ? (
        <p role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
