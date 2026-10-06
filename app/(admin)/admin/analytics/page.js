import AdminHome from '../page';

export const metadata = {
  title: 'Admin analytics',
  robots: { index: false, follow: false, nocache: true },
};

export default function AnalyticsPage({ searchParams }) {
  return <AdminHome searchParams={searchParams} view="analytics" />;
}
