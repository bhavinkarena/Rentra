'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome } from '@/components/booking/EvidenceForms';
import {
  previewIncidentRemedy,
  decideIncidentRemedy,
  executeIncidentAward,
  createIncidentRepaymentLink,
  checkIncidentRepaymentLink,
  resolveIncidentRepaymentLink,
} from '@/lib/actions/admin';
import { bookingMoney as money } from '@/lib/domain/booking-record';
import { adminDateTime as time } from '@/lib/domain/admin-display';

export const REMEDY_TEST_LABEL =
  'Test mode — saving moves no money; only Execute award (Test) queues a refund';
export const OWNER_FUNDED_LABEL = 'Owner-funded fee treatment is a projection pending owner terms';
const RESPONSIBILITY = { proportional: 'Proportional', owner_funded: 'Owner-funded' };
const field = `${fieldClass} mt-1 block min-h-11`;
const radio = 'flex min-h-11 items-center gap-2 text-meta';
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function Line({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <dt className="text-ink-600">{label}</dt>
      <dd className={`text-right tabular ${strong ? 'font-bold' : 'font-semibold'}`}>{value}</dd>
    </div>
  );
}

/** The remedy preview lines, in the order the spec lists them. */
export function RemedyLines({ plan }) {
  const paid = plan.paidByComponent;
  return (
    <dl className="divide-y divide-border text-meta">
      <Line
        label="Paid for chosen visits (verified)"
        value={`${money(plan.paidMinor)} · rent ${money(paid.rent)} · fee ${money(paid.fee)} · tax ${money(paid.tax)}`}
      />
      <Line label="Earlier refunds (verified)" value={money(plan.priorRefundedMinor)} />
      <Line label="Refunds in flight (counted)" value={money(plan.inFlightMinor)} />
      <Line
        label="Case and dispute reimbursements"
        value={plan.caseReimbursedMinor > 0 ? money(plan.caseReimbursedMinor) : 'none recorded'}
      />
      <Line label={`Cumulative target (${plan.targetPct}%)`} value={money(plan.targetMinor)} />
      <Line label="Additional guest refund due" value={money(plan.additionalDueMinor)} strong />
      <Line
        label="Provider call"
        value={plan.providerCall ? 'Yes, at execution' : 'None (nothing due)'}
      />
      <Line
        label={`${RESPONSIBILITY[plan.responsibility]}: total owner responsibility`}
        value={money(plan.owner.totalMinor)}
      />
      <Line label="Total Rentra responsibility" value={money(plan.rentra.totalMinor)} />
      <Line label="Tax refunded — treatment pending accounting" value={money(plan.taxMinor)} />
      <Line label="Increase for owner" value={money(plan.owner.increaseMinor)} />
      <Line
        label="Reassigned from Rentra's earlier share"
        value={money(plan.reassignedFromRentraMinor)}
      />
      {plan.owner.exceedsProceedsMinor > 0 && plan.responsibility === 'owner_funded' ? (
        <Line
          label="Owner liability exceeds original proceeds by"
          value={money(plan.owner.exceedsProceedsMinor)}
        />
      ) : null}
      <Line
        label="Payout state"
        value={plan.payoutStates.map((p) => p.state.replaceAll('_', ' ')).join(', ')}
      />
      <Line
        label="Projected owner recovery (projection)"
        value={money(plan.projectedRecoveryMinor)}
      />
    </dl>
  );
}

/** Read-only summary of the active decision, for every admin who can read the case. */
export function RemedyDecisionSummary({ decision }) {
  if (!decision) return <p className="text-meta text-ink-600">No remedy decision recorded.</p>;
  return (
    <div className="space-y-2 text-meta">
      <p className="font-semibold">
        {decision.kind === 'deny'
          ? 'Declined'
          : `Award ${decision.targetPct}% · ${RESPONSIBILITY[decision.responsibility]}`}{' '}
        · {time(decision.createdAt)}
      </p>
      <p className="whitespace-pre-wrap">{decision.reason}</p>
      {decision.preview ? (
        <p>
          Additional due {money(decision.preview.additionalDueMinor)} · reassigned{' '}
          {money(decision.preview.reassignedFromRentraMinor)}
        </p>
      ) : null}
    </div>
  );
}

