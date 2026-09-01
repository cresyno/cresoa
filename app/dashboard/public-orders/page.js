'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

const STATUSES = ['new', 'confirmed', 'processing', 'ready', 'completed']

export default function PublicOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('business_orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error('Fetch public orders error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [businessId])

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('business_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Website Orders</h1>
      {orders.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-title">No orders yet</span>
          <span className="cresoa-empty-state-message">When customers place orders on your website, they'll appear here.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {orders.map(order => (
            <div key={order.id} className="cresoa-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{order.customer_name}</strong>
                  <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{order.customer_phone}</span>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize' }}>{order.status}</span>
              </div>
              {order.items && order.items.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>• {item.name} (x{item.quantity}) - {item.price}</div>
                  ))}
                </div>
              )}
              {order.total_amount && <div style={{ marginTop: '0.5rem', fontWeight: 700 }}>Total: {order.total_amount}</div>}
              {order.customer_address && <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>Deliver to: {order.customer_address}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                {STATUSES.map(status => (
                  <button key={status} onClick={() => updateStatus(order.id, status)} style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: order.status === status ? 'var(--cresoa-accent)' : 'transparent', color: order.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
               }
