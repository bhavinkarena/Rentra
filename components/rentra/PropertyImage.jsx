'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/** Keep a failed remote photo from leaving a broken image inside a bookable place. */
export default function PropertyImage({ src, alt = '', ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  if (failedSource === src) {
    return (
      <div
        role="img"
        aria-label={alt ? `Photo unavailable: ${alt}` : 'Photo unavailable'}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-100 px-4 text-center text-meta text-ink-600"
      >
        <ImageOff className="size-6" aria-hidden="true" />
        <span>Photo unavailable</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      {...props}
      onError={(event) => {
        setFailedSource(src);
        props.onError?.(event);
      }}
    />
  );
}
