'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

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
  
  // UI State
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDestructive: false,
    onConfirm: null
  })
  const [toastMessage, setToastMessage] = useState('')

  const statusOptions = ['all', 'Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show Toast
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const loadOrders = async () => {
    // ... (Keep your existing loadOrders logic exactly the same) ...
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let businessId = getCurrentBusinessId()
      if (!businessId || businessId.length < 20) {
        const { data: owned } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).single()
        if (owned) { businessId = owned.id; setBusinessName(owned.name) }
      } else {
        const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
        if (biz) setBusinessName(biz.name)
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

  // ─── Filters & Sorting ───
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

  // ─── Helpers ───
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

  // ─── Action Handlers (Now using Custom Modal) ───
  const promptDelete = (orderId) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true,
      title: 'Delete Order?',
      message: 'This action cannot be undone. Are you sure you want to delete this order?',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (!res.ok) throw new Error('Failed to delete')
          showToast('Order deleted successfully')
          await loadOrders()
        } catch (err) {
          showToast('Failed to delete order')
        }
      }
    })
  }

  const promptRecordPayment = (orderId, price) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true,
      title: 'Record Payment',
      message: `Confirm you have received full payment of ₦${price.toLocaleString()}?`,
      confirmText: 'Confirm Payment',
      isDestructive: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}` 
            },
            body: JSON.stringify({ amount_paid: price })
          })
          if (!res.ok) throw new Error('Failed to record payment')
          showToast('Payment recorded!')
          await loadOrders()
        } catch (err) {
          showToast('Failed to record payment')
        }
      }
    })
  }

  if (loading) { /* ... Keep Skeleton ... */ }
  if (error) { /* ... Keep Error ... */ }

  return (
    <div className="orders-page">
      <Navigation businessId={currentBusinessId} />

      {/* HEADER & FILTERS (Keep as is) */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Orders</h1>
          <p className="orders-subtitle">{totalOrders} orders · {overdueOrders} overdue</p>
        </div>
        <a href={`/dashboard/orders/new?business_id=${currentBusinessId || ''}`} className="cresoa-primary-button">
          <Icon name="plus" size={14} stroke="#fff" /> New Order
        </a>
      </div>
      {/* ... Metrics, Search, Filters ... */}

      {/* ─── Orders List ─── */}
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

              {/* 3-Dot Menu */}
              <div className="menu-container" ref={isMenuOpen ? menuRef : null}>
                <button 
                  className={`btn-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                  onClick={() => setOpenMenuId(isMenuOpen ? null : o.id)}
                >
                  <Icon name="more-vertical" size={18} />
                </button>

                {isMenuOpen && (
                  <div className="dropdown-menu">
                    {balance > 0 && (
                      <button onClick={() => promptRecordPayment(o.id, o.price)} className="dropdown-item text-success">
                        <Icon name="check-circle" size={16} /> Record Full Payment
                      </button>
                    )}
                    <a href={`/dashboard/orders/${o.id}/edit?business_id=${currentBusinessId || ''}`} className="dropdown-item">
                      <Icon name="edit" size={16} /> Edit Order
                    </a>
                    <button onClick={() => {
                      navigator.clipboard.writeText(o.id)
                      setOpenMenuId(null)
                      showToast('Order ID copied!')
                    }} className="dropdown-item">
                      <Icon name="copy" size={16} /> Copy Order ID
                    </button>
                    <div className="dropdown-divider"></div>
                    <button onClick={() => promptDelete(o.id)} className="dropdown-item text-danger">
                      <Icon name="trash" size={16} /> Delete Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}

      {/* CUSTOM NATIVE MODAL */}
      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button 
                className="app-modal-btn cancel" 
                onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button 
                className={`app-modal-btn confirm ${modalConfig.isDestructive ? 'destructive' : ''}`} 
                onClick={modalConfig.onConfirm}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="app-toast">
          {toastMessage}
        </div>
      )}
    </div>
  )
              }
