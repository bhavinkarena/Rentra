import { RentraMark } from '@/components/rentra/Logo';

/** Shared brand motion for route transitions, live data and pending controls. */
export default function RentraLoader({
  label = 'Loading…',
  variant = 'inline',
  inverse = false,
  className = '',
  ...props
}) {
  const page = variant === 'page';
  return (
    <span
      {...props}
      data-tone={inverse ? 'inverse' : 'brand'}
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`rentra-loading ${page ? 'rentra-loading-page' : 'rentra-loading-inline'} ${className}`}
    >
      <span className="rentra-loading-art" aria-hidden="true">
        <span className="rentra-loading-halo" />
        <span className="rentra-loading-ring" />
        <span className="rentra-loading-core">
          <RentraMark className="rentra-loading-mark" />
        </span>
      </span>
    </span>
  );
}
