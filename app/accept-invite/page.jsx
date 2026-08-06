'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [code, setCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAccept = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login?redirect=' + encodeURIComponent(`/accept-invite?code=${code}`));
        return;
      }

      const response = await fetch('/api/team/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invite_code: code })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage('✅ ' + result.message);
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setMessage('❌ ' + (result.error || 'Failed to accept invite'));
      }
    } catch (error) {
      setMessage('❌ An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'var(--color-card)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--color-border)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
          Join a Business
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Enter the invite code provided by your manager.
        </p>

        <form onSubmit={handleAccept}>
          <input
            type="text"
            required
            maxLength={6}
            placeholder="XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1.5rem',
              textAlign: 'center',
              letterSpacing: '0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              outline: 'none',
              fontWeight: 'bold',
              marginBottom: '1rem'
            }}
          />

          {message && (
            <p style={{
              textAlign: 'center',
              color: success ? 'var(--color-success)' : 'var(--color-danger)',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Accepting...' : 'Accept Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
