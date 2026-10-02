'use client';
import { useEffect, useState } from 'react';
import { usePolicyAction, PolicyPreview } from './PolicyPreview';
import { savePricing, previewListingPrice } from '@/lib/actions/partner';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton } from './SectionPrimitives';
const amount = (value) => Number(String(value).replace(/[₹,\s]/g, ''));
const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100);
export function PriceLine({ listingId, value }) {
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    let stopped = false;
    const rent = amount(value);
    if (!Number.isInteger(rent) || rent < 500) {
      return;
    }
    const timer = setTimeout(
      () =>
        previewListingPrice(listingId, rent * 100).then((result) => {
          if (!stopped) setQuote(result.error ? null : { ...result, input: value });
        }),
      500,
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [listingId, value]);
  return quote?.input === value && amount(value) >= 500 && quote?.totalMinor != null ? (
    <p className="text-tiny text-ink-600">
      Guest pays {money(quote.totalMinor)} (includes Rentra’s guest fee {money(quote.feeMinor)}) ·
      You earn {money(quote.rentMinor)} rent. Owner commission is not charged yet.
    </p>
  ) : (
    <p className="text-tiny text-ink-600">Enter a price to see the guest total.</p>
  );
}
function SlotCard({ slot, label, price, listing, e }) {
  const [offered, setOffered] = useState(Boolean(price?.weekday || price?.weekend)),
    [weekday, setWeekday] = useState(String(price?.weekday || '')),
    [weekend, setWeekend] = useState(String(price?.weekend || '')),
    [same, setSame] = useState(price?.weekday === price?.weekend);
  const schedule = listing.bookingConfig?.slots?.[slot];
  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={offered}
          onChange={(event) => setOffered(event.target.checked)}
        />
        Offer {label}
      </label>
      {schedule?.enabled && (
        <p className="text-meta">
          {schedule.startTime} – {schedule.endTime}
          {schedule.endDayOffset ? ' next day' : ''}
        </p>
      )}
      {offered ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${slot}_weekday`} label="Weekday price" error={e[`${slot}_weekday`]}>
              <Input
                id={`${slot}_weekday`}
                name={`${slot}_weekday`}
                required
                inputMode="numeric"
                value={weekday}
                onChange={(event) => {
                  setWeekday(event.target.value);
                  if (same) setWeekend(event.target.value);
                }}
                onBlur={() => {
                  if (Number.isFinite(amount(weekday)))
                    setWeekday(amount(weekday).toLocaleString('en-IN'));
                }}
              />
              <PriceLine listingId={listing.id} value={weekday} />
            </Field>
            <Field id={`${slot}_weekend`} label="Weekend price" error={e[`${slot}_weekend`]}>
              <Input
                id={`${slot}_weekend`}
                name={`${slot}_weekend`}
                required
                inputMode="numeric"
                value={weekend}
                onChange={(event) => {
                  setWeekend(event.target.value);
                  setSame(false);
                }}
              />
              <PriceLine listingId={listing.id} value={weekend} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={same}
              onChange={(event) => {
                setSame(event.target.checked);
                if (event.target.checked) setWeekend(weekday);
              }}
            />
            Same on weekends
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name={`${slot}_weekday`} value="0" />
          <input type="hidden" name={`${slot}_weekend`} value="0" />
        </>
      )}
    </fieldset>
  );
}
export function PricingSection({ listing, prices }) {
  const { state, pending, preview, form } = usePolicyAction(savePricing, listing),
    e = state.errors || {};
  return (
    <Section
      id="pricing"
      title="Set your prices"
      intro="Offer the slots you want to host. Both weekday and weekend prices are required for each offered slot."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} {...form} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        {[
          ['day', 'Day picnic'],
          ['night', 'Night stay'],
          ['full_day', 'Full day'],
        ].map(([slot, label]) => (
          <SlotCard
            key={slot}
            slot={slot}
            label={label}
            listing={listing}
            price={prices.find((p) => p.slot === slot)}
            e={e}
          />
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="includedGuests" label="Guests included" error={e.includedGuests}>
            <Input
              id="includedGuests"
              name="includedGuests"
              type="number"
              min="1"
              max={listing.capacity || 500}
              defaultValue={listing.bookingConfig?.pricingIncludedGuests || listing.capacity || 1}
            />
          </Field>
          <Field
            id="extraGuestCharge"
            label="Extra-guest charge per person"
            error={e.extraGuestCharge}
          >
            <Input
              id="extraGuestCharge"
              name="extraGuestCharge"
              inputMode="numeric"
              defaultValue={listing.extraGuestCharge || 0}
            />
          </Field>
        </div>
        <PolicyPreview preview={preview} state={state} />
        <SaveButton
          pending={pending}
          label={
            preview
              ? 'Confirm changes'
              : ['draft', 'rejected'].includes(listing.status)
                ? 'Save pricing'
                : 'Preview pricing'
          }
        />
      </form>
    </Section>
  );
}
