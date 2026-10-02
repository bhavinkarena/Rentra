'use client';
import { usePathname } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import InlineAlert from './InlineAlert';
import { formError } from '@/lib/domain/portal-state';

/** Says out loud why a form failed when no single field is to blame. */
export default function FormError({ state }) {
  const pathname = usePathname();
  const message = formError(state);
  return message ? (
    <InlineAlert
      action={
        state?.status === 401 && pathname?.startsWith('/partner') ? (
          <Link
            className="min-h-11 inline-flex items-center underline"
            href={`/partner/login?next=${encodeURIComponent(pathname)}`}
          >
            Sign in again
          </Link>
        ) : undefined
      }
    >
      {message}
    </InlineAlert>
  ) : null;
}
