'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import ThemeToggle from '../../components/ThemeToggle'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()
  }, [router])

  const passwordHasMinLength = password.length >= 8
  const passwordHasNumber = /\d/.test(password)
  const passwordsMatch = password && password === confirmPassword
  const isPasswordValid = passwordHasMinLength && passwordHasNumber
  const isFormValid = email.trim() && isPasswordValid && passwordsMatch && agreedToTerms

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    if (!isPasswordValid) {
      setMessage('Password must be at least 8 characters and include a number.')
      setLoading(false)
      return
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      setLoading(false)
      return
    }

    if (!agreedToTerms) {
      setMessage('Please agree to the terms to continue.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage(
          '🎉 Account created! Please check your email (and spam folder) to verify your address. Then log in. 💡 If you find it in spam, mark it as "Not spam" to ensure you receive future emails.'
        )
        setLoading(false)
      } else {
        setMessage('❌ ' + (data.error || 'Signup failed. Please try again.'))
        setLoading(false)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setMessage('❌ Network error. Please check your connection.')
      setLoading(false)
    }
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

      {/* Decorative background shapes (no layout shift) */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(212,165,42,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(15,43,74,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .signup-card { animation: fadeUp 0.5s ease-out; }
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
        .password-requirement {
          font-size: 0.8rem; margin: 0.2rem 0;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .password-requirement.valid { color: var(--cresoa-success); }
        .password-requirement.invalid { color: var(--cresoa-text-muted); }
        .checkbox-container {
          display: flex; align-items: flex-start; gap: 0.5rem;
          font-size: 0.85rem; color: var(--cresoa-text-muted); cursor: pointer;
          margin-top: 0.5rem;
        }
        .checkbox-container input[type="checkbox"] {
          width: 18px; height: 18px; margin-top: 2px; accent-color: #D4A52A; cursor: pointer;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .signup-card { flex-direction: column; }
        }
      `}</style>

      <div className="signup-card" style={{ maxWidth: '960px', width: '100%', display: 'flex', flexDirection: 'row', background: 'var(--cresoa-surface)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Left Side – Branding */}
        <div style={{ flex: '1', background: 'linear-gradient(145deg, #0F2B4A 0%, #1A3F66 100%)', color: '#fff', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
            <img src="/favicon.png" alt="Cresoa" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: 1.2, margin: '2rem 0 1rem' }}>
            Run your business<br />from one place
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Cresoa helps Nigerian SMEs manage customers, orders, payments, production and invoices — all in one mobile-first platform.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {['No credit card required', '90-day free beta', 'Built for Nigerian businesses'].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '20px', height: '20px', background: 'var(--cresoa-accent)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side – Form */}
        <div style={{ flex: '1', padding: '2.5rem', background: 'var(--cresoa-surface)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ color: 'var(--cresoa-primary)', fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>
              Start your journey
            </h1>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
              Create your free account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
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

            <div style={{ marginBottom: '0.4rem' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
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

            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px' }}>
              <div className={`password-requirement ${passwordHasMinLength ? 'valid' : 'invalid'}`}>
                {passwordHasMinLength ? '✓' : '○'} At least 8 characters
              </div>
              <div className={`password-requirement ${passwordHasNumber ? 'valid' : 'invalid'}`}>
                {passwordHasNumber ? '✓' : '○'} Contains a number
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  style={{ ...inputStyle, paddingRight: '2.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}
                >
                  {eyeIcon(showConfirmPassword)}
                </button>
              </div>
              {confirmPassword && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: passwordsMatch ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>
                  {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.4rem' }}>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" style={{ color: 'var(--cresoa-accent)', fontWeight: '600', textDecoration: 'underline' }}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" style={{ color: 'var(--cresoa-accent)', fontWeight: '600', textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            {message && (
              <p style={{ marginTop: '0.8rem', color: message.startsWith('🎉') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
                {message}
              </p>
            )}
          </form>

          <p style={{ textAlign: 'center', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cresoa-accent)', fontWeight: '700' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
        }
