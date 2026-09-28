import { notFound } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import { publicContent } from '@/lib/api/content';
import { ApiError } from '@/lib/api/client';
import ContentBody from '@/components/content/ContentBody';
export const metadata = {
  title: 'Published help history',
  robots: { index: false, follow: false },
};
export default async function Page({ params }) {
  const { kind, version } = await params;
  if (!['help', 'contact'].includes(kind)) notFound();
  let p;
  try {
    p = await publicContent(kind, version);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link className="underline" href="/help">
        Current help and support
      </Link>
      <h1 className="text-h1">{p.body.title}</h1>
      <p className="break-all">
        Historical version {p.version} · Effective {p.effectiveAt}
      </p>
      {kind === 'help' && <p>{p.body.intro}</p>}
      <ContentBody kind={kind} body={p.body} />
    </article>
  );
}
