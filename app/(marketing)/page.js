import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import TrustStrip from '@/components/rentra/TrustStrip';
import { getLiveListings } from '@/lib/db/queries';
import { INTENTS } from '@/lib/constants';

export const metadata = {
  title: 'Book a verified farmhouse near Surat — no brokerage',
  description:
    'Day picnics and overnight stays at physically verified farmhouses around '
    + 'Surat. Transparent pricing, money held until check-in, zero brokerage.',
  alternates: { canonical: '/' },
};

// Classic ISR — content changes slowly, so serve from cache and revalidate
// hourly. On-demand revalidation happens when a Client edits a listing.
export const revalidate = 3600;

export default async function HomePage() {
  const listings = await getLiveListings({ citySlug: 'surat', limit: 16 });

  // The hero is the top-ranked listing's own first frame, not a stock image.
  // It comes from the card query, so this page is one round trip.
  const heroPhoto = listings[0]?.photo ?? null;

  return (
    <>
      <section className="relative border-b border-border">
        {heroPhoto ? (
          <>
            <Image
              src={heroPhoto.url}
              alt=""
              fill
              /* `priority` is deprecated in Next 16. The hero is the one
                 unambiguous LCP element on every viewport, so it is the only
                 image on the page that earns a preload. */
              preload
              quality={60}
              sizes="100vw"
              className="object-cover"
            />
            {/* Scrim, not a tint: keeps AA contrast on the headline over any
                photo while letting the photograph still read as the subject. */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950/92 via-brand-950/75 to-brand-900/45" />
          </>
        ) : (
          <div className="absolute inset-0 bg-brand-900" />
        )}
        <div className="relative mx-auto max-w-(--container-page) px-6 py-20 md:py-28">
          <h1 className="max-w-2xl text-display text-white">
            Book a verified farmhouse, directly from the owner.
          </h1>
          <p className="mt-4 max-w-prose text-body-lg text-brand-100">
            Day picnics and overnight stays around Surat. Every farm on Rentra
            has been visited and photographed by us. No dalal, no brokerage,
            and your money stays with us until you have checked in.
          </p>
          <SearchBar />

          <ul className="mt-6 flex flex-wrap gap-2">
            {INTENTS.map((intent) => (
              <li key={intent.slug}>
                <Link
                  href={`/surat/farmhouse/${intent.slug}`}
                  className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-2 text-meta font-medium text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/20"
                >
                  {intent.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-6 py-12">
        <TrustStrip />
      </section>

      <section className="mx-auto max-w-(--container-page) px-6 pb-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-h2">Farmhouses near Surat</h2>
          <p className="text-meta text-ink-500">
            {listings.length} verified {listings.length === 1 ? 'farm' : 'farms'}
          </p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </>
  );
}
