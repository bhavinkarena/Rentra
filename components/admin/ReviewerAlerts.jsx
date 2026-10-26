import Link from '@/components/navigation/NavigationLink';
import { adminDateTime } from '@/lib/domain/admin-display';
import { readReviewerAlert } from '@/lib/actions/admin';

const EMAIL = {
  pending: 'Email queued',
  retry: 'Email retrying',
  sending: 'Email sending',
  sent: 'Email sent',
  blocked: 'Email not configured',
  failed: 'Email failed',
};

/**
 * Stories 1.6/1.7: the signed-in reviewer's alerts — owner resubmissions and
 * unanswered corrections (day 7, 15, 30). Email trouble is shown, never hidden;
 * the alert stays here either way.
 */
export default function ReviewerAlerts({ alerts }) {
  const unread = alerts.filter((a) => !a.read);
  if (!unread.length) return null;
  return (
    <section
      aria-labelledby="reviewer-alerts-title"
      className="mt-6 rounded-lg border border-warning/40 bg-warning-bg p-4"
    >
      <h2 id="reviewer-alerts-title" className="text-h4 font-semibold">
        Your review alerts ({unread.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {unread.map((alert) => (
          <li
            key={alert.id}
            className="flex flex-wrap items-center justify-between gap-2 text-meta"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/properties/${alert.propertyId}`}
                className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {alert.title}
              </Link>
              <p className="text-ink-600">
                {adminDateTime(alert.createdAt)} · {EMAIL[alert.email.state] ?? alert.email.state}
                {alert.email.failure ? ` (${alert.email.failure})` : ''}
              </p>
            </div>
            <form action={readReviewerAlert}>
              <input type="hidden" name="alertId" value={alert.id} />
              <button
                type="submit"
                className="min-h-11 rounded-md border border-border bg-card px-3 font-semibold"
              >
                Mark read
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
