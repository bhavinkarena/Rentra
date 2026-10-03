import Link from 'next/link';
import { publicContent } from '@/lib/api/content';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OwnerDestinationTabs from './OwnerDestinationTabs';
export default async function OwnerHelpHeader({ tabs = true }) {
  if (tabs && process.env.NEXT_PUBLIC_OWNER_V2_NAV === 'false') return null;
  const user = await requireClient();
  const [contact, records] = await Promise.all([
    publicContent('contact').catch(() => null),
    tabs && user.capabilities?.includes('client.records.read')
      ? partnerApi.records({}).catch(() => null)
      : null,
  ]);
  const body = contact?.body || {};
  return (
    <>
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Contact Rentra</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta">
          {body.whatsapp && (
            <a
              className="flex min-h-11 items-center underline"
              href={`https://wa.me/${body.whatsapp}`}
            >
              WhatsApp
            </a>
          )}
          {body.phone && (
            <a className="flex min-h-11 items-center underline" href={`tel:${body.phone}`}>
              Phone
            </a>
          )}
          {body.email && (
            <a
              className="flex min-h-11 items-center break-all underline"
              href={`mailto:${body.email}`}
            >
              Email
            </a>
          )}
          <Link className="flex min-h-11 items-center underline" href="/partner/support/new">
            Send a request
          </Link>
        </div>
        <p className="text-meta text-ink-600">
          {body.hours
            ? `Support hours: ${body.hours} (${body.timeZone || 'Asia/Kolkata'})`
            : 'Support hours have not been published. Check My requests for replies.'}
        </p>
      </div>
      {tabs ? (
        <OwnerDestinationTabs
          kind="help"
          disputes={Boolean(records?.total || records?.items?.length)}
        />
      ) : null}
    </>
  );
}
