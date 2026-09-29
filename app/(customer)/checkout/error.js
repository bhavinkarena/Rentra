'use client';
import RouteError from '@/components/rentra/RouteError';

export default function CheckoutError({ retry }) {
  return (
    <RouteError
      retry={retry}
      title="Checkout could not load"
      description="Your payment may still be processing. Reload this checkout to recover its status before creating another booking."
      link={{ href: '/bookings', label: 'Find recent test checkouts' }}
    />
  );
}
