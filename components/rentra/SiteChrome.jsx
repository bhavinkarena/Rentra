import Link from '@/components/navigation/NavigationLink';
import { Suspense } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import { publicContact } from '@/lib/api/content';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { ArrowUpRight } from 'lucide-react';
import CustomerNavigation from '@/components/customer/CustomerNavigation';
import Providers from '@/components/providers';
import HeaderSearch from '@/components/rentra/HeaderSearch';

/**
 * The public site chrome: skip link, sticky header, main landmark, dark footer
 * and the published WhatsApp contact. Shared by public pages, signed-in
 * customer pages and the 404 so moving between them never changes the frame.
 */
export default function SiteChrome({
  children,
  navigation = <CustomerNavigation compact />,
  contentId = 'main-content',
  skipLabel = 'Skip to main content',
  whatsapp = true,
}) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <a
          href={`#${contentId}`}
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-4"
        >
          {skipLabel}
        </a>
        {/* Fixed 68px in the flow, so docking never shifts the page. Docked, the
            background scales down to 60px and the row lifts 4px — transforms only.
            The transparent strip left below must not swallow taps, hence the
            pointer-events split. */}
        <header data-site-header className="pointer-events-none sticky top-0 z-50 h-17">
          <div
            aria-hidden="true"
            className="absolute inset-0 origin-top border-b border-border bg-background/90 backdrop-blur transition-[scale] duration-250 ease-out-strong docked:scale-y-[0.8824] search-open:bg-background"
          />
          <div className="relative mx-auto flex h-full max-w-(--container-page) items-center gap-2 px-4 transition-[translate] duration-250 ease-out-strong sm:px-6 docked:-translate-y-1">
            <Link href="/" className="pointer-events-auto shrink-0" aria-label="Rentra home">
              {/* The lockup is the home link. On the narrowest phones the mark
                alone carries it, so the search bar keeps its width. */}
              <RentraLogo className="hidden h-7 w-auto sm:block" />
              <RentraMark className="size-8 sm:hidden" />
            </Link>
            <HeaderSearch />
            <div className="pointer-events-auto relative ml-auto">{navigation}</div>
            <Link
              href="/partner/login"
              className="pointer-events-auto relative hidden min-h-11 items-center rounded-full px-3 text-meta text-ink-500 hover:bg-brand-50 hover:text-brand-700 md:inline-flex docked:max-lg:hidden"
            >
              List your place
            </Link>
          </div>
        </header>

        <main id={contentId} tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>

        <Suspense
          fallback={
            <footer className="mt-20 min-h-80 bg-forest-deep" aria-label="Explore places" />
          }
        >
          <MarketingFooter />
        </Suspense>

        {whatsapp ? (
          <Suspense fallback={null}>
            <PublishedWhatsApp />
          </Suspense>
        ) : null}
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
  const farmhouse = categories.find((c) => c.slug === 'farmhouse');
  const heading = 'text-tiny font-semibold tracking-wider text-champagne uppercase';
  const link = 'text-meta text-on-dark-muted transition-colors hover:text-white';
  return (
    <footer data-surface="inverse" className="mt-16 bg-forest-deep text-paper">
      <div className="mx-auto max-w-(--container-page) px-4 pt-12 sm:px-6 pb-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-10">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Rentra home" className="inline-block">
              <RentraLogo tone="inverse" className="h-7 w-auto" />
            </Link>
            <p className="mt-4 text-h3 font-medium tracking-tight lg:mt-5">
              Make room for <span className="text-champagne">a little getaway.</span>
            </p>
            <p className="mt-2 max-w-xs text-meta text-on-dark-muted max-sm:hidden">
              Pool days, slow weekends and good company. Find a place to make them happen.
            </p>
          </div>

          <nav aria-label="Explore Rentra">
            <h2 className={heading}>Your next getaway</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/search" className={link}>
                  Explore all places
                </Link>
              </li>
              <li>
                <Link href="/saved" className={link}>
                  Your saved places
                </Link>
              </li>
              <li>
                <Link href="/help" className={link}>
                  Help and support
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className={heading}>Have a place to share?</h2>
            <p className="mt-4 max-w-56 text-meta text-on-dark-muted max-sm:hidden">
              Bring your property to Rentra and welcome your next guests.
            </p>
            <Link
              href="/partner/login"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-champagne px-4 text-meta font-semibold text-forest-deep transition-colors hover:bg-champagne-hover"
            >
              List your place
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {farmhouse && cities.length > 0 ? (
            <nav aria-label="Farmhouses by city" className="col-span-2 lg:col-span-1">
              <h2 className={heading}>Farmhouses near you</h2>
              <ul className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2.5 sm:grid-cols-5 lg:grid-cols-2 lg:gap-x-6">
                {cities.map((city) => (
                  <li key={city.slug}>
                    <Link href={`/${city.slug}/${farmhouse.slug}`} className={link}>
                      {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-forest-line pt-5 text-tiny text-on-dark-muted md:flex-row md:items-center md:justify-between">
          <nav aria-label="Legal policies" className="flex flex-wrap gap-x-5">
            {['terms', 'cancellation', 'privacy'].map((kind) => (
              <Link
                key={kind}
                href={`/policies/${kind}`}
                className="inline-flex min-h-6 items-center hover:text-white"
              >
                {kind[0].toUpperCase() + kind.slice(1)} policy
              </Link>
            ))}
          </nav>
          <p className="max-w-2xl md:text-right">
            Rentra is an intermediary facilitating bookings between owners and guests. It is not the
            owner, lessor or operator of any property.
          </p>
        </div>
      </div>
    </footer>
  );
}
