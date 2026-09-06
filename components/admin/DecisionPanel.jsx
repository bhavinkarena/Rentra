'use client';

import { useActionState, useState } from 'react';
import { Check, HelpCircle, X, Loader2 } from 'lucide-react';
import {
  approveApplication, requestMoreInfo, rejectApplication,
} from '@/lib/auth/admin-actions';
import { Button } from '@/components/ui/button';

const FLAGGABLE = [
  { id: 'phone', label: 'Mobile number' },
  { id: 'details', label: 'Name / address' },
  { id: 'kyc', label: 'Identity document' },
  { id: 'payout', label: 'Payout account' },
];

/**
 * THREE outcomes, never two.
 *
 * "Request more info" is what stops a fixable typo becoming a permanent
 * rejection and a support call — the most common real case is an ownership
 * document in a father's or HUF name, which is a question, not a fraud.
 *
 * Reject and request-info both REQUIRE a written reason, enforced server-side
 * as well as here: the Client sees it verbatim, and a silent no generates a
 * support call and a bad review.
 */
export default function DecisionPanel({ applicationId, strikeCount }) {
  const [mode, setMode] = useState(null);
  const [approveState, approveAction, approving] = useActionState(approveApplication, {});
  const [infoState, infoAction, requestingInfo] = useActionState(requestMoreInfo, {});
  const [rejectState, rejectAction, rejecting] = useActionState(rejectApplication, {});

  const busy = approving || requestingInfo || rejecting;
  const anyError = approveState.errors?._ ?? infoState.errors?._ ?? rejectState.errors?._;
  const nextStrike = (strikeCount ?? 0) + 1;
  const willBlock = nextStrike >= 3;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-h3">Decision</h2>
      <p className="mt-1 text-meta text-ink-600">
        Whatever you choose is recorded with your name, the time, and your reason.
      </p>

      {anyError ? (
        <p className="mt-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {anyError}
        </p>
      ) : null}

      {mode === null ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setMode('approve')} className={btn('brand')}>
            <Check className="size-4" aria-hidden="true" /> Approve
          </button>
          <button type="button" onClick={() => setMode('info')} className={btn('amber')}>
            <HelpCircle className="size-4" aria-hidden="true" /> Need more info
          </button>
          <button type="button" onClick={() => setMode('reject')} className={btn('danger')}>
            <X className="size-4" aria-hidden="true" /> Reject
          </button>
        </div>
      ) : null}

      {mode === 'approve' ? (
        <form action={approveAction} className="mt-4 space-y-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="rounded-md border-l-4 border-brand-600 bg-success-bg p-3 text-meta text-brand-900">
            This closes Gate&nbsp;1: the account becomes <strong>active</strong>, identity is marked
            verified, and they can start adding properties. Each property still needs its own
            approval — that is Gate&nbsp;2.
          </p>
          <textarea
            name="reason"
            rows={2}
            placeholder="Internal note, optional — e.g. “PAN and light bill both in her name”"
            className={ta}
          />
          <div className="flex gap-2">
            <Button type="submit" size="lg" disabled={busy}>
              {approving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Approve and activate
            </Button>
            <CancelBtn onClick={() => setMode(null)} disabled={busy} />
          </div>
        </form>
      ) : null}

      {mode === 'info' ? (
        <form action={infoAction} className="mt-4 space-y-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <fieldset>
            <legend className="mb-1.5 text-meta font-semibold text-ink-700">
              Which steps need attention?
            </legend>
            <div className="flex flex-wrap gap-2">
              {FLAGGABLE.map((f) => (
                <label
                  key={f.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input px-3 py-1.5 text-meta hover:bg-ink-50"
                >
                  <input type="checkbox" name="flagged" value={f.id} className="size-3.5 accent-brand-600" />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="The Client sees this word for word. Be specific — “the name on your PAN is Ramesh J. Patel but the light bill says Jayanti Patel; send a relationship proof or a no-objection letter.”"
              className={ta}
            />
            {infoState.errors?.reason ? (
              <p className="mt-1.5 text-tiny font-medium text-danger">{infoState.errors.reason}</p>
            ) : null}
          </div>
          <p className="text-tiny text-ink-500">
            Not a strike. Returns the application to their hands so they can edit and resubmit.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="lg" variant="secondary" disabled={busy}>
              {requestingInfo ? <Loader2 className="size-4 animate-spin" /> : null}
              Send back with questions
            </Button>
            <CancelBtn onClick={() => setMode(null)} disabled={busy} />
          </div>
        </form>
      ) : null}

      {mode === 'reject' ? (
        <form action={rejectAction} className="mt-4 space-y-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
            Strike {nextStrike} of 3.
            {willBlock
              ? ' This one BLOCKS the account — only a manual appeal reopens it.'
              : ' They can correct and resubmit.'}
            {' '}Use “Need more info” instead if this is fixable.
          </p>
          <div>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="Shown to the Client verbatim. Say exactly what was wrong."
              className={ta}
            />
            {rejectState.errors?.reason ? (
              <p className="mt-1.5 text-tiny font-medium text-danger">{rejectState.errors.reason}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="lg" variant="destructive" disabled={busy}>
              {rejecting ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              {willBlock ? 'Reject and block' : 'Reject'}
            </Button>
            <CancelBtn onClick={() => setMode(null)} disabled={busy} />
          </div>
        </form>
      ) : null}
    </section>
  );
}

const ta = 'w-full rounded-sm border border-input bg-card px-3.5 py-3 text-meta '
  + 'text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none';

function btn(tone) {
  const tones = {
    brand: 'border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100',
    amber: 'border-amber-300 bg-amber-100 text-amber-700 hover:brightness-95',
    danger: 'border-danger/30 bg-danger-bg text-danger hover:brightness-95',
  };
  return 'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 '
    + `text-meta font-semibold transition-colors ${tones[tone]}`;
}

function CancelBtn({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-4 py-3 text-meta font-medium text-ink-600 hover:bg-ink-50"
    >
      Cancel
    </button>
  );
}
