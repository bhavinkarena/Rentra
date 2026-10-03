'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, ArrowUpRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { topicSlug, articleHref } from './guide';
const EMPTY_ARTICLES = [];
export default function HelpHub({ body }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const faqs = body.faqs || EMPTY_ARTICLES,
    groups = [...new Set(faqs.map((r) => r.group))];
  useEffect(() => {
    const visit = () => {
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const article =
        faqs.find((r) => r.id === id) ||
        (id.startsWith('verification-') ? faqs.find((r) => r.id === 'verification-details') : null);
      if (article) router.replace(articleHref(article.id));
    };
    visit();
    window.addEventListener('hashchange', visit);
    return () => window.removeEventListener('hashchange', visit);
  }, [faqs, router]);
  const rows = faqs.filter((r) =>
    `${r.question} ${r.answer} ${r.group}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
      <section className="min-w-0">
        <h1 className="text-h1 font-bold tracking-[-0.03em] text-ink-900">Help & support</h1>
        <p className="mt-2 max-w-[65ch] text-meta leading-6 text-ink-600">{body.intro}</p>
        <label className="relative mt-6 block">
          <span className="sr-only">Search help articles</span>
          <Search
            className="pointer-events-none absolute top-4 left-4 size-5 text-ink-500"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search photos, bookings or payouts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${fieldClass} min-h-14 pl-12 text-base`}
          />
        </label>
        <div className="mt-7 flex items-baseline justify-between gap-3">
          <h2 className="text-h3 font-semibold text-ink-900">
            {query.trim() ? 'Search results' : body.title || 'Owner guide'}
          </h2>
          <p role="status" className="text-tiny text-ink-500">
            {query.trim() ? rows.length : faqs.length} {rows.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {query.trim() ? (
            rows.length ? (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={articleHref(r.id)}
                      className="flex min-h-20 items-center justify-between gap-4 px-5 py-5 hover:bg-ink-25"
                    >
                      <span className="min-w-0">
                        <span className="block text-meta font-semibold text-ink-900">
                          {r.question}
                        </span>
                        <span className="mt-1 block text-tiny text-ink-500">{r.group}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-12">
                <h3 className="text-h4 font-semibold text-ink-900">No articles match</h3>
                <p className="mt-2 text-meta text-ink-500">
                  Try a different word, or contact support with your question.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-3 min-h-11 text-meta font-semibold text-brand-800 hover:underline"
                >
                  Clear search
                </button>
              </div>
            )
          ) : (
            <ul className="divide-y divide-border">
              {groups.map((group) => (
                <li key={group}>
                  <Link
                    href={`/partner/help/topics/${topicSlug(group)}`}
                    className="flex min-h-20 items-center justify-between gap-4 px-5 py-5 hover:bg-ink-25"
                  >
                    <span className="min-w-0">
                      <span className="block text-meta font-semibold text-ink-900">{group}</span>
                      <span className="mt-1 block text-tiny text-ink-500">
                        {faqs
                          .filter((r) => r.group === group)
                          .map((r) => r.question)
                          .join(' / ')}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <aside
        className="space-y-7 lg:border-l lg:border-border lg:pl-8"
        aria-label="Support options"
      >
        <div className="border-t border-border pt-6 lg:border-t-0 lg:pt-1">
          <h2 className="text-h3 font-semibold text-ink-900">Need a hand?</h2>
          <p className="mt-3 text-meta leading-6 text-ink-600">
            Send your question to Rentra. Requests and replies stay in your owner account.
          </p>
          <Link href="/partner/support/new" className={`${buttonVariants()} mt-5 w-full`}>
            Contact support
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/partner/support"
            className="mt-2 flex min-h-11 items-center justify-center text-meta font-semibold text-brand-800 hover:underline"
          >
            View my requests
          </Link>
          <p className="mt-3 text-tiny leading-5 text-ink-500">
            This is not live chat. Return to My requests to check for replies.
          </p>
        </div>
      </aside>
    </div>
  );
}
