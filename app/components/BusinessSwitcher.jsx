'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function BusinessSwitcher({ currentBusinessId }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        // ─── Refresh session first ───
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return;

        // ─── Add timestamp to bust cache ───
        const timestamp = Date.now();
        const response = await fetch(`/api/user/businesses?t=${timestamp}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const result = await response.json();
        if (response.ok) {
          setBusinesses(result.businesses || []);
        }
      } catch (e) {
        console.error('Error loading businesses:', e);
      }
    }

    // ─── Load immediately ───
    loadBusinesses();

    // ─── Load again after 500ms (to catch any late DB commits) ───
    const timer = setTimeout(() => {
      loadBusinesses();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentBusinessId]);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0];

  const handleSwitch = (businessId) => {
    setIsOpen(false);
    if (businessId === 'join') {
      router.push('/accept-invite');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBusinessId', businessId);
    }
    window.location.href = `/dashboard?business_id=${businessId}`;
  };

  return (
    // ─── The rest of the component is UNCHANGED ───
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentBusiness ? currentBusiness.name : 'Select Business'}
        </span>
        <span style={{ marginLeft: '8px' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          right: 0,
          background: '#0F2B4A',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
          overflow: 'hidden',
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          {businesses.map((biz) => (
            <button
              key={biz.id}
              onClick={() => handleSwitch(biz.id)}
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                background: biz.id === currentBusinessId ? 'rgba(212, 165, 42, 0.15)' : 'transparent',
                color: biz.id === currentBusinessId ? '#D4A52A' : '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <span>{biz.name}</span>
              {biz.id === currentBusinessId && <span style={{ fontSize: '12px', color: '#D4A52A' }}>✓</span>}
            </button>
          ))}
          <button
            onClick={() => handleSwitch('join')}
            style={{
              width: '100%',
              padding: '10px 12px',
              textAlign: 'left',
              background: 'rgba(212, 165, 42, 0.1)',
              color: '#D4A52A',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            ➕ Join another business
          </button>
        </div>
      )}
    </div>
  );
}
