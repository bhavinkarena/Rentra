'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  Loader2, Check, Trash2, Upload, AlertTriangle, Star,
  ChevronLeft, ChevronRight, Pause, Play,
} from 'lucide-react';
import {
  saveBasics, saveLocation, saveCapacity, saveAmenities, saveRules,
  savePricing, saveTerms, uploadListingPhotos, removeListingPhoto,
  reorderListingPhotos, uploadOwnershipDocument, toggleListingPause,
} from '@/lib/auth/listings';
import { OWNERSHIP_DOC_TYPES, MIN_PHOTOS, MAX_PHOTOS } from '@/lib/domain/listing-completion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sectionAnchorId } from '@/lib/domain/listing-steps';
import { photoId } from '@/lib/domain/listing-photos';
import { useChrome, useIsWizard, useStepFormId } from './chrome';

/* ------------------------------ primitives ------------------------------ */

const inputCls = 'w-full rounded-sm border border-input bg-card px-3.5 py-3 text-meta '
  + 'text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none';

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-700">{label}</label>
      {children}
      {error
        ? <p className="mt-1.5 text-tiny font-medium text-danger">{error}</p>
        : hint ? <p className="mt-1.5 text-tiny text-ink-500">{hint}</p> : null}
    </div>
  );
}

/** Wraps a section: heading, save state, and the "sent back for review" note. */
function Section({ id, title, intro, state, pending, children }) {
  const { variant, onSaved, onPending } = useChrome();
  const wizard = variant === 'wizard';

  /**
   * Tell the walkthrough a save landed so it can move to the next step.
   *
   * Fires on the transition into `ok`, not on every render, so re-submitting
   * after fixing a validation error still advances exactly once. A failed
   * save never fires, which is what keeps a broken step from sliding past.
   */
  const wasOk = useRef(false);
  useEffect(() => {
    const ok = Boolean(state?.ok);
    if (ok && !wasOk.current && onSaved) onSaved(state);
    wasOk.current = ok;
  }, [state, onSaved]);

  // Keep the sticky bar's spinner honest about what the form is doing.
  useEffect(() => { onPending?.(Boolean(pending)); }, [pending, onPending]);

  const notices = (
    <>
      {state?.errors?._ ? (
        <p className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger`}>
          {state.errors._}
        </p>
      ) : null}

      {/* Trust-field edits on a LIVE listing pull it out of search until
          re-approved. Confirmed bookings are untouched — say so, or it reads
          like a punishment. */}
      {state?.sentBack ? (
        <p className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-amber-500 bg-amber-100 p-3 text-tiny text-amber-700`}>
          <strong>This change needs re-approval.</strong> The listing has left search until we
          check it — usually within 2 working days. Bookings already confirmed are unaffected.
        </p>
      ) : null}
    </>
  );

  if (wizard) {
    /**
     * The heading lives here, not in the walkthrough shell, so the wording of
     * each step exists in exactly one place. The shell owns chrome —
     * progress, Back, Next — and nothing that is about this step's content.
     */
    return (
      <section id={sectionAnchorId(id)}>
        <h1 className="text-h1">{title}</h1>
        {intro ? <p className="mt-2 max-w-prose text-body text-ink-600">{intro}</p> : null}
        {notices}
        <div className="mt-7 space-y-5">{children}</div>
      </section>
    );
  }

  return (
    <section id={sectionAnchorId(id)} className="scroll-mt-24 rounded-lg border border-border bg-card p-5">
      <h2 className="text-h3">{title}</h2>
      {intro ? <p className="mt-1 text-meta text-ink-600">{intro}</p> : null}

      {notices}

      <div className="mt-4 space-y-4">{children}</div>

      {state?.ok ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-meta font-semibold text-brand-700">
          <Check className="size-4" aria-hidden="true" /> Saved
        </p>
      ) : null}

      {pending ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-meta text-ink-500">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…
        </p>
      ) : null}
    </section>
  );
}

