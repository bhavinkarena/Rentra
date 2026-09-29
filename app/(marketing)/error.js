'use client';
import RouteError from '@/components/rentra/RouteError';

export default function MarketingError({ retry }) {
  return <RouteError retry={retry} link={{ href: '/search', label: 'Explore places' }} />;
}
