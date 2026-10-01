'use client';
import { usePolicyAction, PolicyPreview } from './PolicyPreview';
import { saveTerms } from '@/lib/actions/partner';
import { sectionAnchorId } from '@/lib/domain/listing-steps';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function TermsSection({ listing }) {
  const { state, pending, preview, form } = usePolicyAction(saveTerms);
  const e = state.errors ?? {};

  return (
    <Section
      id="terms"
      title="Deposit and cancellation"
      intro="Guests see the refund in rupees, never as policy language."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} {...form} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <Field
          id="depositAmount"
          label="Separate deposit estimate"
          hint="Displayed separately. This value does not authorize online collection or promise a refund."
          error={e.depositAmount}
        >
          <Input
            id="depositAmount"
            name="depositAmount"
            inputMode="numeric"
            defaultValue={listing.depositAmount ?? 0}
            className="w-32 tabular"
          />
        </Field>
        <Field id="cancellationTier" label="Cancellation policy" error={e.cancellationTier}>
          <select
            id="cancellationTier"
            name="cancellationTier"
            defaultValue={listing.cancellationTier ?? 'moderate'}
            className={inputCls}
          >
            {listing.rentalUnit === 'hour' ? (
              <>
                <option value="flexible">Flexible — full refund up to 4 hours before</option>
                <option value="moderate">
                  Moderate — full refund up to 24 hours, half up to 6 hours
                </option>
                <option value="strict">Strict — half up to 48 hours, none after</option>
              </>
            ) : (
              <>
                <option value="flexible">Flexible — full refund up to 3 days before</option>
                <option value="moderate">Moderate — full refund up to 7 days, half after</option>
                <option value="strict">Strict — half up to 7 days, none after</option>
              </>
            )}
          </select>
        </Field>
        <p className="rounded-md border-l-4 border-info bg-info-bg p-3 text-tiny text-ink-700">
          Accepted bookings keep their original cancellation policy. Deposit collection and
          settlement policy remain separately governed; this estimate is not a collected balance.
        </p>
        <PolicyPreview preview={preview} state={state} />
        <SaveButton pending={pending} label={preview ? 'Confirm terms' : 'Preview terms'} />
      </form>
    </Section>
  );
}

/* -------------------------------- photos -------------------------------- */

/**
 * The photo step.
 *
 * This is the step that decides whether a listing gets booked, and until the
 * dropzone's id collision was fixed it was also the only step that could not
 * be completed at all — see sectionAnchorId() in chrome.jsx.
 *
 * Three things it now does that it did not:
 *   · a real dropzone — click, tap, or drag files onto it
 *   · local previews the instant files are chosen, from createObjectURL, so
 *     the grid fills immediately instead of after a round trip over a phone
 *     connection with nothing on screen
 *   · uploads on selection rather than waiting for a second deliberate press
 */
