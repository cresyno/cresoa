'use client';

import { useState } from 'react';

export default function Logo({ variant = 'primary', size = 'medium' }) {
  const [error, setError] = useState(false);

  const logos = {
    primary: '/file_00000000dd648246bfe3205cb852e890.png',
    'dark-bg': '/file_00000000587c824687b5471c929f1fc2.png',
    icon: '/file_00000000f69c820ab00c704b429eb572.png',
    wordmark: '/file_0000000047fc81f49a6abed2174f0b63.png',
    app: '/file_00000000bb3481f4990f1bfdcf0fca75.png',
    monochromeDark: '/file_000000003d6881f49f751a2a7ad88a4b.png',
    monochromeLight: '/file_0000000038a081f49e94e3a28d95e09e.png',
    favicon: '/file_00000000d830820aa7d7e133a9acc7c9.png',
  };

  const sizes = {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 56, height: 56 },
  };

  const src = logos[variant] || logos.primary;
  const { width, height } = sizes[size] || sizes.medium;

  if (error) {
    return (
      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1.2rem', color: 'inherit' }}>
        Cresoa
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="Cresoa"
      width={width}
      height={height}
      style={{ objectFit: 'contain', display: 'block' }}
      onError={(e) => {
        console.error('Logo failed to load:', src);
        setError(true);
      }}
    />
  );
}
