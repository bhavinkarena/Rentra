import { Inter } from 'next/font/google';

/** Workspace typeface; loaded only by the admin and partner layouts. */
export const portalFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-portal',
});
