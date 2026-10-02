'use client';
import { useState } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { CreateCaseForm } from '@/components/booking/CaseForms';
export default function BookingHelp({ record }) {
  const [choice, setChoice] = useState('');
  const [open, setOpen] = useState(false);
  const [visit, setVisit] = useState(record.visits[0]?.id || '');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const support = `/partner/support/new?orderId=${encodeURIComponent(record.id)}`;
  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <button
        type="button"
        className="min-h-11 font-semibold underline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Get help with this booking
      </button>
      {open && (
        <>
          <label className="block">
            Visit
            <select
              className="min-h-11 block w-full rounded-lg border p-2"
              value={visit}
              onChange={(e) => {
                setVisit(e.target.value);
                setKey(crypto.randomUUID());
              }}
            >
              {record.visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reference} · {v.date}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            What do you need help with?
            <select
              className="min-h-11 block w-full rounded-lg border p-2"
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setKey(crypto.randomUUID());
              }}
            >
              <option value="">Choose a topic</option>
              <option value="no_show">The guest didn’t come</option>
              <option value="owner_cancellation">I need to cancel</option>
              <option value="damage">Damage or a problem during the visit</option>
              <option value="payment">Question about payment</option>
              <option value="other">Something else</option>
            </select>
          </label>
          {['no_show', 'owner_cancellation'].includes(choice) && (
            <CreateCaseForm
              key={`${choice}-${visit}`}
              orderId={record.id}
              visits={record.visits}
              requestKey={key}
              defaultType={choice}
              defaultVisitId={visit}
            />
          )}
          {choice === 'damage' && (
            <Link
              className="min-h-11 inline-flex items-center underline"
              href={`/partner/disputes/new?order=${record.id}&visit=${visit}`}
            >
              Record the problem or damage
            </Link>
          )}
          {['payment', 'other'].includes(choice) && (
            <Link
              className="min-h-11 inline-flex items-center underline"
              href={`${support}&category=${choice === 'payment' ? 'earnings' : 'other'}&visitId=${visit}`}
            >
              Contact Rentra about this booking
            </Link>
          )}
          <p className="text-sm">Sending a request does not change this booking or move money.</p>
        </>
      )}
    </section>
  );
}
