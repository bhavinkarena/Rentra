import PortalPage from '@/components/portal/PortalPage';
import OwnerTable from '@/components/partner/OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { MarkAllRead } from '@/components/partner/UpdateControls';
import InboxRow from '@/components/partner/InboxRow';
import { CATEGORY_LABEL } from '@/lib/domain/client-updates';
export const metadata = { title: 'Updates', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  await requireClient();
  const { data, failure } = await settle(partnerApi.updates(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/partner" />;
  const { filter, category, page, pages, items, unread, action } = data;
  const query = (values) => '?' + new URLSearchParams({ filter, category, ...values });
  return (
    <PortalPage className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">Updates</h1>
          <p className="mt-2 text-meta">
            {unread} unread · {action} need you. Tasks stay pinned until resolved.
          </p>
        </div>
        <MarkAllRead disabled={!unread} needsAction={data.unread_action > 0} />
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Filter updates" className="flex rounded-lg border border-border bg-card">
          {[
            ['all', 'All'],
            ['unread', 'Unread'],
            ['action', 'Needs you'],
          ].map(([key, title]) => (
            <Link
              key={key}
              href={query({ filter: key, page: 1 })}
              aria-current={filter === key ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 font-semibold ${filter === key ? 'bg-brand-800 text-white' : ''}`}
            >
              {title}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="filter" value={filter} />
          <label className="grid gap-1 text-meta">
            Category
            <select
              name="category"
              defaultValue={category}
              className="min-h-11 rounded-md border border-border bg-card px-3"
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABEL).map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 self-end rounded-md border border-border px-3">Apply</button>
        </form>
      </div>
      <Link
        className="inline-flex min-h-11 items-center font-semibold underline"
        href="/partner/settings/notifications"
      >
        Notification settings
      </Link>
      {items.length ? (
        <OwnerTable
          label="Inbox updates"
          columns={['Update', 'Category', 'Status', 'Received', 'Action']}
        >
          {items.map((u) => (
            <InboxRow key={u.id} update={u} />
          ))}
        </OwnerTable>
      ) : (
        <EmptyState
          title={
            filter === 'all' && category === 'all'
              ? "You're all caught up"
              : 'No updates match these filters'
          }
          description="Bookings, review results and Rentra messages appear here."
          variant={filter === 'all' && category === 'all' ? 'first-use' : 'no-results'}
          actionHref={filter === 'all' && category === 'all' ? undefined : '/partner/updates'}
          actionLabel="Clear filters"
        />
      )}
      <Pagination
        page={page}
        pageSize={20}
        total={data.total}
        pages={pages}
        pageSizes={null}
        label="Update pages"
        noun="updates"
      />
    </PortalPage>
  );
}
