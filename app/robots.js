import { siteUrl } from '@/lib/seo/site-url';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Crawlers must be able to read route-level noindex directives.
        // Personal pages still require authentication; robots is not access control.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
