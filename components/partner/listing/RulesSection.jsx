'use client';
import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { saveRules } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function RulesSection({ listing }) {
  const [state, action, pending] = useActionState(saveRules, {});
  const e = state.errors ?? {};
  const r = listing.houseRules ?? {};

  return (
    <Section
      id="rules"
      title="House rules"
      intro="Structured, so guests can filter and we can translate them."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="checkInFrom"
            label="Check-in window"
            hint="A window, not a fixed time."
            error={e.checkInFrom}
          >
            <Input
              id="checkInFrom"
              name="checkInFrom"
              defaultValue={listing.checkInFrom ?? ''}
              placeholder="9 AM to 7 PM"
            />
          </Field>
          <Field id="checkOutBy" label="Check-out window" error={e.checkOutBy}>
            <Input
              id="checkOutBy"
              name="checkOutBy"
              defaultValue={listing.checkOutBy ?? ''}
              placeholder="8 AM to 6 PM"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="petsAllowed" label="Pets">
            <select
              id="petsAllowed"
              name="petsAllowed"
              defaultValue={r.petsAllowed ? 'yes' : 'no'}
              className={inputCls}
            >
              <option value="no">Not allowed</option>
              <option value="yes">Allowed</option>
            </select>
          </Field>
          <Field id="alcoholAllowed" label="Alcohol">
            <select
              id="alcoholAllowed"
              name="alcoholAllowed"
              defaultValue={r.alcoholAllowed ? 'yes' : 'no'}
              className={inputCls}
            >
              <option value="no">Not allowed</option>
              <option value="yes">Allowed</option>
            </select>
          </Field>
          <Field id="stagAllowed" label="Stag groups">
            <select
              id="stagAllowed"
              name="stagAllowed"
              defaultValue={r.stagGroups ?? 'on_request'}
              className={inputCls}
            >
              <option value="on_request">On request</option>
              <option value="yes">Allowed</option>
              <option value="no">Not allowed</option>
            </select>
          </Field>
        </div>
        <Field
          id="musicCutoff"
          label="Music off by"
          hint="Local noise rules usually mean 11 PM."
          error={e.musicCutoff}
        >
          <Input
            id="musicCutoff"
            name="musicCutoff"
            defaultValue={r.musicCutoff ?? ''}
            placeholder="11 PM"
            className="w-32"
          />
        </Field>
        <Field
          id="extraRules"
          label="Anything else"
          hint="Moderated before publishing. Rules based on religion, caste or marital status are not permitted and will be rejected."
          error={e.extraRules}
        >
          <textarea
            id="extraRules"
            name="extraRules"
            rows={3}
            defaultValue={r.notes ?? ''}
            className={inputCls}
          />
        </Field>
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/* -------------------------------- pricing -------------------------------- */
