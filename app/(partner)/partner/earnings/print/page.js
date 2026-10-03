import EarningsPage from '@/components/partner/earnings/EarningsPage';
export const metadata = { title: 'Print statement' };
export default function Page(props) {
  return <EarningsPage {...props} statement print />;
}
