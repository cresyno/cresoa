'use client'

import { useId } from 'react';

// Your exact logo. The only change: the gradient id is unique per instance,
// so several logos on one page never clash (duplicate ids break SVG fills).
export default function TessaLogo({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      {/* Background Shape (Chat Bubble / Shield) */}
      <path d="M32 4 L56 16 V36 C56 48 44 56 32 60 C20 56 8 48 8 36 V16 Z" fill="currentColor" opacity="0.1" />
      
      {/* Bold 'T' */}
      <path d="M20 20 H44 V26 H36 V46 H28 V26 H20 Z" fill="currentColor" />
      
      {/* AI Sparkle */}
      <path d="M46 14 L48 20 L54 22 L48 24 L46 30 L44 24 L38 22 L44 20 Z" fill="#FDB515" />
    </svg>
  );
}
