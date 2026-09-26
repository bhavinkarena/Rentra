import Link from 'next/link';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import { SectionCard } from '@/components/portal/DetailLayout';
import {
  MarkAllRead,
  MarkRead,
  OpenUpdate,
  UpdatePreferences,
} from '@/components/partner/UpdateControls';
import { CATEGORY_LABEL, updateHref, updateTitle } from '@/lib/domain/client-updates';

export const metadata = {
  title: 'Updates',
  robots: { index: false, follow: false, nocache: true },
};

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['action', 'Needs action'],
];
const CATEGORIES = [['all', 'All types'], ...Object.entries(CATEGORY_LABEL)];
const ist = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

function href({ filter, category, page }) {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (category !== 'all') params.set('category', category);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/partner/updates?${query}` : '/partner/updates';
}

function Chip({ current, to, children }) {
  return (
    <Link
      href={to}
      aria-current={current ? 'page' : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-tiny font-semibold ${
        current
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-border bg-card text-ink-700 hover:bg-ink-50'
      }`}
    >
      {children}
    </Link>
  );
}

function Detail({ update }) {
  const d = update.detail ?? {};
  const lines = [
    d.reference ? `Reference ${d.reference}` : null,
    d.fields?.length ? `Changed: ${d.fields.join(', ')}` : null,
    d.status ? `Now ${String(d.status).replaceAll('_', ' ')}` : null,
  ].filter(Boolean);
  return (
    <>
      {lines.length ? <p className="text-tiny text-ink-500">{lines.join(' · ')}</p> : null}
      {d.reason ? <p className="mt-1 text-meta text-ink-800">{d.reason}</p> : null}
      {d.body ? <p className="mt-1 text-meta whitespace-pre-wrap text-ink-800">{d.body}</p> : null}
    </>
  );
}

/**
 * The client's persisted updates (CP15): what Rentra decided or recorded, and
 * what happened to their bookings. Stored in Rentra; nothing here claims an
 * SMS or email was sent.
 */
export default async function UpdatesPage({ searchParams }) {
  await requireClient();
  const query = (await searchParams) ?? {};
  const [{ data, failure }, prefs] = await Promise.all([
    settle(partnerApi.updates(query)),
    settle(partnerApi.updatePreferences()),
  ]);
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  const { filter, category, page, pages, total, unread, action, items } = data;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <PartnerPageHeader
        eyebrow="Workspace"
        title="Updates"
        description={`${unread} unread${action ? ` · ${action} need${action === 1 ? 's' : ''} your action` : ''}. Updates are kept here; Rentra does not send them to you by SMS or email yet.`}
        action={<MarkAllRead disabled={!unread} />}
      />

      <nav aria-label="Filter updates" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <Chip key={key} current={filter === key} to={href({ filter: key, category, page: 1 })}>
            {label}
          </Chip>
        ))}
      </nav>
      <nav aria-label="Update type" className="mt-2 flex flex-wrap gap-2">
        {CATEGORIES.map(([key, label]) => (
          <Chip key={key} current={category === key} to={href({ filter, category: key, page: 1 })}>
            {label}
          </Chip>
        ))}
      </nav>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          title={`${total} ${total === 1 ? 'update' : 'updates'}`}
          description="Newest first. Opening an update marks it read."
          flush
        >
          {items.length ? (
            <ul className="divide-y divide-border">
              {items.map((update) => {
                const title = updateTitle(update);
                return (
                  <li
                    key={update.id}
                    className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${update.read ? '' : 'bg-brand-50/60'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-meta font-semibold text-ink-900">
                        {update.read ? null : (
                          <span className="size-2 rounded-full bg-brand-700" aria-hidden="true" />
                        )}
                        <span>{title}</span>
                        {update.kind === 'action' ? (
                          <span className="rounded-full bg-warning-bg px-2 text-[0.65rem] font-bold text-amber-800">
                            Needs action
                          </span>
                        ) : null}
                        {update.detail?.simulation ? (
                          <span className="rounded-full bg-ink-100 px-2 text-[0.65rem] font-bold text-ink-700">
                            Test booking
                          </span>
                        ) : null}
                        <span className="sr-only">{update.read ? '(read)' : '(unread)'}</span>
                      </p>
                      <p className="text-tiny text-ink-500">
                        {CATEGORY_LABEL[update.category]}
                        {update.propertyTitle ? ` · ${update.propertyTitle}` : ''} ·{' '}
                        {ist(update.createdAt)} IST
                      </p>
                      <Detail update={update} />
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <OpenUpdate id={update.id} href={updateHref(update)} title={title} />
                      {update.read ? null : <MarkRead id={update.id} title={title} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-5 text-meta text-ink-600">
              {filter === 'all' && category === 'all'
                ? 'No updates yet. Rentra decisions about your properties and bookings will appear here.'
                : 'No updates match these filters.'}
            </p>
          )}
          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-tiny">
              <span>
                Page {page} of {pages}
              </span>
              <span className="flex gap-2">
                {page > 1 ? (
                  <Link
                    className="font-semibold text-brand-700 underline"
                    href={href({ filter, category, page: page - 1 })}
                  >
                    Previous
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link
                    className="font-semibold text-brand-700 underline"
                    href={href({ filter, category, page: page + 1 })}
                  >
                    Next
                  </Link>
                ) : null}
              </span>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Update preferences"
          description="Required work, such as requested changes or a hidden property, always arrives unread."
        >
          {prefs.data ? (
            <UpdatePreferences preferences={prefs.data} />
          ) : (
            <p role="alert" className="text-meta text-danger">
              Preferences could not load. Reload the page to try again.
            </p>
          )}
          <p className="mt-4 text-tiny text-ink-500">
            Updates you choose not to see as unread are still kept in this list.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
