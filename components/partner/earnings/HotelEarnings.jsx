import {
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  FileText,
  Hotel,
  Landmark,
  Receipt,
  RotateCcw,
  Undo2,
  Wallet,
} from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { monthLabel } from './Earnings';
import PrintButton from './PrintButton';

/** Signed paise for display; formatINRMinor only takes nonnegative amounts. */
export const inr = (minor) =>
  minor < 0 ? `−${formatINRMinor(-minor)}` : formatINRMinor(Number(minor) || 0);
const day = (date, year) => (date ? formatLocalDate(date, year ? { year: 'numeric' } : {}) : '—');
const card = 'min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6';
const textLink =
  'inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-800 hover:underline';

function shiftMonth(month, offset) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function TestModeBadge({ environment }) {
  if (environment === 'live') return null;
  return (
    <p
      role="status"
      className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-warning-bg px-3 text-tiny font-medium text-warning"
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      Test mode — statements only, no money is transferred
    </p>
  );
}

function StatusBadge({ status, utr }) {
  const done = status === 'completed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-tiny font-medium ${done ? 'bg-brand-50 text-brand-800' : 'bg-ink-100 text-ink-700'}`}
    >
      {done ? (
        <CircleCheck className="size-3.5" aria-hidden="true" />
      ) : (
        <Clock className="size-3.5" aria-hidden="true" />
      )}
      {done ? 'Recorded complete' : 'Recorded pending'}
      {done && utr ? <span className="break-all">· UTR {utr}</span> : null}
    </span>
  );
}

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-md bg-ink-25 p-3">
      <dt className="flex items-center gap-1.5 text-tiny text-ink-600">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-h4 font-semibold text-ink-900 tabular">{value}</dd>
    </div>
  );
}

/** room + GST to you − commission − GST on commission − TCS − TDS = net. */
function Breakdown({ t }) {
  const rows = [
    ['Room revenue kept', t.roomMinor],
    ['GST passed to you', t.gstToHotelMinor],
    ['Rentra commission', -t.commissionMinor],
    ['GST on commission (18%)', -t.commissionGstMinor],
    ['TCS 0.5%', -t.tcsMinor],
    ['TDS 0.1%', -t.tdsMinor],
  ];
  return (
    <dl className="mt-4 divide-y divide-border border-y border-border text-meta">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 py-2">
          <dt className="text-ink-600">{label}</dt>
          <dd className="tabular text-ink-800">
            {value < 0 ? inr(value) : `${value ? '+' : ''}${inr(value)}`}
          </dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 py-2 font-semibold">
        <dt className="text-ink-900">You receive</dt>
        <dd className="tabular text-ink-900">{inr(t.netMinor)}</dd>
      </div>
    </dl>
  );
}

