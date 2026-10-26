'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Story 2.3: a customer page whose session ended sends the guest to sign in
 * and back to this same page afterwards (the API only accepts customer paths).
 */
export default function SignInAgain() {
  const router = useRouter();
  const path = usePathname();
  const href = `/login?next=${encodeURIComponent(path)}`;
  useEffect(() => router.replace(href), [router, href]);
  return (
    <p role="status" className="text-meta">
      Your session ended.{' '}
      <a className="underline" href={href}>
        Sign in to continue
      </a>
    </p>
  );
}
