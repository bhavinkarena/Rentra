'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { Camera, History, ShieldAlert, CircleCheck } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { reportOwnerIncident } from '@/lib/actions/partner';
import { closeAdminIncident, correctAdminEvidence, reportAdminIncident } from '@/lib/actions/admin';

const field = 'mt-1 block min-h-11 w-full rounded border border-border bg-card p-2';
const button =
  'inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 font-semibold text-white disabled:opacity-70';
const MAX_PHOTOS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Submits without React's automatic form reset, so a rejected save keeps what
 * the operator typed and the photos they chose. A successful save re-renders
 * the record from the server, and the parent's `key` remounts a fresh form.
 */
export function useKeptInputAction(action) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const onSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit };
}

function Problem({ id, message }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-tiny font-medium text-danger">
      {message}
    </p>
  ) : null;
}

/** A refusal saved nothing; a lost response may have saved, and the request key makes a resubmit safe. */
const uncertain = (code) =>
  !code || code === 'NETWORK_ERROR' || /UNAVAILABLE|INTERNAL|TIMEOUT/.test(code);

export function Outcome({ state }) {
  return (
    <>
      {state.error && !state.errors ? (
        <p role="alert" className="text-meta font-medium text-danger">
          {state.error}{' '}
          {uncertain(state.code)
            ? 'It may not have been saved. Submitting again is safe and will not create a duplicate.'
            : 'Nothing was saved.'}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="flex items-center gap-1.5 text-meta font-medium text-success">
          <CircleCheck className="size-4" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}
    </>
  );
}

/**
 * Private photos. The browser blocks an oversized or over-count selection
 * before it is sent (the upload itself is capped at the action body limit);
 * the API still sniffs every file's real type and size.
 */
export function PhotoField({ error }) {
  const id = useId();
  const [picked, setPicked] = useState('');
  const check = (event) => {
    const files = [...event.target.files];
    const problem =
      files.length > MAX_PHOTOS
        ? `Choose up to ${MAX_PHOTOS} photos.`
        : files.some((file) => file.size > MAX_BYTES)
          ? 'Each photo must be under 2MB.'
          : files.some((file) => file.type && !TYPES.includes(file.type))
            ? 'Photos must be JPG, PNG or WebP images.'
            : '';
    event.target.setCustomValidity(problem);
    setPicked(problem || (files.length ? `${files.length} selected` : ''));
  };
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 font-medium">
        <Camera className="size-4" aria-hidden="true" />
        Photos (optional)
      </label>
      <input
        id={id}
        type="file"
        name="photos"
        multiple
        accept={TYPES.join(',')}
        onChange={check}
        aria-describedby={`${id}-hint`}
        className="mt-1 block w-full text-meta file:mr-3 file:min-h-10 file:rounded file:border file:border-border file:bg-card file:px-3"
      />
      <p id={`${id}-hint`} className="mt-1 text-tiny text-ink-600">
        Up to 3 · JPG, PNG or WebP · 2MB each · visible only to the property owner and Rentra
        {picked ? ` · ${picked}` : ''}
      </p>
      <Problem id={`${id}-error`} message={error} />
    </div>
  );
}

const CATEGORIES = [
  ['damage', 'Damage'],
  ['safety', 'Safety'],
  ['access', 'Access or entry'],
  ['conduct', 'Guest conduct'],
  ['amenity', 'Amenity failure'],
  ['other', 'Other'],
];

