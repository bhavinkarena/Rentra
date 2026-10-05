'use client';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome, useKeptInputAction } from '@/components/booking/EvidenceForms';
import { previewAdminRefund, reconcileAdminRefund, requestAdminRefund } from '@/lib/actions/admin';
import { bookingMoney as money } from '@/lib/domain/booking-record';

const primary = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const field = `${sharedFieldClass} mt-1 block min-h-11`;

/**
 * Send a queued obligation or check an existing one. The engine POSTs a refund
 * at most once; every later command only looks it up. The request key makes a
 * repeat return the first result without calling the provider.
 */
export function RefundCommand({ refundId, command, requestKey }) {
  const { state, pending, onSubmit } = useKeptInputAction(reconcileAdminRefund);
  const [key] = useState(requestKey);
  const send = command === 'send';
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={refundId} />
      <input type="hidden" name="requestKey" value={key} />
      <button disabled={pending} className={primary}>
        {pending ? (
          <RentraLoader label="Asking Razorpay Test…" />
        ) : (
          <>
            {send ? (
              <Send className="size-4" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            {send ? 'Send to provider now' : 'Check with provider'}
          </>
        )}
      </button>
      <Outcome state={state} />
      {state.stateAfter ? (
        <p className="text-meta text-ink-700">
          Refund {state.stateBefore} → {state.stateAfter}
          {state.code ? ` · provider: ${state.code}` : ''}
          {state.replayed ? ' · repeat of an earlier request (no new provider call)' : ''}
        </p>
      ) : null}
    </form>
  );
}

const rupees = (value) => {
  const number = Number.parseFloat(String(value || '0'));
  return Number.isFinite(number) && number > 0 ? String(Math.round(number * 100)) : '0';
};

/**
 * Preview, then request: the preview shows every component's captured,
 * refunded, pending and remaining amounts; the request is accepted only for
 * exactly that preview (its hash), so a concurrent refund that used the funds
 * first makes this one stale instead of over-refunding.
 */
export function RefundRequest({ order, requestKey }) {
  const [previewState, preview, previewing] = useActionState(previewAdminRefund, {});
  const [requestState, request, requesting] = useActionState(requestAdminRefund, {});
  const [, startTransition] = useTransition();
  const [visitId, setVisitId] = useState(
    order.visits.find((v) => v.remainingMinor > 0)?.id ?? order.visits[0]?.id ?? '',
  );
  const [amounts, setAmounts] = useState({ rent: '', fee: '', deposit: '' });
  const [reason, setReason] = useState('');
  const [key] = useState(requestKey);
  const plan = previewState.preview;
  const minor = {
    rent: rupees(amounts.rent),
    fee: rupees(amounts.fee),
    deposit: rupees(amounts.deposit),
  };
  const matches =
    plan &&
    plan.visit.id === visitId &&
    plan.components.every((c) => String(c.requestedMinor) === minor[c.component]);
  const build = (extra = {}) => {
    const data = new FormData();
    data.set('orderId', order.orderId);
    data.set('visitId', visitId);
    for (const [component, value] of Object.entries(minor)) data.set(component, value);
    for (const [name, value] of Object.entries(extra)) data.set(name, value);
    return data;
  };
  const done = requestState.refundIds?.length;
  const forms = useRef(null);
  useEffect(() => {
    if (done)
      forms.current?.querySelectorAll('form').forEach((form) => {
        form.dispatchEvent(new Event('rentra:form-saved', { bubbles: true }));
      });
  }, [done]);
  return (
    <div ref={forms} className="space-y-5">
      <form
        data-unsaved-until-saved
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => preview(build()));
        }}
      >
        <label className="block text-meta font-semibold">
          Visit
          <select
            value={visitId}
            onChange={(event) => setVisitId(event.target.value)}
            className={field}
          >
            {order.visits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.reference} · {v.date} · {v.state} · {money(v.remainingMinor)} left of{' '}
                {money(v.capturedMinor)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="text-meta font-semibold">Amount to refund (₹)</legend>
          {['rent', 'fee', 'deposit'].map((component) => (
            <label key={component} className="block text-meta capitalize">
              {component}
              <input
                inputMode="decimal"
                value={amounts[component]}
                onChange={(event) => setAmounts({ ...amounts, [component]: event.target.value })}
                className={field}
              />
            </label>
          ))}
        </fieldset>
        <button disabled={previewing} className={primary}>
          {previewing ? <RentraLoader label="Previewing…" /> : 'Preview refund'}
        </button>
        <Outcome state={previewState} />
      </form>

      {plan ? (
        <section
          aria-label="Refund preview"
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <h3 className="font-semibold">
            Preview · {plan.visit.reference} ({plan.visit.state})
          </h3>
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Refund amounts by component"
          >
            <table className="w-full min-w-[520px] text-left text-meta">
              <thead className="text-tiny text-ink-600">
                <tr>
                  <th scope="col" className="py-1 pr-3">
                    Component
                  </th>
                  <th scope="col" className="py-1 pr-3">
                    Captured · verified
                  </th>
                  <th scope="col" className="py-1 pr-3">
                    Refunded · verified
                  </th>
                  <th scope="col" className="py-1 pr-3">
                    Refunds pending
                  </th>
                  <th scope="col" className="py-1 pr-3">
                    Remaining
                  </th>
                  <th scope="col" className="py-1">
                    This refund
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.components.map((c) => (
                  <tr key={c.component} className="border-t border-border">
                    <th scope="row" className="py-1 pr-3 capitalize">
                      {c.component}
                    </th>
                    <td className="py-1 pr-3 tabular">{money(c.capturedMinor)}</td>
                    <td className="py-1 pr-3 tabular">{money(c.refundedMinor)}</td>
                    <td className="py-1 pr-3 tabular">{money(c.pendingMinor)}</td>
                    <td className="py-1 pr-3 tabular">{money(c.remainingMinor)}</td>
                    <td className="py-1 font-semibold tabular">{money(c.requestedMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plan.blocked ? (
            <p role="alert" className="text-meta font-medium text-danger">
              {plan.blocked}
            </p>
          ) : (
            <form
              data-unsaved-until-saved
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(() => request(build({ reason, hash: plan.hash, requestKey: key })));
              }}
            >
              <p className="text-meta">
                Refund {money(plan.refundMinor)} as {plan.obligations} obligation
                {plan.obligations === 1 ? '' : 's'}. It is sent to Razorpay Test once and is not
                refunded until Razorpay confirms it.
              </p>
              <label className="block text-meta font-semibold">
                Reason (kept on the refund record)
                <input
                  required
                  minLength={10}
                  maxLength={120}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={field}
                />
              </label>
              {requestState.errors?.reason ? (
                <p className="text-tiny text-danger">{requestState.errors.reason}</p>
              ) : null}
              <button disabled={requesting || !matches || done} className={primary}>
                {requesting ? <RentraLoader label="Requesting…" /> : 'Request this refund'}
              </button>
              {!matches ? (
                <p className="text-tiny text-ink-600">The amounts changed: preview again first.</p>
              ) : null}
              <Outcome state={requestState} />
              {done ? (
                <p className="text-meta">
                  Open:{' '}
                  {requestState.refundIds.map((id) => (
                    <a
                      key={id}
                      href={`/admin/finance/refunds/${id}`}
                      className="mr-2 font-semibold text-brand-700 underline"
                    >
                      refund {id.slice(0, 8)}
                    </a>
                  ))}
                </p>
              ) : null}
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
