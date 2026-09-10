'use client';

import React, { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

export const PRODUCT_IMAGE_FALLBACK = '/product-placeholder.svg';

export function normalizeProductImageSrc(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return PRODUCT_IMAGE_FALLBACK;
  const trimmed = raw.trim();
  if (!trimmed) return PRODUCT_IMAGE_FALLBACK;

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const first = parsed.find((value) => typeof value === 'string' && value.trim());
        return first ? normalizeProductImageSrc(first) : PRODUCT_IMAGE_FALLBACK;
      }
    } catch {
      return PRODUCT_IMAGE_FALLBACK;
    }
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed;
  }

  return PRODUCT_IMAGE_FALLBACK;
}

type SafeProductImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SafeProductImage({
  src,
  fallbackSrc = PRODUCT_IMAGE_FALLBACK,
  onError,
  ...props
}: SafeProductImageProps) {
  const normalized = normalizeProductImageSrc(src);
  const [currentSrc, setCurrentSrc] = useState(normalized);

  useEffect(() => {
    setCurrentSrc(normalizeProductImageSrc(src));
  }, [src]);

  return (
    <Image
      {...props}
      src={currentSrc}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
        onError?.(event);
      }}
    />
  );
}
