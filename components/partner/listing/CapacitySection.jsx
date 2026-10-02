'use client';
import { useActionState } from 'react';
import { saveCapacity } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function CapacitySection({ listing }) {
  const [state, action, pending] = useActionState(saveCapacity, {});
  const e = state.errors ?? {};

  return (
    <Section
      id="capacity"
      title="Size and capacity"
      intro="The numbers guests filter on."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="capacity" label="Maximum guests" error={e.capacity}>
            <Input
              id="capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={listing.capacity || ''}
            />
          </Field>
          <Field id="bedrooms" label="Bedrooms" error={e.bedrooms}>
            <Input
              id="bedrooms"
              name="bedrooms"
              inputMode="numeric"
              defaultValue={listing.bedrooms ?? 0}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="farmSize"
            label="Land size (optional)"
            hint="Whatever unit you normally quote."
            error={e.farmSize}
          >
            <Input
              id="farmSize"
              name="farmSize"
              inputMode="decimal"
              defaultValue={listing.farmSize ?? ''}
              placeholder="2.5"
            />
          </Field>
          <Field id="farmSizeUnit" label="Unit" error={e.farmSizeUnit}>
            <select
              id="farmSizeUnit"
              name="farmSizeUnit"
              defaultValue={listing.farmSizeUnit ?? 'vigha'}
              className={inputCls}
            >
              <option value="vigha">વીઘા / vigha</option>
              <option value="var">વાર / var</option>
              <option value="acre">acre</option>
              <option value="sqft">sq ft</option>
            </select>
          </Field>
        </div>
        <Field
          id="poolSize"
          label="Pool size (optional)"
          hint="As you would advertise it, e.g. 15x25. Leave blank if there is no pool."
          error={e.poolSize}
        >
          <Input
            id="poolSize"
            name="poolSize"
            defaultValue={listing.poolSize ?? ''}
            placeholder="15x25"
            className="w-32 font-mono"
          />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- amenities ------------------------------- */
