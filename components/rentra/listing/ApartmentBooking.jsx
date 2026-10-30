'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CalendarDays, Lock, Sparkles } from 'lucide-react';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestBookingQuote } from '@/lib/actions/customer';
import { parseDiscoveryQuery } from '@/lib/domain/discovery';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatINR } from '@/lib/domain/pricing';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { StayForm } from '@/components/rentra/hotels/HotelRooms';

const primary =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 text-base font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Story 3.11: the whole-apartment booking panel. Dates, guests and pets live in the URL (shareable,
 * kept through login); the server quote is the only price: nightly breakdown, cleaning, pets, the
 * service fee and the total. Refusals ("Minimum 3 nights for Saturday arrival") keep every value.
 */
export default function ApartmentBooking({ rentableId, apartment }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { filters } = useMemo(
    () => parseDiscoveryQuery({ ...Object.fromEntries(params), vertical: 'hotel' }),
    [params],
  );
  const key = `${filters.checkin}|${filters.checkout}|${filters.adults}|${filters.children.join(',')}|${filters.pets}`;
  const selection = filters.checkin
    ? {
        kind: 'apartment',
        rentableId,
        checkIn: filters.checkin,
        checkOut: filters.checkout,
        adults: filters.adults,
        childAges: filters.children,
        ...(filters.pets ? { pets: filters.pets } : {}),
      }
    : null;
  const [quote, setQuote] = useState({ key: '', result: null });
  const [isCustomer, setIsCustomer] = useState(false);
  const [reserving, startReserve] = useTransition();
  const [reserveError, setReserveError] = useState('');
  const [retry, setRetry] = useState(0);
  // StayForm keeps its own state while the guest edits (no remount, so focus stays put); it is
  // remounted only when a restored login selection rewrites the URL.
  const [formVersion, setFormVersion] = useState(0);

  // After login the guest returns to the bare URL: put their apartment stay back.
  useEffect(() => {
    let current = true;
    restoreCustomerSelection(rentableId).then((result) => {
      if (!current || !result) return;
      setIsCustomer(Boolean(result.isCustomer));
      const saved = result.selection;
      if (saved?.kind === 'apartment' && !params.get('checkin')) {
        const query = new URLSearchParams({
          checkin: saved.checkIn,
          checkout: saved.checkOut,
          adults: String(saved.adults),
        });
        if (saved.childAges?.length) query.set('children', saved.childAges.join(','));
        if (saved.pets) query.set('pets', String(saved.pets));
        router.replace(`${pathname}?${query}`, { scroll: false });
        setFormVersion((v) => v + 1);
      }
    });
    return () => {
      current = false;
    };
    // Once per apartment page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentableId]);

  useEffect(() => {
    if (!selection) return;
    let current = true;
    const timer = setTimeout(async () => {
      const result = await requestBookingQuote(selection).catch(() => ({
        error: 'The price could not load. Try again.',
      }));
      if (current) setQuote({ key: `${key}|${retry}`, result });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // `key` summarises the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isCustomer, retry]);

  const loading = Boolean(selection) && quote.key !== `${key}|${retry}`;
  const result = loading ? null : quote.result;
  const priced = result?.quote ?? null;

  const reserve = () =>
    startReserve(async () => {
      setReserveError('');
      if (!isCustomer) {
        const login = await beginCustomerLogin(selection);
        if (login?.error) setReserveError(login.error);
        return;
      }
      if (priced?.id) router.push(`/checkout/review/${priced.id}`);
    });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-h4">
        {formatINR(Math.min(apartment.weekday, apartment.weekend))}
        <span className="text-meta font-normal text-ink-600"> / night, whole apartment</span>
      </p>
      <StayForm
        key={formVersion}
        filters={filters}
        apartment={apartment}
        onApply={(query) => router.replace(`${pathname}?${query}`, { scroll: false })}
      />
      <p className="text-tiny text-ink-600">
        {apartment.minNights > 1 ? `Minimum ${apartment.minNights} nights · ` : ''}
        Check-in from {apartment.checkInTime} · check-out by {apartment.checkOutTime}
      </p>
      <div aria-live="polite" aria-busy={loading}>
        {!selection ? (
          <p className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-meta text-brand-900">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            Add dates for the total price.
          </p>
        ) : loading ? (
          <p className="text-meta text-ink-600">Checking dates and price…</p>
        ) : result?.error ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-meta">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="flex-1">
              {result.error}
              {/* A refused rule is fixed by changing the stay; a failed request can simply be retried. */}
              {!result.code || result.code === 'QUOTE_UNAVAILABLE' ? (
                <button
                  type="button"
                  onClick={() => setRetry((v) => v + 1)}
                  className="mt-2 block min-h-11 font-semibold underline underline-offset-4"
                >
                  Try again
                </button>
              ) : null}
            </span>
          </p>
        ) : priced ? (
          <ApartmentPrice quote={priced} />
        ) : null}
      </div>
      {priced ? (
        <button type="button" className={primary} onClick={reserve} disabled={reserving}>
          <Lock className="size-4" aria-hidden="true" />
          {isCustomer ? 'Reserve' : 'Log in to reserve'}
        </button>
      ) : null}
      {reserveError ? (
        <p role="alert" className="text-meta text-error">
          {reserveError}
        </p>
      ) : null}
    </div>
  );
}

/** Nightly rows grouped by price, then cleaning, pets, the service fee and the total. */
export function ApartmentPrice({ quote }) {
  const visit = quote.visits[0];
  const a = visit.apartment;
  const groups = new Map();
  for (const night of a.nightly) {
    const label = night.weekend ? 'Weekend night' : 'Weeknight';
    const group = groups.get(`${label}|${night.rateMinor}`) ?? {
      label,
      rate: night.rateMinor,
      nights: [],
    };
    group.nights.push(night.night);
    groups.set(`${label}|${night.rateMinor}`, group);
  }
  const row = (label, value, detail) => (
    <div key={label} className="flex items-baseline justify-between gap-4">
      <dt>
        {label}
        {detail ? <span className="block text-tiny text-ink-500">{detail}</span> : null}
      </dt>
      <dd className="tabular" data-money>
        {value}
      </dd>
    </div>
  );
  return (
    <dl className="space-y-2 text-sm text-ink-700">
      {[...groups.values()].map((g) =>
        row(
          `${g.nights.length} × ${g.label.toLowerCase()} ${formatINRMinor(g.rate)}`,
          formatINRMinor(g.rate * g.nights.length),
          g.nights.map((n) => formatLocalDate(n, { weekday: 'short' })).join(' · '),
        ),
      )}
      {row('Cleaning fee', a.cleaningMinor ? formatINRMinor(a.cleaningMinor) : 'None')}
      {a.petMinor ? row('Pet fee', formatINRMinor(a.petMinor)) : null}
      {row('Service fee', formatINRMinor(visit.feeMinor))}
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2.5 font-bold text-ink-900">
        <dt className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-brand-700" aria-hidden="true" />
          Total · {visit.nights} night{visit.nights === 1 ? '' : 's'}
        </dt>
        <dd className="tabular" data-money>
          {formatINRMinor(quote.totals.totalMinor)}
        </dd>
      </div>
    </dl>
  );
}
