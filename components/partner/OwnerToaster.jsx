'use client';
import { Toaster } from 'react-hot-toast';
export default function OwnerToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 5000,
        ariaProps: { role: 'status', 'aria-live': 'polite' },
        style: { maxWidth: 'calc(100vw - 32px)' },
      }}
    />
  );
}
