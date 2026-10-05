'use client';

import Link from '@/components/navigation/NavigationLink';
import { usePathname } from 'next/navigation';
import { adminSectionForPath, adminTabMatches } from '@/lib/domain/admin-navigation';

export default function AdminSectionNav({ sections, capabilities }) {
  const pathname = usePathname();
  const section = adminSectionForPath(pathname, sections);
  if (!section || section.key === 'dashboard') return null;
  const active = section.tabs.find((entry) => adminTabMatches(pathname, entry));
  const readonly = active?.writeCapability && !capabilities.includes(active.writeCapability);

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-(--container-workspace) px-4 sm:px-6 lg:px-8">
        <nav
          aria-label={`${section.label} sections`}
          className="flex gap-1 overflow-x-auto overscroll-x-contain py-2"
        >
          {section.tabs.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={adminTabMatches(pathname, entry) ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-meta font-semibold transition-colors ${
                adminTabMatches(pathname, entry)
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
        {readonly ? (
          <p className="pb-3 text-meta text-ink-600">
            Read-only access · Changes require additional permissions.
          </p>
        ) : null}
      </div>
    </div>
  );
}
