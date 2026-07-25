'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

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

      const { data: orderData } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      setOrders(orderData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const advanceStatus = async (order) => {
    const currentIndex = STAGES.indexOf(order.current_status)
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) return

    const nextStage = STAGES[currentIndex + 1]

    await supabase
      .from('orders')
      .update({ current_status: nextStage })
      .eq('id', order.id)

    loadDashboard()
  }

  const copyTrackingLink = (order) => {
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    navigator.clipboard.writeText(link)
    alert('Tracking link copied! Paste it to your customer on WhatsApp.')
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

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem' }}>
        <a
          href="/dashboard/customers/new"
          style={{
            display: 'inline-block', background: '#1E3A5F', color: '#fff',
            padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
            fontWeight: '600', textDecoration: 'none'
          }}
        >
          + Add customer
        </a>
        <a
          href="/dashboard/orders/new"
          style={{
            display: 'inline-block', background: '#C79A2B', color: '#1E3A5F',
            padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
            fontWeight: '600', textDecoration: 'none'
          }}
        >
          + New order
        </a>
      </div>

      <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
        Orders
      </h2>

      {orders.length === 0 ? (
        <div
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620', marginBottom: '2rem'
          }}
        >
          <p>No orders yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
          {orders.map((o) => {
            const balance = o.price - o.amount_paid
            const isLastStage = o.current_status === STAGES[STAGES.length - 1]
            return (
              <div
                key={o.id}
                style={{
                  background: '#fff', borderRadius: '10px', padding: '1rem',
                  border: '1px solid #e4d8c2'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{o.title}</p>
                  <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{o.current_status}</span>
                </div>
                <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>
                  {o.customers?.name}
                </p>
                <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.85rem', color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
                  {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : 'Paid in full'}
                </p>
                <button
                  onClick={() => copyTrackingLink(o)}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '6px',
                    border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F',
                    fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem'
                  }}
                >
                  Copy tracking link
                </button>
                <button
                  onClick={() => advanceStatus(o)}
                  disabled={isLastStage}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '6px',
                    border: 'none', fontSize: '0.85rem', fontWeight: '600',
                    background: isLastStage ? '#e4d8c2' : '#1E3A5F',
                    color: isLastStage ? '#6B6255' : '#fff'
                  }}
                >
                  {isLastStage ? 'Delivered' : `Mark as "${STAGES[STAGES.indexOf(o.current_status) + 1]}"`}
                </button>
              </div>
            )
          })}
        </div>
      )}

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
    </main>
  )
            }
