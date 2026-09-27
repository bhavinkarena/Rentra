'use client';
import { usePortalScope } from '@/lib/partner/use-portal-scope';
import {
  useGetPartnerListingsQuery,
  useGetPartnerSummaryQuery,
} from '@/lib/services/partner.service';
import PartnerListingsView from './PartnerListingsView';
import PartnerQueryState from './PartnerQueryState';
export default function PartnerListingsScreen({ args, submitted, scope }) {
  const matches = usePortalScope(scope);
  const listings = useGetPartnerListingsQuery(args, {
    skip: !matches,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: 30,
  });
  const summary = useGetPartnerSummaryQuery(undefined, {
    skip: !matches,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: 30,
  });
  if (!matches) return <p role="status">Checking your session…</p>;
  return (
    <PartnerQueryState queries={[listings, summary]}>
      {listings.currentData?.data && summary.currentData?.data && (
        <PartnerListingsView
          args={args}
          submitted={submitted}
          result={listings.currentData.data}
          summary={summary.currentData.data}
        />
      )}
    </PartnerQueryState>
  );
}
