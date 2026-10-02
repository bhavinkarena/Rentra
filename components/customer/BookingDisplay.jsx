import Image from 'next/image';
import { ImageOff } from 'lucide-react';
export { displayMoney } from '@/lib/domain/display-money';
export const linkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50';
export const badge =
  'inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 first-letter:uppercase';
const STATE_TONES = {
  confirmed: 'bg-success-bg text-success',
  completed: 'bg-success-bg text-success',
  succeeded: 'bg-success-bg text-success',
  cancelled: 'bg-ink-100 text-ink-700',
  expired: 'bg-ink-100 text-ink-700',
  failed: 'bg-danger-bg text-danger',
  disputed: 'bg-warning-bg text-warning',
};
/** Status pill: underscores become spaces, colour follows the state. */
export function StateBadge({ state, children }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold first-letter:uppercase ${STATE_TONES[state] ?? 'bg-info-bg text-info'}`}
    >
      {children ?? state.replaceAll('_', ' ')}
    </span>
  );
}
export function PropertyPhoto({ photo, title, hero = false }) {
  return (
    <div
      className={`relative overflow-hidden bg-brand-50 ${hero ? 'h-56 sm:h-72' : 'h-full min-h-28 sm:min-h-48'}`}
    >
      {photo ? (
        <Image
          src={
            hero
              ? photo.url
              : photo.url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_400/')
          }
          alt={photo.alt || title}
          fill
          sizes={hero ? '(max-width: 768px) 100vw, 900px' : '(max-width: 640px) 112px, 200px'}
          className="object-cover"
        />
      ) : (
        <div
          className={`flex h-full flex-col items-center justify-center gap-2 text-brand-700 ${hero ? '' : 'min-h-28'}`}
        >
          <ImageOff className="size-8" />
          <span className={hero ? 'text-xs' : 'sr-only'}>Property photo unavailable</span>
        </div>
      )}
    </div>
  );
}
export function totalPrice(record) {
  return record.rentMinor == null || record.feeMinor == null
    ? null
    : record.rentMinor + record.feeMinor;
}
