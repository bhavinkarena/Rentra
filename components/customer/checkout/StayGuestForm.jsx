'use client';

import { useState } from 'react';
import { BedDouble, Clock, MessageSquareText, ReceiptText } from 'lucide-react';

const input =
  'mt-1.5 block min-h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none focus:border-brand-600 md:text-sm';
const ARRIVALS = ['', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const arrivalLabel = (value) =>
  value
    ? `Around ${Number(value.slice(0, 2)) % 12 || 12}:00 ${Number(value.slice(0, 2)) < 12 ? 'AM' : 'PM'}`
    : 'Not sure yet';

/**
 * Hotel checkout details (hotel plan §4.7): the lead guest for each room,
 * expected arrival, requests and, optionally, GST invoice details. Values are
 * checked again by the API; this form only keeps the shape right.
 */
export default function StayGuestForm({ quote, value, onChange }) {
  const [gst, setGst] = useState(Boolean(value.gstin));
  const rooms = quote.visits[0]?.rooms ?? [];
  const set = (field, next) => onChange({ ...value, [field]: next });
  return (
    <div className="mt-5 space-y-5">
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold">
          <BedDouble className="size-4 text-brand-700" aria-hidden="true" />
          Guest name for each room
        </legend>
        <p className="mt-1 text-xs text-ink-600">As on the photo ID shown at check-in.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {rooms.map((room, index) => (
            <label key={index} className="text-xs font-semibold text-ink-700">
              Room {index + 1} · {room.name}
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete={index === 0 ? 'name' : 'off'}
                value={value.guestNames[index] ?? ''}
                onChange={(event) =>
                  set(
                    'guestNames',
                    value.guestNames.map((name, i) => (i === index ? event.target.value : name)),
                  )
                }
                className={input}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink-700">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-brand-700" aria-hidden="true" />
            Expected arrival
          </span>
          <select
            value={value.arrivalTime}
            onChange={(event) => set('arrivalTime', event.target.value)}
            className={input}
          >
            {ARRIVALS.map((time) => (
              <option key={time || 'unknown'} value={time}>
                {arrivalLabel(time)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-700">
          <span className="flex items-center gap-1.5">
            <MessageSquareText className="size-3.5 text-brand-700" aria-hidden="true" />
            Requests for the hotel (optional)
          </span>
          <input
            maxLength={300}
            value={value.requests}
            placeholder="For example, a high floor"
            onChange={(event) => set('requests', event.target.value)}
            className={input}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border p-3.5">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={gst}
            onChange={(event) => {
              setGst(event.target.checked);
              if (!event.target.checked) onChange({ ...value, gstin: '', businessName: '' });
            }}
            className="size-5"
          />
          <ReceiptText className="size-4 text-brand-700" aria-hidden="true" />I need a GST invoice
          for my business
        </label>
        {gst ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink-700">
              GSTIN
              <input
                required
                value={value.gstin}
                maxLength={15}
                pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]"
                title="15-character GSTIN, for example 24ABCDE1234F1Z5"
                onChange={(event) => set('gstin', event.target.value.toUpperCase())}
                className={`${input} uppercase`}
              />
            </label>
            <label className="text-xs font-semibold text-ink-700">
              Business name
              <input
                required
                maxLength={120}
                value={value.businessName}
                autoComplete="organization"
                onChange={(event) => set('businessName', event.target.value)}
                className={input}
              />
            </label>
            <p className="text-xs text-ink-600 sm:col-span-2">
              The hotel issues the GST invoice to these details.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
