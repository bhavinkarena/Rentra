import EarningsPage from '@/components/partner/earnings/EarningsPage';
export const metadata = { title: 'Statements' };
export default function Page(props) {
  return <EarningsPage {...props} statement />;
}
