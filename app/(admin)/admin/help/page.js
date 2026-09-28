import OperatorHelp from '@/components/portal/OperatorHelp';
import { requireAdmin } from '@/lib/api/session';
export const metadata = { title: 'Operator guide', robots: { index: false, follow: false } };
export default async function HelpPage() {
  const admin = await requireAdmin();
  return <OperatorHelp role="admin" capabilities={admin.capabilities} />;
}
