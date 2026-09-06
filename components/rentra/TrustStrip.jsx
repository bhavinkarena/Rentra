import { ShieldCheck, Landmark, CircleSlash } from 'lucide-react';

/**
 * Exactly three. A row of six trust badges reads as protesting too much.
 */
const ITEMS = [
  {
    Icon: ShieldCheck,
    title: 'Every farm visited',
    body: 'Someone from Rentra has physically stood on this property and photographed it.',
  },
  {
    Icon: Landmark,
    title: 'Money held until check-in',
    body: 'Your payment stays with Rentra. The owner is paid after you have arrived.',
  },
  {
    Icon: CircleSlash,
    title: '₹0 brokerage',
    body: 'You book the owner directly. There is no dalal and no hidden commission.',
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
