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
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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
  
  // Tab State ('manual' or 'website')
  const [activeTab, setActiveTab] = useState('manual')
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // Dropdown & Menu State
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  
  const menuRef = useRef(null)
  const statusMenuRef = useRef(null)
  const sortMenuRef = useRef(null)

  // Custom Modal & Toast State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null
  })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Order placed', value: 'Order placed' },
    { label: 'Cutting', value: 'Cutting' },
    { label: 'Sewing', value: 'Sewing' },
    { label: 'Ready', value: 'Ready' },
    { label: 'Delivered', value: 'Delivered' }
  ]

  const sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Highest Price', value: 'highest' },
    { label: 'Lowest Price', value: 'lowest' }
  ]

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null)
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) setShowStatusMenu(false)
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // ✅ FIX: Prioritize the ID from the URL bar instead of LocalStorage
      let businessId = searchParams.get('business_id') || getCurrentBusinessId()
      
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
      
      // ✅ FIX: Ensure we are mapping over a valid array
      const rawOrders = Array.isArray(result.orders) ? result.orders : []
      
      const formattedOrders = rawOrders.map(o => ({
        ...o,
        source: o.source || 'manual' 
      }))
      
      setOrders(formattedOrders)
    } catch (err) {
      setError('Failed to load orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [router, searchParams])

  // ─── FILTERING LOGIC ───
  const tabOrders = orders.filter(o => o.source === activeTab)
  
  const totalOrders = tabOrders.length
  const activeOrders = tabOrders.filter(o => o.current_status !== 'Delivered').length
  const readyOrders = tabOrders.filter(o => o.current_status === 'Ready').length
  const overdueOrders = tabOrders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date); due.setHours(0,0,0,0)
    const today = new Date(); today.setHours(0,0,0,0)
    return due < today
  }).length

  const filteredOrders = tabOrders.filter(o => {
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

  const promptDelete = (orderId) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Delete Order?', message: 'This action cannot be undone. Are you sure you want to delete this order?',
      confirmText: 'Delete', isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        const previousOrders = [...orders]
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast('Order deleted successfully', 'success')

        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (!res.ok) throw new Error('Failed to delete')
        } catch (err) {
          setOrders(previousOrders)
          showToast('Failed to delete order', 'error')
        }
      }
    })
  }

  const promptRecordPayment = (orderId, balance) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, 
      title: 'Record Payment', 
      message: `Confirm you have received full payment of ₦${balance.toLocaleString()}?`,
      confirmText: 'Confirm Payment', 
      isDestructive: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        
        const previousOrders = [...orders]
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, amount_paid: o.price } : o))
        showToast('Payment recorded!', 'success')

        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ amount: balance, note: 'Full payment from list view' })
          })
          if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || 'Failed to record payment')
          }
        } catch (err) {
          setOrders(previousOrders)
          showToast(err.message || 'Failed to record payment', 'error')
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-header-skeleton">
          <div className="skeleton-box" style={{ width: '140px', height: '28px' }} />
          <div className="skeleton-box" style={{ width: '110px', height: '38px' }} />
        </div>
        <div className="orders-metrics-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />)}
        </div>
        <div className="orders-filters-skeleton">
           <div className="skeleton-box" style={{ height: '44px', width: '100%', marginBottom: '10px' }} />
           <div style={{ display: 'flex', gap: '10px' }}>
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
           </div>
        </div>
        <div className="orders-list">
          {[1,2,3].map(i => <div key={i} className="skeleton-box" style={{ height: '160px', marginBottom: '12px', borderRadius: '16px' }} />)}
        </div>
        <Navigation businessId={currentBusinessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="orders-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>
        <button onClick={loadOrders} className="cresoa-primary-button">Retry</button>
      </div>
    )
  }

  return (
    <div className="orders-page" style={{ background: '#FFFFFF', minHeight: '100vh', paddingBottom: '100px' }}>
      <Navigation businessId={currentBusinessId} />

      {/* ─── HEADER & TABS ─── */}
      <div className="orders-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '2px solid #0F2B4A', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="orders-title" style={{ color: '#0F2B4A', fontWeight: 800 }}>Orders</h1>
            <p className="orders-subtitle" style={{ color: '#666' }}>
              Manage fulfillment and production.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadOrders} style={{ background: '#F4F6F8', border: '1px solid #EAEAEA', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SvgIcons.Refresh />
            </button>
            <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button" style={{ background: '#0F2B4A', color: '#FFF' }}>
              <SvgIcons.Plus /> New Order
            </a>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', background: '#F4F6F8', padding: '4px', borderRadius: '12px', border: '1px solid #EAEAEA', width: '100%', maxWidth: '400px' }}>
          <button 
            onClick={() => setActiveTab('manual')} 
            style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'manual' ? '#FFFFFF' : 'transparent', color: activeTab === 'manual' ? '#0F2B4A' : '#666', fontWeight: activeTab === 'manual' ? 700 : 600, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'manual' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            Manual Orders
          </button>
          <button 
            onClick={() => setActiveTab('website')} 
            style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'website' ? '#FFFFFF' : 'transparent', color: activeTab === 'website' ? '#0F2B4A' : '#666', fontWeight: activeTab === 'website' ? 700 : 600, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'website' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            Website Orders
            {orders.filter(o => o.source === 'website' && o.current_status !== 'Delivered').length > 0 && (
              <span style={{ background: '#D4AF37', color: '#FFF', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {orders.filter(o => o.source === 'website' && o.current_status !== 'Delivered').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── METRICS ─── */}
      <div className="orders-metrics-grid">
        <div className="orders-metric-box"><span className="metric-label">Total</span><span className="metric-value">{totalOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Active</span><span className="metric-value">{activeOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Ready</span><span className="metric-value" style={{ color: 'var(--color-secondary)' }}>{readyOrders}</span></div>
        <div className="orders-metric-box"><span className="metric-label">Overdue</span><span className="metric-value" style={{ color: 'var(--color-danger)' }}>{overdueOrders}</span></div>
      </div>

      {/* ─── FILTERS ─── */}
      <div className="orders-filters">
        <div className="orders-search-wrapper">
          <span className="search-icon"><SvgIcons.Search /></span>
          <input 
            type="text" 
            className="orders-search-input" 
            placeholder="Search customer or item..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              <SvgIcons.X />
            </button>
          )}
        </div>
        
        <div className="orders-filter-row">
          {/* CUSTOM STATUS DROPDOWN */}
          <div className="custom-select-wrapper" ref={statusMenuRef}>
            <button className="custom-select-btn" onClick={() => { setShowStatusMenu(!showStatusMenu); setShowSortMenu(false); }}>
              {statusOptions.find(o => o.value === statusFilter)?.label || 'Status'}
              <SvgIcons.ChevronDown />
            </button>
            {showStatusMenu && (
              <div className="custom-dropdown-menu">
                {statusOptions.map(opt => (
                  <button 
                    key={opt.value} 
                    className={`custom-dropdown-item ${statusFilter === opt.value ? 'active' : ''}`}
                    onClick={() => { setStatusFilter(opt.value); setShowStatusMenu(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CUSTOM SORT DROPDOWN */}
          <div className="custom-select-wrapper" ref={sortMenuRef}>
            <button className="custom-select-btn" onClick={() => { setShowSortMenu(!showSortMenu); setShowStatusMenu(false); }}>
              {sortOptions.find(o => o.value === sortBy)?.label || 'Sort'}
              <SvgIcons.ChevronDown />
            </button>
            {showSortMenu && (
              <div className="custom-dropdown-menu">
                {sortOptions.map(opt => (
                  <button 
                    key={opt.value} 
                    className={`custom-dropdown-item ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── LIST ─── */}
    {sortedOrders.length === 0 ? (
        <div className="orders-empty" style={{ textAlign: 'center', padding: '4rem 2rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <div className="empty-icon" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {activeTab === 'website' ? '🛒' : '📋'}
          </div>
          <h3 style={{ color: '#0F2B4A', margin: '0 0 10px 0' }}>
            {activeTab === 'website' ? 'No website orders yet' : 'No manual orders found'}
          </h3>
          <p style={{ color: '#666' }}>
            {search ? 'Try a different search term.' : activeTab === 'website' ? 'When customers buy from your store, orders will appear here.' : 'Create your first manual order to get started.'}
          </p>
          {!search && activeTab === 'manual' && (
            <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button" style={{ marginTop: '1rem', display: 'inline-block', background: '#0F2B4A', color: '#FFF' }}>Create Order</a>
          )}
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
              <Card key={o.id} className="order-card" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="order-identity" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="cresoa-avatar" style={{ background: '#0F2B4A', color: '#FFF', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{getInitials(customerName)}</div>
                    <div className="order-card-title-group">
                      <h3 className="order-card-customer" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{customerName}</h3>
                      <span className="order-card-item" style={{ fontSize: '0.85rem', color: '#666' }}>{itemTitle}</span>
                    </div>
                  </div>
                  <div className="order-card-price-group" style={{ textAlign: 'right' }}>
                    <span className="order-card-price" style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A' }}>₦{o.price?.toLocaleString() || 0}</span>
                    {balance > 0 && <span className="order-card-due" style={{ fontSize: '0.8rem', color: '#FF3B30', fontWeight: 600 }}>₦{balance.toLocaleString()} due</span>}
                  </div>
                </div>

                <div className="order-card-badges" style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  <StatusPill status={o.current_status} />
                  {isOverdue && <span className="badge-overdue" style={{ background: '#FFF0F0', color: '#FF3B30', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Overdue</span>}
                  {o.source === 'website' && <span className="badge-overdue" style={{ background: '#F4F6F8', color: '#0F2B4A', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Web Order</span>}
                </div>

                <div className="order-card-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '1rem' }}>
                  <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
                    {customerPhone && (
                      <>
                        <button onClick={() => handleWhatsApp(customerPhone, customerName, itemTitle, balance)} className="btn-action btn-whatsapp" style={{ background: '#E6F4EA', color: '#137333', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>WhatsApp</button>
                        <button onClick={() => handleCall(customerPhone)} className="btn-action btn-call" style={{ background: '#F4F6F8', color: '#0F2B4A', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Call</button>
                      </>
                    )}
                    <a href={`/dashboard/orders/${o.id}?business_id=${currentBusinessId || ''}`} className="btn-action btn-view" style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View Details</a>
                  </div>

                  <div className="menu-container" ref={isMenuOpen ? menuRef : null} style={{ position: 'relative' }}>
                    <button className={`btn-menu-trigger ${isMenuOpen ? 'active' : ''}`} onClick={() => setOpenMenuId(isMenuOpen ? null : o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '6px' }}>
                      <SvgIcons.MoreVertical />
                    </button>

                    {isMenuOpen && (
                      <div className="dropdown-menu" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '200px', zIndex: 10, overflow: 'hidden' }}>
                        {balance > 0 && (
                          <button onClick={() => promptRecordPayment(o.id, balance)} className="dropdown-item text-success" style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#137333', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <SvgIcons.CheckCircle /> Record Full Payment
                          </button>
                        )}
                        <a href={`/dashboard/orders/${o.id}/edit?business_id=${currentBusinessId || ''}`} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333', textDecoration: 'none' }}>
                          <SvgIcons.Edit /> Edit Order
                        </a>
                        <button onClick={() => { navigator.clipboard.writeText(o.id); setOpenMenuId(null); showToast('Order ID copied!', 'success') }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333' }}>
                          <SvgIcons.Copy /> Copy Order ID
                        </button>
                        <div className="dropdown-divider" style={{ height: '1px', background: '#EAEAEA', margin: '4px 0' }}></div>
                        <button onClick={() => promptDelete(o.id)} className="dropdown-item text-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#FF3B30', fontWeight: 600 }}>
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

      {/* ─── MODALS & TOASTS ─── */}
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
          {toastType === 'success' ? '✅ ' : '⚠️ '} {toastMessage}
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}><Navigation businessId={currentBusinessId} /></div>
    </div>
  )
}
