'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    const hasMinLength = newPassword.length >= 8
    const hasNumber = /\d/.test(newPassword)

    if (!hasMinLength || !hasNumber) {
      setMessage('Password must be at least 8 characters and include a number.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    setMessage('Password updated! Redirecting to login...')
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '360px', width: '100%' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '1.5rem', textAlign: 'center' }}>Set new password</h1>

        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e4d8c2' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.85rem' }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>

          {message && (
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center', color: message.startsWith('Error') || message.startsWith('Password must') || message.startsWith('Passwords') ? '#AE4A34' : '#4C7A5E' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  )
    }
