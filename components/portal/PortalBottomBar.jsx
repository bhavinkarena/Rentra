'use client';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
export default function PortalBottomBar({
  items,
  pathname,
  onMore,
  open,
  moreActive,
  keyboard = false,
}) {
  if (keyboard || pathname.includes('/setup') || pathname === '/partner/listings/new') return null;
  return (
    <nav
      aria-label="Owner primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md text-tiny font-semibold ${active ? 'bg-brand-50 text-brand-800' : 'text-ink-600'}`}
          >
            <Icon
              className="size-5"
              fill={active ? 'currentColor' : 'none'}
              fillOpacity={active ? 0.15 : 1}
              aria-hidden="true"
            />
            <span>{item.label}</span>
            {item.badge && (
              <span className="absolute top-1 right-1 rounded-full bg-brand-800 px-1 text-tiny text-white empty:hidden">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
      <button
        type="button"
        aria-label="More navigation"
        aria-expanded={open}
        aria-current={moreActive ? 'true' : undefined}
        onClick={onMore}
        className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-md text-tiny font-semibold ${moreActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600'}`}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
        More
      </button>
    </nav>
  );
}
