'use client';

import { adminSearchHref, permittedSearchTypes } from '@/lib/domain/admin-search';
import { searchAdminRecords } from '@/lib/actions/admin';
import {
  Activity,
  BarChart3,
  BedDouble,
  Building2,
  CalendarDays,
  ChartPie,
  CreditCard,
  FileSearch,
  FileText,
  Gavel,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  LibraryBig,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquareText,
  Newspaper,
  Percent,
  ReceiptText,
  RotateCcw,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Star,
  TriangleAlert,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import PortalShell from '@/components/portal/PortalShell';
import OwnerGlobalSearch from '@/components/partner/OwnerGlobalSearch';
import AdminSectionNav from './AdminSectionNav';
import {
  adminRouteLabel,
  adminTabMatches,
  permittedAdminSections,
} from '@/lib/domain/admin-navigation';

const ICONS = {
  '/admin': LayoutDashboard,
  '/admin/analytics': BarChart3,
  '/admin/activity': Activity,
  '/admin/applications': FileText,
  '/admin/properties': Building2,
  '/admin/reviews': Star,
  '/admin/bookings': CalendarDays,
  '/admin/booking-cases': ShieldAlert,
  '/admin/clients': Users,
  '/admin/customers': UserRound,
  '/admin/finance': Wallet,
  '/admin/finance/payments': ReceiptText,
  '/admin/finance/refunds': RotateCcw,
  '/admin/finance/statements': FileSearch,
  '/admin/finance/payouts': Landmark,
  '/admin/disputes': Gavel,
  '/admin/finance/commission': Percent,
  '/admin/finance/tax': Scale,
  '/admin/finance/hotel-payouts': BedDouble,
  '/admin/finance/hotel-analytics': ChartPie,
  '/admin/operations': HeartPulse,
  '/admin/notifications': Mail,
  '/admin/privacy': Lock,
  '/admin/audit': ScrollText,
  '/admin/content': Newspaper,
  '/admin/catalogues': LibraryBig,
  '/admin/payments': CreditCard,
  '/admin/security': ShieldCheck,
  '/admin/support': MessageSquareText,
};

// Section heading colours on the dark sidebar, so groups scan at a glance.
const HEADING_TONES = {
  reviews: 'text-amber-300',
  bookings: 'text-sky-300',
  people: 'text-emerald-300',
  finance: 'text-yellow-200',
  'hotel-finance': 'text-orange-300',
  operations: 'text-cyan-300',
  settings: 'text-violet-300',
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
  const groups = sections
    .filter((section) => !section.footer)
    .map((section) => ({
      label: section.label,
      hideLabel: section.key === 'dashboard',
      labelClass: `uppercase tracking-wider ${HEADING_TONES[section.key] ?? ''}`,
      items: section.tabs.map((entry) => ({
        href: entry.href,
        label: entry.short ?? entry.label,
        icon: ICONS[entry.href],
        match: (pathname) => adminTabMatches(pathname, entry),
        badge:
          entry.href === '/admin/applications'
            ? counts.waitingApplications
            : entry.href === '/admin/support'
              ? counts.waitingSupport
              : undefined,
      })),
    }));
  const footerItems = [{ href: '/admin/help', label: 'Help & guide', icon: LifeBuoy }];
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
