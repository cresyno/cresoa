'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function AcceptBetaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No invitation token found.')
      return
    }

    const accept = async () => {
      try {
        // 1. Get session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // Save the token in the redirect URL
          router.push(`/login?redirect=/accept-beta?token=${token}`)
          return
        }

        // 2. Call accept API
        const res = await fetch('/api/beta/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, accessToken: session.access_token }),
        })
        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setMessage(`✅ ${data.message}`)
          // Redirect after 1.5s
          setTimeout(() => {
            if (data.redirectTo) {
              router.push(data.redirectTo)
            } else {
              router.push('/dashboard')
            }
          }, 1500)
        } else {
          setStatus('error')
          setMessage(`❌ ${data.error || 'Failed to accept beta invitation'}`)
        }
      } catch (err) {
        setStatus('error')
        setMessage('❌ Network error. Please try again.')
      }
    }

    accept()
  }, [token, router])

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid #E8E0D5' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1rem' }}>Beta Invitation</h1>
        {status === 'loading' && <p>⏳ Processing your invitation...</p>}
        {status === 'success' && (
          <>
            <p style={{ color: '#4C7A5E' }}>{message}</p>
            <p style={{ fontSize: '0.9rem', color: '#6B6255' }}>Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ color: '#AE4A34' }}>{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptBetaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <AcceptBetaContent />
    </Suspense>
  )
    }
