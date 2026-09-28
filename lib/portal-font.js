import localFont from 'next/font/local';

/** Same brand face, with the denser portal scale; no external build request. */
export const portalFont = localFont({
  src: '../assets/fonts/PlusJakartaSans-latin-variable.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-portal',
});