const REFUND_STATUS = {
  queued: 'Queued',
  sent: 'Sent to provider',
  verified: 'Verified',
  failed: 'Failed',
  unknown: 'Outcome unknown — check',
  needs_review: 'Needs review',
};
// 'cancelled' is reserved in the schema; no cancel path exists yet, so it is not labelled here.
const OBLIGATION_STATE = { awaiting_payout: 'Awaiting owner payout', due: 'Due', repaid: 'Repaid' };
const LINK_STATE = {
  open: 'Open — waiting for owner payment',
  paid: 'Paid (verified)',
  replaced: 'Closed',
  needs_review: 'Needs review',
};
const FIELD = {
  decisionId: 'Decision',
  digest: 'Preview',
  requestKey: 'Request',
  reason: 'Reason',
};

function Problems({ state }) {
  return (
    <>
      {Object.entries(state.errors ?? {}).map(([name, message]) => (
        <p key={name} role="alert" className="text-tiny text-danger">
          {FIELD[name] ?? name}: {[].concat(message).join(' ')}
        </p>
      ))}
      {state.error ? (
        <p role="alert" className="text-meta font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </>
  );
}

/** Repayment link controls for an incident obligation: create when due, re-check or close in review. */
function ObligationLink({ caseId, ob }) {
  const router = useRouter();
  const [state, setState] = useState({});
  const [reason, setReason] = useState('');
  const [requestKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const link = state.link ?? ob.link;
  const send = (action, extra = {}) =>
    start(async () => {
      const data = new FormData();
      data.set('id', caseId);
      data.set('obligationId', ob.id);
      for (const [k, v] of Object.entries(extra)) data.set(k, v);
      const result = await action(data);
      setState(result);
      if (!result.error && !result.errors) router.refresh();
    });
  const outline = `${buttonVariants({ variant: 'outline', size: 'default' })} min-h-11`;
  return (
    <div className="space-y-2">
      {link ? (
        <p className="text-tiny">
          Repayment link: {LINK_STATE[link.state] ?? 'Unknown'} · {money(link.amountMinor)}
        </p>
      ) : null}
      {ob.state === 'due' && (!link || link.state === 'replaced') ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => send(createIncidentRepaymentLink, { requestKey })}
          className={outline}
        >
          {pending ? <RentraLoader label="Creating…" /> : 'Create repayment link'}
        </button>
      ) : null}
      {link && ['open', 'needs_review'].includes(link.state) ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => send(checkIncidentRepaymentLink)}
          className={outline}
        >
          Re-check provider (Test)
        </button>
      ) : null}
      {link?.state === 'needs_review' ? (
        <div className="space-y-2">
          <label className="block text-meta font-semibold">
            Reason for closing the link under review
            <textarea
              minLength={10}
              maxLength={500}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={field}
            />
          </label>
          <button
            type="button"
            disabled={pending || reason.trim().length < 10}
            onClick={() => send(resolveIncidentRepaymentLink, { linkId: link.id, reason })}
            className={outline}
          >
            Close link under review
          </button>
        </div>
      ) : null}
      <Problems state={state} />
    </div>
  );
}

