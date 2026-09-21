import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POLICY_VERSION, policyVersions } from '@/lib/domain/help';
async function document(params) {
  const { kind, version } = await params;
  if (version && version.length !== 1) notFound();
  const selected = version?.[0] || POLICY_VERSION, content = Object.hasOwn(policyVersions, selected) && Object.hasOwn(policyVersions[selected], kind) ? policyVersions[selected][kind] : null;
  if (!content) notFound();
  return { content, selected, kind };
}
export async function generateMetadata({ params }) { const d = await document(params); return { title: `${d.content.title} | Rentra`, alternates: { canonical: `/policies/${d.kind}/${d.selected}` } }; }
export default async function Page({ params }) {
  const { content, selected, kind } = await document(params);
  return <article className="mx-auto max-w-3xl space-y-7 px-4 py-10"><Link className="text-brand-700 underline" href="/help">Help and support</Link><header><h1 className="text-h1">{content.title}</h1><p className="mt-3">Version {selected} · Published 20 September 2026</p><Link className="text-meta underline" href={`/policies/${kind}/${selected}`}>Permanent link to this version</Link></header>{content.sections.map(([title, body]) => <section key={title}><h2 className="text-h3">{title}</h2><p className="mt-3">{body}</p></section>)}<p><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href="/support">Ask Rentra about these policies</Link></p></article>;
}
