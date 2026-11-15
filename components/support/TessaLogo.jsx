'use client'

export default function TessaLogo({ size = 24, variant = 'default' }) {
  // Uses brand Navy Blue (#0B2C5E) and White
  const mainColor = variant === 'white' ? '#FFFFFF' : '#0B2C5E';
  const cutoutColor = variant === 'white' ? '#0B2C5E' : '#FFFFFF';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      fill="none" 
      aria-hidden="true"
    >
      {/* The Crescent 'C' Swoosh */}
      <path 
        d="M 80 15 C 30 5, 5 35, 10 65 C 15 95, 50 105, 85 85 C 45 95, 25 75, 30 50 C 35 25, 55 20, 80 15 Z" 
        fill={mainColor} 
      />
      
      {/* Robot Body Elements */}
      <g fill={mainColor}>
        {/* Antenna Ball & Stem */}
        <circle cx="50" cy="25" r="4.5" />
        <rect x="48" y="29" width="4" height="10" rx="2" />
        
        {/* Left & Right Ears */}
        <rect x="28" y="45" width="8" height="16" rx="4" />
        <rect x="64" y="45" width="8" height="16" rx="4" />
        
        {/* Main Head */}
        <rect x="36" y="38" width="28" height="28" rx="8" />
      </g>

      {/* Robot Face (Cutouts) */}
      <g stroke={cutoutColor} strokeWidth="2.5" strokeLinecap="round" fill="none">
        {/* Left Eye */}
        <path d="M 42 52 Q 45 48 48 52" />
        {/* Right Eye */}
        <path d="M 52 52 Q 55 48 58 52" />
        {/* Smile */}
        <path d="M 46 58 Q 50 61 54 58" />
      </g>
    </svg>
  );
}
