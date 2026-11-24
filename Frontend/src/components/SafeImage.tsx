import React, { useState, useEffect } from 'react';

export const PLACEHOLDER_IMG = '/placeholder.svg';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = PLACEHOLDER_IMG,
  alt = 'Auction Lot',
  className = '',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState<boolean>(!src);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setHasError(!src);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      loading="lazy"
      className={className}
      {...props}
    />
  );
};
