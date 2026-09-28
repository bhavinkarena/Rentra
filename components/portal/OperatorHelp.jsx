import Link from '@/components/navigation/NavigationLink';

const admin = [
  {
    title: 'Review and publish',
    capability: 'admin.applications.read',
    href: '/admin',
    link: 'Application queue',
    steps: [
      'Review identity, account details and the submitted revision. Ask for more information when a correction is possible; explain the exact fields to fix.',
      'Approve an eligible application to activate the partner account. Property review remains a separate step.',
    ],
  },
  {
    title: 'Verify a property',
    capability: 'admin.properties.read',
    href: '/admin/properties',
    link: 'Property review',
    steps: [
      'Review the current submitted revision, arrange verification and record the required findings and checklist.',
      'Publish the verified revision. Reload if another operator changed it; do not overwrite a newer decision.',
    ],
  },
  {
    title: 'Resolve a booking incident',
    capability: 'admin.records.read',
    href: '/admin/bookings',
    link: 'Booking records',
    steps: [
      'Open the booking and inspect each affected visit, its status, evidence and accepted rules. Preserve the recorded evidence; use a correction with a reason when needed.',
      'Create or assign a case, select exact visits and review the impact preview before confirming a resolution. A change check does not reserve replacement dates.',
    ],
  },
  {
    title: 'Investigate a payment or refund',
    capability: 'admin.payments.read',
    href: '/admin/finance/refunds',
    link: 'Refund operations',
    steps: [
      'Check the payment environment, verified capture and existing refund obligations. Test and simulated records do not represent bank money.',
      'Preview the exact components and remaining refundable amount. Confirm once, then use the existing obligation to send or check with the provider.',
      'A pending or unknown outcome is not a successful refund. Check the same obligation and its provider evidence before retrying; do not create a replacement to work around uncertainty.',
    ],
  },
  {
    title: 'Fulfill a privacy request',
    capability: 'admin.privacy.read',
    href: '/admin/privacy',
    link: 'Privacy requests',
    steps: [
      'Verify identity and authority, review the scoped preview and explain retained records before approving work.',
      'Track all stages and report failed or retained stages accurately. Data copies are scoped and expire; a partial result does not mean the account was fully deleted.',
    ],
  },
  {
    title: 'Recover an operational incident',
    capability: 'admin.operations.read',
    href: '/admin/operations',
    link: 'Operations overview',
    steps: [
      'Open the alert to inspect current worker health, backlog and affected records. Assign responsibility and record the next action.',
      'Acknowledgement and notes do not restore service. Resolve only when measured recovery evidence is available.',
      'For an uncertain provider or delivery result, reconcile the existing attempt before sending again.',
    ],
  },
  {
    title: 'Review audit evidence',
    capability: 'admin.audit.read',
    href: '/admin/audit',
    link: 'Audit history',
    steps: [
      'Filter by the relevant actor, action, record and time interval. Use the governed export for an authorized, bounded data copy.',
      'Exports are private and expire. Recheck your access if a download is refused; never share a session cookie or an unredacted customer document.',
    ],
  },
];
const owner = [
  {
    title: 'Submit and correct a property',
    capability: 'client.listings.read',
    href: '/partner/listings',
    link: 'Your properties',
    steps: [
      'Complete the property details and required evidence, then submit for review. Open the returned revision to see the exact corrections requested.',
      'Correct and resubmit, then follow the verification appointment. Material changes may require another review. Pausing or resuming cannot remove an administrator restriction.',
    ],
  },
  {
    title: 'Plan availability',
    capability: 'client.calendar.read',
    href: '/partner/calendar',
    link: 'Portfolio calendar',
    steps: [
      'Review open dates, scheduled hours, buffers and existing reservations before changing availability.',
      'Read the impact preview before confirming a bulk change. A conflict means the current inventory changed; reload and prepare a fresh preview.',
    ],
  },
  {
    title: 'Record visits and get help',
    capability: 'client.records.read',
    href: '/partner/bookings',
    link: 'Booking records',
    steps: [
      'Open the booking and check each visit separately. Record handover, return and completion in order with the actual time and required evidence.',
      'Use a booking case or support request for a cancellation, amendment or incident. Explain the affected visits and preserve evidence; a support acknowledgement does not change a booking.',
    ],
  },
  {
    title: 'Understand your statement',
    capability: 'client.finance.read',
    href: '/partner/finance',
    link: 'Statements',
    steps: [
      'Check the currency, environment and reporting period. Test, simulated and legacy records are shown separately from eligible Live earnings.',
      'A recorded obligation is not proof of money received. Open its payment or payout evidence and contact support if an amount needs investigation.',
    ],
  },
  {
    title: 'Manage caretakers',
    capability: 'client.team.read',
    href: '/partner/team',
    link: 'Team access',
    steps: [
      'Assign only the properties a caretaker operates. Grant evidence recording only when needed.',
      'Reassign or revoke access when responsibilities change. Caretaker access does not include owner pricing, earnings, identity documents or team management.',
    ],
  },
  {
    title: 'Recover after an error',
    href: '/partner/support/new',
    capability: 'client.support.read',
    link: 'Contact support',
    steps: [
      'Keep the current form or filtered page and use Try again when service returns. A missing record and an unavailable service are different states.',
      'If a command lost its response, reopen the record to check what was saved before repeating it. Keep sensitive identity and payment credentials out of support messages.',
    ],
  },
];

export default function OperatorHelp({ role, capabilities = [] }) {
  const entries = (role === 'admin' ? admin : owner).filter(
    (item) => !item.capability || capabilities.includes(item.capability),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-h1">{role === 'admin' ? 'Operator guide' : 'Owner guide'}</h1>
        <p className="mt-2 text-meta text-ink-700">
          Review the current record, explain your decision and confirm the saved outcome. Your
          account permissions determine which actions are available.
        </p>
      </header>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-h3">Before confirming a change</h2>
        <p className="mt-2 text-meta text-ink-700">
          Check the affected people, properties and visits. Read any preview, enter a clear reason
          and wait for the saved result. If the record changed, reload and review it again.
        </p>
      </section>
      {entries.map((item) => (
        <section key={item.title} className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-h3">{item.title}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-meta text-ink-700">
            {item.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link
            href={item.href}
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-800 underline"
          >
            {item.link} →
          </Link>
        </section>
      ))}
    </div>
  );
}
