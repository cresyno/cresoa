'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STATUSES = ['new', 'confirmed', 'processing', 'ready', 'completed']

export default function OrdersPage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [message, setMessage] = useState('')

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
      setMessage('Error loading orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [businessId])

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('business_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) setMessage(error.message)
    else fetchOrders()
  }

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Orders</h1>
      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)' }}>{message}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: statusFilter === 'all' ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === 'all' ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer' }}>All</button>
        {STATUSES.map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: statusFilter === status ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === status ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', textTransform: 'capitalize' }}>{status}</button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cresoa-text-muted)' }}>No orders yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--cresoa-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{order.customer_name}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{order.customer_phone}</div>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize' }}>{order.status}</span>
              </div>
              {order.items && order.items.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem' }}>• {item.name} (x{item.quantity}) - {item.price}</div>
                  ))}
                </div>
              )}
              {order.total_amount && <div style={{ marginTop: '0.5rem', fontWeight: 700 }}>Total: {order.total_amount}</div>}
              {order.customer_address && <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>Deliver to: {order.customer_address}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                {STATUSES.map(status => (
                  <button key={status} onClick={() => updateStatus(order.id, status)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: order.status === status ? 'var(--cresoa-accent)' : 'transparent', color: order.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>{status}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
                                                                              }
