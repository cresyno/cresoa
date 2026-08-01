'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found.')
      return
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ token }),
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage('✅ Your email has been verified! You can now log in.')
          setTimeout(() => router.push('/login'), 3000)
        } else {
          setStatus('error')
          setMessage(`❌ ${data.error || 'Verification failed.'}`)
        }
      } catch (err) {
        setStatus('error')
        setMessage('Network error. Please try again.')
      }
    }

    verify()
  }, [token, router])

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Verify Email</h1>
      {status === 'verifying' && <p>⏳ Verifying your email address...</p>}
      {status === 'success' && (
        <>
          <p style={{ color: 'green' }}>{message}</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Redirecting to login...</p>
        </>
      )}
      {status === 'error' && (
        <p style={{ color: 'red' }}>{message}</p>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading verification...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
