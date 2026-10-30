'use client';
import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { saveApartmentPrice, saveApartmentStay, saveApartmentUnit } from '@/lib/actions/partner';
import {
  APARTMENT_DEFAULTS,
  APARTMENT_LIVE_SOON,
  MAX_ARRIVAL_RANGES,
  WEEKDAYS,
  apartmentProblem,
  cleaningFeeLine,
} from '@/lib/domain/apartment';
import { BED_LABELS, roomSleeps } from '@/lib/domain/hotel-ui';
import { useStepFormId } from './chrome';
import { Field, Input, SaveButton, Section, VersionField, inputCls } from './SectionPrimitives';

/**
 * Story 3.10: a whole apartment's own steps — Unit, Stay rules and Price. Each form keeps its
 * values in state and sends them as one JSON `values` field, so a failed save loses nothing.
 */
const DAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
const NIGHTS = [
  [0, 'Sun'],
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
];
const num = (value) => (value === '' ? '' : Number(value));

function Errors({ state, problem }) {
  const messages = [
    ...new Set([...Object.values(state?.errors ?? {}).flat(), problem].filter(Boolean)),
  ];
  return messages.length ? (
    <ul role="alert" className="space-y-1 text-meta font-medium text-danger">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  ) : null;
}

function NumberField({ id, label, value, onChange, min, max, hint }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(num(event.target.value))}
        required
      />
    </Field>
  );
}

/** One step's form: state-held values, the version and a JSON payload. */
function useApartmentForm(action, initial) {
  const [state, submit, pending] = useActionState(action, {});
  const [values, setValues] = useState(initial);
  const set = (patch) => setValues((v) => ({ ...v, ...patch }));
  return { state, submit, pending, values, set };
}

function StepForm({ listing, form, part, children, saveLabel }) {
  const problem = apartmentProblem(part, form.values);
  return (
    <form
      id={useStepFormId()}
      action={form.submit}
      className="space-y-5"
      onSubmit={(event) => problem && event.preventDefault()}
    >
      <input type="hidden" name="id" value={listing.id} />
      <VersionField listing={listing} states={[form.state]} />
      <input type="hidden" name="values" value={JSON.stringify(form.values)} />
      {children}
      <Errors state={form.state} problem={problem} />
      <SaveButton pending={form.pending} label={saveLabel} />
    </form>
  );
}

