'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered']
const STATUS_COLORS = { 
  pending: '#F59E0B', 
  paid: '#10B981', 
  shipped: '#3B82F6', 
  delivered: '#6B7280' 
}

export default function OrdersTab({ businessId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOrders = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('public_orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setOrders(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [businessId])

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('public_orders')
      .update({ status: newStatus })
      .eq('id', id)
    if (!error) fetchOrders()
  }

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return order.customer_name?.toLowerCase().includes(q) || order.customer_phone?.includes(q)
    }
    return true
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search name, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', flex: 1, minWidth: '200px' }} />
        <button onClick={() => setStatusFilter('all')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: statusFilter === 'all' ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === 'all' ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600 }}>All</button>
        {STATUSES.map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: statusFilter === status ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === status ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{status}</button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cresoa-text-muted)' }}><p>No website orders found.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', border: '1px solid var(--cresoa-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{order.customer_name || 'Unknown'}</h3>
                  <p style={{ margin: '0.2rem 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{order.customer_phone || 'No phone'}</p>
                  <p style={{ margin: '0.2rem 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{order.customer_address || 'No address'}</p>
                </div>
                <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status], fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize' }}>{order.status}</span>
              </div>

              {/* Show items ordered */}
              {order.items && order.items.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--cresoa-bg)', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Items:</strong>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                      <span>{item.name} × {item.quantity}</span>
                      <span>₦{Number(item.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '0.8rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--cresoa-accent)' }}>
                Total: ₦{Number(order.total_amount).toLocaleString()}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {order.customer_phone && <a href={`tel:${order.customer_phone}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>📞 Call</a>}
                {order.customer_phone && <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>💬 WhatsApp</a>}
              </div>

              {/* Status Update buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', borderTop: '1px solid var(--cresoa-border)', paddingTop: '0.8rem' }}>
                {STATUSES.map(status => (
                  <button key={status} onClick={() => updateStatus(order.id, status)} style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: order.status === status ? 'var(--cresoa-accent)' : 'transparent', color: order.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
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
