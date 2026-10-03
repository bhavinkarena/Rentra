import Link from '@/components/navigation/NavigationLink';
import { randomUUID } from 'node:crypto';
import { BackLink } from '@/components/ui/page-header';
import { ownerSupportCategories, ownerSupportStates } from '@/lib/domain/help';
import { RequestStatus, supportTime } from './RequestInbox';
import SupportForm from './SupportForm';
const link = 'inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline';
export default function RequestThread({ record }) {
  const context = record.context || {};
  return (
    <article className="wrap-break-word">
      <BackLink href="/partner/support">My requests</BackLink>
      <header className="mt-4">
        <h1 className="max-w-[35ch] text-h1 font-bold tracking-[-0.03em]">{record.subject}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RequestStatus state={record.state} />
          <p className="text-meta text-ink-600">{record.reference}</p>
        </div>
      </header>
      <div className="mt-8 grid gap-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div className="min-w-0">
          <section aria-labelledby="conversation-title">
            <h2 id="conversation-title" className="text-h3 font-semibold">
              Conversation
            </h2>
            <p className="mt-2 text-tiny leading-5 text-ink-500">
              Private to your owner account and Rentra support. This is not live chat.
            </p>
            <ol className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {record.messages.map((m) => (
                <li key={m.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-meta font-semibold">{m.author}</h3>
                    <time dateTime={m.at} className="text-tiny text-ink-500">
                      {supportTime(m.at)} IST
                    </time>
                  </div>
                  <p className="mt-1 text-tiny text-ink-500">
                    {ownerSupportStates[m.state] || m.state}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink-700">
                    {m.body}
                  </p>
                  {(m.attachments || []).map((photo, i) => (
                    <a
                      key={photo.id}
                      className={`${link} mr-4 text-meta`}
                      href={`/partner/support/${record.id}/attachments/${photo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Private photo {i + 1}
                    </a>
                  ))}
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-9">
            <h2 className="mb-5 text-h3 font-semibold">
              {record.state === 'resolved' ? 'Reply or reopen this request' : 'Add a reply'}
            </h2>
            <SupportForm
              key={record.version}
              record={{ id: record.id, version: record.version }}
              requestKey={randomUUID()}
            />
          </section>
        </div>
        <aside
          aria-label="Request details"
          className="min-w-0 lg:border-l lg:border-border lg:pl-8"
        >
          <details open className="border-t border-border pt-5 lg:border-t-0 lg:pt-0">
            <summary className="min-h-11 cursor-pointer text-meta font-semibold">
              Request details
            </summary>
            <div className="flex flex-col items-start gap-4 text-meta leading-6 text-ink-600">
              <p>
                {ownerSupportCategories[record.category] || record.category}
                <br />
                Created {supportTime(record.createdAt)} IST
              </p>
              {record.orderId && (
                <div>
                  <Link className={link} href={`/partner/bookings/${record.orderId}`}>
                    {context.reference} / {context.title}
                  </Link>
                  <p>
                    Accepted booking policy: {context.bookingPolicyVersion}
                    <br />
                    {context.cancellationTier || 'Tier not recorded'} / {context.timeZone}
                  </p>
                  <p className="mt-2">
                    Your booking remains unchanged by this conversation. Check its booking record
                    for the current status.
                  </p>
                </div>
              )}
              {context.visitReference && (
                <p>
                  Visit {context.visitReference}
                  <br />
                  {context.visitDate} / {context.slot?.replaceAll('_', ' ')}
                </p>
              )}
              {record.propertyId && (
                <Link className={link} href={`/partner/listings/${record.propertyId}`}>
                  Property: {context.propertyTitle}
                </Link>
              )}
              {record.privacy && (
                <div>
                  <Link className={link} href="/account/privacy">
                    Linked privacy request
                  </Link>
                  <p>
                    {record.privacy.kind === 'access' ? 'Account data copy' : 'Account deletion'} /{' '}
                    {record.privacy.state.replaceAll('_', ' ')}
                  </p>
                  <p>This status is separate from the support conversation.</p>
                </div>
              )}
              <Link className={link} href={`/policies/terms/${record.policyVersion}`}>
                Service terms at request creation
              </Link>
              <p>Other cases linked by admins keep their own private conversations.</p>
            </div>
          </details>
        </aside>
      </div>
    </article>
  );
}
