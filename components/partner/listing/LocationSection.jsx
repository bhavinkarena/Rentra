'use client';
import { useActionState, useState } from 'react';
import { saveLocation } from '@/lib/actions/partner';
import { tilePoint, tileLocation } from '@/lib/domain/map-pin';
import { useStepFormId } from './chrome';
import { VersionField, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function LocationSection({ listing, cities }) {
  const [state, action, pending] = useActionState(saveLocation, {}),
    [cityId, setCity] = useState(listing.cityId || ''),
    [areaId, setArea] = useState(listing.areaId || ''),
    [pin, setPin] = useState(
      listing.location ? { lat: listing.location.y, lng: listing.location.x } : null,
    ),
    [center, setCenter] = useState(pin || { lat: 21.17, lng: 72.83 }),
    [zoom, setZoom] = useState(13),
    [geoError, setGeoError] = useState('');
  const areas = cities.find((c) => c.id === cityId)?.areas || [],
    point = tilePoint(center.lat, center.lng, zoom),
    x = Math.floor(point.x),
    y = Math.floor(point.y);
  const drop = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const location = tileLocation(
      x + (e.clientX - rect.left) / rect.width,
      y + (e.clientY - rect.top) / rect.height,
      zoom,
    );
    setPin(location);
  };
  const useLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location unavailable. Drop the pin or enter coordinates.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPin(v);
        setCenter(v);
        setGeoError('');
      },
      () =>
        setGeoError(
          'Location access was denied or unavailable. Drop the pin or enter coordinates.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const move = (dx, dy) => setCenter(tileLocation(point.x + dx, point.y + dy, zoom));
  return (
    <Section
      id="location"
      title="Where is your property?"
      intro="Guests see only the area until they book."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="cityId" label="City" error={state.errors?.cityId}>
            <select
              id="cityId"
              name="cityId"
              required
              value={cityId}
              onChange={(e) => {
                setCity(e.target.value);
                setArea('');
                setPin(null);
              }}
              className={inputCls}
            >
              <option value="">Choose city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="areaId" label="Area" error={state.errors?.areaId}>
            <select
              id="areaId"
              name="areaId"
              required
              value={areaId}
              onChange={(e) => {
                setArea(e.target.value);
                const area = areas.find((a) => a.id === e.target.value);
                if (area?.centre) setCenter({ lat: area.centre.y, lng: area.centre.x });
                setPin(null);
              }}
              className={inputCls}
            >
              <option value="">Choose area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Drop a pin on your property</p>
          <button type="button" onClick={useLocation} className="min-h-11 rounded-md border px-4">
            Use my current location
          </button>
          {geoError && <p role="status">{geoError}</p>}
          <div className="mx-auto max-w-sm">
            <button
              type="button"
              aria-label="Property map: tap to drop a pin; Enter selects the centre"
              onClick={drop}
              onPointerMove={(e) => {
                if (e.buttons === 1) drop(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPin(center);
                }
              }}
              className="relative block aspect-square w-full touch-none overflow-hidden rounded-md border bg-ink-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`}
                alt="Area map"
                draggable="false"
                className="absolute inset-0 size-full"
              />
              {pin &&
                (() => {
                  const p = tilePoint(pin.lat, pin.lng, zoom);
                  return (
                    <span
                      className="absolute -translate-x-1/2 -translate-y-full text-3xl text-danger"
                      style={{ left: `${(p.x - x) * 100}%`, top: `${(p.y - y) * 100}%` }}
                      aria-hidden="true"
                    >
                      ●
                    </span>
                  );
                })()}
            </button>
            <a href="https://www.openstreetmap.org/copyright" className="text-tiny underline">
              © OpenStreetMap contributors
            </a>
            <div className="flex flex-wrap gap-2">
              {[
                ['West', -0.5, 0],
                ['East', 0.5, 0],
                ['North', 0, -0.5],
                ['South', 0, 0.5],
              ].map(([l, dx, dy]) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => move(dx, dy)}
                  className="min-h-11 rounded border px-3"
                >
                  {l}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(18, z + 1))}
                className="min-h-11 rounded border px-3"
              >
                Zoom in
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(5, z - 1))}
                className="min-h-11 rounded border px-3"
              >
                Zoom out
              </button>
            </div>
          </div>
          {(state.errors?.lat || state.errors?.lng) && (
            <p className="text-danger">Drop the pin on your property in India.</p>
          )}
        </div>
        <details>
          <summary className="min-h-11 cursor-pointer">Enter coordinates</summary>
          <div className="grid gap-3 sm:grid-cols-2">
            {['lat', 'lng'].map((key) => (
              <Field
                key={key}
                id={key}
                label={key === 'lat' ? 'Latitude' : 'Longitude'}
                error={state.errors?.[key]}
              >
                <input
                  id={key}
                  name={key}
                  inputMode="decimal"
                  value={pin?.[key] ?? ''}
                  onChange={(e) => setPin((p) => ({ ...p, [key]: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
        </details>
        <Field id="exactAddress" label="Full address" error={state.errors?.exactAddress}>
          <textarea
            id="exactAddress"
            name="exactAddress"
            required
            minLength={10}
            maxLength={500}
            defaultValue={listing.exactAddress || ''}
            placeholder="Survey 24, Canal Road, near the water tank, Kamrej"
            className={inputCls}
          />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}