/** Refund and owner-obligation rows of an executed award, each with its own status. */
function ExecutionRows({ caseId, execution }) {
  const ob = execution.obligation;
  return (
    <div className="space-y-2">
      <dl className="divide-y divide-border text-meta">
        {execution.refunds.length ? (
          execution.refunds.map((r) => (
            <Line
              key={r.id}
              label={`Guest refund ${r.reference} (Test)`}
              value={
                <>
                  {money(r.amountMinor)} ·{' '}
                  {r.needsInvestigation ? (
                    // The status itself is the investigation link (refund operations page).
                    <Link
                      href={`/admin/finance/refunds/${r.id}`}
                      className="inline-flex min-h-11 items-center font-semibold text-danger underline"
                    >
                      {REFUND_STATUS[r.status] ?? r.status} — needs investigation
                    </Link>
                  ) : (
                    (REFUND_STATUS[r.status] ?? r.status)
                  )}
                </>
              }
            />
          ))
        ) : (
          <Line label="Guest refund" value="None (nothing additional due)" />
        )}
        <Line
          label="Owner incident obligation (Test)"
          value={
            ob ? `${money(ob.amountMinor)} · ${OBLIGATION_STATE[ob.state] ?? ob.state}` : 'None'
          }
        />
      </dl>
      {ob ? (
        <>
          <p className="text-tiny text-ink-600">
            Reassigned fee {money(ob.reassignedFeeMinor)} · owner fee share{' '}
            {money(ob.ownerFeeShareMinor)}. Never deducted from a payout.
          </p>
          <ObligationLink caseId={caseId} ob={ob} />
        </>
      ) : null}
    </div>
  );
}

/** Every execution on the case, newest first (superseded decisions included). */
export function ExecutionHistory({ caseId, executions }) {
  if (!executions?.length) return null;
  return (
    <section aria-label="Executed awards" className="space-y-3">
      {executions.map((x) => (
        <div key={x.id} className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="text-meta font-bold">Award executed · {time(x.createdAt)}</h3>
          <ExecutionRows caseId={caseId} execution={x} />
        </div>
      ))}
    </section>
  );
}

