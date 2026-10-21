import {
  BedDouble,
  Building2,
  CalendarRange,
  ChartColumn,
  Gauge,
  IndianRupee,
  Percent,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { formatINRMinor } from '@/lib/domain/booking-money';
import {
  AdminEmpty,
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  AdminTable,
} from './AdminPrimitives';

/** Hotel vertical analytics for admin (hotel plan, Phase 8): a plain GET date range, no client JS. */
const money = formatINRMinor;
const pct = (value) =>
  `${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
const num = (value) => Number(value ?? 0).toLocaleString('en-IN');
const dateLabel = (value) =>
  value
    ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : '—';

function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.roomsOffered));
  const sold = daily.reduce((sum, d) => sum + d.roomsSold, 0);
  const offered = daily.reduce((sum, d) => sum + d.roomsOffered, 0);
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h4">Rooms sold vs offered</h2>
        <p className="flex gap-3 text-tiny text-ink-600">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-ink-200" aria-hidden="true" /> Offered
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-brand-600" aria-hidden="true" /> Sold
          </span>
        </p>
      </div>
      <div
        role="img"
        aria-label={`Daily rooms sold against rooms offered over ${daily.length} days: ${num(sold)} sold of ${num(offered)} offered, peak ${num(max)} offered in a day.`}
        className="flex h-40 items-end gap-px"
      >
        {daily.map((d) => (
          <div key={d.date} className="relative h-full min-w-0 flex-1">
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-ink-200"
              style={{ height: `${(d.roomsOffered / max) * 100}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-brand-600"
              style={{ height: `${(d.roomsSold / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-tiny text-ink-600">
        <span>{dateLabel(daily[0]?.date)}</span>
        <span>{dateLabel(daily.at(-1)?.date)}</span>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-meta font-semibold text-brand-700">
          Show daily figures
        </summary>
        <div className="mt-2">
          <AdminTable
            label="Daily rooms and revenue"
            minWidth={420}
            columns={['Date', 'Sold', 'Offered', 'Revenue']}
          >
            {daily.map((d) => (
              <tr key={d.date}>
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  {dateLabel(d.date)}
                </th>
                <td className="px-4 py-2 tabular">{num(d.roomsSold)}</td>
                <td className="px-4 py-2 tabular">{num(d.roomsOffered)}</td>
                <td className="px-4 py-2 tabular">{money(d.revenueMinor)}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      </details>
    </section>
  );
}

export function HotelAnalytics({ data, cityId }) {
  const { kpis, daily, topHotels, topCities, supply, period } = data;
  const empty = !kpis.bookings && !kpis.roomNightsOffered && !topHotels.length;
  const tiles = [
    ['Occupancy', pct(kpis.occupancy), Gauge],
    ['ADR', money(kpis.adrMinor), IndianRupee, 'Average daily rate'],
    ['RevPAR', money(kpis.revparMinor), IndianRupee, 'Revenue per available room'],
    [
      'Room nights',
      num(kpis.roomNightsSold),
      BedDouble,
      `Sold of ${num(kpis.roomNightsOffered)} offered`,
    ],
    ['Bookings', num(kpis.bookings), CalendarRange],
    [
      'Cancellation rate',
      pct(kpis.cancellationRate),
      XCircle,
      `${num(kpis.cancelled)} cancelled · ${num(kpis.noShows)} no-shows`,
    ],
    ['Paid', money(kpis.paidMinor), Wallet],
    ['Refunds', money(kpis.refundedMinor), Undo2],
    ['Commission', money(kpis.commissionMinor), Percent],
    ['Take rate', pct(kpis.takeRate), Percent],
  ];
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader
        title="Hotel analytics"
        description={`Stays from ${dateLabel(period.from)} to ${dateLabel(period.to)}.`}
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block text-meta font-semibold">
          From
          <input
            type="date"
            name="from"
            defaultValue={period.from}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="block text-meta font-semibold">
          To
          <input type="date" name="to" defaultValue={period.to} className={`${fieldClass} mt-1`} />
        </label>
        {cityId ? <input type="hidden" name="cityId" value={cityId} /> : null}
        <button className={buttonVariants({ variant: 'outline' })}>
          <CalendarRange aria-hidden="true" />
          Apply
        </button>
      </form>

      {empty ? (
        <AdminEmpty
          icon={ChartColumn}
          title="No hotel activity in this period"
          description="Try a wider date range."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {tiles.map(([label, value, icon, hint]) => (
              <AdminKpiCard key={label} label={label} value={value} icon={icon} hint={hint} />
            ))}
          </div>

          {daily.length ? <DailyChart daily={daily} /> : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="min-w-0 space-y-3">
              <h2 className="text-h4">Top hotels</h2>
              <AdminTable
                label="Top hotels"
                minWidth={520}
                columns={['Hotel', 'Room nights', 'Revenue', 'Rating']}
                empty={topHotels.length ? null : 'No hotel stays in this period.'}
              >
                {topHotels.map((h) => (
                  <tr key={h.id}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      {h.title}
                      <span className="block text-tiny font-normal text-ink-600">{h.city}</span>
                    </th>
                    <td className="px-4 py-3 tabular">{num(h.roomNights)}</td>
                    <td className="px-4 py-3 tabular">{money(h.revenueMinor)}</td>
                    <td className="px-4 py-3 tabular">{h.rating ?? '—'}</td>
                  </tr>
                ))}
              </AdminTable>
            </section>
            <section className="min-w-0 space-y-3">
              <h2 className="text-h4">Top cities</h2>
              <AdminTable
                label="Top cities"
                minWidth={420}
                columns={['City', 'Live hotels', 'Room nights']}
                empty={topCities.length ? null : 'No city activity in this period.'}
              >
                {topCities.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      {c.name}
                    </th>
                    <td className="px-4 py-3 tabular">{num(c.liveHotels)}</td>
                    <td className="px-4 py-3 tabular">{num(c.roomNights)}</td>
                  </tr>
                ))}
              </AdminTable>
            </section>
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-h4">Supply</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminKpiCard label="Live hotels" value={num(supply.live)} icon={Building2} />
          <AdminKpiCard label="Pending review" value={num(supply.pending)} icon={Building2} />
          <AdminKpiCard label="Rooms" value={num(supply.rooms)} icon={BedDouble} />
          <AdminKpiCard
            label="Went live in period"
            value={num(supply.liveSince)}
            icon={CalendarRange}
          />
        </div>
      </section>
    </AdminPage>
  );
}
