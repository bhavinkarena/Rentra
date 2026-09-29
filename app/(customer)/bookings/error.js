'use client';
import RouteError from '@/components/rentra/RouteError';

export default function BookingsError({ retry }) {
  return (
    <RouteError
      retry={retry}
      title="Booking records are temporarily unavailable"
      description="Your booking has not been changed. Try loading the record again."
      link={{ href: '/bookings', label: 'All bookings' }}
    />
  );
}
