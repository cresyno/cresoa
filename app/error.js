'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '100%', width: '640px' }}>
        <h1 style={{ color: '#AE4A34', fontSize: '1.6rem', marginBottom: '0.6rem' }}>Something went wrong</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1rem' }}>Please try again.</p>

        {/* TEMPORARY — remove this block once the real bug is found */}
        <div style={{
          textAlign: 'left', background: '#fff', border: '1px solid #E2B8AE', borderRadius: '8px',
          padding: '0.9rem', marginBottom: '1.5rem', fontSize: '0.75rem', fontFamily: 'monospace',
          color: '#7A2E1F', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <strong>{error?.name || 'Error'}:</strong> {error?.message || 'No message'}
          {error?.digest && <div style={{ marginTop: '0.4rem' }}>digest: {error.digest}</div>}
          {error?.stack && <div style={{ marginTop: '0.6rem', opacity: 0.75 }}>{error.stack}</div>}
        </div>

        <button onClick={() => reset()} style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontWeight: '600' }}>
          Try again
        </button>
      </div>
    </main>
  )
            }
