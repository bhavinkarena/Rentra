'use client';
import { useActionState, useState } from 'react';
import { saveAmenities } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Section, SaveButton } from './SectionPrimitives';
const GROUP_LABELS = {
  water: 'Water and pool',
  comfort: 'Comfort',
  kitchen: 'Kitchen and food',
  power: 'Power',
  outdoor: 'Outdoor',
  // Slug kept; labelled so it never reads like the Entertainment vertical.
  entertainment: 'Music & games',
  practical: 'Practical',
  event: 'Events',
  play: 'Play',
  facilities: 'Facilities',
};

export function AmenitiesSection({ listing, catalogue, selected }) {
  const [state, action, pending] = useActionState(saveAmenities, {});
  const [picked, setPicked] = useState(
    () => new Map(selected.map((s) => [s.amenityId, s.value ?? ''])),
  );

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, '');
      return next;
    });

  return (
    <Section
      id="amenities"
      title="What it has"
      intro={`Picked from a fixed list so guests can filter on them. ${picked.size} selected.`}
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
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
                        on
                          ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                          : 'border-input hover:bg-ink-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="amenity"
                        value={item.id}
                        checked={on}
                        onChange={() => toggle(item.id)}
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
                        placeholder={
                          item.valueType === 'dimensions'
                            ? '15x25'
                            : item.valueType === 'count'
                              ? '8'
                              : ''
                        }
                        aria-label={`${item.labelEn} detail`}
                        className="ml-1.5 w-20 rounded-md border border-input px-2 py-1 text-base md:text-sm focus:border-brand-600 bg-card text-foreground"
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
