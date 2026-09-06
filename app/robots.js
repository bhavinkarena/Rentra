const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Dated/filtered results and every authenticated surface stay out
        // of the index. Discovery is public; dashboards are not.
        disallow: ['/search', '/api/', '/partner/', '/admin/', '/booking/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