export function ApartmentUnitSection({ listing, apartment }) {
  const a = apartment ?? APARTMENT_DEFAULTS;
  const form = useApartmentForm(saveApartmentUnit, {
    bedrooms: a.bedrooms,
    bathrooms: a.bathrooms,
    beds: a.beds?.length ? a.beds : [{ type: 'double', count: 1 }],
    maxAdults: a.maxAdults,
    maxChildren: a.maxChildren,
    maxOccupants: a.maxOccupants,
  });
  const { values: v, set } = form;
  const sleeps = roomSleeps(v.beds).inBeds;
  return (
    <Section
      id="space"
      title="The unit"
      intro="Guests book the whole apartment. Tell them what it has and who can stay."
      state={form.state}
      pending={form.pending}
    >
      <p role="note" className="mb-4 rounded-md bg-brand-50 p-3 text-meta text-ink-800">
        {APARTMENT_LIVE_SOON}
      </p>
      <StepForm listing={listing} form={form} part="unit" saveLabel="Save unit">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id="bedrooms"
            label="Bedrooms"
            min={0}
            max={20}
            value={v.bedrooms}
            onChange={(n) => set({ bedrooms: n })}
            hint="0 for a studio"
          />
          <NumberField
            id="bathrooms"
            label="Bathrooms"
            min={1}
            max={20}
            value={v.bathrooms}
            onChange={(n) => set({ bathrooms: n })}
          />
        </div>
        <div role="group" aria-label="Beds">
          <p className="mb-1.5 text-meta font-semibold text-ink-800">Beds</p>
          <div className="flex flex-wrap gap-2">
            {v.beds.map((bed, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-border py-1 pl-2 pr-1"
              >
                <select
                  aria-label="Bed count"
                  className="min-h-11 rounded-md bg-transparent px-1 text-meta"
                  value={bed.count}
                  onChange={(e) =>
                    set({
                      beds: v.beds.map((b, j) =>
                        j === i ? { ...b, count: Number(e.target.value) } : b,
                      ),
                    })
                  }
                >
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <select
                  aria-label="Bed type"
                  className="min-h-11 rounded-md bg-transparent px-1 text-meta"
                  value={bed.type}
                  onChange={(e) =>
                    set({
                      beds: v.beds.map((b, j) => (j === i ? { ...b, type: e.target.value } : b)),
                    })
                  }
                >
                  {Object.entries(BED_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Remove bed"
                  title="Remove bed"
                  disabled={v.beds.length === 1}
                  onClick={() => set({ beds: v.beds.filter((_, j) => j !== i) })}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </span>
            ))}
            {v.beds.length < 8 ? (
              <button
                type="button"
                onClick={() => set({ beds: [...v.beds, { type: 'single', count: 1 }] })}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-semibold text-brand-700"
              >
                <Plus className="size-4" aria-hidden="true" /> Add beds
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-meta text-ink-600" aria-live="polite">
            These beds sleep {sleeps} adult{sleeps === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <NumberField
            id="maxAdults"
            label="Max adults"
            min={1}
            max={30}
            value={v.maxAdults}
            onChange={(n) => set({ maxAdults: n })}
          />
          <NumberField
            id="maxChildren"
            label="Max children"
            min={0}
            max={20}
            value={v.maxChildren}
            onChange={(n) => set({ maxChildren: n })}
          />
          <NumberField
            id="maxOccupants"
            label="Max guests"
            min={1}
            max={50}
            value={v.maxOccupants}
            onChange={(n) => set({ maxOccupants: n })}
            hint="everyone staying"
          />
        </div>
      </StepForm>
    </Section>
  );
}

export function ApartmentStaySection({ listing, apartment }) {
  const a = apartment ?? APARTMENT_DEFAULTS;
  const form = useApartmentForm(saveApartmentStay, {
    minNights: a.minNights,
    maxNights: a.maxNights,
    arrivalRules: {
      weekdays: a.arrivalRules?.weekdays ?? {},
      ranges: a.arrivalRules?.ranges ?? [],
    },
    checkInTime: a.checkInTime ?? APARTMENT_DEFAULTS.checkInTime,
    checkOutTime: a.checkOutTime ?? APARTMENT_DEFAULTS.checkOutTime,
    turnoverNights: a.turnoverNights,
  });
  const { values: v, set } = form;
  const rules = v.arrivalRules;
  const setRules = (patch) => set({ arrivalRules: { ...rules, ...patch } });
  const setDay = (day, n) => {
    const weekdays = { ...rules.weekdays };
    if (n === '' || n == null) delete weekdays[day];
    else weekdays[day] = n;
    setRules({ weekdays });
  };
  return (
    <Section
      id="availability"
      title="Stay rules"
      intro="How long guests can stay, when they arrive and leave, and the nights you keep free to prepare."
      state={form.state}
      pending={form.pending}
    >
      <StepForm listing={listing} form={form} part="stay" saveLabel="Save stay rules">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id="minNights"
            label="Minimum nights"
            min={1}
            max={90}
            value={v.minNights}
            onChange={(n) => set({ minNights: n })}
          />
          <NumberField
            id="maxNights"
            label="Maximum nights"
            min={1}
            max={90}
            value={v.maxNights}
            onChange={(n) => set({ maxNights: n })}
            hint="up to 90"
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-800">
            Minimum nights by arrival day{' '}
            <span className="font-normal text-ink-600">(optional)</span>
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEKDAYS.map((day) => (
              <label key={day} className="flex flex-col gap-1 text-meta text-ink-700">
                {DAY_LABELS[day]}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  aria-label={`Minimum nights for a ${DAY_LABELS[day]} arrival`}
                  placeholder="–"
                  className={inputCls}
                  value={rules.weekdays[day] ?? ''}
                  onChange={(e) => setDay(day, num(e.target.value))}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-800">
            Minimum nights for dates{' '}
            <span className="font-normal text-ink-600">(optional, e.g. festivals)</span>
          </legend>
          <ul className="space-y-2">
            {rules.ranges.map((r, i) => {
              const patch = (p) =>
                setRules({ ranges: rules.ranges.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              return (
                <li key={i} className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-meta">
                    From
                    <input
                      type="date"
                      className={inputCls}
                      value={r.from}
                      onChange={(e) => patch({ from: e.target.value })}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-meta">
                    To
                    <input
                      type="date"
                      className={inputCls}
                      value={r.to}
                      onChange={(e) => patch({ to: e.target.value })}
                      required
                    />
                  </label>
                  <label className="flex w-28 flex-col gap-1 text-meta">
                    Min nights
                    <input
                      type="number"
                      min={1}
                      max={90}
                      className={inputCls}
                      value={r.minNights}
                      onChange={(e) => patch({ minNights: num(e.target.value) })}
                      required
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Remove date range"
                    title="Remove date range"
                    onClick={() => setRules({ ranges: rules.ranges.filter((_, j) => j !== i) })}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-border text-ink-700 hover:bg-ink-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {rules.ranges.length < MAX_ARRIVAL_RANGES ? (
            <button
              type="button"
              onClick={() =>
                setRules({
                  ranges: [...rules.ranges, { from: '', to: '', minNights: v.minNights || 1 }],
                })
              }
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-semibold text-brand-700"
            >
              <Plus className="size-4" aria-hidden="true" /> Add dates
            </button>
          ) : null}
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <Field id="checkInTime" label="Check-in from">
            <Input
              id="checkInTime"
              type="time"
              value={v.checkInTime}
              onChange={(e) => set({ checkInTime: e.target.value })}
              required
            />
          </Field>
          <Field id="checkOutTime" label="Check-out by">
            <Input
              id="checkOutTime"
              type="time"
              value={v.checkOutTime}
              onChange={(e) => set({ checkOutTime: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field
          id="turnoverNights"
          label="Nights kept free after each stay"
          hint="for cleaning and preparing; 0 to 3"
        >
          <select
            id="turnoverNights"
            className={inputCls}
            value={v.turnoverNights}
            onChange={(e) => set({ turnoverNights: Number(e.target.value) })}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'None' : `${n} night${n === 1 ? '' : 's'}`}
              </option>
            ))}
          </select>
        </Field>
      </StepForm>
    </Section>
  );
}

export function ApartmentPriceSection({ listing, apartment }) {
  const a = apartment ?? APARTMENT_DEFAULTS;
  const form = useApartmentForm(saveApartmentPrice, {
    weekday: a.weekday ?? '',
    weekend: a.weekend ?? '',
    cleaningFee: a.cleaningFee ?? 0,
    weekendNights: a.weekendNights ?? [5, 6],
  });
  const { values: v, set } = form;
  return (
    <Section
      id="pricing"
      title="Price"
      intro="One nightly price for the whole apartment, the same for any party up to your maximum guests."
      state={form.state}
      pending={form.pending}
    >
      <StepForm listing={listing} form={form} part="price" saveLabel="Save price">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id="weekday"
            label="Weekday night (₹)"
            min={1}
            max={500000}
            value={v.weekday}
            onChange={(n) => set({ weekday: n })}
          />
          <NumberField
            id="weekend"
            label="Weekend night (₹)"
            min={1}
            max={500000}
            value={v.weekend}
            onChange={(n) => set({ weekend: n })}
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-800">
            Nights priced as weekend
          </legend>
          <div className="flex flex-wrap gap-2">
            {NIGHTS.map(([day, label]) => (
              <label
                key={day}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-meta font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={v.weekendNights.includes(day)}
                  onChange={(e) =>
                    set({
                      weekendNights: e.target.checked
                        ? [...v.weekendNights, day].sort()
                        : v.weekendNights.filter((d) => d !== day),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <NumberField
          id="cleaningFee"
          label="Cleaning fee per stay (₹)"
          min={0}
          max={50000}
          value={v.cleaningFee}
          onChange={(n) => set({ cleaningFee: n })}
          hint="0 for none"
        />
        <p className="text-meta text-ink-700" aria-live="polite">
          Guests see: {cleaningFeeLine(Number(v.cleaningFee) || 0)}
        </p>
      </StepForm>
    </Section>
  );
}
