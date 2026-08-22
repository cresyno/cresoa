'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA LOGO (Approximating your example) ───
const TessaLogo = ({ size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
    >
      <defs>
        <linearGradient id="gold" x1="20" y1="10" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9A72E" />
          <stop offset="1" stopColor="#F0C75E" />
        </linearGradient>
      </defs>

      {/* Star above T */}
      <path d="M32 8 L34 14 L40 16 L34 18 L32 24 L30 18 L24 16 L30 14 Z" fill="url(#gold)" />

      {/* Central T (vertical + horizontal) */}
      <path d="M20 22 H44 C42 26 40 28 36 28 H34 V48 C32 50 30 50 28 48 V28 H26 C22 28 20 26 20 22 Z" fill="url(#gold)" />

      {/* Left dark flowing shape */}
      <path d="M16 26 C6 32 6 44 16 50 C22 54 28 52 30 48 C22 50 16 44 16 36 Z" fill="#11161D" />

      {/* Right gold flowing shape */}
      <path d="M48 26 C58 32 58 44 48 50 C42 54 36 52 34 48 C42 50 48 44 48 36 Z" fill="url(#gold)" />
    </svg>
  );
};

export default function TessaFloatingWidget() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowBubble(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setShowBubble(false);
    setIsOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Fixed container – right aligned */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxWidth: 'calc(100vw - 40px)'
      }}>
        
        {/* Speech Bubble */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          padding: '14px 18px',
          borderRadius: '16px 16px 4px 16px',
          marginBottom: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          maxWidth: '220px',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          opacity: showBubble ? 1 : 0,
          transform: `translateY(${showBubble ? 0 : -20}px) scale(${showBubble ? 1 : 0.9})`
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 700 }}>
            I'm Tessa, your personal assistant.<br />
            <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Need help with anything?</span>
          </p>
        </div>

        {/* Button – tightened to prevent overflow */}
        <button 
          onClick={handleClick}
          style={{
            background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)',
            color: '#fff',
            border: '2px solid #D4A52A',
            borderRadius: '50px',
            padding: '10px 16px',          // reduced padding
            display: 'flex',
            alignItems: 'center',
            gap: '6px',                    // reduced gap
            boxShadow: '0 8px 32px rgba(15, 43, 74, 0.4)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem',           // smaller text
            letterSpacing: '0.4px',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 40px)', // guarantee it fits
            overflow: 'hidden',
            animation: 'tessaBoldPulse 3s ease-in-out infinite'
          }}
        >
          <TessaLogo size={22} />          // smaller logo
          <span>Ask Tessa</span>
        </button>

        <style>{`
          @keyframes tessaBoldPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(15, 43, 74, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 12px 48px rgba(212, 165, 42, 0.5); }
          }
        `}</style>
      </div>

      {/* Tessa Bottom Sheet */}
      <TessaBottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        businessId={businessId} 
      />
    </>
  );
      }
