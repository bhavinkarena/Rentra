import { ogCard } from '@/lib/seo/og-card';

export const alt = 'Rentra — book courts, turfs and play zones by the hour';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return ogCard({
    headline: 'Book a court, lane or game in minutes.',
    subline: 'Box cricket · Pickleball · Bowling · and more',
  });
}
