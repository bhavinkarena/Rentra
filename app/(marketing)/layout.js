import Link from '@/components/navigation/NavigationLink';
import { Suspense } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { ArrowUpRight } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';
import { publicContact } from '@/lib/api/content';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import FooterDiscovery from '@/components/customer/FooterDiscovery';
import CustomerHeader from '@/components/customer/CustomerHeader';
import styles from '@/components/customer/CustomerShell.module.css';
import Providers from '@/components/providers';

export default function MarketingLayout({ children }) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-4"
        >
          Skip to main content
        </a>
        <CustomerHeader />

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>

        <Suspense
          fallback={<footer className={`${styles.footer} min-h-80`} aria-label="Explore places" />}
        >
          <MarketingFooter />
        </Suspense>

        <Suspense fallback={null}>
          <PublishedWhatsApp />
        </Suspense>
      </div>
    </Providers>
  );
}

async function PublishedWhatsApp() {
  const content = await degradeOnFailure(() => publicContact(), null, 'public support contact');
  const whatsapp = content?.body.whatsapp;
  return whatsapp ? (
    <a
      href={`https://wa.me/${whatsapp}`}
      aria-label="Message Rentra on WhatsApp"
      /* --float-bottom lets a listing page's sticky booking bar push this
           up out of the way, with no JS. See the rule in globals.css. */
      className="fixed right-5 bottom-(--float-bottom) z-40 grid size-13 place-items-center rounded-full bg-whatsapp text-white shadow-lg transition hover:brightness-95"
    >
      <FaWhatsapp className="size-7" aria-hidden="true" />
    </a>
  ) : null;
}

async function MarketingFooter() {
  /* The footer's location links are chrome. If the registry is unreachable
     the public site must still render — an empty link list beats a 500 on
     every marketing page, including at build time when no API is running. */
  const { cities, categories } = await degradeOnFailure(
    () => discoveryApi.registry(),
    EMPTY_REGISTRY,
    'marketing footer registry',
  );
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.invitation}>
          <h2>
            Make room for
            <br />
            <span>a little getaway.</span>
          </h2>
          <Link href="/search" className={styles.exploreButton}>
            Find your next place <ArrowUpRight size={22} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.footerColumns}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label="Rentra home">
              <RentraLogo tone="inverse" />
            </Link>
            <p>Pool days, slow weekends and good company. Find a place to make them happen.</p>
          </div>
          <div>
            <h3>Your next getaway</h3>
            <nav aria-label="Explore Rentra">
              <Link href="/search">Explore all places</Link>
              <Link href="/saved">Your saved places</Link>
              <Link href="/help">
                Help and support <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </nav>
          </div>
          <div>
            <h3>Have a place to share?</h3>
            <p>Bring your property to Rentra and welcome your next guests.</p>
            <nav aria-label="Hosting">
              <Link href="/partner/login">
                List your place <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </div>
        {categories.length > 0 && cities.length > 0 && (
          <FooterDiscovery cities={cities} categories={categories} />
        )}
        <div className={styles.legal}>
          <nav aria-label="Legal policies">
            {['terms', 'cancellation', 'privacy'].map((kind) => (
              <Link key={kind} href={`/policies/${kind}`}>
                {kind[0].toUpperCase() + kind.slice(1)} policy
              </Link>
            ))}
          </nav>
          <span>Rentra. A place for good times.</span>
        </div>
        <p className={styles.disclaimer}>
          Rentra is an intermediary facilitating bookings between owners and guests. It is not the
          owner, lessor or operator of any property.
        </p>
      </div>
    </footer>
  );
}
