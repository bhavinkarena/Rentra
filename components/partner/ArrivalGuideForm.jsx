'use client';
import { useActionState } from 'react';
import { saveArrivalGuide } from '@/lib/actions/partner';

const field =
  'mt-1 block min-h-11 w-full rounded-md border border-input bg-card p-2 text-base md:text-sm';

/** BOOK-08: landmark, parking, gate photo and caretaker contact for confirmed guests. */
export default function ArrivalGuideForm({ data }) {
  const [state, action, pending] = useActionState(saveArrivalGuide, {});
  const guide = data.guide;
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 className="text-h2">Arrival guide</h1>
      <p className="text-meta text-ink-600">
        Guests with a confirmed visit get this by SMS 24 hours before and on the morning of arrival,
        with the map pin and your house rules. Cancelled visits get nothing.
      </p>
      <input type="hidden" name="rentableId" value={data.id} />
      <label className="block">
        Landmark
        <input
          name="landmark"
          maxLength={300}
          defaultValue={guide.landmark}
          className={field}
          placeholder="Blue gate after the Shiv temple"
        />
      </label>
      <label className="block">
        Parking
        <input
          name="parking"
          maxLength={300}
          defaultValue={guide.parking}
          className={field}
          placeholder="Inside the gate, 4 cars"
        />
      </label>
      <fieldset>
        <legend className="font-medium">Gate photo</legend>
        {data.photos.length ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-border p-2 text-meta">
              <input
                type="radio"
                name="gatePhotoKey"
                value=""
                defaultChecked={!guide.gatePhotoKey}
              />
              None
            </label>
            {data.photos.map((p) => (
              <label
                key={p.url}
                className="relative block cursor-pointer rounded-md border border-border p-1 has-checked:border-brand-600 has-checked:ring-2 has-checked:ring-brand-600"
              >
                <input
                  type="radio"
                  name="gatePhotoKey"
                  value={p.url}
                  defaultChecked={guide.gatePhotoKey === p.url}
                  className="sr-only"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt}
                  className="aspect-square w-full rounded object-cover"
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-meta text-ink-600">Add property photos to choose a gate photo.</p>
        )}
      </fieldset>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          name="caretakerVisible"
          defaultChecked={guide.caretakerVisible}
          className="size-5"
        />
        Include my caretaker’s name and phone
      </label>
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white"
      >
        {pending ? 'Saving…' : 'Save arrival guide'}
      </button>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p role="status">Arrival guide saved.</p>}
    </form>
  );
}
