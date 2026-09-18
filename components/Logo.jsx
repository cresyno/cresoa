'use client';

import { useState } from 'react';

export default function Logo({ variant = 'primary', size = 'medium', className, style }) {
  const [error, setError] = useState(false);

  const heights = {
    small: 22,
    medium: 32,
    large: 42,
  };
  const h = heights[size] || heights.medium;

  // Icon variant — "A" with gold dot on navy square
  if (variant === 'icon' || variant === 'favicon' || variant === 'app') {
    return (
      <svg
        viewBox="0 0 512 512"
        width={h}
        height={h}
        className={className}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Cresoa"
        role="img"
      >
        <rect width="512" height="512" rx="110" fill="#0F2B4A" />
        <text
          x="256"
          y="380"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize="360"
          fill="#FFFFFF"
        >
          A
        </text>
        <circle cx="256" cy="335" r="22" fill="#C99B2B" />
      </svg>
    );
  }

  // Wordmark variant — PNG. White version rendered on dark backgrounds via CSS filter.
  const isDark = variant === 'dark-bg' || variant === 'monochromeLight';
  const src = '/cresoa-wordmark.png';

  if (error) {
    return (
      <span
        style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 700,
          fontSize: `${h}px`,
          color: isDark ? '#fff' : '#0F2B4A',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        Cresoa<span style={{ color: '#C99B2B' }}>.</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="Cresoa"
      height={h}
      className={className}
      style={{
        height: h,
        width: 'auto',
        display: 'block',
        objectFit: 'contain',
        filter: isDark ? 'brightness(0) invert(1)' : 'none',
        ...style,
      }}
      onError={(e) => {
        console.error('Logo failed to load:', src);
        setError(true);
      }}
    />
  );
}