function SaveButton({ pending, label = 'Save' }) {
  // In the walkthrough the sticky bottom bar is the submit button. Rendering a
  // second one mid-form would give the step two competing primary actions.
  if (useIsWizard()) return null;

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

/* -------------------------------- basics -------------------------------- */

export function BasicsSection({ listing, categories }) {
  const [state, action, pending] = useActionState(saveBasics, {});
  const e = state.errors ?? {};

  return (
    <Section id="basics" title="What it is" intro="How guests find and recognise it." state={state} pending={pending}>
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <Field id="categoryId" label="Category" error={e.categoryId}>
          <select id="categoryId" name="categoryId" defaultValue={listing.categoryId} className={inputCls}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field
          id="title" label="Title"
          hint="Say what makes it different. “Riverside Farm with private pool” beats “Farmhouse in Kamrej”."
          error={e.title}
        >
          <Input
            id="title" name="title" maxLength={90}
            defaultValue={listing.title === 'Untitled property' ? '' : listing.title}
            placeholder="Riverside Farm with private pool"
          />
        </Field>
        <Field id="highlight" label="One-line highlight" hint="Shown on the card. Optional." error={e.highlight}>
          <Input id="highlight" name="highlight" maxLength={60} defaultValue={listing.highlight ?? ''} placeholder="Private pool" />
        </Field>
        <Field
          id="description" label="Description"
          hint="Write for someone deciding whether to drive 40km. What is it like, what is nearby, what should they know?"
          error={e.description}
        >
          <textarea id="description" name="description" rows={5} defaultValue={listing.description ?? ''} className={inputCls} />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- location ------------------------------- */

export function LocationSection({ listing, cities }) {
  const [state, action, pending] = useActionState(saveLocation, {});
  const [cityId, setCityId] = useState(listing.cityId);
  const e = state.errors ?? {};

  const areas = cities.find((c) => c.id === cityId)?.areas ?? [];
  const loc = listing.location;

  return (
    <Section id="location" title="Where it is" intro="Guests see an area circle. The exact address unlocks only when a booking is confirmed." state={state} pending={pending}>
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cityId" label="City" error={e.cityId}>
            <select
              id="cityId" name="cityId" value={cityId}
              onChange={(ev) => setCityId(ev.target.value)} className={inputCls}
            >
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="areaId" label="Area" error={e.areaId}>
            <select id="areaId" name="areaId" defaultValue={listing.areaId} className={inputCls}>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        {/* A real map picker comes with the Maps key. Until then, coordinates —
            which is what the map would produce anyway. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lat" label="Latitude" hint="From Google Maps: long-press the spot, copy the numbers." error={e.lat}>
            <Input id="lat" name="lat" inputMode="decimal" defaultValue={loc?.y ?? ''} placeholder="21.2688" className="font-mono" />
          </Field>
          <Field id="lng" label="Longitude" error={e.lng}>
            <Input id="lng" name="lng" inputMode="decimal" defaultValue={loc?.x ?? ''} placeholder="72.9701" className="font-mono" />
          </Field>
        </div>
        <Field
          id="exactAddress" label="Exact address"
          hint="Hidden from guests until they book. Include the landmark you would give on the phone."
          error={e.exactAddress}
        >
          <textarea id="exactAddress" name="exactAddress" rows={3} defaultValue={listing.exactAddress ?? ''} className={inputCls} />
        </Field>
        <Field id="approachNote" label="Approach road" hint="Anything a driver should know. Optional." error={e.approachNote}>
          <Input id="approachNote" name="approachNote" defaultValue="" placeholder="Last 500m is unpaved" />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- capacity ------------------------------- */

export function CapacitySection({ listing }) {
  const [state, action, pending] = useActionState(saveCapacity, {});
  const e = state.errors ?? {};

  return (
    <Section id="capacity" title="Size and capacity" intro="The numbers guests filter on." state={state} pending={pending}>
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="capacity" label="Maximum guests" error={e.capacity}>
            <Input id="capacity" name="capacity" inputMode="numeric" defaultValue={listing.capacity || ''} />
          </Field>
          <Field id="bedrooms" label="Bedrooms" error={e.bedrooms}>
            <Input id="bedrooms" name="bedrooms" inputMode="numeric" defaultValue={listing.bedrooms ?? 0} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="farmSize" label="Land size" hint="Whatever unit you normally quote." error={e.farmSize}>
            <Input id="farmSize" name="farmSize" inputMode="decimal" defaultValue={listing.farmSize ?? ''} placeholder="2.5" />
          </Field>
          <Field id="farmSizeUnit" label="Unit" error={e.farmSizeUnit}>
            <select id="farmSizeUnit" name="farmSizeUnit" defaultValue={listing.farmSizeUnit ?? 'vigha'} className={inputCls}>
              <option value="vigha">વીઘા / vigha</option>
              <option value="var">વાર / var</option>
              <option value="acre">acre</option>
              <option value="sqft">sq ft</option>
            </select>
          </Field>
        </div>
        <Field id="poolSize" label="Pool size" hint="As you would advertise it, e.g. 15x25. Leave blank if there is no pool." error={e.poolSize}>
          <Input id="poolSize" name="poolSize" defaultValue={listing.poolSize ?? ''} placeholder="15x25" className="w-32 font-mono" />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- amenities ------------------------------- */

const GROUP_LABELS = {
  water: 'Water and pool', comfort: 'Comfort', kitchen: 'Kitchen and food',
  power: 'Power', outdoor: 'Outdoor', entertainment: 'Entertainment',
  practical: 'Practical', event: 'Events',
};

export function AmenitiesSection({ listing, catalogue, selected }) {
  const [state, action, pending] = useActionState(saveAmenities, {});
  const [picked, setPicked] = useState(
    () => new Map(selected.map((s) => [s.amenityId, s.value ?? ''])),
  );

  const toggle = (id) => setPicked((prev) => {
    const next = new Map(prev);
    if (next.has(id)) next.delete(id); else next.set(id, '');
    return next;
  });

  return (
    <Section
      id="amenities" title="What it has"
      intro={`Picked from a fixed list so guests can filter on them. ${picked.size} selected.`}
      state={state} pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        {catalogue.map((group) => (
          <fieldset key={group.slug}>
            <legend className="mb-2 text-tiny font-bold tracking-wider text-brand-700 uppercase">
              {GROUP_LABELS[group.slug] ?? group.slug}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const on = picked.has(item.id);
                return (
                  <span key={item.id} className="inline-flex items-center">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-meta transition-colors ${
                        on ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                          : 'border-input hover:bg-ink-50'
                      }`}
                    >
                      <input
                        type="checkbox" name="amenity" value={item.id}
                        checked={on} onChange={() => toggle(item.id)}
                        className="size-3.5 accent-brand-600"
                      />
                      {item.labelEn}
                    </label>
                    {/* Tags that carry a number or dimension ask for it inline,
                        so "parking" becomes "parking for 8 cars". */}
                    {on && item.valueType !== 'none' ? (
                      <input
                        name={`value:${item.id}`}
                        defaultValue={picked.get(item.id) ?? ''}
                        placeholder={item.valueType === 'dimensions' ? '15x25' : item.valueType === 'count' ? '8' : ''}
                        aria-label={`${item.labelEn} detail`}
                        className="ml-1.5 w-20 rounded-sm border border-input px-2 py-1 text-tiny focus:border-brand-600 focus:outline-none"
                      />
                    ) : null}
                  </span>
                );
              })}
            </div>
          </fieldset>
        ))}
        <SaveButton pending={pending} label={`Save ${picked.size} amenities`} />
      </form>
    </Section>
  );
}

/* --------------------------------- rules --------------------------------- */

export function RulesSection({ listing }) {
  const [state, action, pending] = useActionState(saveRules, {});
  const e = state.errors ?? {};
  const r = listing.houseRules ?? {};

  return (
    <Section
      id="rules" title="House rules"
      intro="Structured, so guests can filter and we can translate them."
      state={state} pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="checkInFrom" label="Check-in window" hint="A window, not a fixed time." error={e.checkInFrom}>
            <Input id="checkInFrom" name="checkInFrom" defaultValue={listing.checkInFrom ?? ''} placeholder="9 AM to 7 PM" />
          </Field>
          <Field id="checkOutBy" label="Check-out window" error={e.checkOutBy}>
            <Input id="checkOutBy" name="checkOutBy" defaultValue={listing.checkOutBy ?? ''} placeholder="8 AM to 6 PM" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="petsAllowed" label="Pets">
            <select id="petsAllowed" name="petsAllowed" defaultValue={r.petsAllowed ? 'yes' : 'no'} className={inputCls}>
              <option value="no">Not allowed</option><option value="yes">Allowed</option>
            </select>
          </Field>
          <Field id="alcoholAllowed" label="Alcohol">
            <select id="alcoholAllowed" name="alcoholAllowed" defaultValue={r.alcoholAllowed ? 'yes' : 'no'} className={inputCls}>
              <option value="no">Not allowed</option><option value="yes">Allowed</option>
            </select>
          </Field>
          <Field id="stagAllowed" label="Stag groups">
            <select id="stagAllowed" name="stagAllowed" defaultValue={r.stagGroups ?? 'on_request'} className={inputCls}>
              <option value="on_request">On request</option>
              <option value="yes">Allowed</option>
              <option value="no">Not allowed</option>
            </select>
          </Field>
        </div>
        <Field id="musicCutoff" label="Music off by" hint="Local noise rules usually mean 11 PM." error={e.musicCutoff}>
          <Input id="musicCutoff" name="musicCutoff" defaultValue={r.musicCutoff ?? ''} placeholder="11 PM" className="w-32" />
        </Field>
        <Field
          id="extraRules" label="Anything else"
          hint="Moderated before publishing. Rules based on religion, caste or marital status are not permitted and will be rejected."
          error={e.extraRules}
        >
          <textarea id="extraRules" name="extraRules" rows={3} defaultValue={r.notes ?? ''} className={inputCls} />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* -------------------------------- pricing -------------------------------- */

const SLOTS = [
  ['day', 'Day picnic', '9 AM – 6 PM, the 12-hour slot'],
  ['night', 'Overnight', '6 PM – 10 AM'],
  ['full_day', 'Full day', '24 hours'],
];

export function PricingSection({ listing, prices }) {
  const [state, action, pending] = useActionState(savePricing, {});
  const e = state.errors ?? {};
  const bySlot = Object.fromEntries(prices.map((p) => [p.slot, p]));

  return (
    <Section
      id="pricing" title="Slots and pricing"
      intro="Leave a slot at zero if you do not offer it. Price is a free field — changing it never sends a live listing back for review."
      state={state} pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-md text-meta">
            <thead>
              <tr className="text-left text-tiny tracking-wide text-ink-600 uppercase">
                <th className="pb-2">Slot</th>
                <th className="pb-2">Mon&ndash;Fri</th>
                <th className="pb-2">Sat&ndash;Sun</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(([slot, label, window]) => (
                <tr key={slot} className="border-t border-border">
                  <td className="py-2.5 pr-3">
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-tiny text-ink-500">{window}</span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <Input
                      name={`${slot}_weekday`} inputMode="numeric"
                      defaultValue={bySlot[slot]?.weekday ?? 0}
                      className="w-24 tabular" aria-label={`${label} weekday price`}
                    />
                  </td>
                  <td className="py-2.5">
                    <Input
                      name={`${slot}_weekend`} inputMode="numeric"
                      defaultValue={bySlot[slot]?.weekend ?? 0}
                      className="w-24 tabular" aria-label={`${label} weekend price`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {e.day_weekday ? <p className="text-tiny font-medium text-danger">{e.day_weekday}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="extraGuestCharge" label="Extra guest, per head" error={e.extraGuestCharge}>
            <Input id="extraGuestCharge" name="extraGuestCharge" inputMode="numeric" defaultValue={0} className="w-28 tabular" />
          </Field>
          <Field id="extraHourCharge" label="Extra hour" error={e.extraHourCharge}>
            <Input id="extraHourCharge" name="extraHourCharge" inputMode="numeric" defaultValue={0} className="w-28 tabular" />
          </Field>
        </div>
        <SaveButton pending={pending} label="Save pricing" />
      </form>
    </Section>
  );
}

/* --------------------------------- terms --------------------------------- */

export function TermsSection({ listing }) {
  const [state, action, pending] = useActionState(saveTerms, {});
  const e = state.errors ?? {};

  return (
    <Section
      id="terms" title="Deposit and cancellation"
      intro="Guests see the refund in rupees, never as policy language."
      state={state} pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <Field
          id="depositAmount" label="Refundable deposit"
          hint="Locally this runs around 40–50% of your 24-hour weekend rate."
          error={e.depositAmount}
        >
          <Input id="depositAmount" name="depositAmount" inputMode="numeric" defaultValue={listing.depositAmount ?? 0} className="w-32 tabular" />
        </Field>
        <Field id="cancellationTier" label="Cancellation policy" error={e.cancellationTier}>
          <select id="cancellationTier" name="cancellationTier" defaultValue={listing.cancellationTier ?? 'moderate'} className={inputCls}>
            <option value="flexible">Flexible — full refund up to 3 days before</option>
            <option value="moderate">Moderate — full refund up to 7 days, half after</option>
            <option value="strict">Strict — half up to 7 days, none after</option>
          </select>
        </Field>
        <p className="rounded-md border-l-4 border-blue bg-info-bg p-3 text-tiny text-ink-700">
          The deposit is always returned in full on a cancellation, whichever tier you pick. It is
          not a penalty instrument.
        </p>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* -------------------------------- photos -------------------------------- */

/**
 * The photo step.
 *
 * This is the step that decides whether a listing gets booked, and until the
 * dropzone's id collision was fixed it was also the only step that could not
 * be completed at all — see sectionAnchorId() in chrome.jsx.
 *
 * Three things it now does that it did not:
 *   · a real dropzone — click, tap, or drag files onto it
 *   · local previews the instant files are chosen, from createObjectURL, so
 *     the grid fills immediately instead of after a round trip over a phone
 *     connection with nothing on screen
 *   · uploads on selection rather than waiting for a second deliberate press
 */
export function PhotosSection({ listing, photos }) {
  const [state, action, pending] = useActionState(uploadListingPhotos, {});
  const [removeState, removeAction, removing] = useActionState(removeListingPhoto, {});
  const [orderState, orderAction, ordering] = useActionState(reorderListingPhotos, {});
  const e = state.errors ?? {};
  const busy = removing || ordering;

  const inputRef = useRef(null);
  const formRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState([]);

  const room = MAX_PHOTOS - photos.length;
  const short = Math.max(0, MIN_PHOTOS - photos.length);

  // Object URLs are a leak if they are not handed back. The cleanup revokes
  // the previous batch whenever `staged` is replaced, and the last one on
  // unmount.
  useEffect(() => () => staged.forEach((f) => URL.revokeObjectURL(f.url)), [staged]);

  /**
   * Drop the previews the moment the upload settles — adjusting state during
   * render, which is React's documented way to react to a changed prop
   * without the cascading re-render an effect would cause here.
   *
   * Keyed on `pending` falling rather than on success, because a REJECTED
   * upload (over 2MB, wrong type) also has to clear them. Keyed on success
   * alone, a rejected batch would spin under its own thumbnails forever.
   */
  const [wasPending, setWasPending] = useState(false);
  if (pending !== wasPending) {
    setWasPending(pending);
    if (!pending && staged.length) setStaged([]);
  }

  function accept(fileList) {
    const files = Array.from(fileList ?? []).slice(0, room);
    if (!files.length) return;

    // Assigning to input.files needs a DataTransfer — it is the only way to
    // put dropped files into a form control the Server Action can read.
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;

    setStaged(files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));
    formRef.current?.requestSubmit();
  }

  const Move = ({ photoKey, move, label, disabled, children }) => (
    <form action={orderAction}>
      <input type="hidden" name="id" value={listing.id} />
      <input type="hidden" name="key" value={photoKey} />
      <input type="hidden" name="move" value={move} />
      <button
        type="submit" disabled={disabled || busy} aria-label={label} title={label}
        className="grid size-8 place-items-center rounded-full bg-white/95 text-ink-600 shadow-sm transition-transform hover:scale-110 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-0"
      >
        {children}
      </button>
    </form>
  );

  return (
    <Section
      id="photos" title="Photos"
      intro="Six or more, of this property as it actually is. We reverse-image check them."
      state={state} pending={pending}
    >
      {removeState.errors?._ || orderState.errors?._ ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {removeState.errors?._ ?? orderState.errors?._}
        </p>
      ) : null}

      {/* ------------------------- progress ------------------------- */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              photos.length >= MIN_PHOTOS ? 'bg-brand-600' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, (photos.length / MIN_PHOTOS) * 100)}%` }}
          />
        </div>
        <p className="shrink-0 text-tiny font-semibold tabular text-ink-600">
          {photos.length >= MIN_PHOTOS
            ? `${photos.length} photos`
            : `${photos.length} of ${MIN_PHOTOS}`}
        </p>
      </div>
      {short > 0 ? (
        <p className="text-tiny text-ink-500">
          {short} more and this step is done. {room} slots left in total.
        </p>
      ) : null}

      {/* ------------------------- the grid ------------------------- */}
      {photos.length > 0 || staged.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={photoId(p)}
              className={`group relative animate-in fade-in zoom-in-95 overflow-hidden rounded-lg border bg-ink-50 duration-300 ${
                i === 0 ? 'border-brand-600 ring-2 ring-brand-600/30' : 'border-border'
              }`}
            >
              {/* Listing photos live in the same private store as documents for
                  now, so they are described rather than rendered until a public
                  delivery bucket exists. */}
              <div className="grid aspect-4/3 place-items-center p-2 text-center text-tiny text-ink-500">
                Photo {i + 1}
              </div>

              {i === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-brand-600 px-2 py-0.5 text-tiny font-bold text-white">
                  Cover
                </span>
              ) : null}

              {/* Controls fade in on hover, and are always visible on touch,
                  where there is no hover to fade from. */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {i > 0 ? (
                  <Move photoKey={photoId(p)} move="cover" label={`Make photo ${i + 1} the cover`}>
                    <Star className="size-4" aria-hidden="true" />
                  </Move>
                ) : null}
                <form action={removeAction}>
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="key" value={photoId(p)} />
                  <button
                    type="submit" disabled={busy} aria-label={`Remove photo ${i + 1}`}
                    className="grid size-8 place-items-center rounded-full bg-white/95 text-ink-600 shadow-sm transition-transform hover:scale-110 hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </div>

              <div className="absolute bottom-2 left-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Move photoKey={photoId(p)} move="back" disabled={i === 0} label={`Move photo ${i + 1} earlier`}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Move>
                <Move photoKey={photoId(p)} move="forward" disabled={i === photos.length - 1} label={`Move photo ${i + 1} later`}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Move>
              </div>
            </li>
          ))}

          {/* Optimistic tiles: the real thumbnail, on screen before the upload
              finishes, so a slow connection shows progress instead of nothing. */}
          {staged.map((f) => (
            <li
              key={f.url}
              className="relative animate-in fade-in zoom-in-95 overflow-hidden rounded-lg border border-dashed border-brand-400 duration-300"
            >
              {/* Deliberately not next/image: this is a local blob: URL for a
                  file that has not been uploaded yet. There is nothing on a
                  CDN to optimise, and the optimiser cannot read a blob. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="aspect-4/3 w-full object-cover opacity-60" />
              <span className="absolute inset-0 grid place-items-center bg-white/60">
                <Loader2 className="size-5 animate-spin text-brand-700" aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {photos.length > 1 ? (
        <p className="text-tiny text-ink-500">
          The cover is what guests see in search and on WhatsApp. Reordering never sends a live
          listing back for review — adding or removing a photo does.
        </p>
      ) : null}

      {/* ------------------------- the dropzone ------------------------- */}
      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="id" value={listing.id} />

        {room > 0 ? (
          <label
            htmlFor="photo-files"
            onDragOver={(ev) => { ev.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(ev) => {
              ev.preventDefault();
              setDragging(false);
              accept(ev.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragging
                ? 'scale-[1.01] border-brand-600 bg-brand-50'
                : e.photos
                  ? 'border-danger/50 bg-danger-bg'
                  : 'border-input hover:border-brand-400 hover:bg-brand-50/40'
            }`}
          >
            <span
              className={`grid size-12 place-items-center rounded-full transition-transform duration-200 ${
                dragging ? 'scale-110 bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {pending
                ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                : <Upload className="size-5" aria-hidden="true" />}
            </span>
            <span className="text-body font-semibold text-ink-900">
              {pending ? 'Uploading…' : dragging ? 'Drop them here' : 'Add photos'}
            </span>
            <span className="text-tiny text-ink-500">
              Tap to choose, or drag them in · JPG, PNG or WEBP · up to 2MB each · {room} more allowed
            </span>
          </label>
        ) : (
          <p className="rounded-xl border border-border bg-ink-50 p-4 text-center text-meta text-ink-600">
            That is the maximum of {MAX_PHOTOS} photos. Remove one to add another.
          </p>
        )}

        <input
          ref={inputRef}
          id="photo-files" name="photos" type="file" multiple
          accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={(ev) => accept(ev.target.files)}
        />
        {e.photos ? <p className="text-tiny font-medium text-danger">{e.photos}</p> : null}

        {/* Fallback only: with JavaScript the selection uploads itself. */}
        <noscript>
          <SaveButton pending={pending} label="Upload" />
        </noscript>
      </form>
    </Section>
  );
}

/* ------------------------------- ownership ------------------------------- */

export function OwnershipSection({ listing, documents, clientType, kycName }) {
  const [state, action, pending] = useActionState(uploadOwnershipDocument, {});
  const [docType, setDocType] = useState(documents[0]?.docType ?? 'extract_7_12');
  const e = state.errors ?? {};

  const options = OWNERSHIP_DOC_TYPES.filter(
    (d) => !d.agentOnly || clientType === 'authorised_agent',
  );
  const spec = OWNERSHIP_DOC_TYPES.find((d) => d.id === docType);

  return (
    <Section
      id="ownership" title="Proof it is yours"
      intro="One document, with the name matched against your ID. This is the check that separates Rentra from a classified ad."
      state={state} pending={pending}
    >
      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-meta">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {OWNERSHIP_DOC_TYPES.find((t) => t.id === d.docType)?.label ?? d.docType}
                </span>
                <span className="block text-tiny text-ink-500">
                  In the name of {d.nameOnDocument ?? '—'}
                  {d.issuedAt ? ` · issued ${d.issuedAt}` : ''}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-tiny font-bold ${
                d.status === 'accepted' ? 'bg-brand-50 text-brand-700'
                  : d.status === 'rejected' ? 'bg-danger-bg text-danger'
                    : 'bg-amber-100 text-amber-700'
              }`}>{d.status}</span>
              {d.status === 'rejected' && d.reviewNote ? (
                <p className="w-full text-tiny text-danger">{d.reviewNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <fieldset>
          <legend className="mb-2 text-meta font-semibold text-ink-700">Which document?</legend>
          <div className="space-y-2">
            {options.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                  docType === d.id ? 'border-brand-600 bg-brand-50' : 'border-input hover:bg-ink-50'
                }`}
              >
                <input
                  type="radio" name="docType" value={d.id}
                  checked={docType === d.id} onChange={() => setDocType(d.id)}
                  className="mt-1 size-4 shrink-0 accent-brand-600"
                />
                <span>
                  <span className="block text-meta font-semibold text-ink-900">{d.label}</span>
                  {d.note ? <span className="block text-tiny text-ink-500">{d.note}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          id="nameOnDocument" label="Name printed on it"
          hint={kycName
            ? `Your ID says “${kycName}”. If this document is in a family member's name, upload it anyway and we will ask — that is common and fixable, not a rejection.`
            : 'If it differs from your own name we will ask about it at review.'}
          error={e.nameOnDocument}
        >
          <Input id="nameOnDocument" name="nameOnDocument" defaultValue={documents[0]?.nameOnDocument ?? kycName ?? ''} />
        </Field>

        {spec?.freshMonths ? (
          <Field id="issuedAt" label="Issue date" hint={`Must be within the last ${spec.freshMonths} months.`} error={e.issuedAt}>
            <Input id="issuedAt" name="issuedAt" type="date" className="w-44" />
          </Field>
        ) : null}

        <Field id="file" label="Upload it" hint="JPG, PNG, WEBP or PDF · up to 2MB" error={e.file}>
          <input
            id="file" name="file" type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className={inputCls}
          />
        </Field>

        <p className="rounded-md border-l-4 border-blue bg-info-bg p-3 text-tiny text-ink-700">
          Stored privately with no public web address. Only a Rentra reviewer can open it, and
          every time one is opened it is logged.
        </p>

        <SaveButton pending={pending} label="Upload document" />
      </form>
    </Section>
  );
}

/* ------------------------------ submit bar ------------------------------ */

/**
 * Pause and resume.
 *
 * The alternative an owner reaches for when this is missing is deleting the
 * listing — which throws away the ownership document, the review history and
 * the photos, and makes coming back in March a full rebuild. Pausing is the
 * cheap, reversible version of the thing he was going to do anyway.
 */
function PauseControl({ listing }) {
  const [state, action, pending] = useActionState(toggleListingPause, {});
  const paused = listing.status === 'paused';

  return (
    <form action={action} className="mt-3 border-t border-brand-200 pt-3">
      <input type="hidden" name="id" value={listing.id} />
      {state.errors?._ ? (
        <p className="mb-2 text-tiny font-medium text-danger">{state.errors._}</p>
      ) : null}
      <button
        type="submit" disabled={pending}
        className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          : paused ? <Play className="size-4" aria-hidden="true" />
            : <Pause className="size-4" aria-hidden="true" />}
        {paused ? 'Take bookings again' : 'Pause new bookings'}
      </button>
      <p className="mt-1.5 text-tiny text-ink-600">
        {paused
          ? 'Guests cannot find or book this property right now. Your calendar and confirmed bookings are untouched.'
          : 'Takes it out of search without deleting anything. Bookings already confirmed still stand.'}
      </p>
    </form>
  );
}

export function SubmitBar({ listing, completion, submitAction }) {
  const [state, action, pending] = useActionState(submitAction, {});

  if (completion.isLive) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <p className="text-h4 font-bold text-brand-900">This property is live</p>
        <p className="mt-1 text-meta text-brand-800">
          Price and calendar changes apply immediately. Changing photos, the address, capacity or
          amenities sends it back for a quick re-check.
        </p>
        <PauseControl listing={listing} />
      </div>
    );
  }

  /**
   * Paused is complete, not live, and not in review — which used to fall
   * through to the "sections left" branch below and render "0 sections left —
   * ." to an owner whose listing was perfectly finished.
   */
  if (listing.status === 'paused') {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-h4 font-bold text-ink-900">Paused by you</p>
        <p className="mt-1 text-meta text-ink-600">
          This property is not in search and cannot be booked. Everything about it is saved —
          resume whenever you are ready.
        </p>
        <PauseControl listing={listing} />
      </div>
    );
  }

  /** Hidden by Rentra is not the owner's to undo, so no control is offered. */
  if (listing.status === 'hidden') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-100 p-4">
        <p className="text-h4 font-bold text-amber-700">Hidden by Rentra</p>
        <p className="mt-1 text-meta text-ink-700">
          {listing.rejectionReason
            ?? 'Reply to the email we sent and we will look at it again.'}
        </p>
      </div>
    );
  }

  if (completion.inReview) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-100 p-4">
        <p className="text-h4 font-bold text-amber-700">
          {listing.status === 'pending_verification' ? 'Verification visit next' : 'With us for review'}
        </p>
        <p className="mt-1 text-meta text-ink-700">
          {listing.status === 'pending_verification'
            ? 'We will arrange a walkthrough — video call or a visit — then publish it.'
            : 'Nothing more to do. We reply within 2 working days either way.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {state.errors?._ ? (
        <p className="mb-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {state.errors._}
        </p>
      ) : null}

      {listing.status === 'rejected' && listing.rejectionReason ? (
        <p className="mb-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          <strong>Sent back:</strong> {listing.rejectionReason}
        </p>
      ) : null}

      {completion.canSubmit ? (
        <form action={action}>
          <input type="hidden" name="id" value={listing.id} />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit for review
          </Button>
          <p className="mt-2 text-center text-tiny text-ink-500">
            Every property is checked before it goes live. 2 working days.
          </p>
        </form>
      ) : (
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
          <p className="text-meta text-ink-600">
            <strong className="text-ink-900">
              {completion.remaining.length} section
              {completion.remaining.length === 1 ? '' : 's'} left
            </strong>
            {' — '}
            {completion.remaining.map((s) => s.label.toLowerCase()).join(', ')}.
            {completion.minutesLeft ? ` About ${completion.minutesLeft} minutes.` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
