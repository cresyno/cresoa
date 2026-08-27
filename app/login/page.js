'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import ThemeToggle from '../../components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // ─── SMART REDIRECT FUNCTION (UNCHANGED) ───
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
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid var(--cresoa-border)',
    background: 'var(--cresoa-bg)',
    color: 'var(--cresoa-text)',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  }

  const labelStyle = {
    display: 'block',
    color: 'var(--cresoa-text)',
    marginBottom: '0.4rem',
    fontSize: '0.9rem',
    fontWeight: '600',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--cresoa-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Theme toggle top right */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
        <ThemeToggle />
      </div>

      {/* Decorative background (no layout shift) */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212,165,42,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(15,43,74,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.5s ease-out; }
        .btn-primary {
          width: 100%; padding: 0.85rem; border-radius: 10px;
          border: none; background: linear-gradient(135deg, #D4A52A, #C79A2B);
          color: #0F2B4A; font-size: 1rem; font-weight: 700;
          box-shadow: 0 4px 14px rgba(212,165,42,0.3);
          transition: transform 0.1s ease, box-shadow 0.2s ease;
          cursor: pointer; font-family: inherit;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(212,165,42,0.4); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .checkbox-container {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.85rem; color: var(--cresoa-text-muted); cursor: pointer;
        }
        .checkbox-container input[type="checkbox"] {
          width: 18px; height: 18px; accent-color: #D4A52A; cursor: pointer;
        }
      `}</style>

      <div className="login-card" style={{ maxWidth: '400px', width: '100%', background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '2rem 1.5rem', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/" style={{ display: 'inline-block' }}>
            <img src="/favicon.png" alt="Cresoa" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          </Link>
          <h1 style={{ color: 'var(--cresoa-primary)', fontSize: '1.5rem', fontWeight: '800', margin: '0.8rem 0 0' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', margin: '0.3rem 0 0' }}>
            Log in to your Cresoa account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
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

          <div style={{ marginBottom: '0.6rem', textAlign: 'left' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ ...inputStyle, paddingRight: '2.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}
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
            <Link href="/forgot-password" style={{ color: 'var(--cresoa-accent)', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          {message && (
            <p style={{ marginTop: '0.8rem', color: message.startsWith('Error') ? 'var(--cresoa-danger)' : 'var(--cresoa-success)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
              {message}
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--cresoa-accent)', fontWeight: '700' }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
    }
