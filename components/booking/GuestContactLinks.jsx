import { MessageCircle, Phone } from 'lucide-react';

const link =
  'inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-meta font-semibold text-brand-800 hover:bg-brand-50';

/** BOOK-06/08: call and WhatsApp a guest. Indian 10-digit numbers get +91. */
export default function GuestContactLinks({ phone, name = 'guest' }) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) return null;
  const full = `${digits.length === 10 ? '91' : ''}${digits}`;
  return (
    <span className="flex flex-wrap gap-2">
      <a className={link} href={`tel:+${full}`} aria-label={`Call ${name}`}>
        <Phone className="size-4" aria-hidden="true" />
        Call
      </a>
      <a
        className={link}
        href={`https://wa.me/${full}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp ${name}`}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        WhatsApp
      </a>
    </span>
  );
}
