'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA LOGO (Using Your Premium SVG) ───
const TessaLogo = ({ size = 32 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
    >
      <defs>
        <linearGradient id="gold" x1="180" y1="120" x2="350" y2="410" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9A72E" />
          <stop offset="0.5" stopColor="#F0C75E" />
          <stop offset="1" stopColor="#B98218" />
        </linearGradient>
        <linearGradient id="charcoal" x1="80" y1="150" x2="210" y2="390" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#11161D" />
          <stop offset="1" stopColor="#252B34" />
        </linearGradient>
      </defs>

      {/* Left flowing connection shape */}
      <path
        d="M104 176 C70 214 78 276 125 306 L177 337 C213 358 224 392 208 432 C254 390 248 333 203 302 L151 272 C116 252 102 216 104 176Z"
        fill="url(#charcoal)"
      />

      {/* Right flowing guidance shape */}
      <path
        d="M353 190 C385 251 355 309 300 340 L256 365 C225 384 211 415 216 459 C235 410 269 390 315 370 C382 341 409 275 353 190Z"
        fill="url(#gold)"
      />

      {/* Central stylized T */}
      <path
        d="M155 176 H277 C275 205 257 219 230 219 H215 C207 219 201 225 201 233 V355 C192 366 184 378 178 391 V233 C178 225 172 219 164 219 H155 C128 219 110 205 108 176 H155Z"
        fill="url(#gold)"
      />

      {/* Intelligent sparkle / star */}
      <path
        d="M205 55 C208 89 215 96 249 100 C215 104 208 111 205 145 C201 111 194 104 160 100 C194 96 201 89 205 55Z"
        fill="url(#gold)"
      />
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
      {/* Positioned top-right to avoid overlapping bottom content */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        
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

        {/* Bold Floating Button with New Premium Logo */}
        <button 
          onClick={handleClick}
          style={{
            background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)',
            color: '#fff',
            border: '2px solid #D4A52A',
            borderRadius: '50px',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(15, 43, 74, 0.4)',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '1rem',
            letterSpacing: '0.5px',
            animation: 'tessaBoldPulse 3s ease-in-out infinite'
          }}
        >
          <TessaLogo size={32} />
          <span>Ask Tessa</span>
        </button>

        <style>{`
          @keyframes tessaBoldPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(15, 43, 74, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 12px 48px rgba(212, 165, 42, 0.5); }
          }
        `}</style>
      </div>

      {/* Tessa Bottom Sheet (Preserved) */}
      <TessaBottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        businessId={businessId} 
      />
    </>
  );
}
