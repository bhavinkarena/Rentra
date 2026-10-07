import localFont from 'next/font/local';
import './globals.css';
import { siteUrl } from '@/lib/seo/site-url';

/**
 * The existing Google Fonts latin variable file is now checked in. next/font
 * serves it locally, so builds and page loads need no Google Fonts request.
 *
 * Indic faces are deliberately NOT loaded here. The public site is English in
 * Phase 1; when the Gujarati Client UI lands, load Noto_Sans_Gujarati in the
 * (partner) layout so only that surface pays for the download. The family
 * names are already in the --font-sans stack in globals.css, so they activate
 * the moment they are loaded.
 */
const jakarta = localFont({
  src: '../assets/fonts/PlusJakartaSans-latin-variable.woff2',
  weight: '400 800',
  variable: '--font-jakarta',
  display: 'swap',
});

export const viewport = {
  themeColor: '#FAF9F6',
  interactiveWidget: 'resizes-content',
  viewportFit: 'cover',
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Rentra — Explore farmhouses and day visits',
    template: '%s · Rentra',
  },
  description:
    'Explore places for day visits and overnight stays, compare facilities, ' +
    'check current dates and save places for later.',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Rentra',
    url: siteUrl,
  },
  // og:image, the favicon and the apple-touch-icon come from the metadata
  // files beside this one (opengraph-image.js, icon.svg, apple-icon.js).
  // This only tells X to render the card full-bleed instead of as a thumbnail.
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
