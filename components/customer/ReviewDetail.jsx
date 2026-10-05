import Link from '@/components/navigation/NavigationLink';
import { ReviewControl } from './ReviewForms';
import { adminDateTime as time } from '@/lib/domain/admin-display';
import { AdminPageHeader, AdminReadOnly } from '@/components/admin/AdminPrimitives';
const link = 'inline-flex min-h-11 items-center underline';
export default function ReviewDetail({
  record: r,
  admin = false,
  canWrite = true,
  capabilities = [],
  listHref,
}) {
  const base = admin ? '/admin' : '/partner';
  return (
    <article className="mx-auto max-w-4xl space-y-6 break-words p-4 sm:p-6">
      <Link className={link} href={listHref || `${base}/reviews`}>
        Back to reviews
      </Link>
      {admin && (
        <AdminPageHeader
          title={`Review of ${r.title}`}
          description="Apply the same publication rules to every score."
        />
      )}
      <header>
        {!admin && <h1 className="text-h1">Review of {r.title}</h1>}
        <p>
          {r.rating} out of 5 · {r.state} · {r.public ? 'Public' : 'Not public'}
        </p>
        <p>
          Property public rating: {r.ratingAverage ?? 'Not rated'} · {r.reviewCount} reviews
        </p>
      </header>
      <nav className="flex flex-wrap gap-5">
        {(!admin || capabilities.includes('admin.properties.read')) && (
          <Link
            className={link}
            href={`${base}/${admin ? 'properties' : 'listings'}/${r.propertyId}${admin ? '' : '/overview'}`}
          >
            Property detail
          </Link>
        )}
        {(!admin || capabilities.includes('admin.records.read')) && (
          <Link className={link} href={`${base}/bookings/${r.orderId}`}>
            Booking and visit evidence
          </Link>
        )}
        {admin && capabilities.includes('admin.customers.read') && (
          <Link className={link} href={`/admin/customers/${r.authorId}`}>
            Customer detail
          </Link>
        )}
      </nav>
      <section>
        <h2 className="text-h3">Original customer review</h2>
        <p>
          Visit {r.visitReference} · {r.visitDate}
        </p>
        <blockquote className="mt-3 whitespace-pre-wrap rounded-md border border-border p-4">
          {r.body}
        </blockquote>
        <p>
          Guest ratings and submitted text cannot be rewritten. Low scores and negative experiences
          alone are not policy violations.
        </p>
      </section>
      {r.ownerReply && (
        <section>
          <h2 className="text-h3">Current owner reply</h2>
          <p className="whitespace-pre-wrap">{r.ownerReply}</p>
        </section>
      )}
      {admin && r.moderationReason && <p>Latest reason shared with author: {r.moderationReason}</p>}
      {admin && !canWrite && <AdminReadOnly />}
      {canWrite && (admin || r.public) && (
        <section className="space-y-3 rounded-md border border-border p-4">
          <h2 className="text-h3">{admin ? 'Publication decision' : 'Public owner reply'}</h2>
          <ReviewControl
            key={r.version}
            kind={admin ? 'moderate' : 'reply'}
            id={r.id}
            version={r.version}
            body={admin ? '' : r.ownerReply || ''}
          />
        </section>
      )}
      {!admin && r.public && (
        <details>
          <summary className="min-h-11 cursor-pointer">Report a policy violation</summary>
          <p>A report does not hide the review or change its score.</p>
          <ReviewControl kind="ownerReport" id={r.id} />
        </details>
      )}
      <section className="space-y-4">
        <h2 className="text-h3">{admin ? 'Reports and resolution' : 'Your reports'}</h2>
        {!r.reports.length && <p>No reports in this view.</p>}
        {r.reports.map((report) => (
          <article
            id={`report-${report.id}`}
            key={report.id}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <p>
              {report.state} · {time(report.created_at)}
            </p>
            <p className="whitespace-pre-wrap">{report.reason}</p>
            {report.resolution && <p>Resolution: {report.resolution}</p>}
            {admin && canWrite && report.state === 'open' && (
              <>
                <p>
                  Closing this report does not change publication. Use the separate moderation
                  decision if a policy violation warrants removal.
                </p>
                <ReviewControl kind="resolve" id={report.id} />
              </>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-h3">
          {admin ? 'Moderation and response history' : 'Your response history'}
        </h2>
        <p>
          Earlier content is preserved. Changes predating this history may have no recorded text.
        </p>
        {!r.history.length && <p>No recorded changes yet.</p>}
        <ol className="space-y-4">
          {r.history.map((h, i) => (
            <li key={i} className="rounded-md border border-border p-4">
              <p>
                {h.action.replaceAll('_', ' ')} · {time(h.at)}
              </p>
              {h.before?.body && (
                <p className="whitespace-pre-wrap">Previous reply: {h.before.body}</p>
              )}
              {h.after?.body && <p className="whitespace-pre-wrap">Saved reply: {h.after.body}</p>}
              {h.after?.state && (
                <p>
                  {h.before?.state || 'Earlier state not recorded'} → {h.after.state} ·{' '}
                  {h.after.category?.replaceAll('_', ' ')}
                </p>
              )}
              {h.after?.reason && <p>{h.after.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
