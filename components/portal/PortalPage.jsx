/**
 * Page gutters for owner screens that reuse customer, finance or dispute
 * components. Those expect the customer layout's padded wrapper; the owner
 * shell's main area has none, so on phones they ran to the screen edge.
 */
export default function PortalPage({ children }) {
  return <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>;
}
