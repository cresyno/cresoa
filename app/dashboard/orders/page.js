'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'   // global styles

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('latest')

  const statusOptions = ['all', 'Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let businessId = getCurrentBusinessId()
      if (!businessId || businessId.length < 20) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        if (owned) {
          businessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) {
            businessId = membership.business_id
            const { data: biz } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', businessId)
              .single()
            if (biz) setBusinessName(biz.name)
          }
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

      setCurrentBusinessId(businessId)

      const response = await fetch(`/api/orders?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load orders')
      }

      setOrders(result.orders || [])
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Failed to load orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [router, searchParams])

  // ─── Computed stats ───
  const totalOrders = orders.length
  const activeOrders = orders.filter(o => o.current_status !== 'Delivered').length
  const readyOrders = orders.filter(o => o.current_status === 'Ready').length
  const overdueOrders = orders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date)
    due.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    return due < today
  }).length

  // ─── Filters ───
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.current_status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const customerName = o.customers?.name?.toLowerCase() || ''
      const title = o.title?.toLowerCase() || ''
      return customerName.includes(q) || title.includes(q)
    }
    return true
  })

  // ─── Sorting ───
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'latest':
        return new Date(b.created_at) - new Date(a.created_at)
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at)
      case 'highest':
        return (b.price || 0) - (a.price || 0)
      case 'lowest':
        return (a.price || 0) - (b.price || 0)
      default:
        return 0
    }
  })

  // ─── Status counts ───
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.current_status] = (acc[o.current_status] || 0) + 1
    return acc
  }, {})

  // ─── Helpers ───
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

  const handleCall = (phone) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    window.location.href = `tel:${cleanPhone}`
  }

  // ─── Delete order ───
  const handleDelete = async (orderId) => {
    if (!confirm('Delete this order?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete')
      }
      await loadOrders()
    } catch (err) {
      alert('Failed to delete order.')
    }
  }

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ width: '60px', height: '28px', background: 'var(--cresoa-border)', borderRadius: '20px' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><div style={{ width: '120px', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} /><div style={{ width: '80px', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} /></div>
                <div style={{ width: '60px', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={currentBusinessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cresoa-danger)' }}>
        {error}
        <button onClick={loadOrders} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--cresoa-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={currentBusinessId} />

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--cresoa-text)' }}>Orders</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>
            {totalOrders} orders · {overdueOrders} overdue
          </p>
        </div>
        <a
          href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`}
          className="cresoa-primary-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
        >
          <Icon name="plus" size={14} stroke="#fff" /> New Order
        </a>
      </div>

      {/* ─── Stats Bar ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{totalOrders}</div>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Active</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{activeOrders}</div>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ready</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>{readyOrders}</div>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overdue</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--cresoa-danger)' }}>{overdueOrders}</div>
        </div>
      </div>

      {/* ─── Search, Filter, Sort ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by customer or order..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? `All (${totalOrders})` : `${s} (${statusCounts[s] || 0})`}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Price</option>
          <option value="lowest">Lowest Price</option>
        </select>
      </div>

      {/* ─── Orders List ─── */}
      {sortedOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px dashed var(--cresoa-border)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.3rem' }}>No orders found</h3>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 1rem' }}>Create your first order to get started.</p>
          <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button" style={{ display: 'inline-block', textDecoration: 'none' }}>Create Order →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sortedOrders.map((o) => {
            const status = getStatusInfo(o.current_status)
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && o.current_status !== 'Delivered'
            const balance = (o.price || 0) - (o.amount_paid || 0)
            const customerName = o.customers?.name || 'No customer'
            const customerPhone = o.customers?.phone || ''

            return (
              <Card key={o.id} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>
                      {customerName} <span style={{ fontWeight: '400', color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>· {o.title || 'Untitled'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <StatusPill status={o.current_status} />
                      {isOverdue && <span style={{ background: 'var(--cresoa-danger)', color: '#fff', padding: '0.1rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>Overdue</span>}
                      {balance > 0 && <span style={{ color: 'var(--cresoa-danger)', fontSize: '0.7rem', fontWeight: '500' }}>₦{balance.toLocaleString()} due</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--cresoa-text)' }}>₦{o.price?.toLocaleString() || 0}</span>
                    {customerPhone && (
                      <button
                        onClick={() => handleCall(customerPhone)}
                        style={{ background: 'var(--cresoa-success)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon name="phone" size={14} stroke="#fff" />
                      </button>
                    )}
                    <a href={`/dashboard/orders/${o.id}?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', textDecoration: 'none', border: '1px solid var(--cresoa-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>View</a>
                    <a href={`/dashboard/orders/${o.id}/edit?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', textDecoration: 'none', border: '1px solid var(--cresoa-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</a>
                    <button onClick={() => handleDelete(o.id)} style={{ fontSize: '0.7rem', color: 'var(--cresoa-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.4rem' }}>Delete</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={currentBusinessId} />
      </div>
    </div>
  )
}
