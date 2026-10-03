import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortalPage from '@/components/portal/PortalPage';
import OwnerTable from '@/components/partner/OwnerTable';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
const types = {
  all: 'Everything',
  property: 'Properties',
  booking: 'Bookings',
  support: 'Support',
  review: 'Reviews',
  dispute: 'Disputes',
  caretaker: 'Caretakers',
};
export const metadata = { title: 'Search owner workspace' };
export default async function SearchPage({ searchParams }) {
  await requireClient();
  const query = await searchParams,
    q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '',
    type = types[query.type] ? query.type : 'all';
  const page = /^\d{1,6}$/.test(query.page || '') ? Math.max(1, Number(query.page)) : 1;
  const result = q ? await settle(partnerApi.search({ q, type, page })) : null;
  return (
    <PortalPage className="space-y-6">
      <PartnerPageHeader
        title="Search workspace"
        description="Find your properties, booking references, support requests, reviews, disputes and caretakers."
      />
      <Form
        action="/partner/search"
        role="search"
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <label className="min-w-0 flex-1">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q}
            required
            maxLength={100}
            className="mt-1 block min-h-11 w-full rounded-lg border p-3"
            placeholder="Property name or reference"
          />
        </label>
        <label>
          Search in
          <select
            name="type"
            defaultValue={type}
            className="mt-1 block min-h-11 rounded-lg border p-3"
          >
            {Object.entries(types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white">
          Search
        </button>
      </Form>
      {result?.failure ? (
        <PortalState kind={result.failure} />
      ) : (
        <>
          <p className="text-meta text-ink-600">
            {q
              ? `${result.data.total} results for “${q}”`
              : 'Enter a name or reference to search your workspace.'}
          </p>
          <OwnerTable
            label="Workspace search results"
            columns={['Result', 'Type', 'Reference', 'Status', 'Action']}
            empty={!result?.data?.items.length ? 'No results to display.' : null}
          >
            {result?.data?.items.map((row) => (
              <tr key={row.type + row.id}>
                <td className="font-semibold">{row.title}</td>
                <td>{types[row.type]}</td>
                <td className="max-w-64 break-all text-tiny">{row.reference || '—'}</td>
                <td className="capitalize">{row.status.replaceAll('_', ' ')}</td>
                <td>
                  <Link
                    href={row.href}
                    className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold text-brand-800"
                  >
                    View<span className="sr-only"> {row.title}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </OwnerTable>
          {result?.data && (
            <Pagination
              page={page}
              pageSize={20}
              total={result.data.total}
              pages={result.data.pages}
              pageSizes={null}
              label="Search result pages"
              noun="results"
            />
          )}
        </>
      )}
    </PortalPage>
  );
}
