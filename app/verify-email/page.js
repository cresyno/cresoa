'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
          setErrorDetail(`Status: ${res.status} – ${JSON.stringify(data)}`)
          return
        }

        setStatus('success')
        setMessage('✅ Your email has been verified! You can now log in.')
        setTimeout(() => router.push('/login'), 3000)
      } catch (err) {
        setStatus('error')
        setMessage('Network error. Please try again.')
        setErrorDetail(err.message)
      }
    }

    verify()
  }, [token, router])

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Verify Email</h1>
      {status === 'verifying' && <p>⏳ Verifying your email address...</p>}
      {status === 'success' && (
        <>
          <p style={{ color: 'green' }}>{message}</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Redirecting to login...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p style={{ color: 'red' }}>{message}</p>
          {errorDetail && (
            <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', textAlign: 'left', fontSize: '0.8rem', overflow: 'auto' }}>
              {errorDetail}
            </pre>
          )}
          <button onClick={() => router.push('/login')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Go to Login
          </button>
        </>
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
