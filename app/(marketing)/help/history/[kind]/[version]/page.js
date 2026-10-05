import { notFound } from 'next/navigation';
import { BackLink } from '@/components/ui/page-header';
import { publicContent } from '@/lib/api/content';
import { ApiError } from '@/lib/api/client';
import ContentBody from '@/components/content/ContentBody';
export const metadata = {
  title: 'Published help history',
  robots: { index: false, follow: false },
};
export default async function Page({ params }) {
  const { kind, version } = await params;
  if (!['help', 'contact', 'owner_help'].includes(kind)) notFound();
  let p;
  try {
    p = await publicContent(kind, version);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <BackLink href="/help">Current help and support</BackLink>
        <h1 className="mt-1 text-h1">{p.body.title}</h1>
        <p className="mt-2 text-meta text-ink-600">
          Historical version {p.version} · Effective{' '}
          <time dateTime={p.effectiveAt}>
            {new Intl.DateTimeFormat('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata',
            }).format(new Date(p.effectiveAt))}
          </time>
        </p>
      </header>
      {['help', 'owner_help'].includes(kind) && <p className="text-ink-700">{p.body.intro}</p>}
      <ContentBody kind={kind} body={p.body} />
    </article>
  );
}
