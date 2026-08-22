'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA SPARK ICON (Self-contained, flowing ribbon + gold spark) ───
const TessaSparkIcon = ({ size = 28 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tessaRibbon" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F2B4A" />
          <stop offset="35%" stopColor="#1A3F66" />
          <stop offset="70%" stopColor="#2E7D5E" />
          <stop offset="100%" stopColor="#D4A52A" />
        </linearGradient>
        <linearGradient id="tessaSparkGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4A52A" />
          <stop offset="100%" stopColor="#FFD966" />
        </linearGradient>
      </defs>
      {/* Flowing ribbon forming a subtle "T" */}
      <path d="M14 14 H50" stroke="url(#tessaRibbon)" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 14 V50" stroke="url(#tessaRibbon)" strokeWidth="6" strokeLinecap="round" />
      {/* Curved tails (conversation & assistance) */}
      <path d="M50 14 C58 20, 58 32, 50 38" stroke="url(#tessaRibbon)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M32 50 C26 56, 16 56, 10 50" stroke="url(#tessaRibbon)" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Gold Spark (intelligence) */}
      <path d="M50 4 L52 10 L58 12 L52 14 L50 20 L48 14 L42 12 L48 10 Z" fill="url(#tessaSparkGrad)" />
    </svg>
  );
};

export default function TessaFloatingWidget() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id'); // ✅ Preserved

  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowBubble(false), 8000); // ✅ Preserved
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setShowBubble(false);
    setIsOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      {/* ─── MOVED TO TOP-RIGHT ─── */}
      <div style={{ position: 'fixed', top: '16px', right: '20px', zIndex: 998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        
        {/* Speech Bubble (still appears, now on top) */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          padding: '12px 16px',
          borderRadius: '16px 16px 4px 16px', // flipped corner to fit top-right
          marginBottom: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          maxWidth: '200px',
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          opacity: showBubble ? 1 : 0,
          transform: `translateY(${showBubble ? 0 : -20}px) scale(${showBubble ? 1 : 0.9})`
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 500 }}>
            I'm Tessa, your personal assistant.<br />
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>Need help with anything?</span>
          </p>
        </div>

        {/* Floating Button with Tessa Spark Icon */}
        <button 
          onClick={handleClick}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(15, 43, 74, 0.3)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'tessaPulseGlow 3s ease-in-out infinite'
          }}
        >
          {/* New Icon replaces the emoji */}
          <TessaSparkIcon size={24} />
          <span>Ask Tessa</span>
        </button>

        <style>{`
          @keyframes tessaPulseGlow {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(15, 43, 74, 0.3); }
            50% { transform: scale(1.04); box-shadow: 0 8px 24px rgba(15, 43, 74, 0.5); }
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
