'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import RetryButton from '@/components/portal/RetryButton';
import ValidationSummary from '@/components/portal/ValidationSummary';
import { propertyReviewCommand } from '@/lib/actions/admin';

const control =
  'mt-1 block min-h-10 w-full rounded-md border border-input bg-card px-3 text-meta focus:border-brand-600 focus:outline-none';
const IST = { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' };
const MODE = { video_call: 'Video call', physical: 'Site visit' };

/**
 * One command form. Dispatched from onSubmit rather than `<form action>`:
 * React resets a form after an action, which unchecks controlled checkboxes,
 * so a refused (409/422) command would silently drop the operator's checklist.
 */
function CommandForm({ id, command, hidden = {}, submitLabel, tone = 'brand', children }) {
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

function FieldError({ message }) {
  return message ? <p className="mt-1 text-tiny font-medium text-danger">{message}</p> : null;
}

function ScheduleForm({ id, submissionId }) {
  const [mode, setMode] = useState('video_call');
  const [at, setAt] = useState('');
  const [note, setNote] = useState('');
  return (
    <CommandForm
      id={id}
      command="schedule"
      hidden={{ submissionId }}
      submitLabel="Schedule verification"
    >
      {(errors) => (
        <>
          <fieldset>
            <legend className="text-meta font-semibold text-ink-700">How</legend>
            <div className="mt-1 flex flex-wrap gap-4">
              {Object.entries(MODE).map(([value, text]) => (
                <label key={value} className="flex min-h-10 items-center gap-2 text-meta">
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="size-4 accent-brand-700"
                  />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-meta font-semibold text-ink-700">
            When (India time, IST)
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              value={at}
              onChange={(event) => setAt(event.target.value)}
              className={control}
            />
          </label>
          <FieldError message={errors.scheduledAt} />
          <label className="block text-meta font-semibold text-ink-700">
            Note for the record (optional)
            <input
              name="note"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={control}
            />
          </label>
        </>
      )}
    </CommandForm>
  );
}

function RescheduleForm({ id, visit }) {
  const [at, setAt] = useState('');
  const [reason, setReason] = useState('');
  return (
    <CommandForm
      id={id}
      command="reschedule"
      hidden={{ visitId: visit.id, expectedVersion: visit.version }}
      submitLabel="Reschedule"
    >
      {(errors) => (
        <>
          <label className="block text-meta font-semibold text-ink-700">
            New time (IST)
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              value={at}
              onChange={(event) => setAt(event.target.value)}
              className={control}
            />
          </label>
          <FieldError message={errors.scheduledAt} />
          <label className="block text-meta font-semibold text-ink-700">
            Reason
            <input
              name="reason"
              required
              minLength={4}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={control}
            />
          </label>
          <FieldError message={errors.reason} />
        </>
      )}
    </CommandForm>
  );
}

function CancelForm({ id, visit }) {
  const [reason, setReason] = useState('');
  return (
    <CommandForm
      id={id}
      command="cancel"
      hidden={{ visitId: visit.id, expectedVersion: visit.version }}
      submitLabel="Cancel verification"
      tone="danger"
    >
      {(errors) => (
        <>
          <label className="block text-meta font-semibold text-ink-700">
            Cancellation reason
            <input
              name="reason"
              required
              minLength={4}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={control}
            />
          </label>
          <FieldError message={errors.reason} />
        </>
      )}
    </CommandForm>
  );
}

function OutcomeForm({ id, visit, checklist }) {
  const [outcome, setOutcome] = useState('passed');
  const [checked, setChecked] = useState([]);
  const [findings, setFindings] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  return (
    <CommandForm
      id={id}
      command="outcome"
      hidden={{ visitId: visit.id, expectedVersion: visit.version }}
      submitLabel="Record verification outcome"
    >
      {(errors) => (
        <>
          <label className="block text-meta font-semibold text-ink-700">
            Outcome
            <select
              name="outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              className={control}
            >
              <option value="passed">Passed — evidence complete</option>
              <option value="failed">Failed — return to the client with findings</option>
              <option value="no_show">No-show — close and reschedule</option>
            </select>
          </label>
          {outcome !== 'no_show' ? (
            <>
              <fieldset>
                <legend className="text-meta font-semibold text-ink-700">
                  Checklist {outcome === 'passed' ? '(every item is required to pass)' : ''}
                </legend>
                <div className="mt-1 space-y-1.5">
                  {checklist.map((item) => (
                    <label key={item.key} className="flex items-start gap-2 text-meta">
                      <input
                        type="checkbox"
                        name="checklist"
                        value={item.key}
                        checked={checked.includes(item.key)}
                        onChange={(event) =>
                          setChecked(
                            event.target.checked
                              ? [...checked, item.key]
                              : checked.filter((key) => key !== item.key),
                          )
                        }
                        className="mt-0.5 size-4 accent-brand-700"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.checklist} />
              </fieldset>
              <label className="block text-meta font-semibold text-ink-700">
                Findings (kept private; shown to the client only if the verification fails)
                <textarea
                  name="findings"
                  rows={4}
                  maxLength={4000}
                  value={findings}
                  onChange={(event) => setFindings(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-meta"
                />
              </label>
              <FieldError message={errors.findings} />
              {visit.mode === 'physical' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-meta font-semibold text-ink-700">
                    On-site latitude
                    <input
                      name="geoLat"
                      inputMode="decimal"
                      value={lat}
                      onChange={(event) => setLat(event.target.value)}
                      className={control}
                    />
                  </label>
                  <label className="block text-meta font-semibold text-ink-700">
                    On-site longitude
                    <input
                      name="geoLng"
                      inputMode="decimal"
                      value={lng}
                      onChange={(event) => setLng(event.target.value)}
                      className={control}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <FieldError message={errors.geoLat ?? errors.geoLng} />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </CommandForm>
  );
}

function PublishForm({ id, submissionId, inventory }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <CommandForm
      id={id}
      command="publish"
      hidden={{ submissionId }}
      submitLabel="Publish this revision"
    >
      {() => (
        <>
          <p
            className={`rounded-md p-3 text-meta ${inventory.bookable ? 'bg-success-bg text-brand-900' : 'bg-warning-bg text-amber-900'}`}
          >
            {inventory.note}
          </p>
          <label className="flex items-start gap-2 text-meta text-ink-700">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 accent-brand-700"
            />
            <span>
              I have checked the verification evidence. Publishing makes this exact revision public.
            </span>
          </label>
        </>
      )}
    </CommandForm>
  );
}

export default function VerificationPanel({ id, data, writable }) {
  const { publication, verifications, checklist } = data;
  const open = verifications.find((visit) => visit.status === 'scheduled');
  const status = data.property.status;
  if (!writable) {
    return <p className="text-meta text-ink-600">You have read-only access to verification.</p>;
  }
  return (
    <div className="space-y-6">
      {status === 'pending_verification' &&
      publication.submissionId &&
      !open &&
      !publication.visitId ? (
        <section aria-labelledby="schedule-title">
          <h3 id="schedule-title" className="text-h4 font-bold text-ink-900">
            Schedule verification
          </h3>
          <p className="mb-3 text-tiny text-ink-500">
            The verification examines the submitted revision approved in Gate 2.
          </p>
          <ScheduleForm id={id} submissionId={publication.submissionId} />
        </section>
      ) : null}

      {open ? (
        <section aria-labelledby="open-visit-title" className="space-y-5">
          <div>
            <h3 id="open-visit-title" className="text-h4 font-bold text-ink-900">
              {MODE[open.mode]} · {new Date(open.scheduledAt).toLocaleString('en-IN', IST)} IST
            </h3>
            <p className="text-tiny text-ink-500">
              Assigned to {open.assignee?.email ?? 'nobody'} · version {open.version}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h4 className="mb-2 text-meta font-bold text-ink-900">Record the outcome</h4>
            <OutcomeForm
              key={`${open.id}-${open.version}`}
              id={id}
              visit={open}
              checklist={checklist}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-2 text-meta font-bold text-ink-900">Reschedule</h4>
              <RescheduleForm key={`r-${open.version}`} id={id} visit={open} />
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-2 text-meta font-bold text-ink-900">Cancel</h4>
              <CancelForm key={`c-${open.version}`} id={id} visit={open} />
            </div>
          </div>
        </section>
      ) : null}

      {publication.eligible ? (
        <section aria-labelledby="publish-title" className="rounded-lg border border-brand-200 p-4">
          <h3 id="publish-title" className="mb-2 text-h4 font-bold text-ink-900">
            Publish
          </h3>
          <PublishForm
            id={id}
            submissionId={publication.submissionId}
            inventory={publication.inventory}
          />
        </section>
      ) : null}
    </div>
  );
}
