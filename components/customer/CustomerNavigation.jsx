'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CustomerNavigation() {
  const pathname=usePathname();
  return <nav aria-label="Customer navigation" className="flex flex-wrap gap-1 text-meta font-medium">
    {[['/','Explore'],['/saved','Saved'],['/bookings','Bookings'],['/account','Account']].map(([href,label])=><Link key={href} href={href}
      aria-current={pathname===href || (href==='/account' && pathname.startsWith('/account/'))?'page':undefined}
      className="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-brand-50 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800">{label}</Link>)}
  </nav>;
}
