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
    'more-vertical': <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></>,
    'ruler': <><path d="M21.3 15.3l-12-12a2.4 2.4 0 0 0-3.4 0l-1.6 1.6a2.4 2.4 0 0 0 0 3.4l12 12a2.4 2.4 0 0 0 3.4 0l1.6-1.6a2.4 2.4 0 0 0 0-3.4z"/><path d="M14.5 6.5l4 4"/><path d="M10.5 10.5l4 4"/><path d="M6.5 14.5l4 4"/></>
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

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

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

      const { data: orderData, error: orderError } = await supabase.from('orders').select(`*, customers (id, name, first_name, last_name, phone, email, address, measurements)`).eq('id', orderId).eq('business_id', bizId).single()
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

  // Auto-save notes
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    const timer = setTimeout(async () => {
      setSavingNotes(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) await supabase.from('orders').update({ notes }).eq('id', orderId)
      } catch (err) { console.error('Failed to auto-save notes', err) } finally { setSavingNotes(false) }
    }, 1000)
    return () => clearTimeout(timer)
  }, [notes, orderId])

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
  const customerName = customer?.first_name || customer?.name || 'Client'

  // ─── ACTIONS ───

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setRecordingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/orders/${orderId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount, note: paymentNote || 'Payment received' })
      })
      if (!response.ok) throw new Error('Failed')
      await loadOrder()
      setPaymentAmount(''); setPaymentNote(''); setShowPaymentModal(false)
      showToast('Payment recorded successfully!')
    } catch (err) { showToast('Could not record payment.', 'error') } finally { setRecordingPayment(false) }
  }

  const updateStatus = async (status) => {
    if (!status || status === order.current_status) { setShowStatusModal(false); return }
    setUpdatingStatus(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('orders').update({ current_status: status }).eq('id', orderId)
      await loadOrder()
      setShowStatusModal(false); setSelectedStatus(null)
      showToast(`Status moved to ${status}`)
    } catch (err) { showToast('Could not update status.', 'error') } finally { setUpdatingStatus(false) }
  }

  const openWhatsAppModal = () => {
    const item = STATUS_FLOW.find(entry => entry.value === order.current_status)
    const msg = `Hi ${customerName}, ${item ? item.customerMessage : 'there is an update on your order.'}`
    setWhatsAppMessage(msg)
    setIsEditingMessage(false)
    setIsWhatsAppModalOpen(true)
  }

  const handleSendWhatsApp = () => {
    if (!customer?.phone) return showToast('No phone number saved for this client.', 'error')
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  const getTrackingLink = () => `${window.location.origin}/track/${order?.tracking_token}`
  
  const copyTrackingLink = async () => {
    await navigator.clipboard.writeText(getTrackingLink())
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    showToast('Tracking link copied!')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('orders').update({ title: editForm.title, price: parseFloat(editForm.price) || 0, due_date: editForm.due_date || null }).eq('id', orderId)
      await loadOrder()
      setShowEditModal(false)
      showToast('Order details updated')
    } catch (err) { showToast('Could not update order.', 'error') } finally { setEditing(false) }
  }

  const promptDuplicate = () => {
    setShowMenu(false)
    setModalConfig({
      isOpen: true, title: 'Reorder (Duplicate)?',
      message: 'This will create a new order with the exact same details. The new order will start at "Placed" and have ₦0 paid.',
      confirmText: 'Duplicate', isDestructive: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        try {
          const { data, error } = await supabase.from('orders').insert({ business_id: currentBusinessId, customer_id: order.customer_id, title: `${order.title} (Copy)`, price: order.price, amount_paid: 0, due_date: order.due_date, current_status: 'Order placed' }).select().single()
          if (error) throw error
          router.push(`/dashboard/orders/${data.id}?business_id=${currentBusinessId}`)
          showToast('Order duplicated successfully')
        } catch (err) { showToast('Could not duplicate order.', 'error') }
      }
    })
  }

  const promptDelete = () => {
    setShowMenu(false)
    setModalConfig({
      isOpen: true, title: 'Delete Order?',
      message: 'Are you sure you want to permanently delete this order? This action cannot be undone.',
      confirmText: 'Delete Order', isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        try {
          await supabase.from('orders').delete().eq('id', orderId)
          router.push(`/dashboard/orders?business_id=${currentBusinessId}`)
          showToast('Order deleted successfully')
        } catch (err) { showToast('Could not delete order.', 'error') }
      }
    })
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading order...</div>
  if (error || !order) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}><Icon name="alert-circle" size={30} stroke="var(--color-danger)" /><h2>Couldn't load order</h2><button onClick={loadOrder} style={{ marginTop: '10px', padding: '10px 20px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '8px' }}>Try again</button></div>

  const measurements = customer?.measurements || {}
  const hasMeasurements = Object.keys(measurements).length > 0

  return (
    <div style={{ background: '#F8F6F2', minHeight: '100vh', padding: '1rem', paddingBottom: '160px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Navigation businessId={currentBusinessId} />

      <button onClick={() => router.push(`/dashboard/orders?business_id=${currentBusinessId}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#0F2B4A', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', marginTop: '1rem' }}>
        <Icon name="arrow-left" size={16} /> Back to Orders
      </button>

      {/* HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Order</p>
        <h1 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0F2B4A', lineHeight: 1.2 }}>{order.title || 'Untitled order'}</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#666' }}>For {customerName}</p>
      </div>

      {/* PRIMARY HERO ACTIONS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push(`/dashboard/invoices/new?order_id=${orderId}`)} style={{ flex: 1, background: '#D4AF37', color: '#0F2B4A', padding: '14px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)', fontSize: '0.9rem' }}>
          <Icon name="file-text" size={18} /> Send Invoice
        </button>
        {order.current_status !== 'Delivered' && (
          <button onClick={() => setShowStatusModal(true)} style={{ flex: 1, background: '#0F2B4A', color: '#FFF', padding: '14px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 43, 74, 0.2)', fontSize: '0.9rem' }}>
            <Icon name="arrow-right-circle" size={18} /> Move Stage
          </button>
        )}
      </div>

      {/* PROGRESS STEPPER (Fixed for Mobile) */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Production Stage</h3>
          <button onClick={openWhatsAppModal} disabled={!canWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#E6F4EA', color: '#137333', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            <Icon name="message-circle" size={14} /> Tell Client
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          {/* The grey line behind */}
          <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', background: '#EAEAEA', zIndex: 1 }} />
          {/* The dark progress line */}
          <div style={{ position: 'absolute', top: '14px', left: '10%', width: `${(statusIndex / (STATUS_FLOW.length - 1)) * 80}%`, height: '2px', background: '#0F2B4A', zIndex: 1, transition: 'width 0.3s' }} />
          
   {STATUS_FLOW.map((status, index) => {
            const completed = index <= statusIndex
            const active = index === statusIndex
            return (
              <div key={status.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1, minWidth: 0 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: completed ? '#0F2B4A' : '#FFF', border: `2px solid ${completed ? '#0F2B4A' : '#EAEAEA'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: completed ? '#FFF' : '#999', marginBottom: '8px', flexShrink: 0 }}>
                  {completed ? <Icon name={active ? status.icon : 'check'} size={14} stroke="#FFF" /> : null}
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: active ? 800 : 600, color: active ? '#0F2B4A' : '#999', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{status.short}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* FINANCIAL SUMMARY (Fixed 2x2 Grid) */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A' }}>{formatMoney(order.price)}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Money Received</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#137333' }}>{formatMoney(order.amount_paid)}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Balance Due</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: balance > 0 ? '#FF3B30' : '#137333' }}>
              {balance > 0 ? formatMoney(balance) : 'Fully Paid ✓'}
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Date</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isOverdue ? '#FF3B30' : '#0F2B4A' }}>{formatDate(order.due_date)}</span>
          </div>
        </div>
        
        {!isFullyPaid && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #EAEAEA' }}>
            <button onClick={() => setShowPaymentModal(true)} style={{ width: '100%', background: '#0F2B4A', color: '#FFF', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="plus" size={16} /> Record Payment
            </button>
          </div>
        )}
      </div>

      {/* CLIENT & TRACKING */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0F2B4A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Client</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F2B4A' }}>{customerName}</p>
              {customer?.phone && <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{customer.phone}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             {customer?.phone && (
              <a href={`tel:${customer.phone}`} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F4F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F2B4A', textDecoration: 'none' }}>
                <Icon name="phone" size={16} />
              </a>
            )}
            {customer?.phone && (
              <button onClick={openWhatsAppModal} disabled={!canWhatsApp} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E6F4EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333', border: 'none', cursor: 'pointer' }}>
                <Icon name="message-circle" size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Client Tracking Link</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={copyTrackingLink} style={{ flex: 1, padding: '10px', background: '#F4F6F8', border: '1px solid #EAEAEA', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#0F2B4A', cursor: 'pointer' }}>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {customer?.phone && (
               <button onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Track your order here: ${getTrackingLink()}`)}`, '_blank')} style={{ flex: 1, padding: '10px', background: '#0F2B4A', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#FFF', cursor: 'pointer' }}>
                 Send Link on WhatsApp
               </button>
            )}
          </div>
        </div>
      </div>

      {/* CLIENT MEASUREMENTS */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Client Measurements</h3>
          <Icon name="ruler" size={18} stroke="#0F2B4A" />
        </div>
        
        {!hasMeasurements ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: '#FFF7E6', borderRadius: '8px', border: '1px dashed #D97706' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#D97706', fontWeight: 600 }}>No measurements saved for {customerName} yet.</p>
            <button onClick={() => router.push(`/dashboard/customers/${customer?.id}?business_id=${currentBusinessId}`)} style={{ background: '#D97706', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              + Add Measurements
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.entries(measurements).map(([key, value]) => (
              <div key={key} style={{ background: '#F8F9FA', padding: '10px', borderRadius: '8px', border: '1px solid #EAEAEA' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#666', textTransform: 'capitalize', fontWeight: 600 }}>{key}</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F2B4A' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ORDER DETAILS (Production) */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Order Details</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Style</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A' }}>{order.category || 'Not specified'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Quantity</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A' }}>{order.quantity || 1}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Fabric</span>
            {order.fabric ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A' }}>{order.fabric}</span>
            ) : (
              <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A', cursor: 'pointer', textDecoration: 'underline' }}>+ Add fabric</button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Fitting Date</span>
            {order.fitting_date ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A' }}>{formatDate(order.fitting_date)}</span>
            ) : (
              <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A', cursor: 'pointer', textDecoration: 'underline' }}>+ Set fitting date</button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Event Date</span>
            {order.event_date ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A' }}>{formatDate(order.event_date)}</span>
            ) : (
              <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0F2B4A', cursor: 'pointer', textDecoration: 'underline' }}>+ Set event date</button>
            )}
          </div>
        </div>
      </div>

      {/* STYLE NOTES */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Style Notes</h3>
          {savingNotes && <span style={{ fontSize: '0.7rem', color: '#999', fontStyle: 'italic' }}>Saving...</span>}
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#888' }}>Only you and your team can see this.</p>
        <textarea 
          value={notes} onChange={e => setNotes(e.target.value)} 
          placeholder="Cuff, buttons, lining, special requests..."
          style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #EAEAEA', background: '#F8F9FA', fontSize: '0.95rem', color: '#0F2B4A', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* PAYMENTS RECEIVED */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Payments Received</h3>
        {payments.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>No payments recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: '12px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem', color: '#137333' }}>{formatMoney(p.amount)}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{p.note || 'Payment received'}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{formatDate(p.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIONS MENU */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <div className="menu-container" ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F4F6F8', border: '1px solid #EAEAEA', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A', cursor: 'pointer' }}>
            <Icon name="more-vertical" size={16} /> Actions
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '200px', zIndex: 100, overflow: 'hidden' }}>
              <button onClick={() => { setShowMenu(false); setShowEditModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333' }}>
                <Icon name="edit-2" size={16} /> Edit Order
              </button>
              <button onClick={promptDuplicate} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333' }}>
                <Icon name="copy" size={16} /> Reorder (Duplicate)
              </button>
              <div style={{ height: '1px', background: '#EAEAEA', margin: '4px 0' }}></div>
              <button onClick={promptDelete} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#FF3B30', fontWeight: 600 }}>
                <Icon name="trash-2" size={16} /> Delete Order
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={currentBusinessId} />
      </div>

      {/* MODALS */}

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
              <button onClick={() => { setSelectedStatus(null); setShowStatusModal(false) }} disabled={updatingStatus} style={{ background: 'none', border: '1px solid #CCC', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => updateStatus(selectedStatus)} disabled={!selectedStatus || updatingStatus} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>
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
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem' }}>Tell {customerName} Progress</h2>
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
              <button onClick={() => setIsWhatsAppModalOpen(false)} style={{ background: 'none', border: '1px solid #CCC', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSendWhatsApp} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>
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
              <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment, transfer" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={recordingPayment} style={{ background: 'none', border: '1px solid #CCC', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={recordingPayment} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>
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
              <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="e.g. Aso-ebi dress" required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Total price</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-surface)', overflow: 'hidden' }}>
                <span style={{ paddingLeft: '0.8rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>₦</span>
                <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="0" required style={{ flex: 1, border: 'none', padding: '0.6rem', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)' }} />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Delivery Date</label>
              <input type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowEditModal(false)} disabled={editing} style={{ background: 'none', border: '1px solid #CCC', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={editing} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>
                {editing ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Modal (For Delete & Duplicate) */}
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

      {/* Toast */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastType === 'success' ? '✅ ' : '⚠️ '} {toastMessage}
        </div>
      )}
    </div>
  )
                        }
