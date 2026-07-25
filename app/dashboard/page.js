'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
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

      const { data: allOrders } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const { data: groupData } = await supabase
        .from('group_orders')
        .select('*, customers:coordinator_customer_id(name)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const withoutGroup = (allOrders || []).filter(o => !o.group_order_id)
      setSoloOrders(withoutGroup)

      const groupsWithOrders = (groupData || []).map(g => ({
        ...g,
        orders: (allOrders || []).filter(o => o.group_order_id === g.id)
      }))
      setGroups(groupsWithOrders)
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
    await supabase.from('orders').update({ current_status: STAGES[currentIndex + 1] }).eq('id', order.id)
    loadDashboard()
  }

  const copyTrackingLink = (order) => {
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    navigator.clipboard.writeText(link)
    alert('Tracking link copied! Paste it to your customer on WhatsApp.')
  }

  const renderOrderCard = (o) => {
    const balance = o.price - o.amount_paid
    const isLastStage = o.current_status === STAGES[STAGES.length - 1]
    return (
      <div
        key={o.id}
        style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{o.title}</p>
          <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{o.current_status}</span>
        </div>
        <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>{o.customers?.name}</p>
        <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.85rem', color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
          {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : 'Paid in full'}
        </p>
        <button
          onClick={() => copyTrackingLink(o)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}
        >
          Copy tracking link
        </button>
        <button
          onClick={() => advanceStatus(o)}
          disabled={isLastStage}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: '600', background: isLastStage ? '#e4d8c2' : '#1E3A5F', color: isLastStage ? '#6B6255' : '#fff' }}
        >
          {isLastStage ? 'Delivered' : `Mark as "${STAGES[STAGES.indexOf(o.current_status) + 1]}"`}
        </button>
      </div>
    )
  }

  if (loading) {
    return <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}><p style={{ color: '#2B2620' }}>Loading...</p></main>
  }

  const previewCustomers = customers.slice(0, 3)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: '#2B2620', fontSize: '0.9rem', margin: 0 }}>Welcome back,</p>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', margin: 0 }}>{business ? business.name : 'Your business'}</h1>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #1E3A5F', color: '#1E3A5F', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}>
          Log out
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <a href="/dashboard/customers/new" style={{ display: 'inline-block', background: '#1E3A5F', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
          + Add customer
        </a>
        <a href="/dashboard/orders/new" style={{ display: 'inline-block', background: '#C79A2B', color: '#1E3A5F', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
          + New order
        </a>
        <a href="/dashboard/groups/new" style={{ display: 'inline-block', background: '#AE4A34', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
          + New group order
        </a>
      </div>

      {groups.length > 0 && (
        <>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', marginBottom: '0.8rem' }}>Group Orders</h2>
          {groups.map((g) => (
            <div key={g.id} style={{ border: '2px solid #AE4A34', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', background: '#FBF3EC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <p style={{ margin: 0, color: '#AE4A34', fontWeight: '700', fontSize: '1rem' }}>{g.group_name}</p>
                <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{g.orders.length} people</span>
              </div>
              <p style={{ margin: '0 0 0.8rem', fontSize: '0.8rem', color: '#6B6255' }}>
                Coordinator: {g.customers?.name}
              </p>
              {g.orders.map(renderOrderCard)}
            </div>
          ))}
        </>
      )}

      <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', marginBottom: '0.8rem' }}>Orders</h2>
      {soloOrders.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620', marginBottom: '2rem' }}>
          <p>No individual orders yet.</p>
        </div>
      ) : (
        <div style={{ marginBottom: '2rem' }}>{soloOrders.map(renderOrderCard)}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: 0 }}>Customers</h2>
        <a href="/dashboard/customers" style={{ color: '#1E3A5F', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
          View all →
        </a>
      </div>

      {previewCustomers.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
          <p>No customers yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {previewCustomers.map((c) => (
            <a
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              style={{ display: 'block', background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', textDecoration: 'none' }}
            >
              <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{c.name}</p>
              {c.phone && <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>{c.phone}</p>}
            </a>
          ))}
        </div>
      )}
    </main>
  )
    }
