import {
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  ChevronDown,
  CircleAlert,
  CreditCard,
  FileText,
  Info,
  Printer,
} from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import OwnerTable from '../OwnerTable';
import { displayMoney } from '@/lib/domain/display-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import {
  EARNINGS_NOTICE,
  earningState,
  environmentLabel,
  earningsQuery,
  earningsTime,
} from '@/lib/domain/owner-earnings';
import EarningsChart from './EarningsChart';
import EarningsLedger from './EarningsLedger';
import PrintButton from './PrintButton';
import EarningsFilters from './EarningsFilters';
import PayoutPanel from './PayoutPanel';
export { default as EarningsFilters } from './EarningsFilters';

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-meta font-semibold';
const button = `${buttonBase} border-border bg-card text-ink-800 hover:bg-ink-50`;
const textLink =
  'inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-800 hover:underline';
export function monthLabel(month) {
  return new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric',
  });
}
function adjacentMonth(month, offset) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function PayoutStatus({ status }) {
  const missing = status.kind === 'missing',
    failed = status.kind === 'failed';
  return (
    <PayoutPanel>
      <div className="mt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-tiny font-medium text-ink-600">
          <span className="size-1.5 rounded-full bg-ink-500" aria-hidden="true" />
          Not active yet
        </span>
        <p className="mt-3 text-meta leading-6 text-ink-600">
          Your booked rent is recorded. Payouts are not switched on yet, and no transfer date has
          been set.
        </p>
      </div>
      <div className="mt-5 border-t border-border pt-5">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-ink-500" aria-hidden="true" />
          <h3 className="text-meta font-semibold text-ink-800">Payout method</h3>
        </div>
        <p className="mt-3 break-words text-meta text-ink-700">
          {failed
            ? 'Your payout details need attention.'
            : missing
              ? 'No payout method added'
              : status.masked || 'Method on file'}
        </p>
        {failed && status.failureReason ? (
          <p role="status" className="mt-2 text-meta text-danger">
            {status.failureReason}
          </p>
        ) : null}
        {missing ? (
          <p className="mt-2 text-tiny leading-5 text-ink-500">
            Add your details now so they are ready when payouts begin.
          </p>
        ) : status.methodState ? (
          <p className="mt-1 text-tiny text-ink-500">
            {status.methodState === 'verified'
              ? 'Details verified'
              : 'Details submitted for review'}
          </p>
        ) : null}
        <Link
          href="/partner/settings/payout"
          className={`${missing || failed ? `${buttonBase} border-brand-600 bg-brand-600 text-white hover:bg-brand-700` : button} mt-4 w-full`}
        >
          {failed ? 'Update payout method' : missing ? 'Add payout method' : 'Manage payout method'}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <Link href="/partner/payouts" className={`${textLink} mt-4 self-start text-tiny`}>
        How payouts work
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </PayoutPanel>
  );
}
export function EarningsSummary({ totals, count, month, activity }) {
  return (
    <section
      className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6"
      aria-labelledby="monthly-earnings-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="monthly-earnings-title" className="text-h4 font-semibold text-ink-900">
          {month ? monthLabel(month) : 'Recorded rent'}
        </h2>
        {count != null ? (
          <span className="text-tiny text-ink-500">
            {count} {count === 1 ? 'visit' : 'visits'}
          </span>
        ) : null}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <dl className="min-w-0">
          <dt className="text-meta text-ink-600">Booked rent</dt>
          <dd className="mt-2 break-words text-4xl leading-tight font-semibold tracking-[-0.035em] text-ink-900 tabular sm:text-5xl">
            {displayMoney(totals.bookedRentMinor)}
          </dd>
          <dd className="mt-2 text-tiny text-ink-500">Rent from bookings recorded this month</dd>
        </dl>
        <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-1 sm:gap-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          {[
            ['completedRentMinor', 'Completed visits’ rent'],
            ['refundedMinor', 'Refunded'],
          ].map(([key, label]) => (
            <div key={key}>
              <dt className="text-tiny text-ink-500">{label}</dt>
              <dd className="mt-1 break-words text-h3 font-semibold text-ink-800 tabular">
                {displayMoney(totals[key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {activity ? <EarningsChart activity={activity} /> : null}
      <p className="mt-5 flex items-start gap-2 rounded-md bg-ink-25 p-3 text-tiny leading-5 text-ink-600">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
        {EARNINGS_NOTICE}
      </p>
    </section>
  );
}
/** Complete, non-collapsible evidence for print/PDF exports. */
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
            <span className="block break-all">{row.reference}</span>
          </td>
          <td>{row.guestFirstName}</td>
          <td>
            {formatLocalDate(row.visitDate, { year: 'numeric' })}
            <span className="block">
              {row.slot === 'night'
                ? 'Overnight'
                : row.slot === 'full_day'
                  ? 'Full day'
                  : row.slot === 'hourly'
                    ? 'Court visit'
                    : 'Day visit'}
            </span>
            <span className="block font-semibold">{earningState(row.state)}</span>
            <span className="block text-tiny text-ink-600">
              Recorded {earningsTime(row.recordedAt)}
            </span>
          </td>
          <td className="font-semibold tabular">{displayMoney(row.bookedRentMinor)}</td>
          <td className="tabular">
            {displayMoney(row.refundedMinor)}
            {BigInt(row.refundPendingMinor || 0) > 0n ? (
              <span className="block text-tiny">
                In progress: {displayMoney(row.refundPendingMinor)}
              </span>
            ) : null}
          </td>
          <td>
            Not switched on yet
            {row.bookingLinkAvailable ? (
              <Link href={`/partner/bookings?booking=${row.orderId}`} className={textLink}>
                Open booking
              </Link>
            ) : null}
            {row.earningLineIds.map((id, index) => (
              <Link href={`/partner/allocations/${id}`} key={id} className={textLink}>
                {row.earningLineIds.length === 1 ? 'Earning details' : `Earning line ${index + 1}`}
              </Link>
            ))}
          </td>
        </tr>
      ))}
    </OwnerTable>
  );
}
function ReportActions({ filters, print }) {
  const query = earningsQuery({ ...filters, page: undefined });
  if (print) return <PrintButton />;
  return (
    <details className="relative self-start print:hidden">
      <summary className={`${button} cursor-pointer list-none`}>
        <ArrowDownToLine className="size-4" aria-hidden="true" />
        Export
        <ChevronDown className="size-4" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
        <a
          href={`/partner/statements/${filters.month}/download?${query}`}
          className={`${textLink} w-full rounded-md px-3 text-tiny hover:bg-ink-50`}
        >
          <FileText className="size-4" aria-hidden="true" />
          Download CSV
        </a>
        <Link
          href={`/partner/earnings/print?${query}`}
          className={`${textLink} w-full rounded-md px-3 text-tiny hover:bg-ink-50`}
        >
          <Printer className="size-4" aria-hidden="true" />
          Print statement
        </Link>
      </div>
    </details>
  );
}
export default function Earnings({ data, statement = false, print = false }) {
  const f = data.filters;
  return (
    <section className={`owner-earnings space-y-5 ${print ? 'owner-statement-print' : ''}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="contents">
          <h1 className="text-h1 font-bold text-ink-900">
            {print ? 'Rentra statement' : statement ? 'Statements' : 'Earnings'}
          </h1>
          <p className="col-span-2 row-start-2 text-meta text-ink-600">
            {statement || print
              ? 'Your monthly rent and refund records.'
              : 'A clear view of the rent your properties bring in.'}
          </p>
        </div>
        <ReportActions filters={f} print={print} />
      </header>
      {!print ? <EarningsFilters key={earningsQuery(f)} data={data} statement={statement} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-tiny">
        <span
          className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 font-medium ${f.environment === 'live' ? 'bg-brand-50 text-brand-800' : 'bg-warning-bg text-warning'}`}
        >
          {f.environment !== 'live' ? (
            <CircleAlert className="size-3.5" aria-hidden="true" />
          ) : null}
          {environmentLabel(f.environment)}
        </span>
        <p className="text-ink-500">Updated {earningsTime(data.asOf)}</p>
      </div>
      {f.environment !== 'live' ? (
        <p role="status" className="text-meta text-warning">
          {f.environment === 'test' || f.environment === 'simulated'
            ? 'These are practice records and do not represent real bank money.'
            : 'These older records have an unverified payment environment.'}
        </p>
      ) : null}
      <div
        className={`grid items-start gap-5 ${!print ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}
      >
        <EarningsSummary
          totals={data.totals}
          count={data.count}
          month={f.month}
          activity={!statement && !print ? data.activity : null}
        />
        {!print ? <PayoutStatus status={data.payoutStatus} /> : null}
      </div>
      <section
        className="overflow-hidden rounded-lg border border-border bg-card"
        aria-labelledby="earning-records-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <div>
            <h2 id="earning-records-title" className="text-h4 font-semibold text-ink-900">
              {statement || print ? 'Statement records' : 'Booking records'}
            </h2>
            <p className="mt-1 text-tiny text-ink-500">
              Rent and refunds for each visit, with the latest visit status.
            </p>
          </div>
          {!print && !statement ? (
            <Link
              href={`/partner/earnings/statements?${earningsQuery({ ...f, page: undefined })}`}
              className={`${textLink} text-tiny`}
            >
              <FileText className="size-4" aria-hidden="true" />
              Monthly statement
            </Link>
          ) : null}
        </div>
        {data.items.length ? (
          print ? (
            <EarningRows data={data} />
          ) : (
            <EarningsLedger key={earningsQuery(f)} items={data.items} />
          )
        ) : (
          <EmptyState
            icon={Building2}
            title={
              f.propertyId
                ? 'No earnings match this property'
                : `No rent recorded in ${monthLabel(f.month)}`
            }
            description="Bookings appear here when their rent is recorded. Try another month or property."
            actionHref={`?${earningsQuery({ ...f, month: f.propertyId ? f.month : adjacentMonth(f.month, -1), propertyId: undefined, page: undefined })}`}
            actionLabel={f.propertyId ? 'Show all properties' : 'Previous month'}
          />
        )}
        {!print && data.count ? (
          <Pagination
            page={f.page}
            pageSize={30}
            total={data.count}
            pages={data.pages}
            pageSizes={null}
            label="Earnings pages"
            noun="visits"
            className="border-t border-border px-5 py-4 sm:px-6"
          />
        ) : null}
      </section>
      <details open={print || undefined} className="text-tiny text-ink-500">
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-medium text-ink-600">
          <Info className="size-3.5" aria-hidden="true" />
          How these figures are calculated
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </summary>
        <p className="max-w-3xl pb-4 leading-6">
          {data.basis} Completed visits’ rent is part of booked rent, not an additional amount.
          Refunds show current refund outcomes. The daily chart groups bookings by when rent was
          first recorded in India Standard Time.
        </p>
      </details>
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
      <EarningsSummary totals={data.totals} month={data.filters.month} />
      <Link className={textLink} href="/partner/earnings">
        View recorded rent and refunds
      </Link>
    </section>
  );
}
