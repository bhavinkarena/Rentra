import OperatorHelp from '@/components/portal/OperatorHelp';
import { requireClient } from '@/lib/api/session';
export const metadata = { title: 'Owner guide', robots: { index: false, follow: false } };
export default async function HelpPage() {
  const owner = await requireClient();
  return <OperatorHelp role="owner" capabilities={owner.capabilities} />;
}
