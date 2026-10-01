'use client';
import { useActionState, useState } from 'react';
import { saveLocation } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function LocationSection({ listing, cities }) {
  const [state, action, pending] = useActionState(saveLocation, {});
  const [cityId, setCityId] = useState(listing.cityId);
  const e = state.errors ?? {};

  const areas = cities.find((c) => c.id === cityId)?.areas ?? [];
  const loc = listing.location;

  return (
    <Section
      id="location"
      title="Where it is"
      intro="Guests see an area circle. The exact address unlocks only when a booking is confirmed."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cityId" label="City" error={e.cityId}>
            <select
              id="cityId"
              name="cityId"
              value={cityId}
              onChange={(ev) => setCityId(ev.target.value)}
              className={inputCls}
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="areaId" label="Area" error={e.areaId}>
            <select id="areaId" name="areaId" defaultValue={listing.areaId} className={inputCls}>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {/* A real map picker comes with the Maps key. Until then, coordinates —
            which is what the map would produce anyway. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="lat"
            label="Latitude"
            hint="From Google Maps: long-press the spot, copy the numbers."
            error={e.lat}
          >
            <Input
              id="lat"
              name="lat"
              inputMode="decimal"
              defaultValue={loc?.y ?? ''}
              placeholder="21.2688"
              className="font-mono"
            />
          </Field>
          <Field id="lng" label="Longitude" error={e.lng}>
            <Input
              id="lng"
              name="lng"
              inputMode="decimal"
              defaultValue={loc?.x ?? ''}
              placeholder="72.9701"
              className="font-mono"
            />
          </Field>
        </div>
        <Field
          id="exactAddress"
          label="Exact address"
          hint="Hidden from guests until they book. Include the landmark you would give on the phone."
          error={e.exactAddress}
        >
          <textarea
            id="exactAddress"
            name="exactAddress"
            rows={3}
            defaultValue={listing.exactAddress ?? ''}
            className={inputCls}
          />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- capacity ------------------------------- */
