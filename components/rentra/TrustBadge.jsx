import { BadgeCheck, Zap } from 'lucide-react';

const VARIANTS = {
  verified: {
    label: 'Physically Verified',
    className: 'bg-brand-600 text-white',
    Icon: BadgeCheck,
  },
  owner: {
    label: 'Owner Verified',
    className: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
    Icon: null,
  },
  fast: {
    label: 'Fast Responder',
    className: 'bg-ink-100 text-ink-700',
    Icon: null,
  },
  instant: {
    label: 'Instant Book',
    className: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-300',
    Icon: Zap,
  },
  peak: { label: 'Peak date', className: 'bg-amber-500 text-white', Icon: null },
  new: { label: 'New', className: 'bg-ink-900 text-white', Icon: null },
};

/**
 * Never show more than two badges on one card. Overcrowded trust signals
 * cause cognitive overload and measurably hurt conversion.
 * Rank: verified > owner > everything else.
 */
export default function TrustBadge({ variant = 'verified', label, className = '' }) {
  const config = VARIANTS[variant] ?? VARIANTS.verified;
  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-tiny font-bold ${config.className} ${className}`}
    >
      {Icon ? <Icon className="size-3 shrink-0" aria-hidden="true" /> : null}
      {label ?? config.label}
    </span>
  );
}
