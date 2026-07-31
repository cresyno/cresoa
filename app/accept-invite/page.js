'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

// 将使用 useSearchParams 的逻辑提取到单独的组件中
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Redirect to login, then back here
          router.push(`/login?redirect=/accept-invite?token=${token}`)
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
          setTimeout(() => router.push('/dashboard'), 3000)
        } else {
          setStatus('error')
          setMessage(`❌ ${data.error || 'Failed to accept invitation'}`)
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
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1rem' }}>Invitation</h1>
        {status === 'loading' && <p>⏳ Processing your invitation...</p>}
        {status === 'success' && <p style={{ color: '#4C7A5E' }}>{message}</p>}
        {status === 'error' && <p style={{ color: '#AE4A34' }}>{message}</p>}
        {status === 'success' && <p style={{ fontSize: '0.9rem', color: '#6B6255' }}>Redirecting to dashboard...</p>}
        {status === 'error' && (
          <button onClick={() => router.push('/dashboard')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}

// 主页面组件用 Suspense 包裹
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  )
          }
