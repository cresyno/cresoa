'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
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

      if (businessData) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })

        setCustomers(customerData || [])
      }

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

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/dashboard/customers/new"
          style={{
            display: 'inline-block', background: '#1E3A5F', color: '#fff',
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem',
            fontWeight: '600', textDecoration: 'none'
          }}
        >
          + Add customer
        </a>
      </div>

      <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
        Customers
      </h2>

      {customers.length === 0 ? (
        <div
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620'
          }}
        >
          <p>No customers yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {customers.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#fff', borderRadius: '10px', padding: '1rem',
                border: '1px solid #e4d8c2'
              }}
            >
              <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{c.name}</p>
              {c.phone && (
                <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>
                  {c.phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: '2rem 0 0.8rem' }}>
        Orders
      </h2>
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
