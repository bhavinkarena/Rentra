'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import { pageVertical, searchTabHref, verticalTabs } from '@/lib/domain/vertical-ui';
import { VerticalIcon } from './icons/vertical-icons';

const LOOK = {
  // md+, centred in the header; fades out when the search docks and the pill takes the centre.
  header: {
    list: 'flex h-full items-stretch gap-6',
    link: 'group relative flex h-full items-center gap-2.5 px-1.5 text-[0.9375rem] font-semibold text-ink-500 transition-colors hover:text-ink-900 aria-[current=page]:text-ink-900 aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-ink-900',
    icon: 'size-8 transition-transform duration-150 ease-out motion-safe:group-hover:-translate-y-0.5',
  },
  // Below md, two equal pills at the top of a photo hero (the photo chip recipe).
  hero: {
    list: 'mb-5 grid grid-cols-2 gap-2 md:hidden',
    link: 'flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 text-meta font-semibold text-white backdrop-blur aria-[current=page]:border-white aria-[current=page]:bg-white aria-[current=page]:text-ink-900',
    icon: 'size-6.5',
  },
  // Below md, above the search fields on discovery pages.
  light: {
    list: 'mb-3 grid grid-cols-2 gap-2 md:hidden',
    link: 'flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-meta font-semibold text-ink-600 aria-[current=page]:border-ink-900 aria-[current=page]:text-ink-900',
    icon: 'size-6',
  },
};

/**
 * Farmhouse / Entertainment (entertainment plan, Phase 6). Links, not an ARIA
 * tablist: each tab is its own page. `items` come from `verticalTabs()`, which
 * is empty until two verticals are public, so nothing renders before launch.
 */
export default function VerticalTabs({ items, variant = 'header' }) {
  if (items.length < 2) return null;
  const look = LOOK[variant];
  return (
    <nav aria-label="Categories" className={variant === 'header' ? 'h-full' : undefined}>
      <ul className={look.list}>
        {items.map((item) => (
          <li key={item.code} className={variant === 'header' ? 'flex' : undefined}>
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={look.link}
            >
              <VerticalIcon code={item.code} className={look.icon} />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The header copy: which tab is active, and where each goes, from the current page. */
export function HeaderVerticalTabs({ registry }) {
  const pathname = usePathname();
  if ((registry.verticals ?? []).length < 2) return null;
  // Only /search reads the query string: reading it on a static page would make it render client-side.
  if (pathname === '/search') return <SearchVerticalTabs registry={registry} />;
  const vertical = pageVertical(pathname, registry);
  return vertical ? <HeaderSlot items={verticalTabs(registry, vertical)} /> : null;
}

function SearchVerticalTabs({ registry }) {
  const params = useSearchParams();
  const place = {
    city: params.get('city'),
    area: params.get('area'),
    date: params.get('date') || params.get('dates')?.split(',')[0],
  };
  const items = verticalTabs(
    registry,
    pageVertical('/search', registry, params.get('vertical')),
    (code) => searchTabHref(code, place),
  );
  return <HeaderSlot items={items} />;
}

function HeaderSlot({ items }) {
  return (
    <div className="pointer-events-auto hidden h-full flex-1 justify-center transition-opacity duration-150 md:flex docked:pointer-events-none docked:opacity-0">
      <VerticalTabs items={items} />
    </div>
  );
}
