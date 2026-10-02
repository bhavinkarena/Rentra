'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from '@/components/navigation/NavigationLink';
const groups = [
  'Getting verified',
  'Adding a property',
  'Getting bookable',
  'Managing bookings',
  'Getting paid',
  'Caretakers',
  'Reviews',
];
export default function OwnerGuide({ body }) {
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState('');
  useEffect(() => {
    const update = () => setAnchor(window.location.hash.slice(1));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const rows = body.faqs.filter((r) =>
    `${r.question} ${r.answer} ${r.group}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <label className="block">
        Search the owner guide
        <input
          type="search"
          className="mt-1 block min-h-11 w-full rounded-lg border bg-card p-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try photos, arrivals or payouts"
        />
      </label>
      <p className="text-sm" role="status">
        {rows.length} articles
      </p>
      {groups.map((group) => {
        const articles = rows.filter((r) => r.group === group);
        if (!articles.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-h3">{group}</h2>
            {articles.map((r) => (
              <details
                key={r.id}
                id={r.id}
                open={anchor === r.id || undefined}
                className="scroll-mt-24 rounded-lg border bg-card p-4"
              >
                <summary className="min-h-11 cursor-pointer font-semibold">{r.question}</summary>
                <p className="mt-3 whitespace-pre-wrap">{r.answer}</p>
                {r.screenshot && (
                  <figure className="mt-4">
                    <Image
                      src={r.screenshot}
                      alt={`Example: ${r.question}`}
                      width={360}
                      height={780}
                      className="max-h-[520px] w-auto max-w-full rounded-lg border"
                    />
                    <figcaption className="text-sm text-ink-600">
                      Example screen using demonstration data.
                    </figcaption>
                  </figure>
                )}
                <Link className="mt-2 inline-flex min-h-11 items-center underline" href={r.href}>
                  {r.link}
                </Link>
              </details>
            ))}
          </section>
        );
      })}
      {!rows.length && <p>No guide articles match your search. Try a different word.</p>}
    </div>
  );
}
