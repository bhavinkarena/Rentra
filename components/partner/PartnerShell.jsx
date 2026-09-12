'use client';

import { useState } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { href: '/partner', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/partner/listings', label: 'Properties', icon: Building2, requiresActive: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/partner/settings', label: 'Settings & payouts', icon: Settings2 },
    ],
  },
];

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function routeLabel(pathname) {
  if (pathname.startsWith('/partner/listings/')) return 'Property workspace';
  if (pathname === '/partner/listings') return 'Properties';
  if (pathname.startsWith('/partner/settings')) return 'Settings & payouts';
  if (pathname.startsWith('/partner/onboarding')) return 'Partner verification';
  return 'Overview';
}

function LinkPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span className="relative ml-auto grid size-4 shrink-0 place-items-center" aria-hidden="true">
      <ChevronRight
        className={`size-4 transition-opacity ${pending ? 'opacity-0' : 'opacity-55'}`}
      />
      <LoaderCircle
        className={`absolute size-4 animate-spin transition-opacity ${pending ? 'opacity-100' : 'opacity-0'}`}
      />
    </span>
  );
}

function NavigationLink({ item, pathname, enabled, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  if (!enabled) {
    return (
      <div
        className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-meta font-medium text-white/35"
        title="Available after your partner profile is approved"
      >
        <Icon className="size-[18px]" aria-hidden="true" />
        <span>{item.label}</span>
        <Lock className="ml-auto size-3.5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={`group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-meta font-semibold transition-colors ${
        active
          ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          : 'text-white/64 hover:bg-white/7 hover:text-white'
      }`}
    >
      {active ? (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-300" aria-hidden="true" />
      ) : null}
      <Icon className={`size-[18px] ${active ? 'text-brand-200' : 'text-white/48 group-hover:text-white/75'}`} aria-hidden="true" />
      <span>{item.label}</span>
      <LinkPendingHint />
    </Link>
  );
}

function Navigation({ pathname, accountActive, onNavigate }) {
  return (
    <nav className="mt-8 space-y-7" aria-label="Owner navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[0.65rem] font-bold tracking-[0.16em] text-white/35 uppercase">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                pathname={pathname}
                enabled={!item.requiresActive || accountActive}
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
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

function UserCard({ user, logoutAction }) {
  const displayName = user.name || user.email || 'Rentra partner';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-300 text-tiny font-bold text-brand-950">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-meta font-semibold text-white">{displayName}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[0.68rem] font-medium text-brand-200">
            {user.accountStatus === 'active' ? (
              <>
                <ShieldCheck className="size-3" aria-hidden="true" /> Verified partner
              </>
            ) : (
              'Verification in progress'
            )}
          </span>
        </span>
      </div>
      <form action={logoutAction}>
        <LogoutButton />
      </form>
    </div>
  );
}

function SidebarContent({ pathname, user, logoutAction, onNavigate }) {
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link href="/partner" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <RentraLogo tone="inverse" className="h-7 w-auto" />
        <span className="h-5 w-px bg-white/15" aria-hidden="true" />
        <span className="whitespace-nowrap text-tiny font-semibold text-white/50">for owners</span>
      </Link>

      <Navigation
        pathname={pathname}
        accountActive={user.accountStatus === 'active'}
        onNavigate={onNavigate}
      />

      <div className="mt-auto pt-6">
        <div className="mb-3 rounded-lg border border-brand-300/15 bg-brand-300/8 p-3">
          <p className="text-tiny font-semibold text-brand-100">Need a hand?</p>
          <p className="mt-1 text-[0.68rem] leading-4 text-white/45">
            Rentra support can help with verification and listing setup.
          </p>
        </div>
        <UserCard user={user} logoutAction={logoutAction} />
      </div>
    </div>
  );
}

export default function PartnerShell({ children, user, logoutAction }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user.name || user.email || 'Partner';
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ink-25 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-brand-950 lg:block">
        <SidebarContent pathname={pathname} user={user} logoutAction={logoutAction} />
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

          <Link href="/partner" className="mr-3 flex items-center lg:hidden" aria-label="Rentra owner overview">
            <RentraMark className="size-8" />
          </Link>

          <div className="min-w-0">
            <p className="truncate text-tiny font-medium text-ink-500">Owner workspace</p>
            <p className="truncate text-meta font-semibold text-ink-900">{routeLabel(pathname)}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-tiny font-semibold text-ink-700 transition-colors hover:bg-ink-50 sm:inline-flex"
            >
              View Rentra
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/partner/settings"
              aria-label="Open account settings"
              className="grid size-9 place-items-center rounded-full bg-brand-100 text-meta font-bold text-brand-800 ring-1 ring-brand-200"
            >
              {initial}
            </Link>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-900/55 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative h-full w-[min(86vw,320px)] bg-brand-950 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Owner navigation"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-md bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent
              pathname={pathname}
              user={user}
              logoutAction={logoutAction}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
