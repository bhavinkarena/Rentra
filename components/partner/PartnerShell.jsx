'use client';
import {
  Sun,
  CalendarDays,
  ClipboardList,
  Building2,
  Wallet,
  Star,
  Users,
  LifeBuoy,
  Settings2,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import BookPropertyButton from './BookPropertyButton';
import PortalShell from '@/components/portal/PortalShell';
import NavDrawer from '@/components/portal/NavDrawer';
import OwnerTour from './OwnerTour';
import LegacyPartnerShell from './LegacyPartnerShell';
import { ownerRouteLabel, ownerNavMatch } from '@/lib/domain/owner-navigation';

const primary = [
  { href: '/partner', label: 'Dashboard', icon: Sun, exact: true },
  {
    href: '/partner/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    capability: 'client.calendar.read',
  },
  {
    href: '/partner/bookings',
    label: 'Bookings',
    icon: ClipboardList,
    capability: 'client.records.read',
    badgeKey: 'bookingsAction',
  },
  {
    href: '/partner/listings',
    label: 'Properties',
    icon: Building2,
    capability: 'client.listings.write',
    badgeKey: 'propertiesNeedsChanges',
  },
  { href: '/partner/earnings', label: 'Earnings', icon: Wallet, capability: 'client.finance.read' },
];
const more = [
  {
    href: '/partner/reviews',
    label: 'Reviews',
    icon: Star,
    capability: 'client.reviews.read',
    badgeKey: 'reviewsUnreplied',
  },
  { href: '/partner/team', label: 'Caretakers', icon: Users, capability: 'client.team.read' },
  { href: '/partner/help', label: 'Help & support', icon: LifeBuoy, badgeKey: 'supportAwaiting' },
  { href: '/partner/settings', label: 'Settings', icon: Settings2 },
];
export default function PartnerShell(props) {
  if (process.env.NEXT_PUBLIC_OWNER_V2_NAV === 'false') return <LegacyPartnerShell {...props} />;
  return <OwnerShell {...props} />;
}
function OwnerShell({ children, user, logoutAction, counts = {}, completion }) {
  const [lockedOpen, setLockedOpen] = useState(false);
  const approved = user.accountStatus === 'active';
  const decorate = (items) =>
    items
      .filter((item) => !item.capability || user.capabilities?.includes(item.capability))
      .map((item) => ({
        ...item,
        match: (path) => ownerNavMatch(path, item.href),
        badge: item.badge ?? counts[item.badgeKey],
      }));
  const main = decorate(
    approved
      ? primary
      : [
          {
            ...primary[0],
            label: 'Get verified',
            badge: completion ? `${completion.done} of ${completion.total}` : undefined,
          },
          primary[3],
        ],
  );
  const secondary = decorate(more);
  const locked = !approved
    ? {
        href: '#verification-tools',
        label: 'Calendar, bookings, earnings and more unlock after approval',
        icon: Lock,
        onClick: () => setLockedOpen(true),
      }
    : null;
  const name = user.name || user.email || 'Rentra owner';
  const config = {
    ownerNavigation: true,
    home: '/partner',
    product: 'for owners',
    workspace: 'Owner workspace',
    navLabel: 'Owner navigation',
    groups: [
      { label: approved ? 'Workspace' : 'Get started', items: main },
      { label: 'More', items: [...secondary, ...(locked ? [locked] : [])] },
    ],
    mobileGroups: [
      { label: 'More', items: [...main.slice(4), ...secondary, ...(locked ? [locked] : [])] },
    ],
    bottomItems: approved ? main.slice(0, 4) : main,
    routeLabel: (path) => ownerRouteLabel(path, approved),
    logoutAction,
    profileHref: '/partner/settings',
    inboxBadge: counts.unreadUpdates,
    headerAction: counts.setup,
    bookingAction: user.hasCustomerAccount === true ? <BookPropertyButton /> : null,
    user: {
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      note: approved ? 'Approved owner' : 'Verification in progress',
    },
  };
  return (
    <>
      <PortalShell config={config}>{children}</PortalShell>
      <OwnerTour guide={user.ownerGuide ?? {}} />
      <NavDrawer
        open={lockedOpen}
        onClose={() => setLockedOpen(false)}
        label="What unlocks after approval"
        desktop
      >
        <div className="space-y-5 px-6 pt-20 pb-6 text-white">
          <h2 className="text-h3">What unlocks after approval</h2>
          <p className="text-meta text-brand-100">
            Calendar, bookings, earnings and more unlock after approval.
          </p>
          {[
            [CalendarDays, 'Calendar', 'Choose when guests can visit.'],
            [ClipboardList, 'Bookings', 'Manage arrivals and departures.'],
            [Wallet, 'Earnings', 'Track booked rent and payouts.'],
            [Star, 'Reviews', 'Read and reply to guest reviews.'],
            [Users, 'Caretakers', 'Give caretakers access to their visits.'],
          ].map(([Icon, title, description]) => (
            <div key={title} className="flex gap-3">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-meta text-brand-100">{description}</p>
              </div>
            </div>
          ))}
          <Link
            href={completion?.remaining?.[0]?.href || '/partner'}
            onClick={() => setLockedOpen(false)}
            className="flex min-h-11 items-center justify-center rounded-md bg-white px-3 text-brand-900"
          >
            Continue verification
          </Link>
        </div>
      </NavDrawer>
    </>
  );
}
