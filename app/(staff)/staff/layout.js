import { portalFont } from '@/lib/portal-font';

export const metadata = {
  title: { default: 'Caretaker', template: '%s · Rentra caretaker' },
  robots: { index: false, follow: false, nocache: true },
};

/** The caretaker workspace (CP16): phone-first, separate from the owner portal. */
export default function StaffLayout({ children }) {
  return (
    <div className={`${portalFont.variable} portal-ui min-h-screen bg-background`}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <span className="text-h4 font-bold text-brand-800">rentra</span>
          <span className="text-tiny font-semibold text-ink-500">Caretaker</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
