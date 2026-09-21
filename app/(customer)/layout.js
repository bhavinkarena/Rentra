import Link from 'next/link';
import { RentraLogo } from '@/components/rentra/Logo';
import CustomerNavigation from '@/components/customer/CustomerNavigation';
import { requireCustomer } from '@/lib/api/session';

export const metadata={ title:{default:'Your account',template:'%s | Rentra'},robots:{index:false,follow:false,nocache:true} };
export default async function CustomerLayout({children}) {
  await requireCustomer();
  return <div className="min-h-screen bg-ink-25">
    <a href="#customer-content" className="sr-only focus:not-sr-only focus:block focus:p-3">Skip to account content</a>
    <header className="border-b border-border bg-background"><div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3"><Link href="/" aria-label="Rentra home"><RentraLogo className="h-7 w-auto"/></Link><CustomerNavigation authenticated compact/></div></header>
    <main tabIndex={-1} id="customer-content" className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
  </div>;
}
