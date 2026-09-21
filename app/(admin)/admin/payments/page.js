import Link from 'next/link';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import PaymentGatewaySettings from '@/components/admin/PaymentGatewaySettings';

export const metadata = {
  title: 'Payment settings',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPaymentsPage() {
  await requireAdmin();
  /* Credential readiness is read from the API's own environment — it has the
     keys, this process does not, and only the verdict crosses the wire. */
  const { configuration, providers } = await adminApi.paymentConfiguration();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin" className="text-meta font-medium text-brand-700 hover:underline">Back to admin</Link>
      <h1 className="mt-4 text-h1">Payment settings</h1>
      <p className="mt-2 max-w-prose text-body text-ink-600">
        Choose the test gateway and collection amount for the customer checkout rollout.
        Customer checkout and gateway processing are still being implemented; saving these settings sends no payment requests.
      </p>

      <div className="mt-5 rounded-lg border border-border bg-brand-50 p-4 text-meta text-brand-900">
        <p className="font-semibold">Current setting: {configuration.enabled ? 'Test gateway enabled' : 'New payment attempts disabled'}</p>
        <p className="mt-1">Configuration version {configuration.version}. Disabling affects new attempts; existing payment intents keep their original configuration.</p>
      </div>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-2">
        <PaymentGatewaySettings configuration={configuration} providers={providers} />
        <aside className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-h3">Test credentials</h2>
          <p className="mt-2 text-meta text-ink-600">Credentials are read from server environment variables. Their values are never stored or shown here.</p>
          <ul className="mt-4 space-y-4">
            {providers.map((provider) => (
              <li key={provider.id}>
                <p className="text-meta font-semibold">{provider.label}: {provider.ready ? 'Configured' : 'Configuration needed'}</p>
                <p className="mt-1 text-meta text-ink-600">{provider.reason ?? 'Test key, API secret and webhook secret are present. Gateway connectivity has not been verified.'}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-4 text-meta text-ink-600">Live keys and unregistered providers are rejected. Additional gateways need a reviewed adapter before they appear here.</p>
        </aside>
      </div>
    </div>
  );
}
