import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa6';
import { RentraLogo, RentraMark } from '@/components/rentra/Logo';
import { getCities } from '@/lib/db/queries';
import { INTENTS } from '@/lib/constants';

export default async function MarketingLayout({ children }) {
  const cities = await getCities();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-(--container-page) items-center gap-4 px-6 py-3">
          <Link href="/" className="shrink-0">
            {/* The lockup is the home link. On the narrowest phones the mark
                alone carries it, so the search bar keeps its width. */}
            <RentraLogo className="hidden h-7 w-auto sm:block" />
            <RentraMark className="size-8 sm:hidden" />
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-meta font-medium">
            <Link href="/partner/login" className="rounded-full px-3 py-2 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
              List your farm
            </Link>
            <Link href="/login" className="rounded-full px-3 py-2 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-border bg-ink-50">
        <div className="mx-auto max-w-(--container-page) px-6 py-12">
          <p className="text-tiny font-bold tracking-widest text-ink-500 uppercase">
            Farmhouses by area
          </p>
          {/* SEO taxonomy: one indexable page per city × category × intent. */}
          <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {cities.flatMap((city) =>
              INTENTS.slice(0, 3).map((intent) => (
                <Link
                  key={`${city.slug}-${intent.slug}`}
                  href={`/${city.slug}/farmhouse/${intent.slug}`}
                  className="text-meta text-ink-600 hover:text-brand-700 hover:underline"
                >
                  Farmhouse for {intent.label.toLowerCase()} in {city.name}
                </Link>
              )),
            )}
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

      <a
        href="https://wa.me/919000000000"
        aria-label="Chat with Rentra on WhatsApp"
        /* --float-bottom lets a listing page's sticky booking bar push this
           up out of the way, with no JS. See the rule in globals.css. */
        className="fixed right-5 bottom-(--float-bottom) z-40 grid size-13 place-items-center rounded-full bg-whatsapp text-white shadow-lg transition hover:brightness-95"
      >
        <FaWhatsapp className="size-7" aria-hidden="true" />
      </a>
    </div>
  );
}
