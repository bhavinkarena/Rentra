import Image from 'next/image';
import { ImageOff } from 'lucide-react';
export const linkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50';
export const badge =
  'inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800';
export function PropertyPhoto({ photo, title, hero = false }) {
  return (
    <div
      className={`relative overflow-hidden bg-brand-50 ${hero ? 'h-56 sm:h-72' : 'h-48 sm:h-full sm:min-h-48'}`}
    >
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt || title}
          fill
          sizes={hero ? '(max-width: 768px) 100vw, 900px' : '(max-width: 640px) 100vw, 260px'}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-brand-700">
          <ImageOff className="size-8" />
          <span className="text-xs">Property photo unavailable</span>
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
