'use client';
import { useActionState, useEffect } from 'react';
import { saveOwnerGuide, recordOwnerGuide } from '@/lib/actions/partner';
import FormError from '@/components/portal/FormError';
import { ShieldCheck, Building2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OwnerWelcome({ name }) {
  const [state, action, pending] = useActionState(saveOwnerGuide, {});
  useEffect(() => {
    recordOwnerGuide({ welcomeSeenAt: true });
  }, []);
  const first = name?.trim().split(/\s+/)[0];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-h1">Welcome to Rentra{first ? `, ${first}` : ''}</h1>
      <p className="mt-3 text-body text-ink-600">Earn from your farmhouse or venue in 3 steps.</p>
      <ol className="my-8 grid gap-5 border-y border-border py-6 sm:grid-cols-3">
        {[
          [ShieldCheck, 'Get verified', 'About 8 minutes'],
          [Building2, 'Add your property', 'About 15 minutes'],
          [CalendarDays, 'Start getting bookings', 'After Rentra’s review'],
        ].map(([Icon, title, body]) => (
          <li key={title}>
            <Icon className="mb-3 size-6 text-brand-700" aria-hidden="true" />
            <h2 className="text-h4">{title}</h2>
            <p className="mt-1 text-meta text-ink-600">{body}</p>
          </li>
        ))}
      </ol>
      <h2 className="text-h3">What you’ll need</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-meta text-ink-600">
        <li>A PAN, driving licence, or masked Aadhaar photo or PDF</li>
        <li>A UPI ID or bank details</li>
        <li>An ownership document or electricity bill</li>
        <li>6 or more photos of your property</li>
      </ul>
      <form action={action} className="mt-7 space-y-5">
        <input type="hidden" name="welcomeSeenAt" value="true" />
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-3 font-semibold">What would you like to list?</legend>
          {[
            ['farmhouse', 'Farmhouse / villa'],
            ['entertainment', 'Venue (turf, court, alley…)'],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-14 items-center gap-3 rounded-md border border-border p-4"
            >
              <input
                type="radio"
                name="intendedVertical"
                value={value}
                defaultChecked={value === 'farmhouse'}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <FormError state={state} />
        <Button
          type="submit"
          name="next"
          value="/partner/onboarding/details"
          className="min-h-12 w-full"
          disabled={pending}
        >
          Get started
        </Button>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <button
            name="next"
            value="/partner?tour=1"
            disabled={pending}
            className="min-h-11 font-semibold text-brand-700"
          >
            Take a 1-minute tour
          </button>
          <button name="next" value="/partner" disabled={pending} className="min-h-11 text-ink-600">
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
