'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function OrderDetailPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [order, setOrder] = useState(null)
  const [business, setBusiness] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Edit form
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Notes
  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMessage, setNotesMessage] = useState('')

  // Delete
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('id', params.id)
      .single()

    setOrder(orderData)
    if (orderData) {
      setTitle(orderData.title || '')
      setPrice(orderData.price?.toString() || '')
      setDueDate(orderData.due_date || '')
      setInternalNotes(orderData.internal_notes || '')

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', orderData.business_id)
        .single()
      setBusiness(businessData)

      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: false })
      setPayments(paymentData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    if (searchParams?.get('edit') === 'true') {
      setEditing(true)
    }
  }, [params.id])

  // Status helpers
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  const getOrderName = (order) => {
    if (order?.title) return order.title
    if (order?.item_name) return order.item_name
    if (order?.name) return order.name
    return 'Order'
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Actions
  const advanceStatus = async () => {
    const currentIndex = STAGES.indexOf(order.current_status)
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) return
    await supabase.from('orders').update({ current_status: STAGES[currentIndex + 1] }).eq('id', order.id)
    load()
  }

  const undoStatus = async () => {
    const currentIndex = STAGES.indexOf(order.current_status)
    if (currentIndex <= 0) return
    await supabase.from('orders').update({ current_status: STAGES[currentIndex - 1] }).eq('id', order.id)
    load()
  }

  const copyTrackingLink = () => {
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    navigator.clipboard.writeText(link)
    alert('Tracking link copied!')
  }

  const sendLinkViaWhatsApp = () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    const msg = `Hi ${order.customers?.name}! This is ${business?.name}. Here's your order tracking link — you can check your order status anytime: ${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendStatusUpdate = () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const status = getStatusInfo(order.current_status)
    const msg = `Hi ${order.customers?.name}, this is ${business?.name}. Your order "${order.title}" is now at the "${status.label}" stage. Thank you for your patience.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendReminder = async () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const bal = order.price - order.amount_paid
    const msg = `Hi ${order.customers?.name}, this is a reminder for your balance of ₦${bal.toLocaleString()} for "${order.title}". Thank you - ${business?.name}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('orders').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', order.id)
    load()
  }

  const duplicateOrder = () => {
    router.push(`/dashboard/orders/new?duplicate=${order.id}`)
  }

  // Edit handlers
  const handleSave = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    const { error } = await supabase
      .from('orders')
      .update({
        title: title.trim(),
        price: Number(price) || 0,
        due_date: dueDate || null,
      })
      .eq('id', order.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('✅ Saved!')
    setSaving(false)
    load()
  }

  const handleSaveNotes = async () => {
    setNotesMessage('')
    setSavingNotes(true)

    const { error } = await supabase
      .from('orders')
      .update({ internal_notes: internalNotes })
      .eq('id', order.id)

    if (error) {
      setNotesMessage('Error saving notes.')
    } else {
      setNotesMessage('✅ Notes saved!')
    }
    setSavingNotes(false)
  }

  // Payment handlers
  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = Number(paymentAmount)

    if (!amount || amount <= 0) {
      alert('Enter a valid payment amount.')
      return
    }

    const newTotal = order.amount_paid + amount
    if (newTotal > order.price) {
      alert(`This payment would bring the total paid above the order price (₦${order.price.toLocaleString()}).`)
      return
    }

    setRecordingPayment(true)

    await supabase.from('payment_records').insert({
      order_id: order.id,
      amount: amount,
      note: paymentNote || null,
    })

    await supabase
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', order.id)

    setPaymentAmount('')
    setPaymentNote('')
    setShowPaymentForm(false)
    setRecordingPayment(false)
    load()
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Do you want to delete "${order.title}"? This can't be undone.`)
    if (!confirmed) return

    setDeleting(true)
    await supabase.from('orders').delete().eq('id', order.id)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading order...</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#2B2620' }}>Order not found.</p>
        <button className="back-link" onClick={() => router.push('/dashboard')}>
          ← Back to dashboard
        </button>
      </main>
    )
  }

  const status = getStatusInfo(order.current_status)
  const balance = order.price - order.amount_paid
  const currentIndex = STAGES.indexOf(order.current_status)
  const isLastStage = currentIndex === STAGES.length - 1
  const isFirstStage = currentIndex === 0

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E8E0D5', fontSize: '1rem', boxSizing: 'border-box',
    background: '#fff', color: '#2B2620',
    transition: 'border-color 0.2s ease',
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: '500' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 1.2rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.4rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 60px;
        }
        .stat-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
        }
        .status-timeline {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          position: relative;
        }
        .status-timeline::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #E8E0D5;
          transform: translateY(-50%);
        }
        .status-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          position: relative;
          z-index: 1;
          flex: 1;
        }
        .status-dot .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #E8E0D5;
          background: #fff;
          transition: all 0.3s ease;
        }
        .status-dot .dot.active {
          width: 16px;
          height: 16px;
          border-color: #C79A2B;
          background: #C79A2B;
        }
        .status-dot .dot.done {
          border-color: #4C7A5E;
          background: #4C7A5E;
        }
        .status-dot .label {
          font-size: 0.55rem;
          color: #6B6255;
          text-align: center;
          max-width: 40px;
        }
        .status-dot .label.active {
          color: #1E3A5F;
          font-weight: 600;
        }
        .btn {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .btn:hover {
          background: #F5EFE2;
        }
        .btn-primary {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .btn-primary:hover {
          background: #0F1E30;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-gold {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .btn-gold:hover {
          background: #B4881E;
        }
        .btn-green {
          background: #4C7A5E;
          border-color: #4C7A5E;
          color: #fff;
        }
        .btn-green:hover {
          background: #3A5F4A;
        }
        .btn-red {
          background: #AE4A34;
          border-color: #AE4A34;
          color: #fff;
        }
        .btn-red:hover {
          background: #8A3626;
        }
        .btn-sm {
          padding: 0.2rem 0.5rem;
          font-size: 0.6rem;
        }
        .btn-block {
          width: 100%;
          justify-content: center;
        }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .header-row .name-section {
          flex: 1;
        }
        .header-row .name-section h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .header-row .name-section .customer {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0.1rem 0 0;
        }
        .header-actions {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .action-row {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.8rem;
        }
        .payment-row:last-child {
          border-bottom: none;
        }
        .order-status-badge {
          display: inline-block;
          padding: 0.2rem 0.7rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        @media (max-width: 420px) {
          .header-row {
            flex-direction: column;
          }
          .header-actions {
            width: 100%;
          }
          .header-actions .btn {
            flex: 1;
            justify-content: center;
          }
          .action-row .btn {
            flex: 1;
            justify-content: center;
          }
          .status-timeline {
            flex-wrap: wrap;
            gap: 0.2rem;
          }
          .status-dot .label {
            font-size: 0.5rem;
            max-width: 30px;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.back()}>
        ← Back
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <div className="name-section">
          <h1>
            {getOrderName(order)}
            <span className="order-status-badge" style={{ background: status.bg, color: status.color }}>
              {status.label}
            </span>
          </h1>
          <p className="customer">
            👤 {order.customers?.name || 'No customer'}
            {order.customers?.phone && ` · 📱 ${order.customers.phone}`}
          </p>
        </div>
        <div className="header-actions">
          {order.customers?.phone && (
            <>
              <a href={`tel:${order.customers.phone}`} className="btn btn-gold">📞 Call</a>
              <a
                href={`https://wa.me/${formatPhone(order.customers.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-green"
              >
                💬 WhatsApp
              </a>
            </>
          )}
          <button className="btn btn-primary" onClick={duplicateOrder}>📋 Duplicate</button>
          <button className="btn" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Close' : '✏️ Edit'}
          </button>
        </div>
      </div>
