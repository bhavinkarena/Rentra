import OwnerGuide from '@/components/partner/OwnerGuide';
import Link from '@/components/navigation/NavigationLink';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  LifeBuoy,
  Mail,
  MessageCircle,
  TriangleAlert,
} from 'lucide-react';

/** Divider-separated FAQ accordion; native <details>, so no JS and keyboard-ready. */
export function FaqList({ faqs }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {faqs.map((f, i) => (
        <details key={i} className="group px-4 sm:px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown
              className="size-4 shrink-0 text-ink-500 transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="pb-4">
            <p className="whitespace-pre-line text-ink-700">{f.answer}</p>
            {f.href && (
              <Link
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                href={f.href}
              >
                {f.link}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

/** Stable anchor for a policy section, shared by the section and the contents list. */
export const sectionId = (i) => `section-${i + 1}`;

/** Public rendering and the publication preview share this plain-text renderer. */
export default function ContentBody({ kind, body }) {
  if (kind === 'owner_help') return <OwnerGuide body={body} />;
  if (kind === 'contact')
    return (
      <section className="space-y-4">
        <h2 className="text-h3">{body.title}</h2>
        <ul className="space-y-3 text-ink-700">
          <li className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <span>
              <Link href="/support" className="font-semibold text-brand-700 underline">
                Your support requests
              </Link>{' '}
              · Sign in to send a private request and read replies.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <span>
              {body.hours
                ? `Support hours: ${body.hours} (${body.timeZone})`
                : 'Support hours have not been published. No response time is promised.'}
            </span>
          </li>
          {body.email && (
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
              <span>
                Email:{' '}
                <a
                  className="break-all font-semibold text-brand-700 underline"
                  href={`mailto:${body.email}`}
                >
                  {body.email}
                </a>
              </span>
            </li>
          )}
          {body.whatsapp && (
            <li className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
              <span>
                <a
                  className="font-semibold text-brand-700 underline"
                  href={`https://wa.me/${body.whatsapp}`}
                  rel="noreferrer"
                >
                  Message Rentra on WhatsApp
                </a>{' '}
                — opens an external service.
              </span>
            </li>
          )}
          <li className="flex items-start gap-3 text-meta">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Requests are not live chat or an emergency service. For urgent arrival issues, use the
              host contact in your confirmed booking record.
            </span>
          </li>
        </ul>
      </section>
    );
  if (kind === 'help') return <FaqList faqs={body.faqs} />;
  return (
    <div className="space-y-8">
      {body.sections.map(([title, text], i) => (
        <section key={i} id={sectionId(i)} className="scroll-mt-24">
          <h2 className="text-h3">{title}</h2>
          <p className="mt-3 whitespace-pre-line text-ink-700">{text}</p>
        </section>
      ))}
    </div>
  );
}
