'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { cn } from 'cn';

/** 1 … 4 5 6 … 12: first, last, and the current page with one neighbour each side. */
function pageList(page, pages) {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  const list = [];
  for (let n = 1; n <= pages; n++) {
    if (!keep.has(n)) continue;
    if (list.length && n - list.at(-1) > 1) list.push(n - list.at(-1) === 2 ? n - 1 : '…');
    list.push(n);
  }
  return list;
}

const control =
  'inline-flex size-9 items-center justify-center rounded-md text-meta font-semibold tabular transition-colors';

/**
 * URL-driven pagination for any list: "1–10 of 57", a rows-per-page menu and
 * previous / numbered / next links. It keeps every other query parameter.
 *
 * `pageParam` and `sizeParam` name the query keys the page reads. Pass
 * `pageSizes={null}` when the API has a fixed page size, and `pages` when the
 * API reports its own page count.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  pages: reportedPages,
  pageParam = 'page',
  sizeParam = 'pageSize',
  pageSizes = [10, 20, 50],
  label = 'Pagination',
  noun = 'results',
  compact = false,
  className,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const pages = Math.max(1, reportedPages ?? Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const first = total ? (current - 1) * pageSize + 1 : 0;
  const last = Math.min(total, current * pageSize);

  const href = (changes) => {
    const params = new URLSearchParams(search?.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || (key === pageParam && value === 1)) params.delete(key);
      else params.set(key, String(value));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const step = (n, children, name) =>
    n < 1 || n > pages ? (
      <span
        aria-disabled="true"
        className={cn(
          control,
          'w-auto gap-1 border border-border bg-ink-25 px-2.5 text-ink-400',
          !compact && 'sm:px-3',
        )}
      >
        {children}
      </span>
    ) : (
      <Link
        href={href({ [pageParam]: n })}
        aria-label={name}
        className={cn(
          control,
          'w-auto gap-1 border border-border bg-card px-2.5 text-ink-800 hover:border-brand-300 hover:bg-brand-50',
          !compact && 'sm:px-3',
        )}
      >
        {children}
      </Link>
    );

  if (!total) return null;
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-meta text-ink-600',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p aria-live="polite">
          <span className="font-semibold text-ink-900 tabular">
            {first}–{last}
          </span>{' '}
          of <span className="font-semibold text-ink-900 tabular">{total}</span>
          {compact ? null : ` ${noun}`}
        </p>
        {pageSizes?.length ? (
          <label className="flex items-center gap-2">
            <span className={compact ? 'sr-only' : ''}>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) =>
                router.push(href({ [sizeParam]: event.target.value, [pageParam]: 1 }), {
                  scroll: false,
                })
              }
              className="min-h-9 rounded-md py-1 pr-2 pl-3 text-meta"
              aria-label={compact ? 'Rows per page' : undefined}
            >
              {[...new Set([...pageSizes, pageSize])]
                .sort((a, b) => a - b)
                .map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {step(
          current - 1,
          <>
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className={compact ? 'lg:sr-only' : 'max-sm:sr-only'}>Previous</span>
          </>,
          'Previous page',
        )}
        {compact ? (
          <span className="px-2 tabular">
            {current} / {pages}
          </span>
        ) : (
          <>
            <span className="px-2 tabular sm:hidden">
              {current} / {pages}
            </span>
            <ol className="hidden items-center gap-1 sm:flex">
              {pageList(current, pages).map((n, index) =>
                n === '…' ? (
                  <li key={`gap-${index}`} aria-hidden="true" className="w-6 text-center">
                    …
                  </li>
                ) : (
                  <li key={n}>
                    {n === current ? (
                      <span aria-current="page" className={cn(control, 'bg-brand-600 text-white')}>
                        {n}
                      </span>
                    ) : (
                      <Link
                        href={href({ [pageParam]: n })}
                        aria-label={`Page ${n}`}
                        className={cn(control, 'text-ink-700 hover:bg-ink-100')}
                      >
                        {n}
                      </Link>
                    )}
                  </li>
                ),
              )}
            </ol>
          </>
        )}
        {step(
          current + 1,
          <>
            <span className={compact ? 'lg:sr-only' : 'max-sm:sr-only'}>Next</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </>,
          'Next page',
        )}
      </div>
    </nav>
  );
}
