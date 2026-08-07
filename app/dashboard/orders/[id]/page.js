'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [payments, setPayments] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [currentBusinessId, setCurrentBusinessId] = useState(null)

  // ─── Payment modal state ───
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  // ─── Status update modal ───
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const statusOptions = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

  // ─── Load order data ───
  const loadOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const bizId = getCurrentBusinessId()
      if (!bizId) {
        router.push('/dashboard')
        return
      }
      setCurrentBusinessId(bizId)

      // Fetch order with customer
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (id, name, phone, email, address)
        `)
        .eq('id', orderId)
        .eq('business_id', bizId)
        .single()

      if (orderError) throw orderError

      setOrder(orderData)
      setCustomer(orderData.customers)
      setBusinessId(bizId)

      // Fetch payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (paymentError) throw paymentError
      setPayments(paymentData || [])

    } catch (err) {
      console.error('Error loading order:', err)
      setError('Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId, router])

  // ─── Record payment ───
  const handleRecordPayment = async (e) => {
    e.preventDefault()
    setRecordingPayment(true)

    try {
      const amount = parseFloat(paymentAmount)
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount.')
        setRecordingPayment(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 1. Insert payment record
      const { error: insertError } = await supabase
        .from('payment_records')
        .insert({
          order_id: orderId,
          amount: amount,
          note: paymentNote || 'Payment recorded from order detail',
        })

      if (insertError) throw insertError

      // 2. Update order amount_paid
      const newTotal = (order.amount_paid || 0) + amount
      const { error: updateError } = await supabase
        .from('orders')
        .update({ amount_paid: newTotal })
        .eq('id', orderId)

      if (updateError) throw updateError

      // 3. Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'payment_recorded',
        details: { order_id: orderId, amount }
      })

      // 4. Refresh data
      await loadOrder()
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
    } catch (err) {
      console.error('Payment error:', err)
      alert('Failed to record payment.')
    } finally {
      setRecordingPayment(false)
    }
  }

  // ─── Update status ───
  const handleUpdateStatus = async () => {
    if (!newStatus) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('orders')
        .update({ current_status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_status_updated',
        details: { order_id: orderId, new_status: newStatus }
      })

      await loadOrder()
      setShowStatusModal(false)
      setNewStatus('')
    } catch (err) {
      console.error('Status update error:', err)
      alert('Failed to update status.')
    }
  }

  // ─── Send WhatsApp ───
  const sendWhatsApp = () => {
    if (!customer?.phone) {
      alert('Customer has no phone number.')
      return
    }
    const msg = `Hi ${customer.name || ''}, your order "${order.title || 'Untitled'}" is ${order.current_status || 'in progress'}.`
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // ─── Get status info ───
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)', icon: '📋' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8', icon: '✂️' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB', icon: '🧵' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2', icon: '✅' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5', icon: '📦' },
    }
    return map[status] || { label: status || 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)', icon: '📋' }
  }

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '200px', height: '24px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '100px', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
            <div style={{ width: '80px', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
          </div>
          <div style={{ width: '100%', height: '100px', background: 'var(--color-border)', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ width: '60px', height: '32px', background: 'var(--color-border)', borderRadius: '20px' }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={loadOrder} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Order not found.
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.current_status)
  const balance = (order.price || 0) - (order.amount_paid || 0)
  const isOverdue = order.due_date && new Date(order.due_date) < new Date() && order.current_status !== 'Delivered'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Order</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            #{orderId.slice(0, 8)} · {customer?.name || 'No customer'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={`/dashboard/orders/${orderId}/edit?business_id=${currentBusinessId || ''}`}
            style={{ padding: '0.3rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Icon name="edit-2" size={14} stroke="#fff" /> Edit
          </a>
          <button
            onClick={() => router.push(`/dashboard/orders?business_id=${currentBusinessId || ''}`)}
            style={{ padding: '0.3rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            Back
          </button>
        </div>
      </div>

      {/* ─── Status bar ─── */}
      <div style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Current Status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                {statusInfo.icon} {statusInfo.label}
              </span>
              {isOverdue && <span style={{ background: 'var(--color-danger)', color: '#fff', padding: '0.1rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>Overdue</span>}
            </div>
          </div>
          <button
            onClick={() => { setNewStatus(order.current_status); setShowStatusModal(true) }}
            style={{ padding: '0.3rem 1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Update Status
          </button>
        </div>
      </div>

      {/* ─── Stats grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Total</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>₦{order.price?.toLocaleString() || 0}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Paid</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-success)' }}>₦{order.amount_paid?.toLocaleString() || 0}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Balance</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
          </div>
        </div>
        {order.due_date && (
          <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Due Date</div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {new Date(order.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Customer info ─── */}
      {customer && (
        <div style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{customer.name}</div>
              {customer.phone && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📞 {customer.phone}</div>}
              {customer.email && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>✉️ {customer.email}</div>}
              {customer.address && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 {customer.address}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {customer.phone && (
                <button
                  onClick={() => window.location.href = `tel:${customer.phone.replace(/\D/g, '')}`}
                  style={{ background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="phone" size={16} stroke="#fff" />
                </button>
              )}
              {customer.phone && (
                <button
                  onClick={sendWhatsApp}
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="message-circle" size={16} stroke="#fff" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Payment ─── */}
      <button
        onClick={() => setShowPaymentModal(true)}
        disabled={balance <= 0}
        style={{
          width: '100%',
          padding: '0.8rem',
          background: balance > 0 ? 'var(--color-accent)' : 'var(--color-border)',
          color: balance > 0 ? '#0F2B4A' : 'var(--color-text-muted)',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '0.95rem',
          cursor: balance > 0 ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}
      >
        <Icon name="plus" size={16} stroke={balance > 0 ? '#0F2B4A' : 'var(--color-text-muted)'} />
        {balance > 0 ? 'Record Payment' : 'Fully Paid ✓'}
      </button>

      {/* ─── Payments history ─── */}
      <div style={{ background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '0.8rem 1rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>
          Payments History
        </div>
        {payments.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No payments recorded yet.
          </div>
        ) : (
          <div>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>₦{p.amount?.toLocaleString() || 0}</div>
                  {p.note && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.note}</div>}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Status Modal ─── */}
      {showStatusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowStatusModal(false)}>
          <div style={{ background: 'var(--color-bg)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Update Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem', marginBottom: '1rem' }}
            >
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={handleUpdateStatus} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Update</button>
              <button onClick={() => setShowStatusModal(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

       {/* ─── Payment Modal ─── */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowPaymentModal(false)}>
          <div style={{ background: 'var(--color-bg)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Record Payment</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>Balance: ₦{balance.toLocaleString()}</p>
            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Amount (₦)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  placeholder="Enter amount"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Note (optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Cash payment"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="submit" disabled={recordingPayment} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: recordingPayment ? 'default' : 'pointer', opacity: recordingPayment ? 0.6 : 1 }}>
                  {recordingPayment ? 'Recording...' : 'Record Payment'}
                </button>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
                         }
