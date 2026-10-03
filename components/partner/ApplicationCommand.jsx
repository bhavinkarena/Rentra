'use client';
import { useActionState } from 'react';
import ConfirmedForm from '@/components/portal/ConfirmedForm';
import FormError from '@/components/portal/FormError';
import PendingSubmitButton from '@/components/partner/PendingSubmitButton';

/** Submit or withdraw the verification application, saying so when it fails. */
export default function ApplicationCommand({
  action,
  pendingLabel,
  className,
  children,
  confirm = false,
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <ConfirmedForm
      when={confirm}
      title="Withdraw your application?"
      description="Your application leaves the review queue. You can edit it and submit it again."
      confirmLabel="Withdraw application"
      danger
      action={formAction}
      className="space-y-2"
    >
      <FormError state={state} />
      <PendingSubmitButton pendingLabel={pendingLabel} className={className}>
        {children}
      </PendingSubmitButton>
    </ConfirmedForm>
  );
}
