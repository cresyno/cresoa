'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
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

  useEffect(() => {
    loadOrders()
  }, [router, searchParams]) // re‑fetch when URL changes

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

  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' }
  }

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: '60px', height: '28px', background: 'var(--color-border)', borderRadius: '20px' }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><div style={{ width: '120px', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} /><div style={{ width: '80px', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.3rem' }} /></div>
                <div style={{ width: '60px', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              </div>
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
        <button onClick={loadOrders} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--color-text)' }}>Orders</h1>
          {businessName && <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>{totalOrders} orders · {overdueOrders} overdue</p>}
        </div>
        <a href={`/dashboard/orders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.4rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Icon name="plus" size={14} stroke="#fff" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> New Order
        </a>
      </div>

      {/* ─── Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--color-card)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{totalOrders}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Active</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{activeOrders}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ready</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-success)' }}>{readyOrders}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overdue</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-danger)' }}>{overdueOrders}</div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by customer or order..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' }}
        />
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {['all', 'Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.2rem 0.8rem',
                borderRadius: '20px',
                border: filter === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: filter === s ? 'var(--color-accent)' : 'var(--color-card)',
                color: filter === s ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {s === 'all' ? `All (${totalOrders})` : `${s} (${statusCounts[s] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Orders List ─── */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>No orders found</p>
          <a href={`/dashboard/orders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '500', textDecoration: 'none' }}>Create first order →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredOrders.map(o => {
            const status = getStatusInfo(o.current_status)
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && o.current_status !== 'Delivered'
            const balance = (o.price || 0) - (o.amount_paid || 0)
            return (
              <div key={o.id} style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      {o.customers?.name || 'No customer'} <span style={{ fontWeight: '400', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>· {o.title || 'Untitled'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '500' }}>{status.label}</span>
                      {isOverdue && <span style={{ background: 'var(--color-danger)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '500' }}>Overdue</span>}
                      {balance > 0 && <span style={{ color: 'var(--color-danger)', fontSize: '0.7rem', fontWeight: '500' }}>₦{balance.toLocaleString()} due</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text)' }}>₦{o.price?.toLocaleString() || 0}</span>
                    <a href={`/dashboard/orders/${o.id}?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>View</a>
                    <a href={`/dashboard/orders/${o.id}/edit?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</a>
                    {balance > 0 && <button onClick={() => {/* open settle modal */}} style={{ fontSize: '0.7rem', background: 'var(--color-success)', color: '#fff', border: 'none', padding: '0.1rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>Pay</button>}
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
