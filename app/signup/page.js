'use client'

import { useState } from 'react'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Form looks good! (Not connected to the database yet)')
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
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '8px',
              border: 'none', background: '#1E3A5F', color: '#fff',
              fontSize: '1rem', fontWeight: '600'
            }}
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  )
}
