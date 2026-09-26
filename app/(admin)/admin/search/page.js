import Link from 'next/link';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import { Row, RowList, SectionCard } from '@/components/portal/DetailLayout';

export const metadata = { title: 'Search', robots: { index: false, follow: false } };

const label = (value) => String(value ?? '—').replaceAll('_', ' ');

/**
 * One query across the admin directories. Each section loads independently:
 * a forbidden or failed section says so instead of hiding the others.
 */
export default async function SearchPage({ searchParams }) {
  const q = String((await searchParams)?.q ?? '')
    .trim()
    .slice(0, 100);
  const [clients, customers, applications] = q
    ? await Promise.all([
        settle(adminApi.clients({ q })),
        settle(adminApi.customers({ q })),
        settle(adminApi.applications({ q, status: 'all' })),
      ])
    : [null, null, null];
  const sections = [
    {
      key: 'clients',
      title: 'Clients',
      result: clients,
      all: `/admin/clients?q=${encodeURIComponent(q)}`,
      row: (item) => (
        <Row
          key={item.id}
          primary={item.name || item.email}
          secondary={`${item.email ?? ''}${item.phone ? ` · +91 ${item.phone}` : ''}`}
          trailing={<StatusBadge tone="neutral">{label(item.accountStatus)}</StatusBadge>}
          href={`/admin/clients/${item.id}`}
        />
      ),
    },
    {
      key: 'customers',
      title: 'Customers',
      result: customers,
      all: `/admin/customers?q=${encodeURIComponent(q)}`,
      row: (item) => (
        <Row
          key={item.id}
          primary={item.name || 'Name not set'}
          secondary={`${item.phone ? `+91 ${item.phone}` : 'No phone'}${item.email ? ` · ${item.email}` : ''}`}
          trailing={<StatusBadge tone="neutral">{label(item.accountStatus)}</StatusBadge>}
          href={`/admin/customers/${item.id}`}
        />
      ),
    },
    {
      key: 'applications',
      title: 'Applications',
      result: applications,
      all: `/admin?status=all&q=${encodeURIComponent(q)}`,
      row: (item) => (
        <Row
          key={item.id}
          primary={item.legalName || item.email}
          secondary={item.email}
          trailing={<StatusBadge tone="neutral">{label(item.status)}</StatusBadge>}
          href={`/admin/applications/${item.id}`}
        />
      ),
    },
  ];

  return (
    <AdminPage width="max-w-5xl">
      <AdminPageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : 'Search'}
        description="Clients, customers and partner applications, by name, email or phone."
      />
      {!q ? (
        <p className="mt-6 text-meta text-ink-600">Type in the search box at the top.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <SectionCard
              key={section.key}
              id={`search-${section.key}`}
              title={section.title}
              description={
                section.result?.data ? `${section.result.data.total} match(es)` : undefined
              }
              action={
                section.result?.data?.total ? (
                  <Link
                    href={section.all}
                    className="text-tiny font-bold text-brand-700 hover:underline"
                  >
                    See all →
                  </Link>
                ) : null
              }
              flush
            >
              {section.result?.failure ? (
                <p className="p-5 text-meta text-ink-600">
                  {section.result.failure === 'forbidden'
                    ? 'You do not have access to this directory.'
                    : 'This directory could not load. Try again.'}
                </p>
              ) : (
                <RowList
                  items={section.result.data.items.slice(0, 5)}
                  empty="No matches."
                  render={section.row}
                />
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
