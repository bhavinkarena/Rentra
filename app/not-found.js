import SiteChrome from '@/components/rentra/SiteChrome';
import NotFoundBody from '@/components/rentra/NotFoundBody';

export const metadata = { title: 'Page not found', robots: { index: false } };

/**
 * Unmatched URLs render here, outside every route-group layout, so this one
 * adds the site chrome itself. notFound() inside (marketing) or (customer)
 * is caught by that group's not-found.js, which sits inside its layout.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundBody />
    </SiteChrome>
  );
}
