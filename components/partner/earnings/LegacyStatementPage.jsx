import { Statement } from '@/components/finance/Statements';
import { FinanceFilterError } from '@/components/finance/Statements';
import PortalState from '@/components/portal/PortalState';
import { financeApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
export const metadata = { title: 'Finance evidence', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const route = await params;
  const { data, failure, invalid } = await settleFinance(
    financeApi.statement(false, {
      ...(await searchParams),
      ...(route?.id ? { period: route.id } : {}),
    }),
  );
  if (invalid) return <FinanceFilterError message={invalid} admin={false} />;
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <Statement data={data} admin={false} detail={Boolean(route?.id)} />;
}