export function IncidentForm({ visit, requestKey, admin = false }) {
  const { state, pending, onSubmit } = useKeptInputAction(
    admin ? reportAdminIncident : reportOwnerIncident,
  );
  const [key] = useState(requestKey);
  const e = state.errors ?? {};
  const id = useId();
  return (
    <details className="rounded-md border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <ShieldAlert className="size-4 text-amber-700" aria-hidden="true" />
        Report an incident
      </summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input type="hidden" name="visitId" value={visit.id} />
        <input type="hidden" name="requestKey" value={key} />
        <p className="text-meta text-ink-700">
          {visit.provenance === 'real'
            ? 'Record what happened. Rentra operations see it immediately.'
            : 'Test / simulation visit: this report stays simulated and is not an actual-visit record.'}{' '}
          Liability, deposits and charges are decided in a separate dispute case, not here.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            Type
            <select name="category" required className={field} defaultValue="damage">
              {CATEGORIES.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            When it happened (India time)
            <input
              required
              type="datetime-local"
              name="occurredAt"
              className={field}
              aria-invalid={Boolean(e.occurredAt)}
            />
            <Problem message={e.occurredAt} />
          </label>
        </div>
        <label className="block">
          Short summary
          <input
            required
            minLength={5}
            maxLength={120}
            name="summary"
            className={field}
            aria-invalid={Boolean(e.summary)}
          />
          <Problem message={e.summary} />
        </label>
        <label className="block" htmlFor={`${id}-description`}>
          What happened
        </label>
        <textarea
          id={`${id}-description`}
          required
          minLength={20}
          maxLength={2000}
          name="description"
          className={field}
          placeholder="Describe what you saw and where. Do not include ID numbers, access codes or payment details."
          aria-invalid={Boolean(e.description)}
        />
        <Problem message={e.description} />
        <PhotoField error={e.photos} />
        <label className="flex items-start gap-2">
          <input type="checkbox" name="attested" required className="mt-1 size-5" />I confirm this
          report and its time are accurate.
        </label>
        <button disabled={pending} className={button}>
          {pending ? <RentraLoader label="Saving…" /> : 'Report incident'}
        </button>
        <Outcome state={state} />
      </form>
    </details>
  );
}

export function CloseIncidentForm({ incident }) {
  const { state, pending, onSubmit } = useKeptInputAction(closeAdminIncident);
  const id = useId();
  return (
    <details className="mt-2 rounded-md border border-border p-3">
      <summary className="min-h-11 cursor-pointer font-semibold">
        Close {incident.reference}
      </summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input type="hidden" name="incidentId" value={incident.id} />
        <input type="hidden" name="version" value={incident.version} />
        <p className="text-meta text-ink-700">
          Closing records operational follow-up only. It does not decide damage liability, charge a
          deposit or move money — open a dispute case for that.
        </p>
        <label className="block" htmlFor={`${id}-note`}>
          Resolution note
        </label>
        <textarea
          id={`${id}-note`}
          required
          minLength={10}
          maxLength={1000}
          name="resolutionNote"
          className={field}
          aria-invalid={Boolean(state.errors?.resolutionNote)}
        />
        <Problem message={state.errors?.resolutionNote} />
        <button disabled={pending} className={button}>
          {pending ? <RentraLoader label="Closing…" /> : 'Close incident'}
        </button>
        <Outcome state={state} />
      </form>
    </details>
  );
}

export function CorrectionForm({ evidence, requestKey }) {
  const { state, pending, onSubmit } = useKeptInputAction(correctAdminEvidence);
  const [key] = useState(requestKey);
  const e = state.errors ?? {};
  const id = useId();
  return (
    <details className="mt-2 rounded-md border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <History className="size-4" aria-hidden="true" />
        Record a correction
      </summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input type="hidden" name="evidenceId" value={evidence.id} />
        <input type="hidden" name="supersedesId" value={evidence.headCorrectionId ?? ''} />
        <input type="hidden" name="requestKey" value={key} />
        <p className="text-meta text-ink-700">
          The original stays on record. A correction cannot change the visit status or turn Test
          evidence into actual evidence.
        </p>
        <label className="block" htmlFor={`${id}-reason`}>
          Reason for the correction
        </label>
        <textarea
          id={`${id}-reason`}
          required
          minLength={10}
          maxLength={500}
          name="reason"
          className={field}
          aria-invalid={Boolean(e.reason)}
        />
        <Problem message={e.reason} />
        <label className="block">
          Corrected time (India time, optional)
          <input
            type="datetime-local"
            name="correctedOccurredAt"
            className={field}
            aria-invalid={Boolean(e.correctedOccurredAt)}
          />
          <Problem message={e.correctedOccurredAt} />
        </label>
        <label className="block" htmlFor={`${id}-note`}>
          Corrected note (optional)
        </label>
        <textarea
          id={`${id}-note`}
          minLength={20}
          maxLength={1000}
          name="correctedNote"
          className={field}
          aria-invalid={Boolean(e.correctedNote)}
        />
        <Problem message={e.correctedNote} />
        <button disabled={pending} className={button}>
          {pending ? <RentraLoader label="Saving…" /> : 'Save correction'}
        </button>
        <Outcome state={state} />
      </form>
    </details>
  );
}
