'use client';
import { useState } from 'react';
import {
  MAX_WINDOWS,
  PRESET_LABELS,
  describePolicy,
  hoursLabel,
  presetSet,
} from '@/lib/domain/cancellation-policy';
import { inputCls } from './SectionPrimitives';

const clone = (value) => JSON.parse(JSON.stringify(value));
const pctInput = 'w-20 tabular';

/**
 * Story 2.6: percentage refund windows before check-in, one rule at or after
 * check-in, and an optional early-departure offer. A preset only fills the
 * windows; the owner can change any of them. The value is sent as JSON in
 * `name` and checked again by the API (no gaps, no overlaps, 0–100%).
 */
export default function CancellationPolicyEditor({
  name = 'cancellationPolicy',
  rentalUnit,
  value,
  onChange,
  tierName,
  currentTier = 'moderate',
  idPrefix = 'cancel',
  error,
}) {
  const presets = presetSet(rentalUnit);
  // No saved windows yet: start from the preset the property already uses, as quotes do.
  const [policy, setPolicy] = useState(() =>
    clone(value ?? presets[currentTier] ?? presets.moderate ?? Object.values(presets)[0]),
  );
  const [preset, setPreset] = useState('');
  const update = (next) => {
    setPolicy(next);
    onChange?.(next);
  };
  const setWindow = (index, key, raw) => {
    const next = clone(policy);
    next.windows[index][key] = raw === '' ? '' : Number(raw);
    update(next);
  };
  const addWindow = () => {
    const next = clone(policy);
    const above = next.windows.at(-2)?.hoursBefore ?? 48;
    next.windows.splice(next.windows.length - 1, 0, {
      hoursBefore: Math.max(1, Math.floor(above / 2)),
      pct: 50,
    });
    update(next);
  };
  const removeWindow = (index) => {
    const next = clone(policy);
    next.windows.splice(index, 1);
    update(next);
  };
  const ed = policy.earlyDeparture ?? { offered: false, pct: 0 };
  return (
    <fieldset className="space-y-4">
      <legend className="text-meta font-semibold">Cancellation refunds</legend>
      <input type="hidden" name={name} value={JSON.stringify(policy)} />
      {tierName ? (
        <input
          type="hidden"
          name={tierName}
          value={['flexible', 'moderate', 'strict'].includes(preset) ? preset : currentTier}
        />
      ) : null}
      <label className="block text-meta font-semibold" htmlFor={`${idPrefix}-preset`}>
        Start from
        <select
          id={`${idPrefix}-preset`}
          value={preset}
          onChange={(event) => {
            setPreset(event.target.value);
            if (presets[event.target.value]) update(clone(presets[event.target.value]));
          }}
          className={inputCls}
        >
          <option value="">Keep my windows</option>
          {Object.keys(presets).map((key) => (
            <option key={key} value={key}>
              {PRESET_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <ol className="space-y-2">
        {policy.windows.map((w, i) => {
          const last = i === policy.windows.length - 1;
          return (
            <li key={i} className="flex flex-wrap items-center gap-2 text-meta">
              {last ? (
                <span>
                  {policy.windows.length === 1
                    ? 'Any time before check-in'
                    : `Less than ${hoursLabel(policy.windows[i - 1].hoursBefore)} before check-in`}
                </span>
              ) : (
                <label className="flex items-center gap-2" htmlFor={`${idPrefix}-h-${i}`}>
                  More than
                  <input
                    id={`${idPrefix}-h-${i}`}
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={w.hoursBefore}
                    onChange={(event) => setWindow(i, 'hoursBefore', event.target.value)}
                    className={`${inputCls} ${pctInput}`}
                  />
                  hours before check-in
                </label>
              )}
              <label className="flex items-center gap-2" htmlFor={`${idPrefix}-p-${i}`}>
                refund
                <input
                  id={`${idPrefix}-p-${i}`}
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={w.pct}
                  onChange={(event) => setWindow(i, 'pct', event.target.value)}
                  className={`${inputCls} ${pctInput}`}
                />
                %
              </label>
              {!last ? (
                <button
                  type="button"
                  onClick={() => removeWindow(i)}
                  className="min-h-11 px-2 text-tiny underline"
                  aria-label={`Remove the window starting ${w.hoursBefore} hours before`}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {policy.windows.length < MAX_WINDOWS ? (
        <button
          type="button"
          onClick={addWindow}
          className="min-h-11 text-meta font-semibold underline"
        >
          Add a window
        </button>
      ) : null}
      <label className="flex flex-wrap items-center gap-2 text-meta" htmlFor={`${idPrefix}-after`}>
        At or after check-in, refund
        <input
          id={`${idPrefix}-after`}
          type="number"
          min={0}
          max={100}
          required
          value={policy.atOrAfterCheckInPct}
          onChange={(event) =>
            update({
              ...policy,
              atOrAfterCheckInPct: event.target.value === '' ? '' : Number(event.target.value),
            })
          }
          className={`${inputCls} ${pctInput}`}
        />
        % (a no-show alone never refunds)
      </label>
      <div className="flex flex-wrap items-center gap-2 text-meta">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={ed.offered}
            onChange={(event) =>
              update({ ...policy, earlyDeparture: { ...ed, offered: event.target.checked } })
            }
          />
          Offer a refund for nights not stayed when guests leave early
        </label>
        {ed.offered ? (
          <label className="flex items-center gap-2" htmlFor={`${idPrefix}-early`}>
            <input
              id={`${idPrefix}-early`}
              type="number"
              min={0}
              max={100}
              value={ed.pct}
              onChange={(event) =>
                update({ ...policy, earlyDeparture: { ...ed, pct: Number(event.target.value) } })
              }
              className={`${inputCls} ${pctInput}`}
            />
            %
          </label>
        ) : null}
      </div>
      <ul
        className="rounded-md bg-ink-25 p-3 text-tiny text-ink-700"
        aria-label="What guests will see"
      >
        {describePolicy(policy).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-meta text-danger">
          {Array.isArray(error) ? error[0] : error}
        </p>
      ) : null}
    </fieldset>
  );
}
