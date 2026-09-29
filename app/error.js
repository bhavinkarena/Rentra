'use client';
import RouteError from '@/components/rentra/RouteError';

export default function RootError({ retry }) {
  return <RouteError retry={retry} />;
}
