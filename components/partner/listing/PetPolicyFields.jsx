'use client';
import { useState } from 'react';
import { PawPrint } from 'lucide-react';
import {
  PET_SIZES,
  PET_TYPES,
  effectivePetPolicy,
  petPolicyLine,
  petPolicyProblem,
} from '@/lib/domain/pet-policy';
import { inputCls } from './SectionPrimitives';

const TYPE_LABELS = { dog: 'Dogs', cat: 'Cats', small_other: 'Small pets' };
const SIZE_LABELS = {
  small: 'Small (under 10 kg)',
  medium: 'Medium (under 25 kg)',
  any: 'Any size',
};
const UNIT_LABELS = {
  free: 'Free',
  per_stay: 'Per stay',
  per_night: 'Per night',
  per_pet: 'Per pet',
  per_pet_night: 'Per pet per night',
};
const chip =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 text-meta has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring';
const DEFAULT_ALLOWED = {
  maxPets: 1,
  types: [...PET_TYPES],
  maxSize: 'any',
  fee: { unit: 'free', amount: 0 },
};

/**
 * Story 3.8: the ordinary pet policy (farm/villa rules and hotel house rules). Controlled, so the
 * owner's values survive a failed save; sent as one JSON field `petPolicy`.
 * `saved` is the stored policy (null until first saved), `legacyAllowed` the old yes/no flag.
 */
export function PetPolicyFields({ saved, legacyAllowed, error }) {
  const [policy, setPolicy] = useState(() => effectivePetPolicy(saved, legacyAllowed));
  const allowed = policy.status === 'allowed';
  const set = (patch) => setPolicy((current) => ({ ...current, ...patch }));
  const setFee = (patch) =>
    setPolicy((current) => ({ ...current, fee: { ...current.fee, ...patch } }));
  const problem = petPolicyProblem(policy);
  const sent = allowed ? policy : { status: 'not_allowed' };
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <legend className="flex items-center gap-1.5 px-1 text-meta font-semibold text-ink-800">
        <PawPrint aria-hidden="true" className="h-4 w-4" /> Pets
      </legend>
      <input type="hidden" name="petPolicy" value={JSON.stringify(sent)} />
      {!saved && legacyAllowed ? (
        <p className="rounded-md border-l-4 border-warning bg-warning-bg p-3 text-meta text-warning">
          <strong>Review your pet policy.</strong> We set it to 1 pet of any type and size, free.
          Check the limits and fee, then save.
        </p>
      ) : null}
      <div role="radiogroup" aria-label="Pets" className="flex flex-wrap gap-2">
        {[
          ['allowed', 'Allowed'],
          ['not_allowed', 'Not allowed'],
        ].map(([value, label]) => (
          <label key={value} className={chip}>
            <input
              type="radio"
              className="sr-only"
              name="petStatus"
              value={value}
              checked={policy.status === value}
              onChange={() =>
                setPolicy((current) =>
                  value === 'allowed'
                    ? { ...DEFAULT_ALLOWED, ...current, status: 'allowed' }
                    : { ...current, status: 'not_allowed' },
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
      {allowed ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-meta text-ink-800">
              Most pets per booking
              <select
                className={`${inputCls} mt-1`}
                value={policy.maxPets}
                onChange={(event) => set({ maxPets: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-meta text-ink-800">
              Largest size
              <select
                className={`${inputCls} mt-1`}
                value={policy.maxSize}
                onChange={(event) => set({ maxSize: event.target.value })}
              >
                {PET_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-meta text-ink-800">Pet types</legend>
            <div className="flex flex-wrap gap-2">
              {PET_TYPES.map((type) => (
                <label key={type} className={chip}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={policy.types.includes(type)}
                    onChange={(event) =>
                      set({
                        types: event.target.checked
                          ? PET_TYPES.filter((t) => t === type || policy.types.includes(t))
                          : policy.types.filter((t) => t !== type),
                      })
                    }
                  />
                  {TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-meta text-ink-800">
              Pet fee
              <select
                className={`${inputCls} mt-1`}
                value={policy.fee.unit}
                onChange={(event) =>
                  setFee({
                    unit: event.target.value,
                    ...(event.target.value === 'free' ? { amount: 0 } : {}),
                  })
                }
              >
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {policy.fee.unit !== 'free' ? (
              <label className="block text-meta text-ink-800">
                Amount (₹)
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50000}
                  step={1}
                  className={`${inputCls} mt-1`}
                  value={Number.isFinite(policy.fee.amount) ? policy.fee.amount : ''}
                  onChange={(event) =>
                    setFee({ amount: event.target.value === '' ? NaN : Number(event.target.value) })
                  }
                />
              </label>
            ) : null}
          </div>
          <p className="text-tiny text-ink-600">
            Guests see the limits now; the fee is shown and charged once pet booking opens.
          </p>
        </>
      ) : null}
      <p className="text-meta text-ink-800" aria-live="polite">
        {problem ? (
          <span className="text-danger">{problem}</span>
        ) : (
          petPolicyLine(sent, { fee: true })
        )}
      </p>
      {error ? <p className="text-meta text-danger">{error}</p> : null}
      <p className="text-tiny text-ink-600">
        Assistance animals aren’t pets: they can’t be refused or charged pet fees.
      </p>
    </fieldset>
  );
}
