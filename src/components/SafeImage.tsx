'use client';
import React, { useState, useEffect } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback: React.ReactNode;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, fallback, ...props }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};