function NextPayout({ next, environment }) {
  const held = next.lines.filter((line) => line.reason);
  const steps = [
    ['Paid by guests', `${next.lines.length} stays`, next.lines.length > 0],
    ['Accounting review', `${next.lines.length} lines`, false],
    ['Provider and funding gate', 'Unavailable', false],
    ['Settled with UTR', '—', false],
  ];
  return (
    <section className={card} aria-labelledby="next-payout-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="next-payout-title" className="text-h4 font-semibold text-ink-900">
          Accounting eligibility
        </h2>
        <Wallet className="size-5 text-ink-500" aria-hidden="true" />
      </div>
      <p className="mt-3 text-4xl leading-tight font-semibold tracking-[-0.03em] text-ink-900 tabular">
        {inr(next.netMinor)}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-ink-600">
        <CalendarCheck className="size-4" aria-hidden="true" />
        No bank settlement date promised
        {next.destination ? (
          <span className="flex items-center gap-1.5 break-all">
            <Landmark className="size-4 shrink-0" aria-hidden="true" />
            {next.destination}
          </span>
        ) : null}
      </p>
      {!next.destination ? (
        <Link
          href="/partner/settings/payout"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-4 text-meta font-semibold text-white hover:bg-brand-700"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          Add or verify payout method
        </Link>
      ) : null}
      {environment !== 'live' ? (
        <p className="mt-2 text-tiny text-warning">Test run: no money will be transferred.</p>
      ) : null}
      <ol className="mt-4 space-y-1" aria-label="Payout progress">
        {steps.map(([label, value, done]) => (
          <li
            key={label}
            className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 py-1 text-meta"
          >
            {done ? (
              <CircleCheck className="size-4 text-brand-700" role="img" aria-label="Done" />
            ) : (
              <Clock className="size-4 text-ink-400" role="img" aria-label="Pending" />
            )}
            <span className="text-ink-800">{label}</span>
            <span className="tabular text-ink-600">{value}</span>
          </li>
        ))}
      </ol>
      <Breakdown t={next} />
      {held.length ? (
        <div className="mt-4 rounded-md bg-warning-bg p-3 text-tiny text-warning">
          <p className="flex items-center gap-1.5 font-semibold">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            {held.length} {held.length === 1 ? 'stay' : 'stays'} on hold
          </p>
          <ul className="mt-1 space-y-1">
            {held.map((line) => (
              <li key={line.bookingId} className="break-words">
                {line.reference} · {line.hotel} · {inr(line.netMinor)} — {line.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default function HotelEarnings({ data }) {
  const s = data.summary;
  const nav =
    'inline-flex size-11 items-center justify-center rounded-full border border-border bg-card hover:bg-ink-50';
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 font-bold text-ink-900">Hotel earnings</h1>
          <p className="text-meta text-ink-600">
            Stays and accounting statements. Bank execution and funding readiness are unavailable.
          </p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-1">
          <Link
            href={`?month=${shiftMonth(data.month, -1)}`}
            className={nav}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
          <span className="min-w-32 text-center text-meta font-semibold" aria-live="polite">
            {monthLabel(data.month)}
          </span>
          <Link
            href={`?month=${shiftMonth(data.month, 1)}`}
            className={nav}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <TestModeBadge environment={data.environment} />
        {data.payoutMode && (
          <p className="text-meta">
            Effective payout mode: {data.payoutMode.mode} ({data.payoutMode.source}). Auto
            configuration sends no money.
          </p>
        )}
        <Link href="/partner/earnings/hotels/analytics" className={`${textLink} text-tiny`}>
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Hotel analytics
        </Link>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={card} aria-labelledby="month-title">
          <h2 id="month-title" className="text-h4 font-semibold text-ink-900">
            {monthLabel(data.month)}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile icon={Hotel} label="Stays" value={s.stays} />
            <Tile icon={BedDouble} label="Room nights" value={s.roomNights} />
            <Tile icon={Wallet} label="Room revenue" value={inr(s.roomMinor)} />
            <Tile icon={Receipt} label="GST from guests" value={inr(s.gstMinor)} />
            <Tile icon={Undo2} label="Refunds" value={inr(s.refundedMinor)} />
            <Tile icon={RotateCcw} label="Cancellations" value={s.cancelled} />
          </dl>
          <p className="mt-4 text-tiny leading-5 text-ink-500">
            GST collected from guests is passed to you in full when you are GST registered; you file
            it. Stays booked under the Rentra service fee (paid by guests) have no commission; older
            stays keep their commission plus 18% GST. TCS 0.5% and TDS 0.1% appear in your GST and
            Form 26AS records.
          </p>
        </section>
        <NextPayout next={data.nextPayout} environment={data.environment} />
      </div>
      <section className={card} aria-labelledby="statements-title">
        <h2 id="statements-title" className="text-h4 font-semibold text-ink-900">
          Payout statements
        </h2>
        {data.payouts.length ? (
          <ul className="mt-3 divide-y divide-border">
            {data.payouts.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/partner/earnings/hotels/${run.id}`}
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 hover:bg-ink-25"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-ink-900">
                      <FileText className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                      {run.runNumber}
                      <span className="font-normal text-ink-600">· {day(run.payoutDate)}</span>
                    </span>
                    <span className="mt-1 block text-tiny text-ink-500">
                      {run.stays} {run.stays === 1 ? 'stay' : 'stays'}
                      {run.environment !== 'live' ? ' · Test' : ''}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular">{inr(run.totals.netMinor)}</span>
                    <StatusBadge status={run.status} utr={null} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FileText}
            title="No payout statements yet"
            description="A statement appears after an authorized accounting run includes your stays. Test statements move no money."
          />
        )}
      </section>
    </section>
  );
}

const th = 'whitespace-nowrap px-3 py-2 text-tiny font-semibold text-ink-600';
const num = 'px-3 py-2 text-right tabular';

export function HotelStatement({ data }) {
  const t = data.totals;
  const cells = (row) => [
    row.roomMinor,
    row.gstToHotelMinor,
    -(row.commissionMinor + row.commissionGstMinor),
    -row.tcsMinor,
    -row.tdsMinor,
  ];
  return (
    <section className="owner-earnings owner-statement-print space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/partner/earnings/hotels" className={`${textLink} text-tiny print:hidden`}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Hotel earnings
          </Link>
          <h1 className="text-h1 font-bold text-ink-900">Payout statement {data.runNumber}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-ink-600">
            Payout {day(data.payoutDate, true)}
            <StatusBadge status={data.status} utr={data.utr} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link href={`/partner/earnings/hotels/${data.id}/invoice`} className={textLink}>
            <Receipt className="size-4" aria-hidden="true" />
            Commission invoice
          </Link>
          <PrintButton />
        </div>
      </header>
      <TestModeBadge environment={data.environment} />
      <div
        role="region"
        aria-label="Stays in this payout"
        tabIndex={0}
        className="owner-table min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card"
      >
        <table className="w-full min-w-[760px] border-collapse text-left text-meta">
          <caption className="sr-only">Stays in payout {data.runNumber}</caption>
          <thead className="bg-ink-25">
            <tr>
              <th scope="col" className={th}>
                Booking
              </th>
              <th scope="col" className={th}>
                Stay
              </th>
              {['Room kept', 'GST to you', 'Commission + GST', 'TCS', 'TDS', 'Net'].map((label) => (
                <th scope="col" key={label} className={`${th} text-right`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.lines.map((row) => (
              <tr key={row.bookingId}>
                <td className="px-3 py-2">
                  <span className="block font-semibold break-all">{row.reference}</span>
                  <span className="block text-tiny text-ink-500">{row.hotel}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {day(row.checkIn)} – {day(row.checkOut)}
                </td>
                {cells(row).map((value, i) => (
                  <td key={i} className={num}>
                    {inr(value)}
                  </td>
                ))}
                <td className={`${num} font-semibold`}>{inr(row.netMinor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border font-semibold">
            <tr>
              <th scope="row" colSpan={2} className="px-3 py-2 text-left">
                Total · {t.stays} {t.stays === 1 ? 'stay' : 'stays'}
              </th>
              {cells(t).map((value, i) => (
                <td key={i} className={num}>
                  {inr(value)}
                </td>
              ))}
              <td className={num}>{inr(t.netMinor)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-tiny leading-5 text-ink-500">
        Room kept is room revenue after refunds. GST to you is passed only to GST-registered hotels;
        otherwise Rentra pays it. TCS 0.5% applies to GST-registered hotels; TDS 0.1% to all.
      </p>
    </section>
  );
}

function Party({ title, rows }) {
  return (
    <div className="min-w-0">
      <h2 className="text-tiny font-semibold text-ink-500 uppercase">{title}</h2>
      <dl className="mt-1 space-y-0.5 text-meta">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="shrink-0 text-ink-500">{label}</dt>
            <dd className={`min-w-0 break-words ${value ? 'text-ink-900' : 'text-ink-500 italic'}`}>
              {value || 'Not configured'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function HotelInvoice({ data, runId }) {
  const total = data.lines.reduce((sum, line) => sum + line.totalMinor, 0);
  return (
    <section className="owner-earnings owner-statement-print space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/partner/earnings/hotels/${runId}`}
            className={`${textLink} text-tiny print:hidden`}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Payout statement
          </Link>
          <h1 className="text-h1 font-bold text-ink-900">Commission invoice</h1>
          <p className="mt-1 text-meta text-ink-600">
            {data.invoiceNumber ? `No. ${data.invoiceNumber} · ` : ''}
            {day(data.date, true)}
          </p>
        </div>
        <PrintButton />
      </header>
      {data.draft ? (
        <p
          role="note"
          className="flex items-start gap-2 rounded-md border border-warning bg-warning-bg p-3 text-meta font-semibold text-warning"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Draft — not a tax invoice. Rentra’s issuer details are not configured, or this is a test
          run.
        </p>
      ) : null}
      <div className={`${card} grid gap-5 sm:grid-cols-2`}>
        <Party
          title="From"
          rows={[
            ['Name', data.issuer?.name],
            ['GSTIN', data.issuer?.gstin],
            ['Address', data.issuer?.address],
          ]}
        />
        <Party
          title="To"
          rows={[
            ['Name', data.recipient?.name],
            ['GSTIN', data.recipient?.gstin],
            ['Hotels', data.recipient?.hotels?.join(', ')],
          ]}
        />
      </div>
      <div
        role="region"
        aria-label="Invoice lines"
        tabIndex={0}
        className="owner-table min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card"
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-meta">
          <caption className="sr-only">Invoice lines</caption>
          <thead className="bg-ink-25">
            <tr>
              <th scope="col" className={th}>
                Description
              </th>
              <th scope="col" className={th}>
                SAC
              </th>
              {['Stays', 'Taxable', 'CGST 9%', 'SGST 9%', 'Total'].map((label) => (
                <th scope="col" key={label} className={`${th} text-right`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.lines.map((line) => (
              <tr key={line.description}>
                <td className="px-3 py-2">{line.description}</td>
                <td className="px-3 py-2 tabular">{line.sac}</td>
                <td className={num}>{line.stays}</td>
                <td className={num}>{inr(line.taxableMinor)}</td>
                <td className={num}>{inr(line.cgstMinor)}</td>
                <td className={num}>{inr(line.sgstMinor)}</td>
                <td className={`${num} font-semibold`}>{inr(line.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border font-semibold">
            <tr>
              <th scope="row" colSpan={6} className="px-3 py-2 text-left">
                Invoice total
              </th>
              <td className={num}>{inr(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <dl className="grid max-w-sm gap-1 text-meta">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-600">TCS 0.5% collected (for your GST records)</dt>
          <dd className="tabular">{inr(data.tcsMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-600">TDS 0.1% deducted (Form 26AS)</dt>
          <dd className="tabular">{inr(data.tdsMinor)}</dd>
        </div>
      </dl>
    </section>
  );
}
