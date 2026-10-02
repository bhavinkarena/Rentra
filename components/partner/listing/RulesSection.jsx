'use client';
import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { saveRules } from '@/lib/actions/partner';
import { TermsFields } from './TermsSection';
import { useStepFormId, useIsWizard } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
const clock = (time) => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
/** The guest-facing window, from the slot times already set in Availability. */
function slotWindow(listing, key) {
  const times = Object.values(listing.bookingConfig?.slots ?? {})
    .filter((slot) => slot.enabled && slot[key])
    .map((slot) => slot[key])
    .sort();
  if (!times.length) return '';
  const [first, last] = [times[0], times.at(-1)];
  return first === last ? clock(first) : `${clock(first)} to ${clock(last)}`;
}
export function RulesSection({ listing }) {
  const [state, action, pending] = useActionState(saveRules, {});
  const e = state.errors ?? {};
  const r = listing.houseRules ?? {};
  const formId = useStepFormId();
  const wizard = useIsWizard();
  if (listing.rentalUnit === 'hour')
    return (
      <VenueRules
        listing={listing}
        state={state}
        action={action}
        pending={pending}
        formId={formId}
        wizard={wizard}
      />
    );

  return (
    <Section
      id="rules"
      title={wizard ? 'Rules and cancellation' : 'House rules'}
      intro="Structured, so guests can filter and we can translate them."
      state={state}
      pending={pending}
    >
      <form id={formId} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="checkInFrom"
            label="Check-in window"
            hint="Filled from your Availability times. Widen it if guests can arrive earlier or later."
            error={e.checkInFrom}
          >
            <Input
              id="checkInFrom"
              name="checkInFrom"
              defaultValue={listing.checkInFrom || slotWindow(listing, 'startTime')}
              placeholder="9 AM to 7 PM"
            />
          </Field>
          <Field id="checkOutBy" label="Check-out window" error={e.checkOutBy}>
            <Input
              id="checkOutBy"
              name="checkOutBy"
              defaultValue={listing.checkOutBy || slotWindow(listing, 'endTime')}
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
        {wizard && <TermsFields listing={listing} e={e} />}
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}

/** Venue rules for time-booked listings: what players wear, age, food, smoking, alcohol. */
function VenueRules({ listing, state, action, pending, formId, wizard }) {
  const e = state.errors ?? {};
  const r = listing.houseRules && !Array.isArray(listing.houseRules) ? listing.houseRules : {};
  const yesNo = (value) => (value ? 'yes' : 'no');
  return (
    <Section
      id="rules"
      title={wizard ? 'Rules and cancellation' : 'Venue rules'}
      intro="Short, structured rules players see before they book."
      state={state}
      pending={pending}
    >
      <form id={formId} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="footwear" label="Footwear" error={e.footwear}>
            <select
              id="footwear"
              name="footwear"
              defaultValue={r.footwear ?? ''}
              className={inputCls}
            >
              <option value="">Not stated</option>
              <option value="non_marking">Non-marking shoes only</option>
              <option value="no_studs">Sports shoes, no studs</option>
              <option value="studs_ok">Studs allowed</option>
              <option value="any">Any footwear</option>
            </select>
          </Field>
          <Field
            id="minAge"
            label="Minimum age"
            hint="Leave empty if there is none."
            error={e.minAge}
          >
            <Input
              id="minAge"
              name="minAge"
              inputMode="numeric"
              defaultValue={r.minAge ?? ''}
              className="w-24 tabular"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="foodAllowed" label="Outside food">
            <select
              id="foodAllowed"
              name="foodAllowed"
              defaultValue={r.foodAllowed ?? 'yes'}
              className={inputCls}
            >
              <option value="yes">Allowed</option>
              <option value="seating_only">In the seating area only</option>
              <option value="no">Not allowed</option>
            </select>
          </Field>
          <Field id="smokingAllowed" label="Smoking">
            <select
              id="smokingAllowed"
              name="smokingAllowed"
              defaultValue={yesNo(r.smokingAllowed)}
              className={inputCls}
            >
              <option value="no">Not allowed</option>
              <option value="yes">Allowed in a marked area</option>
            </select>
          </Field>
          <Field id="alcoholAllowed" label="Alcohol">
            <select
              id="alcoholAllowed"
              name="alcoholAllowed"
              defaultValue={yesNo(r.alcoholAllowed)}
              className={inputCls}
            >
              <option value="no">Not allowed</option>
              <option value="yes">Allowed</option>
            </select>
          </Field>
        </div>
        <Field
          id="extraRules"
          label="Anything else"
          hint="Moderated before publishing. Rules based on religion, caste or marital status are not permitted."
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
        {wizard && <TermsFields listing={listing} e={e} />}
        <SaveButton pending={pending} />
      </form>
    </Section>
  );
}
