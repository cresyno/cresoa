'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setBusiness(businessData)
      setLoading(false)
    }

    loadDashboard()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#2B2620' }}>Loading...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: '#2B2620', fontSize: '0.9rem', margin: 0 }}>Welcome back,</p>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', margin: 0 }}>
            {business ? business.name : 'Your business'}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid #1E3A5F', color: '#1E3A5F',
            padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem'
          }}
        >
          Log out
        </button>
      </div>

      <div
        style={{
          background: '#fff', borderRadius: '12px', padding: '1.5rem',
          border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620'
        }}
      >
        <p>No orders yet.</p>
        <p style={{ fontSize: '0.85rem', color: '#6B6255' }}>
          Order creation coming in the next step.
        </p>
      </div>
    </main>
  )
      }
