import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { adminSearchHref, adminSearchRecord, loadAdminSearch } from '@/lib/domain/admin-search';
import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminEmpty,
  AdminFilterBar,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import CopyChip from '@/components/portal/CopyChip';
import RetryButton from '@/components/portal/RetryButton';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';

export const metadata = { title: 'Search', robots: { index: false, follow: false } };

export default async function SearchPage({ searchParams }) {
  const admin = await requireAdmin();
  const input = (await searchParams) ?? {};
  const { q, type, types, results } = await loadAdminSearch(
    adminApi,
    admin.capabilities,
    input,
    settle,
  );
  const here = adminSearchHref(input);
  const available = types.map((t) => t.label.toLowerCase()).join(', ');
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader
        title="Search"
        description={
          types.length
            ? `Search ${available}. Each directory checks its own access and shows its own page of results.`
            : 'Your access does not include a searchable directory.'
        }
      />
      {types.length > 0 && (
        <AdminFilterBar label="Search filters" className="rounded-lg border border-border">
          <Form action="/admin/search" className="flex flex-wrap items-end gap-4">
            <label className="min-w-0 flex-1 basis-64">
              Search term
              <input
                className={`${fieldClass} mt-1`}
                name="q"
                type="search"
                defaultValue={q}
                maxLength={100}
                required
                placeholder={
                  types.find((t) => t.key === type)?.hint ??
                  'Name, email, phone or record reference'
                }
              />
            </label>
            <label>
              Record type
              <select
                className={`${fieldClass} mt-1`}
                name="type"
                defaultValue={types.some((t) => t.key === type) ? type : 'all'}
              >
                <option value="all">All permitted types</option>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button className={buttonVariants({ size: 'default' })}>Search records</button>
          </Form>
          <p className="text-meta text-ink-600">
            Use a record type to see its supported fields. Support messages, documents and private
            message bodies are not searched.
          </p>
        </AdminFilterBar>
      )}
      {q && <p className="break-words text-meta text-ink-600">Results for “{q}”</p>}
      {!q && types.length > 0 && (
        <AdminEmpty
          title="Find a record"
          description="Enter a name, contact detail or record reference. Matching uses literal text, including percent and underscore characters."
        />
      )}
      {q && !results.length && (
        <AdminEmpty
          title="No permitted search type"
          description="Choose one of the record types available to your account."
        />
      )}
      {results.map((section) => {
        const data = section.result.data;
        const pageSize = data?.pageSize ?? 20;
        const all = `${section.path}?${new URLSearchParams({ ...section.filters, q, page: String(data?.page ?? 1) })}`;
        return (
          <section
            key={section.key}
            aria-labelledby={`search-${section.key}`}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id={`search-${section.key}`} className="text-h3 font-semibold">
                  {section.label}
                </h2>
                <p className="mt-1 text-meta text-ink-600">
                  {section.hint}
                  {data ? ` \u00b7 ${data.total} matches` : ''}
                </p>
              </div>
              <Link href={all} className="inline-flex min-h-11 items-center underline">
                Open {section.label.toLowerCase()} directory
              </Link>
            </div>
            {section.result.failure ? (
              <p role="status" className="rounded-lg border border-border bg-card p-5 text-meta">
                {section.result.failure === 'forbidden'
                  ? 'Access to this directory is unavailable.'
                  : 'This directory could not load.'}{' '}
                <RetryButton label="Retry search" />
              </p>
            ) : (
              <>
                <AdminTable
                  label={`${section.label} search results`}
                  columns={['Record', 'Reference', 'State', 'Open']}
                  empty={
                    !data.items.length && (
                      <AdminEmpty
                        title="No matches"
                        description={`Try another ${section.hint.toLowerCase()}.`}
                      />
                    )
                  }
                >
                  {data.items.map((item) => {
                    const row = adminSearchRecord(section.key, item);
                    return (
                      <tr key={item.id}>
                        <td className="max-w-sm break-words px-4 py-4">
                          <p className="font-semibold">{row.title}</p>
                          <p className="mt-1 break-all text-ink-600">{row.description}</p>
                        </td>
                        <td className="max-w-xs px-4 py-4 [&_button]:min-h-11">
                          <CopyChip label={`${section.label} reference`} value={row.reference} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge tone="neutral">{row.state}</StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            className="inline-flex min-h-11 items-center underline"
                            href={`${section.path}/${encodeURIComponent(item.id)}?from=${encodeURIComponent(here)}`}
                          >
                            Open<span className="sr-only"> {row.title}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </AdminTable>
                <Pagination
                  page={data.page}
                  pageSize={pageSize}
                  total={data.total}
                  pages={data.pages}
                  pageSizes={null}
                  pageParam={`${section.key}Page`}
                  label={`${section.label} search pages`}
                  className="[&_a]:min-h-11"
                />
              </>
            )}
          </section>
        );
      })}
    </AdminPage>
  );
}
