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
          <span
            className="tessa-fab-ring"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'conic-gradient(from 0deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000)',
              boxShadow: '0 6px 20px rgba(6,14,28,0.35)',
              animation: 'tessaSpin 4s linear infinite',
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: 2.5,
              background: '#0F2B4A',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TessaLogo size={28} />
          </span>
        </span>
        <span
          style={{
            marginTop: 5,
            fontSize: '0.62rem',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.4px',
            background: '#0F2B4A',
            padding: '2px 9px',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(6,14,28,0.3)',
          }}
        >
          Tessa AI
        </span>
      </button>

      <style>{`
        @keyframes tessaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tessa-fab:active { transform: scale(0.94); }
        .tessa-fab:focus-visible { outline: 2px solid #D9A72E; outline-offset: 4px; border-radius: 16px; }
        @media (prefers-reduced-motion: reduce) { .tessa-fab-ring { animation: none !important; } }
      `}</style>

      <TessaBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        businessId={businessId}
      />
    </>
  );
}
