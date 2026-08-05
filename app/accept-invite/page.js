'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('❌ No invitation token found.')
      return
    }

    const accept = async () => {
      try {
        // 1. Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          // Redirect to login, then back here
          router.push(`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`)
          return
        }

        // 2. Call the accept API
        const res = await fetch('/api/staff/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage('✅ Invitation accepted! You now have access to the business.')
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          setStatus('error')
          setMessage(`❌ ${data.error || 'Failed to accept invitation'}`)
        }
      } catch (err) {
        console.error('Accept error:', err)
        setStatus('error')
        setMessage('❌ Network error. Please try again.')
      }
    }

    accept()
  }, [token, router])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Processing your invitation...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '2.5rem', maxWidth: '420px', border: '1px solid #E5E0D8' }}>
        {status === 'success' ? (
          <>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <h2 style={{ color: '#0F2B4A' }}>Accepted!</h2>
            <p style={{ color: '#8A8A8A' }}>{message}</p>
            <p style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <h2 style={{ color: '#D9534F' }}>Error</h2>
            <p style={{ color: '#8A8A8A' }}>{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: '#0F2B4A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading invitation...</p>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
          }
