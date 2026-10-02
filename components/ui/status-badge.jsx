import { STATUS_TONES, statusMeta } from '@/lib/domain/status';

/** Dot plus text, never colour alone (DS-02). `children` overrides the label. */
export function StatusBadge({ domain = 'booking', state, tone, children, className = '' }) {
  const meta = statusMeta(domain, state);
  const colours = STATUS_TONES[tone ?? meta.tone] ?? STATUS_TONES.neutral;
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-tiny font-semibold ring-1 ring-inset ${colours.badge} ${className}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${colours.dot}`} aria-hidden="true" />
      {children ?? meta.label}
    </span>
  );
}
