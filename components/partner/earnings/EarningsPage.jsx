import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import { FinanceFilterError } from '@/components/finance/Statements';
import { earningsEnabled } from '@/lib/domain/owner-earnings';
import Earnings from './Earnings';
import LegacyStatementPage from './LegacyStatementPage';
import { earningsActivity } from '@/lib/domain/earnings-activity';
export default async function EarningsPage({
  searchParams,
  params,
  statement = false,
  print = false,
}) {
  if (!earningsEnabled())
    return <LegacyStatementPage searchParams={searchParams} params={params} />;
  await requireActiveClient();
  const query = { ...(await searchParams) };
  if (params) {
    const route = await params;
    if (route.id) query.month = route.id;
  }
  const overview = !statement && !print;
  const { data, failure, invalid } = await settleFinance(
    partnerApi.earnings(query, print || overview),
  );
  if (invalid) return <FinanceFilterError message={invalid} />;
  if (failure)
    return <PortalState kind={failure} backHref="/partner/earnings" backLabel="Earnings" />;
  const view = overview
    ? {
        ...data,
        activity: earningsActivity(data.items, data.filters.month),
        items: data.items.slice((data.filters.page - 1) * 30, data.filters.page * 30),
      }
    : data;
  return <Earnings data={view} statement={statement} print={print} />;
}
