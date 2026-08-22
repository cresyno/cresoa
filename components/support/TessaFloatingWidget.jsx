'use client'

import { useState, useEffect } from 'react';
import TessaBottomSheet from '../TessaBottomSheet';

export default function TessaFloatingWidget({ businessId }) {
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
      <div style={{ position: 'fixed', bottom: '90px', right: '20px', zIndex: 998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {/* Animated Speech Bubble */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          padding: '12px 16px',
          borderRadius: '16px 16px 16px 4px',
          marginBottom: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          maxWidth: '200px',
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          opacity: showBubble ? 1 : 0,
          transform: `translateY(${showBubble ? 0 : 20}px) scale(${showBubble ? 1 : 0.9})`
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 500 }}>
            I'm Tessa, your personal assistant.<br />
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>Need help with anything?</span>
          </p>
        </div>

        {/* Floating Button */}
        <button 
          onClick={handleClick}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
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
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <span>Ask Tessa</span>
        </button>

        <style>{`
          @keyframes tessaPulseGlow {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(15, 43, 74, 0.3); }
            50% { transform: scale(1.04); box-shadow: 0 8px 24px rgba(15, 43, 74, 0.5); }
          }
        `}</style>
      </div>

      {/* The Bottom Sheet */}
      <TessaBottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        businessId={businessId} 
      />
    </>
  );
}
