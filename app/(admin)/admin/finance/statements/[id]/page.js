import { requireAdmin } from '@/lib/api/session';
import { Statement } from '@/components/finance/Statements';
import { FinanceFilterError } from '@/components/finance/Statements';
import PortalState from '@/components/portal/PortalState';
import { financeApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
export const metadata = { title: 'Finance evidence', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const { data, failure, invalid } = await settleFinance(
    financeApi.statement(true, { ...query, period: (await params).id }),
  );
  if (invalid) return <FinanceFilterError message={invalid} admin={true} />;
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  return (
    <Statement
      data={data}
      capabilities={admin.capabilities}
      tab={query.tab}
      params={query}
      admin={true}
      detail
    />
  );
}
