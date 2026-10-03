import Link from '@/components/navigation/NavigationLink';
import { ChevronRight } from 'lucide-react';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
import { StatusBadge } from '@/components/ui/status-badge';
export const metadata = { title: 'Calendar sync', robots: { index: false, follow: false } };
export default async function Page() {
  const owner = await requireClient();
  const heading = (
    <SettingsHeading
      title="Calendar sync"
      description="Share occupied dates with a calendar app using a private feed for each property."
    />
  );
  if (owner.accountStatus !== 'active')
    return (
      <section>
        {heading}
        <p className="rounded-lg border border-border bg-card p-6 text-meta">
          Calendar feeds become available after owner verification.
        </p>
      </section>
    );
  const { data, failure } = await settle(partnerApi.listings());
  if (failure) return <PortalState kind={failure} />;
  const rows = Array.isArray(data) ? data : data.items || data.listings || [];
  return (
    <section>
      {heading}
      <p className="mb-5 max-w-[65ch] text-meta leading-6 text-ink-600">
        Choose a property to create or rotate its feed. Keep the link private: anyone with it can
        read the occupied dates it contains.
      </p>
      {rows.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/partner/listings/${r.id}/booking-rules`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-ink-25 sm:p-6"
              >
                <span className="min-w-0">
                  <span className="block text-base font-semibold wrap-break-word">{r.title}</span>
                  <span className="mt-2 block">
                    <StatusBadge domain="property" state={r.status} />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-meta font-semibold text-brand-800">
                  <span className="hidden sm:inline">Manage feed</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="text-h3 font-semibold">Add a property to sync your calendar</h2>
          <p className="mt-2 text-meta text-ink-600">Your property feeds will appear here.</p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
            href="/partner/listings/new"
          >
            Add property
          </Link>
        </div>
      )}
    </section>
  );
}
