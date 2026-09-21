import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa6';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { INTENTS } from '@/lib/constants';
import CustomerNavigation from '@/components/customer/CustomerNavigation';

export default async function MarketingLayout({ children }) {
  /* The footer's location links are chrome. If the registry is unreachable
     the public site must still render — an empty link list beats a 500 on
     every marketing page, including at build time when no API is running. */
  const { cities, categories } = await degradeOnFailure(
    () => discoveryApi.registry(),
    EMPTY_REGISTRY,
    'marketing footer registry',
  );
  const farmhouse = categories.find(c => c.slug === 'farmhouse');
  const whatsapp = /^\d{10,15}$/.test(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '')
    ? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER : null;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-4">Skip to main content</a>
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Rentra home">
            {/* The lockup is the home link. On the narrowest phones the mark
                alone carries it, so the search bar keeps its width. */}
            <RentraLogo className="hidden h-7 w-auto sm:block" />
            <RentraMark className="size-8 sm:hidden" />
          </Link>
          <div className="ml-auto"><CustomerNavigation compact /></div>
          <Link href="/partner/login" className="hidden min-h-11 items-center rounded-full px-3 text-meta text-ink-500 hover:bg-brand-50 hover:text-brand-700 md:inline-flex">List your place</Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">{children}</main>

      <footer className="mt-20 border-t border-border bg-ink-50">
        <div className="mx-auto max-w-(--container-page) px-6 py-12">
          <p className="text-tiny font-bold tracking-widest text-ink-500 uppercase">
            Explore places
          </p>
          {/* SEO taxonomy: one indexable page per city × category × intent. */}
          <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {cities.flatMap((city) =>
              (farmhouse ? INTENTS.slice(0, 3) : []).map((intent) => (
                <Link
                  key={`${city.slug}-${intent.slug}`}
                  href={`/${city.slug}/farmhouse/intent/${intent.slug}`}
                  className="text-meta text-ink-600 hover:text-brand-700 hover:underline"
                >
                  Farmhouse for {intent.label.toLowerCase()} in {city.name}
                </Link>
              )),
            )}
            {cities.flatMap(city => categories.map(category => <Link key={`${city.id}-${category.id}`} href={`/${city.slug}/${category.slug}`} className="text-meta text-ink-600 hover:underline">{category.name} in {city.name}</Link>))}
            <Link href="/search" className="text-meta text-ink-600 hover:underline">Search all places</Link>
            <Link href="/help" className="text-meta text-ink-600 hover:underline">Help and support</Link>
            {['terms','cancellation','privacy'].map(kind => <Link key={kind} href={`/policies/${kind}`} className="text-meta text-ink-600 hover:underline">{kind[0].toUpperCase()+kind.slice(1)} policy</Link>)}
            <Link href="/partner/login" className="text-meta text-ink-600 hover:underline">List your place</Link>
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-start sm:gap-8">
            <RentraLogo className="h-6 w-auto shrink-0" />
            <p className="text-tiny text-ink-500">
              Rentra is an intermediary facilitating bookings between owners and
              guests. It is not the owner, lessor or operator of any property.
            </p>
          </div>
        </div>
      </footer>

      {whatsapp ? <a
        href={`https://wa.me/${whatsapp}`}
        aria-label="Message Rentra on WhatsApp"
        /* --float-bottom lets a listing page's sticky booking bar push this
           up out of the way, with no JS. See the rule in globals.css. */
        className="fixed right-5 bottom-(--float-bottom) z-40 grid size-13 place-items-center rounded-full bg-whatsapp text-white shadow-lg transition hover:brightness-95"
      >
        <FaWhatsapp className="size-7" aria-hidden="true" />
      </a> : null}
    </div>
  );
}
