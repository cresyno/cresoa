'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
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
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
  
  const [activeTab, setActiveTab] = useState('manual')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('dueSoonest') // Default to deadline
  
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  
  const menuRef = useRef(null)
  const statusMenuRef = useRef(null)
  const sortMenuRef = useRef(null)

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Not Started', value: 'Order placed' },
    { label: 'Cutting', value: 'Cutting' },
    { label: 'Sewing', value: 'Sewing' },
    { label: 'Ready for Pickup', value: 'Ready' },
    { label: 'Delivered', value: 'Delivered' }
  ]

  const sortOptions = [
    { label: 'Due Soonest', value: 'dueSoonest' },
    { label: 'Latest', value: 'latest' },
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
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let businessId = searchParams.get('business_id') || getCurrentBusinessId()
      if (!businessId || businessId.length < 20) {
        const { data: owned } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
        if (owned) businessId = owned.id
      }
      setCurrentBusinessId(businessId)

      const response = await fetch(`/api/orders?business_id=${businessId}`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to load orders')
      
      setOrders(Array.isArray(result.orders) ? result.orders : [])
    } catch (err) {
      setError('Failed to load orders: ' + err.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadOrders() }, [router, searchParams])

  // ─── FILTERING & STATS ───
  const tabOrders = orders.filter(o => o.source === activeTab || (!o.source && activeTab === 'manual'))
  
  const totalOrders = tabOrders.length
  const activeOrders = tabOrders.filter(o => o.current_status !== 'Delivered').length
  const readyOrders = tabOrders.filter(o => o.current_status === 'Ready').length
  const overdueOrders = tabOrders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date); due.setHours(0,0,0,0)
    const today = new Date(); today.setHours(0,0,0,0)
    return due < today
  }).length

  const handleStatClick = (filterType) => {
    if (filterType === 'all') setStatusFilter('all')
    else if (filterType === 'active') setStatusFilter('active') // Custom logic
    else if (filterType === 'ready') setStatusFilter('Ready')
    else if (filterType === 'overdue') setStatusFilter('overdue') // Custom logic
  }

  const filteredOrders = tabOrders.filter(o => {
    // Stat Card Filtering
    if (statusFilter === 'active' && o.current_status === 'Delivered') return false
    if (statusFilter === 'overdue') {
      if (!o.due_date || o.current_status === 'Delivered') return false
      const due = new Date(o.due_date); due.setHours(0,0,0,0)
      const today = new Date(); today.setHours(0,0,0,0)
      if (due >= today) return false
    }
    if (statusFilter !== 'all' && statusFilter !== 'active' && statusFilter !== 'overdue' && o.current_status !== statusFilter) return false
    
    // Search Filtering
    if (search) {
      const q = search.toLowerCase()
      return (o.customers?.name?.toLowerCase().includes(q) || o.title?.toLowerCase().includes(q))
    }
    return true
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'dueSoonest') {
      if (!a.due_date) return 1; if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (sortBy === 'latest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'highest') return (b.price || 0) - (a.price || 0)
    if (sortBy === 'lowest') return (a.price || 0) - (b.price || 0)
    return 0
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
    const text = balance > 0 
      ? `Hello ${name}, a quick reminder from Cresoa regarding your order: *${item}*.\n\nYour balance is ₦${balance.toLocaleString()}. Kindly settle to help us deliver on time. Thank you!`
      : `Hello ${name}, this is a message from Cresoa regarding your order: *${item}*.`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const promptDelete = (orderId) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Delete Order?', message: 'This action cannot be undone. Are you sure?',
      confirmText: 'Delete', isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        const previousOrders = [...orders]
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast('Order deleted', 'success')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } })
          if (!res.ok) throw new Error('Failed')
        } catch (err) {
          setOrders(previousOrders); showToast('Failed to delete', 'error')
        }
      }
    })
  }

  const promptRecordPayment = (orderId, balance) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Record Payment', message: `Confirm you have received full payment of ₦${balance.toLocaleString()}?`,
      confirmText: 'Confirm Payment', isDestructive: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        const previousOrders = [...orders]
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, amount_paid: o.price } : o))
        showToast('Payment recorded!', 'success')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}/payments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ amount: balance, note: 'Full payment' })
          })
          if (!res.ok) throw new Error('Failed')
        } catch (err) {
          setOrders(previousOrders); showToast('Failed to record payment', 'error')
        }
      }
    })
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading orders...</div>
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</div>

  return (
    <div className="orders-page" style={{ background: '#FFFFFF', minHeight: '100vh', paddingBottom: '120px' }}>
      <Navigation businessId={currentBusinessId} />

      {/* ─── HEADER & TABS ─── */}
      <div className="orders-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="orders-title" style={{ color: '#0F2B4A', fontWeight: 800, margin: 0 }}>Orders</h1>
            <p className="orders-subtitle" style={{ color: '#666', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
              Everything you're sewing right now.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadOrders} style={{ background: '#F4F6F8', border: '1px solid #EAEAEA', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>
              <SvgIcons.Refresh />
            </button>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', background: '#F4F6F8', padding: '4px', borderRadius: '12px', border: '1px solid #EAEAEA', width: '100%', maxWidth: '400px' }}>
          <button onClick={() => setActiveTab('manual')} style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'manual' ? '#FFFFFF' : 'transparent', color: activeTab === 'manual' ? '#0F2B4A' : '#666', fontWeight: activeTab === 'manual' ? 700 : 600, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'manual' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
            My Orders
          </button>
          <button onClick={() => setActiveTab('website')} style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'website' ? '#FFFFFF' : 'transparent', color: activeTab === 'website' ? '#0F2B4A' : '#666', fontWeight: activeTab === 'website' ? 700 : 600, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'website' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            Online Orders
            {orders.filter(o => o.source === 'website' && o.current_status !== 'Delivered').length > 0 && (
              <span style={{ background: '#D4AF37', color: '#FFF', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {orders.filter(o => o.source === 'website' && o.current_status !== 'Delivered').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── TAPPABLE METRICS ─── */}
      <div className="orders-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
        <div onClick={() => handleStatClick('all')} style={{ cursor: 'pointer', padding: '12px', background: statusFilter === 'all' ? '#0F2B4A' : '#F8F9FA', color: statusFilter === 'all' ? '#FFF' : '#666', borderRadius: '12px', textAlign: 'center', border: '1px solid #EAEAEA' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>All</span>
          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800 }}>{totalOrders}</span>
        </div>
        <div onClick={() => handleStatClick('active')} style={{ cursor: 'pointer', padding: '12px', background: statusFilter === 'active' ? '#0F2B4A' : '#F8F9FA', color: statusFilter === 'active' ? '#FFF' : '#666', borderRadius: '12px', textAlign: 'center', border: '1px solid #EAEAEA' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>In Progress</span>
          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800 }}>{activeOrders}</span>
        </div>
        <div onClick={() => handleStatClick('ready')} style={{ cursor: 'pointer', padding: '12px', background: statusFilter === 'Ready' ? '#0F2B4A' : '#F8F9FA', color: statusFilter === 'Ready' ? '#FFF' : '#666', borderRadius: '12px', textAlign: 'center', border: '1px solid #EAEAEA' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Ready</span>
          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800 }}>{readyOrders}</span>
        </div>
        <div onClick={() => handleStatClick('overdue')} style={{ cursor: 'pointer', padding: '12px', background: statusFilter === 'overdue' ? '#FF3B30' : '#FFF0F0', color: statusFilter === 'overdue' ? '#FFF' : '#FF3B30', borderRadius: '12px', textAlign: 'center', border: '1px solid #FECACA' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Late</span>
          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800 }}>{overdueOrders}</span>
        </div>
      </div>

      {/* ─── FILTERS ─── */}
      <div className="orders-filters" style={{ marginBottom: '1rem' }}>
        <div className="orders-search-wrapper" style={{ display: 'flex', alignItems: 'center', background: '#F4F6F8', border: '1px solid #EAEAEA', borderRadius: '12px', padding: '0 12px', marginBottom: '12px' }}>
          <SvgIcons.Search />
          <input type="text" style={{ border: 'none', background: 'transparent', padding: '12px', width: '100%', outline: 'none', fontSize: '0.95rem' }} placeholder="Search client or style..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><SvgIcons.X /></button>}
        </div>
        
        <div className="orders-filter-row" style={{ display: 'flex', gap: '10px' }}>
          <div className="custom-select-wrapper" ref={statusMenuRef} style={{ flex: 1, position: 'relative' }}>
            <button className="custom-select-btn" onClick={() => { setShowStatusMenu(!showStatusMenu); setShowSortMenu(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', fontSize: '0.9rem', color: '#333', cursor: 'pointer' }}>
              {statusOptions.find(o => o.value === statusFilter)?.label || 'Status'}
              <SvgIcons.ChevronDown />
            </button>
  {showStatusMenu && (
              <div className="custom-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 20, overflow: 'hidden' }}>
                {statusOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowStatusMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: statusFilter === opt.value ? '#F4F6F8' : '#FFF', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: statusFilter === opt.value ? '#0F2B4A' : '#333', fontWeight: statusFilter === opt.value ? 700 : 500 }}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          <div className="custom-select-wrapper" ref={sortMenuRef} style={{ flex: 1, position: 'relative' }}>
            <button className="custom-select-btn" onClick={() => { setShowSortMenu(!showSortMenu); setShowStatusMenu(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', fontSize: '0.9rem', color: '#333', cursor: 'pointer' }}>
              {sortOptions.find(o => o.value === sortBy)?.label || 'Sort'}
              <SvgIcons.ChevronDown />
            </button>
            {showSortMenu && (
              <div className="custom-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 20, overflow: 'hidden' }}>
                {sortOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: sortBy === opt.value ? '#F4F6F8' : '#FFF', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: sortBy === opt.value ? '#0F2B4A' : '#333', fontWeight: sortBy === opt.value ? 700 : 500 }}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── COMPACT LIST ─── */}
      {sortedOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{activeTab === 'website' ? '🛒' : '📋'}</div>
          <h3 style={{ color: '#0F2B4A', margin: '0 0 10px 0' }}>{activeTab === 'website' ? 'No online orders yet' : 'No orders found'}</h3>
          <p style={{ color: '#666' }}>{search ? 'Try a different search term.' : activeTab === 'website' ? 'When customers buy from your store, orders will appear here.' : 'Create your first order to get started.'}</p>
        </div>
      ) : (
        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedOrders.map((o) => {
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && o.current_status !== 'Delivered'
            const balance = (o.price || 0) - (o.amount_paid || 0)
            const customerName = o.customers?.name || 'No customer'
            const customerPhone = o.customers?.phone || ''
            const itemTitle = o.title || 'Untitled'
            const isMenuOpen = openMenuId === o.id
            const dueDateFormatted = o.due_date ? new Date(o.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Not set'

            return (
              <Card key={o.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                
                {/* LINE 1: Client & Money */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#0F2B4A', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                      {getInitials(customerName)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{customerName}</h3>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>{itemTitle}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A' }}>₦{o.price?.toLocaleString() || 0}</span>
                    {balance > 0 ? (
                      <span style={{ fontSize: '0.8rem', color: isOverdue ? '#FF3B30' : '#666', fontWeight: 600 }}>Balance: ₦{balance.toLocaleString()}</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#137333', fontWeight: 600 }}>Fully Paid</span>
                    )}
                  </div>
                </div>

                {/* LINE 2: Status, Due Date & Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusPill status={o.current_status === 'Order placed' ? 'Not Started' : o.current_status} />
                    {isOverdue && <span style={{ background: '#FFF0F0', color: '#FF3B30', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>LATE</span>}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: isOverdue ? '#FF3B30' : '#666', fontWeight: isOverdue ? 700 : 500 }}>
                    Due: {dueDateFormatted}
                  </span>
                </div>

                {/* LINE 3: Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {customerPhone ? (
                      <>
                        <button onClick={() => handleWhatsApp(customerPhone, customerName, itemTitle, balance)} style={{ background: balance > 0 ? '#E6F4EA' : '#F4F6F8', color: balance > 0 ? '#137333' : '#0F2B4A', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {balance > 0 ? 'Send Reminder' : 'Chat'}
                        </button>
                        <button onClick={() => handleCall(customerPhone)} style={{ background: '#F4F6F8', color: '#0F2B4A', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <SvgIcons.Phone />
                        </button>
                      </>
                    ) : (
                      <a href={`/dashboard/customers/${o.customer_id}?business_id=${currentBusinessId}`} style={{ background: '#F4F6F8', color: '#999', border: '1px dashed #CCC', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                        + Add Phone
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a href={`/dashboard/orders/${o.id}?business_id=${currentBusinessId || ''}`} style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                      Open
                    </a>
                    <div className="menu-container" ref={isMenuOpen ? menuRef : null} style={{ position: 'relative' }}>
                      <button onClick={() => setOpenMenuId(isMenuOpen ? null : o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px' }}>
                        <SvgIcons.MoreVertical />
                      </button>
                      {isMenuOpen && (
                        <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '180px', zIndex: 30, overflow: 'hidden' }}>
                          {balance > 0 && (
                            <button onClick={() => promptRecordPayment(o.id, balance)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#137333', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <SvgIcons.CheckCircle /> Mark as Paid
                            </button>
                          )}
                          <a href={`/dashboard/orders/${o.id}/edit?business_id=${currentBusinessId || ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333', textDecoration: 'none' }}>
                            <SvgIcons.Edit /> Edit Order
                          </a>
                          <button onClick={() => promptDelete(o.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#FF3B30', fontWeight: 600 }}>
                            <SvgIcons.Trash /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* STICKY NEW ORDER BUTTON */}
      <div style={{ position: 'fixed', bottom: '75px', left: '16px', right: '16px', background: 'linear-gradient(to top, #FFF 60%, transparent)', paddingTop: '20px', paddingBottom: '10px', zIndex: 90 }}>
        <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} style={{ display: 'block', textAlign: 'center', width: '100%', padding: '16px', background: '#0F2B4A', color: '#FFF', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(15, 43, 74, 0.3)' }}>
          + New Order
        </a>
      </div>

      {/* MODALS & TOASTS */}
      {modalConfig.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div style={{ background: '#FFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#0F2B4A' }}>{modalConfig.title}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} style={{ padding: '10px 16px', background: '#F4F6F8', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={modalConfig.onConfirm} style={{ padding: '10px 16px', background: modalConfig.isDestructive ? '#FF3B30' : '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '160px', left: '50%', transform: 'translateX(-50%)', background: toastType === 'success' ? '#137333' : '#FF3B30', color: '#FFF', padding: '12px 24px', borderRadius: '30px', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toastMessage}
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}><Navigation businessId={currentBusinessId} /></div>
    </div>
  )
}
