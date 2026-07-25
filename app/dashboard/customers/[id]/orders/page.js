'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function CustomerOrdersPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()

    setCustomer(customerData)

    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

  const advanceStatus = async (order) => {
    const currentIndex = STAGES.indexOf(order.current_status)
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) return
    await supabase.from('orders').update({ current_status: STAGES[currentIndex + 1] }).eq('id', order.id)
    load()
  }

  const copyTrackingLink = (order) => {
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    navigator.clipboard.writeText(link)
    alert('Tracking link copied! Paste it to your customer on WhatsApp.')
  }

  if (loading) {
    return <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}><p style={{ color: '#2B2620' }}>Loading...</p></main>
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard/customers')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to customers
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.2rem' }}>
          {customer?.name}'s orders
        </h1>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>No orders yet for this customer.</p>
          </div>
        ) : (
          orders.map((o) => {
            const balance = o.price - o.amount_paid
            const isLastStage = o.current_status === STAGES[STAGES.length - 1]
            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{o.title}</p>
                  <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{o.current_status}</span>
                </div>
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
          })
        )}
      </div>
    </main>
  )
}
