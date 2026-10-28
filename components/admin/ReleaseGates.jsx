import { CircleAlert, CircleCheck, OctagonX } from 'lucide-react';
import { formatINRMinor } from '@/lib/domain/booking-money';

const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : 'never';

/** Story 2.21: read-only. Nothing here can mark a gate passed. */
export default function ReleaseGates({ data }) {
  const ready = data.overall === 'ready';
  const f = data.facts;
  const o = f.unresolvedOutcomes;
  const facts = [
    ['Payment gateway environment', f.gatewayEnvironment ?? 'none', 'Test only'],
    ['Funding allocations recorded', String(f.fundingAllocations), 'Expected none'],
    ['Global payout mode', f.payoutMode, null],
    [
      'Unknown or needs review',
      `${o.refunds} refunds · ${o.payouts} payout fixtures · ${o.repayments} repayments`,
      null,
    ],
    ...f.workerHealth.map((w) => [
      `Worker heartbeat: ${w.service}`,
      `${w.healthy ? 'healthy' : 'unhealthy'} · checked ${when(w.checkedAt)}`,
      `last success ${when(w.lastSuccessAt)}`,
    ]),
    [
      'New money initiation',
      f.initiationDisabled ? 'Disabled (kill switch on)' : 'Enabled',
      'FINANCE_INITIATION_DISABLED',
    ],
  ];
  if (!f.workerHealth.length) facts.splice(4, 0, ['Worker heartbeat', 'none recorded', null]);
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1 font-semibold">Financial release gates</h1>
        <p className="mt-2 text-meta">
          Read only. Gates are defined in code and pass only with external evidence.
        </p>
      </header>
      <p
        role="status"
        className={`flex items-center gap-2 rounded-lg border p-4 font-semibold ${ready ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10 text-danger'}`}
      >
        {ready ? (
          <CircleCheck className="size-5" aria-hidden="true" />
        ) : (
          <OctagonX className="size-5" aria-hidden="true" />
        )}
        {data.overallLabel}
      </p>
      <p className="text-meta">
        Proposed exposure {formatINRMinor(Number(data.proposal.amountMinor))}: {data.proposal.label}
        .
      </p>
      <section aria-labelledby="gates" className="space-y-3">
        <h2 id="gates" className="text-h3 font-semibold">
          Gates
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.gates.map((g) => (
            <li key={g.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{g.name}</h3>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded px-2 text-meta ${g.status === 'passed' ? 'bg-success/10' : 'bg-danger/10 text-danger'}`}
                >
                  {g.status !== 'passed' && <CircleAlert className="size-3.5" aria-hidden="true" />}
                  {g.status}
                </span>
              </div>
              <p className="mt-1 text-meta text-ink-600">Owner: {g.owner}</p>
              <p className="mt-2 text-meta">{g.blocker}</p>
              {g.evidence.length > 0 && (
                <ul className="mt-2 text-meta text-ink-600">
                  {g.evidence.map((e) => (
                    <li key={e} className="break-all">
                      Evidence: <code>{e}</code>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="facts" className="rounded-lg border border-border bg-card">
        <h2 id="facts" className="border-b border-border px-4 py-3 text-h3 font-semibold">
          Live facts
        </h2>
        <dl className="divide-y divide-border">
          {facts.map(([label, value, note]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
              <dt className="text-meta text-ink-600">{label}</dt>
              <dd className="text-meta font-semibold sm:col-span-2">
                {value}
                {note && <span className="ml-2 font-normal text-ink-600">({note})</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
