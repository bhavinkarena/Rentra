import Link from '@/components/navigation/NavigationLink';
import { AdminTable } from './AdminPrimitives';
import { displayMoney } from '@/lib/domain/display-money';
import { humaniseStatus } from '@/lib/domain/status';

/** The semantic table is the chart's accessible, exact-value alternative. */
function Trend({ title, rows, field, money = false, href, description }) {
  const values = rows.map((row) => Number(row[field]));
  const max = Math.max(1, ...values);
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5">
      <h3 className="text-h4 font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-tiny leading-5 text-ink-600">{description}</p>
      <p className="mt-4 text-tiny text-ink-600">
        Daily scale: 0 to {money ? displayMoney(rows[values.indexOf(max)]?.[field] ?? '1') : max}
      </p>
      <svg viewBox="0 0 600 160" className="mt-4 h-40 w-full" aria-hidden="true">
        <path d="M0 150H600" stroke="var(--color-border)" />
        {values.map((value, index) => (
          <rect
            key={rows[index].date}
            x={(index * 600) / values.length + 1}
            y={150 - (value / max) * 140}
            width={Math.max(1, 600 / values.length - 2)}
            height={(value / max) * 140}
            fill="var(--color-brand-600)"
          />
        ))}
      </svg>
      <p className="flex justify-between text-tiny text-ink-600">
        <span>{rows[0]?.date}</span>
        <span>{rows.at(-1)?.date}</span>
      </p>
      <details className="mt-4">
        <summary className="cursor-pointer py-3 text-meta font-semibold text-brand-700">
          View {title.toLowerCase()} data
        </summary>
        <AdminTable
          label={`${title} data`}
          columns={['IST date', money ? 'Rent (INR)' : 'Count']}
          minWidth={300}
        >
          {rows.map((row) => (
            <tr key={row.date}>
              <td className="px-4 py-3">{row.date}</td>
              <td className="px-4 py-3 tabular">{money ? displayMoney(row[field]) : row[field]}</td>
            </tr>
          ))}
        </AdminTable>
      </details>
      <Link
        href={href}
        className="mt-3 inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline"
      >
        Open matching records
      </Link>
    </section>
  );
}

export default function AdminAnalytics({ modules }) {
  const bookings = modules.bookings?.availability === 'available' ? modules.bookings : null;
  const applications =
    modules.applications?.availability === 'available' ? modules.applications : null;
  if (!bookings && !applications) return null;
  return (
    <section className="mt-8" aria-label="Period analytics">
      <h2 className="mb-4 text-h3 font-semibold text-ink-900">Selected period</h2>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {bookings ? (
          <>
            <Trend
              title="Bookings created"
              rows={bookings.dailySeries}
              field="bookings"
              href={bookings.href}
              description="Orders created in the selected IST period, all states. Each order counts once."
            />
            <Trend
              title="Booked rent"
              rows={bookings.dailySeries}
              field="rentMinor"
              money
              href={bookings.metrics.find((m) => m.key === 'rent').href}
              description="Created-order cohort; active visit rent only. Excludes cancelled rent, unpaid holds, fees and deposits."
            />
            <section className="min-w-0 rounded-lg border border-border bg-card p-5">
              <h3 className="text-h4 font-semibold text-ink-900">Booking status</h3>
              <p className="mt-2 mb-4 text-tiny text-ink-600">
                Current states of orders created in the selected period.
              </p>
              <AdminTable
                label="Booking status distribution"
                columns={['Status', 'Orders']}
                minWidth={300}
                empty={!bookings.distributions.length ? 'No orders in this period.' : null}
              >
                {bookings.distributions.map((row) => (
                  <tr key={row.state}>
                    <td className="px-4 py-3">{humaniseStatus(row.state)}</td>
                    <td className="px-4 py-3 tabular">
                      {row.count}
                      <span
                        aria-hidden="true"
                        className="mt-2 block h-2 rounded-sm bg-brand-600"
                        style={{
                          width: `${(row.count / Math.max(1, ...bookings.distributions.map((r) => r.count))) * 100}%`,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </AdminTable>
              <Link
                href={bookings.href}
                className="mt-3 inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline"
              >
                Open matching bookings
              </Link>
            </section>
          </>
        ) : null}
        {applications ? (
          <Trend
            title="Review throughput"
            rows={applications.throughput}
            field="decisions"
            href={applications.historyHref}
            description="Recorded approval, rejection and more-information decisions by IST day. This measures decisions, not historical queue size."
          />
        ) : null}
      </div>
    </section>
  );
}
