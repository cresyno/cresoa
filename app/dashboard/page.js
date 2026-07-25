'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [deactivated, setDeactivated] = useState(false)

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    let { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      const businessName = user.user_metadata?.business_name || 'My Business'
      const { data: newBusiness } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: businessName,
          business_type: 'fashion',
        })
        .select()
        .single()

      businessData = newBusiness
    }

    if (businessData && businessData.is_active === false) {
      setDeactivated(true)
      setLoading(false)
      return
    }

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
        .select('*, customers(name, phone)')
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

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
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
    alert('Tracking link copied!')
  }

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const sendLinkViaWhatsApp = (order) => {
    const phone = formatPhoneForWhatsApp(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    const message = `Hi ${order.customers?.name}! This is ${business?.name}. Here's your order tracking link — you can check your order status anytime: ${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const sendStatusUpdateViaWhatsApp = (order) => {
    const phone = formatPhoneForWhatsApp(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const message = `Hi ${order.customers?.name}, this is ${business?.name}. Just to update you — your order "${order.title}" is now at the "${order.current_status}" stage. Thank you for your patience!`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <button
            onClick={() => copyTrackingLink(o)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.78rem', fontWeight: '600' }}
          >
            Copy link
          </button>
          <button
            onClick={() => sendLinkViaWhatsApp(o)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#4C7A5E', color: '#fff', fontSize: '0.78rem', fontWeight: '600' }}
          >
            Send link
          </button>
        </div>

        <button
          onClick={() => sendStatusUpdateViaWhatsApp(o)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #4C7A5E', background: '#fff', color: '#4C7A5E', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}
        >
          Send status update
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
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading your dashboard...</p>
      </main>
    )
  }

  if (deactivated) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', marginBottom: '0.6rem' }}>Account deactivated</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem' }}>
            Please contact support to reactivate your account.
          </p>
        </div>
      </main>
    )
  }

  const previewCustomers = customers.slice(0, 3)
  const previewOrders = soloOrders.slice(0, 3)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <LetterLogo name={business?.name} size={44} />
          <div>
            <p style={{ color: '#2B2620', fontSize: '0.85rem', margin: 0 }}>Welcome back,</p>
            <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', margin: 0 }}>{business ? business.name : 'Your business'}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href="/dashboard/profile"
            style={{ border: '1px solid #1E3A5F', color: '#1E3A5F', padding: '0.4rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none' }}
          >
            Profile
          </a>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #1E3A5F', color: '#1E3A5F', padding: '0.4rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            Log out
          </button>
        </div>
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
          {groups.map((g) => {
            const isExpanded = expandedGroups.includes(g.id)
            const combinedBalance = g.orders.reduce((sum, o) => sum + (o.price - o.amount_paid), 0)
            return (
              <div key={g.id} style={{ border: '2px solid #AE4A34', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem', background: '#FBF3EC' }}>
                <button
                  onClick={() => toggleGroup(g.id)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: '#AE4A34', fontWeight: '700', fontSize: '1rem' }}>{g.group_name}</p>
                    <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{isExpanded ? '▲ Hide' : '▼ Show'} · {g.orders.length} people</span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#6B6255' }}>
                    Coordinator: {g.customers?.name}
                  </p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', fontWeight: '600', color: combinedBalance > 0 ? '#AE4A34' : '#4C7A5E' }}>
                    {combinedBalance > 0 ? `Total balance owed: ₦${combinedBalance.toLocaleString()}` : 'All paid in full'}
                  </p>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '1rem' }}>
                    {g.orders.map(renderOrderCard)}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: 0 }}>Orders</h2>
        <a href="/dashboard/orders" style={{ color: '#1E3A5F', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
          View all →
        </a>
      </div>
      {previewOrders.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620', marginBottom: '2rem' }}>
          <p>No individual orders yet.</p>
        </div>
      ) : (
        <div style={{ marginBottom: '2rem' }}>{previewOrders.map(renderOrderCard)}</div>
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
