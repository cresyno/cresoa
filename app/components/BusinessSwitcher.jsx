'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust path to supabase client if needed

export default function BusinessSwitcher({ currentBusinessId, onSwitch }) {
  const [businesses, setBusinesses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadUserBusinesses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch businesses owned by user or where user is a member
      const { data: owned } = await supabase
        .from('businesses')
        .select('id, name, sector')
        .eq('owner_id', user.id);

      if (owned) {
        setBusinesses(owned);
      }
    }
    loadUserBusinesses();
  }, []);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0];

  if (businesses.length <= 1) return null; // Hide if user only has one business

  return (
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
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentBusiness ? currentBusiness.name : 'Switch Business'}
        </span>
        <span>▼</span>
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
          overflow: 'hidden'
        }}>
          {businesses.map((biz) => (
            <button
              key={biz.id}
              onClick={() => {
                setIsOpen(false);
                onSwitch(biz.id);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                background: biz.id === currentBusinessId ? 'rgba(212, 165, 42, 0.15)' : 'transparent',
                color: biz.id === currentBusinessId ? '#D4A52A' : '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'block'
              }}
            >
              {biz.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
