'use client';

import { usePathname } from 'next/navigation';
import { adminSectionForPath, adminTabMatches } from '@/lib/domain/admin-navigation';

// Every page sits in the sidebar now; this strip only flags read-only access.
export default function AdminSectionNav({ sections, capabilities }) {
  const pathname = usePathname();
  const section = adminSectionForPath(pathname, sections);
  const active = section?.tabs.find((entry) => adminTabMatches(pathname, entry));
  if (!active?.writeCapability || capabilities.includes(active.writeCapability)) return null;

  return (
    <div className="border-b border-border bg-card">
      <p className="mx-auto max-w-(--container-workspace) px-4 py-3 text-meta text-ink-600 sm:px-6 lg:px-8">
        Read-only access · Changes require additional permissions.
      </p>
    </div>
  );
}
