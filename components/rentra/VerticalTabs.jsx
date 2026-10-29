'use client';

import { useOptimistic, useSyncExternalStore, useTransition } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import styles from './VerticalTabs.module.css';
import { pageVertical, searchTabHref, verticalTabs } from '@/lib/domain/vertical-ui';
import { VerticalIcon } from './icons/vertical-icons';

/**
 * Farmhouse / Entertainment (entertainment plan, Phase 6). Links, not an ARIA
 * tablist: each tab is its own page. `items` come from `verticalTabs()`, which
 * is empty until two verticals are public, so nothing renders before launch.
 */
export default function VerticalTabs({ items, variant = 'header' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeCode = items.find((item) => item.active)?.code;
  const [selected, select] = useOptimistic(activeCode);
  if (items.length < 2) return null;
  const index = Math.max(
    0,
    items.findIndex((item) => item.code === selected),
  );
  return (
    <nav
      aria-label="Categories"
      aria-busy={pending}
      className={`${styles.navigation} ${styles[variant]}`}
    >
      <ul
        className={styles.track}
        style={{ '--category-count': items.length, '--category-index': index }}
      >
        <li className={styles.selection} aria-hidden="true" />
        {items.map((item) => {
          const chosen = item.code === selected;
          return (
            <li key={item.code} className={styles.item}>
              <Link
                href={item.href}
                prefetch={true}
                aria-current={item.active ? 'page' : undefined}
                data-selected={chosen}
                className={styles.link}
                onNavigate={(event) => {
                  event.preventDefault();
                  if (item.active && !pending) return;
                  startTransition(() => {
                    select(item.code);
                    router.push(item.href);
                  });
                }}
              >
                <VerticalIcon code={item.code} className={styles.icon} />
                <span>{item.name}</span>
                <span className={styles.pendingSlot} aria-hidden="true">
                  {chosen && pending && <LoaderCircle className={styles.spinner} />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <span role="status" className="sr-only">
        {pending ? `Opening ${items[index].name}` : ''}
      </span>
    </nav>
  );
}

/** The header copy: which tab is active, and where each goes, from the current page. */
export function HeaderVerticalTabs({ registry: shared }) {
  const registry = useBetaRegistry(shared);
  const pathname = usePathname();
  if ((registry.verticals ?? []).length < 2) return null;
  // Only /search reads the query string: reading it on a static page would make it render client-side.
  if (pathname === '/search') return <SearchVerticalTabs registry={registry} />;
  const vertical = pageVertical(pathname, registry);
  return vertical ? <HeaderSlot items={verticalTabs(registry, vertical)} /> : null;
}

function SearchVerticalTabs({ registry }) {
  const params = useSearchParams();
  const items = verticalTabs(
    registry,
    pageVertical('/search', registry, params.get('vertical')),
    (code) => searchTabHref(code, params),
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

/**
 * Closed beta (hotel plan, Phase 9): the header registry is the shared, cached,
 * public one. A guest holding a beta pass also gets the Hotels tab, read from
 * the pass cookie after mount so cached pages stay static for everyone else.
 */
const BETA_TABS = { hotel: { code: 'hotel', slug: 'hotels', name: 'Hotels', sortOrder: 30 } };
/** `verticals` of a live pass cookie (`verticals.expiry.signature`); the API checks the signature. */
function readBetaCodes() {
  const match = document.cookie.match(/(?:^|; )rentra_beta=([^;.]+)\.(\d+)\./);
  return match && Number(match[2]) > Date.now() ? decodeURIComponent(match[1]) : '';
}
const noSubscription = () => () => {};
export function useBetaRegistry(registry) {
  const codes = useSyncExternalStore(noSubscription, readBetaCodes, () => '');
  const beta = codes ? codes.split('+') : [];
  const missing = beta.filter(
    (code) => BETA_TABS[code] && !(registry.verticals ?? []).some((v) => v.code === code),
  );
  return missing.length
    ? {
        ...registry,
        verticals: [...(registry.verticals ?? []), ...missing.map((code) => BETA_TABS[code])],
      }
    : registry;
}
