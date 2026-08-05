'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function JoinBusinessModal({ isOpen, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/team/invites/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to join business');
      
      setCode('');
      if (onSuccess) onSuccess(data.business_id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 43, 74, 0.4)', // Slightly tinted navy overlay
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        background: 'var(--color-card)', 
        padding: '24px', 
        borderRadius: '12px', 
        width: '100%', 
        maxWidth: '400px',
        boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(15,43,74,0.08))'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--color-text)', fontSize: '18px' }}>
          Join a Business
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
          Enter the one-time invite code provided by the business owner to join their workspace.
        </p>
        
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="e.g. ZY284GSJ2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{
              width: '100%', 
              padding: '12px', 
              marginBottom: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px', 
              textTransform: 'uppercase',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '16px',
              outline: 'none'
            }}
            required
          />
          
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '10px 16px', 
                border: '1px solid var(--color-border)', 
                background: 'transparent',
                borderRadius: '8px',
                cursor: 'pointer', 
                color: 'var(--color-text)',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !code.trim()}
              style={{
                padding: '10px 16px', 
                border: 'none', 
                borderRadius: '8px',
                background: 'var(--color-primary)', 
                color: '#FFFFFF',
                cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: loading || !code.trim() ? 0.7 : 1
              }}
            >
              {loading ? 'Joining...' : 'Join Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
        }
