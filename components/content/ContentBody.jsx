import Link from '@/components/navigation/NavigationLink';
/** Public rendering and the publication preview share this plain-text renderer. */
export default function ContentBody({ kind, body }) {
  if (kind === 'contact')
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{body.title}</h2>
        <p>
          <Link href="/support" className="underline">
            Your support requests
          </Link>{' '}
          · Sign in to send a private request and read replies.
        </p>
        <p>
          {body.hours
            ? `Support hours: ${body.hours} (${body.timeZone})`
            : 'Support hours have not been published. No response time is promised.'}
        </p>
        {body.email && (
          <p>
            Email:{' '}
            <a className="break-all underline" href={`mailto:${body.email}`}>
              {body.email}
            </a>
          </p>
        )}
        {body.whatsapp && (
          <p>
            <a className="underline" href={`https://wa.me/${body.whatsapp}`} rel="noreferrer">
              Message Rentra on WhatsApp
            </a>{' '}
            — opens an external service.
          </p>
        )}
        <p>
          Requests are not live chat or an emergency service. For urgent arrival issues, use the
          host contact in your confirmed booking record.
        </p>
      </section>
    );
  if (kind === 'help')
    return (
      <div className="space-y-3">
        {body.faqs.map((f, i) => (
          <details key={i} className="rounded-lg border border-border p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">{f.question}</summary>
            <p className="mt-3 whitespace-pre-line">{f.answer}</p>
            {f.href && (
              <Link className="mt-2 inline-flex min-h-11 items-center underline" href={f.href}>
                {f.link}
              </Link>
            )}
          </details>
        ))}
      </div>
    );
  return (
    <div className="space-y-7">
      {body.sections.map(([title, text], i) => (
        <section key={i}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-3 whitespace-pre-line">{text}</p>
        </section>
      ))}
    </div>
  );
}
