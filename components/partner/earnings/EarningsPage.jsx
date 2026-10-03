import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import { FinanceFilterError } from '@/components/finance/Statements';
import { earningsEnabled } from '@/lib/domain/owner-earnings';
import Earnings from './Earnings';
import LegacyStatementPage from './LegacyStatementPage';
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
  const { data, failure, invalid } = await settleFinance(partnerApi.earnings(query, print));
  if (invalid) return <FinanceFilterError message={invalid} />;
  if (failure)
    return <PortalState kind={failure} backHref="/partner/earnings" backLabel="Earnings" />;
  return <Earnings data={data} statement={statement} print={print} />;
}
