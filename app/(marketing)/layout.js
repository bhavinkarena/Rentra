import Link from '@/components/navigation/NavigationLink';
import { Suspense } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import { publicContact } from '@/lib/api/content';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { INTENTS } from '@/lib/constants';
import CustomerNavigation from '@/components/customer/CustomerNavigation';
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
        <header className="sticky top-0 z-50 border-b border-border bg-card">
          <div className="mx-auto flex min-h-18 max-w-(--container-page) items-center gap-2 px-4 py-3 sm:gap-5 sm:px-6">
            <Link href="/" className="shrink-0" aria-label="Rentra home">
              {/* The lockup is the home link. On the narrowest phones the mark
                alone carries it, so the search bar keeps its width. */}
              <RentraLogo className="hidden h-8 w-auto sm:block" />
              <RentraMark className="size-8 sm:hidden" />
            </Link>
            <div className="ml-auto">
              <CustomerNavigation compact />
            </div>
            <Link
              href="/partner/login"
              className="hidden min-h-11 items-center rounded-md border border-border px-4 text-meta font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 md:inline-flex"
            >
              List your place
            </Link>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>

        <Suspense
          fallback={
            <footer
              className="mt-20 min-h-80 border-t border-border bg-ink-50"
              aria-label="Explore places"
            />
          }
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
  const farmhouse = categories.find((c) => c.slug === 'farmhouse');
  return (
    <footer className="mt-12 border-t border-border bg-brand-50/60">
      <div className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6 border-b border-brand-200 pb-8">
          <div>
            <RentraLogo className="h-8 w-auto" />
            <p className="mt-3 max-w-sm text-meta text-ink-600">
              A place for your next day out or overnight stay.
            </p>
          </div>
          <nav
            aria-label="Help and information"
            className="flex flex-wrap gap-x-6 gap-y-2 text-meta"
          >
            <Link
              href="/help"
              className="inline-flex min-h-11 items-center text-ink-700 hover:text-brand-700 hover:underline"
            >
              Help and support
            </Link>
            <Link
              href="/partner/login"
              className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline"
            >
              List your place
            </Link>
          </nav>
        </div>
        <h2 className="text-h4">Explore places</h2>
        {/* SEO taxonomy: one indexable page per city × category × intent. */}
        <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {cities.flatMap((city) =>
            (farmhouse ? INTENTS.slice(0, 3) : []).map((intent) => (
              <Link
                key={`${city.slug}-${intent.slug}`}
                href={`/${city.slug}/farmhouse/intent/${intent.slug}`}
                className="inline-flex min-h-11 items-center text-meta text-ink-600 hover:text-brand-700 hover:underline"
              >
                Farmhouse for {intent.label.toLowerCase()} in {city.name}
              </Link>
            )),
          )}
          {cities.flatMap((city) =>
            categories.map((category) => (
              <Link
                key={`${city.id}-${category.id}`}
                href={`/${city.slug}/${category.slug}`}
                className="inline-flex min-h-11 items-center text-meta text-ink-600 hover:underline"
              >
                {category.name} in {city.name}
              </Link>
            )),
          )}
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center text-meta text-ink-600 hover:underline"
          >
            Search all places
          </Link>
        </div>
        <nav
          aria-label="Legal policies"
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-brand-200 pt-5"
        >
          {['terms', 'cancellation', 'privacy'].map((kind) => (
            <Link
              key={kind}
              href={`/policies/${kind}`}
              className="inline-flex min-h-11 items-center text-meta text-ink-600 hover:text-brand-700 hover:underline"
            >
              {kind[0].toUpperCase() + kind.slice(1)} policy
            </Link>
          ))}
        </nav>
        <div className="mt-5">
          <p className="max-w-3xl text-tiny leading-relaxed text-ink-600">
            Rentra is an intermediary facilitating bookings between owners and guests. It is not the
            owner, lessor or operator of any property.
          </p>
        </div>
      </div>
    </footer>
  );
}
