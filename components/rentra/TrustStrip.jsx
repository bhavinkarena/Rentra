import { ScanSearch, ReceiptIndianRupee, CalendarCheck, Clock, ShieldCheck } from 'lucide-react';

/**
 * Exactly three. A row of six trust badges reads as protesting too much.
 */
const ITEMS = [
  {
    Icon: ScanSearch,
    title: 'Compare facilities',
    body: 'Read the listing photos, amenities and house rules before choosing a place.',
  },
  {
    Icon: ReceiptIndianRupee,
    title: 'Review date-based totals',
    body: 'Select your dates and guests to see rent, platform fees and separate deposit terms.',
  },
  {
    Icon: CalendarCheck,
    title: 'Check current availability',
    body: 'Search checks every selected visit. Availability is checked again when you continue.',
  },
];

/** Venues: true statements only (live times, price before paying, refund window). */
export const PLAY_TRUST = [
  {
    Icon: Clock,
    title: 'Live court availability',
    body: 'Pick a date and time to see which courts are free. Times are checked again when you book.',
  },
  {
    Icon: ReceiptIndianRupee,
    title: 'Price shown before you pay',
    body: 'Hourly rates and platform fees are shown before checkout.',
  },
  {
    Icon: ShieldCheck,
    title: 'Cancellation window shown',
    body: 'Each venue shows how many hours before your start time you can cancel for a refund.',
  },
];

export default function TrustStrip({ items = ITEMS }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-3">
      {items.map(({ Icon, title, body }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50">
            <Icon className="size-5 text-brand-600" aria-hidden="true" />
          </span>
          <div>
            <p className="text-meta font-bold">{title}</p>
            <p className="mt-0.5 text-tiny leading-relaxed text-ink-600">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
