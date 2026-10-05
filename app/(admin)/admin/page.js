import Link from '@/components/navigation/NavigationLink';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/api/session';
import { legacyApplicationHref, permittedAdminSections } from '@/lib/domain/admin-navigation';

export const metadata = {
  title: 'Admin workspace',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminHome({ searchParams }) {
  const admin = await requireAdmin();
  const legacy = legacyApplicationHref(await searchParams);
  if (legacy) redirect(legacy);
  const first = permittedAdminSections(admin.capabilities).find(
    (section) => !['dashboard', 'help'].includes(section.key),
  );
  return (
    <div className="mx-auto max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-h1 text-ink-900">Admin workspace</h1>
      <p className="mt-3 max-w-2xl text-meta leading-6 text-ink-600">
        Open a workspace from the navigation to review records and manage marketplace operations.
        Your available workspaces follow your operator permissions.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {first ? (
          <Link
            href={first.tabs[0].href}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white"
          >
            Open {first.tabs[0].label.toLowerCase()}
          </Link>
        ) : (
          <p className="text-meta text-ink-600">
            No operational workspaces are assigned to your account. Contact an operator
            administrator to request access.
          </p>
        )}
        <Link
          href="/admin/help"
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-meta font-semibold text-ink-800 hover:bg-ink-50"
        >
          Help & guide
        </Link>
      </div>
    </div>
  );
}
