import Image from 'next/image';
import Link from '@/components/navigation/NavigationLink';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';

export default function AuthLayout({ partner = false, children }) {
  return (
    <div className="mx-auto grid min-h-dvh max-w-(--container-page) gap-7 p-4 sm:gap-8 sm:p-8 lg:grid-cols-2 lg:gap-16">
      <aside
        data-surface="inverse"
        className="relative order-2 min-h-60 overflow-hidden rounded-xl bg-brand-900 lg:order-1 lg:min-h-[640px]"
      >
        <Image
          src={partner ? '/images/partner-login.jpg' : '/images/guest-login.jpg'}
          alt={partner ? 'A welcoming farmhouse bedroom' : 'A pool surrounded by greenery'}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          loading="lazy"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
          <h2 className="max-w-md text-2xl leading-tight font-semibold sm:text-4xl">
            {partner
              ? 'Your place. Their favourite getaway.'
              : 'Good company. Great places. Lasting memories.'}
          </h2>
          <p className="mt-4 hidden max-w-sm text-sm leading-relaxed text-white/85 sm:block">
            {partner
              ? 'Welcome guests, manage your calendar and keep every booking in one place.'
              : 'Find a farmhouse for slow weekends, pool days and time with your favourite people.'}
          </p>
        </div>
      </aside>
      <div className="order-1 flex flex-col justify-center px-2 py-5 sm:px-8 lg:order-2 lg:px-4">
        <Link href="/" className="mb-6 w-fit sm:mb-10" aria-label="Rentra home">
          <RentraLogo className="h-9 w-auto" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-500">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 hover:text-brand-700">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to exploring
          </Link>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Password-free sign in
          </span>
        </div>
      </div>
    </div>
  );
}
