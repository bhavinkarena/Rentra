'use client';

import { useEffect, useState, useTransition } from 'react';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome } from '@/components/booking/EvidenceForms';
import { previewIncidentRemedy, decideIncidentRemedy } from '@/lib/actions/admin';
import { bookingMoney as money } from '@/lib/domain/booking-record';
import { adminDateTime as time } from '@/lib/domain/admin-display';

export const REMEDY_TEST_LABEL = 'Test mode — no money moves until Story 4.5 execution';
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

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-ink-25 p-3 text-tiny font-semibold">{REMEDY_TEST_LABEL}</p>
      <section aria-label="Active decision">
        <h3 className="text-meta font-bold">Active decision</h3>
        <RemedyDecisionSummary decision={state.decision ?? remedy.decision} />
      </section>
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
                  className={field}
                />
              </label>
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
