import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { ClipboardList, MessageSquareText } from 'lucide-react';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { CaseMessageForm, CreateCaseForm } from './CaseForms';

const chip = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
const AUDIENCE = {
  internal: 'Internal',
  client: 'Owner',
  customer: 'Customer',
  everyone: 'Everyone',
};

export function CaseState({ item }) {
  return item.state === 'open' ? (
    <span className={`${chip} bg-amber-100 text-amber-800`}>Open</span>
  ) : (
    <span className={`${chip} bg-ink-50 text-ink-700`}>{item.outcomeLabel ?? 'Resolved'}</span>
  );
}

export function CaseUpdates({ updates, timeZone, showAudience = false }) {
  if (!updates?.length) return null;
  return (
    <ol className="space-y-2 border-l-2 border-border pl-3 text-meta">
      {updates.map((update) => (
        <li key={update.id}>
          <p className="text-ink-600">
            {update.author} · {time(update.at, timeZone)}
            {showAudience ? (
              <span className={`${chip} ml-2 bg-info-bg text-ink-800`}>
                {AUDIENCE[update.audience]}
              </span>
            ) : null}
          </p>
          <p className="break-words">{update.body}</p>
        </li>
      ))}
    </ol>
  );
}

const operationalVisits = (record) =>
  record.visits.map((v) => ({
    id: v.id,
    reference: v.reference,
    date: v.date,
    slot: v.slot,
    state: v.state,
  }));

/** Owner booking detail: requests to Rentra and what Rentra has shared back. */
export function OwnerCases({ record }) {
  const cases = record.cases ?? [];
  return (
    <section
      id="requests"
      aria-labelledby="requests-heading"
      className="scroll-mt-24 space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:col-span-2"
    >
      <h2 id="requests-heading" className="flex items-center gap-2 text-h3">
        <ClipboardList className="size-5 text-brand-700" aria-hidden="true" />
        Requests to Rentra
      </h2>
      {cases.length ? (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id} className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{item.reference}</strong>
                <CaseState item={item} />
                <span className="text-meta">{item.typeLabel}</span>
              </div>
              <p className="text-meta text-ink-600">
                {item.visitIds.length} visit{item.visitIds.length === 1 ? '' : 's'} · opened{' '}
                {time(item.createdAt, record.timeZone)}
              </p>
              <CaseUpdates updates={item.updates} timeZone={record.timeZone} />
              {item.state === 'open' && item.requestedByYou ? (
                <CaseMessageForm
                  key={`${item.id}-${item.updates.length}`}
                  caseId={item.id}
                  requestKey={randomUUID()}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-ink-600">No requests yet.</p>
      )}
      <CreateCaseForm
        key={`new-${cases.length}`}
        orderId={record.id}
        visits={operationalVisits(record)}
        requestKey={randomUUID()}
      />
    </section>
  );
}

/** Customer booking detail: only updates Rentra chose to share with the customer. */
export function CustomerCaseUpdates({ record }) {
  const cases = record.cases ?? [];
  if (!cases.length) return null;
  return (
    <section
      aria-labelledby="rentra-updates-heading"
      className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:col-span-2"
    >
      <h2 id="rentra-updates-heading" className="flex items-center gap-2 text-h3">
        <MessageSquareText className="size-5 text-brand-700" aria-hidden="true" />
        Updates from Rentra
      </h2>
      {cases.map((item) => (
        <div key={item.reference} className="space-y-2">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {item.reference}
            <CaseState item={item} />
          </p>
          <CaseUpdates updates={item.updates} timeZone={record.timeZone} />
        </div>
      ))}
    </section>
  );
}

/** Admin booking detail tab: this booking's cases and a way to open one. */
export function AdminOrderCases({ record }) {
  const cases = record.cases ?? [];
  return (
    <div className="space-y-4 p-5">
      {cases.length ? (
        <ul className="space-y-2">
          {cases.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-meta"
            >
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/booking-cases/${item.id}`}
                  className="min-h-11 content-center font-semibold underline"
                >
                  {item.reference}
                </Link>
                <CaseState item={item} />
                {item.typeLabel} · {item.visitIds.length} visit
                {item.visitIds.length === 1 ? '' : 's'}
              </span>
              <span className="text-ink-600">
                {item.assigneeName ? `Assigned to ${item.assigneeName}` : 'Unassigned'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-ink-600">No cases on this booking.</p>
      )}
      <CreateCaseForm
        key={`new-${cases.length}`}
        orderId={record.id}
        visits={operationalVisits(record)}
        requestKey={randomUUID()}
        admin
      />
    </div>
  );
}
