'use client'

import { useId } from 'react';

// Your exact logo. The only change: the gradient id is unique per instance,
// so several logos on one page never clash (duplicate ids break SVG fills).
export default function TessaLogo({ size = 24 }) {
  const gid = `tessa-gold-${useId().replace(/:/g, '')}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="20" y1="10" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9A72E" />
          <stop offset="1" stopColor="#F0C75E" />
        </linearGradient>
      </defs>
      <path d="M32 8 L34 14 L40 16 L34 18 L32 24 L30 18 L24 16 L30 14 Z" fill={`url(#${gid})`} />
      <path d="M20 22 H44 C42 26 40 28 36 28 H34 V48 C32 50 30 50 28 48 V28 H26 C22 28 20 26 20 22 Z" fill={`url(#${gid})`} />
      <path d="M16 26 C6 32 6 44 16 50 C22 54 28 52 30 48 C22 50 16 44 16 36 Z" fill="#11161D" />
      <path d="M48 26 C58 32 58 44 48 50 C42 54 36 52 34 48 C42 50 48 44 48 36 Z" fill={`url(#${gid})`} />
    </svg>
  );
}
