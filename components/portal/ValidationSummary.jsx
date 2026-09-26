'use client';

import { useEffect, useRef } from 'react';

/**
 * Focused error summary for a form that failed server validation.
 *
 * `errors` is the API's { field: message } map (`_` is the form-level message
 * and is rendered elsewhere). Each entry moves focus to its field, found by
 * `name` inside `scope` — so no field ids need to match error keys.
 */
export default function ValidationSummary({ errors, scope }) {
  const ref = useRef(null);
  const entries = Object.entries(errors ?? {}).filter(([key, message]) => key !== '_' && message);

  useEffect(() => {
    if (entries.length) ref.current?.focus();
    // Focus when a new error set arrives, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  if (!entries.length) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="mt-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger focus:outline-2 focus:outline-offset-2 focus:outline-danger"
    >
      <p className="font-semibold">
        {entries.length === 1 ? 'Fix 1 field to save' : `Fix ${entries.length} fields to save`}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {entries.map(([name, message]) => (
          <li key={name}>
            <button
              type="button"
              className="text-left underline underline-offset-2"
              onClick={() => scope?.current?.querySelector(`[name="${CSS.escape(name)}"]`)?.focus()}
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
