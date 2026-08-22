'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── NEW TESSA LOGO (Hexagonal Knot) ───
const TessaHexKnotIcon = ({ size = 32 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4A017" />
          <stop offset="1" stopColor="#B8860B" />
        </linearGradient>
      </defs>

      <!-- Outer Hexagon Knot -->
      <path d="M64 8L112 36V92L64 120L16 92V36L64 8Z" stroke="url(#gold)" strokeWidth="4" strokeLinejoin="round" fill="none" />
      <path d="M64 16L104 39V89L64 112L24 89V39L64 16Z" stroke="url(#gold)" strokeWidth="3" strokeLinejoin="round" fill="none" />
      <path d="M64 24L96 42.5V85.5L64 104L32 85.5V42.5L64 24Z" stroke="url(#gold)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />

      <!-- Connection lines to make it feel like a knot -->
      <path d="M48 44L36 52" stroke="url(#gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 44L92 52" stroke="url(#gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 84L36 76" stroke="url(#gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 84L92 76" stroke="url(#gold)" strokeWidth="2" strokeLinecap="round" />
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
        
        {/* Speech Bubble (unchanged) */}
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

        {/* BOLD Floating Button with New Hexagon Logo */}
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
          <TessaHexKnotIcon size={32} />
          <span>Ask Tessa</span>
        </button>

        <style>{`
          @keyframes tessaBoldPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(15, 43, 74, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 12px 48px rgba(212, 165, 42, 0.5); }
          }
        `}</style>
      </div>

      {/* The Gemini-style Bottom Sheet (Preserved) */}
      <TessaBottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        businessId={businessId} 
      />
    </>
  );
            }
