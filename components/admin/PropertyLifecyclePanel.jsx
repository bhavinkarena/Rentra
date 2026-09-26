'use client';

import { useState } from 'react';
import { CommandForm, FieldError, control } from '@/components/admin/PropertyCommandForm';

const area = 'mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-meta';

function Consequences({ items }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-meta text-ink-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ReasonField({ label, value, onChange, errors }) {
  return (
    <>
      <label className="block text-meta font-semibold text-ink-700">
        {label}
        <textarea
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={area}
        />
      </label>
      <FieldError message={errors.reason} />
    </>
  );
}

function HideForm({ id, lifecycle }) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <CommandForm
      id={id}
      command="hide"
      hidden={{ expectedVersion: lifecycle.version }}
      submitLabel="Hide property"
      tone="danger"
    >
      {(errors) => (
        <>
          <Consequences items={lifecycle.hide.consequences} />
          <ReasonField
            label="Reason shown to the client"
            value={reason}
            onChange={setReason}
            errors={errors}
          />
          <label className="flex items-start gap-2 text-meta text-ink-700">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 accent-brand-700"
            />
            <span>I have checked the effect on confirmed visits and checkouts.</span>
          </label>
        </>
      )}
    </CommandForm>
  );
}

function RestoreForm({ id, lifecycle }) {
  const [reason, setReason] = useState('');
  return (
    <CommandForm
      id={id}
      command="restore"
      hidden={{ expectedVersion: lifecycle.version }}
      submitLabel="Restore property"
    >
      {(errors) => (
        <>
          <Consequences items={lifecycle.restore.consequences} />
          <ReasonField
            label="Reason for restoring"
            value={reason}
            onChange={setReason}
            errors={errors}
          />
        </>
      )}
    </CommandForm>
  );
}

function CorrectionForm({ id, lifecycle }) {
  const current = lifecycle.correction.current;
  const [values, setValues] = useState(current);
  const [reason, setReason] = useState('');
  const set = (key) => (event) => setValues({ ...values, [key]: event.target.value });
  return (
    <CommandForm
      id={id}
      command="correction"
      hidden={{ expectedContentVersion: lifecycle.contentVersion }}
      submitLabel="Save correction"
    >
      {(errors) => (
        <>
          <label className="block text-meta font-semibold text-ink-700">
            Title
            <input
              name="title"
              required
              minLength={8}
              maxLength={90}
              value={values.title}
              onChange={set('title')}
              className={control}
            />
          </label>
          <FieldError message={errors.title} />
          <label className="block text-meta font-semibold text-ink-700">
            Description
            <textarea
              name="description"
              required
              minLength={40}
              maxLength={4000}
              rows={5}
              value={values.description}
              onChange={set('description')}
              className={area}
            />
          </label>
          <FieldError message={errors.description} />
          <label className="block text-meta font-semibold text-ink-700">
            Highlight (optional)
            <input
              name="highlight"
              maxLength={60}
              value={values.highlight}
              onChange={set('highlight')}
              className={control}
            />
          </label>
          <label className="block text-meta font-semibold text-ink-700">
            Extra house rules text (optional)
            <textarea
              name="rulesNotes"
              maxLength={1000}
              rows={3}
              value={values.rulesNotes}
              onChange={set('rulesNotes')}
              className={area}
            />
          </label>
          <FieldError message={errors.rulesNotes} />
          <ReasonField
            label="Reason for the correction (shown to the client)"
            value={reason}
            onChange={setReason}
            errors={errors}
          />
        </>
      )}
    </CommandForm>
  );
}

export default function PropertyLifecyclePanel({ id, lifecycle, writable }) {
  if (!writable)
    return (
      <p className="text-meta text-ink-600">You have read-only access to property visibility.</p>
    );
  return (
    <div className="space-y-6">
      {lifecycle.hide.allowed ? (
        <section aria-labelledby="hide-title" className="rounded-lg border border-danger/30 p-4">
          <h3 id="hide-title" className="mb-2 text-h4 font-bold text-ink-900">
            Hide (admin restriction)
          </h3>
          <HideForm key={`hide-${lifecycle.version}`} id={id} lifecycle={lifecycle} />
        </section>
      ) : null}
      {lifecycle.restore.allowed ? (
        <section aria-labelledby="restore-title" className="rounded-lg border border-brand-200 p-4">
          <h3 id="restore-title" className="mb-2 text-h4 font-bold text-ink-900">
            Restore
          </h3>
          <RestoreForm key={`restore-${lifecycle.version}`} id={id} lifecycle={lifecycle} />
        </section>
      ) : null}
      <section aria-labelledby="correction-title" className="rounded-lg border border-border p-4">
        <h3 id="correction-title" className="text-h4 font-bold text-ink-900">
          Documented correction
        </h3>
        <p className="mb-3 text-tiny text-ink-500">
          Public text only. Photos, address, capacity and amenities go back to the client through
          review. The status does not change.
        </p>
        {lifecycle.correction.allowed ? (
          <CorrectionForm key={`fix-${lifecycle.contentVersion}`} id={id} lifecycle={lifecycle} />
        ) : (
          <p className="text-meta text-ink-600">{lifecycle.correction.blockedReason}</p>
        )}
      </section>
    </div>
  );
}
