import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { ChevronRight, Users } from 'lucide-react';
import { Field, fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import Pagination from '@/components/ui/pagination';
import { adminDateTime } from '@/lib/domain/admin-display';
import { AdminPage, AdminPageHeader, AdminEmpty, StatusBadge } from './AdminPrimitives';

function href(type, { q, status, page }) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (status && status !== 'all') query.set('status', status);
  if (page > 1) query.set('page', String(page));
  return `/admin/${type}${query.size ? '?' + query : ''}`;
}
export default function PeopleDirectory({ type, data, statuses }) {
  const owners = type === 'clients',
    title = owners ? 'Owners' : 'Customers',
    noun = owners ? 'owners' : 'customers',
    here = href(type, data);
  return (
    <AdminPage>
      <AdminPageHeader
        title={title}
        description={
          owners
            ? 'Find an owner or authorised agent and review their property and account records.'
            : 'Find a guest account and review bookings, support, and account records.'
        }
      />
      <section className="mt-6" aria-labelledby="people-list-title">
        <nav
          aria-label="Filter by status"
          className="flex flex-wrap gap-x-5 border-b border-border"
        >
          {Object.entries(statuses).map(([key, text]) => (
            <Link
              key={key}
              href={href(type, { q: data.q, status: key, page: 1 })}
              aria-current={data.status === key ? 'page' : undefined}
              className="inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-1 text-meta font-semibold text-ink-600 aria-[current=page]:border-brand-700 aria-[current=page]:text-brand-800 hover:text-ink-900"
            >
              {text}
              <span className="font-normal tabular">{data.counts[key]}</span>
            </Link>
          ))}
        </nav>
        <Form
          action={`/admin/${type}`}
          role="search"
          aria-label={`${title} search`}
          className="my-5 flex flex-wrap items-end gap-3"
        >
          {data.status !== 'all' ? <input type="hidden" name="status" value={data.status} /> : null}
          <div className="w-full min-w-0 sm:w-auto sm:max-w-96 sm:flex-1">
            <Field id="people-search" label="Name, email or phone">
              <input
                id="people-search"
                name="q"
                maxLength={100}
                defaultValue={data.q}
                placeholder={`Search ${noun}`}
                className={fieldClass}
              />
            </Field>
          </div>
          <button className={buttonVariants({ variant: 'outline' })}>Search</button>
          {data.q ? (
            <Link
              href={href(type, { status: data.status, page: 1 })}
              className={buttonVariants({ variant: 'ghost' })}
            >
              Clear search
            </Link>
          ) : null}
        </Form>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="people-list-title" className="text-h3 font-semibold">
            {statuses[data.status]} {noun}
          </h2>
          <p className="text-meta text-ink-600">
            Newest first / {data.total} matching {noun}
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {data.items.length ? (
            <ul className="divide-y divide-border">
              {data.items.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/admin/${type}/${person.id}?from=${encodeURIComponent(here)}`}
                    aria-label={`Open ${owners ? 'owner' : 'customer'} ${person.name || person.email || person.phone}`}
                    className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold">
                        {person.name || 'Name not set'}
                      </p>
                      <p className="mt-1 break-all text-meta text-ink-600">
                        {person.email || 'Email not recorded'}
                      </p>
                      {!owners ? (
                        <p className="mt-1 text-meta text-ink-600">
                          {person.phone ? `+91 ${person.phone}` : 'Phone not recorded'}
                        </p>
                      ) : null}
                      {person.clientType === 'authorised_agent' ? (
                        <p className="mt-2 text-meta text-ink-600">Authorised agent</p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <StatusBadge
                        tone={
                          person.accountStatus === 'active'
                            ? 'success'
                            : person.accountStatus === 'pending_application'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {statuses[person.accountStatus] || person.accountStatus}
                      </StatusBadge>
                      {owners ? (
                        <p className="mt-2 text-meta text-ink-600">
                          Application:{' '}
                          {person.applicationStatus
                            ? person.applicationStatus.replaceAll('_', ' ')
                            : 'Not started'}
                        </p>
                      ) : null}
                      <p className="mt-2 text-meta text-ink-600">
                        Joined {adminDateTime(person.createdAt)}
                      </p>
                    </div>
                    <dl className="space-y-2 text-meta text-ink-700">
                      {owners ? (
                        <>
                          <div className="flex flex-wrap gap-x-2">
                            <dt>Properties</dt>
                            <dd className="font-semibold tabular">
                              {person.liveCount} live / {person.listingCount} total
                            </dd>
                          </div>
                          <div className="flex flex-wrap gap-x-2">
                            <dt>Upcoming visits</dt>
                            <dd className="font-semibold tabular">{person.upcomingVisits}</dd>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <dt>Bookings</dt>
                            <dd className="font-semibold tabular">{person.orderCount}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt>Open support</dt>
                            <dd className="font-semibold tabular">{person.openSupport}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                    <span className="inline-flex items-center gap-1.5 text-meta font-semibold text-brand-700">
                      Open <ChevronRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmpty
              icon={Users}
              title={`No ${noun} ${data.q ? 'match this search' : 'in this view'}`}
              description="Choose another status or clear your search."
            />
          )}
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            pages={data.pages}
            pageSizes={null}
            label={`${title} pages`}
            noun={noun}
            className="border-t border-border px-5 py-4"
          />
        </div>
      </section>
    </AdminPage>
  );
}
