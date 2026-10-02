import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { earningsEnabled } from '@/lib/domain/owner-earnings';
import { PayoutExplainer } from '@/components/partner/earnings/Earnings';
import { PayoutList } from '@/components/finance/Statements';
import { FinanceFilterError } from '@/components/finance/Statements';
import PortalState from '@/components/portal/PortalState';
import { financeApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
export const metadata = { title: 'Payouts', robots: { index: false, follow: false } };
async function LegacyPayoutPage({ params, searchParams }) {
  const { data, failure, invalid } = await settleFinance(
    financeApi.payouts(false, await searchParams),
  );
  if (invalid) return <FinanceFilterError message={invalid} admin={false} />;
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <PayoutList data={data} admin={false} />;
}

export default async function Page(props) {
  if (!earningsEnabled()) return <LegacyPayoutPage {...props} />;
  await requireActiveClient();
  const { data, failure, invalid } = await settleFinance(
    partnerApi.earnings(await props.searchParams),
  );
  if (invalid) return <FinanceFilterError message={invalid} />;
  if (failure)
    return <PortalState kind={failure} backHref="/partner/earnings" backLabel="Earnings" />;
  return <PayoutExplainer data={data} />;
}
