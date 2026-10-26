import {
  BedDouble,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  Gauge,
  IndianRupee,
  Percent,
  Search,
  Star,
  TicketCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { inr } from './HotelEarnings';

const card = 'min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6';
const field = 'min-h-11 w-full rounded-md border border-border bg-card px-3 text-meta';
const SUB_SCORES = [
  ['cleanliness', 'Cleanliness'],
  ['staff', 'Staff'],
  ['location', 'Location'],
  ['comfort', 'Comfort'],
  ['value', 'Value for money'],
  ['facilities', 'Facilities'],
];

function Kpi({ icon: Icon, label, value, note }) {
  return (
    <div className="min-w-0 rounded-md bg-ink-25 p-3">
      <dt className="flex items-center gap-1.5 text-tiny text-ink-600">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-h4 font-semibold text-ink-900 tabular">{value}</dd>
      {note ? <dd className="text-tiny text-ink-500">{note}</dd> : null}
    </div>
  );
}

function DailyChart({ days, kpis }) {
  const max = Math.max(1, ...days.map((d) => d.roomsOffered), ...days.map((d) => d.roomsSold));
  const summary = `Rooms sold against rooms offered per night, ${days.length} nights: ${kpis.roomNightsSold} of ${kpis.roomNightsOffered} room nights sold, ${kpis.occupancy}% occupancy.`;
  return (
    <section className={card} aria-labelledby="daily-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="daily-title" className="text-h4 font-semibold text-ink-900">
          Rooms sold per night
        </h2>
        <p className="flex items-center gap-3 text-tiny text-ink-600">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-brand-600" aria-hidden="true" />
            Sold
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-ink-100" aria-hidden="true" />
            Offered
          </span>
        </p>
      </div>
      <div role="img" aria-label={summary} className="mt-4 flex h-40 items-end gap-px">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.roomsSold} of ${d.roomsOffered}`}
            className="relative h-full min-w-0 flex-1"
          >
            <span
              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-ink-100"
              style={{ height: `${(d.roomsOffered / max) * 100}%` }}
            />
            <span
              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-brand-600"
              style={{ height: `${(d.roomsSold / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <details className="mt-3 text-tiny">
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-medium text-ink-600">
          Show data table
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </summary>
        <div
          role="region"
          aria-label="Rooms per night"
          tabIndex={0}
          className="max-h-72 overflow-auto rounded-md border border-border"
        >
          <table className="w-full border-collapse text-left text-meta">
            <caption className="sr-only">Rooms sold, offered and revenue per night</caption>
            <thead className="sticky top-0 bg-ink-25">
              <tr>
                {['Night', 'Sold', 'Offered', 'Revenue'].map((label, i) => (
                  <th
                    scope="col"
                    key={label}
                    className={`px-3 py-2 text-tiny font-semibold text-ink-600 ${i ? 'text-right' : ''}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="px-3 py-1.5 font-normal whitespace-nowrap">
                    {formatLocalDate(d.date)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular">{d.roomsSold}</td>
                  <td className="px-3 py-1.5 text-right tabular">{d.roomsOffered}</td>
                  <td className="px-3 py-1.5 text-right tabular">{inr(d.revenueMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Reviews({ reviews }) {
  if (!reviews?.count)
    return (
      <section className={card} aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="text-h4 font-semibold text-ink-900">
          Guest reviews
        </h2>
        <p className="mt-2 text-meta text-ink-600">No published reviews yet.</p>
      </section>
    );
  return (
    <section className={card} aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-h4 font-semibold text-ink-900">
        Guest reviews
      </h2>
      <p className="mt-3 flex items-baseline gap-2">
        <Star className="size-5 self-center fill-current text-brand-600" aria-hidden="true" />
        <span className="text-3xl font-semibold text-ink-900 tabular">
          {reviews.rating?.toFixed(1)}
        </span>
        <span className="text-meta text-ink-600">
          out of 5 · {reviews.count} {reviews.count === 1 ? 'review' : 'reviews'}
        </span>
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {SUB_SCORES.map(([key, label]) => {
          const score = reviews.subScores?.[key];
          return (
            <div key={key} className="min-w-0">
              <div className="flex justify-between text-meta">
                <dt className="text-ink-700">{label}</dt>
                <dd className="tabular text-ink-900">{score != null ? score.toFixed(1) : '—'}</dd>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ink-100" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${((score ?? 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>
      {reviews.travellers?.length ? (
        <>
          <h3 className="mt-5 text-meta font-semibold text-ink-800">Traveller types</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {reviews.travellers.map((t) => (
              <li
                key={t.type}
                className="rounded-full bg-ink-50 px-3 py-1 text-tiny text-ink-700 capitalize"
              >
                {String(t.type).replaceAll('_', ' ')} · {t.count} · {t.rating?.toFixed(1)}
                <span className="sr-only"> out of 5</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export default function HotelAnalytics({ data, hotelId }) {
  const k = data.kpis;
  return (
    <section className="space-y-5">
      <p className="text-meta text-ink-600">
        Room revenue shows gross booked charges before tax and refunds, including charges retained
        after early departure. Refunds are recorded separately; occupied room counts exclude unused
        released nights.
      </p>
      <header>
        <Link
          href="/partner/earnings/hotels"
          className="inline-flex min-h-11 items-center gap-2 text-tiny font-semibold text-brand-800 hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Hotel earnings
        </Link>
        <h1 className="text-h1 font-bold text-ink-900">Hotel analytics</h1>
        <p className="text-meta text-ink-600">Occupancy, rates and reviews for your hotels.</p>
      </header>
      {!data.hotels.length ? (
        <EmptyState
          icon={BedDouble}
          title="No hotels yet"
          description="Analytics appear once you list a hotel."
          actionHref="/partner/listings"
          actionLabel="Your listings"
        />
      ) : (
        <>
          <form
            method="get"
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
          >
            {data.hotels.length > 1 ? (
              <label className="grid min-w-0 flex-[1_1_12rem] gap-1 text-tiny font-medium text-ink-700">
                Hotel
                <select name="hotelId" defaultValue={hotelId ?? ''} className={field}>
                  <option value="">All hotels</option>
                  {data.hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid min-w-0 flex-[1_1_9rem] gap-1 text-tiny font-medium text-ink-700">
              From
              <input type="date" name="from" defaultValue={data.period.from} className={field} />
            </label>
            <label className="grid min-w-0 flex-[1_1_9rem] gap-1 text-tiny font-medium text-ink-700">
              To
              <input type="date" name="to" defaultValue={data.period.to} className={field} />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-4 text-meta font-semibold text-white hover:bg-brand-700"
            >
              <Search className="size-4" aria-hidden="true" />
              Show
            </button>
          </form>
          <p className="flex items-center gap-1.5 text-tiny text-ink-600">
            <CalendarRange className="size-3.5" aria-hidden="true" />
            {formatLocalDate(data.period.from, { year: 'numeric' })} –{' '}
            {formatLocalDate(data.period.to, { year: 'numeric' })}
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Gauge} label="Occupancy" value={`${k.occupancy}%`} />
            <Kpi icon={IndianRupee} label="ADR" value={inr(k.adrMinor)} note="Per room sold" />
            <Kpi
              icon={IndianRupee}
              label="RevPAR"
              value={inr(k.revparMinor)}
              note="Per room offered"
            />
            <Kpi
              icon={BedDouble}
              label="Room nights"
              value={`${k.roomNightsSold} / ${k.roomNightsOffered}`}
              note="Sold / offered"
            />
            <Kpi icon={TicketCheck} label="Bookings" value={k.bookings} />
            <Kpi icon={Percent} label="Cancellation rate" value={`${k.cancellationRate}%`} />
            <Kpi icon={XCircle} label="Cancelled" value={k.cancelled} />
            <Kpi icon={UserX} label="No-shows" value={k.noShows} />
          </dl>
          <DailyChart days={data.daily} kpis={k} />
          <Reviews reviews={data.reviews} />
        </>
      )}
    </section>
  );
}
