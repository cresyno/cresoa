'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [touched, setTouched] = useState({ password: false, confirm: false })

  useEffect(() => {
    // Check if already logged in
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
  const isFormValid = name.trim() && email.trim() && isPasswordValid && passwordsMatch && agreedToTerms

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
      // ✅ Call our custom signup API instead of Supabase directly
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          businessName: name, // the business owner name
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('🎉 Account created! Check your email to verify, then log in.')
        setTimeout(() => {
          router.push('/login')
        }, 3000) // give user time to read the message
      } else {
        setMessage('❌ ' + (data.error || 'Signup failed. Please try again.'))
      }
    } catch (err) {
      console.error('Signup error:', err)
      setMessage('❌ Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // ... keep all the UI and helper functions exactly as they were (eyeIcon, etc.) ...

  // I'll paste the entire return block for completeness – it's unchanged except the message handling.
  // The rest is identical.

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
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 4px 14px rgba(199,154,43,0.3); }
          50% { box-shadow: 0 4px 24px rgba(199,154,43,0.5); }
        }
        .signup-card { animation: fadeUp 0.5s ease-out; }
        .btn-primary {
          width: 100%; padding: 0.85rem; border-radius: 8px;
          border: none; background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F; font-size: 1rem; font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .password-requirement {
          font-size: 0.75rem; margin: 0.2rem 0;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .password-requirement.valid { color: #4C7A5E; }
        .password-requirement.invalid { color: #6B6255; }
        .checkbox-container {
          display: flex; align-items: flex-start; gap: 0.5rem;
          font-size: 0.8rem; color: #6B6255; cursor: pointer;
        }
        .checkbox-container input[type="checkbox"] {
          width: 18px; height: 18px; margin-top: 1px; accent-color: #C79A2B; cursor: pointer;
          flex-shrink: 0;
        }
      `}</style>

      <div className="signup-card" style={{ maxWidth: '380px', width: '100%' }}>
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
          <h1 style={{ color: '#1E3A5F', fontSize: '1.6rem', margin: 0, fontWeight: '700' }}>Start your journey</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem', marginTop: '0.3rem' }}>Create your Cresoa business account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e4d8c2' }}>
          {/* Business Name */}
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>Business owner name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ife Jesu"
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '0.8rem' }}>
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

          {/* Password */}
          <div style={{ marginBottom: '0.4rem' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setTouched({ ...touched, password: true })}
                required
                placeholder="Create a strong password"
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

          {/* Password Requirements */}
          <div style={{ marginBottom: '0.8rem', padding: '0.4rem 0.3rem', background: '#F8F6F2', borderRadius: '6px' }}>
            <div className={`password-requirement ${passwordHasMinLength ? 'valid' : 'invalid'}`}>
              {passwordHasMinLength ? '✓' : '○'} At least 8 characters
            </div>
            <div className={`password-requirement ${passwordHasNumber ? 'valid' : 'invalid'}`}>
              {passwordHasNumber ? '✓' : '○'} Contains a number
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Confirm password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setTouched({ ...touched, confirm: true })}
                required
                placeholder="Confirm your password"
                style={{ ...inputStyle, paddingRight: '2.6rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer'
                }}
              >
                {eyeIcon(showConfirmPassword)}
              </button>
            </div>
            {confirmPassword && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: passwordsMatch ? '#4C7A5E' : '#AE4A34' }}>
                {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Terms */}
<div style={{ marginBottom: '1.2rem' }}>
  <label
    className="checkbox-container"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer',
    }}
    onClick={(e) => {
      // Prevent the click from bubbling to the input (which might cause double toggle)
      e.preventDefault();
      // Toggle the state directly
      setAgreedToTerms(!agreedToTerms);
    }}
  >
    <input
      type="checkbox"
      checked={agreedToTerms}
      // Remove onChange – we use the label's onClick
      onChange={() => {}} // dummy to avoid React warning
      style={{ width: '18px', height: '18px', cursor: 'pointer', pointerEvents: 'none' }}
    />
    <span>
      I agree to the <a href="/terms" style={{ color: '#1E3A5F', fontWeight: '600', textDecoration: 'none' }}>Terms of Service</a> and <a href="/privacy" style={{ color: '#1E3A5F', fontWeight: '600', textDecoration: 'none' }}>Privacy Policy</a>
    </span>
  </label>
  {/* Optional: remove debug line after fix */}
</div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {message && (
            <p style={{ marginTop: '0.8rem', color: message.startsWith('🎉') ? '#4C7A5E' : '#AE4A34', fontSize: '0.85rem', textAlign: 'center' }}>
              {message}
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', color: '#6B6255', fontSize: '0.85rem', marginTop: '1.2rem' }}>
          Already have an account? <a href="/login" style={{ color: '#1E3A5F', fontWeight: '600' }}>Log in</a>
        </p>
      </div>
    </main>
  )
        }
