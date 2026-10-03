import { publicContent } from '@/lib/api/content';
import { supportContact } from '@/lib/domain/help';
export default async function OwnerContactStrip() {
  let contact = supportContact();
  try {
    contact = (await publicContent('contact')).body;
  } catch {}
  return (
    <aside
      aria-label="Contact Rentra"
      className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 text-sm"
    >
      <strong>Contact Rentra</strong>
      {contact.whatsapp && (
        <a
          className="min-h-11 inline-flex items-center underline"
          href={`https://wa.me/${contact.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      )}
      {contact.phone && (
        <a className="min-h-11 inline-flex items-center underline" href={`tel:${contact.phone}`}>
          Call {contact.phone}
        </a>
      )}
      {contact.email && (
        <a className="min-h-11 inline-flex items-center underline" href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
      )}
      {contact.hours && <span>{contact.hours}</span>}
      {!contact.email && !contact.phone && !contact.whatsapp && (
        <span>Send a support request below; replies are saved in your account.</span>
      )}
    </aside>
  );
}
