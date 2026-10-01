'use client';
import { useActionState } from 'react';
import { saveBasics } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function BasicsSection({ listing, categories }) {
  const [state, action, pending] = useActionState(saveBasics, {});
  const e = state.errors ?? {};
  const venue = listing.rentalUnit === 'hour';

  return (
    <Section
      id="basics"
      title="What it is"
      intro="How guests find and recognise it."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <Field id="categoryId" label={venue ? 'Main activity' : 'Category'} error={e.categoryId}>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={listing.categoryId}
            required
            aria-invalid={Boolean(e.categoryId)}
            className={inputCls}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="title"
          label="Title"
          hint={
            venue
              ? 'Say what makes it different. “Floodlit box cricket in Vesu” beats “Sports venue”.'
              : 'Say what makes it different. “Riverside Farm with private pool” beats “Farmhouse in Kamrej”.'
          }
          error={e.title}
        >
          <Input
            id="title"
            name="title"
            maxLength={90}
            required
            minLength={8}
            defaultValue={listing.title === 'Untitled property' ? '' : listing.title}
            placeholder={
              venue ? 'Smash Arena — floodlit box cricket' : 'Riverside Farm with private pool'
            }
            aria-invalid={Boolean(e.title)}
          />
        </Field>
        <Field
          id="highlight"
          label="One-line highlight"
          hint="Shown on the card. Optional."
          error={e.highlight}
        >
          <Input
            id="highlight"
            name="highlight"
            maxLength={60}
            defaultValue={listing.highlight ?? ''}
            placeholder={venue ? 'Floodlit until 1 AM' : 'Private pool'}
          />
        </Field>
        <Field
          id="description"
          label="Description"
          hint={
            venue
              ? 'What players get: courts, surface, lighting, parking, what to bring.'
              : 'Write for someone deciding whether to drive 40km. What is it like, what is nearby, what should they know?'
          }
          error={e.description}
        >
          <textarea
            id="description"
            name="description"
            rows={5}
            required
            minLength={40}
            maxLength={4000}
            defaultValue={listing.description ?? ''}
            aria-invalid={Boolean(e.description)}
            className={inputCls}
          />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* ------------------------------- location ------------------------------- */
