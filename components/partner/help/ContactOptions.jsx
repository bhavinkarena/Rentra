import { publicContent } from '@/lib/api/content';
import { supportContact } from '@/lib/domain/help';
import { Phone, Mail, MessageCircle, ArrowUpRight } from 'lucide-react';
export default async function ContactOptions() {
  const content = await publicContent('contact').catch(() => null),
    body = content?.body || supportContact();
  const items = [
    [body.whatsapp, `https://wa.me/${body.whatsapp}`, 'WhatsApp', MessageCircle],
    [body.phone, `tel:${body.phone}`, body.phone, Phone],
    [body.email, `mailto:${body.email}`, body.email, Mail],
  ].filter(([value]) => value);
  return (
    <aside
      aria-labelledby="contact-options-title"
      className="border-t border-border pt-6 lg:border-t-0 lg:pt-0"
    >
      <h2 id="contact-options-title" className="text-h4 font-semibold text-ink-900">
        Other ways to reach us
      </h2>
      {items.length ? (
        <ul className="mt-3 divide-y divide-border">
          {items.map(([value, href, label, Icon]) => (
            <li key={href}>
              <a
                href={href}
                target={href.startsWith('https:') ? '_blank' : undefined}
                rel={href.startsWith('https:') ? 'noopener noreferrer' : undefined}
                className="flex min-h-14 items-center gap-3 py-3 text-meta text-ink-700 hover:text-brand-800"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-all">{label}</span>
                <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-meta leading-6 text-ink-500">
          Additional contact channels have not been published. Send a request using the form.
        </p>
      )}
      <p className="mt-5 text-meta leading-6 text-ink-500">
        {body.hours
          ? `Support hours: ${body.hours} (${body.timeZone || 'Asia/Kolkata'})`
          : 'Support hours have not been published.'}
      </p>
    </aside>
  );
}
