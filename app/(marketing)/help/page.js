import { publicMetadata } from '@/lib/seo/metadata';
import Link from 'next/link';
import { faqs, supportContact } from '@/lib/domain/help';
export async function generateMetadata({ searchParams }) {
  const filtered = Boolean((await searchParams)?.q);
  return publicMetadata({ title: 'Help and support', description: 'Find answers about visits, bookings, cancellation, privacy and support.', path: '/help', index: !filtered });
}
export default async function Help({ searchParams }) {
  const params = await searchParams, q = typeof params.q === 'string' ? params.q.trim().slice(0,100) : '';
  const words = q.toLowerCase().split(/\s+/).filter(Boolean), results = faqs.filter(f => words.every(w => `${f.question} ${f.answer}`.toLowerCase().includes(w)));
  const contact = supportContact();
  return <article className="mx-auto max-w-3xl space-y-8 px-4 py-10"><header><h1 className="text-h1">Help and support</h1><p className="mt-3">Practical answers for planning, booking and visiting.</p></header>
    <form action="/help" className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">Search help<input className="mt-1 block min-h-11 w-full rounded border border-border p-3" type="search" name="q" defaultValue={q} maxLength={100}/></label><button className="min-h-11 rounded bg-brand-700 px-5 text-white">Search help</button></form>
    <section><h2 className="text-h3">{q ? `${results.length} matching answers` : 'Common questions'}</h2><div className="mt-4 space-y-3">{results.map(f => <details key={f.question} className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer font-semibold">{f.question}</summary><p className="mt-3">{f.answer}</p>{f.href ? <Link className="mt-2 inline-flex min-h-11 items-center text-brand-700 underline" href={f.href}>{f.link}</Link> : null}</details>)}</div>{!results.length ? <p className="mt-4">No answer matched. Try another word or send a support request.</p> : null}</section>
    <section className="space-y-3 rounded-lg bg-brand-50 p-5"><h2 className="text-h3">Contact Rentra</h2><p><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href="/support">Your support requests</Link> · Sign in to send a private request and read replies.</p><p>{contact.hours ? `Support hours: ${contact.hours}` : 'Support hours have not been published. No response time is promised.'}</p>
      {contact.email ? <p>Email: <a className="break-all underline" href={`mailto:${contact.email}`}>{contact.email}</a></p> : null}{contact.whatsapp ? <p><a className="underline" href={`https://wa.me/${contact.whatsapp}`} rel="noreferrer">Message Rentra on WhatsApp</a> — opens an external service.</p> : null}
      <p>Requests are not live chat or an emergency service. For urgent arrival issues, use the host contact in your confirmed booking record.</p>
    </section><nav aria-label="Policies" className="flex flex-wrap gap-5">{['terms','cancellation','privacy'].map(kind => <Link className="inline-flex min-h-11 items-center text-brand-700 underline" key={kind} href={`/policies/${kind}`}>{kind[0].toUpperCase()+kind.slice(1)} policy</Link>)}</nav>
  </article>;
}
