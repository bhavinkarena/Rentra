import Form from '@/components/navigation/NavigationForm';
import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import { publicContent } from '@/lib/api/content';
import ContentBody from '@/components/content/ContentBody';
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
        <p className="mt-3">{help.body.intro}</p>
      </header>
      <Form action="/help" className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          Search help
          <input
            className="mt-1 block min-h-11 w-full rounded border border-border p-3"
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
          />
        </label>
        <button className="min-h-11 rounded bg-brand-700 px-5 text-white">Search help</button>
      </Form>
      <section>
        <h2 className="text-h3">{q ? `${results.length} matching answers` : 'Common questions'}</h2>
        <div className="mt-4 space-y-3">
          {results.map((f) => (
            <details key={f.question} className="rounded-lg border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">{f.question}</summary>
              <p className="mt-3">{f.answer}</p>
              {f.href ? (
                <Link
                  className="mt-2 inline-flex min-h-11 items-center text-brand-700 underline"
                  href={f.href}
                >
                  {f.link}
                </Link>
              ) : null}
            </details>
          ))}
        </div>
        {!results.length ? (
          <p className="mt-4">No answer matched. Try another word or send a support request.</p>
        ) : null}
      </section>
      <div className="space-y-3 rounded-lg bg-brand-50 p-5">
        <ContentBody kind="contact" body={contactPublication.body} />
      </div>
      <nav aria-label="Policies" className="flex flex-wrap gap-5">
        {['terms', 'cancellation', 'privacy'].map((kind) => (
          <Link
            className="inline-flex min-h-11 items-center text-brand-700 underline"
            key={kind}
            href={`/policies/${kind}`}
          >
            {kind[0].toUpperCase() + kind.slice(1)} policy
          </Link>
        ))}
      </nav>
    </article>
  );
}
