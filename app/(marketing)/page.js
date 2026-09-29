import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import HomeHero from '@/components/rentra/home/HomeHero';
import PlaceCarousel from '@/components/rentra/home/PlaceCarousel';
import TripPicker from '@/components/rentra/home/TripPicker';
import styles from '@/components/rentra/home/home.module.css';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { ArrowUpRight } from 'lucide-react';

export const metadata = publicMetadata({
  title: 'Explore farmhouses and day visits',
  description:
    'Explore places for day visits and overnight stays. Compare facilities and check prices for your dates.',
  path: '/',
});
export const revalidate = 3600;

export default async function HomePage() {
  const [listingResult, registry] = await Promise.all([
    degradeOnFailure(() => discoveryApi.listings({ limit: 16 }), null, 'home listings'),
    degradeOnFailure(() => discoveryApi.registry(), EMPTY_REGISTRY, 'home registry'),
  ]);
  const listings = listingResult ?? [];
  const sharedPriceNote =
    listings.length > 1 &&
    listings[0].priceNote &&
    listings.every((listing) => listing.priceNote === listings[0].priceNote)
      ? listings[0].priceNote
      : null;
  const farmhouse = registry.categories.find((item) => item.slug === 'farmhouse');
  return (
    <div className={styles.page}>
      <section aria-label="Find your next getaway">
        <div className={styles.heroWrap}>
          <HomeHero places={listings.filter((listing) => listing.photo).slice(0, 3)} />
        </div>
        <div id="find-a-place" className={styles.searchDock}>
          <SearchBar />
          {farmhouse && registry.cities.length > 0 && (
            <div className={styles.destinations}>
              <span>Somewhere nearby?</span>
              <nav className={styles.cityLinks} aria-label="Explore destinations">
                {registry.cities.map((city) => (
                  <Link key={city.slug} href={`/${city.slug}/${farmhouse.slug}`}>
                    {city.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="places-heading">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="places-heading">
              A change of scene
              <br />
              starts here.
            </h2>
            <p className="mt-4">Explore farmhouses and stays. Save the ones you love.</p>
          </div>
          <Link href="/search" className={styles.textLink}>
            Explore all places <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </div>
        {listings.length > 0 ? (
          <>
            <PlaceCarousel count={listings.length}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showPriceNote={!sharedPriceNote}
                  priceNoteId={sharedPriceNote ? 'home-price-note' : undefined}
                />
              ))}
            </PlaceCarousel>
            {sharedPriceNote && (
              <p id="home-price-note" className={styles.priceNote}>
                {sharedPriceNote}
              </p>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <h3>
              {listingResult === null
                ? 'Places are temporarily unavailable'
                : 'No places to show yet'}
            </h3>
            <p>
              {listingResult === null
                ? 'Places could not load right now. Search to check current availability.'
                : 'Try a search to explore places for your next visit.'}
            </p>
            <Link href="/search" className={styles.textLink}>
              Search places <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
      <TripPicker cities={registry.cities} category={farmhouse?.slug} />
      <section className={styles.section} aria-labelledby="booking-heading">
        <div className={styles.closing}>
          <h2 id="booking-heading">
            Less guesswork.
            <br />
            More looking forward.
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Find a place that fits</strong>
                <p>Explore photos, amenities and house rules before you choose.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Make it your kind of visit</strong>
                <p>Select dates, a day or overnight slot, and the people coming along.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Know the total before you book</strong>
                <p>Review rent, guest charges, platform fees and separate deposit terms.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