/** Story 4.5: execute the active award once (Test), after a confirm step. */
export function ExecuteAward({ caseId, decision }) {
  const router = useRouter();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [state, setState] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const plan = decision.preview;
  if (!plan?.digest) return null;
  const run = () =>
    start(async () => {
      const data = new FormData();
      data.set('id', caseId);
      data.set('decisionId', decision.id);
      data.set('digest', plan.digest);
      data.set('requestKey', requestKey);
      const result = await executeIncidentAward(data);
      setState(result);
      setConfirming(false);
      if (result.execution || result.code === 'ALREADY_EXECUTED') router.refresh();
    });
  const stale = state.code === 'PREVIEW_CHANGED';
  const closed =
    stale || ['ALREADY_EXECUTED', 'REFUND_BLOCKED', 'DECISION_NOT_ACTIVE'].includes(state.code);
  if (state.execution) return null; // the refreshed history shows it
  // Owner extra = reassigned fee + the fee part of the new refund (exact figure recorded at execution).
  const feeShare =
    plan.paidMinor > 0
      ? Math.round((plan.additionalDueMinor * plan.paidByComponent.fee) / plan.paidMinor)
      : 0;
  const ownerExtra =
    decision.responsibility === 'owner_funded' && plan.additionalDueMinor > 0
      ? plan.reassignedFromRentraMinor + feeShare
      : 0;
  return (
    <section aria-label="Execute award" className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-meta font-bold">Execute award (Test)</h3>
      <RemedyLines plan={stale && state.preview ? state.preview : plan} />
      {stale ? (
        <p role="alert" className="text-meta font-medium text-danger">
          The figures changed since this decision (shown above). Save a new decision first.
        </p>
      ) : closed ? null : confirming ? (
        <div
          role="group"
          aria-label="Confirm execution"
          className="space-y-2 rounded-md bg-ink-25 p-3"
        >
          <p className="text-meta">
            Queue a Test guest refund of <strong>{money(plan.additionalDueMinor)}</strong>
            {ownerExtra > 0 ? (
              <>
                {' '}
                and record an owner obligation of about <strong>{money(ownerExtra)}</strong>
              </>
            ) : null}
            ? This runs once.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={run}
              className={buttonVariants({ shape: 'default', size: 'default' })}
            >
              {pending ? <RentraLoader label="Executing…" /> : 'Confirm and execute'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className={`${buttonVariants({ variant: 'outline', size: 'default' })} min-h-11`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={buttonVariants({ shape: 'default', size: 'default' })}
        >
          Execute award (Test)
        </button>
      )}
      {stale ? null : <Problems state={state} />}
    </section>
  );
}

/**
 * Story 4.4: preview a cumulative remedy and save a reviewed decision. Every input change asks the
 * server for a fresh preview; saving stays disabled until it matches the inputs on screen.
 */
export default function IncidentRemedyPanel({ caseId, remedy }) {
  const [kind, setKind] = useState('award');
  const [targetPct, setTargetPct] = useState('100');
  const [responsibility, setResponsibility] = useState('proportional');
  const [visitIds, setVisitIds] = useState(null);
  const [reason, setReason] = useState('');
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState({});
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [previewing, startPreview] = useTransition();
  const [saving, startSave] = useTransition();
  const pct = Number(targetPct);
  const validPct = targetPct !== '' && Number.isInteger(pct) && pct >= 0 && pct <= 100;
  const visitKey = visitIds?.join() ?? '';

  const form = (extra = {}) => {
    const data = new FormData();
    data.set('id', caseId);
    data.set('targetPct', String(pct));
    data.set('responsibility', responsibility);
    for (const id of visitIds ?? []) data.append('visitIds', id);
    for (const [name, value] of Object.entries(extra)) data.set(name, value);
    return data;
  };

  useEffect(() => {
    if (!remedy.canPreview || kind !== 'award' || !validPct || noVisits) return undefined;
    const timer = setTimeout(
      () =>
        startPreview(async () => {
          const result = await previewIncidentRemedy(form());
          if (result.preview) {
            setPlan(result.preview);
            // A good preview clears earlier refusals; a saved decision stays shown.
            setState((previous) => (previous.decision ? { decision: previous.decision } : {}));
            if (visitIds === null) setVisitIds(result.preview.visitIds);
          } else {
            setPlan((previous) => previous && { ...previous, stale: true });
            setState(result);
          }
        }),
      250,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, targetPct, responsibility, visitKey]);

  const noVisits = visitIds !== null && visitIds.length === 0;
  const fresh =
    plan &&
    !plan.stale &&
    !noVisits &&
    plan.targetPct === pct &&
    plan.responsibility === responsibility &&
    sameSet(plan.visitIds, visitIds ?? []);
  const reasonOk = reason.trim().length >= 10;
  const canSave =
    remedy.canDecide && reasonOk && !saving && (kind === 'deny' || (fresh && !previewing));

  const save = (event) => {
    event.preventDefault();
    startSave(async () => {
      const result = await decideIncidentRemedy(
        form({ kind, reason, requestKey, ...(kind === 'award' ? { digest: plan.digest } : {}) }),
      );
      setState(result);
      if (result.code === 'PREVIEW_CHANGED' && result.preview) setPlan(result.preview);
      if (result.decision) setRequestKey(crypto.randomUUID());
    });
  };

  const activeDecision = state.decision ?? remedy.decision;
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-ink-25 p-3 text-tiny font-semibold">{REMEDY_TEST_LABEL}</p>
      <section aria-label="Active decision">
        <h3 className="text-meta font-bold">Active decision</h3>
        <RemedyDecisionSummary decision={activeDecision} />
      </section>
      {remedy.canDecide &&
      activeDecision?.kind === 'award' &&
      !(remedy.executions ?? []).some((x) => x.decisionId === activeDecision.id) ? (
        <ExecuteAward key={activeDecision.id} caseId={caseId} decision={activeDecision} />
      ) : null}
      <ExecutionHistory caseId={caseId} executions={remedy.executions} />
      {remedy.canPreview ? (
        <form onSubmit={save} className="space-y-4">
          <fieldset>
            <legend className="text-meta font-semibold">Decision</legend>
            {[
              ['award', 'Award a cumulative refund target'],
              ['deny', 'Decline with a reason'],
            ].map(([value, label]) => (
              <label key={value} className={radio}>
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="size-5"
                />
                {label}
              </label>
            ))}
          </fieldset>
          {kind === 'award' ? (
            <>
              <label className="block text-meta font-semibold">
                Cumulative target (% of verified paid for chosen visits)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={targetPct}
                  onChange={(event) => setTargetPct(event.target.value)}
                  className={field}
                />
              </label>
              <fieldset>
                <legend className="text-meta font-semibold">Responsibility</legend>
                {Object.entries(RESPONSIBILITY).map(([value, label]) => (
                  <label key={value} className={radio}>
                    <input
                      type="radio"
                      name="responsibility"
                      value={value}
                      checked={responsibility === value}
                      onChange={() => setResponsibility(value)}
                      className="size-5"
                    />
                    {label}
                  </label>
                ))}
                {responsibility === 'owner_funded' ? (
                  <p className="text-tiny text-ink-600">{OWNER_FUNDED_LABEL}</p>
                ) : null}
              </fieldset>
              {plan?.orderVisits ? (
                <fieldset>
                  <legend className="text-meta font-semibold">Visits</legend>
                  {plan.orderVisits.map((v) => (
                    <label key={v.id} className={radio}>
                      <input
                        type="checkbox"
                        className="size-5"
                        checked={(visitIds ?? []).includes(v.id)}
                        onChange={(event) =>
                          setVisitIds((ids) =>
                            event.target.checked
                              ? [...(ids ?? []), v.id]
                              : (ids ?? []).filter((id) => id !== v.id),
                          )
                        }
                      />
                      {v.reference} · {v.date}
                      {plan.affectedVisitIds.includes(v.id) ? ' · reported' : ''}
                    </label>
                  ))}
                  {noVisits ? (
                    <p role="alert" className="text-tiny text-danger">
                      Choose at least one visit
                    </p>
                  ) : null}
                </fieldset>
              ) : null}
              <section
                aria-label="Remedy preview"
                aria-busy={previewing}
                className="rounded-lg border border-border p-4"
              >
                <h3 className="mb-2 text-meta font-bold">
                  Preview {previewing ? '· refreshing…' : !fresh ? '· out of date' : ''}
                </h3>
                {plan ? <RemedyLines plan={plan} /> : <RentraLoader label="Previewing…" />}
              </section>
            </>
          ) : null}
          {remedy.canDecide ? (
            <>
              <label className="block text-meta font-semibold">
                Reason (kept on the decision and audit)
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  aria-describedby="remedy-reason-hint"
                  className={field}
                />
              </label>
              <p id="remedy-reason-hint" className="text-tiny text-ink-600">
                The owner sees this reason if they fund the refund. Don&apos;t include guest
                personal details.
              </p>
              {Object.entries(state.errors ?? {})
                .filter(([name]) => name !== 'reason')
                .map(([name, message]) => (
                  <p key={name} role="alert" className="text-tiny text-danger">
                    {{ targetPct: 'Target', visitIds: 'Visits', responsibility: 'Responsibility' }[
                      name
                    ] ?? name}
                    : {[].concat(message).join(' ')}
                  </p>
                ))}
              {state.errors?.reason ? (
                <p className="text-tiny text-danger">{state.errors.reason}</p>
              ) : null}
              <button
                disabled={!canSave}
                className={buttonVariants({ shape: 'default', size: 'default' })}
              >
                {saving ? <RentraLoader label="Saving…" /> : 'Save decision'}
              </button>
              {kind === 'award' && !fresh ? (
                <p className="text-tiny text-ink-600">Waiting for a fresh preview before saving.</p>
              ) : null}
              {state.code === 'PREVIEW_CHANGED' ? (
                <p role="alert" className="text-meta font-medium text-danger">
                  The figures changed. Review the new preview above before saving.
                </p>
              ) : (
                <Outcome state={state} />
              )}
            </>
          ) : (
            <p className="text-tiny text-ink-600">Saving a decision needs payments write access.</p>
          )}
        </form>
      ) : null}
    </div>
  );
}
