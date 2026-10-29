'use client';
import { useActionState, useState } from 'react';
import CancellationPolicyEditor from './CancellationPolicyEditor';
import { ArrowDown, ArrowUp, Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  saveHotelGst,
  saveHotelRates,
  saveHotelRooms,
  saveHotelStay,
  saveRules,
} from '@/lib/actions/partner';
import { displayMoney } from '@/lib/domain/display-money';
import {
  EXTRA_PLACE_LABELS,
  MEALS as MEAL_KEYS,
  MEAL_DEFAULTS,
  ROOM_FACILITIES,
  SUPERVISION_LINE,
  defaultChildPolicy,
  policyLine,
  policyProblem,
  resolveInclusions,
  roomSleeps,
} from '@/lib/domain/hotel-ui';
import { useStepFormId } from './chrome';
import { Field, Input, SaveButton, Section, VersionField, inputCls } from './SectionPrimitives';

/**
 * The hotel walkthrough's own steps (hotel plan, Phase 3): room types, rates,
 * check-in and check-out, house rules and GST. Saved rows keep their id;
 * removing a saved row deactivates it (the API refuses while rooms are booked ahead).
 */
const MAX_ROOM_TYPES = 30;
const BEDS = [
  ['king', 'King'],
  ['queen', 'Queen'],
  ['double', 'Double'],
  ['single', 'Single'],
  ['sofa_bed', 'Sofa bed'],
  ['bunk', 'Bunk'],
];
const VIEWS = [
  ['', 'No particular view'],
  ['city', 'City'],
  ['garden', 'Garden'],
  ['river', 'River'],
  ['sea', 'Sea'],
  ['pool', 'Pool'],
  ['hill', 'Hill'],
  ['courtyard', 'Courtyard'],
];
const ROOM_NAMES = ['Standard', 'Deluxe', 'Super Deluxe', 'Executive', 'Suite', 'Family Room'];
// Story 2.6: a rate uses the hotel default unless the owner picks other terms for it.
const CANCELLATION = [
  ['default', 'Hotel default', 'The cancellation refunds set for the whole hotel'],
  ['flexible', 'Flexible', 'Full refund until 24 hours before check-in, then none'],
  ['moderate', 'Moderate', 'Full refund until 3 days before check-in, then none'],
  ['strict', 'Strict', 'Full refund until 7 days before check-in, then none'],
  ['non_refundable', 'Non-refundable', 'No refund after booking (usually a cheaper rate)'],
  ['custom', 'Custom', 'Set this rate’s own refund windows'],
];
const MEALS = [
  ['EP', 'Room only'],
  ['CP', 'Breakfast'],
  ['MP', 'Breakfast and one meal'],
  ['AP', 'All meals'],
];
const DAYS = [
  [0, 'Sun'],
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
];
const ID_TYPES = [
  ['aadhaar', 'Aadhaar'],
  ['passport', 'Passport'],
  ['driving_licence', 'Driving licence'],
  ['voter_id', 'Voter ID'],
];

