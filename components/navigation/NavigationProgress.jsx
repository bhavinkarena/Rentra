'use client';

export default function NavigationProgress({ active }) {
  if (!active) return null;
  return (
    <span
      role="progressbar"
      aria-label="Opening page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[150] h-0.5 overflow-hidden bg-brand-100"
    >
      <span className="navigation-progress-track block h-full w-1/3 bg-brand-600" />
    </span>
  );
}
