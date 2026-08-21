'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../../lib/planLimits'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { Navigation } from '../../../../components/Navigation'
import InvoicePreviewModal from '../../../../components/invoice/InvoicePreviewModal'
import '../../../globals.css'

const STATUS_FLOW = [
  {
    value: 'Order placed',
    label: 'Order placed',
    short: 'Placed',
    description: 'The customer has placed this order and production has not started yet.',
    customerMessage: 'Your order has been received and is now in our production queue.'
  },
  {
    value: 'Cutting',
    label: 'Cutting',
    short: 'Cutting',
    description: 'Fabric is being prepared and cut according to the order.',
    customerMessage: 'Good news! Your outfit is now in the cutting stage. We are carefully preparing the fabric for production.'
  },
  {
    value: 'Sewing',
    label: 'Sewing',
    short: 'Sewing',
    description: 'Your tailor is currently sewing and assembling the outfit.',
    customerMessage: 'Your outfit is currently being sewn and assembled. We are making sure the details come together properly.'
  },
  {
    value: 'Ready',
    label: 'Ready for pickup',
    short: 'Ready',
    description: 'The outfit is finished and ready for the customer.',
    customerMessage: 'Your outfit is ready! You can now arrange pickup or delivery with us.'
  },
  {
    value: 'Delivered',
    label: 'Delivered',
    short: 'Delivered',
    description: 'The customer has received the finished order.',
    customerMessage: 'Your order has been marked as delivered. Thank you for choosing us!'
  }
]

