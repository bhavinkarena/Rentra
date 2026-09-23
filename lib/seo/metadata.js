/** Public metadata stays canonical and never includes selection/account query parameters. */
export function publicMetadata({ title, description, path, index = true, images }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: 'Rentra',
      title,
      description,
      url: path,
      ...(images ? { images } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(images ? { images } : {}) },
  };
}
export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
