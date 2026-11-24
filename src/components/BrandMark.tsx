import React, { useState } from 'react';
import { Leaf } from 'lucide-react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'dark' | 'light';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 'md', tone = 'dark' }) => {
  const dimensions = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const strokeColor = tone === 'light' ? '#D4AF63' : '#B88A3B';
  const leafFill = tone === 'light' ? '#D4AF63' : '#1B4332';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={dimensions}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="29" stroke={strokeColor} strokeWidth="1.5" />
      <circle cx="32" cy="32" r="24" stroke={strokeColor} strokeWidth="0.75" strokeOpacity="0.55" />
      <path
        d="M32 14C24.5 22 22 30.5 24.5 39.5C26.5 46 31.5 49.5 32 50C32.5 49.5 37.5 46 39.5 39.5C42 30.5 39.5 22 32 14Z"
        stroke={leafFill}
        strokeWidth="1.75"
        fill={leafFill}
        fillOpacity="0.12"
      />
      <path d="M32 17V49" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M32 28L26.5 23.5" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 35L38 30" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 41L27 37" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel = 'OJAS Natural Craft',
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F2EFE6] via-[#FAF8F3] to-[#E5DEC9] text-[#1B4332] p-6 text-center ${className}`}
        role="img"
        aria-label={alt || fallbackLabel}
      >
        <Leaf className="w-8 h-8 text-[#B88A3B] mb-2 opacity-80" />
        <span className="font-serif text-base font-medium tracking-wide text-[#163024]">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};
