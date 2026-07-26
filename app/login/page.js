'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main
      style={{
        minHeight: '100vh', background: '#F5EFE2', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem'
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.5s ease-out; }
      `}</style>

      <div className="login-card" style={{ maxWidth: '360px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1E3A5F" />
              <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
              <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.6rem', margin: 0, fontWeight: '700' }}>Welcome back</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem', marginTop: '0.3rem' }}>Log in to your Cresoa account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e4d8c2' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.7rem', borderRadius: '8px',
                border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.7rem', borderRadius: '8px',
                border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <a href="/forgot-password" style={{ color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600' }}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '8px',
              border: 'none', background: '#1E3A5F', color: '#fff',
              fontSize: '1rem', fontWeight: '600'
            }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          {message && (
            <p style={{ marginTop: '1rem', color: '#AE4A34', fontSize: '0.85rem', textAlign: 'center' }}>
              {message}
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', color: '#6B6255', fontSize: '0.85rem', marginTop: '1.2rem' }}>
          Don't have an account? <a href="/signup" style={{ color: '#1E3A5F', fontWeight: '600' }}>Sign up</a>
        </p>
      </div>
    </main>
  )
      }
