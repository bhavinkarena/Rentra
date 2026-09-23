'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState } from 'react';
import {
  saveSchedule,
  saveOverride,
  addOpenDates,
  blockDates,
  unblockDates,
} from '@/lib/actions/partner';

const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 py-2';
const labels = { day: 'Day picnic', night: 'Overnight', full_day: 'Full day' };
function Field({ label, ...props }) {
  return (
    <label className="block text-meta">
      {label}
      <input className={inputClass} {...props} />
    </label>
  );
}
function ActionForm({ action, rentableId, title, children, button = 'Save' }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <input type="hidden" name="rentableId" value={rentableId} />
      <h2 className="text-h3">{title}</h2>
      {children}
      {state.error ? (
        <p role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-meta text-brand-700">
          Saved.
        </p>
      ) : null}
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? <RentraLoader label="Saving…" /> : button}
      </button>
    </form>
  );
}

export default function BookingCalendarSettings({ listing, blocks }) {
  const config = listing.booking_config;
  return (
    <div className="space-y-6">
      <ActionForm
        action={saveSchedule}
        rentableId={listing.id}
        title="Booking hours and guest limits"
      >
        <input type="hidden" name="expectedVersion" value={listing.booking_config_version} />
        <p className="text-meta text-ink-600">
          All hours are in India time. Choose exact hours for each offered slot. Existing bookings
          retain their original hours.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Minimum notice (minutes)"
            name="leadTimeMinutes"
            type="number"
            min="0"
            max="525600"
            defaultValue={config?.leadTimeMinutes ?? 60}
            required
          />
          <Field
            label="How many days ahead can guests book?"
            name="bookingHorizonDays"
            type="number"
            min="1"
            max="365"
            defaultValue={config?.bookingHorizonDays ?? 90}
            required
          />
        </div>
        {Object.entries(labels).map(([slot, label]) => {
          const value = config?.slots?.[slot];
          return (
            <fieldset key={slot} className="rounded-md border border-border p-4">
              <legend className="px-2 font-semibold">{label}</legend>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  name={`${slot}_enabled`}
                  defaultChecked={value?.enabled ?? false}
                />
                Offer this slot
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Arrival"
                  name={`${slot}_startTime`}
                  type="time"
                  defaultValue={value?.startTime ?? ''}
                />
                <Field
                  label="Departure"
                  name={`${slot}_endTime`}
                  type="time"
                  defaultValue={value?.endTime ?? ''}
                />
                <label className="block text-meta">
                  Departure day
                  <select
                    name={`${slot}_endDayOffset`}
                    className={inputClass}
                    defaultValue={value?.endDayOffset ?? (slot === 'night' ? 1 : 0)}
                  >
                    <option value="0">Same day</option>
                    <option value="1">Next day</option>
                  </select>
                </label>
                <Field
                  label="Buffer before (minutes)"
                  name={`${slot}_bufferBeforeMinutes`}
                  type="number"
                  min="0"
                  max="1440"
                  defaultValue={value?.bufferBeforeMinutes ?? 0}
                />
                <Field
                  label="Buffer after (minutes)"
                  name={`${slot}_bufferAfterMinutes`}
                  type="number"
                  min="0"
                  max="1440"
                  defaultValue={value?.bufferAfterMinutes ?? 0}
                />
                <Field
                  label="Maximum guests"
                  name={`${slot}_capacity`}
                  type="number"
                  min="1"
                  max={listing.capacity}
                  defaultValue={value?.capacity ?? listing.capacity}
                />
                <Field
                  label="Included guests"
                  name={`${slot}_includedGuests`}
                  type="number"
                  min="1"
                  max={listing.capacity}
                  defaultValue={value?.includedGuests ?? listing.capacity}
                />
                <Field
                  label="Extra guest charge (₹ per visit)"
                  name={`${slot}_extraGuestCharge`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    value ? value.extraGuestChargeMinor / 100 || 0 : listing.extra_guest_charge
                  }
                />
              </div>
            </fieldset>
          );
        })}
      </ActionForm>
      <div className="grid gap-6 md:grid-cols-2">
        <ActionForm
          action={addOpenDates}
          rentableId={listing.id}
          title="Add dates to your calendar"
          button="Add dates"
        >
          <p className="text-meta text-ink-600">
            Add missing dates as open inventory. Existing closed dates and reservations are
            preserved.
          </p>
          <Field label="First date" name="from" type="date" required />
          <Field label="Last date" name="to" type="date" required />
        </ActionForm>
        <ActionForm action={saveOverride} rentableId={listing.id} title="Set a date-specific price">
          <Field label="Visit start date" name="day" type="date" required />
          <label className="block text-meta">
            Slot
            <select className={inputClass} name="slot">
              {Object.entries(labels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Rent (₹, before fees and extra guests)"
            name="rent"
            type="number"
            step="0.01"
            min="0"
          />
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="reset" />
            Reset this date to its base price
          </label>
        </ActionForm>
      </div>
      <ActionForm
        action={blockDates}
        rentableId={listing.id}
        title="Block an exact period"
        button="Block period"
      >
        <p className="text-meta text-ink-600">
          No overlapping guest visit can be sold during this period. Include any cleaning time you
          need.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From date" name="from" type="date" required />
          <Field label="From time (India)" name="startTime" type="time" required />
          <Field label="To date" name="to" type="date" required />
          <Field label="To time (India)" name="endTime" type="time" required />
        </div>
        <Field
          label="Reason (visible to your team)"
          name="reason"
          minLength="3"
          maxLength="500"
          required
        />
      </ActionForm>
      {blocks.length ? (
        <section className="space-y-3">
          <h2 className="text-h3">Active owner blocks</h2>
          {blocks.map((block) => (
            <ActionForm
              key={block.id}
              action={unblockDates}
              rentableId={listing.id}
              title={block.label}
              button="Release block"
            >
              <input type="hidden" name="blockId" value={block.id} />
              <p className="text-meta">{block.reason}</p>
            </ActionForm>
          ))}
        </section>
      ) : null}
    </div>
  );
}
