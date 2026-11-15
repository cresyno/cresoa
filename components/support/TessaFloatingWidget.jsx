'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TessaBottomSheet from './TessaBottomSheet';
import TessaLogo from './TessaLogo';

// Bottom-right no longer covers your top banner. To put it back at the top,
// swap to: { top: '60px', right: '20px' }
const POSITION = { bottom: 'calc(100px + env(safe-area-inset-bottom))', right: '16px' };

export default function TessaFloatingWidget() {
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fallback: URL first, then localStorage
    const urlBiz = searchParams.get('business_id');
    const storedBiz = localStorage.getItem('selectedBusinessId');
    setBusinessId(urlBiz || storedBiz || null);
  }, [searchParams]);

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        className="tessa-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open Tessa AI assistant"
        style={{
          position: 'fixed',
          ...POSITION,
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ position: 'relative', width: 58, height: 58, display: 'block' }}>
          
          {/* THE CLEAN NAVY BUTTON WITH GOLD ACCENT */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: '#0B2C5E', // Brand Navy
              border: '2px solid #FDB515', // Brand Gold Accent
              boxShadow: '0 6px 20px rgba(11, 44, 94, 0.4)', // Soft Navy Shadow
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease'
            }}
          >
            {/* LOGO SET TO WHITE VARIANT SO IT SHOWS UP */}
            <TessaLogo size={32} variant="white" />
          </span>

        </span>
        
        {/* THE TEXT LABEL */}
        <span
          style={{
            marginTop: 6,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#FFFFFF', // White text
            letterSpacing: '0.5px',
            background: '#0B2C5E', // Brand Navy background
            padding: '3px 10px',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(11, 44, 94, 0.3)',
          }}
        >
          Tessa AI
        </span>
      </button>

      <style>{`
        /* Removed the spinning rainbow keyframes */
        .tessa-fab:active > span:first-child > span:first-child { transform: scale(0.92); }
        .tessa-fab:focus-visible { outline: 2px solid #FDB515; outline-offset: 4px; border-radius: 16px; }
      `}</style>

      <TessaBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        businessId={businessId}
      />
    </>
  );
}
