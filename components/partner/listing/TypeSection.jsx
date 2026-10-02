'use client';
import { useActionState } from 'react';
import { saveType } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { Section, VersionField, SaveButton, inputCls } from './SectionPrimitives';
export function TypeSection({ listing, categories }) {
  const [state, action, pending] = useActionState(saveType, {});
  return (
    <Section id="type" title="Property type" state={state} pending={pending}>
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <p>{listing.rentalUnit === 'hour' ? 'Sports or play venue' : 'Farmhouse or villa'}</p>
        <label className="block">
          Category
          <select name="categoryId" defaultValue={listing.categoryId} className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}
