'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { isFeatureAvailable } from '../../../../lib/planLimits'
import { showToast } from '../../../../lib/toast'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function OrderDetailPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [order, setOrder] = useState(null)
  const [business, setBusiness] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [plan, setPlan] = useState('free')

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMessage, setNotesMessage] = useState('')

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
        .select('name, plan')
        .eq('id', orderData.business_id)
        .single()

      setBusiness(businessData)
      setPlan(businessData?.plan || 'free')

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

  const getOrderName = (order) => order?.title || 'Order'

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
    showToast('Tracking link copied!', '#1E3A5F')
  }

  const sendLinkViaWhatsApp = () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    const msg = `Hi ${order.customers?.name}! This is ${business?.name}. Here's your order tracking link: ${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendStatusUpdate = () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const status = getStatusInfo(order.current_status)
    const msg = `Hi ${order.customers?.name}, this is ${business?.name}. Your order "${order.title}" is now at the "${status.label}" stage.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendReminder = async () => {
    const phone = formatPhone(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const bal = order.price - order.amount_paid
    const msg = `Hi ${order.customers?.name}, this is a reminder for your balance of ₦${bal.toLocaleString()} for "${order.title}". Thank you.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('orders').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', order.id)
    load()
  }

  const duplicateOrder = () => {
    router.push(`/dashboard/orders/new?duplicate=${order.id}`)
  }

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

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = Number(paymentAmount)

    if (!amount || amount <= 0) {
      alert('Enter a valid payment amount.')
      return
    }

    const newTotal = order.amount_paid + amount
    if (newTotal > order.price) {
      alert(`This payment would exceed the order price (₦${order.price.toLocaleString()}).`)
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
    const confirmed = window.confirm(`Delete "${order.title}"? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    await supabase.from('orders').delete().eq('id', order.id)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
        <p style={{ color: '#6B6255', marginTop: '1rem' }}>Loading order...</p>
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

  const renderLockableAction = (label, benefit, onClick, isAvailable) => {
    const isLocked = !isAvailable

    return (
      <button
        onClick={isLocked ? () => router.push('/dashboard/subscription') : onClick}
        style={{
          flex: 1,
          minWidth: '140px',
          padding: '0.8rem 1rem',
          borderRadius: '10px',
          border: isLocked ? '1px solid #E8E0D5' : '1px solid #C79A2B',
          background: isLocked ? '#F8F6F2' : '#FBF8F0',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
          boxShadow: isLocked ? 'none' : '0 2px 8px rgba(199,154,43,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{isLocked ? '🔒' : '✓'}</span>
          <span style={{ fontWeight: '600', color: isLocked ? '#6B6255' : '#1E3A5F', fontSize: '0.9rem' }}>
            {isLocked ? `${label} (Upgrade)` : label}
          </span>
        </div>
        <p style={{
          margin: '0.2rem 0 0 1.8rem',
          fontSize: '0.75rem',
          color: isLocked ? '#A89888' : '#6B6255',
          lineHeight: '1.4',
        }}>
          {isLocked ? `🔒 ${benefit}` : benefit}
        </p>
      </button>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .card {
          background: #fff;
          border-radius: 14px;
          padding: 1.2rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(30,58,95,0.04);
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
        .btn:hover { background: #F5EFE2; }
        .btn-primary {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .btn-primary:hover { background: #0F1E30; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-gold {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .btn-gold:hover { background: #B4881E; }
        .btn-green {
          background: #4C7A5E;
          border-color: #4C7A5E;
          color: #fff;
        }
        .btn-green:hover { background: #3A5F4A; }
        .btn-red {
          background: #AE4A34;
          border-color: #AE4A34;
          color: #fff;
        }
        .btn-red:hover { background: #8A3626; }
        .btn-sm { padding: 0.2rem 0.5rem; font-size: 0.6rem; }
        .btn-block { width: 100%; justify-content: center; }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
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
          gap: 0.5rem;
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
        .payment-row:last-child { border-bottom: none; }
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
          .header-row { flex-direction: column; }
          .header-actions { width: 100%; }
          .header-actions .btn { flex: 1; justify-content: center; }
          .action-row .btn { flex: 1; justify-content: center; }
          .status-timeline { flex-wrap: wrap; gap: 0.2rem; }
          .status-dot .label { font-size: 0.5rem; max-width: 30px; }
          .action-row { flex-direction: column; }
          .action-row button { width: 100%; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.back()}>
        ← Back
      </button>

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

      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">₦{order.price.toLocaleString()}</p>
          <p className="label">Total</p>
        </div>
        <div className="stat-card">
          <p className="value green">₦{order.amount_paid.toLocaleString()}</p>
          <p className="label">Paid</p>
        </div>
        <div className="stat-card">
          <p className={`value ${balance > 0 ? 'red' : 'green'}`}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid'}
          </p>
          <p className="label">Balance</p>
        </div>
        <div className="stat-card">
          <p className="value navy">{order.due_date ? formatDate(order.due_date) : '—'}</p>
          <p className="label">Due Date</p>
        </div>
      </div>

      <div className="card">
        <div className="status-timeline">
          {STAGES.map((stage, i) => {
            const isActive = i === currentIndex
            const isDone = i < currentIndex
            return (
              <div key={stage} className="status-dot">
                <div className={`dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`} />
                <span className={`label ${isActive ? 'active' : ''}`}>{stage}</span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={undoStatus}
            disabled={isFirstStage}
            style={{ opacity: isFirstStage ? 0.4 : 1 }}
          >
            ← Undo
          </button>
          <button
            className="btn btn-primary"
            onClick={advanceStatus}
            disabled={isLastStage}
            style={{ opacity: isLastStage ? 0.4 : 1 }}
          >
            {isLastStage ? '✓ Delivered' : `→ ${STAGES[currentIndex + 1]}`}
          </button>
        </div>
      </div>

      <div className="action-row">
        {renderLockableAction(
          'Copy Link',
          'Customers can check their own order status',
          copyTrackingLink,
          isFeatureAvailable(plan, 'tracking_links')
        )}

        {renderLockableAction(
          'Send Link',
          'Share order status link via WhatsApp',
          sendLinkViaWhatsApp,
          isFeatureAvailable(plan, 'tracking_links')
        )}

        {renderLockableAction(
          'Status Update',
          'Keep customers informed of progress',
          sendStatusUpdate,
          isFeatureAvailable(plan, 'whatsapp_reminders')
        )}

        {balance > 0 && renderLockableAction(
          'Send Reminder',
          'Remind customers about pending balance',
          sendReminder,
          isFeatureAvailable(plan, 'whatsapp_reminders')
        )}
      </div>

      {editing && (
        <form onSubmit={handleSave} className="card">
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 0.8rem' }}>✏️ Edit Order</h2>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>Item / Garment</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>Total Price (₦)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
          </div>
          <button type="submit" className="btn btn-gold btn-block" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save changes'}
          </button>
          {message && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>
              {message}
            </p>
          )}
        </form>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: 0 }}>💰 Payments</h2>
          {balance > 0 && (
            <button className="btn btn-green" onClick={() => setShowPaymentForm(!showPaymentForm)}>
              {showPaymentForm ? '✕ Cancel' : '+ Record Payment'}
            </button>
          )}
        </div>

        {showPaymentForm && (
          <form onSubmit={handleRecordPayment} style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid #E8E0D5' }}>
            <div style={{ marginBottom: '0.6rem' }}>
              <label style={labelStyle}>Amount (₦)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                style={inputStyle}
                required
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Note (optional)</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Cash payment"
                style={inputStyle}
              />
            </div>
            <button type="submit" className="btn btn-green btn-block" disabled={recordingPayment}>
              {recordingPayment ? 'Recording...' : '💰 Record payment'}
            </button>
          </form>
        )}

        {payments.length === 0 ? (
          <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>No payments recorded yet.</p>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            {payments.map((p) => (
              <div key={p.id} className="payment-row">
                <span style={{ color: '#6B6255' }}>
                  {formatDate(p.created_at)} {p.note && `— ${p.note}`}
                </span>
                <span style={{ fontWeight: '600', color: '#4C7A5E' }}>₦{p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 0.3rem' }}>📝 Internal Notes</h2>
        <p style={{ color: '#6B6255', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>Only you see these — not shared with the customer.</p>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Customer said pick up Friday. Don't forget the extra button."
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
        />
        <button className="btn btn-primary btn-block" onClick={handleSaveNotes} disabled={savingNotes}>
          {savingNotes ? 'Saving...' : '💾 Save notes'}
        </button>
        {notesMessage && (
          <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: notesMessage.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>
            {notesMessage}
          </p>
        )}
      </div>

      <button
        className="btn btn-red btn-block"
        onClick={handleDelete}
        disabled={deleting}
        style={{ marginTop: '0.5rem' }}
      >
        {deleting ? 'Deleting...' : '🗑️ Delete order'}
      </button>
    </main>
  )
          }
