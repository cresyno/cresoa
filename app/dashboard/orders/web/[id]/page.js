import { useClientSearchParams as useSearchParams } from '../../../../lib/useClientSearchParams';

export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}
'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { Navigation } from '../../../../../components/Navigation'
import '../../../../globals.css'

const STATUS_FLOW = [
  { value: 'Order placed', label: 'Order placed', short: 'Placed', icon: 'clipboard', customerMessage: 'Your online order has been received and is now in our production queue.' },
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
    'copy': <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    'send': <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'ruler': <><path d="M21.3 15.3l-12-12a2.4 2.4 0 0 0-3.4 0l-1.6 1.6a2.4 2.4 0 0 0 0 3.4l12 12a2.4 2.4 0 0 0 3.4 0l1.6-1.6a2.4 2.4 0 0 0 0-3.4z"/><path d="M14.5 6.5l4 4"/><path d="M10.5 10.5l4 4"/><path d="M6.5 14.5l4 4"/></>,
    'map-pin': <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>
}

export default function OnlineOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [matchedCustomer, setMatchedCustomer] = useState(null)
  
  // UI State
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState('')
  const [copiedAddress, setCopiedAddress] = useState(false)

  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const loadOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch the online order
      const { data: orderData, error: orderError } = await supabase
        .from('public_orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) throw new Error('Order not found')
      
      // Map the e-commerce status to production status if it hasn't been set yet
      if (!orderData.production_status) {
        orderData.production_status = 'Order placed'
      }
      setOrder(orderData)

      // 2. Try to find the matching client in the main CRM by phone or email
      if (orderData.customer_phone || orderData.customer_email) {
        let query = supabase.from('customers').select('*').eq('business_id', businessId)
        
        if (orderData.customer_phone) {
          query = query.eq('phone', orderData.customer_phone)
        } else if (orderData.customer_email) {
          query = query.eq('email', orderData.customer_email)
        }
        
        const { data: customerData } = await query.maybeSingle()
        if (customerData) setMatchedCustomer(customerData)
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (orderId) loadOrder() }, [orderId])

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
  const formatDate = (date) => new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

  // ─── ACTIONS ───

  const updateStatus = async (status) => {
    if (!status || status === order.production_status) { setShowStatusModal(false); return }
    setUpdatingStatus(true)
    try {
      // We update the 'production_status' column in the public_orders table
      const { error } = await supabase.from('public_orders').update({ production_status: status }).eq('id', orderId)
      if (error) throw error
      
      setOrder(prev => ({ ...prev, production_status: status }))
      setShowStatusModal(false)
      setSelectedStatus(null)
      showToast(`Status moved to ${status}`)
    } catch (err) {
      showToast('Could not update status.', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const openWhatsAppModal = () => {
    const item = STATUS_FLOW.find(entry => entry.value === order.production_status)
    const msg = `Hi ${order.customer_name}, ${item ? item.customerMessage : 'there is an update on your online order.'}`
    setWhatsAppMessage(msg)
    setIsEditingMessage(false)
    setIsWhatsAppModalOpen(true)
  }

  const handleSendWhatsApp = (customMessage) => {
    if (!order.customer_phone) return showToast('No phone number on this order.', 'error')
    let text = customMessage || whatsAppMessage
    window.open(`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  const copyAddress = () => {
    if (!order.customer_address) return
    navigator.clipboard.writeText(order.customer_address)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
    showToast('Address copied!')
  }

  const openMaps = () => {
    if (!order.customer_address) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`, '_blank')
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading online order...</div>
  if (error || !order) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}><Icon name="alert-circle" size={30} stroke="var(--color-danger)" /><h2>Couldn't load order</h2><button onClick={loadOrder} style={{ marginTop: '10px', padding: '10px 20px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '8px' }}>Try again</button></div>

  const isPaid = order.status === 'paid' || order.status === 'completed'
  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.value === order.production_status)
  const safeStatusIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0
  const selectedStatusInfo = STATUS_FLOW.find(item => item.value === selectedStatus) || null

  // Measurements logic
  const measurements = matchedCustomer?.measurements || {}
  const hasMeasurements = Object.keys(measurements).length > 0

  return (
    <div style={{ background: '#F8F6F2', minHeight: '100vh', padding: '1rem', paddingBottom: '160px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <Navigation businessId={businessId} />

      <button onClick={() => router.push(`/dashboard/orders?business_id=${businessId}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#0F2B4A', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', marginTop: '1rem' }}>
        <Icon name="arrow-left" size={16} /> Back to Orders
      </button>

      {/* HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ background: '#D4AF37', color: '#0F2B4A', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Online Order</span>
        </div>
        <h1 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0F2B4A', lineHeight: 1.2 }}>Order from {order.customer_name || 'Client'}</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>Ordered on {formatDate(order.created_at)}</p>
      </div>

      {/* PRIMARY HERO ACTIONS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push(`/dashboard/invoices/new?order_id=${orderId}&web=true`)} style={{ flex: 1, background: '#D4AF37', color: '#0F2B4A', padding: '14px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)', fontSize: '0.9rem' }}>
          <Icon name="file-text" size={18} /> Send Receipt
        </button>
        {order.production_status !== 'Delivered' && (
          <button onClick={() => setShowStatusModal(true)} style={{ flex: 1, background: '#0F2B4A', color: '#FFF', padding: '14px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 43, 74, 0.2)', fontSize: '0.9rem' }}>
            <Icon name="arrow-right-circle" size={18} /> Update Status
          </button>
        )}
      </div>

      {/* PROGRESS STEPPER */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Production Stage</h3>
          <button onClick={openWhatsAppModal} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#E6F4EA', color: '#137333', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            <Icon name="message-circle" size={14} /> Tell Client Progress
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', background: '#EAEAEA', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: '14px', left: '10%', width: `${(safeStatusIndex / (STATUS_FLOW.length - 1)) * 80}%`, height: '2px', background: '#0F2B4A', zIndex: 1, transition: 'width 0.3s' }} />
          
          {STATUS_FLOW.map((status, index) => {
            const completed = index <= safeStatusIndex
            const active = index === safeStatusIndex
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

      {/* PAYMENT STATUS BANNER */}
      <div style={{ background: isPaid ? '#E6F4EA' : '#FEF3C7', padding: '1.25rem', borderRadius: '16px', border: `1px solid ${isPaid ? '#A7F3D0' : '#FDE68A'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: isPaid ? '#065F46' : '#92400E', textTransform: 'uppercase' }}>Payment Status</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: isPaid ? '#137333' : '#B45309' }}>
            {isPaid ? 'Paid ✓' : 'Pending Payment'}
          </p>
          {isPaid && <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#137333' }}>{formatMoney(order.total_amount)} received via Paystack</p>}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F2B4A' }}>
          {formatMoney(order.total_amount)}
        </div>
      </div>

      {/* CLIENT INFO */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0F2B4A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
            {order.customer_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Client</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F2B4A' }}>{order.customer_name}</p>
            {order.customer_phone && <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{order.customer_phone}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F4F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F2B4A', textDecoration: 'none' }}>
              <Icon name="phone" size={16} />
            </a>
          )}
          {order.customer_phone && (
            <button onClick={() => handleSendWhatsApp(`Hello ${order.customer_name}, I have received your online order and I am ready to start working on it!`)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E6F4EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333', border: 'none', cursor: 'pointer' }}>
              <Icon name="message-circle" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* CLIENT MEASUREMENTS */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Client Measurements</h3>
          <Icon name="ruler" size={18} stroke="#0F2B4A" />
        </div>
        
        {!matchedCustomer ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: '#FFF7E6', borderRadius: '8px', border: '1px dashed #D97706' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#D97706', fontWeight: 600 }}>This buyer is not in your Client Book.</p>
            <button onClick={() => handleSendWhatsApp(`Hello ${order.customer_name}, thank you for your order! To ensure a perfect fit, could you please send your measurements (Bust, Waist, Hips, Length)? Thank you!`)} style={{ background: '#D97706', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              Request on WhatsApp
            </button>
          </div>
        ) : !hasMeasurements ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: '#FFF7E6', borderRadius: '8px', border: '1px dashed #D97706' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#D97706', fontWeight: 600 }}>No measurements saved for {order.customer_name} yet.</p>
            <button onClick={() => router.push(`/dashboard/customers/${matchedCustomer.id}?business_id=${businessId}`)} style={{ background: '#D97706', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
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

      {/* ITEMS ORDERED (Style Ordered) */}
      <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Style Ordered</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {order.items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: idx !== order.items.length - 1 ? '1px solid #F0F0F0' : 'none', paddingBottom: idx !== order.items.length - 1 ? '1rem' : '0' }}>
              <div style={{ width: '60px', height: '60px', background: '#F9F9F9', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #EAEAEA' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#CCC', textAlign: 'center', padding: '4px' }}>No Image</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.2rem 0', fontWeight: 800, color: '#0F2B4A', fontSize: '0.95rem' }}>{item.name}</p>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>1 piece</p>
              </div>
              <div style={{ fontWeight: 800, color: '#0F2B4A', fontSize: '0.95rem' }}>
                {formatMoney(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #0F2B4A' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F2B4A' }}>Total Paid</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#D4AF37' }}>{formatMoney(order.total_amount)}</span>
        </div>
      </div>

      {/* DELIVERY ADDRESS */}
      {order.customer_address && (
        <div style={{ background: '#FFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #EAEAEA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Deliver To</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#0F2B4A', lineHeight: 1.6, fontWeight: 500 }}>
            {order.customer_address}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={copyAddress} style={{ flex: 1, padding: '10px', background: '#F4F6F8', border: '1px solid #EAEAEA', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#0F2B4A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="copy" size={14} /> {copiedAddress ? 'Copied!' : 'Copy Address'}
            </button>
            <button onClick={openMaps} style={{ flex: 1, padding: '10px', background: '#0F2B4A', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="map-pin" size={14} /> Open in Maps
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
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
                const current = order.production_status === status.value
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
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem' }}>Update {order.customer_name}</h2>
              </div>
              <button onClick={() => setIsWhatsAppModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            
            <div style={{ marginBottom: '0.8rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>Current Status:</span>
              <span style={{ marginLeft: '0.4rem', fontWeight: 600, color: 'var(--color-primary)' }}>{order.production_status}</span>
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
              <button onClick={() => handleSendWhatsApp()} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>
                <Icon name="send" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`} style={{ position: 'fixed', bottom: '160px', left: '50%', transform: 'translateX(-50%)', background: toastType === 'success' ? '#137333' : '#FF3B30', color: '#FFF', padding: '12px 24px', borderRadius: '30px', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
                                              }
