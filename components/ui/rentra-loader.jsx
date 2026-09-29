import { cn } from 'cn';
import { RentraMark } from '@/components/rentra/Logo';

/** Inline actions use one spinner; larger pending regions retain the upright mark. */
export default function RentraLoader({
  label = 'Loading…',
  variant = 'inline',
  inverse = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': hidden,
  ...props
}) {
  const page = variant === 'page';
  const decorative = hidden === true || hidden === 'true';
  return (
    <span
      {...props}
      data-tone={inverse ? 'inverse' : 'brand'}
      role={decorative ? undefined : 'status'}
      aria-live={decorative ? undefined : 'polite'}
      aria-hidden={hidden}
      aria-label={decorative ? undefined : (ariaLabel ?? label)}
      className={cn(page ? 'rentra-loading-page' : 'rentra-spinner', className)}
    >
      {page ? (
        <span className="rentra-loading-art" aria-hidden="true">
          <span className="rentra-spinner" />
          <RentraMark tone={inverse ? 'inverse' : 'brand'} className="rentra-loading-mark" />
        </span>
      ) : null}
    </span>
  );
}
