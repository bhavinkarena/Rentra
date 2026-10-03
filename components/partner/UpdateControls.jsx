'use client';

import toast from 'react-hot-toast';
import ConfirmedForm from '@/components/portal/ConfirmedForm';
import { useActionState, useState, useTransition } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import { markUpdatesRead, openUpdate, saveUpdatePreferences } from '@/lib/actions/partner';
import { MUTABLE_CATEGORY_HINT, CATEGORY_LABEL } from '@/lib/domain/client-updates';

const quiet =
  'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50 disabled:cursor-wait disabled:opacity-60';

function Failure({ state }) {
  return state?.error ? (
    <p role="alert" className="mt-1 text-tiny font-medium text-danger">
      {state.error}
    </p>
  ) : null;
}

/** Marks the update read, then opens the record it is about. */
export function OpenUpdate({ id, href, title }) {
  const [state, action, pending] = useActionState(openUpdate, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="href" value={href} />
      <button type="submit" disabled={pending} className={quiet}>
        {pending ? <LoaderCircle className="size-3.5" aria-hidden="true" /> : null}
        Open<span className="sr-only">: {title}</span>
      </button>
      <Failure state={state} />
    </form>
  );
}

export function MarkRead({ id, title }) {
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await markUpdatesRead(previous, form);
    if (!result?.error && !result?.errors)
      toast.success(form.get('all') ? 'All updates marked read.' : 'Update marked read.');
    return result;
  }, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={quiet}>
        {pending ? 'Marking read…' : 'Mark read'}
        <span className="sr-only">: {title}</span>
      </button>
      <Failure state={state} />
    </form>
  );
}

export function MarkAllRead({ disabled, needsAction = false }) {
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await markUpdatesRead(previous, form);
    if (!result?.error && !result?.errors)
      toast.success(form.get('all') ? 'All updates marked read.' : 'Update marked read.');
    return result;
  }, {});
  return (
    <ConfirmedForm
      when={needsAction}
      title="Mark all updates read?"
      description="Some updates still need you. Their tasks will stay pinned."
      confirmLabel="Mark all read"
      action={action}
    >
      <input type="hidden" name="all" value="1" />
      <input type="hidden" name="confirm" value="1" />
      <button type="submit" disabled={pending || disabled} className={quiet}>
        {pending ? <LoaderCircle className="size-3.5" aria-hidden="true" /> : null}
        {pending ? 'Marking read…' : 'Mark all as read'}
      </button>
      <Failure state={state} />
    </ConfirmedForm>
  );
}

/**
 * Which informational categories arrive unread. Required work always arrives
 * unread and is not listed. Submitted from a transition so a refused save
 * keeps the chosen boxes (React resets `<form action>` checkboxes).
 */
export function UpdatePreferences({ preferences }) {
  const [state, action, pending] = useActionState(saveUpdatePreferences, {});
  const [, startTransition] = useTransition();
  const [notify, setNotify] = useState(() =>
    preferences.categories.filter((category) => !preferences.muted.includes(category)),
  );
  const version = Math.max(Number(state?.version) || 0, preferences.version);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.set('expectedVersion', String(version));
        for (const category of preferences.categories)
          if (!notify.includes(category)) data.append('muted', category);
        startTransition(() => action(data));
      }}
    >
      <fieldset>
        <legend className="text-meta font-semibold text-ink-800">
          Show as unread when it arrives
        </legend>
        <div className="mt-2 space-y-2">
          {preferences.categories.map((category) => (
            <label key={category} className="flex items-start gap-2 text-meta">
              <input
                type="checkbox"
                checked={notify.includes(category)}
                onChange={(event) =>
                  setNotify(
                    event.target.checked
                      ? [...notify, category]
                      : notify.filter((value) => value !== category),
                  )
                }
                className="mt-0.5 size-4 accent-brand-700"
              />
              <span>
                <span className="font-semibold">{CATEGORY_LABEL[category]}</span>
                <span className="block text-tiny text-ink-500">
                  {MUTABLE_CATEGORY_HINT[category]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-danger-bg p-3 text-meta text-danger">
          {state.error}
        </p>
      ) : state?.version ? (
        <p role="status" className="text-meta font-semibold text-brand-700">
          Preferences saved.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-tiny font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground active:bg-brand-900"
      >
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        {pending ? 'Saving…' : 'Save preferences'}
      </button>
    </form>
  );
}
