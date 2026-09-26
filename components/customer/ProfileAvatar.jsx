'use client';
import Image from 'next/image';
import { useState } from 'react';
import { UserRound } from 'lucide-react';

export default function ProfileAvatar({ name = '', photoUrl, className = 'size-10' }) {
  const [failed, setFailed] = useState(null);
  const initial = (name ?? '').trim().charAt(0).toLocaleUpperCase('en-IN');
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800 ring-1 ring-brand-200 ${className}`}
    >
      {photoUrl && failed !== photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
          onError={() => setFailed(photoUrl)}
        />
      ) : (
        initial || <UserRound className="h-1/2 w-1/2" aria-hidden="true" />
      )}
    </span>
  );
}
