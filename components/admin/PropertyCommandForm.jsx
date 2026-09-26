'use client';

import { useActionState, useRef, useTransition } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import RetryButton from '@/components/portal/RetryButton';
import ValidationSummary from '@/components/portal/ValidationSummary';
import { propertyReviewCommand } from '@/lib/actions/admin';

export const control =
  'mt-1 block min-h-10 w-full rounded-md border border-input bg-card px-3 text-meta focus:border-brand-600 focus:outline-none';

/**
 * One command form. Dispatched from onSubmit rather than `<form action>`:
 * React resets a form after an action, which unchecks controlled checkboxes,
 * so a refused (409/422) command would silently drop the operator's checklist.
 */
export function CommandForm({ id, command, hidden = {}, submitLabel, tone = 'brand', children }) {
  const [state, action, pending] = useActionState(propertyReviewCommand, {});
  const [, startTransition] = useTransition();
  const formRef = useRef(null);
  const buttonTone =
    tone === 'danger'
      ? 'border border-danger text-danger hover:bg-danger-bg'
      : 'bg-brand-700 text-white hover:bg-brand-800';
  return (
    <form
      ref={formRef}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="command" value={command} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value ?? ''} />
      ))}
      {state.ok ? (
        <p role="status" className="rounded-md bg-success-bg p-3 text-meta text-brand-900">
          Saved.
        </p>
      ) : null}
      {state.error && (!state.errors || state.errors._) ? (
        <div
          role="alert"
          className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger"
        >
          <p>{state.errors?._ ?? state.error}</p>
          <div className="mt-2">
            <RetryButton label="Reload current state" />
          </div>
        </div>
      ) : null}
      <ValidationSummary errors={state.errors} scope={formRef} />
      {children(state.errors ?? {})}
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-meta font-semibold disabled:cursor-wait disabled:opacity-70 ${buttonTone}`}
      >
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}

export function FieldError({ message }) {
  return message ? <p className="mt-1 text-tiny font-medium text-danger">{message}</p> : null;
}
