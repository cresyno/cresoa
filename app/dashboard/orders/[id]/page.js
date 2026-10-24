'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../../lib/planLimits'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

const STATUS_FLOW = [
  { value: 'Order placed', label: 'Order placed', short: 'Placed', icon: 'clipboard', customerMessage: 'Your order has been received and is now in our production queue.' },
  { value: 'Cutting', label: 'Cutting', short: 'Cutting', icon: 'scissors', customerMessage: 'Good news! Your outfit is now in the cutting stage. We are carefully preparing the fabric.' },
  { value: 'Sewing', label: 'Sewing', short: 'Sewing', icon: 'edit-2', customerMessage: 'Your outfit is currently being sewn and assembled. We are making sure the details come together.' },
  { value: 'Ready', label: 'Ready for pickup', short: 'Ready', icon: 'check-circle', customerMessage: 'Your outfit is ready! You can now arrange pickup or delivery with us.' },
  { value: 'Delivered', label: 'Delivered', short: 'Delivered', icon: 'package', customerMessage: 'Your order has been marked as delivered. Thank you for choosing us!' }
]

// ─── SELF-CONTAINED SVG ICONS ───
const Icon = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const paths = {
    'clipboard': <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 12h6" /><path d="M9 16h6" /></>,
    'scissors': <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" /><line x1="15.5" y1="8.5" x2="8.5" y2="15.5" /></>,
    'edit-2': <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    'check': <polyline points="20 6 9 17 4 12" />,
    'package': <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    'arrow-left': <polyline points="15 18 9 12 15 6" />,
    'arrow-right-circle': <><circle cx="12" cy="12" r="10" /><polyline points="12 16 16 12 12 8" /><line x1="8" y1="12" x2="16" y2="12" /></>,
    'plus': <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    'credit-card': <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    'check-circle': <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M9 12l2 2 4-4" /></>,
    'phone': <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    'message-circle': <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    'link': <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" /></>,
    'copy': <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    'send': <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'trash-2': <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'more-vertical': <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [payments, setPayments] = useState([])
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', price: '', due_date: '' })

  const [copied, setCopied] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState('')
  
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }
      setCurrentBusinessId(bizId)

      const { data: orderData, error: orderError } = await supabase.from('orders').select(`*, customers (id, name, first_name, last_name, phone, email, address)`).eq('id', orderId).eq('business_id', bizId).single()
      if (orderError) throw orderError
      setOrder(orderData)
      setCustomer(orderData.customers)
      setNotes(orderData.notes || '')
      setEditForm({ title: orderData.title || '', price: orderData.price || '', due_date: orderData.due_date || '' })

      const { data: bizData } = await supabase.from('businesses').select('*').eq('id', bizId).single()
      if (bizData) setBusinessPlan(bizData.plan || 'free')

      const { data: paymentData, error: paymentError } = await supabase.from('payment_records').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
      if (paymentError) throw paymentError
      setPayments(paymentData || [])
    } catch (err) {
      setError('We could not load this order.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (orderId) loadOrder() }, [orderId])

  const statusIndex = useMemo(() => {
    if (!order) return 0
    const index = STATUS_FLOW.findIndex(item => item.value === (order.current_status || 'Order placed'))
    return index >= 0 ? index : 0
  }, [order])

  const balance = useMemo(() => {
    if (!order) return 0
    return Math.max(0, Number(order?.price || 0) - Number(order?.amount_paid || 0))
  }, [order])

  const isFullyPaid = balance <= 0
  const canWhatsApp = isFeatureAvailable(businessPlan, 'whatsapp_reminders')
  const isOverdue = order?.due_date && new Date(order.due_date) < new Date() && order?.current_status !== 'Delivered'
  const currentStatusInfo = STATUS_FLOW.find(item => item.value === (order?.current_status || 'Order placed')) || STATUS_FLOW[0]
  const selectedStatusInfo = STATUS_FLOW.find(item => item.value === selectedStatus) || null

  const formatMoney = value => `₦${Number(value || 0).toLocaleString('en-NG')}`
  const formatDate = value => !value ? 'Not set' : new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const customerName = customer?.first_name || customer?.name || 'Customer'

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('orders').update({ notes }).eq('id', orderId)
    } catch (err) { alert('Could not save the note.') } finally { setSavingNotes(false) }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setRecordingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount, note: paymentNote || 'Payment recorded' })
      })
      if (!response.ok) throw new Error('Failed')
      await loadOrder()
      setPaymentAmount(''); setPaymentNote(''); setShowPaymentModal(false)
    } catch (err) { alert('Could not record payment.') } finally { setRecordingPayment(false) }
  }

  const updateStatus = async (status) => {
    if (!status || status === order.current_status) { setShowStatusModal(false); return }
    setUpdatingStatus(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('orders').update({ current_status: status }).eq('id', orderId)
      await loadOrder()
      setShowStatusModal(false); setSelectedStatus(null)
    } catch (err) { alert('Could not update status.') } finally { setUpdatingStatus(false) }
  }

  const openWhatsAppModal = () => {
    const item = STATUS_FLOW.find(entry => entry.value === order.current_status)
    const msg = `Hi ${customerName}, ${item ? item.customerMessage : 'there is an update on your order.'}`
    setWhatsAppMessage(msg)
    setIsEditingMessage(false)
    setIsWhatsAppModalOpen(true)
  }

  const handleSendWhatsApp = () => {
    if (!customer?.phone) return alert('No phone number.')
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  const getTrackingLink = () => `${window.location.origin}/track/${order?.tracking_token}`
  
  const copyTrackingLink = async () => {
    await navigator.clipboard.writeText(getTrackingLink())
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('orders').update({ title: editForm.title, price: parseFloat(editForm.price) || 0, due_date: editForm.due_date || null }).eq('id', orderId)
      await loadOrder()
      setShowEditModal(false)
    } catch (err) { alert('Could not update order.') } finally { setEditing(false) }
  }

  const handleDuplicate = async () => {
    if (!confirm('Duplicate this order?')) return
    try {
      const { data, error } = await supabase.from('orders').insert({ business_id: currentBusinessId, customer_id: order.customer_id, title: `${order.title} (Copy)`, price: order.price, amount_paid: 0, due_date: order.due_date, current_status: 'Order placed' }).select().single()
      if (error) throw error
      router.push(`/dashboard/orders/${data.id}?business_id=${currentBusinessId}`)
    } catch (err) { alert('Could not duplicate.') }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this order? This cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('orders').delete().eq('id', orderId)
      router.push(`/dashboard/orders?business_id=${currentBusinessId}`)
    } catch (err) { alert('Could not delete order.') }
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error || !order) return <div className="order-page-error"><Icon name="alert-circle" size={30} stroke="var(--color-danger)" /><h2>Couldn't load order</h2><button onClick={loadOrder} className="cresoa-primary-button">Try again</button></div>

  return (
    <div className="order-details-page">
      <Navigation businessId={currentBusinessId} />

      <button onClick={() => router.push(`/dashboard/orders?business_id=${currentBusinessId}`)} className="order-back-btn">
        <Icon name="arrow-left" size={16} /> Orders
      </button>

      {/* ─── HEADER COMMAND CENTER ─── */}
      <div className="order-header">
        <div className="order-title-area">
          <p className="order-eyebrow">ORDER DETAILS</p>
          <h1 className="order-title">{order.title || 'Untitled order'}</h1>
          <p className="order-subtitle">#{orderId.slice(0, 8).toUpperCase()} · {customerName}</p>
        </div>
        
        <div className="order-header-actions">
          <button onClick={() => router.push(`/dashboard/invoices/new?order_id=${orderId}`)} className="order-btn-secondary invoice-btn">
            <Icon name="file-text" size={16} /> Invoice
          </button>
          
          <div className="menu-container" ref={menuRef}>
            <button className="order-btn-secondary icon-only" onClick={() => setShowMenu(!showMenu)}>
              <Icon name="more-vertical" size={20} />
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={() => { setShowMenu(false); setShowEditModal(true) }} className="dropdown-item">
                  <Icon name="edit-2" size={16} /> Edit Order
                </button>
                <button onClick={() => { setShowMenu(false); handleDuplicate() }} className="dropdown-item">
                  <Icon name="copy" size={16} /> Duplicate Order
                </button>
                <div className="dropdown-divider"></div>
                <button onClick={() => { setShowMenu(false); handleDelete() }} className="dropdown-item text-danger">
                  <Icon name="trash-2" size={16} /> Delete Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PROGRESS STEPPER ─── */}
      <div className="order-stepper-container">
        {STATUS_FLOW.map((status, index) => {
          const completed = index <= statusIndex
          const active = index === statusIndex
          return (
            <div key={status.value} className="order-stepper-step">
              <div className={`order-stepper-circle ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}>
                {completed && <Icon name={active ? status.icon : 'check'} size={14} />}
              </div>
              <span className={`order-stepper-label ${active ? 'active' : ''}`}>{status.short}</span>
              {index < STATUS_FLOW.length - 1 && <div className={`order-stepper-line ${index < statusIndex ? 'completed' : ''}`} />}
            </div>
          )
        })}
      </div>

      {/* ─── PRIMARY ACTIONS ─── */}
      <div className="order-main-actions">
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button full-width">
          <Icon name="arrow-right-circle" size={18} /> Update Status
        </button>
        <button onClick={openWhatsAppModal} disabled={!canWhatsApp} className="order-btn-wa full-width">
          <Icon name="message-circle" size={18} /> Update via WhatsApp
        </button>
      </div>

      {/* ─── FINANCIAL SUMMARY ─── */}
      <div className="order-finance-card">
        <div className="order-finance-grid">
          <div className="order-finance-item">
            <span className="label">Total</span>
            <span className="value">{formatMoney(order.price)}</span>
          </div>
          <div className="order-finance-item">
            <span className="label">Paid</span>
            <span className="value text-success">{formatMoney(order.amount_paid)}</span>
          </div>
          <div className="order-finance-item">
            <span className="label">Balance</span>
            <span className={`value ${balance > 0 ? 'text-danger' : 'text-success'}`}>
              {balance > 0 ? formatMoney(balance) : '✓ Paid'}
            </span>
          </div>
          <div className="order-finance-item">
            <span className="label">Due Date</span>
            <span className={`value ${isOverdue ? 'text-danger' : ''}`}>{formatDate(order.due_date)}</span>
          </div>
        </div>
        
        {!isFullyPaid && (
          <div className="order-payment-action">
            <button onClick={() => setShowPaymentModal(true)} className="cresoa-primary-button full-width mt-3">
              <Icon name="plus" size={16} /> Record Payment
            </button>
          </div>
        )}
      </div>

      {/* ─── CUSTOMER & TRACKING ─── */}
<div className="order-grid-2">
  <div className="order-card">
    <span className="order-label" style={{ display: 'block', marginBottom: '1rem' }}>CUSTOMER</span>
    
    <div className="customer-profile">
      <div className="customer-avatar-round">
        {customerName.charAt(0).toUpperCase()}
      </div>
      <div className="customer-info">
        <h3 className="customer-name">{customerName}</h3>
        {customer?.phone && <p className="customer-contact">{customer.phone}</p>}
        {customer?.email && <p className="customer-contact">{customer.email}</p>}
      </div>
    </div>

    <div className="order-card-actions-row" style={{ marginTop: '1.5rem' }}>
      {customer?.phone && (
        <a href={`tel:${customer.phone}`} className="order-btn-secondary full-width">
          <Icon name="phone" size={16} /> Call
        </a>
      )}
      {customer?.phone && (
        <button onClick={openWhatsAppModal} disabled={!canWhatsApp} className="order-btn-secondary full-width text-success">
          <Icon name="message-circle" size={16} /> WhatsApp
        </button>
      )}
    </div>
  </div>

  
        <div className="order-card tracking-card">
          <div className="order-card-header">
             <span className="order-label">TRACKING LINK</span>
          </div>
          <div className="tracking-input-group">
            <span className="tracking-link-text">{getTrackingLink()}</span>
            <button onClick={copyTrackingLink} className="btn-icon">
              <Icon name={copied ? 'check' : 'copy'} size={16} />
            </button>
          </div>
          <div className="order-card-actions-row">
             <button onClick={copyTrackingLink} className="order-btn-secondary full-width">
               {copied ? 'Copied!' : 'Copy Link'}
             </button>
             {customer?.phone && (
                <button onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Track your order here: ${getTrackingLink()}`)}`, '_blank')} className="order-btn-secondary full-width">
                  Share Link
                </button>
             )}
          </div>
        </div>
      </div>

      {/* ─── PRODUCTION DETAILS ─── */}
      <div className="order-card">
        <h3 className="order-section-title">Production Details</h3>
        <div className="order-detail-list">
          {[
            { label: 'Category', value: order.category || 'Fashion' },
            { label: 'Quantity', value: order.quantity || 1 },
            { label: 'Fabric', value: order.fabric || 'Not specified' },
            { label: 'Fitting Date', value: formatDate(order.fitting_date) },
            { label: 'Event Date', value: formatDate(order.event_date) }
          ].map((item, i) => (
            <div key={i} className="order-detail-row">
              <span className="label">{item.label}</span>
              <span className="value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── NOTES ─── */}
      <div className="order-card">
        <h3 className="order-section-title">Private Notes</h3>
        <p className="order-card-subtitle mb-2">These notes are visible only to you and your team.</p>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          className="order-notes-textarea"
          placeholder="Add fitting instructions, design details..."
        />
        <button onClick={saveNotes} disabled={savingNotes} className="cresoa-primary-button mt-2">
          {savingNotes ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* ─── PAYMENT HISTORY ─── */}
      <div className="order-card">
        <h3 className="order-section-title">Payment History</h3>
        {payments.length === 0 ? (
          <p className="order-empty-text">No payments recorded yet.</p>
        ) : (
          <div className="order-payment-list">
            {payments.map(p => (
              <div key={p.id} className="order-payment-row">
                <div>
                  <strong className="text-success">{formatMoney(p.amount)}</strong>
                  <span className="order-payment-note">{p.note || 'Payment'}</span>
                </div>
                <span className="order-payment-date">{formatDate(p.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="app-modal-overlay" onClick={() => !updatingStatus && setShowStatusModal(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ORDER PROGRESS</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Where is this order now?</h2>
              </div>
              <button onClick={() => setShowStatusModal(false)} disabled={updatingStatus} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.5rem 0 1rem', fontSize: '0.85rem' }}>Choose the stage that best describes where the order is right now.</p>
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {STATUS_FLOW.map((status, index) => {
                const selected = selectedStatus === status.value
                const current = (order.current_status || 'Order placed') === status.value
                return (
                  <button key={status.value} onClick={() => setSelectedStatus(status.value)} disabled={updatingStatus || current} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.6rem', borderRadius: '12px', border: `1px solid ${selected ? 'var(--color-primary)' : current ? 'var(--cresoa-border)' : 'var(--cresoa-border)'}`, background: selected ? 'rgba(11,44,94,0.05)' : current ? 'var(--cresoa-bg)' : 'var(--cresoa-surface)', cursor: current || updatingStatus ? 'default' : 'pointer', opacity: current ? 0.8 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'var(--cresoa-bg)' }}>
                      <Icon name="check-circle" size={18} stroke={selected ? 'var(--color-primary)' : current ? 'var(--color-secondary)' : 'var(--cresoa-text-muted)'} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{status.label}</strong>
                    </div>
                    {current && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(0,166,81,0.1)', color: 'var(--color-secondary)', fontSize: '0.65rem', fontWeight: 700 }}>Current</span>}
                    {selected && <Icon name="check-circle" size={18} stroke="var(--color-primary)" />}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => { setSelectedStatus(null); setShowStatusModal(false) }} disabled={updatingStatus} className="order-btn-secondary">Cancel</button>
              <button onClick={() => updateStatus(selectedStatus)} disabled={!selectedStatus || updatingStatus} className="cresoa-primary-button">
                {updatingStatus ? 'Updating...' : selectedStatus ? `Move to ${selectedStatusInfo?.short || selectedStatus}` : 'Choose a status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsWhatsAppModalOpen(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>WHATSAPP UPDATE</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem' }}>Update {customerName}</h2>
              </div>
              <button onClick={() => setIsWhatsAppModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            
            <div style={{ marginBottom: '0.8rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>Current Status:</span>
              <span style={{ marginLeft: '0.4rem', fontWeight: 600, color: 'var(--color-primary)' }}>{currentStatusInfo.label}</span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Message</label>
              {!isEditingMessage ? (
                <div style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--cresoa-text)', whiteSpace: 'pre-wrap' }}>
                  {whatsAppMessage}
                </div>
              ) : (
                <textarea 
                  value={whatsAppMessage} 
                  onChange={e => setWhatsAppMessage(e.target.value)} 
                  rows={4} 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              )}
              <button onClick={() => setIsEditingMessage(!isEditingMessage)} style={{ marginTop: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline' }}>
                {isEditingMessage ? 'Cancel edit' : '✎ Edit message'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setIsWhatsAppModalOpen(false)} className="order-btn-secondary">Cancel</button>
              <button onClick={handleSendWhatsApp} className="cresoa-primary-button">
                <Icon name="send" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="app-modal-overlay" onClick={() => !recordingPayment && setShowPaymentModal(false)}>
          <form className="app-modal-box" onSubmit={handleRecordPayment} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>PAYMENT</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Record a payment</h2>
              </div>
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={recordingPayment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderRadius: '8px', background: 'rgba(11,44,94,0.05)', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>Remaining balance</span>
              <strong>{formatMoney(balance)}</strong>
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Amount received</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-surface)', overflow: 'hidden' }}>
                <span style={{ paddingLeft: '0.8rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>₦</span>
                <input type="number" min="1" max={balance} step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0" required style={{ flex: 1, border: 'none', padding: '0.6rem', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)' }} />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Payment note</label>
              <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment, transfer" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={recordingPayment} className="order-btn-secondary">Cancel</button>
              <button type="submit" disabled={recordingPayment} className="cresoa-primary-button">
                {recordingPayment ? 'Recording...' : 'Save payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="app-modal-overlay" onClick={() => !editing && setShowEditModal(false)}>
          <form className="app-modal-box" onSubmit={handleEditSubmit} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ORDER DETAILS</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Edit order</h2>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} disabled={editing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Order name</label>
              <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="e.g. Aso-ebi dress" required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Total price</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-surface)', overflow: 'hidden' }}>
                <span style={{ paddingLeft: '0.8rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>₦</span>
                <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="0" required style={{ flex: 1, border: 'none', padding: '0.6rem', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)' }} />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Due date</label>
              <input type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowEditModal(false)} disabled={editing} className="order-btn-secondary">Cancel</button>
              <button type="submit" disabled={editing} className="cresoa-primary-button">
                {editing ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={currentBusinessId} />
      </div>
    </div>
  )
            }
