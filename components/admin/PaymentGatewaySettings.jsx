'use client';

import { useActionState } from 'react';
import { savePaymentGatewaySettings } from '@/app/(admin)/admin/payments/actions';

const fieldClass = 'mt-2 block min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-meta';

export default function PaymentGatewaySettings({ configuration, providers }) {
  const [state, action, pending] = useActionState(savePaymentGatewaySettings, {});

  return (
    <form action={action} className="space-y-5 rounded-lg border border-border bg-card p-5">
      <input type="hidden" name="expectedVersion" value={configuration.version} />
      <input type="hidden" name="environment" value="test" />

      <label className="block text-meta font-semibold">
        Gateway
        <select name="provider" defaultValue={configuration.provider ?? providers[0]?.id} className={fieldClass} disabled={pending}>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label} · Test mode</option>)}
        </select>
      </label>

      <label className="block text-meta font-semibold">
        New payment attempts
        <select name="enabled" defaultValue={String(configuration.enabled)} className={fieldClass} disabled={pending}>
          <option value="false">Disabled</option>
          <option value="true">Enabled in test mode</option>
        </select>
      </label>

      <label className="block text-meta font-semibold">
        Sandbox collection amount
        <select name="collectionPurpose" defaultValue={configuration.collectionPurpose} className={fieldClass} disabled={pending}>
          <option value="full">Full rent + platform fee</option>
          <option value="advance">25% of rent + full platform fee</option>
        </select>
      </label>
      <p className="text-meta text-ink-600">The security deposit is separate from both options.</p>

      {state.error ? <p role="alert" className="rounded-md bg-danger-bg p-3 text-meta text-danger">{state.error}</p> : null}
      {state.ok ? <p role="status" className="rounded-md bg-brand-50 p-3 text-meta text-brand-800">Payment configuration saved and recorded in the audit log.</p> : null}

      <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-brand-600 px-5 py-2.5 text-meta font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {pending ? 'Saving…' : 'Save payment settings'}
      </button>
    </form>
  );
}
