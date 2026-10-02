'use client';
import { useActionState } from 'react';
import FormError from '@/components/portal/FormError';
import PendingSubmitButton from '@/components/partner/PendingSubmitButton';

/** Submit or withdraw the verification application, saying so when it fails. */
export default function ApplicationCommand({ action, pendingLabel, className, children }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <FormError state={state} />
      <PendingSubmitButton pendingLabel={pendingLabel} className={className}>
        {children}
      </PendingSubmitButton>
    </form>
  );
}
