import { ogCard } from '@/lib/seo/og-card';

/** Statically generated at build time — nothing here reads a request. */
export const alt = 'Rentra — explore farmhouses and day visits';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return ogCard({
    headline: 'Find a place for your next day out or overnight stay.',
    subline: 'Explore places · Compare facilities · Choose your dates',
  });
}