/** API field errors ("rooms.0.name") as one list the owner can read. */
function Errors({ state }) {
  const messages = Object.values(state?.errors ?? {})
    .flat()
    .filter(Boolean);
  return messages.length ? (
    <ul role="alert" className="space-y-1 text-meta font-medium text-danger">
      {[...new Set(messages)].map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  ) : null;
}

function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border text-ink-700 hover:bg-ink-50 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

function Segmented({ name, value, options, onChange, legend }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-meta font-semibold text-ink-800">{legend}</legend>
      <div className="inline-flex flex-wrap rounded-full border border-border p-1">
        {options.map(([option, label]) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-meta text-ink-700 has-[:checked]:bg-brand-600 has-[:checked]:font-semibold has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={option}
                checked={onChange ? checked : undefined}
                defaultChecked={onChange ? undefined : checked}
                onChange={onChange ? () => onChange(option) : undefined}
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ----------------------------------------------------------- child policy */

const ageInput =
  'min-h-11 w-16 rounded-md border border-border bg-transparent px-2 text-meta tabular';
const toNum = (value) => (value === '' ? '' : Number(value));
/** Numbers as the API wants them; blanks stay blank so the live check names them. */
// Blanks stay blank (never 0): policyProblem names them and the save is blocked.
const keep = (value) => (value === '' || value == null ? '' : Number(value));
const policyPayload = (policy) => ({
  adultRateFromAge: keep(policy.adultRateFromAge),
  bands: policy.bands.map((b) => ({
    kind: b.kind,
    fromAge: keep(b.fromAge),
    toAge: keep(b.toAge),
    rule:
      b.rule.type === 'free'
        ? { type: 'free', amount: 0 }
        : { type: 'fixed', amount: keep(b.rule.amount) },
  })),
});
/** Story 3.6: the policy a room keeps when it holds its own child price: `policy` with its child-kind paid bands at `extraChild`. */
const isChildPrice = (b) => b.kind === 'child' && b.rule.type === 'fixed';
const withChildPrice = (policy, extraChild) => ({
  ...policy,
  // Only child-kind paid bands take the room's price; infant bands and other amounts stay as the owner set them.
  bands: policy.bands.map((b) =>
    isChildPrice(b) ? { ...b, rule: { type: 'fixed', amount: extraChild } } : b,
  ),
});
/** One room as the rooms API takes it. */
const roomPayload = (r, index) => ({
  ...(r.id ? { id: r.id } : {}),
  name: r.name.trim(),
  beds: r.beds.map((b) => ({ type: b.type, count: Number(b.count) || 1 })),
  extraPlaces: (r.extraPlaces ?? []).map((p) => ({
    type: p.type,
    count: Number(p.count) || 1,
    charge: { mode: p.charge?.mode ?? 'fixed', amount: Number(p.charge?.amount) || 0 },
  })),
  extraAdultIncludesBedding: r.extraAdultIncludesBedding === true,
  sizeSqm: r.sizeSqm === '' || r.sizeSqm == null ? null : Number(r.sizeSqm),
  view: r.view || null,
  maxAdults: Number(r.maxAdults) || 0,
  maxChildren: Number(r.maxChildren) || 0,
  maxOccupancy: Number(r.maxOccupancy) || 0,
  baseOccupancy: Number(r.baseOccupancy) || 0,
  roomCount: Number(r.roomCount) || 0,
  extraAdult: Number(r.extraAdult) || 0,
  extraChild: Number(r.extraChild) || 0,
  childPolicy: r.childPolicy ? policyPayload(r.childPolicy) : null,
  cots: { count: Number(r.cots?.count) || 0, amount: keep(r.cots?.amount ?? 0) },
  amenities: r.amenities ?? [],
  sortOrder: (index + 1) * 10,
  isActive: r.isActive !== false,
});

/** Story 3.6: infant/child bands and the adult-rate age, with live gap/overlap errors. */
function ChildPolicyEditor({ id, policy, onChange, error }) {
  const set = (i, patch) =>
    onChange({ ...policy, bands: policy.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const problem = policyProblem(policyPayload(policy));
  const last = policy.bands.at(-1);
  return (
    <div role="group" aria-labelledby={`${id}-title`} className="space-y-2">
      <p id={`${id}-title`} className="text-meta font-semibold text-ink-800">
        Child ages and prices{' '}
        <span className="font-normal text-ink-600">
          (per child per night, beyond the guests the price includes)
        </span>
      </p>
      <ul className="space-y-2">
        {policy.bands.map((band, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
          >
            <select
              aria-label={`Band ${i + 1} kind`}
              className="min-h-11 rounded-md bg-transparent px-1 text-meta"
              value={band.kind}
              onChange={(event) => set(i, { kind: event.target.value })}
            >
              <option value="infant">Infant</option>
              <option value="child">Child</option>
            </select>
            <span className="text-meta text-ink-600">ages</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              required
              className={ageInput}
              aria-label={`Band ${i + 1} from age`}
              value={band.fromAge}
              onChange={(event) => set(i, { fromAge: toNum(event.target.value) })}
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              required
              className={ageInput}
              aria-label={`Band ${i + 1} to age`}
              value={band.toAge}
              onChange={(event) => set(i, { toAge: toNum(event.target.value) })}
            />
            <select
              aria-label={`Band ${i + 1} price`}
              className="min-h-11 rounded-md bg-transparent px-1 text-meta"
              value={band.rule.type}
              onChange={(event) => set(i, { rule: { type: event.target.value, amount: 0 } })}
            >
              <option value="free">Free</option>
              <option value="fixed">₹ / night</option>
            </select>
            {band.rule.type === 'fixed' ? (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50000}
                required
                className="min-h-11 w-24 rounded-md border border-border bg-transparent px-2 text-meta tabular"
                aria-label={`Band ${i + 1} price in rupees per night`}
                value={band.rule.amount}
                onChange={(event) =>
                  set(i, { rule: { type: 'fixed', amount: toNum(event.target.value) } })
                }
              />
            ) : null}
            <IconButton
              label={`Remove band ${i + 1}`}
              disabled={policy.bands.length === 1}
              onClick={() => onChange({ ...policy, bands: policy.bands.filter((_, j) => j !== i) })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {policy.bands.length < 8 ? (
          <button
            type="button"
            onClick={() => {
              const from = Math.min(17, (Number(last?.toAge) || 0) + 1);
              onChange({
                ...policy,
                bands: [
                  ...policy.bands,
                  { kind: 'child', fromAge: from, toAge: from, rule: { type: 'fixed', amount: 0 } },
                ],
              });
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-semibold text-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" /> Add age band
          </button>
        ) : null}
        <label className="inline-flex min-h-11 items-center gap-2 text-meta">
          Adult rate from age
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={18}
            required
            className={ageInput}
            value={policy.adultRateFromAge}
            onChange={(event) =>
              onChange({ ...policy, adultRateFromAge: toNum(event.target.value) })
            }
          />
        </label>
      </div>
      <p className="text-meta text-ink-600">
        {policy.adultRateFromAge === 18 || policy.adultRateFromAge === ''
          ? '18 = no child pays the adult rate. '
          : ''}
        Minors on the adult rate still need an adult in the room. {SUPERVISION_LINE}.
      </p>
      {problem || error ? (
        <p role="alert" className="text-meta font-medium text-danger">
          {problem ?? error}
        </p>
      ) : (
        <p className="text-meta text-ink-700">Guests see: {policyLine(policyPayload(policy))}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ rooms */

const blankRoom = (index, key = `new-${index}`) => ({
  key,
  name: ROOM_NAMES[index] ?? `Room type ${index + 1}`,
  beds: [{ type: 'double', count: 1 }],
  extraPlaces: [],
  amenities: [],
  sizeSqm: '',
  view: '',
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  baseOccupancy: 2,
  roomCount: 1,
  extraAdult: 0,
  extraChild: 0,
  extraAdultIncludesBedding: false,
  childPolicy: null,
  cots: { count: 0, amount: 0 },
  isActive: true,
  upcomingRooms: 0,
});
const roomFromApi = (row) => ({
  ...row,
  key: row.id,
  // Story 3.4: places saved before bedding prices show as free (fixed ₹0).
  extraPlaces: (row.extraPlaces ?? []).map((p) => ({
    ...p,
    charge: p.charge ?? { mode: 'fixed', amount: 0 },
  })),
  extraAdultIncludesBedding: row.extraAdultIncludesBedding === true,
  childPolicy: row.childPolicy ?? null,
  cots: { count: row.cots?.count ?? 0, amount: row.cots?.amount ?? 0 },
  amenities: row.amenities ?? [],
  sizeSqm: row.sizeSqm ?? '',
  view: row.view ?? '',
  isActive: row.isActive !== false,
});

/** Story 3.3: extra beds or mattresses; each sleeps one. Story 3.4: each type's price per place per night. */
function ExtraPlaces({ room, onChange }) {
  const places = room.extraPlaces;
  const set = (i, patch) => onChange(places.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div role="group" aria-label={`Extra sleeping places in ${room.name || 'this room type'}`}>
      <p className="mb-1.5 text-meta font-semibold text-ink-800">
        Extra sleeping places <span className="font-normal text-ink-600">(each sleeps 1)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {places.map((place, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-border py-1 pl-2 pr-1"
          >
            <select
              aria-label={`Extra place ${i + 1} count`}
              className="min-h-11 rounded-md bg-transparent px-1 text-meta"
              value={place.count}
              onChange={(event) => set(i, { count: Number(event.target.value) })}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <select
              aria-label={`Extra place ${i + 1} type`}
              className="min-h-11 rounded-md bg-transparent px-1 text-meta"
              value={place.type}
              onChange={(event) => set(i, { type: event.target.value })}
            >
              {Object.entries(EXTRA_PLACE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label={`Extra place ${i + 1} price type`}
              className="min-h-11 rounded-md bg-transparent px-1 text-meta"
              value={place.charge?.mode ?? 'fixed'}
              onChange={(event) => set(i, { charge: { mode: event.target.value, amount: 0 } })}
            >
              <option value="fixed">₹ / night</option>
              <option value="percent">% of room</option>
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={place.charge?.mode === 'percent' ? 100 : 50000}
              aria-label={`Extra place ${i + 1} price ${place.charge?.mode === 'percent' ? 'percent of the room-only rate' : 'in rupees per night'}`}
              className="min-h-11 w-20 rounded-md border border-border bg-transparent px-2 text-meta"
              value={place.charge?.amount ?? 0}
              // A blank price never saves as ₹0: the browser blocks the submit and the hint below says why.
              required
              aria-invalid={place.charge?.amount === '' || undefined}
              aria-describedby={
                place.charge?.amount === '' ? `${room.key}-place-${i}-error` : undefined
              }
              onChange={(event) =>
                set(i, {
                  charge: {
                    mode: place.charge?.mode ?? 'fixed',
                    amount: event.target.value === '' ? '' : Number(event.target.value),
                  },
                })
              }
            />
            <IconButton
              label={`Remove extra place ${i + 1}`}
              onClick={() => onChange(places.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
            {place.charge?.amount === '' ? (
              <span
                id={`${room.key}-place-${i}-error`}
                role="alert"
                className="pr-2 text-tiny text-danger"
              >
                Enter a price (0 for free)
              </span>
            ) : null}
          </span>
        ))}
        {places.length < 2 ? (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...places,
                {
                  type: places.some((p) => p.type === 'extra_bed') ? 'mattress' : 'extra_bed',
                  count: 1,
                  charge: { mode: 'fixed', amount: 0 },
                },
              ])
            }
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-semibold text-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" /> Add extra bed or mattress
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Live check of the server rule: beds plus extra places must sleep every adult. */
function CapacityLine({ room }) {
  const { inBeds, extra, total } = roomSleeps(room.beds, room.extraPlaces);
  const adults = Number(room.maxAdults) || 0;
  const short = total < adults;
  return (
    <p className={`text-meta ${short ? 'font-medium text-danger' : 'text-ink-600'}`}>
      Sleeps {inBeds} in beds{extra ? ` + ${extra} extra` : ''} = {total} adult
      {total === 1 ? '' : 's'}
      {short ? `. Add a sleeping place or lower max adults to ${total}.` : ''}
    </p>
  );
}

/** "In this room": room facilities, separate from the hotel-wide list. Unknown saved keys are kept. */
function RoomFacilities({ room, onChange }) {
  const chosen = new Set(room.amenities);
  return (
    <fieldset>
      <legend className="mb-1.5 text-meta font-semibold text-ink-800">In this room</legend>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROOM_FACILITIES.map(([key, label]) => (
          <label
            key={key}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-meta"
          >
            <input
              type="checkbox"
              className="size-5"
              checked={chosen.has(key)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...room.amenities, key]
                    : room.amenities.filter((a) => a !== key),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Story 3.6: the property child policy or a room-specific one, plus cots for infants beyond max guests. */
function RoomChildren({ room, onChange, propertyPolicy, childFreeAge }) {
  const own = room.childPolicy != null;
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Segmented
        name={`room-${room.key}-children`}
        legend="Children"
        value={own ? 'room' : 'property'}
        options={[
          ['property', 'Use property child policy'],
          ['room', 'Room-specific policy'],
        ]}
        onChange={(value) =>
          onChange({
            childPolicy:
              value === 'room'
                ? withChildPrice(
                    propertyPolicy ?? defaultChildPolicy(childFreeAge ?? 6, 0),
                    Number(room.extraChild) || 0,
                  )
                : null,
          })
        }
      />
      {own ? (
        <ChildPolicyEditor
          id={`room-${room.key}-policy`}
          policy={room.childPolicy}
          onChange={(childPolicy) => onChange({ childPolicy })}
        />
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        {!own && !propertyPolicy ? (
          <Field
            id={`room-${room.key}-extraChild`}
            label="Extra child ₹"
            hint={`per night, age ${childFreeAge ?? 6}+`}
          >
            <Input
              id={`room-${room.key}-extraChild`}
              type="number"
              inputMode="numeric"
              min={0}
              max={50000}
              required
              className="tabular"
              value={room.extraChild}
              onChange={(event) => onChange({ extraChild: toNum(event.target.value) })}
            />
          </Field>
        ) : null}
        <Field id={`room-${room.key}-cots`} label="Cots" hint="for infants beyond max guests">
          <select
            id={`room-${room.key}-cots`}
            className={inputCls}
            value={room.cots.count}
            onChange={(event) =>
              onChange({ cots: { ...room.cots, count: Number(event.target.value) } })
            }
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'No cots' : n}
              </option>
            ))}
          </select>
        </Field>
        {room.cots.count ? (
          <Field id={`room-${room.key}-cot-price`} label="Cot ₹" hint="per night, 0 = free">
            <Input
              id={`room-${room.key}-cot-price`}
              type="number"
              inputMode="numeric"
              min={0}
              max={50000}
              required
              className="tabular"
              value={room.cots.amount}
              onChange={(event) =>
                onChange({ cots: { ...room.cots, amount: toNum(event.target.value) } })
              }
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

export function HotelRoomsSection({
  listing,
  roomTypes = [],
  capacityWarnings = [],
  profile = null,
}) {
  const [state, action, pending] = useActionState(saveHotelRooms, {});
  const [rooms, setRooms] = useState(() =>
    roomTypes.length ? roomTypes.map(roomFromApi) : [blankRoom(1, 'new-0')],
  );
  const active = rooms.filter((r) => r.isActive);
  const removed = rooms.filter((r) => !r.isActive);
  const total = active.reduce((sum, r) => sum + (Number(r.roomCount) || 0), 0);
  const update = (key, patch) =>
    setRooms((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (key, delta) =>
    setRooms((rows) => {
      const list = rows.filter((r) => r.isActive);
      const index = list.findIndex((r) => r.key === key);
      const target = index + delta;
      if (target < 0 || target >= list.length) return rows;
      [list[index], list[target]] = [list[target], list[index]];
      return [...list, ...rows.filter((r) => !r.isActive)];
    });
  const remove = (room) =>
    setRooms((rows) =>
      room.id
        ? rows.map((r) => (r.key === room.key ? { ...r, isActive: false } : r))
        : rows.filter((r) => r.key !== room.key),
    );
  const payload = [...active, ...removed].map(roomPayload);
  // Story 3.6: a blank or uncovered child band blocks the save; the editor names the problem.
  const blocked = active.some((r) => r.childPolicy && policyProblem(policyPayload(r.childPolicy)));
  const numberField = (room, field, label, { min = 0, max = 500, hint } = {}) => (
    <Field id={`room-${room.key}-${field}`} label={label} hint={hint}>
      <Input
        id={`room-${room.key}-${field}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={room[field]}
        className="tabular"
        onChange={(event) => update(room.key, { [field]: event.target.value })}
      />
    </Field>
  );

  return (
    <Section
      id="rooms"
      title="Rooms"
      intro="Group identical rooms into a room type. Guests book a type; you choose the room number at check-in."
      state={state}
      pending={pending}
    >
      <form
        id={useStepFormId()}
        action={action}
        className="space-y-4"
        onSubmit={(event) => blocked && event.preventDefault()}
      >
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <input type="hidden" name="rooms" value={JSON.stringify(payload)} />
        <Errors state={state} />
        {capacityWarnings.length ? (
          <div
            role="alert"
            className="rounded-md border border-warning/30 bg-warning-bg p-3 text-meta"
          >
            <p className="font-semibold">Add a sleeping place or lower max adults</p>
            <p className="text-ink-700">
              Guests can still book these rooms, but your next save needs a bed for every adult.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {capacityWarnings.map((w) => (
                <li key={w.roomTypeId}>{w.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p role="status" className="text-meta text-ink-600">
          {active.length} room type{active.length === 1 ? '' : 's'} · {total} room
          {total === 1 ? '' : 's'} in total
        </p>
        <ol className="space-y-3">
          {active.map((room, index) => (
            <li key={room.key} className="rounded-lg border border-border bg-card p-4">
              <fieldset className="space-y-4">
                <legend className="sr-only">Room type {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                  <Field id={`room-${room.key}-name`} label="Room type name">
                    <Input
                      id={`room-${room.key}-name`}
                      value={room.name}
                      list="hotel-room-names"
                      maxLength={60}
                      required
                      onChange={(event) => update(room.key, { name: event.target.value })}
                    />
                  </Field>
                  {numberField(room, 'roomCount', 'Rooms of this type', { min: 1, max: 500 })}
                </div>

                <div role="group" aria-label={`Beds in ${room.name || `room type ${index + 1}`}`}>
                  <p className="mb-1.5 text-meta font-semibold text-ink-800">Beds</p>
                  <div className="flex flex-wrap gap-2">
                    {room.beds.map((bed, bedIndex) => (
                      <span
                        key={bedIndex}
                        className="inline-flex items-center gap-2 rounded-full border border-border py-1 pl-2 pr-1"
                      >
                        <select
                          aria-label="Bed count"
                          className="min-h-11 rounded-md bg-transparent px-1 text-meta"
                          value={bed.count}
                          onChange={(event) =>
                            update(room.key, {
                              beds: room.beds.map((b, i) =>
                                i === bedIndex ? { ...b, count: Number(event.target.value) } : b,
                              ),
                            })
                          }
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Bed type"
                          className="min-h-11 rounded-md bg-transparent px-1 text-meta"
                          value={bed.type}
                          onChange={(event) =>
                            update(room.key, {
                              beds: room.beds.map((b, i) =>
                                i === bedIndex ? { ...b, type: event.target.value } : b,
                              ),
                            })
                          }
                        >
                          {BEDS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <IconButton
                          label="Remove bed"
                          disabled={room.beds.length === 1}
                          onClick={() =>
                            update(room.key, { beds: room.beds.filter((_, i) => i !== bedIndex) })
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </IconButton>
                      </span>
                    ))}
                    {room.beds.length < 4 ? (
                      <button
                        type="button"
                        onClick={() =>
                          update(room.key, { beds: [...room.beds, { type: 'single', count: 1 }] })
                        }
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-semibold text-brand-700"
                      >
                        <Plus className="size-4" aria-hidden="true" /> Add beds
                      </button>
                    ) : null}
                  </div>
                </div>

                <ExtraPlaces
                  room={room}
                  onChange={(extraPlaces) => update(room.key, { extraPlaces })}
                />

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  {numberField(room, 'maxAdults', 'Max adults', { min: 1, max: 12 })}
                  {numberField(room, 'maxChildren', 'Max children', { min: 0, max: 12 })}
                  {numberField(room, 'maxOccupancy', 'Max guests', { min: 1, max: 16 })}
                  {numberField(room, 'baseOccupancy', 'Price includes', {
                    min: 1,
                    max: 16,
                    hint: 'guests',
                  })}
                </div>
                <CapacityLine room={room} />
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  {numberField(room, 'extraAdult', 'Extra adult ₹', {
                    max: 50000,
                    hint: 'per night',
                  })}
                  {numberField(room, 'sizeSqm', 'Size m²', { min: 4, max: 2000, hint: 'optional' })}
                  <Field id={`room-${room.key}-view`} label="View">
                    <select
                      id={`room-${room.key}-view`}
                      className={inputCls}
                      value={room.view}
                      onChange={(event) => update(room.key, { view: event.target.value })}
                    >
                      {VIEWS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-meta">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={room.extraAdultIncludesBedding === true}
                    onChange={(event) =>
                      update(room.key, { extraAdultIncludesBedding: event.target.checked })
                    }
                  />
                  Extra adult price includes bedding
                </label>

                <RoomChildren
                  room={room}
                  propertyPolicy={profile?.childPolicy ?? null}
                  childFreeAge={profile?.childFreeAge}
                  onChange={(patch) => update(room.key, patch)}
                />

                <RoomFacilities
                  room={room}
                  onChange={(amenities) => update(room.key, { amenities })}
                />

                <div className="flex flex-wrap gap-2">
                  <IconButton
                    label="Move up"
                    disabled={index === 0}
                    onClick={() => move(room.key, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === active.length - 1}
                    onClick={() => move(room.key, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Duplicate"
                    disabled={rooms.length >= MAX_ROOM_TYPES}
                    onClick={() =>
                      setRooms((rows) => [
                        ...rows,
                        {
                          ...room,
                          key: `copy-${rows.length}-${room.key}`,
                          id: undefined,
                          name: `${room.name} copy`,
                          upcomingRooms: 0,
                        },
                      ])
                    }
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Remove"
                    disabled={active.length === 1 || room.upcomingRooms > 0}
                    onClick={() => remove(room)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </IconButton>
                  {room.upcomingRooms > 0 ? (
                    <p className="self-center text-tiny text-ink-600">
                      {room.upcomingRooms} room{room.upcomingRooms === 1 ? '' : 's'} booked ahead:
                      this type stays on sale.
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <datalist id="hotel-room-names">
          {ROOM_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button
          type="button"
          disabled={rooms.length >= MAX_ROOM_TYPES}
          onClick={() =>
            setRooms((rows) => [...rows, blankRoom(active.length, `new-${rows.length}`)])
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" /> Add a room type
        </button>
        {removed.length ? (
          <details className="rounded-md border border-border p-3 text-meta">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Removed room types ({removed.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {removed.map((room) => (
                <li key={room.key} className="flex items-center justify-between gap-3">
                  <span>{room.name}</span>
                  <button
                    type="button"
                    onClick={() => update(room.key, { isActive: true })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <SaveButton pending={pending} label="Save rooms" />
      </form>
    </Section>
  );
}

/* ------------------------------------------------------------------ rates */

const MEAL_WORDS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

/**
 * Story 3.3: what the meal plan includes. The code's minimum is fixed; the owner may add meals,
 * and MP needs lunch or dinner picked. null means "use the default".
 */
function MealInclusions({ plan, onChange }) {
  const minimum = MEAL_DEFAULTS[plan.mealPlan] ?? MEAL_DEFAULTS.EP;
  const current = resolveInclusions(plan.mealPlan, plan.inclusions);
  const overridden = MEAL_KEYS.some((meal) => current[meal] !== minimum[meal]);
  const needsPick = plan.mealPlan === 'MP' && !current.lunch && !current.dinner;
  const toggle = (meal, on) => {
    const next = { ...current, [meal]: on };
    onChange(MEAL_KEYS.some((m) => next[m] !== minimum[m]) ? next : null);
  };
  return (
    <fieldset
      className="rounded-md bg-ink-50 px-3 py-2"
      aria-describedby={`plan-${plan.key}-meal-default`}
    >
      <legend className="sr-only">Meals included</legend>
      <p id={`plan-${plan.key}-meal-default`} className="text-tiny text-ink-600">
        Default for {plan.mealPlan}:{' '}
        {MEAL_KEYS.filter((m) => minimum[m])
          .map((m) => MEAL_WORDS[m].toLowerCase())
          .join(', ') || 'no meals'}
        {plan.mealPlan === 'MP' ? ' + lunch or dinner (choose)' : ''}
        {overridden ? <span className="ml-2 font-semibold text-brand-700">Changed</span> : null}
      </p>
      <div className="flex flex-wrap gap-x-4">
        {MEAL_KEYS.map((meal) => (
          <label key={meal} className="inline-flex min-h-11 items-center gap-2 text-meta">
            <input
              type="checkbox"
              className="size-5"
              checked={current[meal]}
              disabled={minimum[meal]}
              onChange={(event) => toggle(meal, event.target.checked)}
            />
            {MEAL_WORDS[meal]}
          </label>
        ))}
      </div>
      {needsPick ? (
        <p role="alert" className="text-tiny font-medium text-danger">
          Choose lunch or dinner for this plan.
        </p>
      ) : null}
    </fieldset>
  );
}

/** GST at today's rate, per room per night (the API's tax slabs are the source of truth). */
const withGst = (rupees) => Math.round(rupees * (rupees <= 7500 ? 1.05 : 1.18));

const planFromApi = (row) => ({ ...row, key: row.id });
const basePlan = (room) => ({
  key: `base-${room.id}`,
  roomTypeId: room.id,
  name: 'Room only',
  mealPlan: 'EP',
  derivedFrom: null,
  weekday: '',
  weekend: '',
  adjustPct: 0,
  perGuest: 0,
  cancellation: 'default',
  minNights: 1,
  isActive: true,
});

export function HotelRatesSection({ listing, roomTypes = [], ratePlans = [], hotelPolicy }) {
  const [defaultPolicy, setDefaultPolicy] = useState(hotelPolicy);
  const [state, action, pending] = useActionState(saveHotelRates, {});
  const formId = useStepFormId();
  const rooms = roomTypes.filter((r) => r.isActive !== false);
  const [plans, setPlans] = useState(() => {
    const saved = ratePlans.map(planFromApi);
    return [
      ...saved,
      ...rooms.filter((r) => !saved.some((p) => p.roomTypeId === r.id)).map(basePlan),
    ];
  });
  const update = (key, patch) =>
    setPlans((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const add = (room, kind) => {
    const base = plans.find((p) => p.roomTypeId === room.id && !p.derivedFrom && p.isActive);
    const key = `${kind}-${room.id}-${plans.length}`;
    if (kind === 'breakfast' && base)
      setPlans((rows) => [
        ...rows,
        {
          ...basePlan(room),
          key,
          name: 'Breakfast included',
          mealPlan: 'CP',
          derivedFrom: base.id ?? base.key,
          perGuest: 250,
          cancellation: base.cancellation,
          cancellationPolicy: base.cancellationPolicy,
        },
      ]);
    else if (kind === 'nonref' && base)
      setPlans((rows) => [
        ...rows,
        {
          ...basePlan(room),
          key,
          name: 'Non-refundable',
          derivedFrom: base.id ?? base.key,
          adjustPct: -10,
          cancellation: 'non_refundable',
        },
      ]);
    else setPlans((rows) => [...rows, { ...basePlan(room), key, name: 'Another rate' }]);
  };
  const remove = (plan) =>
    setPlans((rows) =>
      plan.id
        ? rows.map((r) => (r.key === plan.key ? { ...r, isActive: false } : r))
        : rows.filter((r) => r.key !== plan.key && r.derivedFrom !== plan.key),
    );
  const payload = plans
    .filter((p) => rooms.some((r) => r.id === p.roomTypeId))
    .map((p, index) => ({
      ...(p.id ? { id: p.id } : { key: p.key }),
      roomTypeId: p.roomTypeId,
      name: p.name.trim(),
      mealPlan: p.mealPlan,
      derivedFrom: p.derivedFrom,
      weekday: p.derivedFrom ? null : p.weekday === '' ? null : Number(p.weekday),
      weekend: p.derivedFrom ? null : p.weekend === '' ? null : Number(p.weekend),
      adjustPct: Number(p.adjustPct) || 0,
      perGuest: Number(p.perGuest) || 0,
      cancellation: p.cancellation,
      ...(p.cancellation === 'custom' ? { cancellationPolicy: p.cancellationPolicy } : {}),
      minNights: Number(p.minNights) || 1,
      inclusions: p.inclusions ?? null,
      sortOrder: index,
      isActive: p.isActive,
    }));

  if (!rooms.length)
    return (
      <Section id="rates" title="Rates">
        <p className="text-body">Add your room types first. Each one gets its own rates.</p>
      </Section>
    );

  return (
    <Section
      id="rates"
      title="Rates"
      intro="Set a weekday and weekend price for each room type, then add plans guests can choose, like breakfast or non-refundable."
      state={state}
      pending={pending}
    >
      <form id={formId} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <input type="hidden" name="plans" value={JSON.stringify(payload)} />
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-h4">Hotel cancellation default</h3>
          <p className="mt-1 text-meta text-ink-600">
            Every rate uses this unless you choose other terms for it. Breakfast or room differences
            do not need their own copy. Accepted bookings keep the terms they were booked with.
          </p>
          <CancellationPolicyEditor
            name="defaultPolicy"
            rentalUnit="night"
            value={defaultPolicy}
            onChange={setDefaultPolicy}
            idPrefix="hotel-default"
          />
        </section>
        <Errors state={state} />
        {rooms.map((room) => {
          const own = plans.filter((p) => p.roomTypeId === room.id && p.isActive);
          const base = own.find((p) => !p.derivedFrom);
          return (
            <section key={room.id} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-h4">
                {room.name}{' '}
                <span className="text-meta font-normal text-ink-600">
                  · {room.roomCount} rooms · price for {room.baseOccupancy} guests
                </span>
              </h3>
              <ul className="mt-3 divide-y divide-border">
                {own.map((plan) => {
                  const parent = plan.derivedFrom
                    ? plans.find((p) => (p.id ?? p.key) === plan.derivedFrom)
                    : null;
                  const weekday = Number(plan.derivedFrom ? parent?.weekday : plan.weekday) || 0;
                  const adjust = (amount) =>
                    plan.derivedFrom
                      ? Math.round(
                          amount * (1 + (Number(plan.adjustPct) || 0) / 100) +
                            (Number(plan.perGuest) || 0) * room.baseOccupancy,
                        )
                      : amount;
                  return (
                    <li key={plan.key} className="space-y-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                        <Field id={`plan-${plan.key}-name`} label="Plan name">
                          <Input
                            id={`plan-${plan.key}-name`}
                            value={plan.name}
                            maxLength={60}
                            onChange={(event) => update(plan.key, { name: event.target.value })}
                          />
                        </Field>
                        <Field id={`plan-${plan.key}-meal`} label="Meals">
                          <select
                            id={`plan-${plan.key}-meal`}
                            className={inputCls}
                            value={plan.mealPlan}
                            onChange={(event) =>
                              update(plan.key, { mealPlan: event.target.value, inclusions: null })
                            }
                          >
                            {MEALS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <MealInclusions
                        plan={plan}
                        onChange={(inclusions) => update(plan.key, { inclusions })}
                      />
                      {plan.derivedFrom ? (
                        <div className="grid gap-3 grid-cols-2">
                          <Field
                            id={`plan-${plan.key}-pct`}
                            label="Change vs room only, %"
                            hint="e.g. -10 for 10% off"
                          >
                            <Input
                              id={`plan-${plan.key}-pct`}
                              type="number"
                              inputMode="numeric"
                              min={-50}
                              max={50}
                              value={plan.adjustPct}
                              className="tabular"
                              onChange={(event) =>
                                update(plan.key, { adjustPct: event.target.value })
                              }
                            />
                          </Field>
                          <Field
                            id={`plan-${plan.key}-guest`}
                            label="Plus per guest ₹"
                            hint="per night, e.g. breakfast"
                          >
                            <Input
                              id={`plan-${plan.key}-guest`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={10000}
                              value={plan.perGuest}
                              className="tabular"
                              onChange={(event) =>
                                update(plan.key, { perGuest: event.target.value })
                              }
                            />
                          </Field>
                        </div>
                      ) : (
                        <div className="grid gap-3 grid-cols-2">
                          {['weekday', 'weekend'].map((day) => (
                            <Field
                              key={day}
                              id={`plan-${plan.key}-${day}`}
                              label={day === 'weekday' ? 'Weekday ₹ / night' : 'Weekend ₹ / night'}
                            >
                              <Input
                                id={`plan-${plan.key}-${day}`}
                                type="number"
                                inputMode="numeric"
                                min={300}
                                max={200000}
                                required
                                value={plan[day]}
                                className="tabular"
                                onChange={(event) =>
                                  update(plan.key, { [day]: event.target.value })
                                }
                              />
                            </Field>
                          ))}
                        </div>
                      )}
                      <Field id={`plan-${plan.key}-cancel`} label="Cancellation">
                        <select
                          id={`plan-${plan.key}-cancel`}
                          className={inputCls}
                          value={plan.cancellation}
                          onChange={(event) =>
                            update(plan.key, {
                              cancellation: event.target.value,
                              cancellationPolicy: plan.cancellationPolicy ?? defaultPolicy,
                            })
                          }
                        >
                          {CANCELLATION.map(([value, label, text]) => (
                            <option key={value} value={value}>
                              {label} — {text}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {plan.cancellation === 'custom' ? (
                        <CancellationPolicyEditor
                          name={`plan-${plan.key}-policy`}
                          rentalUnit="night"
                          value={plan.cancellationPolicy ?? defaultPolicy}
                          onChange={(next) => update(plan.key, { cancellationPolicy: next })}
                          idPrefix={`plan-${plan.key}`}
                        />
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-meta text-ink-700" aria-live="polite">
                          {weekday >= 300
                            ? `Guests pay ${displayMoney(withGst(adjust(weekday)) * 100)} on a weekday incl. GST (${adjust(weekday) <= 7500 ? 5 : 18}%)`
                            : 'Enter a price to see what guests pay'}
                        </p>
                        <IconButton
                          label={`Remove ${plan.name}`}
                          disabled={!plan.derivedFrom && own.length > 1}
                          onClick={() => remove(plan)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                {base
                  ? [
                      ['breakfast', '+ Breakfast plan'],
                      ['nonref', '+ Non-refundable'],
                    ].map(([kind, label]) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => add(room, kind)}
                        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {label}
                      </button>
                    ))
                  : null}
              </div>
            </section>
          );
        })}
        <SaveButton pending={pending} label="Save rates" />
      </form>
    </Section>
  );
}

/* ------------------------------------------------------------ stay, rules, GST */

const hhmm = (minute) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/**
 * Story 3.6: rooms on the old rule (no own policy) and their extra child prices, most common first.
 * A first property policy seeds that price, never ₹0.
 */
function fallbackPrices(roomTypes) {
  const counts = new Map();
  for (const r of roomTypes.filter((r) => r.isActive !== false && !r.childPolicy)) {
    const price = Number(r.extraChild) || 0;
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([price]) => price);
}

export function HotelStaySection({ listing, profile, roomTypes = [] }) {
  const [state, action, pending] = useActionState(saveHotelStay, {});
  const [keepState, keepAction, keeping] = useActionState(saveHotelRooms, {});
  const weekend = profile?.weekendNights ?? [5, 6];
  const e = state.errors ?? {};
  const prices = fallbackPrices(roomTypes);
  // Story 3.6: an untouched editor sends nothing, so hotels on the old "under N free" rule keep each room's child price.
  const [childPolicy, setChildPolicy] = useState(
    () => profile?.childPolicy ?? defaultChildPolicy(profile?.childFreeAge ?? 6, prices[0] ?? 0),
  );
  const [touched, setTouched] = useState(Boolean(profile?.childPolicy));
  const problem = policyProblem(policyPayload(childPolicy));
  const kept = keepState?.ok === true;
  // Only a first property policy replaces room prices; a saved one already applies.
  const mixed = !profile?.childPolicy && !kept && prices.length > 1;
  // The same bands the keep form replaces with each room's price.
  const applied = childPolicy.bands.find(isChildPrice)?.rule.amount;
  const keepRooms = [...roomTypes]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((r) =>
      r.isActive !== false && !r.childPolicy
        ? {
            ...r,
            childPolicy: withChildPrice(policyPayload(childPolicy), Number(r.extraChild) || 0),
          }
        : r,
    );
  return (
    <Section
      id="stay"
      title="Check-in and check-out"
      intro="Guests see these times on the hotel page and their booking."
      state={state}
      pending={pending}
    >
      <form
        id={useStepFormId()}
        action={action}
        className="space-y-5"
        onSubmit={(event) => touched && problem && event.preventDefault()}
      >
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state, keepState]} />
        <div className="grid gap-4 grid-cols-2">
          <Field id="checkInTime" label="Check-in from" error={e.checkInTime}>
            <Input
              id="checkInTime"
              name="checkInTime"
              type="time"
              defaultValue={hhmm(profile?.checkInMinute ?? 720)}
              required
            />
          </Field>
          <Field id="checkOutTime" label="Check-out by" error={e.checkOutTime}>
            <Input
              id="checkOutTime"
              name="checkOutTime"
              type="time"
              defaultValue={hhmm(profile?.checkOutMinute ?? 660)}
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <Field id="starRating" label="Star category" hint="optional, only if certified">
            <select
              id="starRating"
              name="starRating"
              className={inputCls}
              defaultValue={profile?.starRating ?? ''}
            >
              <option value="">Not star-rated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} star
                </option>
              ))}
            </select>
          </Field>
        </div>
        {touched ? (
          <input
            type="hidden"
            name="childPolicy"
            value={JSON.stringify(policyPayload(childPolicy))}
          />
        ) : null}
        <div className="rounded-lg border border-border p-3">
          <ChildPolicyEditor
            id="childPolicy"
            policy={childPolicy}
            error={e['childPolicy.bands'] ?? e.childPolicy}
            onChange={(next) => {
              setTouched(true);
              setChildPolicy(next);
            }}
          />
          {mixed && touched ? (
            <div
              role="alert"
              className="mt-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-meta"
            >
              <p>
                Rooms have different child prices ({prices.map((n) => `₹${n}`).join(', ')}). Saving
                this policy applies ₹{applied ?? 0} to rooms without a room-specific policy.
              </p>
              <button
                type="submit"
                form="keep-room-child-prices"
                disabled={keeping || Boolean(problem)}
                className="mt-2 inline-flex min-h-11 items-center rounded-full border border-border px-4 font-semibold text-brand-700 disabled:opacity-40"
              >
                Keep each room&apos;s price
              </button>
            </div>
          ) : null}
          {kept ? (
            <p role="status" className="mt-2 text-meta text-ink-700">
              Each room now keeps its own child price as a room-specific policy.
            </p>
          ) : null}
          <Errors state={keepState} />
          {!touched ? (
            <p className="mt-1 text-meta text-ink-600">
              Until you change these bands, children under {profile?.childFreeAge ?? 6} stay free
              and older children pay each room&apos;s extra child price.
            </p>
          ) : null}
        </div>
        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-800">
            Nights priced as weekend
          </legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([day, label]) => (
              <label
                key={day}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-meta font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  name="weekendNights"
                  value={day}
                  defaultChecked={weekend.includes(day)}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-meta text-muted-foreground">
            The night of the day you tick. Friday and Saturday nights are the usual choice.
          </p>
        </fieldset>
        <SaveButton pending={pending} label="Save times" />
      </form>
      {/* Story 3.6: one click turns each room's current child price into its own room-specific policy. */}
      <form id="keep-room-child-prices" action={keepAction} hidden>
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state, keepState]} />
        <input type="hidden" name="rooms" value={JSON.stringify(keepRooms.map(roomPayload))} />
      </form>
    </Section>
  );
}

export function HotelRulesSection({ listing, profile }) {
  const [state, action, pending] = useActionState(saveRules, {});
  const p = profile?.policies ?? {};
  const yesNo = (value) => (value == null ? '' : value ? 'yes' : 'no');
  const e = state.errors ?? {};
  return (
    <Section
      id="rules"
      title="House rules"
      intro="Clear answers here decide which filters your hotel appears in, like couple-friendly and local ID."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <Segmented
          name="couples"
          legend="Unmarried couples can stay with valid ID"
          value={yesNo(p.couples)}
          options={[
            ['yes', 'Yes'],
            ['no', 'No'],
          ]}
        />
        {e.couples ? <p className="text-meta text-danger">{e.couples}</p> : null}
        <Segmented
          name="localId"
          legend="Guests with a local (same-city) ID are accepted"
          value={yesNo(p.localId)}
          options={[
            ['yes', 'Yes'],
            ['no', 'No'],
          ]}
        />
        {e.localId ? <p className="text-meta text-danger">{e.localId}</p> : null}
        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-800">
            ID accepted at check-in
          </legend>
          <div className="flex flex-wrap gap-2">
            {ID_TYPES.map(([value, label]) => (
              <label
                key={value}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 text-meta has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  name="idTypes"
                  value={value}
                  defaultChecked={(
                    p.idTypes ?? ['aadhaar', 'passport', 'driving_licence', 'voter_id']
                  ).includes(value)}
                />
                {label}
              </label>
            ))}
          </div>
          {e.idTypes ? <p className="mt-1 text-meta text-danger">{e.idTypes}</p> : null}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['pets', 'Pets allowed', p.pets],
            ['smoking', 'Smoking in rooms', p.smoking],
            ['parties', 'Parties allowed', p.parties],
          ].map(([name, legend, value]) => (
            <Segmented
              key={name}
              name={name}
              legend={legend}
              value={yesNo(value ?? false)}
              options={[
                ['yes', 'Yes'],
                ['no', 'No'],
              ]}
            />
          ))}
        </div>
        <Field
          id="extraRules"
          label="Anything else guests must know"
          hint="optional, up to 500 characters"
        >
          <textarea
            id="extraRules"
            name="extraRules"
            maxLength={500}
            rows={3}
            defaultValue={p.notes ?? ''}
            className={`${inputCls} py-3`}
          />
        </Field>
        <SaveButton pending={pending} label="Save rules" />
      </form>
    </Section>
  );
}

export function HotelGstForm({ listing, profile }) {
  const [state, action, pending] = useActionState(saveHotelGst, {});
  const answered = profile?.policies?.gstAnswered === true;
  const [registered, setRegistered] = useState(
    answered ? (profile.gstRegistered ? 'yes' : 'no') : '',
  );
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <input type="hidden" name="id" value={listing.id} />
      <VersionField listing={listing} states={[state]} />
      <h3 className="text-h4">GST</h3>
      <p className="text-meta text-ink-600">
        It decides who pays GST on your bookings and what your invoices show.
      </p>
      <Segmented
        name="gstRegistered"
        legend="Is the hotel registered for GST?"
        value={registered}
        onChange={setRegistered}
        options={[
          ['yes', 'Yes'],
          ['no', 'No'],
        ]}
      />
      {e.gstRegistered ? <p className="text-meta text-danger">{e.gstRegistered}</p> : null}
      {registered === 'yes' ? (
        <Field id="gstin" label="GSTIN" hint="15 characters, e.g. 24ABCDE1234F1Z5" error={e.gstin}>
          <Input
            id="gstin"
            name="gstin"
            defaultValue={profile?.gstin ?? ''}
            maxLength={15}
            autoCapitalize="characters"
            className="font-mono uppercase"
          />
        </Field>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !registered}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-meta font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save GST'}
        </button>
        {state.ok ? (
          <p role="status" className="text-meta text-success">
            Saved
          </p>
        ) : answered ? (
          <p className="text-meta text-ink-600">
            {profile.gstRegistered ? `Registered · ${profile.gstin}` : 'Not registered'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
