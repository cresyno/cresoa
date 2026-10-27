'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

const STATUSES = ['new', 'confirmed', 'processing', 'ready', 'completed']
const STATUS_COLORS = { new: '#D4A52A', confirmed: '#3B82F6', processing: '#F59E0B', ready: '#10B981', completed: '#6B7280' }

export default function OrdersTab({ businessId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('public_orders') // ✅ Using exact table name
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [businessId])

  const updateStatus = async (id, newStatus) => {
    await supabase.from('public_orders').update({ status: newStatus }).eq('id', id)
    fetchOrders()
  }

  if (loading) return <div>Loading orders...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {orders.length === 0 ? <p>No online orders yet.</p> : orders.map(order => (
        <div key={order.id} style={{ background: 'var(--cresoa-surface)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>{order.customer_name}</h3>
            <span style={{ color: STATUS_COLORS[order.status], fontWeight: 'bold' }}>{order.status}</span>
          </div>
          <p>{order.customer_phone}</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => updateStatus(order.id, s)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: order.status === s ? 'var(--cresoa-accent)' : 'transparent', color: order.status === s ? '#fff' : 'inherit', border: '1px solid var(--cresoa-border)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
