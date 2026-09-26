import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Leaf, ShieldCheck } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';

export default function AuthLayout({ partner = false, children }) {
  return (
    <div className="mx-auto grid min-h-[90svh] max-w-7xl gap-4 p-4 sm:gap-8 sm:p-8 lg:grid-cols-2 lg:gap-16">
      <aside className="relative min-h-48 sm:min-h-64 overflow-hidden rounded-[2rem] bg-brand-900 lg:min-h-[700px]">
        <Image
          src={partner ? '/images/partner-login.jpg' : '/images/guest-login.jpg'}
          alt={partner ? 'A welcoming farmhouse bedroom' : 'A pool surrounded by greenery'}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          preload
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
            <Leaf className="size-4" />
            {partner ? 'Rentra for partners' : 'A little closer to your next escape'}
          </span>
          <h2 className="max-w-md text-2xl leading-tight font-semibold sm:text-4xl">
            {partner
              ? 'Your place. Their favourite getaway.'
              : 'Good company. Great places. Lasting memories.'}
          </h2>
          <p className="mt-4 hidden max-w-sm sm:block text-sm leading-relaxed text-white/85">
            {partner
              ? 'Welcome guests, manage your calendar and keep every booking in one place.'
              : 'Find a farmhouse for slow weekends, pool days and time with your favourite people.'}
          </p>
        </div>
      </aside>
      <div className="flex flex-col justify-center px-2 py-5 sm:px-8 lg:px-4">
        <Link href="/" className="mb-6 w-fit sm:mb-10" aria-label="Rentra home">
          <RentraLogo className="h-9 w-auto" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-500">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 hover:text-brand-700">
            <ArrowLeft className="size-4" />
            Back to exploring
          </Link>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Password-free sign in
          </span>
        </div>
      </div>
    </div>
  );
}
