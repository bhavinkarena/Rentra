'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'radix-ui';
import { CalendarMonth, shiftMonth } from '@/components/rentra/SearchFields';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestStayQuote } from '@/lib/actions/customer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Baby,
  BedDouble,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Coffee,
  Eye,
  ImageOff,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  Ruler,
  Users,
} from 'lucide-react';
import { discoveryApi } from '@/lib/api/endpoints';
import { formatINR } from '@/lib/domain/pricing';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { parseDiscoveryQuery } from '@/lib/domain/discovery';
import PetsStepper from '@/components/rentra/PetsStepper';
import {
  bedsLine,
  extraPlacesLine,
  cotsLine,
  policyLine,
  facilitySummary,
  formatInstant,
  humanize,
  beddingLine,
  mealsLine,
  photoLabel,
  resolveInclusions,
  splitParty,
} from '@/lib/domain/hotel-ui';

const MAX_ROOMS = 8;
const MAX_NIGHTS = 30;
const step =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border text-ink-700 hover:border-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Room selection (hotel plan §4.6): one card per room type, one row per rate.
 * Prices come from the API for the guest's dates and party (the search card's
 * numbers); the total comes from a server quote. The page never prices anything.
 */
const noSubscription = () => () => {};

/**
 * `railId` names the page's sticky booking column (farmhouse layout): the stay
 * form and the total render there from lg up, inline above the rooms below lg.
 */
