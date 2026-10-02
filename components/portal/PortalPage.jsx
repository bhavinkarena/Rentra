import { cn } from 'cn';
import { pageWidths } from '@/lib/ui/layout';
/** Shared owner page geometry; wrappers choose a named width. */
export default function PortalPage({ children, width = 'portal', className, ...props }) {
  return (
    <div
      {...props}
      className={cn(
        'mx-auto w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
        pageWidths[width] || pageWidths.portal,
        className,
      )}
    >
      {children}
    </div>
  );
}
