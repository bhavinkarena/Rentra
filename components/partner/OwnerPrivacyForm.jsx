'use client';
import { useActionState } from 'react';
import { requestOwnerData } from '@/lib/actions/partner';
import { buttonVariants } from '@/components/ui/button';
export default function OwnerPrivacyForm({ blocked }) {
  const [state, action, pending] = useActionState(requestOwnerData, {});
  return (
    <form
      action={action}
      className="divide-y divide-border rounded-lg border border-border bg-card"
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
      <section className="p-5 sm:p-6">
        <h2 className="text-h3 font-semibold">Get a copy of your data</h2>
        <p className="mt-3 max-w-[65ch] text-meta leading-6 text-ink-600">
          Request an account data copy. Rentra reviews your identity before making a download
          available.
        </p>
        <button
          className={`${buttonVariants()} mt-5`}
          name="kind"
          value="access"
          disabled={pending}
        >
          {pending ? 'Saving...' : 'Request data copy'}
        </button>
      </section>
      <section className="p-5 sm:p-6">
        <details>
          <summary className="min-h-11 cursor-pointer text-meta font-semibold text-ink-900">
            Account deletion
          </summary>
          <p className="mt-3 max-w-[65ch] text-meta leading-6 text-ink-600">
            Request deletion of your owner account. Rentra reviews identity and retention
            requirements before closing it. A saved request is not a completed deletion.
          </p>
          {blocked && (
            <p className="mt-4 text-meta leading-6 text-warning">
              Deletion is blocked while bookings are upcoming or unfinished, disputes are open, or
              money is pending. Resolve these first.
            </p>
          )}
          <button
            className={`${buttonVariants({ variant: 'outline' })} mt-5`}
            name="kind"
            value="deletion"
            disabled={pending || blocked}
          >
            Request account deletion
          </button>
        </details>
      </section>
      {state.error && (
        <p role="alert" className="p-5 text-meta text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="p-5 text-meta text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
