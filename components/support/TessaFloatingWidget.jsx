'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA LOGO (Conversation Knot + Hidden T + Gold Spark) ───
const TessaSparkIcon = ({ size = 28 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tessaKnot" x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F2B4A" />
          <stop offset="40%" stopColor="#1A3F66" />
          <stop offset="75%" stopColor="#2E7D5E" />
          <stop offset="100%" stopColor="#D4A52A" />
        </linearGradient>
        <linearGradient id="tessaSpark" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD966" />
          <stop offset="100%" stopColor="#D4A52A" />
        </linearGradient>
      </defs>

      {/* Hidden T - Vertical Stem */}
      <path d="M32 18 L32 56" stroke="url(#tessaKnot)" strokeWidth="6.5" strokeLinecap="round" />
      
      {/* Hidden T - Horizontal Crossbar */}
      <path d="M14 22 C16 18, 20 16, 32 16 C44 16, 48 18, 50 22" stroke="url(#tessaKnot)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
      
      {/* Left flowing curve */}
      <path d="M14 22 C10 30, 10 38, 14 44 C18 50, 24 52, 32 52" stroke="url(#tessaKnot)" strokeWidth="6.5" strokeLinecap="round" fill="none" opacity="0.85" />
      
      {/* Right flowing curve */}
      <path d="M50 22 C54 30, 54 38, 50 44 C46 50, 40 52, 32 52" stroke="url(#tessaKnot)" strokeWidth="6.5" strokeLinecap="round" fill="none" opacity="0.65" />
      
      {/* Gold Spark at intersection */}
      <path d="M32 14 L34.5 19.5 L40 22 L34.5 24.5 L32 30 L29.5 24.5 L24 22 L29.5 19.5 Z" fill="url(#tessaSpark)" />
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

        {/* Bold Floating Button */}
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
          <TessaSparkIcon size={32} />
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
