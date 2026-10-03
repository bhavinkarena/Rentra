import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
export { displayMoney } from '@/lib/domain/display-money';
export const linkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50';
/** Status pill for bookings, visits, payments and cases (DS-02). */
export function StateBadge({ state, children, domain = 'booking' }) {
  return (
    <StatusBadge domain={domain} state={state}>
      {children}
    </StatusBadge>
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
