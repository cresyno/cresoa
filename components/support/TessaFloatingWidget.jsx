'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA LOGO (Kept exactly as you approved) ───
const TessaLogo = ({ size = 24 }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="gold" x1="20" y1="10" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9A72E" />
          <stop offset="1" stopColor="#F0C75E" />
        </linearGradient>
      </defs>
      <path d="M32 8 L34 14 L40 16 L34 18 L32 24 L30 18 L24 16 L30 14 Z" fill="url(#gold)" />
      <path d="M20 22 H44 C42 26 40 28 36 28 H34 V48 C32 50 30 50 28 48 V28 H26 C22 28 20 26 20 22 Z" fill="url(#gold)" />
      <path d="M16 26 C6 32 6 44 16 50 C22 54 28 52 30 48 C22 50 16 44 16 36 Z" fill="#11161D" />
      <path d="M48 26 C58 32 58 44 48 50 C42 54 36 52 34 48 C42 50 48 44 48 36 Z" fill="url(#gold)" />
    </svg>
  );
};

export default function TessaFloatingWidget() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Compact Hexagon Container */}
      <div
        onClick={handleClick}
        style={{
          position: 'fixed',
          top: '20px', // Highest point
          right: '20px',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Hexagon with Rainbow */}
        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
          {/* Rotating Rainbow Background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'conic-gradient(from 0deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              animation: 'tessaSpin 3s linear infinite',
            }}
          />
          {/* Inner Solid Background */}
          <div
            style={{
              position: 'absolute',
              inset: '2.5px', // Border thickness
              background: '#0F2B4A',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TessaLogo size={24} />
          </div>
        </div>

        {/* Small Label */}
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            letterSpacing: '0.5px',
            background: 'rgba(15, 43, 74, 0.8)',
            padding: '2px 8px',
            borderRadius: '12px',
          }}
        >
          Tessa AI
        </span>
      </div>

      <style>{`
        @keyframes tessaSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Bottom Sheet */}
      <TessaBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        businessId={businessId}
      />
    </>
  );
}
