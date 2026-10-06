'use client';

import { adminSearchHref, permittedSearchTypes } from '@/lib/domain/admin-search';
import { searchAdminRecords } from '@/lib/actions/admin';
import {
  Activity,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  Settings,
  ShieldAlert,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react';
import PortalShell from '@/components/portal/PortalShell';
import OwnerGlobalSearch from '@/components/partner/OwnerGlobalSearch';
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

const SEARCH_SECTIONS = {
  clients: { icon: Users, style: 'bg-brand-50 text-brand-600' },
  customers: { icon: UserRound, style: 'bg-info-bg text-info' },
  applications: { icon: FileText, style: 'bg-warning-bg text-warning' },
  properties: { icon: Building2, style: 'bg-event-adjustment-bg text-event-adjustment' },
  bookings: { icon: CalendarDays, style: 'bg-amber-100 text-amber-700' },
  cases: { icon: ShieldAlert, style: 'bg-danger-bg text-danger' },
};

async function adminSearch(q, type) {
  const sections = await searchAdminRecords(q, type);
  return {
    items: sections.flatMap((section) => section.items),
    totals: Object.fromEntries(sections.map((section) => [section.key, section.total])),
    failed: sections.filter((section) => section.failure).map((section) => section.key),
  };
}

const searchResultsHref = (q, type) => adminSearchHref({ q, type });

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
  const searchTypes = permittedSearchTypes(capabilities);
  const searchable = searchTypes.length > 0;
  const searchLabel = `Search ${searchTypes.map((type) => type.label.toLowerCase()).join(', ')}`;

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
          <OwnerGlobalSearch
            search={adminSearch}
            label={searchLabel}
            placeholder="Search owners, bookings and more"
            pages={sections.flatMap((section) => section.tabs.map((t) => [t.label, t.href]))}
            types={Object.fromEntries(
              searchTypes.map((t) => [t.key, { label: t.label, ...SEARCH_SECTIONS[t.key] }]),
            )}
            filters={[['all', 'All'], ...searchTypes.map((t) => [t.key, t.label])]}
            moreHref={searchResultsHref}
          />
        ) : null,
      }}
    >
      <AdminSectionNav sections={sections} capabilities={capabilities} />
      {children}
    </PortalShell>
  );
}
