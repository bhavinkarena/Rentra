import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import ContentBody from '@/components/content/ContentBody';
import { publicContent } from '@/lib/api/content';
import { ApiError } from '@/lib/api/client';
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
    <article className="mx-auto max-w-3xl space-y-7 px-4 py-10">
      <Link className="text-brand-700 underline" href="/help">
        Help and support
      </Link>
      <header>
        <h1 className="text-h1">{content.title}</h1>
        <p className="mt-3 break-all">
          Version {selected} · Effective {new Date(effectiveAt).toISOString()}
        </p>
        <Link className="text-meta underline" href={`/policies/${kind}/${selected}`}>
          Permanent link to this version
        </Link>
      </header>
      <ContentBody kind={kind} body={content} />
      <p>
        <Link
          className="inline-flex min-h-11 items-center text-brand-700 underline"
          href="/support"
        >
          Ask Rentra about these policies
        </Link>
      </p>
    </article>
  );
}
