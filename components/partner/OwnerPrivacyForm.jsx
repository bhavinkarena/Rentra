'use client';
import { useActionState } from 'react';
import { requestOwnerData } from '@/lib/actions/partner';
import { buttonVariants } from '@/components/ui/button';
export default function OwnerPrivacyForm({ blocked }) {
  const [state, action, pending] = useActionState(requestOwnerData, {});
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          e.nativeEvent.submitter?.value === 'deletion' &&
          !window.confirm(
            'Request account deletion? Rentra will review what must be retained before closing your account.',
          )
        )
          e.preventDefault();
      }}
    >
      <div className="flex flex-wrap gap-3">
        <button className={buttonVariants()} name="kind" value="access" disabled={pending}>
          {pending ? 'Saving…' : 'Download my data'}
        </button>
        <button
          className={buttonVariants({ variant: 'outline' })}
          name="kind"
          value="deletion"
          disabled={pending || blocked}
        >
          Request account deletion
        </button>
      </div>
      <p>
        Data copies and account deletion require Rentra’s identity and retention review. A saved
        request is not a completed download or deletion.
      </p>
      {blocked && (
        <p>
          Deletion is blocked while bookings are upcoming or unfinished, disputes are open, or money
          is pending. Resolve these first.
        </p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
