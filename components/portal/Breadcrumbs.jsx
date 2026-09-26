import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * `items`: [{ href, label }], the last item is the current page (no href).
 * On narrow screens only the parent link shows, as a back link, so the trail
 * never wraps into three lines above the title.
 */
export default function Breadcrumbs({ items }) {
  const parent = items.at(-2);
  return (
    <nav aria-label="Breadcrumb" className="text-tiny font-medium">
      {parent ? (
        <Link
          href={parent.href}
          className="inline-flex min-h-9 items-center text-brand-700 hover:underline sm:hidden"
        >
          ← {parent.label}
        </Link>
      ) : null}
      <ol className="hidden flex-wrap items-center gap-1 text-ink-500 sm:flex">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {current ? (
                <span aria-current="page" className="max-w-[40ch] truncate text-ink-800">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center text-brand-700 hover:underline"
                >
                  {item.label}
                </Link>
              )}
              {current ? null : <ChevronRight className="size-3.5" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
