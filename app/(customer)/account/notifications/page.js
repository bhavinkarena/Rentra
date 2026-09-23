import Link from 'next/link';
import { customerApi } from '@/lib/api/endpoints';
import { readNotification } from '@/lib/actions/customer';
export const metadata = { title: 'Booking updates', robots: { index: false, follow: false } };
export default async function NotificationsPage() {
  const updates = await customerApi.notifications();
  return (
    <section className="space-y-5">
      <h1 className="text-h1">Booking updates</h1>
      <p>Your latest 50 booking updates stay here even if SMS delivery is unavailable.</p>
      <ul className="space-y-4">
        {updates.map((n) => (
          <li key={n.id} className="rounded-lg border border-border p-4">
            <h2 className="font-semibold">
              {n.title}
              {n.simulation ? ' · Test / simulation' : ''}
            </h2>
            <p className="break-all text-meta">{n.reference}</p>
            <p className="text-meta">
              SMS:{' '}
              {n.delivery === 'accepted'
                ? 'accepted by provider; delivery not confirmed'
                : n.delivery}
            </p>
            <Link
              className="inline-flex min-h-11 items-center text-brand-700 underline"
              href={`/bookings/${n.orderId}`}
            >
              Open booking record
            </Link>
            {!n.read ? (
              <form action={readNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button className="min-h-11 underline">Mark as read</button>
              </form>
            ) : (
              <p className="text-meta">Read</p>
            )}
          </li>
        ))}
      </ul>
      {!updates.length ? <p>No booking updates yet.</p> : null}
    </section>
  );
}
