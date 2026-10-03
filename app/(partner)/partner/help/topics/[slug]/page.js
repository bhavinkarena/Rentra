import Link from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { requireClient } from '@/lib/api/session';
import { publicContent } from '@/lib/api/content';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { BackLink } from '@/components/ui/page-header';
import { articleHref, topicSlug } from '@/components/partner/help/guide';
export const metadata = { title: 'Help topic', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  await requireClient();
  const { data, failure } = await settle(publicContent('owner_help'));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/help" backLabel="Help centre" />;
  const { slug } = await params;
  const articles = data.body.faqs.filter((r) => topicSlug(r.group) === slug);
  if (!articles.length) notFound();
  return (
    <section className="max-w-3xl">
      <BackLink href="/partner/help">Help centre</BackLink>
      <h1 className="mt-4 text-h1 font-bold tracking-[-0.03em]">{articles[0].group}</h1>
      <p className="mt-2 text-meta text-ink-600">Guidance for your owner account.</p>
      <ul className="mt-7 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {articles.map((r) => (
          <li key={r.id}>
            <Link
              className="flex min-h-20 items-center justify-between gap-5 p-5 text-meta font-semibold hover:bg-ink-25"
              href={articleHref(r.id)}
            >
              {r.question}
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-7 text-meta text-ink-600">
        Still need help?{' '}
        <Link
          href="/partner/support/new"
          className="ml-1 inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
        >
          Contact support
        </Link>
      </p>
    </section>
  );
}
