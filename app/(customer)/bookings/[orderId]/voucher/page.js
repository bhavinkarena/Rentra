import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { MEAL_LABELS } from '@/lib/domain/hotel-ui';
import { moneyEnvironmentLabel } from '@/lib/domain/owner-earnings';
import { BackLink } from '@/components/ui/page-header';
import PrintButton from '@/components/partner/earnings/PrintButton';
import { displayMoney as money, totalPrice } from '@/components/customer/BookingDisplay';

export const metadata = { title: 'Booking voucher', robots: { index: false, follow: false } };

const rule = (plan = {}) =>
  plan.freeCancelHours == null
    ? 'Non-refundable.'
    : `Free cancellation until ${plan.freeCancelHours} hours before check-in; after that ${plan.lateCharge === 'full_stay' ? 'the whole stay' : 'the first night'} is charged.`;

/** One printable page for the front desk (hotel plan): not a tax invoice. */
export default async function VoucherPage({ params }) {
  const record = await customerApi.record((await params).orderId);
  const stay = record.stay;
  if (!stay) notFound();
  const visit = record.visits[0] ?? {};
  const rooms = stay.rooms.filter((room) => !['released', 'no_show'].includes(room.state));
  const d = stay.details ?? {};
  // Capture plus simulation, net of refunds; null (Not recorded) when nothing was collected.
  const collected = record.payments.filter(
    (p) => p.capturedMinor != null || p.simulatedMinor != null,
  );
  const paid = collected.length
    ? collected.reduce(
        (sum, p) => sum + (p.capturedMinor ?? 0) + (p.simulatedMinor ?? 0) - (p.refundedMinor ?? 0),
        0,
      )
    : null;
  const paidLabel = [...new Set(collected.map((p) => moneyEnvironmentLabel(p.environment)))]
    .filter(Boolean)
    .join(', ');
  const cell = 'border-b border-border py-2 pr-3 align-top';
  return (
    <article className="voucher-print mx-auto max-w-3xl space-y-6 text-meta wrap-break-word">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink href={`/bookings/${record.id}`}>Back to booking</BackLink>
        <PrintButton />
      </div>
      <header className="border-b-2 border-ink-900 pb-4">
        <p className="text-tiny font-semibold tracking-wide text-ink-600 uppercase">
          Booking voucher · not a tax invoice
        </p>
        <h1 className="mt-1 text-h2">{record.title}</h1>
        <p className="mt-1 font-mono">Reference {record.reference}</p>
        {record.arrival?.address || record.arrival?.hostPhone ? (
          <p className="mt-2 text-ink-700">
            {[record.arrival.address, record.arrival.hostPhone].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </header>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-ink-600">Check-in</dt>
          <dd className="font-semibold">{time(visit.startsAt, record.timeZone)}</dd>
        </div>
        <div>
          <dt className="text-ink-600">Check-out</dt>
          <dd className="font-semibold">{time(visit.endsAt, record.timeZone)}</dd>
        </div>
        <div>
          <dt className="text-ink-600">Stay</dt>
          <dd className="font-semibold">
            {stay.nights} night{stay.nights === 1 ? '' : 's'} · {rooms.length} room
            {rooms.length === 1 ? '' : 's'}
          </dd>
        </div>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left">
          <thead className="text-tiny text-ink-600">
            <tr>
              <th className={cell}>Room and rate</th>
              <th className={cell}>Guest</th>
              <th className={`${cell} text-right`}>Price</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className={cell}>
                  <span className="font-semibold">{room.name}</span>
                  <span className="block text-ink-600">
                    {[room.plan?.name, MEAL_LABELS[room.plan?.mealPlan]]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="block text-tiny text-ink-600">{rule(room.plan)}</span>
                </td>
                <td className={cell}>
                  {room.guestName || 'Guest'}
                  <span className="block text-ink-600">
                    {room.adults} adult{room.adults === 1 ? '' : 's'}
                    {room.childAges?.length ? ` · children aged ${room.childAges.join(', ')}` : ''}
                  </span>
                </td>
                <td className={`${cell} text-right tabular`}>
                  {money(room.roomMinor + room.taxMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto max-w-xs space-y-1 tabular">
        {[
          ['Rooms', stay.roomMinor],
          ['Taxes', stay.taxMinor],
          ['Booking total', totalPrice(record)],
          [paidLabel ? `Paid (${paidLabel})` : 'Paid', paid],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`flex justify-between gap-4 ${index > 1 ? 'font-semibold' : ''}`}
          >
            <dt>{label}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
      </dl>
      {d.arrivalTime || d.requests || d.gstin ? (
        <div className="space-y-1 border-t border-border pt-3">
          {d.arrivalTime ? <p>Expected arrival: {d.arrivalTime}</p> : null}
          {d.requests ? <p>Requests: {d.requests}</p> : null}
          {d.gstin ? (
            <p>
              GST invoice to: {d.businessName} · GSTIN {d.gstin} (the hotel issues the tax invoice)
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="border-t border-border pt-3 text-tiny text-ink-600">
        Show this voucher and a photo ID at check-in. It confirms the booking above and is not a tax
        invoice. Times are in {record.timeZone}.
      </p>
    </article>
  );
}
