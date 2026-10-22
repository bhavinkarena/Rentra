import {
  Baby,
  BedDouble,
  Building2,
  Cigarette,
  Clock,
  DoorOpen,
  HeartHandshake,
  IdCard,
  MapPin,
  PartyPopper,
  PawPrint,
  Star,
} from 'lucide-react';
import { ID_LABELS } from '@/lib/domain/hotel-ui';
import { clock12 } from '@/lib/domain/vertical-ui';

/** Facts row (hotel plan §4.5): only declared fields. */
export function HotelFactsRow({ listing }) {
  const hotel = listing.hotel ?? {};
  const rooms = (listing.roomTypes ?? []).reduce((sum, room) => sum + room.roomCount, 0);
  const facts = [
    { Icon: Building2, label: 'Type', value: listing.categoryName },
    hotel.starRating ? { Icon: Star, label: 'Category', value: `${hotel.starRating}-star` } : null,
    hotel.checkIn
      ? { Icon: Clock, label: 'Check-in', value: `From ${clock12(hotel.checkIn)}` }
      : null,
    hotel.checkOut
      ? { Icon: DoorOpen, label: 'Check-out', value: `By ${clock12(hotel.checkOut)}` }
      : null,
    rooms ? { Icon: BedDouble, label: 'Rooms', value: String(rooms) } : null,
  ].filter(Boolean);
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {facts.map(({ Icon, label, value }) => (
        <li key={label}>
          <Icon className="size-5 text-brand-600" aria-hidden="true" />
          <p className="mt-2 text-meta text-ink-600">{label}</p>
          <p className="mt-0.5 text-h4 font-bold">{value}</p>
        </li>
      ))}
    </ul>
  );
}

/** Policies in plain sentences, generated from the owner's structured answers. */
export function HotelPolicies({ hotel }) {
  if (!hotel) return null;
  const p = hotel.policies ?? {};
  const ids = (p.idTypes ?? []).map((id) => ID_LABELS[id] ?? id);
  const rows = [
    [
      Clock,
      'Check-in and check-out',
      `Check-in from ${clock12(hotel.checkIn)}. Check-out by ${clock12(hotel.checkOut)}.`,
    ],
    [
      Baby,
      'Children',
      `Children under ${hotel.childFreeAge} stay free using existing beds. Older children may be charged as extra guests.`,
    ],
    [
      IdCard,
      'ID at check-in',
      ids.length
        ? `Every adult shows a valid ${ids.join(', ')}.${p.localId === false ? ' IDs from this city are not accepted.' : p.localId ? ' Local IDs are accepted.' : ''}`
        : 'Every adult shows a valid government photo ID.',
    ],
    p.couples != null
      ? [
          HeartHandshake,
          'Couples',
          p.couples
            ? 'Unmarried couples are welcome with valid ID for both guests.'
            : 'The hotel does not accept unmarried couples.',
        ]
      : null,
    p.pets != null
      ? [PawPrint, 'Pets', p.pets ? 'Pets are allowed.' : 'Pets are not allowed.']
      : null,
    p.smoking != null
      ? [
          Cigarette,
          'Smoking',
          p.smoking ? 'Smoking is allowed in designated areas.' : 'No smoking.',
        ]
      : null,
    p.parties != null
      ? [
          PartyPopper,
          'Parties',
          p.parties
            ? 'Small gatherings are allowed with the hotel’s permission.'
            : 'No parties or events.',
        ]
      : null,
  ].filter(Boolean);
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map(([Icon, title, body]) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 text-meta text-ink-700">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      {p.notes ? (
        <p className="mt-4 max-w-prose text-meta whitespace-pre-line text-ink-700">{p.notes}</p>
      ) : null}
      <p className="mt-4 text-meta text-ink-600">
        Cancellation depends on the rate you choose. Each rate in Rooms says whether, and until
        when, you can cancel free of charge.
      </p>
    </>
  );
}

/** Nearby landmarks with straight-line distance from the hotel's pin. */
export function NearbyLandmarks({ landmarks = [] }) {
  if (!landmarks.length) return null;
  return (
    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
      {landmarks.map((item) => (
        <li
          key={item.slug}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-meta"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <a
              href={`/hotels/near/${item.slug}`}
              className="truncate hover:text-brand-700 hover:underline"
            >
              {item.name}
            </a>
          </span>
          <span className="shrink-0 tabular text-ink-600">{item.km} km</span>
        </li>
      ))}
    </ul>
  );
}
