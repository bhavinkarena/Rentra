'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestStayQuote } from '@/lib/actions/customer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CircleCheck,
  Coffee,
  Eye,
  ImageOff,
  LoaderCircle,
  Minus,
  Plus,
  Ruler,
  Users,
} from 'lucide-react';
import { discoveryApi } from '@/lib/api/endpoints';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { parseDiscoveryQuery } from '@/lib/domain/discovery';
import { MEAL_LABELS, bedsLine, formatInstant, humanize, splitParty } from '@/lib/domain/hotel-ui';

const MAX_ROOMS = 8;
const step =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border text-ink-700 hover:border-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Room selection (hotel plan §4.6): one card per room type, one row per rate.
 * Prices come from the API for the guest's dates and party (the search card's
 * numbers); the total comes from a server quote. The page never prices anything.
 */
export default function HotelRooms({ code, rentableId, roomTypes }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { filters } = useMemo(
    () => parseDiscoveryQuery({ ...Object.fromEntries(params), vertical: 'hotel' }),
    [params],
  );
  const stayKey = `${filters.checkin}|${filters.checkout}|${filters.rooms}|${filters.adults}|${filters.children.join(',')}`;
  const [live, setLive] = useState({ key: '', data: null, error: '' });
  const [picked, setPicked] = useState({});
  const [quote, setQuote] = useState({ state: 'idle' });
  const [isCustomer, setIsCustomer] = useState(false);
  const [reserving, startReserve] = useTransition();
  const [reserveError, setReserveError] = useState('');

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
        });
        if (saved.children?.length) query.set('children', saved.children.join(','));
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
        .stayQuote(code, { checkIn: filters.checkin, checkOut: filters.checkout, rooms })
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
          checkIn: filters.checkin,
          checkOut: filters.checkout,
          rooms: filters.rooms,
          adults: filters.adults,
          children: filters.children,
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
      });
      if (result?.quote?.id) router.push(`/checkout/review/${result.quote.id}`);
      else setReserveError(result?.error ?? 'Could not start checkout. Try again.');
    });

  const setCount = (planId, count) =>
    setPicked({ key: stayKey, counts: { ...selection, [planId]: count } });

  return (
    <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <StayForm
          filters={filters}
          onApply={(query) => router.replace(`${pathname}?${query}`, { scroll: false })}
        />
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
function StayForm({ filters, onApply }) {
  const today = propertyToday();
  const [checkin, setCheckin] = useState(filters.checkin);
  const [checkout, setCheckout] = useState(filters.checkout);
  const [rooms, setRooms] = useState(filters.rooms);
  const [adults, setAdults] = useState(filters.adults);
  const [ages, setAges] = useState(filters.children);
  const invalid = !checkin || !checkout || checkout <= checkin || ages.some((age) => age === '');
  const counter = (label, value, min, max, set) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-meta font-semibold">{label}</span>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          className={step}
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => set(value - 1)}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center font-semibold tabular" aria-live="polite">
          {value}
        </span>
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
  return (
    <form
      aria-label="Your stay"
      className="rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        const query = new URLSearchParams({
          checkin,
          checkout,
          rooms: String(rooms),
          adults: String(adults),
        });
        if (ages.length) query.set('children', ages.join(','));
        onApply(query.toString());
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-tiny font-semibold text-ink-700">
          Check-in
          <input
            type="date"
            value={checkin}
            min={today}
            max={addLocalDays(today, 365)}
            onChange={(event) => {
              setCheckin(event.target.value);
              if (!checkout || checkout <= event.target.value)
                setCheckout(event.target.value ? addLocalDays(event.target.value, 1) : '');
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-ink-300 bg-card px-3 text-base"
          />
        </label>
        <label className="text-tiny font-semibold text-ink-700">
          Check-out
          <input
            type="date"
            value={checkout}
            min={checkin ? addLocalDays(checkin, 1) : addLocalDays(today, 1)}
            max={checkin ? addLocalDays(checkin, 30) : undefined}
            onChange={(event) => setCheckout(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-ink-300 bg-card px-3 text-base"
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {counter('Rooms', rooms, 1, MAX_ROOMS, (value) => {
          setRooms(value);
          if (adults < value) setAdults(value);
        })}
        {counter('Adults', adults, rooms, rooms * 6, setAdults)}
        {counter('Children', ages.length, 0, rooms * 4, (value) =>
          setAges(value > ages.length ? [...ages, ''] : ages.slice(0, value)),
        )}
      </div>
      {ages.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ages.map((age, index) => (
            <label key={index} className="text-tiny font-semibold text-ink-700">
              Child {index + 1} age
              <select
                value={age}
                required
                onChange={(event) =>
                  setAges(
                    ages.map((value, i) => (i === index ? Number(event.target.value) : value)),
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
      <button
        disabled={invalid}
        className="mt-3 min-h-11 w-full rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
      >
        {filters.checkin ? 'Update prices' : 'Show prices'}
      </button>
    </form>
  );
}

function RoomCard({ room, live, loading, dated, rooms, selection, chosenRooms, onCount }) {
  const photo = room.photos?.[0];
  const left = live?.available;
  const facts = [
    room.beds?.length ? [BedDouble, bedsLine(room.beds)] : null,
    room.sizeSqm ? [Ruler, `${room.sizeSqm} m²`] : null,
    [Users, `Up to ${room.maxOccupancy} guests`],
    room.view ? [Eye, `${humanize(room.view)} view`] : null,
  ].filter(Boolean);
  return (
    <article
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-labelledby={`room-${room.id}`}
    >
      <div className="flex gap-4 p-4">
        <div className="relative hidden size-28 shrink-0 overflow-hidden rounded-md bg-ink-100 sm:block">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URLs are already sized.
            <img
              src={photo.url}
              alt={photo.alt ?? room.name}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageOff className="absolute inset-0 m-auto size-6 text-ink-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
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
          {room.amenities?.length ? (
            <p className="mt-1.5 text-tiny text-ink-500">
              {room.amenities.slice(0, 8).map(humanize).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="divide-y divide-border border-t border-border">
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
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold">
          {plan.mealPlan !== 'EP' ? (
            <Coffee className="size-4 text-brand-600" aria-hidden="true" />
          ) : null}
          {plan.name}
          {plan.name !== MEAL_LABELS[plan.mealPlan] && plan.mealPlan !== 'EP' ? (
            <span className="text-tiny font-normal text-ink-600">
              · {MEAL_LABELS[plan.mealPlan]}
            </span>
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
  return (
    <>
      <aside
        aria-label="Your selection"
        className="hidden rounded-lg border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:block"
      >
        <h3 className="text-h4">Your stay</h3>
        <div className="mt-2">{summary}</div>
      </aside>
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
