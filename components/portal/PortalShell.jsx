'use client';
import useMobileKeyboard from './useMobileKeyboard';
import NavigationProgress from '@/components/navigation/NavigationProgress';
import OwnerGlobalSearch from '@/components/partner/OwnerGlobalSearch';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  Bell,
  ArrowUpRight,
  Lock,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import LoaderCircle from '@/components/ui/rentra-loader';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import NavDrawer from './NavDrawer';
import UnsavedChangesGuard from './UnsavedChangesGuard';
import PortalBottomBar from './PortalBottomBar';

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

function readRail(owner = false) {
  try {
    const saved = localStorage.getItem(RAIL_KEY);
    return saved == null ? owner && window.innerWidth < 1024 : saved === '1';
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
  window.addEventListener('resize', callback);
  return () => {
    window.removeEventListener(RAIL_EVENT, callback);
    window.removeEventListener('storage', callback);
    window.removeEventListener('resize', callback);
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
    <>
      <NavigationProgress active />
      <LoaderCircle className="ml-auto size-3.5 shrink-0 text-white/70" aria-hidden="true" />
    </>
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
    rail ? 'size-11 justify-center' : 'min-h-11 px-2.5'
  }`;

  if (item.onClick)
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          item.onClick();
        }}
        className={`${base} text-on-dark-muted`}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {rail ? <RailTip>{item.label}</RailTip> : <span>{item.label}</span>}
      </button>
    );
  if (item.locked) {
    // DS-06: one focusable row; the reason is announced with the label.
    const noteId = `locked-${item.href.replace(/\W+/g, '-')}`;
    return (
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={noteId}
        className={`${base} cursor-not-allowed text-left text-on-dark-muted`}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {rail ? (
          <RailTip>
            {item.label}
            <span id={noteId}> — {item.lockedNote}</span>
          </RailTip>
        ) : (
          <>
            <span className="min-w-0">
              {item.label}
              <span
                id={noteId}
                className="block text-meta leading-4 font-normal text-on-dark-muted"
              >
                {item.lockedNote}
              </span>
            </span>
            <Lock className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </>
        )}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={`${base} ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-on-dark-muted hover:bg-white/7 hover:text-white'
      }`}
    >
      {active ? (
        <span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-champagne"
          aria-hidden="true"
        />
      ) : null}
      <Icon
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 1}
        className={`size-5 shrink-0 ${active ? 'text-brand-200' : 'text-on-dark-muted group-hover:text-on-dark-muted'}`}
        aria-hidden="true"
      />
      {rail ? (
        <RailTip>{item.label}</RailTip>
      ) : (
        <span className={item.wrap ? 'min-w-0 flex-1 whitespace-normal' : 'truncate'}>
          {item.label}
        </span>
      )}
      {item.badge ? (
        <span
          className={
            rail
              ? 'absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-champagne px-1 text-tiny font-bold text-brand-950 empty:hidden'
              : 'ml-auto rounded-full bg-champagne px-1.5 text-tiny font-semibold text-brand-950 tabular empty:hidden'
          }
        >
          {typeof item.badge === 'number' ? (item.badge > 9 ? '9+' : item.badge) : item.badge}
          {typeof item.badge === 'number' ? <span className="sr-only"> waiting</span> : null}
        </span>
      ) : null}
      {!rail ? <PendingHint /> : null}
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
      className={`flex items-center gap-2 rounded-md text-tiny font-semibold text-on-dark-muted hover:bg-white/7 hover:text-white disabled:cursor-wait ${
        rail ? 'size-10 justify-center' : 'mt-1 min-h-11 w-full px-2.5 py-2 text-left lg:min-h-10'
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
          <RentraMark
            tone="inverse"
            className="size-8 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
          />
          <PanelLeftOpen
            className="absolute size-5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
          <RailTip>Expand sidebar</RailTip>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-1.5">
          <Link
            href={config.home}
            onClick={onNavigate}
            className={
              config.ownerNavigation
                ? 'flex flex-col items-start gap-1'
                : 'flex items-center gap-2.5'
            }
          >
            <RentraLogo tone="inverse" className="h-6 w-auto" />
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-tiny font-semibold text-brand-100">
              {config.product}
            </span>
          </Link>
          {onToggleRail ? (
            <button
              type="button"
              onClick={onToggleRail}
              className="ml-auto grid size-8 place-items-center rounded-md text-on-dark-muted hover:bg-white/10 hover:text-white"
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
            {group.hideLabel ? null : rail ? (
              <span className="my-1 h-px w-6 bg-white/15" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-2.5 text-tiny font-semibold text-brand-200">{group.label}</p>
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

      {config.footerItems?.length ? (
        <nav
          aria-label="Help and support"
          className={`mt-4 border-t border-white/10 pt-3 ${rail ? 'flex flex-col items-center gap-1' : 'space-y-0.5'}`}
        >
          {config.footerItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              pathname={pathname}
              rail={rail}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      ) : null}
      {config.ownerNavigation && onNavigate && (
        <Link href="/" className="mt-4 flex min-h-11 items-center px-2.5 text-meta text-white">
          View Rentra <ArrowUpRight className="ml-2 size-4" aria-hidden="true" />
        </Link>
      )}
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
                className={`block truncate text-tiny font-medium ${config.user.noteTone ?? 'text-brand-200'}`}
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
  const keyboard = useMobileKeyboard();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const rail = useSyncExternalStore(
    subscribeRail,
    () => readRail(config.ownerNavigation),
    () => false,
  );
  const toggleRail = () => writeRail(!rail);
  const owner = config.ownerNavigation;
  // DS-06: after a client navigation, start keyboard and screen-reader users at
  // the new page (the h1 when there is one), not at the link they pressed.
  const main = useRef(null);
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = null;
    if (main.current?.contains(document.activeElement) && document.activeElement !== document.body)
      return; // The page already placed focus itself (a dialog, an error summary).
    const node = main.current;
    if (!node) return;
    const toHeading = () => {
      const heading = node.querySelector('h1');
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (toHeading()) return;
    // A loading skeleton has no h1 yet: hold focus on main, then move to the
    // h1 when the page streams in, unless the user has moved on meanwhile.
    node.focus({ preventScroll: true });
    const observer = new MutationObserver(() => {
      if (document.activeElement !== node || toHeading()) observer.disconnect();
    });
    observer.observe(node, { childList: true, subtree: true });
    const stop = setTimeout(() => observer.disconnect(), 10000);
    return () => {
      observer.disconnect();
      clearTimeout(stop);
    };
  }, [pathname]);

  return (
    <div
      data-admin-workspace={config.adminNavigation || undefined}
      data-keyboard-open={keyboard}
      className={`portal-ui min-h-dvh bg-ink-25 ${owner ? 'owner-portal md:flex' : 'lg:flex'}`}
    >
      <UnsavedChangesGuard />
      <a
        href="#portal-main"
        className="sr-only fixed top-2 left-2 z-50 rounded-md bg-white p-3 font-semibold text-brand-800 shadow-lg focus:not-sr-only"
      >
        Skip to main content
      </a>
      {/* Width animates; the full layout is clipped while it grows, and the
          rail stays unclipped so its tooltips can extend past it. */}
      <aside
        data-surface="inverse"
        className={`sticky top-0 hidden h-dvh shrink-0 bg-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none ${owner ? 'md:block' : 'lg:block'} ${
          rail ? 'w-16 overflow-visible' : 'w-[236px] overflow-hidden'
        }`}
      >
        <Sidebar config={config} pathname={pathname} rail={rail} onToggleRail={toggleRail} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card px-4 py-2 sm:px-6 lg:min-h-14">
          {!owner && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-card text-ink-700 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          )}
          <div className={owner || config.adminNavigation ? 'hidden' : 'min-w-0'}>
            <p className="truncate text-tiny font-medium text-ink-500">{config.workspace}</p>
            <p className="truncate text-meta font-semibold text-ink-900">
              {config.routeLabel(pathname)}
            </p>
          </div>
          {owner ? (
            <div className="min-w-0 flex-1 sm:max-w-xl">
              <OwnerGlobalSearch />
            </div>
          ) : config.search ? (
            <div className="min-w-0 flex-1 sm:max-w-xl">{config.search}</div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {config.headerNote}
            {config.bookingAction}
            {!owner && !config.bookingAction && (
              <Link
                href="/"
                className="hidden min-h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-tiny font-semibold text-ink-700 hover:bg-ink-50 sm:inline-flex"
              >
                View Rentra <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
            {owner ? (
              <>
                {config.headerAction}
                <Link
                  href="/partner/updates"
                  aria-label="Inbox"
                  aria-describedby="owner-inbox-count"
                  className="relative grid size-11 place-items-center rounded-md text-ink-700 hover:bg-ink-50"
                >
                  <Bell className="size-5" aria-hidden="true" />
                  <span
                    id="owner-inbox-count"
                    className="absolute top-0 right-0 rounded-full bg-brand-800 px-1 text-tiny text-white empty:hidden"
                  >
                    {config.inboxBadge}
                  </span>
                </Link>
                <Link
                  href={config.profileHref}
                  aria-label="Open account settings"
                  className="grid size-11 place-items-center rounded-full bg-brand-100 text-tiny font-bold text-brand-800"
                >
                  {config.user.initials}
                </Link>
              </>
            ) : config.profileHref ? (
              <Link
                href={config.profileHref}
                aria-label="Open account settings"
                className="grid size-11 place-items-center rounded-full bg-brand-100 text-tiny font-bold text-brand-800 ring-1 ring-brand-200 lg:size-9"
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

        <main
          id="portal-main"
          ref={main}
          tabIndex={-1}
          className={`min-h-[calc(100dvh-3.5rem)] scroll-mt-16 ${owner ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}
        >
          {children}
        </main>
      </div>

      {owner && (
        <PortalBottomBar
          keyboard={keyboard}
          items={config.bottomItems}
          pathname={pathname}
          open={mobileOpen}
          onMore={() => setMobileOpen(true)}
          moreActive={!config.bottomItems.some((item) => isActive(pathname, item))}
        />
      )}
      <NavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label={config.navLabel}>
        <Sidebar
          config={owner ? { ...config, groups: config.mobileGroups } : config}
          pathname={pathname}
          rail={false}
          onNavigate={() => setMobileOpen(false)}
        />
      </NavDrawer>
    </div>
  );
}
