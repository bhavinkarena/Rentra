import AdminHome from '../page';

export const metadata = {
  title: 'Admin activity',
  robots: { index: false, follow: false, nocache: true },
};

export default function ActivityPage({ searchParams }) {
  return <AdminHome searchParams={searchParams} view="activity" />;
}
