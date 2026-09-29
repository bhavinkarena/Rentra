import Link from '@/components/navigation/NavigationLink';
import { Compass, MapPinOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

/** The 404 message without chrome; layouts that already render SiteChrome use it directly. */
export default function NotFoundBody() {
  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6 sm:py-16">
      <EmptyState
        as="h1"
        icon={MapPinOff}
        title="We couldn’t find that page"
        description="The link may be old or mistyped, or the place may no longer be listed."
      >
        <Link href="/search" className={cn(buttonVariants(), 'rounded-full px-5')}>
          <Compass aria-hidden="true" />
          Explore places
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-5')}>
          Go to home
        </Link>
      </EmptyState>
    </div>
  );
}
