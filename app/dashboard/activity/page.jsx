'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function ActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setLoading(false)
    }
    checkAccess()
  }, [router])

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>📜 Activity Logs</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        Monitor all actions taken in your business.
      </p>
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)'
      }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
        <p>Activity logs are being set up. They will appear here soon.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Actions like invites, role changes, and member removals will be logged.</p>
      </div>
    </div>
  )
}
