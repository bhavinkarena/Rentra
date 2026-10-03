import Image from 'next/image';
import Link from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { requireClient } from '@/lib/api/session';
import { publicContent } from '@/lib/api/content';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { BackLink } from '@/components/ui/page-header';
import { topicSlug } from '@/components/partner/help/guide';
import { buttonVariants } from '@/components/ui/button';
export const metadata = { title: 'Owner help article', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  await requireClient();
  const { data, failure } = await settle(publicContent('owner_help'));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/help" backLabel="Help centre" />;
  const { id } = await params;
  const item = data.body.faqs.find((r) => r.id === id);
  if (!item) notFound();
  return (
    <article className="max-w-3xl wrap-break-word">
      <BackLink href={`/partner/help/topics/${topicSlug(item.group)}`}>{item.group}</BackLink>
      <h1 className="mt-4 max-w-[25ch] text-h1 font-bold tracking-[-0.03em]">{item.question}</h1>
      <div className="mt-7 max-w-[65ch] whitespace-pre-wrap text-base leading-7 text-ink-700">
        {item.answer}
      </div>
      {item.href && (
        <Link href={item.href} className={`${buttonVariants()} mt-6`}>
          {item.link || 'Open workspace'}
        </Link>
      )}
      {item.screenshot && (
        <figure className="mt-9">
          <Image
            src={item.screenshot}
            alt={`Example of ${item.group.toLowerCase()} in Rentra`}
            width={360}
            height={780}
            className="h-auto w-full max-w-[360px] rounded-lg border border-border"
          />
          <figcaption className="mt-3 text-tiny text-ink-500">
            Example screen with demo data.
          </figcaption>
        </figure>
      )}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-h3 font-semibold">Need more help?</h2>
        <p className="mt-2 text-meta text-ink-600">
          Send a private request with the details of your question.
        </p>
        <Link
          href="/partner/support/new"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
        >
          Contact support
        </Link>
      </section>
    </article>
  );
}
