'use client';

import { useState, useSyncExternalStore } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { ArrowUpRight, Lock, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import LoaderCircle from '@/components/ui/rentra-loader';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import NavDrawer from './NavDrawer';

/**
 * One shell for the client and Super Admin workspaces.
 *
 * `groups`: [{ label, items: [{ href, label, icon, exact?, match?, badge?,
 * locked?, lockedNote? }] }]. Filtering by capability happens in the caller.
 * The sidebar collapses to an icon rail on desktop; the choice is a per-browser
 * convenience kept in localStorage. `.portal-ui` applies the denser workspace
 * type scale (globals.css) without touching the customer site.
 */

const RAIL_KEY = 'rentra-portal-rail';
const RAIL_EVENT = 'rentra-portal-rail';

function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false; // Storage unavailable: keep the full sidebar.
  }
}
function writeRail(value) {
  try {
    localStorage.setItem(RAIL_KEY, value ? '1' : '0');
  } catch {
    /* Preference not kept. */
  }
  window.dispatchEvent(new Event(RAIL_EVENT));
}
function subscribeRail(callback) {
  window.addEventListener(RAIL_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(RAIL_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function isActive(pathname, item) {
  if (item.match) return item.match(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function PendingHint() {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle className="ml-auto size-3.5 shrink-0 text-white/70" aria-hidden="true" />
  ) : null;
}

/** Collapsed-rail label: visible on hover and keyboard focus, read by screen readers. */
function RailTip({ children }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md bg-ink-900 px-2 py-1 text-tiny font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

function NavItem({ item, pathname, rail, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);
  const base = `group relative flex items-center gap-2.5 rounded-md text-meta font-semibold transition-colors ${
    rail ? 'size-10 justify-center' : 'min-h-9 px-2.5'
  }`;

  if (item.locked) {
    return (
      <div className={`${base} cursor-not-allowed text-white/55`} tabIndex={rail ? 0 : undefined}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {rail ? (
          <RailTip>
            {item.label} — {item.lockedNote}
          </RailTip>
        ) : (
          <>
            <span className="min-w-0">
              {item.label}
              <span className="block text-[0.65rem] leading-3 font-normal text-white/55">
                {item.lockedNote}
              </span>
            </span>
            <Lock className="ml-auto size-3 shrink-0" aria-hidden="true" />
          </>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={`${base} ${
        active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/7 hover:text-white'
      }`}
    >
      {active ? (
        <span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-300"
          aria-hidden="true"
        />
      ) : null}
      <Icon
        className={`size-4 shrink-0 ${active ? 'text-brand-200' : 'text-white/55 group-hover:text-white/80'}`}
        aria-hidden="true"
      />
      {rail ? <RailTip>{item.label}</RailTip> : <span className="truncate">{item.label}</span>}
      {item.badge ? (
        <span
          className={
            rail
              ? 'absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-amber-300 px-1 text-[0.6rem] font-bold text-brand-950'
              : 'ml-auto rounded-full bg-amber-300 px-1.5 text-[0.65rem] font-bold text-brand-950 tabular'
          }
        >
          {item.badge}
          <span className="sr-only"> waiting</span>
        </span>
      ) : null}
      {!rail && !item.badge ? <PendingHint /> : null}
    </Link>
  );
}

function SignOut({ rail }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={rail ? 'Sign out' : undefined}
      className={`flex items-center gap-2 rounded-md text-tiny font-semibold text-white/65 hover:bg-white/7 hover:text-white disabled:cursor-wait ${
        rail ? 'size-10 justify-center' : 'mt-1 w-full px-2.5 py-2 text-left'
      }`}
    >
      {pending ? (
        <LoaderCircle className="size-4" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      <span className={rail ? 'sr-only' : undefined}>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}

function Sidebar({ config, pathname, rail, onNavigate, onToggleRail }) {
  return (
    <div
      className={`flex h-full flex-col py-4 ${rail ? 'items-center px-2' : 'w-[236px] px-3 animate-in fade-in duration-300 motion-reduce:animate-none'}`}
    >
      {rail ? (
        // Collapsed: the mark is the expand control; hover or focus reveals the icon.
        <button
          type="button"
          onClick={onToggleRail}
          className="group relative grid size-10 place-items-center rounded-md hover:bg-white/10 focus-visible:bg-white/10"
          aria-label="Expand sidebar"
        >
          <RentraMark className="size-8 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
          <PanelLeftOpen
            className="absolute size-5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
          <RailTip>Expand sidebar</RailTip>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-1.5">
          <Link href={config.home} onClick={onNavigate} className="flex items-center gap-2.5">
            <RentraLogo tone="inverse" className="h-6 w-auto" />
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-brand-100 uppercase">
              {config.product}
            </span>
          </Link>
          {onToggleRail ? (
            <button
              type="button"
              onClick={onToggleRail}
              className="ml-auto grid size-8 place-items-center rounded-md text-white/65 hover:bg-white/10 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      )}

      <nav
        className={`mt-5 min-h-0 flex-1 space-y-5 ${rail ? 'overflow-visible' : 'portal-scroll -mr-1.5 overflow-y-auto pr-1.5'}`}
        aria-label={config.navLabel}
      >
        {config.groups.map((group) => (
          <div key={group.label} className={rail ? 'flex flex-col items-center gap-1' : undefined}>
            {rail ? (
              <span className="my-1 h-px w-6 bg-white/15" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-2.5 text-[0.62rem] font-bold tracking-[0.14em] text-brand-300 uppercase">
                {group.label}
              </p>
            )}
            <div className={rail ? 'flex flex-col items-center gap-1' : 'space-y-0.5'}>
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  rail={rail}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`mt-4 border-t border-white/10 pt-3 ${rail ? 'flex flex-col items-center' : ''}`}
      >
        {rail ? (
          <span
            className="grid size-9 place-items-center rounded-full bg-brand-300 text-tiny font-bold text-brand-950"
            title={config.user.name}
            aria-hidden="true"
          >
            {config.user.initials}
          </span>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 px-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-300 text-tiny font-bold text-brand-950">
              {config.user.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-meta font-semibold text-white">
                {config.user.name}
              </span>
              <span
                className={`block truncate text-[0.68rem] font-medium ${config.user.noteTone ?? 'text-brand-200'}`}
              >
                {config.user.note}
              </span>
            </span>
          </div>
        )}
        <form action={config.logoutAction}>
          <SignOut rail={rail} />
        </form>
      </div>
    </div>
  );
}

export default function PortalShell({ config, children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const rail = useSyncExternalStore(subscribeRail, readRail, () => false);
  const toggleRail = () => writeRail(!rail);

  return (
    <div className="portal-ui min-h-screen bg-ink-25 lg:flex">
      {/* Width animates; the full layout is clipped while it grows, and the
          rail stays unclipped so its tooltips can extend past it. */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 bg-brand-950 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block ${
          rail ? 'w-16 overflow-visible' : 'w-[236px] overflow-hidden'
        }`}
      >
        <Sidebar config={config} pathname={pathname} rail={rail} onToggleRail={toggleRail} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-md border border-border bg-card text-ink-700 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 shrink-0">
            <p className="truncate text-tiny font-medium text-ink-500">{config.workspace}</p>
            <p className="truncate text-meta font-semibold text-ink-900">
              {config.routeLabel(pathname)}
            </p>
          </div>
          {config.search ? (
            <div className="ml-auto hidden w-full max-w-md md:block">{config.search}</div>
          ) : null}
          <div className={`flex items-center gap-2 ${config.search ? 'md:ml-3' : ''} ml-auto`}>
            {config.headerNote}
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-tiny font-semibold text-ink-700 hover:bg-ink-50 sm:inline-flex"
            >
              View Rentra <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            {config.profileHref ? (
              <Link
                href={config.profileHref}
                aria-label="Open account settings"
                className="grid size-8 place-items-center rounded-full bg-brand-100 text-tiny font-bold text-brand-800 ring-1 ring-brand-200"
              >
                {config.user.initials}
              </Link>
            ) : (
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-100 text-tiny font-bold text-brand-800 ring-1 ring-brand-200"
                aria-label={`Signed in as ${config.user.name}`}
                role="img"
              >
                {config.user.initials}
              </span>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>

      <NavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label={config.navLabel}>
        <Sidebar
          config={config}
          pathname={pathname}
          rail={false}
          onNavigate={() => setMobileOpen(false)}
        />
      </NavDrawer>
    </div>
  );
}
