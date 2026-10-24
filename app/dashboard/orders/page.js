'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Card } from '../../../components/Card'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  MoreVertical: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  Copy: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null
  })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success') // 'success' or 'error'

  const statusOptions = ['all', 'Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Initial Load Only
  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let businessId = getCurrentBusinessId()
      if (!businessId || businessId.length < 20) {
        const { data: owned } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
        if (owned) businessId = owned.id
      }

      setCurrentBusinessId(businessId)

      const response = await fetch(`/api/orders?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to load orders')
      setOrders(result.orders || [])
    } catch (err) {
      setError('Failed to load orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [router, searchParams])

  // ─── Computed stats ───
  const totalOrders = orders.length
  const activeOrders = orders.filter(o => o.current_status !== 'Delivered').length
  const readyOrders = orders.filter(o => o.current_status === 'Ready').length
  const overdueOrders = orders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date); due.setHours(0,0,0,0)
    const today = new Date(); today.setHours(0,0,0,0)
    return due < today
  }).length

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.current_status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (o.customers?.name?.toLowerCase().includes(q) || o.title?.toLowerCase().includes(q))
    }
    return true
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'latest': return new Date(b.created_at) - new Date(a.created_at)
      case 'oldest': return new Date(a.created_at) - new Date(b.created_at)
      case 'highest': return (b.price || 0) - (a.price || 0)
      case 'lowest': return (a.price || 0) - (b.price || 0)
      default: return 0
    }
  })

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.current_status] = (acc[o.current_status] || 0) + 1
    return acc
  }, {})

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const handleCall = (phone) => {
    if (!phone) return
    window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }

  const handleWhatsApp = (phone, name, item, balance) => {
    if (!phone) return
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    const text = `Hello ${name}, this is a message from Cresoa regarding your order: *${item}*.\n\nYour balance is ₦${balance.toLocaleString()}.`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // ─── OPTIMISTIC DELETE (No Page Reload) ───
  const promptDelete = (orderId) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Delete Order?', message: 'This action cannot be undone. Are you sure you want to delete this order?',
      confirmText: 'Delete', isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        
        // 1. Save current state to rollback if needed
        const previousOrders = [...orders]
        
        // 2. Instantly update UI
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast('Order deleted successfully', 'success')

        // 3. Make API call in background
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (!res.ok) throw new Error('Failed to delete')
        } catch (err) {
          // 4. Rollback if API fails
          setOrders(previousOrders)
          showToast('Failed to delete order', 'error')
        }
      }
    })
  }

  // ─── OPTIMISTIC PAYMENT (No Page Reload) ───
  const promptRecordPayment = (orderId, price) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Record Payment', message: `Confirm you have received full payment of ₦${price.toLocaleString()}?`,
      confirmText: 'Confirm Payment', isDestructive: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        
        // 1. Save current state to rollback if needed
        const previousOrders = [...orders]
        
        // 2. Instantly update UI
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, amount_paid: price } : o))
        showToast('Payment recorded!', 'success')

        // 3. Make API call in background
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ amount_paid: price })
          })
          if (!res.ok) throw new Error('Failed to record payment')
        } catch (err) {
          // 4. Rollback if API fails
          setOrders(previousOrders)
          showToast('Failed to record payment', 'error')
        }
      }
    })
  }

  // ─── SKELETON LOADING STATE ───
  if (loading) {
    return (
      <div className="orders-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div className="skeleton-box" style={{ width: '140px', height: '28px' }} />
          <div className="skeleton-box" style={{ width: '110px', height: '38px' }} />
        </div>
        <div className="orders-metrics-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />
          ))}
        </div>
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
           <div className="skeleton-box" style={{ height: '44px', width: '100%', marginBottom: '10px' }} />
           <div style={{ display: 'flex', gap: '10px' }}>
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
           </div>
        </div>
        <div className="orders-list">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '160px', marginBottom: '12px', borderRadius: '16px' }} />
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

      <div className="orders-header">
        <div>
          <h1 className="orders-title">Orders</h1>
          <p className="orders-subtitle">
            {totalOrders} orders · <span style={{ color: overdueOrders > 0 ? 'var(--color-danger)' : 'inherit' }}>{overdueOrders} overdue</span>
          </p>
        </div>
        <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button">
          <SvgIcons.Plus /> New Order
        </a>
      </div>

      <div className="orders-metrics-grid">
        <div className="orders-metric-box"><span className="metric-label">Total</span><span className="metric-value">{totalOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Active</span><span className="metric-value">{activeOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Ready</span><span className="metric-value" style={{ color: 'var(--color-secondary)' }}>{readyOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Overdue</span><span className="metric-value" style={{ color: 'var(--color-danger)' }}>{overdueOrders}</span></div>
      </div>

      <div className="orders-filters">
        <input type="text" className="orders-search-input" placeholder="Search customer or item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="orders-filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="orders-select">
            {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? `All (${totalOrders})` : `${s} (${statusCounts[s] || 0})`}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="orders-select">
            <option value="latest">Latest</option><option value="oldest">Oldest</option>
            <option value="highest">Highest Price</option><option value="lowest">Lowest Price</option>
          </select>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="orders-empty">
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
          <h3>No orders found</h3><p>Create your first order to get started.</p>
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
            const isMenuOpen = openMenuId === o.id

            return (
              <Card key={o.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-identity">
                    <div className="cresoa-avatar">{getInitials(customerName)}</div>
                    <div className="order-card-title-group">
                      <h3 className="order-card-customer">{customerName}</h3>
                      <span className="order-card-item">· {itemTitle}</span>
                    </div>
                  </div>
                  <div className="order-card-price-group">
                    <span className="order-card-price">₦{o.price?.toLocaleString() || 0}</span>
                    {balance > 0 && <span className="order-card-due">₦{balance.toLocaleString()} due</span>}
                  </div>
                </div>

                <div className="order-card-badges">
                  <StatusPill status={o.current_status} />
                  {isOverdue && <span className="badge-overdue">Overdue</span>}
                </div>

                <div className="order-card-actions">
                  <div className="action-buttons-group">
                    {customerPhone && (
                      <>
                        <button onClick={() => handleWhatsApp(customerPhone, customerName, itemTitle, balance)} className="btn-action btn-whatsapp">WhatsApp</button>
                        <button onClick={() => handleCall(customerPhone)} className="btn-action btn-call">Call</button>
                      </>
                    )}
                    <a href={`/dashboard/orders/${o.id}?business_id=${currentBusinessId || ''}`} className="btn-action btn-view">View</a>
                  </div>

                  <div className="menu-container" ref={isMenuOpen ? menuRef : null}>
                    <button className={`btn-menu-trigger ${isMenuOpen ? 'active' : ''}`} onClick={() => setOpenMenuId(isMenuOpen ? null : o.id)}>
                      <SvgIcons.MoreVertical />
                    </button>

                    {isMenuOpen && (
                      <div className="dropdown-menu">
                        {balance > 0 && (
                          <button onClick={() => promptRecordPayment(o.id, o.price)} className="dropdown-item text-success">
                            <SvgIcons.CheckCircle /> Record Full Payment
                          </button>
                        )}
                        <a href={`/dashboard/orders/${o.id}/edit?business_id=${currentBusinessId || ''}`} className="dropdown-item">
                          <SvgIcons.Edit /> Edit Order
                        </a>
                        <button onClick={() => {
                          navigator.clipboard.writeText(o.id)
                          setOpenMenuId(null)
                          showToast('Order ID copied!', 'success')
                        }} className="dropdown-item">
                          <SvgIcons.Copy /> Copy Order ID
                        </button>
                        <div className="dropdown-divider"></div>
                        <button onClick={() => promptDelete(o.id)} className="dropdown-item text-danger">
                          <SvgIcons.Trash /> Delete Order
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
              <button className={`app-modal-btn confirm ${modalConfig.isDestructive ? 'destructive' : ''}`} onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastType === 'success' ? '✅ ' : '⚠️ '}
          {toastMessage}
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}><Navigation businessId={currentBusinessId} /></div>
    </div>
  )
    }