// ─── SVG Icons (Self-contained) ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const paths = {
    'arrow-left': <path d="M19 12H5M5 12l7-7m-7 7l7 7" />,
    'edit-2': <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'check': <polyline points="20 6 9 17 4 12" />,
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
    'package': <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name]}
    </svg>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null) // for invoice
  const [payments, setPayments] = useState([])
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [userRole, setUserRole] = useState(null)

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

  // ─── New Invoice & WhatsApp States ───
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState('')

  const loadOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }
      setCurrentBusinessId(bizId)

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`*, customers ( id, name, first_name, last_name, phone, email, address )`)
        .eq('id', orderId)
        .eq('business_id', bizId)
        .single()
      if (orderError) throw orderError

      setOrder(orderData)
      setCustomer(orderData.customers)
      setNotes(orderData.notes || '')
      setEditForm({
        title: orderData.title || '',
        price: orderData.price || '',
        due_date: orderData.due_date || ''
      })

      // ─── Fetch full business for invoice ───
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', bizId)
        .single()
      if (!bizError) setBusiness(bizData)

      const { data: bizPlanData } = await supabase
        .from('businesses')
        .select('plan')
        .eq('id', bizId)
        .single()
      if (bizPlanData) setBusinessPlan(bizPlanData.plan || 'free')

      const { data: roleData } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', bizId)
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (roleData) setUserRole(roleData.role)

      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
      if (paymentError) throw paymentError
      setPayments(paymentData || [])
    } catch (err) {
      console.error('Error loading order:', err)
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
  const canTracking = isFeatureAvailable(businessPlan, 'tracking_links')
  const canWhatsApp = isFeatureAvailable(businessPlan, 'whatsapp_reminders')

  const saveNotes = async () => { /* ... existing ... */ setSavingNotes(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; const { error: updateError } = await supabase.from('orders').update({ notes }).eq('id', orderId); if (updateError) throw updateError; await supabase.from('business_activity_logs').insert({ business_id: currentBusinessId, performed_by: session.user.id, action: 'order_notes_updated', details: { order_id: orderId } }); } catch (err) { console.error('Error saving notes:', err); alert('Could not save the note.'); } finally { setSavingNotes(false); } }

  const handleRecordPayment = async (event) => { /* ... existing ... */ event.preventDefault(); const amount = parseFloat(paymentAmount); if (!amount || amount <= 0) { alert('Enter a valid payment amount.'); return; } if (amount > balance) { alert(`The remaining balance is ₦${balance.toLocaleString()}.`); return; } setRecordingPayment(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { router.push('/login'); return; } const response = await fetch(`/api/orders/${orderId}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ amount, note: paymentNote || 'Payment recorded' }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Failed'); await loadOrder(); setPaymentAmount(''); setPaymentNote(''); setShowPaymentModal(false); } catch (err) { alert(err.message || 'Could not record payment.'); } finally { setRecordingPayment(false); } }

  const updateStatus = async (status) => { /* ... existing ... */ if (!status || status === order.current_status) { setShowStatusModal(false); return; } setUpdatingStatus(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { router.push('/login'); return; } const { error: updateError } = await supabase.from('orders').update({ current_status: status }).eq('id', orderId); if (updateError) throw updateError; await supabase.from('business_activity_logs').insert({ business_id: currentBusinessId, performed_by: session.user.id, action: 'order_status_updated', details: { order_id: orderId, previous_status: order.current_status, new_status: status } }); await loadOrder(); setShowStatusModal(false); setSelectedStatus(null); } catch (err) { alert('Could not update status.'); } finally { setUpdatingStatus(false); } }

  const getCustomerStatusMessage = (status) => {
    const item = STATUS_FLOW.find(entry => entry.value === status)
    const name = customer?.first_name || customer?.name || 'Customer'
    if (!item) return `Hi ${name}, there is an update on your order "${order?.title || 'order'}".`
    return `Hi ${name}, ${item.customerMessage} Your order is currently marked as "${item.label}".`
  }

  // ─── WhatsApp Modal Logic ───
  const openWhatsAppModal = () => {
    const msg = getCustomerStatusMessage(order.current_status)
    setWhatsAppMessage(msg)
    setIsEditingMessage(false)
    setIsWhatsAppModalOpen(true)
  }

  const handleSendWhatsApp = () => {
    if (!customer?.phone) {
      alert('This customer does not have a phone number.')
      return
    }
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`
    window.open(url, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  const getTrackingLink = () => {
    if (typeof window === 'undefined' || !order?.tracking_token) return ''
    return `${window.location.origin}/track/${order.tracking_token}`
  }

  const copyTrackingLink = async () => {
    try { await navigator.clipboard.writeText(getTrackingLink()); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch (err) { alert('Could not copy link.') }
  }

  const sendTrackingLink = () => {
    if (!customer?.phone) { alert('No phone number.'); return }
    const message = `Hi ${customer?.first_name || customer?.name || 'Customer'}, you can follow the progress of your order "${order?.title || 'order'}" using this tracking link:\n\n${getTrackingLink()}`
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const handleEditSubmit = async (event) => { /* ... existing ... */ event.preventDefault(); setEditing(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; const { error: updateError } = await supabase.from('orders').update({ title: editForm.title, price: parseFloat(editForm.price) || 0, due_date: editForm.due_date || null }).eq('id', orderId); if (updateError) throw updateError; await supabase.from('business_activity_logs').insert({ business_id: currentBusinessId, performed_by: session.user.id, action: 'order_updated', details: { order_id: orderId } }); await loadOrder(); setShowEditModal(false); } catch (err) { alert('Could not update order.'); } finally { setEditing(false); } }

  const handleDuplicate = async () => { /* ... existing ... */ if (!confirm('Create a new order using this order as a starting point?')) return; try { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; const { data, error } = await supabase.from('orders').insert({ business_id: currentBusinessId, customer_id: order.customer_id, title: `${order.title} (Copy)`, price: order.price, amount_paid: 0, due_date: order.due_date, current_status: 'Order placed', notes: order.notes || null }).select().single(); if (error) throw error; await supabase.from('business_activity_logs').insert({ business_id: currentBusinessId, performed_by: session.user.id, action: 'order_duplicated', details: { original_id: orderId, new_id: data.id } }); router.push(`/dashboard/orders/${data.id}?business_id=${currentBusinessId}`); } catch (err) { alert('Could not duplicate.'); } }

  const currentStatusInfo = STATUS_FLOW.find(item => item.value === (order?.current_status || 'Order placed')) || STATUS_FLOW[0]
  const selectedStatusInfo = STATUS_FLOW.find(item => item.value === selectedStatus) || null
  const isOverdue = order?.due_date && new Date(order.due_date) < new Date() && order?.current_status !== 'Delivered'

  const formatMoney = value => `₦${Number(value || 0).toLocaleString('en-NG')}`
  const formatDate = value => !value ? 'Not set' : new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const customerName = customer?.first_name || customer?.name || 'Customer'

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="cresoa-loading-spinner" /></div>
  if (error || !order) return <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}><Svg name="alert-circle" size={30} stroke="var(--cresoa-danger)" /><h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)' }}>Couldn't load order</h2><p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)' }}>{error || 'Order not found'}</p><button onClick={loadOrder} className="cresoa-primary-button">Try again</button></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={currentBusinessId} />

      {/* ─── Back & Header ─── */}
      <button onClick={() => router.push(`/dashboard/orders?business_id=${currentBusinessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        <Svg name="arrow-left" size={16} stroke="currentColor" /> Orders
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>ORDER DETAILS</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cresoa-text)' }}>{order.title || 'Untitled order'}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0' }}>#{orderId.slice(0, 8)} · {customerName}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsInvoiceOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'rgba(212,165,42,0.08)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cresoa-accent)' }}>
            <Svg name="file-text" size={14} stroke="currentColor" /> Invoice
          </button>
          <button onClick={() => setShowEditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <Svg name="edit-2" size={14} stroke="currentColor" /> Edit
          </button>
        </div>
      </div>

      {/* ─── Progress Stepper ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', margin: '20px 0 16px' }}>
        {STATUS_FLOW.map((status, index) => {
          const completed = index <= statusIndex
          const active = index === statusIndex
          return (
            <div key={status.value} style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', zIndex: 2, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `2px solid ${completed ? 'var(--cresoa-success)' : 'var(--cresoa-border)'}`, background: completed ? 'var(--cresoa-success)' : 'var(--cresoa-surface)', color: completed ? '#fff' : 'var(--cresoa-text-muted)', boxShadow: active ? '0 0 0 4px rgba(212,165,42,0.15)' : 'none' }}>
                {completed && <Svg name={active ? 'check' : 'check'} size={13} stroke="#fff" />}
              </div>
              <span style={{ position: 'absolute', top: '34px', left: 0, fontSize: '8px', fontWeight: 700, color: active ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)', whiteSpace: 'nowrap' }}>{status.short}</span>
              {index < STATUS_FLOW.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: index < statusIndex ? 'var(--cresoa-success)' : 'var(--cresoa-border)', margin: '0 4px' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ─── STATUS ACTION ROW (Core Features) ─── */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button" style={{ flex: 1, minWidth: '120px', justifyContent: 'center', padding: '0.6rem 1rem' }}>
          <Svg name="arrow-right-circle" size={16} stroke="#fff" style={{ marginRight: '0.4rem' }} /> Update Order
        </button>
        <button onClick={openWhatsAppModal} disabled={!canWhatsApp} style={{ flex: 1, minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600, opacity: canWhatsApp ? 1 : 0.5 }}>
          <Svg name="message-circle" size={16} stroke="var(--cresoa-accent)" /> Update {customerName} on WhatsApp
        </button>
      </div>

      {/* ─── Money Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMoney(order.price)}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Paid</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>{formatMoney(order.amount_paid)}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {balance > 0 ? formatMoney(balance) : '✓ Paid'}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: isOverdue ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Due date</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatDate(order.due_date)}</div>
          {isOverdue && <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-danger)', fontWeight: 700 }}>Overdue</div>}
        </Card>
      </div>

      {/* ─── Next Action Card ─── */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212,165,42,0.1)', flexShrink: 0 }}>
          <Svg name={isFullyPaid ? 'check-circle' : 'credit-card'} size={22} stroke={isFullyPaid ? 'var(--cresoa-success)' : 'var(--cresoa-accent)'} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {isFullyPaid ? 'PAYMENT COMPLETE' : 'PAYMENT'}
          </span>
          <h3 style={{ margin: '0.2rem 0', fontSize: '1rem' }}>
            {isFullyPaid ? 'This order is fully paid' : `₦${balance.toLocaleString()} still outstanding`}
          </h3>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', margin: 0 }}>
            {isFullyPaid ? 'No further payment is required for this order.' : 'Record a payment whenever the customer makes another payment.'}
          </p>
        </div>
        {!isFullyPaid && (
          <button onClick={() => setShowPaymentModal(true)} className="cresoa-primary-button">
            <Svg name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Record payment
          </button>
        )}
      </Card>

      {/* ─── Customer & Tracking (Side by Side on Desktop) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
        {/* Customer Card */}
        <Card style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="cresoa-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {customerName.charAt(0).toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CUSTOMER</span>
              <h3 style={{ margin: '0.1rem 0', fontSize: '1rem' }}>{customerName}</h3>
              {customer?.phone && <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', margin: 0 }}>{customer.phone}</p>}
              {customer?.email && <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', margin: 0 }}>{customer.email}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
            {customer?.phone && (
              <a href={`tel:${customer.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', textDecoration: 'none', color: 'var(--cresoa-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                <Svg name="phone" size={14} stroke="currentColor" /> Call
              </a>
            )}
            {customer?.phone && (
              <button onClick={openWhatsAppModal} disabled={!canWhatsApp} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cresoa-text)', opacity: canWhatsApp ? 1 : 0.5 }}>
                <Svg name="message-circle" size={14} stroke="currentColor" /> WhatsApp
              </button>
            )}
          </div>
        </Card>

        {/* Tracking Card (Selling Point) */}
        <Card style={{ padding: '1rem', borderColor: 'var(--cresoa-accent)', borderWidth: '1px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,165,42,0.1)' }}>
              <Svg name="link" size={20} stroke="var(--cresoa-accent)" />
            </div>
            <div>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>TRACKING LINK</span>
              <h3 style={{ margin: '0.1rem 0', fontSize: '1rem' }}>Share with customer</h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)' }}>
            <Svg name="link" size={16} stroke="var(--cresoa-text-muted)" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{getTrackingLink()}</span>
            <button onClick={copyTrackingLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
              <Svg name={copied ? 'check' : 'copy'} size={16} stroke="currentColor" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
            <button onClick={copyTrackingLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              <Svg name={copied ? 'check' : 'copy'} size={14} stroke="currentColor" /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            {customer?.phone && (
              <button onClick={sendTrackingLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <Svg name="send" size={14} stroke="currentColor" /> Share with customer
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Order Details Grid ─── */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeader title="Production details" subtitle="Order information" />
        <div style={{ marginTop: '0.8rem' }}>
          {[
            { label: 'Order title', value: order.title || 'Not specified' },
            { label: 'Category', value: order.category || 'Fashion' },
            { label: 'Quantity', value: order.quantity || 1 },
            { label: 'Fabric', value: order.fabric || 'Not specified' },
            { label: 'Fitting date', value: formatDate(order.fitting_date) },
            { label: 'Event date', value: formatDate(order.event_date) },
            { label: 'Delivery date', value: formatDate(order.delivery_date) }
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: i < 6 ? '1px solid var(--cresoa-border)' : 'none' }}>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{item.label}</span>
              <strong style={{ fontSize: '0.85rem' }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </Card>

              {/* ─── Notes Card ─── */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeader title="Private Notes" subtitle="Notes for you and your team" />
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>These notes are private. The customer will not see them.</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add fitting instructions, design details, fabric notes, or anything your team needs to remember..." rows={5} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>Private to your business</span>
          <button onClick={saveNotes} disabled={savingNotes} className="cresoa-primary-button" style={{ padding: '0.3rem 1rem' }}>
            {savingNotes ? 'Saving...' : 'Save notes'}
          </button>
        </div>
      </Card>

      {/* ─── Payments Card ─── */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <SectionHeader title="Payments" subtitle="Payment history" />
          <button onClick={() => setShowPaymentModal(true)} disabled={isFullyPaid} className="cresoa-primary-button" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
            <Svg name="plus" size={12} stroke="#fff" style={{ marginRight: '0.2rem' }} /> Add payment
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Total paid</span>
          <span style={{ fontWeight: 600 }}>{formatMoney(order.amount_paid)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Remaining</span>
          <span style={{ fontWeight: 600, color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {balance > 0 ? formatMoney(balance) : '✓ Paid'}
          </span>
        </div>
        {payments.length === 0 ? (
          <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--cresoa-text-muted)', background: 'var(--cresoa-bg)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No payments recorded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {payments.map(payment => (
              <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--cresoa-bg)', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{formatMoney(payment.amount)}</span>
                  <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{payment.note || 'Payment'}</span>
                </div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>{formatDate(payment.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ─── Duplicate & Delete ─── */}
      <Card style={{ padding: '0.8rem 1rem', marginBottom: '1rem' }}>
        <button onClick={handleDuplicate} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '0.6rem 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <Svg name="copy" size={18} stroke="var(--cresoa-text-muted)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Duplicate order</div>
            <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>Create another order using these details</div>
          </div>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '0.6rem 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--cresoa-danger)' }}>
          <Svg name="trash-2" size={18} stroke="var(--cresoa-danger)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Delete order</div>
            <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>Permanently remove this order</div>
          </div>
        </button>
      </Card>

      {/* ─── Modals ─── */}

      {/* Status Modal (same as existing) */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => !updatingStatus && setShowStatusModal(false)}>
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ORDER PROGRESS</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Where is this order now?</h2>
              </div>
              <button onClick={() => setShowStatusModal(false)} disabled={updatingStatus} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.5rem 0 1rem', fontSize: '0.85rem' }}>Choose the stage that best describes where the order is right now.</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {STATUS_FLOW.map((status, index) => {
                const selected = selectedStatus === status.value
                const current = (order.current_status || 'Order placed') === status.value
                const passed = index < statusIndex
                return (
                  <button key={status.value} onClick={() => setSelectedStatus(status.value)} disabled={updatingStatus || current} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.6rem', borderRadius: '12px', border: `1px solid ${selected ? 'var(--cresoa-accent)' : current ? 'var(--cresoa-border)' : 'var(--cresoa-border)'}`, background: selected ? 'rgba(212,165,42,0.08)' : current ? 'var(--cresoa-bg)' : 'var(--cresoa-surface)', cursor: current || updatingStatus ? 'default' : 'pointer', opacity: current ? 0.8 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'var(--cresoa-bg)' }}>
                      <Svg name="check-circle" size={18} stroke={selected ? 'var(--cresoa-accent)' : current ? 'var(--cresoa-success)' : 'var(--cresoa-text-muted)'} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{status.label}</strong>
                      <span style={{ display: 'block', color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>{status.description}</span>
                    </div>
                    {current && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(46,125,94,0.1)', color: 'var(--cresoa-success)', fontSize: '0.65rem', fontWeight: 700 }}>Current</span>}
                    {selected && <Svg name="check-circle" size={18} stroke="var(--cresoa-accent)" />}
                  </button>
                )
              })}
            </div>
            {selectedStatusInfo && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '0.8rem', padding: '0.8rem', borderRadius: '12px', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(212,165,42,0.1)', flexShrink: 0 }}>
                  <Svg name="message-circle" size={16} stroke="var(--cresoa-accent)" />
                </div>
                <div>
                  <strong style={{ fontSize: '0.8rem' }}>Customer message</strong>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>Hi {customerName}, {selectedStatusInfo.customerMessage}</p>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => { setSelectedStatus(null); setShowStatusModal(false) }} disabled={updatingStatus} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={() => updateStatus(selectedStatus)} disabled={!selectedStatus || updatingStatus} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                {updatingStatus ? 'Updating...' : selectedStatus ? `Move to ${selectedStatusInfo?.short || selectedStatus}` : 'Choose a status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW: WhatsApp Message Modal ─── */}
      {isWhatsAppModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.6)' }} onMouseDown={() => setIsWhatsAppModalOpen(false)}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>WHATSAPP UPDATE</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem' }}>Update {customerName}</h2>
              </div>
              <button onClick={() => setIsWhatsAppModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            
            <div style={{ marginBottom: '0.8rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>Current Status:</span>
              <span style={{ marginLeft: '0.4rem', fontWeight: 600, color: 'var(--cresoa-accent)' }}>{currentStatusInfo.label}</span>
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
              <button onClick={() => setIsEditingMessage(!isEditingMessage)} style={{ marginTop: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline' }}>
                {isEditingMessage ? 'Cancel edit' : '✎ Edit message'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setIsWhatsAppModalOpen(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleSendWhatsApp} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                <Svg name="send" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

{/* Payment Modal (existing logic) */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => !recordingPayment && setShowPaymentModal(false)}>
          <form style={{ width: '100%', maxWidth: '480px', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onSubmit={handleRecordPayment} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>PAYMENT</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Record a payment</h2>
              </div>
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={recordingPayment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderRadius: '8px', background: 'rgba(212,165,42,0.08)', marginBottom: '1rem' }}>
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
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={recordingPayment} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button type="submit" disabled={recordingPayment} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                {recordingPayment ? 'Recording...' : 'Save payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal (existing logic) */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => !editing && setShowEditModal(false)}>
          <form style={{ width: '100%', maxWidth: '480px', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onSubmit={handleEditSubmit} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ORDER DETAILS</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Edit order</h2>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} disabled={editing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 1rem', fontSize: '0.85rem' }}>Update the basic information for this order. Production status and payments are managed separately.</p>
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
              <button type="button" onClick={() => setShowEditModal(false)} disabled={editing} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button type="submit" disabled={editing} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                {editing ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── INVOICE MODAL ─── */}
      {isInvoiceOpen && business && (
        <InvoicePreviewModal 
          order={order} 
          business={business} 
          onClose={() => setIsInvoiceOpen(false)} 
        />
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={currentBusinessId} />
      </div>
    </div>
  )
                }
