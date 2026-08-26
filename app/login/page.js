'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // ─── SMART REDIRECT FUNCTION ───
  // This finds your business and pushes you to the correct dashboard
  const redirectToDashboard = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.push('/login')
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    router.push('/login')
    return
  }

  let { data: ownedBiz } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!ownedBiz) {
    const { data: memberBiz } = await supabase
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (memberBiz) ownedBiz = { id: memberBiz.business_id }
  }

  if (ownedBiz) {
    router.push(`/dashboard?business_id=${ownedBiz.id}`)
  } else {
    router.push('/onboarding')
  }
  }
  useEffect(() => {
    // Check if already logged in, then use the smart redirect
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) redirectToDashboard()
    }
    checkSession()
  }, [router])

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

    // Success: use the smart redirect
    await redirectToDashboard()
  }

  const eyeIcon = (visible) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {visible ? (
        <>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="#6B6255" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3" stroke="#6B6255" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M6.6 6.7C4 8.3 2 12 2 12s4 7 11 7c1.8 0 3.4-.4 4.8-1.1M17.9 17.9C20.5 16.1 22 12 22 12s-1.6-3.5-4.8-5.4" stroke="#6B6255" strokeWidth="1.6" />
        </>
      )}
    </svg>
  )

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  }

  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.5s ease-out; }
        .btn-primary {
          width: 100%; padding: 0.85rem; border-radius: 8px;
          border: none; background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F; font-size: 1rem; font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .checkbox-container {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.8rem; color: #6B6255; cursor: pointer;
        }
        .checkbox-container input[type="checkbox"] {
          width: 18px; height: 18px; accent-color: #C79A2B; cursor: pointer;
        }
      `}</style>

      <div className="login-card" style={{ maxWidth: '360px', width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ margin: '0 auto 0.8rem', width: '52px', height: '52px' }}>
            <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
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
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ ...inputStyle, paddingRight: '2.6rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer'
                }}
              >
                {eyeIcon(showPassword)}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a href="/forgot-password" style={{ color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          {message && (
            <p style={{ marginTop: '0.8rem', color: '#AE4A34', fontSize: '0.85rem', textAlign: 'center' }}>
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
