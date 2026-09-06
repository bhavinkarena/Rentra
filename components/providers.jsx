'use client';

import { Toaster } from 'react-hot-toast';
import StoreProvider from '@/lib/store/StoreProvider';

/**
 * Client boundary for app-wide providers.
 *
 * `children` still renders as Server Components — passing them through a
 * Client Component does not convert them. So this costs almost no JS on
 * public pages while making the store and toaster available where needed.
 */
export default function Providers({ children }) {
  return (
    <StoreProvider>
      {children}
      <Toaster
        position="bottom-center"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-ink-900)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            maxWidth: '420px',
          },
          success: { iconTheme: { primary: 'var(--color-brand-400)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' } },
        }}
      />
    </StoreProvider>
  );
}
