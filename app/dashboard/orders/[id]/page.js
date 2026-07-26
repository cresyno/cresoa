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

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const load = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('id', params.id)
      .single()

    setOrder(orderData)
    if (orderData) {
      setTitle(orderData.title)
      setPrice(orderData.price)
      setDueDate(orderData.due_date || '')

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
    if (searchParams.get('edit') === 'true') {
      setEditing(true)
    }
  }, [params.id])

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

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const sendLinkViaWhatsApp = () => {
    const phone = formatPhoneForWhatsApp(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    const message = `Hi ${order.customers?.name}! This is ${business?.name}. Here's your order tracking link — you can check your order status anytime: ${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const sendStatusUpdateViaWhatsApp = () => {
    const phone = formatPhoneForWhatsApp(order.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const message = `Hi ${order.customers?.name}, this is ${business?.name}. Just to update you — your order "${order.title}" is now at the "${order.current_status}" stage. Thank you for your patience!`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    const { error } = await supabase
      .from('orders')
      .update({ title, price: Number(price) || 0, due_date: dueDate || null })
      .eq('id', order.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('Saved!')
    setSaving(false)
    load()
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
      </main>
    )
  }

  const balance = order.price - order.amount_paid
  const currentIndex = STAGES.indexOf(order.current_status)
  const isLastStage = currentIndex === STAGES.length - 1
  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.2rem' }}>{order.title}</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>For {order.customers?.name}</p>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.3rem', border: '1px solid #e4d8c2', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ textAlign: 'center', flex: 1 }}>
                <div
                  style={{
                    width: i === currentIndex ? '18px' : '11px',
                    height: i === currentIndex ? '18px' : '11px',
                    borderRadius: '50%',
                    background: i <= currentIndex ? '#C79A2B' : '#fff',
                    border: `2px solid ${i <= currentIndex ? '#C79A2B' : '#e4d8c2'}`,
                    margin: '0 auto 0.3rem'
                  }}
                />
                <p style={{ fontSize: '0.6rem', color: i <= currentIndex ? '#2B2620' : '#6B6255', margin: 0 }}>{stage}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={undoStatus}
              disabled={currentIndex === 0}
              style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #6B6255', background: '#fff', color: currentIndex === 0 ? '#c9c2b3' : '#6B6255', fontSize: '0.85rem', fontWeight: '600' }}
            >
              ← Undo stage
            </button>
            <button
              onClick={advanceStatus}
              disabled={isLastStage}
              style={{ padding: '0.6rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: '600', background: isLastStage ? '#e4d8c2' : '#1E3A5F', color: isLastStage ? '#6B6255' : '#fff' }}
            >
              {isLastStage ? 'Delivered' : 'Advance →'}
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.3rem', border: '1px solid #e4d8c2', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: '#6B6255' }}>Total</span>
            <span style={{ color: '#2B2620' }}>₦{order.price.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: '#6B6255' }}>Paid</span>
            <span style={{ color: '#2B2620' }}>₦{order.amount_paid.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '1rem' }}>
            <span style={{ color: '#2B2620' }}>Balance</span>
            <span style={{ color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
              {balance > 0 ? `₦${balance.toLocaleString()}` : 'Paid in full'}
            </span>
          </div>

          {balance > 0 && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#4C7A5E', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}
            >
              {showPaymentForm ? 'Cancel' : '+ Record Payment'}
            </button>
          )}

          {showPaymentForm && (
            <form onSubmit={handleRecordPayment} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e4d8c2' }}>
              <div style={{ marginBottom: '0.7rem' }}>
                <label style={labelStyle}>Amount received (₦)</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Note (optional)</label>
                <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" style={inputStyle} />
              </div>
              <button type="submit" disabled={recordingPayment} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>
                {recordingPayment ? 'Saving...' : 'Save payment'}
              </button>
            </form>
          )}

          {payments.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e4d8c2' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1E3A5F', margin: '0 0 0.6rem' }}>Payment history</p>
              {payments.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#6B6255' }}>{formatDate(p.created_at)}{p.note ? ` — ${p.note}` : ''}</span>
                  <span style={{ color: '#4C7A5E', fontWeight: '600' }}>₦{p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
          <button onClick={copyTrackingLink} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.85rem', fontWeight: '600' }}>
            Copy link
          </button>
          <button onClick={sendLinkViaWhatsApp} style={{ padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#4C7A5E', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>
            Send link
          </button>
        </div>
        <button onClick={sendStatusUpdateViaWhatsApp} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #4C7A5E', background: '#fff', color: '#4C7A5E', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1.2rem' }}>
          Send status update
        </button>

        <button
          onClick={() => setEditing(!editing)}
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: editing ? '#1E3A5F' : '#fff', color: editing ? '#fff' : '#1E3A5F', fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem' }}
        >
          {editing ? 'Close edit' : 'Edit order details'}
        </button>

        {editing && (
          <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: '12px', padding: '1.3rem', border: '1px solid #e4d8c2', marginBottom: '1.2rem' }}>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Garment / style</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Total price (₦)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required style={inputStyle} />
              <p style={{ fontSize: '0.78rem', color: '#6B6255', marginTop: '0.3rem' }}>
                To record a payment, use "+ Record Payment" above instead of editing amount paid directly.
              </p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {message && (
              <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: message === 'Saved!' ? '#4C7A5E' : '#AE4A34' }}>
                {message}
              </p>
            )}
          </form>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #AE4A34', background: '#fff', color: '#AE4A34', fontSize: '0.9rem', fontWeight: '600' }}
        >
          {deleting ? 'Deleting...' : 'Delete order'}
        </button>
      </div>
    </main>
  )
  }
