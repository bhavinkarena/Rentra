/**
 * The full-screen surfaces.
 *
 * A separate route group from `(partner)` for one reason: these pages own the
 * whole viewport, and the partner header would sit above them taking a row of
 * vertical space and offering navigation that is precisely what a walkthrough
 * is trying to keep out of reach. The walkthrough carries its own identity bar
 * with a single deliberate way out — "Save and exit" — because every other
 * link on this screen is a way to abandon a half-built listing.
 *
 * The URLs are unchanged: route groups never appear in a path, so
 * /partner/listings/[id]/setup/[step] still resolves here.
 */
export const metadata = {
  title: 'Rentra',
  robots: { index: false, follow: false, nocache: true },
};

export default function WizardGroupLayout({ children }) {
  return children;
}
