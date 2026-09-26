'use client';
import LoaderCircle from '@/components/ui/rentra-loader';

import { useState } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Send,
  ShieldCheck,
  Star,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import NavDrawer from '@/components/portal/NavDrawer';

// Grouped per the CP02 navigation plan. Only delivered destinations appear;
// later groups (Properties, Audit, Settings) arrive with their parts.
const NAV_GROUPS = [
  {
    label: 'Work queues',
    items: [
      {
        href: '/admin',
        label: 'Applications',
        icon: LayoutDashboard,
        exact: true,
        capability: 'admin.applications.read',
      },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/clients', label: 'Clients', icon: Users, capability: 'admin.clients.read' },
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

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href || pathname.startsWith('/admin/applications/');
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function routeLabel(pathname) {
  if (pathname.startsWith('/admin/applications/')) return 'Application review';
  if (pathname.startsWith('/admin/bookings/')) return 'Booking record';
  if (pathname.startsWith('/admin/support/')) return 'Support request';
  if (pathname.startsWith('/admin/clients/')) return 'Client';
  const item = NAV_GROUPS.flatMap((group) => group.items).find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );
  return item?.label || 'Admin console';
}

function LinkPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span className="relative ml-auto grid size-4 shrink-0 place-items-center" aria-hidden="true">
      <ChevronRight
        className={`size-4 transition-opacity ${pending ? 'opacity-0' : 'opacity-45'}`}
      />
      <LoaderCircle
        className={`absolute size-4  transition-opacity ${pending ? 'opacity-100' : 'opacity-0'}`}
      />
    </span>
  );
}

function NavigationLink({ item, pathname, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={`group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-meta font-semibold transition-colors ${
        active
          ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          : 'text-white/62 hover:bg-white/7 hover:text-white'
      }`}
    >
      {active ? (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-300"
          aria-hidden="true"
        />
      ) : null}
      <Icon
        className={`size-[18px] ${active ? 'text-brand-200' : 'text-white/45 group-hover:text-white/75'}`}
        aria-hidden="true"
      />
      <span>{item.label}</span>
      <LinkPendingHint />
    </Link>
  );
}

function Navigation({ pathname, onNavigate, capabilities }) {
  return (
    <nav className="mt-8 space-y-7" aria-label="Admin navigation">
      {NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => capabilities?.includes(item.capability)),
      }))
        .filter((group) => group.items.length)
        .map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[0.65rem] font-bold tracking-[0.16em] text-white/60 uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
    </nav>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-tiny font-semibold text-white/55 transition-colors hover:bg-white/7 hover:text-white disabled:cursor-wait"
    >
      {pending ? (
        <LoaderCircle className="size-4 " aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {pending ? <span className="sr-only">Signing out…</span> : 'Sign out'}
    </button>
  );
}

function AdminCard({ admin, logoutAction }) {
  const initials = (admin.email || 'Admin')
    .split('@')[0]
    .split(/[._\s-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-300 text-tiny font-bold text-brand-950">
          {initials || 'A'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-meta font-semibold text-white">{admin.email}</span>
          <span
            className={`mt-0.5 flex items-center gap-1 text-[0.68rem] font-medium ${admin.hasTotp ? 'text-brand-200' : 'text-amber-300'}`}
          >
            {admin.hasTotp ? (
              <ShieldCheck className="size-3" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-3" aria-hidden="true" />
            )}
            {admin.hasTotp ? '2FA protected' : '2FA not enrolled'}
          </span>
        </span>
      </div>
      <form action={logoutAction}>
        <LogoutButton />
      </form>
    </div>
  );
}

function SidebarContent({ pathname, admin, logoutAction, onNavigate }) {
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <RentraLogo tone="inverse" className="h-7 w-auto" />
        <span className="h-5 w-px bg-white/15" aria-hidden="true" />
        <span className="whitespace-nowrap text-tiny font-semibold text-white/50">admin</span>
      </Link>

      <Navigation pathname={pathname} onNavigate={onNavigate} capabilities={admin.capabilities} />

      <div className="mt-auto pt-6">
        <div className="mb-3 rounded-lg border border-brand-300/15 bg-brand-300/8 p-3">
          <div className="flex items-center gap-2 text-brand-100">
            <FileCheck2 className="size-4" aria-hidden="true" />
            <p className="text-tiny font-semibold">Operations console</p>
          </div>
          <p className="mt-1 text-[0.68rem] leading-4 text-white/65">
            Changes here can affect live bookings, partners, and customers.
          </p>
        </div>
        <AdminCard admin={admin} logoutAction={logoutAction} />
      </div>
    </div>
  );
}

export default function AdminShell({ children, admin, logoutAction }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (admin.email || 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ink-25 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-brand-950 lg:block">
        <SidebarContent pathname={pathname} admin={admin} logoutAction={logoutAction} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/80 bg-white/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="mr-3 grid size-9 place-items-center rounded-md border border-border bg-card text-ink-700 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <Link
            href="/admin"
            className="mr-3 flex items-center lg:hidden"
            aria-label="Rentra admin dashboard"
          >
            <RentraMark className="size-8" />
          </Link>

          <div className="min-w-0">
            <p className="truncate text-tiny font-medium text-ink-500">Admin workspace</p>
            <p className="truncate text-meta font-semibold text-ink-900">{routeLabel(pathname)}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {!admin.hasTotp ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1.5 text-tiny font-bold text-amber-800 md:inline-flex">
                <TriangleAlert className="size-3.5" aria-hidden="true" /> 2FA not enrolled
              </span>
            ) : null}
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-tiny font-semibold text-ink-700 transition-colors hover:bg-ink-50 sm:inline-flex"
            >
              View Rentra <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
            <span
              className="grid size-9 place-items-center rounded-full bg-brand-100 text-meta font-bold text-brand-800 ring-1 ring-brand-200"
              title={admin.email}
              aria-label={`Signed in as ${admin.email}`}
            >
              {initial}
            </span>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>

      <NavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label="Admin navigation">
        <SidebarContent
          pathname={pathname}
          admin={admin}
          logoutAction={logoutAction}
          onNavigate={() => setMobileOpen(false)}
        />
      </NavDrawer>
    </div>
  );
}
