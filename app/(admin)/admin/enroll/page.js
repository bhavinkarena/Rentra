import { OperatorEnrollment } from '@/components/admin/OperatorSecurity';
export const metadata = {
  title: 'Operator enrollment',
  referrer: 'no-referrer',
  robots: { index: false, follow: false, nocache: true },
};
export default function Page() {
  return <OperatorEnrollment />;
}
