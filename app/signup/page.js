'use client'

import { useState } from 'react'
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

  const passwordHasMinLength = password.length >= 8
  const passwordHasNumber = /\d/.test(password)
  const passwordsMatch = password && password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!passwordHasMinLength || !passwordHasNumber) {
      setMessage('Password must be at least 8 characters and include a number.')
      return
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    const { error: businessError } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        name: name,
        business_type: 'fashion',
      })

    if (businessError) {
      setMessage('Account created, but business setup failed: ' + businessError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()

    setMessage('Account created! Check your email to verify, then log in.')
    setTimeout(() => {
      router.push('/login')
    }, 1800)
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

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.75rem', marginBottom: '0.25rem' }}>
          Cresoa
        </h1>
        <p style={{ color: '#2B2620', marginBottom: '2rem' }}>
          Create your business account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Business owner name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.7rem', borderRadius: '8px',
                border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
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

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.7rem 2.6rem 0.7rem 0.7rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 0, display: 'flex'
                }}
              >
                {eyeIcon(showPassword)}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', fontSize: '0.78rem' }}>
            <p style={{ margin: '0.3rem 0', color: passwordHasMinLength ? '#4C7A5E' : '#6B6255' }}>
              {passwordHasMinLength ? '✓' : '○'} At least 8 characters
            </p>
            <p style={{ margin: '0.3rem 0', color: passwordHasNumber ? '#4C7A5E' : '#6B6255' }}>
              {passwordHasNumber ? '✓' : '○'} Contains a number
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Confirm password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.7rem 2.6rem 0.7rem 0.7rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 0, display: 'flex'
                }}
              >
                {eyeIcon(showConfirmPassword)}
              </button>
            </div>
            {confirmPassword && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: passwordsMatch ? '#4C7A5E' : '#AE4A34' }}>
                {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '8px',
              border: 'none', background: '#1E3A5F', color: '#fff',
              fontSize: '1rem', fontWeight: '600'
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {message && (
            <p style={{ marginTop: '1rem', color: message.startsWith('Account created') ? '#4C7A5E' : '#AE4A34', fontSize: '0.9rem' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  )
    }
