import { Plus_Jakarta_Sans } from 'next/font/google';
import Providers from '@/components/providers';
import './globals.css';

/**
 * next/font self-hosts the file at build time, so there is no render-blocking
 * request to fonts.googleapis.com and no layout shift.
 *
 * Indic faces are deliberately NOT loaded here. The public site is English in
 * Phase 1; when the Gujarati Client UI lands, load Noto_Sans_Gujarati in the
 * (partner) layout so only that surface pays for the download. The family
 * names are already in the --font-sans stack in globals.css, so they activate
 * the moment they are loaded.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Rentra — Book a verified farmhouse, directly from the owner',
    template: '%s · Rentra',
  },
  description:
    'Find and book a verified farmhouse in your district. Transparent price, '
    + 'money held safely until you check in, and zero brokerage.',
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
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
