'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';

// ─── TESSA SPARK ICON (Concept 2: Abstract Conversation Knot) ───
const TessaSparkIcon = ({ size = 32 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tessaKnotGrad" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F2B4A" />
          <stop offset="60%" stopColor="#1A3F66" />
          <stop offset="100%" stopColor="#D4A52A" />
        </linearGradient>
        <linearGradient id="tessaSparkGradK" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD966" />
          <stop offset="100%" stopColor="#D4A52A" />
        </linearGradient>
      </defs>
      
      {/* Abstract Conversation Knot (Two interlocking curves forming a T) */}
      <path d="M16 26 C16 18, 24 16, 32 16 C40 16, 48 18, 48 26 C48 34, 40 36, 32 36 C24 36, 16 38, 16 46 C16 54, 24 56, 32 56" stroke="url(#tessaKnotGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M32 16 C40 16, 48 18, 48 26 C48 34, 40 36, 32 36 C24 36, 16 38, 16 46 C16 54, 24 56, 32 56" stroke="#D4A52A" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.3" />
      
      {/* Vertical T-stem */}
      <path d="M32 36 L32 56" stroke="url(#tessaKnotGrad)" strokeWidth="6" strokeLinecap="round" />
      
      {/* Gold Spark at intersection */}
      <path d="M32 26 L34 30 L38 32 L34 34 L32 38 L30 34 L26 32 L30 30 Z" fill="url(#tessaSparkGradK)" />
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
      {/* Positioned top-right, moved down to avoid header overlap */}
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

        {/* The BOLD Floating Button */}
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

      {/* The Gemini-style Bottom Sheet */}
      <TessaBottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        businessId={businessId} 
      />
    </>
  );
}
