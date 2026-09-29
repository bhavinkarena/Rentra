import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';
import CustomerNavigation from './CustomerNavigation';
import styles from './CustomerShell.module.css';

export default function CustomerHeader({ authenticated = false, profile }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logo} aria-label="Rentra home">
          <RentraLogo className="h-8 w-auto" />
        </Link>
        <div className={styles.navigation}>
          <CustomerNavigation authenticated={authenticated} compact profile={profile} />
        </div>
        <Link href="/partner/login" className={styles.hostLink}>
          List your place <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
