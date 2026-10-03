import OwnerTable from '../OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import Link from '@/components/navigation/NavigationLink';
import { displayMoney } from '@/lib/domain/display-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import {
  EARNINGS_NOTICE,
  earningState,
  environmentLabel,
  earningsQuery,
  earningsTime,
} from '@/lib/domain/owner-earnings';
import PrintButton from './PrintButton';
const link =
  'inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-brand-800 underline';
export function PayoutStatus({ status }) {
  return (
    <aside role="status" className="rounded-lg border border-border bg-card p-4 text-meta">
      <p>
        {status.kind === 'failed'
          ? `Your payout details were rejected: ${status.failureReason}.`
          : status.kind === 'missing'
            ? 'Add a payout method so we have your details ready for payouts.'
            : `Payouts are not switched on yet. Your booked rent is recorded. Payout method on file: ${status.masked}.`}
      </p>
      {status.kind !== 'unavailable' && (
        <p>Payouts are not switched on yet. No transfer date has been set.</p>
      )}
      <Link className={link} href="/partner/settings/payout">
        {status.kind === 'failed'
          ? 'Update payout method'
          : status.kind === 'missing'
            ? 'Add payout method'
            : 'View payout method'}
      </Link>
      <Link className={link} href="/partner/payouts">
        How payouts work
      </Link>
    </aside>
  );
}
export function EarningsFilters({ data, statement = false }) {
  const f = data.filters;
  return (
    <form
      method="get"
      action={statement ? '/partner/earnings/statements' : '/partner/earnings'}
      className="print:hidden flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      <label className="grid min-w-0 gap-1 text-meta">
        Month (IST)
        <input
          type="month"
          name="month"
          required
          defaultValue={f.month}
          className="min-h-11 max-w-full rounded-md border border-border bg-card px-3 text-base"
        />
      </label>
      <label className="grid min-w-0 gap-1 text-meta">
        Property
        <select
          name="propertyId"
          defaultValue={f.propertyId}
          className="min-h-11 max-w-[min(100%,18rem)] rounded-md border border-border bg-card px-3 text-base"
        >
          <option value="">All properties</option>
          {data.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || 'Untitled draft'}
            </option>
          ))}
          {f.propertyId && !data.properties.some((p) => p.id === f.propertyId) && (
            <option value={f.propertyId}>Selected property</option>
          )}
        </select>
      </label>
      {data.environments.length > 1 ? (
        <label className="grid gap-1 text-meta">
          Booking type
          <select
            name="environment"
            defaultValue={f.environment}
            className="min-h-11 max-w-full rounded-md border border-border bg-card px-3 text-base"
          >
            {data.environments.map((v) => (
              <option key={v} value={v}>
                {environmentLabel(v)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="environment" value={f.environment} />
      )}
      <button className="min-h-11 rounded-md bg-brand-800 px-4 font-semibold text-white">
        Apply
      </button>
    </form>
  );
}
export function EarningsSummary({ totals }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {[
        ['bookedRentMinor', 'Booked rent'],
        ['refundedMinor', 'Refunded'],
        ['completedRentMinor', 'Completed visits’ rent'],
      ].map(([key, label]) => (
        <div key={key} className="rounded-lg border border-border bg-card p-4">
          <dt className="text-meta text-ink-600">{label}</dt>
          <dd className="mt-1 break-words text-h3 font-semibold">{displayMoney(totals[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
export function EarningRows({ data }) {
  return (
    <OwnerTable
      label="Rent by visit"
      columns={[
        'Property / booking',
        'Guest',
        'Visit / status',
        'Booked rent',
        'Refunded',
        'Payout / details',
      ]}
      empty={!data.items.length ? 'No earnings in this view.' : null}
    >
      {data.items.map((row) => (
        <tr key={row.id}>
          <td>
            <strong className="block">{row.title}</strong>
            {row.bookingLinkAvailable ? (
              <Link
                className="inline-flex min-h-11 items-center text-brand-800 underline"
                href={`/partner/bookings?booking=${row.orderId}`}
              >
                {row.reference}
              </Link>
            ) : (
              <span className="block break-all">{row.reference}</span>
            )}
          </td>
          <td>{row.guestFirstName}</td>
          <td>
            {formatLocalDate(row.visitDate, { year: 'numeric' })} ·{' '}
            {{ day: 'Day visit', night: 'Overnight', full_day: 'Full day', hourly: 'Court visit' }[
              row.slot
            ] || 'Visit'}
            <span className="block font-semibold">{earningState(row.state)}</span>
            <span className="block text-tiny text-ink-600">
              Recorded {earningsTime(row.recordedAt)}
            </span>
          </td>
          <td className="whitespace-nowrap font-semibold">{displayMoney(row.bookedRentMinor)}</td>
          <td className="whitespace-nowrap">
            {displayMoney(row.refundedMinor)}
            {BigInt(row.refundPendingMinor) > 0n && (
              <span className="block text-tiny">
                In progress: {displayMoney(row.refundPendingMinor)}
              </span>
            )}
          </td>
          <td>
            Not switched on yet
            {row.earningLineIds.map((id, i) => (
              <Link
                key={id}
                href={`/partner/allocations/${id}`}
                className="flex min-h-11 items-center text-brand-800 underline"
              >
                {row.earningLineIds.length === 1 ? 'Earning details' : `Earning line ${i + 1}`}
              </Link>
            ))}
          </td>
        </tr>
      ))}
    </OwnerTable>
  );
}
export default function Earnings({ data, statement = false, print = false }) {
  const f = data.filters,
    q = earningsQuery({ ...f, page: undefined });
  const previous = new Date(`${f.month}-01T00:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousMonth = previous.toISOString().slice(0, 7);
  return (
    <section className={`owner-earnings space-y-5 ${print ? 'owner-statement-print' : ''}`}>
      <header>
        <h1 className="text-h1">
          {print ? 'Rentra statement' : statement ? 'Statements' : 'Earnings'}
        </h1>
        <p className="mt-2 text-meta">
          {f.month} · IST calendar month{' '}
          <span className="ml-2 inline-flex rounded-full bg-brand-50 px-2 py-1 font-semibold text-brand-800">
            {environmentLabel(f.environment)}
          </span>
        </p>
      </header>
      {!print && <PayoutStatus status={data.payoutStatus} />}
      {!print && <EarningsFilters data={data} statement={statement} />}
      <EarningsSummary totals={data.totals} />
      <p className="text-meta text-ink-600">{EARNINGS_NOTICE}</p>
      <p className="text-meta text-ink-600">
        {data.basis} Updated {earningsTime(data.asOf)}.
      </p>
      <div className="print:hidden flex flex-wrap gap-2">
        <a className={link} href={`/partner/statements/${f.month}/download?${q}`}>
          Download CSV
        </a>
        {print ? (
          <PrintButton />
        ) : (
          <Link className={link} href={`/partner/earnings/print?${q}`}>
            Print statement
          </Link>
        )}
      </div>
      {!data.count && <EarningRows data={data} />}
      {data.count ? (
        <>
          <p className="text-meta">
            {data.count} {data.count === 1 ? 'visit' : 'visits'}
          </p>
          <EarningRows data={data} />
        </>
      ) : (
        <EmptyState
          title={
            statement || print
              ? `Nothing in ${f.month}`
              : f.propertyId
                ? 'No earnings match these filters'
                : 'No earnings yet this month'
          }
          description={
            statement || print
              ? "Statements list every booking's rent and refunds for the month."
              : 'Each booking shows what you earn and when it is paid.'
          }
          actionHref={
            statement || print
              ? `?${earningsQuery({ ...f, month: previousMonth, page: undefined })}`
              : f.propertyId
                ? `?${earningsQuery({ ...f, propertyId: undefined, page: undefined })}`
                : '/partner/payouts'
          }
          actionLabel={
            statement || print
              ? 'Previous month'
              : f.propertyId
                ? 'Clear filters'
                : 'How payouts work'
          }
        />
      )}
      {!print && data.pages > 1 && (
        <nav aria-label="Earnings pages" className="flex flex-wrap items-center gap-3">
          {f.page > 1 && (
            <Link className={link} href={`?${earningsQuery({ ...f, page: f.page - 1 })}`}>
              Previous
            </Link>
          )}
          <span className="text-meta">
            Page {f.page} of {data.pages}
          </span>
          {f.page < data.pages && (
            <Link className={link} href={`?${earningsQuery({ ...f, page: f.page + 1 })}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
export function PayoutExplainer({ data }) {
  return (
    <section className="space-y-5">
      <h1 className="text-h1">Payouts</h1>
      <PayoutStatus status={data.payoutStatus} />
      <EmptyState
        title="No payouts yet"
        description="Payouts start once Rentra switches them on. We will notify you first."
      />
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-h3">How payouts will work</h2>
        <p className="mt-3 text-meta">
          Once payouts are switched on, Rentra will pay earnings after completed visits. We’ll tell
          you before the first payout.
        </p>
        <p className="mt-3 text-meta">
          We’ll ask you to confirm your details with our payment partner before your first payout.
        </p>
        <p className="mt-3 text-meta">{EARNINGS_NOTICE}</p>
      </div>
      <EarningsSummary totals={data.totals} />
      <Link className={link} href="/partner/earnings">
        View recorded rent and refunds
      </Link>
    </section>
  );
}
