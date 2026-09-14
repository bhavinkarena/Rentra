'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSavedPlaces } from './SavedPlacesProvider';

export default function CustomerNavigation({ authenticated = false, compact = false }) {
  const pathname=usePathname();
  const saved = useSavedPlaces();
  const customer = authenticated || saved?.mode === 'customer';
  const explore = pathname === '/' || pathname === '/search' || (!pathname.startsWith('/listing/') && /^\/[^/]+\/[^/]+/.test(pathname));
  const items = [['/','Explore'],['/saved','Saved'],...(customer ? [['/account','Account']] : [['/login','Log in']])];
  return <nav aria-label="Customer navigation" className={`flex items-center gap-1 text-meta font-medium ${compact ? 'max-sm:text-tiny' : ''}`}>
    {items.map(([href,label])=><Link key={href} href={href}
      aria-current={(href==='/' ? explore : pathname===href || (href==='/account' && pathname.startsWith('/account/')))?'page':undefined}
      className="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-brand-50 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800">{label}</Link>)}
  </nav>;
}
