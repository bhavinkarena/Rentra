'use client';

import { Building2, CalendarDays, LayoutDashboard, Settings2, Star } from 'lucide-react';
import PortalShell from '@/components/portal/PortalShell';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { href: '/partner', label: 'Overview', icon: LayoutDashboard, exact: true },
      {
        href: '/partner/listings',
        label: 'Properties',
        icon: Building2,
        capability: 'client.listings.write',
      },
      {
        href: '/partner/calendar',
        label: 'Portfolio calendar',
        icon: CalendarDays,
        capability: 'client.calendar.read',
      },
      {
        href: '/partner/bookings',
        label: 'Bookings',
        icon: CalendarDays,
        capability: 'client.records.read',
      },
      { href: '/partner/reviews', label: 'Reviews', icon: Star, capability: 'client.reviews.read' },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/partner/settings', label: 'Settings & payouts', icon: Settings2 }],
  },
];

function routeLabel(pathname) {
  if (pathname.startsWith('/partner/calendar')) return 'Portfolio calendar';
  if (pathname.startsWith('/partner/bookings')) return 'Bookings';
  if (pathname.startsWith('/partner/listings/')) return 'Property workspace';
  if (pathname === '/partner/listings') return 'Properties';
  if (pathname.startsWith('/partner/reviews')) return 'Reviews';
  if (pathname.startsWith('/partner/settings')) return 'Settings & payouts';
  if (pathname.startsWith('/partner/onboarding')) return 'Partner verification';
  return 'Overview';
}

export default function PartnerShell({ children, user, logoutAction }) {
  const displayName = user.name || user.email || 'Rentra partner';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      // Not a link: the required step is stated in text, not only a hover title.
      locked: Boolean(item.capability && !user.capabilities?.includes(item.capability)),
      lockedNote: 'After your partner profile is approved',
    })),
  }));

  return (
    <PortalShell
      config={{
        home: '/partner',
        product: 'Owners',
        workspace: 'Owner workspace',
        navLabel: 'Owner navigation',
        groups,
        routeLabel,
        logoutAction,
        profileHref: '/partner/settings',
        user: {
          name: displayName,
          initials,
          note: user.accountStatus === 'active' ? 'Approved partner' : 'Verification in progress',
        },
      }}
    >
      {children}
    </PortalShell>
  );
}
