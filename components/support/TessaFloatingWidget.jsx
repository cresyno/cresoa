'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TessaFloatingWidget() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showBubble, setShowBubble] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-hide the greeting bubble after 8 seconds
    const timer = setTimeout(() => setShowBubble(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setShowBubble(false); // Hide the bubble when clicked
    const businessId = searchParams.get('business_id');
    
    // If the user is inside a business context, send them straight to Tessa.
    // If not, fallback to the general Support Hub.
    if (businessId) {
      router.push(`/dashboard/tessa?business_id=${businessId}`);
    } else {
      router.push('/dashboard/support');
    }
  };

  if (!mounted) return null;

  return (
    <div className="tessa-float-wrapper" style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      
      {/* Animated Speech Bubble */}
      <div className={`tessa-bubble ${showBubble ? 'visible' : 'hidden'}`} style={{
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
        transform: `translateY(${showBubble ? 0 : 20}px) scale(${showBubble ? 1 : 0.9})`,
        pointerEvents: showBubble ? 'auto' : 'none'
      }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.4 }}>
          I'm Tessa, your personal assistant.<br/>
          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>Need help with anything?</span>
        </p>
        {/* Tail of the bubble */}
        <div style={{
          position: 'absolute', bottom: '-6px', left: '20px',
          width: '12px', height: '12px',
          background: 'var(--color-card)',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          transform: 'rotate(45deg)',
          borderBottomRightRadius: '2px'
        }}></div>
      </div>

      {/* The Floating Button */}
      <button onClick={handleClick} className="tessa-float-btn" style={{
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
        transition: 'all 0.2s ease',
        animation: 'tessaPulseGlow 3s ease-in-out infinite'
      }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span>Ask Tessa</span>
      </button>

      {/* Embedded CSS for the widget's animations */}
      <style jsx>{`
        .tessa-float-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(15, 43, 74, 0.4);
        }
        @keyframes tessaPulseGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(15, 43, 74, 0.3); }
          50% { transform: scale(1.04); box-shadow: 0 8px 24px rgba(15, 43, 74, 0.5); }
        }
      `}</style>
    </div>
  );
        }
