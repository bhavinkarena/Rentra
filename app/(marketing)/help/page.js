import Form from '@/components/navigation/NavigationForm';
import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import { publicContent } from '@/lib/api/content';
import ContentBody, { FaqList } from '@/components/content/ContentBody';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Search, SearchX } from 'lucide-react';
export async function generateMetadata({ searchParams }) {
  const filtered = Boolean((await searchParams)?.q);
  return publicMetadata({
    title: 'Help and support',
    description: 'Find answers about visits, bookings, cancellation, privacy and support.',
    path: '/help',
    index: !filtered,
  });
}
export default async function Help({ searchParams }) {
  const params = await searchParams,
    q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const [help, contactPublication] = await Promise.all([
    publicContent('help'),
    publicContent('contact'),
  ]);
  const faqs = help.body.faqs;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean),
    results = faqs.filter((f) =>
      words.every((w) => `${f.question} ${f.answer}`.toLowerCase().includes(w)),
    );

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-h1">{help.body.title}</h1>
        <p className="mt-2 text-ink-600">{help.body.intro}</p>
      </header>
      <Form action="/help" role="search">
        <label htmlFor="help-search" className="sr-only">
          Search help
        </label>
        <div
          data-field-shell
          className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 shadow-sm focus-within:border-brand-600"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id="help-search"
            className="min-h-10 w-full min-w-0 bg-transparent text-base outline-none sm:text-sm"
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Search help, for example refund"
          />
          <button className="min-h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:bg-primary-active">
            Search help
          </button>
        </div>
      </Form>
      <section>
        <h2 className="mb-4 text-h3">
          {q ? `${results.length} matching answers` : 'Common questions'}
        </h2>
        {results.length ? (
          <FaqList faqs={results} />
        ) : (
          <EmptyState
            as="h3"
            icon={SearchX}
            title="No answer matched."
            description="Try another word or send a support request."
          />
        )}
      </section>
      <div className="rounded-lg bg-brand-50 p-5 sm:p-6">
        <ContentBody kind="contact" body={contactPublication.body} />
      </div>
      <nav aria-label="Policies" className="flex flex-wrap gap-2">
        {['terms', 'cancellation', 'privacy'].map((kind) => (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
            key={kind}
            href={`/policies/${kind}`}
          >
            <FileText className="size-4 text-brand-700" aria-hidden="true" />
            {kind[0].toUpperCase() + kind.slice(1)} policy
          </Link>
        ))}
      </nav>
    </article>
  );
}
