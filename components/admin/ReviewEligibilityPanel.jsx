'use client';

import { useState, useTransition } from 'react';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome } from '@/components/booking/EvidenceForms';
import { decideReviewEligibility } from '@/lib/actions/admin';
import { adminDateTime as time } from '@/lib/domain/admin-display';
import { EXPERIENCE_SCOPE_LABELS } from '@/lib/domain/status';
import { StatusBadge } from './AdminPrimitives';

const field = `${fieldClass} mt-1 block min-h-11`;
const radio = 'flex min-h-11 items-center gap-2 text-meta';

function status(v) {
  if (v.decision?.decision === 'approved')
    return `Exception approved · ${EXPERIENCE_SCOPE_LABELS[v.decision.scope]} · until ${time(v.decision.windowEndsAt)}`;
  if (v.decision?.decision === 'denied') return 'Denied';
  if (v.reviewId) return 'Reviewed';
  if (v.normallyEligible) return 'Already eligible (completed stay)';
  return 'Not eligible — no decision';
}

/** Story 5.2: one affected visit; approve with a scope or deny, both with a reason. */
function VisitDecision({ caseId, visit, canDecide }) {
  const [decision, setDecision] = useState(visit.reviewId ? 'denied' : 'approved');
  const [scope, setScope] = useState('arrival_access');
  const [reason, setReason] = useState('');
  const [state, setState] = useState({});
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const blocked =
    visit.normallyEligible || (visit.reviewId && visit.decision?.decision !== 'approved');
  // A reviewed visit can only be denied (which revokes the exception behind it).
  const chosen = visit.reviewId ? 'denied' : decision;
  const save = (event) => {
    event.preventDefault();
    const data = new FormData();
    data.set('id', caseId);
    data.set('bookingId', visit.visitId);
    data.set('decision', chosen);
    if (chosen === 'approved') data.set('scope', scope);
    data.set('reason', reason);
    data.set('requestKey', requestKey);
    start(async () => {
      const result = await decideReviewEligibility(data);
      setState(result);
      // Keep entered values on failure; a new key only after a saved decision.
      if (result.decision) {
        setRequestKey(crypto.randomUUID());
        setReason('');
      }
    });
  };
  return (
    <li className="space-y-2 border-t border-border pt-3 first:border-0 first:pt-0">
      <p className="text-meta font-semibold">
        {visit.visitReference} · {visit.date}{' '}
        <StatusBadge domain="booking" state={visit.visitState} />
      </p>
      {visit.fromOtherCase ? (
        <p className="text-tiny font-semibold text-warning">
          Replaces decision from case {visit.caseReference}
        </p>
      ) : null}
      <p className="text-meta">{status(visit)}</p>
      {visit.decision ? (
        <p className="text-tiny text-ink-600">Reason: {visit.decision.reason}</p>
      ) : null}
      {visit.reviewId ? (
        <p className="text-tiny text-ink-600">
          {visit.reviewPublic
            ? 'Review is public. Denying removes it from public view and the count (not deleted).'
            : 'Review exists but is not public.'}
        </p>
      ) : null}
      {canDecide && !blocked ? (
        <form onSubmit={save} className="space-y-2">
          <fieldset>
            <legend className="sr-only">Decision</legend>
            {visit.reviewId ? null : (
              <label className={radio}>
                <input
                  type="radio"
                  checked={decision === 'approved'}
                  onChange={() => setDecision('approved')}
                />
                Approve arrival review
              </label>
            )}
            <label className={radio}>
              <input
                type="radio"
                checked={chosen === 'denied'}
                onChange={() => setDecision('denied')}
              />
              Deny
            </label>
          </fieldset>
          {chosen === 'approved' ? (
            <label className="block text-meta">
              Scope
              <select className={field} value={scope} onChange={(e) => setScope(e.target.value)}>
                {Object.entries(EXPERIENCE_SCOPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-meta">
            Reason (shown to the guest)
            <textarea
              className={field}
              value={reason}
              minLength={10}
              maxLength={500}
              required
              onChange={(e) => setReason(e.target.value)}
            />
            {state.errors?.reason ? (
              <span className="text-danger">{state.errors.reason[0]}</span>
            ) : null}
          </label>
          <button
            className={buttonVariants({ className: 'min-h-11' })}
            disabled={pending || reason.trim().length < 10}
          >
            {pending ? <RentraLoader label="Saving…" /> : 'Save decision'}
          </button>
          <Outcome state={state} />
        </form>
      ) : null}
    </li>
  );
}

export default function ReviewEligibilityPanel({ caseId, visits, canDecide }) {
  return (
    <ul className="space-y-3">
      {visits.map((v) => (
        <VisitDecision key={v.visitId} caseId={caseId} visit={v} canDecide={canDecide} />
      ))}
    </ul>
  );
}
