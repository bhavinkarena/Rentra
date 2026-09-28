'use client';

import Form from '@/components/navigation/NavigationForm';
import {
  Activity,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  Star,
  TriangleAlert,
  Undo2,
  UserRound,
  Users,
} from 'lucide-react';
import PortalShell from '@/components/portal/PortalShell';

// Grouped per the CP02 navigation plan. Only delivered destinations appear;
// later groups (Properties, Audit, Settings) arrive with their parts.
const NAV_GROUPS = [
  { label: 'Help', items: [{ href: '/admin/help', label: 'Operator guide', icon: LifeBuoy }] },
  {
    label: 'Publication',
    items: [
      {
        href: '/admin/content',
        label: 'Public content',
        icon: ClipboardList,
        capability: 'admin.content.read',
      },
    ],
  },
  {
    label: 'Reference data',
    items: [
      {
        href: '/admin/catalogues',
        label: 'Catalogues',
        icon: ClipboardList,
        capability: 'admin.catalogues.read',
      },
    ],
  },
  {
    label: 'Work queues',
    items: [
      {
        href: '/admin/properties',
        label: 'Property review',
        icon: Building2,
        capability: 'admin.properties.read',
      },
      {
        href: '/admin',
        label: 'Applications',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/admin' || pathname.startsWith('/admin/applications/'),
        capability: 'admin.applications.read',
        badgeKey: 'waitingApplications',
      },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/clients', label: 'Clients', icon: Users, capability: 'admin.clients.read' },
      {
        href: '/admin/customers',
        label: 'Customers',
        icon: UserRound,
        capability: 'admin.customers.read',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        href: '/admin/bookings',
        label: 'Bookings',
        icon: CalendarDays,
        capability: 'admin.records.read',
      },
      {
        href: '/admin/booking-cases',
        label: 'Booking cases',
        icon: ClipboardList,
        capability: 'admin.records.read',
      },
      {
        href: '/admin/support',
        label: 'Support inbox',
        icon: MessageSquareText,
        capability: 'admin.support.read',
      },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, capability: 'admin.reviews.read' },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        href: '/admin/disputes',
        label: 'Disputes',
        icon: TriangleAlert,
        capability: 'admin.payments.read',
      },
      {
        href: '/admin/finance/statements',
        label: 'Statements',
        icon: ReceiptText,
        capability: 'admin.payments.read',
      },
      {
        href: '/admin/finance/payouts',
        label: 'Payouts',
        icon: CreditCard,
        capability: 'admin.payments.read',
      },
      {
        href: '/admin/finance/payments',
        label: 'Payments',
        icon: ReceiptText,
        capability: 'admin.payments.read',
      },
      {
        href: '/admin/finance/refunds',
        label: 'Refunds',
        icon: Undo2,
        capability: 'admin.payments.read',
      },
      // Stable bookmark: this page is gateway settings, not payment investigation (CP19).
      {
        href: '/admin/payments',
        label: 'Gateway settings',
        icon: CreditCard,
        capability: 'admin.payments.read',
      },
    ],
  },
  {
    label: 'Compliance & health',
    items: [
      {
        href: '/admin/audit',
        label: 'Audit & exports',
        icon: ClipboardList,
        capability: 'admin.audit.read',
      },
      {
        href: '/admin/security',
        label: 'Operators & security',
        icon: ShieldCheck,
        capability: 'admin.security.read',
      },
      {
        href: '/admin/privacy',
        label: 'Privacy requests',
        icon: ShieldCheck,
        capability: 'admin.privacy.read',
      },
      {
        href: '/admin/operations',
        label: 'Service health',
        icon: Activity,
        capability: 'admin.operations.read',
      },
      {
        href: '/admin/notifications',
        label: 'Message delivery',
        icon: Send,
        capability: 'admin.notifications.read',
      },
    ],
  },
];

const DETAIL_LABELS = [
  ['/admin/audit/', 'Audit & exports'],
  ['/admin/privacy/', 'Privacy fulfillment'],
  ['/admin/security/', 'Operator security'],
  ['/admin/security', 'Operators & security'],
  ['/admin/applications/', 'Application review'],
  ['/admin/properties/', 'Property review'],
  ['/admin/bookings/', 'Booking record'],
  ['/admin/booking-cases/', 'Booking case'],
  ['/admin/finance/payments/', 'Payment detail'],
  ['/admin/finance/refunds/', 'Refund detail'],
  ['/admin/support/', 'Support request'],
  ['/admin/clients/', 'Client'],
  ['/admin/customers/', 'Customer'],
  ['/admin/search', 'Search'],
];

function routeLabel(pathname) {
  const detail = DETAIL_LABELS.find(([prefix]) => pathname.startsWith(prefix));
  if (detail) return detail[1];
  const item = NAV_GROUPS.flatMap((group) => group.items).find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );
  return item?.label || 'Admin console';
}

function initials(email) {
  return (
    (email || 'Admin')
      .split('@')[0]
      .split(/[._\s-]+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'A'
  );
}

export default function AdminShell({ children, admin, logoutAction, counts = {} }) {
  const can = (capability) => !capability || admin.capabilities?.includes(capability);
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => can(item.capability))
      .map((item) => ({ ...item, badge: item.badgeKey ? counts[item.badgeKey] : undefined })),
  })).filter((group) => group.items.length);
  const searchable = can('admin.clients.read') || can('admin.customers.read');

  return (
    <PortalShell
      config={{
        home: '/admin',
        product: 'Admin',
        workspace: 'Admin workspace',
        navLabel: 'Admin navigation',
        groups,
        routeLabel,
        logoutAction,
        user: {
          name: admin.email,
          initials: initials(admin.email),
          note: admin.hasTotp ? '2FA protected' : '2FA not enrolled',
          noteTone: admin.hasTotp ? 'text-brand-200' : 'text-amber-300',
        },
        headerNote: !admin.hasTotp ? (
          <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-tiny font-bold text-amber-800 xl:inline-flex">
            <TriangleAlert className="size-3.5" aria-hidden="true" /> 2FA not enrolled
          </span>
        ) : null,
        search: searchable ? (
          <Form action="/admin/search" role="search" className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden="true"
            />
            <label htmlFor="admin-search" className="sr-only">
              Search clients, customers and applications
            </label>
            <input
              id="admin-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Search clients, customers, applications…"
              className="min-h-9 w-full rounded-md border border-border bg-ink-25 pr-3 pl-9 text-meta placeholder:text-ink-500 focus:border-brand-600 focus:bg-white focus:outline-none"
            />
          </Form>
        ) : null,
      }}
    >
      {children}
    </PortalShell>
  );
}
