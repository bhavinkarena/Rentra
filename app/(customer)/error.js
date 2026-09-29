'use client';
import RouteError from '@/components/rentra/RouteError';

export default function CustomerError({ retry }) {
  return (
    <RouteError
      retry={retry}
      title="Your account page couldn’t load"
      description="Nothing in your account has been changed. Please try again in a moment."
      link={{ href: '/account', label: 'Go to your account' }}
    />
  );
}
