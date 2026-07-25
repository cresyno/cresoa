'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

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

    setMessage('Account created! Redirecting you to log in...')
    setTimeout(() => {
      router.push('/login')
    }, 1200)
  }

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

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%', padding: '0.7rem', borderRadius: '8px',
                border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
              }}
            />
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
            <p style={{ marginTop: '1rem', color: '#2B2620', fontSize: '0.9rem' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  )
              }
