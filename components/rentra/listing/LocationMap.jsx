'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Expand, MapPin, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function MapCanvas({ center, label, expanded = false }) {
  const container = useRef(null);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const latitude = center?.latitude;
  const longitude = center?.longitude;

  useEffect(() => {
    let disposed = false;
    let map;
    let resize;
    const element = container.current;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setState('loading');
        try {
          const L = await import('leaflet');
          if (disposed) return;
          map = L.map(element, {
            center: [latitude, longitude],
            zoom: 12,
            minZoom: 5,
            maxZoom: 16,
            scrollWheelZoom: false,
            zoomControl: false,
          });
          L.control.zoom({ position: 'topright' }).addTo(map);
          let loadedTiles = 0;
          L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 })
            .on('tileload', () => {
              loadedTiles += 1;
              if (!disposed) setState('ready');
            })
            .on('load', () => {
              if (!disposed && !loadedTiles) setState('error');
            })
            .addTo(map);
          L.marker([latitude, longitude], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className: styles.marker,
              html: '<img src="/brand/rentra-mark.svg" alt="" width="40" height="40" />',
              iconSize: [64, 64],
              iconAnchor: [32, 32],
            }),
          })
            .addTo(map)
            .bindTooltip('Exact location provided after booking', {
              permanent: true,
              direction: 'top',
              offset: [0, -46],
              className: styles.callout,
            });
          resize = new ResizeObserver(() => map.invalidateSize());
          resize.observe(element);
        } catch {
          if (!disposed) setState('error');
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      resize?.disconnect();
      map?.remove();
    };
  }, [latitude, longitude, attempt]);

  return (
    <div className={`${styles.frame} ${expanded ? styles.expanded : ''}`}>
      <div
        ref={container}
        className={styles.canvas}
        role="region"
        aria-label={`Approximate location: ${label}. Use the plus and minus buttons to zoom.`}
      />
      {state !== 'ready' ? (
        <div className={styles.status} role="status">
          <MapPin className="mx-auto mb-3 size-7 text-brand-600" aria-hidden="true" />
          <p className="font-semibold">
            {state === 'error' ? 'The map could not load' : 'Loading area map…'}
          </p>
          <p className="mt-1 text-sm text-ink-600">{label}</p>
          {state === 'error' ? (
            <button
              type="button"
              className="mt-3 font-semibold text-brand-700 underline underline-offset-4"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LocationMap({ areaName, cityName, center }) {
  const label = [areaName, cityName].filter(Boolean).join(', ');
  const hasCenter =
    Number.isFinite(center?.latitude) &&
    Number.isFinite(center?.longitude) &&
    Math.abs(center.latitude) <= 90 &&
    Math.abs(center.longitude) <= 180;
  if (!hasCenter) {
    return (
      <div className="rounded-xl border border-border bg-brand-50 px-6 py-12 text-center">
        <MapPin className="mx-auto mb-3 size-8 text-brand-600" aria-hidden="true" />
        <p className="font-semibold">{label}</p>
        <p className="mt-2 text-sm text-ink-600">Exact location provided after booking.</p>
      </div>
    );
  }
  return (
    <Dialog.Root>
      <div className="relative isolate">
        <MapCanvas center={center} label={label} />
        <Dialog.Trigger className={styles.expandButton} aria-label="Expand location map">
          <Expand className="size-5" aria-hidden="true" />
        </Dialog.Trigger>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-ink-600">
        <MapPin className="size-4 shrink-0" aria-hidden="true" />
        {label} · Approximate location
      </p>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-3 z-[100] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-8">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-bold">{label}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-600">
                Approximate location. Exact location provided after booking.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border hover:bg-brand-50"
              aria-label="Close location map"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <MapCanvas center={center} label={label} expanded />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
