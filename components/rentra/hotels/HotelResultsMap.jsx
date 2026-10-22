'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import styles from './HotelResultsMap.module.css';

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Results map (hotel plan §4.4): one price pin per hotel on this page, the
 * searched landmark as a dot. Beside the list from `lg`; on phones a floating
 * "Map" button opens it full screen. Pins are links, so keyboard users reach them.
 */
export default function HotelResultsMap({ places, landmark }) {
  const [open, setOpen] = useState(false);
  const pinned = places.filter((place) => place.location);
  if (!pinned.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-1/2 z-40 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-5 text-meta font-semibold text-white shadow-lg lg:hidden"
      >
        <MapIcon className="size-4" aria-hidden="true" />
        Map
      </button>
      <div className={`${styles.shell} ${open ? styles.open : ''}`}>
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close map"
            className="absolute top-3 right-3 z-[500] grid size-11 place-items-center rounded-full bg-card shadow-md lg:hidden"
          >
            <X className="size-5" />
          </button>
        ) : null}
        <Canvas places={pinned} landmark={landmark} visible={open} />
      </div>
    </>
  );
}

function Canvas({ places, landmark, visible }) {
  const element = useRef(null);
  const map = useRef(null);
  const [failed, setFailed] = useState(false);
  const key = places.map((place) => `${place.id}:${place.priceLabel}`).join('|');

  useEffect(() => {
    let disposed = false;
    let resize;
    import('leaflet')
      .then((L) => {
        if (disposed) return;
        const instance = L.map(element.current, { scrollWheelZoom: false, zoomControl: false });
        map.current = instance;
        L.control.zoom({ position: 'bottomright' }).addTo(instance);
        L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 })
          .on('tileerror', () => !disposed && setFailed(true))
          .addTo(instance);
        const points = places.map((place) => [place.location.latitude, place.location.longitude]);
        for (const place of places) {
          // Not a Leaflet button: the pin's own link is the one control (no nested interactives).
          L.marker([place.location.latitude, place.location.longitude], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className: styles.pin,
              html: `<a href="${escape(place.href)}" aria-label="${escape(`${place.title}, ${place.priceLabel}`)}">${escape(place.priceLabel)}</a>`,
              iconSize: null,
            }),
          }).addTo(instance);
        }
        if (landmark) {
          L.circleMarker([landmark.latitude, landmark.longitude], {
            radius: 7,
            color: '#fff',
            weight: 2,
            fillColor: '#d98a1f',
            fillOpacity: 1,
          })
            .bindTooltip(escape(landmark.name), { direction: 'top' })
            .addTo(instance);
          points.push([landmark.latitude, landmark.longitude]);
        }
        instance.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(element.current);
      })
      .catch(() => !disposed && setFailed(true));
    return () => {
      disposed = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers places.
  }, [key, landmark?.latitude, landmark?.longitude]);

  useEffect(() => {
    if (visible) map.current?.invalidateSize();
  }, [visible]);

  return (
    <div className="relative h-full">
      <div
        ref={element}
        className="h-full w-full"
        role="region"
        aria-label="Map of hotels on this page"
      />
      {failed ? (
        <p
          role="status"
          className="absolute inset-x-3 top-3 rounded-lg bg-card p-3 text-meta shadow"
        >
          Some map tiles could not load. Prices on the list are current.
        </p>
      ) : null}
    </div>
  );
}
