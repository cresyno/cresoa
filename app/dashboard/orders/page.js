'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
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
  const handleCall = (phone) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    window.location.href = `tel:${cleanPhone}`
  }

  const handleWhatsApp = (phone, name, item, balance) => {
    if (!phone) return
    // Ensure Nigerian country code format
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    
    const text = `Hello ${name}, this is a message from Cresoa regarding your order: *${item}*.\n\nYour balance is ₦${balance.toLocaleString()}.`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
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
      <div className="orders-page">
        <div className="skeleton-header">
          <div className="skeleton-box" style={{ width: '140px', height: '24px' }} />
          <div className="skeleton-box" style={{ width: '100px', height: '32px' }} />
        </div>
        <div className="orders-metrics-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '70px' }} />
          ))}
        </div>
        <div className="orders-list">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '120px', marginBottom: '12px' }} />
          ))}
        </div>
        <Navigation businessId={currentBusinessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cresoa-danger)' }}>
        {error}
        <button onClick={loadOrders} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
      </div>
    )
  }

  return (
    <div className="orders-page">
      <Navigation businessId={currentBusinessId} />

      {/* ─── Header ─── */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Orders</h1>
          <p className="orders-subtitle">
            {totalOrders} orders · <span style={{ color: overdueOrders > 0 ? 'var(--color-danger)' : 'inherit' }}>{overdueOrders} overdue</span>
          </p>
        </div>
        <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button">
          <Icon name="plus" size={14} stroke="#fff" /> New Order
        </a>
      </div>

      {/* ─── Stats Grid (2x2 on mobile) ─── */}
      <div className="orders-metrics-grid">
        <div className="orders-metric-box">
          <span className="metric-label">Total</span>
          <span className="metric-value">{totalOrders}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Active</span>
          <span className="metric-value">{activeOrders}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Ready</span>
          <span className="metric-value" style={{ color: 'var(--color-secondary)' }}>{readyOrders}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Overdue</span>
          <span className="metric-value" style={{ color: 'var(--color-danger)' }}>{overdueOrders}</span>
        </div>
      </div>

      {/* ─── Search & Filters ─── */}
      <div className="orders-filters">
        <input
          type="text"
          className="orders-search-input"
          placeholder="Search customer or item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="orders-filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="orders-select">
            {statusOptions.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? `All (${totalOrders})` : `${s} (${statusCounts[s] || 0})`}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="orders-select">
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Price</option>
            <option value="lowest">Lowest Price</option>
          </select>
        </div>
      </div>

      {/* ─── Orders List ─── */}
      {sortedOrders.length === 0 ? (
        <div className="orders-empty">
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
          <h3>No orders found</h3>
          <p>Create your first order to get started.</p>
          <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button">Create Order</a>
        </div>
      ) : (
        <div className="orders-list">
          {sortedOrders.map((o) => {
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && o.current_status !== 'Delivered'
            const balance = (o.price || 0) - (o.amount_paid || 0)
            const customerName = o.customers?.name || 'No customer'
            const customerPhone = o.customers?.phone || ''
            const itemTitle = o.title || 'Untitled'

            return (
              <Card key={o.id} className="order-card">
                {/* Top Row: Name, Item, Price */}
                <div className="order-card-header">
                  <div className="order-card-title-group">
                    <h3 className="order-card-customer">{customerName}</h3>
                    <span className="order-card-item">· {itemTitle}</span>
                  </div>
                  <div className="order-card-price-group">
                    <span className="order-card-price">₦{o.price?.toLocaleString() || 0}</span>
                    {balance > 0 && (
                      <span className="order-card-due">₦{balance.toLocaleString()} due</span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Badges */}
                <div className="order-card-badges">
                  <StatusPill status={o.current_status} />
                  {isOverdue && <span className="badge-overdue">Overdue</span>}
                </div>

                {/* Bottom Row: Actions */}
                <div className="order-card-actions">
                  {customerPhone && (
                    <>
                      <button onClick={() => handleWhatsApp(customerPhone, customerName, itemTitle, balance)} className="btn-action btn-whatsapp">
                        WhatsApp
                      </button>
                      <button onClick={() => handleCall(customerPhone)} className="btn-action btn-call">
                        Call
                      </button>
                    </>
                  )}
                  <a href={`/dashboard/orders/${o.id}?business_id=${currentBusinessId || ''}`} className="btn-action btn-view">
                    View Details
                  </a>
                  <button onClick={() => handleDelete(o.id)} className="btn-action btn-delete">
                    Delete
                  </button>
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
