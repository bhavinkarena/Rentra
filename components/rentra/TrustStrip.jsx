import { ShieldCheck, Landmark, CircleSlash } from 'lucide-react';

/**
 * Exactly three. A row of six trust badges reads as protesting too much.
 */
const ITEMS = [
  {
    Icon: ShieldCheck,
    title: 'Compare facilities',
    body: 'Read the listing photos, amenities and house rules before choosing a place.',
  },
  {
    Icon: Landmark,
    title: 'Review date-based totals',
    body: 'Select your dates and guests to see rent, platform fees and separate deposit terms.',
  },
  {
    Icon: CircleSlash,
    title: 'Check current availability',
    body: 'Search checks every selected visit. Availability is checked again when you continue.',
  },
];

export default function TrustStrip() {
  return (
    <ul className="grid gap-5 sm:grid-cols-3">
      {ITEMS.map(({ Icon, title, body }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50">
            <Icon className="size-5 text-brand-600" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-meta font-bold">{title}</h3>
            <p className="mt-0.5 text-tiny leading-relaxed text-ink-600">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
