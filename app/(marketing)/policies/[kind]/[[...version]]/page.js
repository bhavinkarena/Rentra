import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { Link2, MessageSquare } from 'lucide-react';
import ContentBody, { sectionId } from '@/components/content/ContentBody';
import { BackLink } from '@/components/ui/page-header';
import { publicContent } from '@/lib/api/content';
import { ApiError } from '@/lib/api/client';

const effective = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

async function document(params) {
  const { kind, version } = await params;
  if (version && version.length !== 1) notFound();
  if (!['terms', 'privacy', 'cancellation'].includes(kind)) notFound();
  let publication;
  try {
    publication = await publicContent(kind, version?.[0]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return {
    content: publication.body,
    selected: publication.version,
    effectiveAt: publication.effectiveAt,
    kind,
  };
}
export async function generateMetadata({ params }) {
  const d = await document(params);
  return publicMetadata({
    title: d.content.title,
    description: d.content.sections[0][1],
    path: `/policies/${d.kind}/${d.selected}`,
  });
}
export default async function Page({ params }) {
  const { content, selected, kind, effectiveAt } = await document(params);
  return (
    <article className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-3xl">
          <BackLink href="/help">Help and support</BackLink>
          <h1 className="mt-1 text-h1">{content.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-600">
            <span>
              Effective <time dateTime={effectiveAt}>{effective(effectiveAt)}</time>
            </span>
            <span aria-hidden="true">·</span>
            <span>Version {selected}</span>
            <Link
              className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-700 hover:underline"
              href={`/policies/${kind}/${selected}`}
            >
              <Link2 className="size-4" aria-hidden="true" />
              Permanent link to this version
            </Link>
          </p>
        </header>
        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* In-page contents: sticky on desktop, hidden on phones where sections are short. */}
          <nav aria-label="On this page" className="hidden lg:block">
            <ol className="sticky top-24 space-y-1 border-l border-border text-meta">
              {content.sections.map(([title], i) => (
                <li key={i}>
                  <a
                    href={`#${sectionId(i)}`}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-ink-600 hover:border-brand-600 hover:text-brand-800"
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-3xl">
            <ContentBody kind={kind} body={content} />
            <Link
              className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
              href="/support"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              Ask Rentra about these policies
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
