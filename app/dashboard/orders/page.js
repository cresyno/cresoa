'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        let businessId = getCurrentBusinessId()
        if (!businessId) {
          const { data: owned } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('owner_id', user.id)
            .single()
          if (owned) {
            businessId = owned.id
            setBusinessName(owned.name)
          }
        } else {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', businessId)
            .single()
          if (biz) setBusinessName(biz.name)
        }

        if (!businessId) {
          router.push('/onboarding')
          return
        }

        const { data, error } = await supabase
          .from('orders')
          .select('*, customers(name, phone)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error('Error loading orders:', err)
        setError('Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [router])

  const filteredOrders = orders.filter(o => {
    if (filter !== 'all' && o.current_status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = o.customers?.name?.toLowerCase() || ''
      const title = o.title?.toLowerCase() || ''
      return name.includes(q) || title.includes(q)
    }
    return true
  })

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.current_status] = (acc[o.current_status] || 0) + 1
    return acc
  }, {})

  const totalOrders = orders.length
  const activeOrders = orders.filter(o => o.current_status !== 'Delivered').length
  const readyOrders = orders.filter(o => o.current_status === 'Ready').length
  const overdueOrders = orders.filter(o => {
    if (!o.due_date) return false
    const due = new Date(o.due_date)
    due.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    return due < today && o.current_status !== 'Delivered'
  }).length

  // ─── Status badge helper ───
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ width: '200px', height: '24px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: '#E5E0D8', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: '#E5E0D8', borderRadius: '6px', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>📋 Orders</h1>
          {businessName && <p style={{ color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>{totalOrders} orders · {overdueOrders} overdue</p>}
        </div>
        <a href={`/dashboard/orders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.6rem 1.2rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '8px', fontWeight: '600', textDecoration: 'none' }}>+ New Order</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total</span><div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{totalOrders}</div></div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Active</span><div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{activeOrders}</div></div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ready</span><div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-success)' }}>{readyOrders}</div></div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Overdue</span><div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-danger)' }}>{overdueOrders}</div></div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by customer or order..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {['all', 'Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                border: filter === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: filter === s ? 'var(--color-accent)' : 'var(--color-card)',
                color: filter === s ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              {s === 'all' ? `All (${totalOrders})` : `${s} (${statusCounts[s] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <span style={{ fontSize: '3rem', display: 'block' }}>📦</span>
          <h3 style={{ color: 'var(--color-text)' }}>No orders found</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Try adjusting your filters or create a new order.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredOrders.map(o => {
            const status = getStatusInfo(o.current_status)
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && o.current_status !== 'Delivered'
            return (
              <div key={o.id} style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text)' }}>{o.title || 'Untitled'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{o.customers?.name || 'No customer'}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '0.1rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600' }}>{status.label}</span>
                      {isOverdue && <span style={{ background: '#F1DBD3', color: '#D9534F', padding: '0.1rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600' }}>⚠️ Overdue</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: 'var(--color-text)' }}>₦{o.price?.toLocaleString() || 0}</div>
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                      <a href={`/dashboard/orders/${o.id}?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>View</a>
                      <a href={`/dashboard/orders/${o.id}/edit?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'underline' }}>Edit</a>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
              }
