'use client';
import { usePolicyAction, PolicyPreview, PolicyHistory } from './PolicyPreview';
import { savePricing } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton } from './SectionPrimitives';
const SLOTS = [
  ['day', 'Day picnic', 'Daytime, 9 AM – 6 PM by default'],
  ['night', 'Overnight', '6 PM – 10 AM'],
  ['full_day', 'Full day', '24 hours'],
];

export function PricingSection({ listing, prices }) {
  const { state, pending, preview, form } = usePolicyAction(savePricing);
  const e = state.errors ?? {};
  const bySlot = Object.fromEntries(prices.map((p) => [p.slot, p]));

  return (
    <Section
      id="pricing"
      title="Slots and pricing"
      intro="Enter both prices for every slot you offer. Leave both at 0 for a slot you don't offer. Changing a price on a live property never sends it back for review."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} {...form} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-md text-meta">
            <thead>
              <tr className="text-left text-tiny tracking-wide text-ink-600 uppercase">
                <th className="pb-2">Slot</th>
                <th className="pb-2">Mon&ndash;Fri</th>
                <th className="pb-2">Sat&ndash;Sun</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(([slot, label, window]) => (
                <tr key={slot} className="border-t border-border">
                  <td className="py-2.5 pr-3">
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-tiny text-ink-500">{window}</span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <Input
                      name={`${slot}_weekday`}
                      inputMode="numeric"
                      defaultValue={bySlot[slot]?.weekday ?? 0}
                      className="w-24 tabular"
                      aria-label={`${label} weekday price`}
                    />
                  </td>
                  <td className="py-2.5">
                    <Input
                      name={`${slot}_weekend`}
                      inputMode="numeric"
                      defaultValue={bySlot[slot]?.weekend ?? 0}
                      className="w-24 tabular"
                      aria-label={`${label} weekend price`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {SLOTS.flatMap(([slot, label]) =>
          ['weekday', 'weekend']
            .filter((day) => e[`${slot}_${day}`])
            .map((day) => (
              <p key={`${slot}_${day}`} className="text-tiny font-medium text-danger">
                {label}: {e[`${slot}_${day}`]}
              </p>
            )),
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="extraGuestCharge" label="Extra guest, per head" error={e.extraGuestCharge}>
            <Input
              id="extraGuestCharge"
              name="extraGuestCharge"
              inputMode="numeric"
              defaultValue={listing.extraGuestCharge ?? 0}
              className="w-28 tabular"
            />
          </Field>
        </div>
        <PolicyPreview preview={preview} state={state} />
        <SaveButton pending={pending} label={preview ? 'Confirm pricing' : 'Preview pricing'} />
        <PolicyHistory listing={listing} />
      </form>
    </Section>
  );
}

/* --------------------------------- terms --------------------------------- */
