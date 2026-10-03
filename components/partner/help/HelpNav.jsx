import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import HelpTabs from './HelpTabs';
export default async function HelpNav() {
  if (process.env.NEXT_PUBLIC_OWNER_V2_NAV === 'false') return null;
  const user = await requireClient();
  const records = user.capabilities?.includes('client.records.read')
    ? await partnerApi.records({}).catch(() => null)
    : null;
  return <HelpTabs disputes={Boolean(records?.total || records?.items?.length)} />;
}
