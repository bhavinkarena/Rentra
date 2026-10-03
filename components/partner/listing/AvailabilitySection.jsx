'use client';
import { useActionState, useState, useEffect } from 'react';
import { saveAvailability } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { Section, SaveButton, inputCls } from './SectionPrimitives';
import { HoursSection } from './HoursSection';
const defaults = {
  day: ['09:00', '18:00', 0],
  night: ['19:00', '10:00', 1],
  full_day: ['09:00', '09:00', 1],
};
export function AvailabilitySection({ listing, calendar, prices = [] }) {
  if (listing.rentalUnit === 'hour') return <HoursSection listing={listing} calendar={calendar} />;
  return <SlotAvailability listing={listing} prices={prices} />;
}
function SlotAvailability({ listing, prices }) {
  const [state, action, pending] = useActionState(saveAvailability, {});
  const [config, setConfig] = useState(() => ({
    timeZone: 'Asia/Kolkata',
    leadTimeMinutes: 0,
    bookingHorizonDays: 90,
    autoOpen: true,
    ...listing.bookingConfig,
    slots: Object.fromEntries(
      Object.entries(defaults).map(([slot, [startTime, endTime, endDayOffset]]) => [
        slot,
        {
          enabled: prices.some((p) => p.slot === slot),
          startTime,
          endTime,
          endDayOffset,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          capacity: listing.capacity || 1,
          includedGuests: listing.capacity || 1,
          extraGuestChargeMinor: (listing.extraGuestCharge || 0) * 100,
          ...listing.bookingConfig?.slots?.[slot],
        },
      ]),
    ),
  }));
  useEffect(() => {
    const restore = (e) => {
      try {
        if (e.detail?.configuration) setConfig(JSON.parse(e.detail.configuration));
      } catch {}
    };
    document.addEventListener('rentra:restore', restore);
    return () => document.removeEventListener('rentra:restore', restore);
  }, []);
  const { inventoryReady, ...configuration } = config;
  const slots = Object.fromEntries(
    Object.entries(config.slots).map(([name, v]) => [name, v.enabled ? v : { enabled: false }]),
  );
  const change = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const setSlot = (slot, key, value) =>
    change({ slots: { ...config.slots, [slot]: { ...config.slots[slot], [key]: value } } });
  return (
    <Section
      id="availability"
      title="When guests can visit"
      intro="Confirm arrival and departure times. Dates open automatically; close any date from Calendar."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <input
          type="hidden"
          name="configuration"
          value={JSON.stringify({ ...configuration, slots })}
        />
        <input
          type="hidden"
          name="expectedVersion"
          value={state.version ?? listing.bookingConfigVersion ?? 0}
        />
        {Object.entries(config.slots).map(([slot, v]) => (
          <fieldset key={slot} className="space-y-3 rounded-lg border p-4">
            <legend className="px-2 font-semibold">{slot.replaceAll('_', ' ')}</legend>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={v.enabled}
                onChange={(e) => setSlot(slot, 'enabled', e.target.checked)}
              />
              Offer this slot
            </label>
            {v.enabled && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['startTime', 'endTime'].map((key) => (
                    <label key={key}>
                      {key === 'startTime' ? 'Arrival' : 'Departure'}
                      <input
                        type="time"
                        value={v[key]}
                        onChange={(e) => setSlot(slot, key, e.target.value)}
                        className={inputCls}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Departure day
                  <select
                    value={v.endDayOffset}
                    onChange={(e) => setSlot(slot, 'endDayOffset', Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value={0}>Same day</option>
                    <option value={1}>Next day</option>
                  </select>
                </label>
                <p className="text-meta text-ink-600">
                  {v.startTime} → {v.endTime}
                  {v.endDayOffset ? ' next day' : ''}
                </p>
                <details>
                  <summary className="min-h-11 cursor-pointer">Advanced buffers</summary>
                  {['bufferBeforeMinutes', 'bufferAfterMinutes'].map((key) => (
                    <label key={key} className="block">
                      {key === 'bufferBeforeMinutes' ? 'Before arrival' : 'After departure'}{' '}
                      (minutes)
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        value={v[key]}
                        onChange={(e) => setSlot(slot, key, Number(e.target.value))}
                        className={inputCls}
                      />
                    </label>
                  ))}
                </details>
              </>
            )}
          </fieldset>
        ))}
        <label className="block">
          Minimum notice
          <select
            value={config.leadTimeMinutes}
            onChange={(e) => change({ leadTimeMinutes: Number(e.target.value) })}
            className={inputCls}
          >
            {[
              [0, 'Same day'],
              [1440, '1 day'],
              [2880, '2 days'],
              [10080, '1 week'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Booking window
          <select
            value={config.bookingHorizonDays}
            onChange={(e) => change({ bookingHorizonDays: Number(e.target.value) })}
            className={inputCls}
          >
            {[30, 60, 90, 180, 365].map((v) => (
              <option key={v} value={v}>
                {v} days
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={config.autoOpen ?? true}
            onChange={(e) => change({ autoOpen: e.target.checked })}
          />
          Keep my calendar open automatically
        </label>
        <p className="text-meta">
          Dates open up to {config.bookingHorizonDays} days ahead. Dates you close stay closed.
        </p>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}
