'use client';

import Form from '@/components/navigation/NavigationForm';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  Search,
  Settings,
  TriangleAlert,
  Users,
} from 'lucide-react';
import PortalShell from '@/components/portal/PortalShell';
import AdminSectionNav from './AdminSectionNav';
import {
  adminRouteLabel,
  adminSectionForPath,
  permittedAdminSections,
} from '@/lib/domain/admin-navigation';

const ICONS = {
  dashboard: LayoutDashboard,
  reviews: ClipboardList,
  bookings: CalendarDays,
  people: Users,
  finance: CreditCard,
  operations: Activity,
  settings: Settings,
  help: LifeBuoy,
};

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
  const capabilities = admin.capabilities ?? [];
  const sections = permittedAdminSections(capabilities);
  const itemFor = (section) => ({
    href: section.tabs[0].href,
    label: section.label,
    icon: ICONS[section.key],
    wrap: true,
    match: (pathname) => adminSectionForPath(pathname, sections)?.key === section.key,
    badge: section.key === 'reviews' ? counts.waitingApplications : undefined,
  });
  const groups = [
    {
      label: 'Workspace',
      hideLabel: true,
      items: sections.filter((section) => !section.footer).map(itemFor),
    },
  ];
  const footerItems = [{ href: '/admin/help', label: 'Help & guide', icon: LifeBuoy }];
  if (capabilities.includes('admin.support.read'))
    footerItems.push({
      href: '/admin/support',
      label: 'Support inbox',
      icon: MessageSquareText,
      badge: counts.waitingSupport,
    });
  const searchable = ['admin.clients.read', 'admin.customers.read', 'admin.applications.read'].some(
    (capability) => capabilities.includes(capability),
  );

  return (
    <PortalShell
      config={{
        home: '/admin',
        adminNavigation: true,
        product: 'Admin',
        workspace: 'Admin workspace',
        navLabel: 'Admin navigation',
        groups,
        footerItems,
        routeLabel: adminRouteLabel,
        logoutAction,
        user: {
          name: admin.email,
          initials: initials(admin.email),
          note: admin.hasTotp ? '2FA protected' : '2FA not enrolled',
          noteTone: admin.hasTotp ? 'text-brand-200' : 'text-amber-300',
        },
        headerNote: !admin.hasTotp ? (
          <span className="hidden items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-tiny font-bold text-warning xl:inline-flex">
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
              Search owners, customers and applications
            </label>
            <input
              id="admin-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Search owners, customers, applications…"
              className="min-h-9 w-full rounded-md border border-input bg-ink-25 pr-3 pl-9 text-base md:text-sm placeholder:text-ink-500 focus:border-brand-600 focus:bg-card"
            />
          </Form>
        ) : null,
      }}
    >
      <AdminSectionNav sections={sections} capabilities={capabilities} />
      {children}
    </PortalShell>
  );
}
