import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  CircleDollarSign,
  Search,
} from 'lucide-react';

const TABS = [
  { value: 'all', label: 'All bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

function queryHref(data, changes) {
  const params = new URLSearchParams({
    tab: data.tab,
    q: data.q,
    page: String(data.page),
    ...changes,
  });
  return `/admin/bookings?${params}`;
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function label(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}

function bookingTone(state) {
  if (['confirmed', 'completed'].includes(state)) return 'bg-brand-50 text-brand-800 ring-brand-100';
  if (['cancelled', 'expired', 'failed'].includes(state)) return 'bg-danger-bg text-danger ring-danger/10';
  return 'bg-warning-bg text-amber-800 ring-warning/15';
}

function paymentSummary(payments) {
  if (!payments.length) return { text: 'No payment', tone: 'text-ink-500', dot: 'bg-ink-300' };
  if (payments.some((payment) => ['captured', 'paid', 'succeeded'].includes(payment.state))) {
    return { text: 'Paid', tone: 'text-brand-800', dot: 'bg-success' };
  }
  if (payments.some((payment) => ['failed', 'cancelled'].includes(payment.state))) {
    return { text: 'Failed', tone: 'text-danger', dot: 'bg-danger' };
  }
  return { text: label(payments[0].state), tone: 'text-amber-800', dot: 'bg-warning' };
}

export default function AdminBookingHistory({ data }) {
  const summary = data.summary || {
    total: data.tab === 'all' ? data.total : 0,
    upcoming: data.tab === 'upcoming' ? data.total : 0,
    past: data.tab === 'past' ? data.total : 0,
    cancelled: data.tab === 'cancelled' ? data.total : 0,
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <p className="text-[0.68rem] font-bold tracking-[0.12em] text-brand-700 uppercase">Booking operations</p>
        <h1 className="mt-1 text-h1 text-ink-900">Booking records</h1>
        <p className="mt-2 max-w-2xl text-meta leading-6 text-ink-600">
          Monitor every booking, payment state, and visit lifecycle from one operational view.
        </p>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Booking summary">
        <KpiCard label="Total bookings" value={summary.total} hint="All booking records" icon={CalendarCheck2} />
        <KpiCard label="Upcoming" value={summary.upcoming} hint="Confirmed future visits" icon={CalendarClock} tone="brand" />
        <KpiCard label="Past" value={summary.past} hint="Visits already completed" icon={CircleDollarSign} />
        <KpiCard label="Cancelled" value={summary.cancelled} hint="Cancelled or expired" icon={CalendarX2} tone={summary.cancelled ? 'danger' : 'neutral'} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-h4 font-bold text-ink-900">All booking records</h2>
              <p className="mt-0.5 text-tiny text-ink-500">Search by property name or booking reference</p>
            </div>
            <form action="/admin/bookings" className="flex w-full max-w-xl gap-2">
              <input type="hidden" name="tab" value={data.tab} />
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search property or booking reference</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                  className="min-h-11 w-full rounded-md border border-border bg-white pr-3 pl-10 text-meta text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  name="q"
                  maxLength={100}
                  defaultValue={data.q}
                  placeholder="Search bookings..."
                />
              </label>
              <button className="min-h-11 rounded-md bg-brand-700 px-4 text-meta font-semibold text-white transition hover:bg-brand-800">Search</button>
            </form>
          </div>

          <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Booking filters">
            {TABS.map((tab) => {
              const active = data.tab === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={queryHref(data, { tab: tab.value, page: '1' })}
                  aria-current={active ? 'page' : undefined}
                  className={`relative shrink-0 px-3 pb-3 text-tiny font-semibold transition-colors ${active ? 'text-brand-800' : 'text-ink-500 hover:text-ink-900'}`}
                >
                  {tab.label}
                  {active ? <span className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-brand-700" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-ink-25 text-[0.65rem] font-bold tracking-[0.08em] text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Property and reference</th>
                  <th className="px-4 py-3">Booked on</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Booking status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-5 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item) => <BookingRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink-50 text-ink-500 ring-1 ring-border">
              <CalendarCheck2 className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-h4 font-bold text-ink-900">No bookings found</h3>
            <p className="mt-1 text-meta text-ink-500">Try another status or clear your search terms.</p>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-tiny text-ink-500 sm:px-5">
          <p><span className="font-semibold text-ink-800">{data.total}</span> booking{data.total === 1 ? '' : 's'} · Page {data.page} of {data.pages}</p>
          <nav className="flex items-center gap-2" aria-label="Booking pages">
            {data.page > 1 ? (
              <Link href={queryHref(data, { page: String(data.page - 1) })} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 font-semibold text-ink-700 hover:bg-ink-50">
                <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
              </Link>
            ) : null}
            {data.page < data.pages ? (
              <Link href={queryHref(data, { page: String(data.page + 1) })} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 font-semibold text-ink-700 hover:bg-ink-50">
                Next <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        </footer>
      </section>
    </div>
  );
}

function BookingRow({ item }) {
  const payment = paymentSummary(item.payments);

  return (
    <tr className="group transition-colors hover:bg-ink-25/80">
      <td className="px-5 py-4">
        <p className="max-w-[300px] truncate text-meta font-semibold text-ink-900">{item.title}</p>
        <p className="mt-1 font-mono text-[0.68rem] text-ink-500">{item.reference}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-tiny text-ink-600">{formatDate(item.createdAt)}</td>
      <td className="px-4 py-4">
        <p className="text-tiny font-semibold text-ink-800">{item.visitCount} visit{item.visitCount === 1 ? '' : 's'}</p>
        <p className="mt-1 max-w-[180px] truncate text-[0.68rem] capitalize text-ink-500">{item.visitStates.map(label).join(', ') || 'No visits recorded'}</p>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold capitalize ring-1 ${bookingTone(item.state)}`}>{label(item.state)}</span>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 text-tiny font-semibold capitalize ${payment.tone}`}>
          <span className={`size-1.5 rounded-full ${payment.dot}`} aria-hidden="true" /> {payment.text}
        </span>
        {item.payments.some((entry) => entry.environment === 'test') ? <p className="mt-1 text-[0.65rem] font-semibold text-amber-700">Test gateway</p> : null}
      </td>
      <td className="px-5 py-4 text-right">
        <Link href={`/admin/bookings/${item.id}`} className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition hover:bg-brand-50 hover:text-brand-700" aria-label={`Open booking ${item.reference}`}>
          <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function KpiCard({ label: title, value, hint, icon: Icon, tone = 'neutral' }) {
  const styles = {
    neutral: 'border-border bg-card text-ink-600',
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    danger: 'border-danger/25 bg-danger-bg text-danger',
  };

  return (
    <article className={`rounded-lg border p-4 shadow-xs sm:p-5 ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-tiny font-semibold text-ink-500">{title}</p>
          <p className="mt-1 text-[1.75rem] leading-none font-extrabold text-ink-900 tabular">{value}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-md bg-white/70 ring-1 ring-current/10"><Icon className="size-[18px]" aria-hidden="true" /></span>
      </div>
      <p className="mt-3 hidden text-[0.68rem] leading-4 text-ink-500 sm:block">{hint}</p>
    </article>
  );
}
