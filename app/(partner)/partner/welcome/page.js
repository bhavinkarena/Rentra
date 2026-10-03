import { redirect } from 'next/navigation';
import { requireClient } from '@/lib/api/session';
import OwnerWelcome from '@/components/partner/OwnerWelcome';
export const metadata = { title: 'Welcome to Rentra', robots: { index: false, follow: false } };
export default async function WelcomePage() {
  const user = await requireClient();
  if (user.ownerGuide?.welcomeSeenAt || user.accountStatus === 'active') redirect('/partner');
  return <OwnerWelcome name={user.name} />;
}
