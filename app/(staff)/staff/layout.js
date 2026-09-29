import { RentraLogo } from '@/components/rentra/Logo';
import { portalFont } from '@/lib/portal-font';

export const metadata = {
  title: { default: 'Caretaker', template: '%s · Rentra caretaker' },
  robots: { index: false, follow: false, nocache: true },
};

/** The caretaker workspace (CP16): phone-first, separate from the owner portal. */
export default function StaffLayout({ children }) {
  return (
    <div className={`${portalFont.variable} portal-ui min-h-screen bg-background`}>
      <a
        href="#staff-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-3"
      >
        Skip to visit tasks
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <RentraLogo className="h-7 w-auto" />
          <span className="text-tiny font-semibold text-ink-500">Caretaker</span>
        </div>
      </header>
      <main id="staff-main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
