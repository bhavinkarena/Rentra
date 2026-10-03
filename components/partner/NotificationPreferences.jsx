'use client';
import { useActionState, useState, useTransition } from 'react';
import { saveOwnerNotifications } from '@/lib/actions/partner';
import { buttonVariants } from '@/components/ui/button';
import { CATEGORY_LABEL } from '@/lib/domain/client-updates';
const FAILURE_TEXT = {
  VERIFIED_PHONE_REQUIRED: 'Mobile: verify your number in Login & security.',
  VERIFIED_EMAIL_REQUIRED: 'Email: verify your address in Login & security.',
  PINNED_CHANNEL_MISSING: 'Your contact details changed. Verify them again in Login & security.',
  PROVIDER_UNDELIVERED:
    'Mobile: messages to your number were not delivered. Check that it is correct.',
  DELIVERY_OUTCOME_UNKNOWN: 'Rentra is checking a message that may not have arrived.',
};
const failureText = (f) =>
  FAILURE_TEXT[f.failure_code] ??
  `${f.channel === 'email' ? 'Email' : 'Mobile'}: delivery failed. Check your contact details.`;

export default function NotificationPreferences({ data }) {
  const [state, dispatch, pending] = useActionState(saveOwnerNotifications, {}),
    [prefs, setPrefs] = useState(data.preferences),
    [, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        start(() =>
          dispatch({ expectedVersion: state.version || data.version, preferences: prefs }),
        );
      }}
    >
      {!data.deliveryEnabled && (
        <p className="rounded-lg border p-3" role="status">
          External notifications are not enabled yet. Your preferences are saved, and all updates
          remain available in your inbox.
        </p>
      )}
      <p className="text-meta">
        In-app updates are always on. Keep at least one channel for new bookings and tasks that need
        you. Mobile uses WhatsApp when available, with SMS fallback.
      </p>
      {(!data.verified.email || !data.verified.mobile) && (
        <p role="status" className="rounded-md bg-warning-bg p-3 text-warning">
          Verify your email and mobile in Login &amp; security to receive updates on both channels.
        </p>
      )}
      {data.failures.length > 0 && (
        <p role="status" className="rounded-md bg-warning-bg p-3 text-warning">
          Some updates could not be delivered. Updates are kept in your inbox.
          <span className="mt-2 block">
            {[...new Set(data.failures.map(failureText))].map((text) => (
              <span key={text} className="block">
                · {text}
              </span>
            ))}
          </span>
        </p>
      )}
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.categories.map((category) => (
          <fieldset key={category} className="min-w-0 p-5 sm:p-6" disabled={pending}>
            <legend className="sr-only">{CATEGORY_LABEL[category]}</legend>
            <p className="mb-3 text-meta font-semibold">{CATEGORY_LABEL[category]}</p>
            {category === 'team' && (
              <p className="text-meta">
                You can turn off routine caretaker updates. If a caretaker is removed during a
                visit, we still send an email when both switches are off.
              </p>
            )}
            <div className="flex flex-wrap gap-6">
              {[
                ['mobile', 'WhatsApp / SMS'],
                ['email', 'Email'],
              ].map(([key, label]) => (
                <label key={key} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-brand-600"
                    aria-label={`${CATEGORY_LABEL[category]} - ${label}`}
                    checked={prefs[category][key]}
                    onChange={(event) =>
                      setPrefs({
                        ...prefs,
                        [category]: { ...prefs[category], [key]: event.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            {state.errors?.[category] && (
              <p role="alert" className="text-danger">
                {state.errors[category]}
              </p>
            )}
          </fieldset>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-success">
          {state.message}
        </p>
      )}
      <button disabled={pending} className={buttonVariants()}>
        {pending ? 'Saving…' : 'Save notification settings'}
      </button>
    </form>
  );
}