export default function HotelRooms({ code, rentableId, roomTypes, railId, fromPrice }) {
  const rail = useSyncExternalStore(
    noSubscription,
    () => (railId ? document.getElementById(railId) : null),
    () => null,
  );
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { filters } = useMemo(
    () => parseDiscoveryQuery({ ...Object.fromEntries(params), vertical: 'hotel' }),
    [params],
  );
  const stayKey = `${filters.checkin}|${filters.checkout}|${filters.rooms}|${filters.adults}|${filters.children.join(',')}|${filters.pets}`;
  // Story 3.9: declared pets ride with every quote, only when there are any.
  const petsPart = filters.pets ? { pets: filters.pets } : {};
  const [live, setLive] = useState({ key: '', data: null, error: '' });
  const [picked, setPicked] = useState({});
  const [quote, setQuote] = useState({ state: 'idle' });
  const [isCustomer, setIsCustomer] = useState(false);
  const [reserving, startReserve] = useTransition();
  const [reserveError, setReserveError] = useState('');
  // ?change=<orderId>: this stay replaces an existing booking once it is paid.
  const change = params.get('change');
  const replacesOrderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    change ?? '',
  )
    ? change
    : null;

  // After login the guest comes back to the bare hotel URL: restore the stay they were pricing.
  useEffect(() => {
    let current = true;
    restoreCustomerSelection(rentableId).then((result) => {
      if (!current || !result) return;
      setIsCustomer(Boolean(result.isCustomer));
      const saved = result.selection;
      if (saved?.kind === 'stay' && !params.get('checkin')) {
        const query = new URLSearchParams({
          checkin: saved.checkIn,
          checkout: saved.checkOut,
          rooms: String(saved.rooms),
          adults: String(saved.adults),
          ...(saved.replacesOrderId ? { change: saved.replacesOrderId } : {}),
        });
        if (saved.children?.length) query.set('children', saved.children.join(','));
        if (saved.pets) query.set('pets', String(saved.pets));
        router.replace(`${pathname}?${query}`, { scroll: false });
      }
    });
    return () => {
      current = false;
    };
    // Once per hotel page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentableId]);

  useEffect(() => {
    if (!filters.checkin) return;
    let current = true;
    discoveryApi
      .rooms(code, {
        checkin: filters.checkin,
        checkout: filters.checkout,
        rooms: filters.rooms,
        adults: filters.adults,
        ...(filters.children.length ? { children: filters.children.join(',') } : {}),
      })
      .then((data) => current && setLive({ key: stayKey, data, error: '' }))
      .catch(
        (error) =>
          current &&
          setLive({ key: stayKey, data: null, error: error.message || 'Rooms could not load.' }),
      );
    return () => {
      current = false;
    };
    // stayKey summarises every input of the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stayKey]);

  const loading = Boolean(filters.checkin) && live.key !== stayKey;
  const data = loading ? null : live.data;
  // A selection belongs to one stay: new dates or guests start it again.
  const selection = picked.key === stayKey ? picked.counts : {};
  const lines = Object.entries(selection).flatMap(([planId, count]) => {
    const room = data?.roomTypes.find((r) => r.plans.some((p) => p.id === planId));
    const plan = room?.plans.find((p) => p.id === planId);
    return plan ? [{ room, plan, count }] : [];
  });
  const chosenRooms = lines.reduce((sum, line) => sum + line.count, 0);
  const tooFewAdults = chosenRooms > filters.adults;

  useEffect(() => {
    if (!chosenRooms || tooFewAdults) return;
    let current = true;
    const party = splitParty({
      rooms: chosenRooms,
      adults: filters.adults,
      childAges: filters.children,
    });
    const rooms = lines
      .flatMap(({ room, plan, count }) =>
        Array.from({ length: count }, () => ({ roomTypeId: room.id, ratePlanId: plan.id })),
      )
      .map((room, index) => ({ ...room, ...party[index] }));
    const timer = setTimeout(() => {
      setQuote({ state: 'loading' });
      discoveryApi
        .stayQuote(code, {
          checkIn: filters.checkin,
          checkOut: filters.checkout,
          rooms,
          ...petsPart,
        })
        .then((result) => current && setQuote({ state: 'ready', result }))
        .catch((error) => current && setQuote({ state: 'error', message: error.message }));
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // The selection and stay are summarised by these keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stayKey, JSON.stringify(selection), tooFewAdults]);

  /** Signed-in guest: store the quote and open checkout. Otherwise log in and come back to this stay. */
  const reserve = () =>
    startReserve(async () => {
      setReserveError('');
      if (!isCustomer) {
        const result = await beginCustomerLogin({
          kind: 'stay',
          rentableId,
          ...(replacesOrderId ? { replacesOrderId } : {}),
          checkIn: filters.checkin,
          checkOut: filters.checkout,
          rooms: filters.rooms,
          adults: filters.adults,
          children: filters.children,
          ...petsPart,
        });
        if (result?.error) setReserveError(result.error);
        return;
      }
      const result = await requestStayQuote({
        rentableId,
        checkIn: filters.checkin,
        checkOut: filters.checkout,
        rooms: quote.result.lines.map(({ roomTypeId, ratePlanId, adults, childAges }) => ({
          roomTypeId,
          ratePlanId,
          adults,
          childAges,
        })),
        ...(replacesOrderId ? { replacesOrderId } : {}),
        ...petsPart,
      });
      if (result?.quote?.id) router.push(`/checkout/review/${result.quote.id}`);
      else setReserveError(result?.error ?? 'Could not start checkout. Try again.');
    });

  const apply = (query) => router.replace(`${pathname}?${query}`, { scroll: false });
  const setCount = (planId, count) =>
    setPicked({ key: stayKey, counts: { ...selection, [planId]: count } });

  return (
    <div
      className={`grid items-start gap-x-10 gap-y-6 ${rail ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}`}
    >
      <div className="min-w-0 space-y-5">
        {replacesOrderId ? (
          <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-meta text-ink-800">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
            <span>
              Changing booking — your current booking is cancelled and refunded in full once the new
              one is paid.
            </span>
          </p>
        ) : null}
        <div className={rail ? 'lg:hidden' : undefined}>
          <StayForm key={stayKey} filters={filters} onApply={apply} />
        </div>
        {live.error && !loading ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-meta">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            {live.error}
          </p>
        ) : null}
        {!filters.checkin ? (
          <p className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-meta text-brand-900">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            Add dates for exact prices and rooms left.
          </p>
        ) : null}
        <div aria-busy={loading} className="space-y-5">
          {roomTypes.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              live={data?.roomTypes.find((r) => r.id === room.id)}
              loading={loading}
              dated={Boolean(filters.checkin)}
              rooms={filters.rooms}
              selection={selection}
              chosenRooms={chosenRooms}
              onCount={setCount}
            />
          ))}
        </div>
      </div>
      <StayRail
        rail={rail}
        form={<StayForm key={stayKey} filters={filters} onApply={apply} />}
        fromPrice={fromPrice}
        filters={filters}
        lines={lines}
        chosenRooms={chosenRooms}
        tooFewAdults={tooFewAdults}
        quote={chosenRooms && !tooFewAdults ? quote : { state: 'idle' }}
        onReserve={reserve}
        reserving={reserving}
        reserveError={reserveError}
        isCustomer={isCustomer}
      />
    </div>
  );
}

/** Dates and party; Apply rewrites the URL so the page, the back button and a shared link agree. */
/**
 * `apartment` (Story 3.11: { maxAdults, maxChildren, maxNights }) turns this into the whole-apartment form:
 * no rooms, the apartment's own guest limits and up to its maximum nights.
 */
export function StayForm({ filters, onApply, apartment = null }) {
  const maxNights = apartment?.maxNights ?? MAX_NIGHTS;
  const today = propertyToday();
  const lastDate = addLocalDays(today, 365);
  const [stay, setStay] = useState(filters.checkin ? [filters.checkin, filters.checkout] : []);
  const [rooms, setRooms] = useState(filters.rooms);
  const [adults, setAdults] = useState(filters.adults);
  const [ages, setAges] = useState(filters.children);
  const [pets, setPets] = useState(filters.pets ?? 0);
  const [open, setOpen] = useState(null);
  const [month, setMonth] = useState((filters.checkin || today).slice(0, 7));
  const [hoverDate, setHoverDate] = useState(null);
  const [checkin, checkout] = stay;
  const nights = checkout ? Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000) : 0;

  // Farmhouse rail behaviour: the page reprices as soon as the stay is complete.
  const apply = (next = {}) => {
    const [from, to] = next.stay ?? stay;
    const childAges = next.ages ?? ages;
    if (!from || !to || childAges.some((age) => age === '')) return;
    const query = new URLSearchParams({
      checkin: from,
      checkout: to,
      ...(apartment ? {} : { rooms: String(next.rooms ?? rooms) }),
      adults: String(next.adults ?? adults),
    });
    if (childAges.length) query.set('children', childAges.join(','));
    if (pets) query.set('pets', String(pets));
    onApply(query.toString());
  };
  const selectNight = (date) => {
    setHoverDate(null);
    const next = stay.length !== 1 || date <= stay[0] ? [date] : [stay[0], date];
    setStay(next);
    if (next.length === 2) {
      setOpen(null);
      apply({ stay: next });
    }
  };
  const counter = (label, value, min, max, set, hint) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="font-semibold">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
      </div>
      <span className="flex items-center gap-3">
        <button
          type="button"
          className={step}
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => set(value - 1)}
        >
          <Minus className="size-4" />
        </button>
        <output aria-live="polite" className="min-w-5 text-center font-semibold tabular">
          {value}
        </output>
        <button
          type="button"
          className={step}
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => set(value + 1)}
        >
          <Plus className="size-4" />
        </button>
      </span>
    </div>
  );
  const guests = adults + ages.length;
  const cell = 'block text-tiny font-bold uppercase';
  return (
    <div className="rounded-xl border border-ink-300 bg-card">
      <Popover.Root
        open={open === 'dates'}
        onOpenChange={(value) => {
          setOpen(value ? 'dates' : null);
          if (!value && stay.length === 1)
            setStay(filters.checkin ? [filters.checkin, filters.checkout] : []);
        }}
      >
        <Popover.Trigger
          aria-label="Choose check-in and check-out dates"
          className="grid w-full grid-cols-2 rounded-t-xl text-left transition hover:bg-brand-50"
        >
          <span className="min-w-0 border-r border-ink-300 px-4 py-2.5">
            <span className={cell}>Check-in</span>
            <span className="mt-0.5 block truncate text-sm">
              {checkin ? formatLocalDate(checkin, { weekday: 'short' }) : 'Add date'}
            </span>
          </span>
          <span className="min-w-0 px-4 py-2.5">
            <span className={cell}>Check-out</span>
            <span className="mt-0.5 block truncate text-sm">
              {checkout ? formatLocalDate(checkout, { weekday: 'short' }) : 'Add date'}
            </span>
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label="Choose your stay dates"
            className="z-[70] w-[min(640px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= today.slice(0, 7)}
                className={step}
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="px-2 text-center text-tiny text-ink-600" aria-live="polite">
                {stay.length === 1
                  ? `Choose check-out (up to ${maxNights} nights)`
                  : 'Choose your check-in date'}
              </p>
              <button
                type="button"
                aria-label="Next month"
                disabled={month >= lastDate.slice(0, 7)}
                className={step}
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2" onPointerLeave={() => setHoverDate(null)}>
              {[month, shiftMonth(month, 1)].map((value, index) => (
                <div key={value} className={index ? 'hidden sm:block' : ''}>
                  <CalendarMonth
                    month={value}
                    today={today}
                    lastDate={stay.length === 1 ? addLocalDays(lastDate, 1) : lastDate}
                    dates={stay}
                    mode="consecutive"
                    maxSpan={maxNights}
                    onSelect={selectNight}
                    hoverDate={hoverDate}
                    onPreview={setHoverDate}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setStay([])}
                className="min-h-11 text-meta font-semibold text-ink-600 underline underline-offset-4"
              >
                Clear dates
              </button>
              <span className="text-tiny text-ink-600">
                {nights
                  ? `${nights} night${nights === 1 ? '' : 's'}`
                  : 'Add dates for exact prices'}
              </span>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Popover.Root
        open={open === 'party'}
        onOpenChange={(value) => {
          setOpen(value ? 'party' : null);
          if (!value) apply();
        }}
      >
        <Popover.Trigger
          aria-label={
            apartment
              ? `Guests: ${guests} guests`
              : `Rooms and guests: ${rooms} room${rooms === 1 ? '' : 's'}, ${guests} guests`
          }
          className="flex min-h-14 w-full items-center justify-between rounded-b-xl border-t border-ink-300 px-4 py-2.5 text-left hover:bg-brand-50"
        >
          <span>
            <span className={cell}>{apartment ? 'Guests' : 'Rooms & guests'}</span>
            <span className="mt-0.5 block text-sm">
              {apartment ? '' : `${rooms} room${rooms === 1 ? '' : 's'} · `}
              {adults} adult{adults === 1 ? '' : 's'}
              {ages.length ? ` · ${ages.length} child${ages.length === 1 ? '' : 'ren'}` : ''}
              {pets ? ` · ${pets} pet${pets === 1 ? '' : 's'}` : ''}
            </span>
          </span>
          <ChevronDown className={`size-5 transition ${open === 'party' ? 'rotate-180' : ''}`} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label={apartment ? 'Select guests' : 'Select rooms and guests'}
            className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            {apartment
              ? null
              : counter('Rooms', rooms, 1, MAX_ROOMS, (value) => {
                  setRooms(value);
                  if (adults < value) setAdults(value);
                })}
            {counter(
              'Adults',
              adults,
              apartment ? 1 : rooms,
              apartment ? apartment.maxAdults : rooms * 6,
              setAdults,
              'Age 18 or over',
            )}
            {counter(
              'Children',
              ages.length,
              0,
              apartment ? apartment.maxChildren : rooms * 4,
              (value) => setAges(value > ages.length ? [...ages, ''] : ages.slice(0, value)),
              'Age 0–17',
            )}
            {ages.length ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ages.map((age, index) => (
                  <label key={index} className="text-tiny font-semibold text-ink-700">
                    Child {index + 1} age
                    <select
                      value={age}
                      required
                      onChange={(event) =>
                        setAges(
                          ages.map((value, i) =>
                            i === index ? Number(event.target.value) : value,
                          ),
                        )
                      }
                      className="mt-1 min-h-11 w-full rounded-xl border border-ink-300 bg-card px-2 text-base"
                    >
                      <option value="">Age</option>
                      {Array.from({ length: 18 }, (_, value) => (
                        <option key={value} value={value}>
                          {value === 0 ? 'Under 1' : value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            <PetsStepper
              value={pets}
              onChange={setPets}
              className="mt-2 border-t border-border pt-2"
            />
            <div className="mt-3 text-right">
              <Popover.Close className="min-h-11 text-sm font-semibold underline underline-offset-4">
                Done
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function RoomPhotos({ name, photos }) {
  const [index, setIndex] = useState(0);
  const list = photos ?? [];
  if (!list.length) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md bg-ink-100 p-4 text-center text-tiny text-ink-600">
        <ImageOff className="size-6 text-ink-400" aria-hidden="true" />
        No photo provided for this room
      </div>
    );
  }
  const i = Math.min(index, list.length - 1);
  const photo = list[i];
  const step = (delta) => setIndex((i + delta + list.length) % list.length);
  const button =
    'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-900 shadow focus-visible:outline-2 focus-visible:outline-brand-600';
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-md bg-ink-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URLs are already sized. */}
      <img
        src={photo.url}
        alt={photo.alt || `${name} photo ${i + 1}`}
        className="size-full object-cover"
        loading={i === 0 ? 'eager' : 'lazy'}
      />
      {list.length > 1 ? (
        <>
          <button
            type="button"
            className={`${button} left-2`}
            aria-label={`Previous photo of ${name}`}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${button} right-2`}
            aria-label={`Next photo of ${name}`}
            onClick={() => step(1)}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <figcaption
            aria-hidden="true"
            className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-tiny font-semibold text-white"
          >
            {photoLabel(i, list.length)}
          </figcaption>
          <span className="sr-only" aria-live="polite">
            {photoLabel(i, list.length)}
          </span>
        </>
      ) : null}
    </figure>
  );
}

function RoomCard({ room, live, loading, dated, rooms, selection, chosenRooms, onCount }) {
  const left = live?.available;
  const amenities = room.amenities ?? [];
  const { shown, more } = facilitySummary(amenities);
  const facts = [
    room.beds?.length ? [BedDouble, bedsLine(room.beds)] : null,
    room.extraPlaces?.length ? [BedDouble, extraPlacesLine(room.extraPlaces)] : null,
    // Story 3.6: this room's effective child bands and cots, always visible.
    room.childPolicy?.policy ? [Baby, `Children: ${policyLine(room.childPolicy.policy)}`] : null,
    room.cots?.count ? [Baby, cotsLine(room.cots)] : null,
    room.sizeSqm ? [Ruler, `${room.sizeSqm} m²`] : null,
    [Users, `Up to ${room.maxOccupancy} guests`],
    room.view ? [Eye, `${humanize(room.view)} view`] : null,
  ].filter(Boolean);
  return (
    <article
      className="overflow-hidden rounded-lg border border-border bg-card lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      aria-labelledby={`room-${room.id}`}
    >
      <div className="min-w-0 p-4">
        <RoomPhotos
          key={(room.photos ?? []).map((p) => p.url).join('|')}
          name={room.name}
          photos={room.photos}
        />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`room-${room.id}`} className="text-h4 font-bold">
            {room.name}
          </h3>
          {dated && live && left > 0 && left <= 3 ? (
            <span className="text-tiny font-semibold text-warning">Only {left} left</span>
          ) : null}
        </div>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-tiny text-ink-700">
          {facts.map(([Icon, text]) => (
            <li key={text} className="flex items-center gap-1">
              <Icon className="size-3.5 text-brand-600" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
        {amenities.length ? (
          <details className="group mt-2 text-tiny">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-ink-600 [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Room details & facilities: </span>
              <span className="min-w-0">
                {shown.join(' · ')}
                {more ? (
                  <span className="ml-1 font-semibold text-ink-900 underline underline-offset-4">
                    +{more} more
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="font-semibold text-ink-900">Room details & facilities</p>
            <ul className="mt-1 grid grid-cols-1 gap-x-3 sm:grid-cols-2 gap-y-1 text-ink-700">
              {amenities.map((slug) => (
                <li key={slug} className="min-w-0 break-words">
                  {humanize(slug)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      <div className="min-w-0 lg:border-l lg:border-border">
        <ul className="divide-y divide-border border-t border-border lg:border-t-0">
          {room.plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              live={live?.plans.find((p) => p.id === plan.id)}
              available={left ?? 0}
              loading={loading}
              dated={dated}
              rooms={rooms}
              count={selection[plan.id] ?? 0}
              otherRooms={chosenRooms - (selection[plan.id] ?? 0)}
              usedOfType={(live?.plans ?? []).reduce(
                (sum, p) => sum + (p.id === plan.id ? 0 : (selection[p.id] ?? 0)),
                0,
              )}
              onCount={(count) => onCount(plan.id, count)}
            />
          ))}
        </ul>
        {dated && live && !left ? (
          <p className="border-t border-border bg-ink-50 px-4 py-2 text-tiny font-semibold text-ink-700">
            Sold out for your dates
          </p>
        ) : null}
      </div>
    </article>
  );
}

function PlanRow({
  plan,
  live,
  available,
  loading,
  dated,
  rooms,
  count,
  otherRooms,
  usedOfType,
  onCount,
}) {
  const free =
    live?.terms?.freeUntil && new Date(live.terms.freeUntil) > new Date()
      ? live.terms.freeUntil
      : null;
  const max = Math.min(available - usedOfType, MAX_ROOMS - otherRooms);
  const meals = mealsLine(plan.inclusions ?? resolveInclusions(plan.mealPlan));
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold">
          {plan.mealPlan !== 'EP' ? (
            <Coffee className="size-4 text-brand-600" aria-hidden="true" />
          ) : null}
          {plan.name}
          {plan.name !== meals && plan.mealPlan !== 'EP' ? (
            <span className="text-tiny font-normal text-ink-600">· {meals}</span>
          ) : null}
        </p>
        {dated && live ? (
          free ? (
            <p className="mt-0.5 flex items-center gap-1 text-tiny text-success">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              Free cancellation until {formatInstant(free)}
            </p>
          ) : (
            <p className="mt-0.5 text-tiny text-ink-600">
              {plan.freeCancelHours
                ? 'Free cancellation has ended for these dates'
                : 'No refund after booking'}
            </p>
          )
        ) : (
          <p className="mt-0.5 text-tiny text-ink-600">
            {plan.freeCancelHours
              ? `Free cancellation until ${plan.freeCancelHours} hours before check-in`
              : 'No refund after booking'}
          </p>
        )}
        {dated && live && beddingLine(live.bedding) ? (
          <p className="mt-0.5 text-tiny text-ink-700">{beddingLine(live.bedding)}</p>
        ) : null}
        {live && !live.bookable && live.message ? (
          <p className="mt-0.5 text-tiny text-ink-600">{live.message}</p>
        ) : null}
      </div>
      {dated ? (
        <div className="flex items-center gap-4">
          <div className="text-right">
            {loading ? (
              <span
                className="inline-block h-5 w-20 animate-pulse rounded bg-ink-100"
                aria-label="Loading price"
              />
            ) : live?.totalMinor != null ? (
              <>
                <p className="font-extrabold tabular" data-money>
                  {formatINRMinor(live.totalMinor)}
                </p>
                <p className="text-tiny text-ink-600">
                  {rooms > 1 ? `${rooms} rooms, ` : ''}incl. {formatINRMinor(live.taxMinor)} tax
                </p>
              </>
            ) : (
              <p className="text-tiny text-ink-600">Not available</p>
            )}
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label={`${plan.name} rooms`}>
            <button
              type="button"
              className={step}
              aria-label={`Remove a ${plan.name} room`}
              disabled={!count}
              onClick={() => onCount(count - 1)}
            >
              <Minus className="size-4" />
            </button>
            <span className="w-5 text-center font-semibold tabular" aria-live="polite">
              {count}
            </span>
            <button
              type="button"
              className={step}
              aria-label={`Add a ${plan.name} room`}
              disabled={loading || !live?.bookable || count >= max}
              onClick={() => onCount(count + 1)}
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Sticky on desktop, a bottom bar on phones: the selected rooms and the quoted total. */
function StayRail({
  rail,
  form,
  fromPrice,
  filters,
  lines,
  chosenRooms,
  tooFewAdults,
  quote,
  onReserve,
  reserving,
  reserveError,
  isCustomer,
}) {
  const nights = filters.checkin
    ? Math.round((Date.parse(filters.checkout) - Date.parse(filters.checkin)) / 86400000)
    : 0;
  const total = quote.state === 'ready' ? quote.result.totals.totalMinor : null;
  const summary = (
    <>
      {filters.checkin ? (
        <p className="text-meta text-ink-700">
          {formatLocalDate(filters.checkin)} → {formatLocalDate(filters.checkout)} · {nights} night
          {nights === 1 ? '' : 's'}
        </p>
      ) : (
        <p className="text-meta text-ink-700">Add dates to choose rooms.</p>
      )}
      {chosenRooms ? (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-meta">
          {lines
            .filter((line) => line.count)
            .map(({ room, plan, count }) => (
              <li key={plan.id}>
                {count} × {room.name} · {plan.name}
              </li>
            ))}
        </ul>
      ) : null}
      <div className="mt-3 border-t border-border pt-3" aria-live="polite">
        {tooFewAdults ? (
          <p className="text-meta text-danger">
            Each room needs at least one adult. Add adults or remove a room.
          </p>
        ) : quote.state === 'loading' ? (
          <p className="flex items-center gap-2 text-meta text-ink-600">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Checking price…
          </p>
        ) : quote.state === 'error' ? (
          <p role="alert" className="text-meta text-danger">
            {quote.message}
          </p>
        ) : total != null ? (
          <>
            <p className="text-h3 font-extrabold tabular" data-money>
              {formatINRMinor(total)}
            </p>
            <p className="text-tiny text-ink-600">
              Total for {chosenRooms} room{chosenRooms === 1 ? '' : 's'}, incl.{' '}
              {formatINRMinor(quote.result.totals.taxMinor)} taxes
            </p>
            {quote.result.pets?.totalMinor ? (
              <p className="text-tiny text-ink-700">
                Pet fee · {formatINRMinor(quote.result.pets.totalMinor)}
              </p>
            ) : null}
            {beddingLine(quote.result.lines) ? (
              <p className="text-tiny text-ink-700">{beddingLine(quote.result.lines)}</p>
            ) : null}
          </>
        ) : (
          <p className="text-meta text-ink-600">
            {filters.checkin
              ? 'Choose a room to see your total.'
              : 'Prices appear once you add dates.'}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={total == null || reserving}
        onClick={onReserve}
        className="mt-3 min-h-11 w-full rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {reserving ? 'Opening checkout…' : isCustomer ? 'Reserve' : 'Log in to reserve'}
      </button>
      {reserveError ? (
        <p role="alert" className="mt-2 text-tiny text-danger">
          {reserveError}
        </p>
      ) : (
        <p className="mt-2 text-tiny text-ink-600">
          You won’t be charged yet. Rooms are held for 15 minutes at checkout.
        </p>
      )}
    </>
  );
  const card = rail ? (
    <aside
      aria-label="Your selection"
      className="hidden rounded-lg border border-border bg-card p-5 shadow-sm lg:block"
    >
      <h2 className="text-h4">Plan your stay</h2>
      {fromPrice ? (
        <p className="mt-3 text-meta text-ink-600">
          From{' '}
          <span className="text-h2 font-extrabold text-ink-900 tabular" data-money>
            {formatINR(fromPrice)}
          </span>{' '}
          / night
        </p>
      ) : null}
      <div className="mt-4">{form}</div>
      <div className="mt-4 border-t border-border pt-4">{summary}</div>
    </aside>
  ) : (
    <aside
      aria-label="Your selection"
      className="hidden rounded-lg border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:block"
    >
      <h3 className="text-h4">Your stay</h3>
      <div className="mt-2">{summary}</div>
    </aside>
  );
  return (
    <>
      {rail ? createPortal(card, rail) : card}
      {chosenRooms ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-lg lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-extrabold tabular" data-money>
                {total != null
                  ? formatINRMinor(total)
                  : quote.state === 'loading'
                    ? 'Checking…'
                    : '—'}
              </p>
              <p className="truncate text-tiny text-ink-600">
                {chosenRooms} room{chosenRooms === 1 ? '' : 's'} · {nights} night
                {nights === 1 ? '' : 's'} · incl. taxes
              </p>
            </div>
            <button
              type="button"
              disabled={total == null || reserving}
              onClick={onReserve}
              className="min-h-11 shrink-0 rounded-full bg-brand-600 px-5 text-meta font-semibold text-white disabled:opacity-50"
            >
              {reserving ? 'Opening…' : isCustomer ? 'Reserve' : 'Log in to reserve'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
