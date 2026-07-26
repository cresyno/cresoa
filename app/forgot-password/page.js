'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://cresoa.vercel.app/reset-password',
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Check your email for a password reset link.')
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '360px', width: '100%' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.3rem', textAlign: 'center' }}>Reset password</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e4d8c2' }}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>

          {message && (
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center', color: message.startsWith('Error') ? '#AE4A34' : '#4C7A5E' }}>
              {message}
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', color: '#6B6255', fontSize: '0.85rem', marginTop: '1.2rem' }}>
          <a href="/login" style={{ color: '#1E3A5F', fontWeight: '600' }}>← Back to login</a>
        </p>
      </div>
    </main>
  )
  }
