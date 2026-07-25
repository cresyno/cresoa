'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function AllOrdersPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
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

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .is('group_order_id', null)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [router])

  const advanceStatus = async (order) => {
    const currentIndex = STAGES.indexOf(order.current_status)
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) return
    await supabase.from('orders').update({ current_status: STAGES[currentIndex + 1] }).eq('id', order.id)
    load()
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

  const filtered = orders.filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    (o.customers?.name || '').toLowerCase().includes(search.toLowerCase())
  )

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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading orders...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to dashboard
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '1.2rem' }}>
          All orders ({orders.length})
        </h1>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item or customer..."
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '1.2rem', boxSizing: 'border-box' }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>No orders found.</p>
          </div>
        ) : (
          filtered.map((o) => {
            const balance = o.price - o.amount_paid
            const isLastStage = o.current_status === STAGES[STAGES.length - 1]
            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{o.title}</p>
                  <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{o.current_status}</span>
                </div>
                <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>{o.customers?.name}</p>
                <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.85rem', color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
                  {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : 'Paid in full'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <button onClick={() => copyTrackingLink(o)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.78rem', fontWeight: '600' }}>
                    Copy link
                  </button>
                  <button onClick={() => sendLinkViaWhatsApp(o)} style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#4C7A5E', color: '#fff', fontSize: '0.78rem', fontWeight: '600' }}>
                    Send link
                  </button>
                </div>
                <button onClick={() => sendStatusUpdateViaWhatsApp(o)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #4C7A5E', background: '#fff', color: '#4C7A5E', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>
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
          })
        )}
      </div>
    </main>
  )
          }
