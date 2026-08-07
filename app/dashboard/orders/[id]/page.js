'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../../lib/planLimits'
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
  const [businessPlan, setBusinessPlan] = useState('free')
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    due_date: '',
  })

  const statusOptions = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

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
      setNotes(orderData.notes || '')
      setEditForm({
        title: orderData.title || '',
        price: orderData.price || '',
        due_date: orderData.due_date || '',
      })

      const { data: bizData } = await supabase
        .from('businesses')
        .select('plan')
        .eq('id', bizId)
        .single()
      if (bizData) setBusinessPlan(bizData.plan || 'free')

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
      setError('Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId, router])

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('orders')
        .update({ notes })
        .eq('id', orderId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_notes_updated',
        details: { order_id: orderId }
      })
    } catch (err) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes.')
    } finally {
      setSavingNotes(false)
    }
  }

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

      const response = await fetch(`/api/orders/${orderId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: amount,
          note: paymentNote || 'Payment recorded',
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to record payment')
      }

      await loadOrder()
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
    } catch (err) {
      console.error('Payment error:', err)
      alert(err.message)
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleUpdateStatus = async (status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('orders')
        .update({ current_status: status })
        .eq('id', orderId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_status_updated',
        details: { order_id: orderId, new_status: status }
      })

      await loadOrder()
      setShowStatusModal(false)
      setNewStatus('')
    } catch (err) {
      console.error('Status update error:', err)
      alert('Failed to update status.')
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('orders')
        .update({
          title: editForm.title,
          price: parseFloat(editForm.price) || 0,
          due_date: editForm.due_date || null,
        })
        .eq('id', orderId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_updated',
        details: { order_id: orderId }
      })

      await loadOrder()
      setEditing(false)
    } catch (err) {
      console.error('Edit error:', err)
      alert('Failed to update order.')
    }
  }

  const handleDuplicate = async () => {
    if (!confirm('Duplicate this order?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: order.customer_id,
          title: `${order.title} (Copy)`,
          price: order.price,
          amount_paid: 0,
          due_date: order.due_date,
          current_status: 'Order placed',
          notes: order.notes,
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_duplicated',
        details: { original_id: orderId, new_id: data.id }
      })

      router.push(`/dashboard/orders/${data.id}?business_id=${currentBusinessId}`)
    } catch (err) {
      console.error('Duplicate error:', err)
      alert('Failed to duplicate order.')
    }
  }

  const sendWhatsApp = () => {
    if (!customer?.phone) {
      alert('Customer has no phone number.')
      return
    }
    const msg = `Hi ${customer.name || ''}, your order "${order.title || 'Untitled'}" is ${order.current_status || 'in progress'}.`
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const copyTrackingLink = () => {
    const trackingLink = `${window.location.origin}/track/${orderId}?business_id=${currentBusinessId}`
    navigator.clipboard?.writeText(trackingLink)
    alert('Tracking link copied to clipboard!')
  }

  const sendTrackingLink = () => {
    if (!customer?.phone) {
      alert('Customer has no phone number.')
      return
    }
    const trackingLink = `${window.location.origin}/track/${orderId}?business_id=${currentBusinessId}`
    const msg = `Hi ${customer.name || ''}, track your order here: ${trackingLink}`
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

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

  const canTracking = isFeatureAvailable(businessPlan, 'tracking_links')
  const canWhatsApp = isFeatureAvailable(businessPlan, 'whatsapp_reminders')

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
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
        <button onClick={loadOrder} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
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
  const isFullyPaid = balance <= 0
  const statusIndex = statusOptions.indexOf(order.current_status)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'var(--color-text)' }}>

      {/* ─── Header Row ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            onClick={() => router.push(`/dashboard/orders?business_id=${currentBusinessId || ''}`)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.3rem' }}
          >
            <Icon name="arrow-left" size={20} stroke="currentColor" />
          </button>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
              {order.title || 'Untitled'}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              #{orderId.slice(0, 8)} · {customer?.name || 'No customer'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleDuplicate}
            style={{ padding: '0.3rem 1rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Icon name="copy" size={14} stroke="#fff" /> Duplicate
          </button>
          <button
            onClick={() => setEditing(!editing)}
            style={{ padding: '0.3rem 1rem', background: 'var(--color-accent)', color: '#0F2B4A', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Icon name="edit-2" size={14} stroke="#0F2B4A" /> {editing ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ─── Status & Quick Actions ─── */}
      <div style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
              {statusInfo.icon} {statusInfo.label}
            </span>
            {isOverdue && <span style={{ background: 'var(--color-danger)', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>Overdue</span>}
            {isFullyPaid && <span style={{ background: 'var(--color-success)', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>Paid ✓</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {order.current_status !== 'Ready' && (
              <button
                onClick={() => handleUpdateStatus('Ready')}
                style={{ padding: '0.3rem 1rem', background: 'var(--color-success)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Mark Ready
              </button>
            )}
            {order.current_status !== 'Delivered' && order.current_status === 'Ready' && (
              <button
                onClick={() => handleUpdateStatus('Delivered')}
                style={{ padding: '0.3rem 1rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Mark Delivered
              </button>
            )}
            <button
              onClick={() => { setNewStatus(order.current_status); setShowStatusModal(true) }}
              style={{ padding: '0.3rem 1rem', background: 'var(--color-accent)', color: '#0F2B4A', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
            >
              Update Status
            </button>
          </div>
        </div>
      </div>

      {/* ─── Status Timeline ─── */}
      <div style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', minWidth: '450px' }}>
          {statusOptions.map((s, idx) => {
            const isActive = idx <= statusIndex
            const isCurrent = s === order.current_status
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <button
                  onClick={() => handleUpdateStatus(s)}
                  style={{
                    flex: 1,
                    padding: '0.3rem 0.2rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                    color: isActive ? '#0F2B4A' : 'var(--color-text-muted)',
                    fontWeight: isCurrent ? '700' : '400',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {s.split(' ').pop()}
                </button>
                {idx < statusOptions.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: isActive && idx < statusIndex ? 'var(--color-accent)' : 'var(--color-border)', margin: '0 0.2rem' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
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

      {/* ─── Customer Info ─── */}
      {customer && (
        <div style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{customer.name}</div>
              {customer.phone && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{customer.phone}</div>}
              {customer.email && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{customer.email}</div>}
              {customer.address && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{customer.address}</div>}
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

      {/* ─── Tracking Links ─── */}
      <div style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>🔗 Tracking Link</span>
          {canTracking ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={copyTrackingLink}
                style={{ padding: '0.3rem 1rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Copy Link
              </button>
              <button
                onClick={sendTrackingLink}
                style={{ padding: '0.3rem 1rem', background: '#25D366', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Send via WhatsApp
              </button>
            </div>
          ) : (
            <a
              href={`/dashboard/subscription?business_id=${currentBusinessId}`}
              style={{ color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: '500', textDecoration: 'underline' }}
            >
              Upgrade to enable tracking links →
            </a>
          )}
        </div>
      </div>

      {/* ─── Record Payment ─── */}
      <button
        onClick={() => setShowPaymentModal(true)}
        disabled={balance <= 0}
        style={{
          width: '100%',
          padding: '0.7rem',
          background: balance > 0 ? 'var(--color-accent)' : 'var(--color-border)',
          color: balance > 0 ? '#0F2B4A' : 'var(--color-text-muted)',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '0.9rem',
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

      {/* ─── Payments History ─── */}
      <div style={{ background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.7rem 1rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>
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

      {/* ─── Edit Order (Collapsible) ─── */}
      {editing && (
        <div style={{ background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.8rem 1rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>
            ✏️ Edit Order
          </div>
          <form onSubmit={handleEditSubmit} style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Item / Garment</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Total Price (₦)</label>
              <input
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Due Date</label>
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={{ padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} style={{ padding: '0.5rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Internal Notes ─── */}
      <div style={{ background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '0.7rem 1rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontWeight: '600', fontSize: '0.9rem' }}>
          📝 Internal Notes
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: '400', marginLeft: '0.5rem' }}>(only you see these)</span>
        </div>
        <div style={{ padding: '1rem' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add internal notes about this order..."
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }}
          />
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            style={{ marginTop: '0.5rem', padding: '0.4rem 1.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: savingNotes ? 'default' : 'pointer', opacity: savingNotes ? 0.6 : 1 }}
          >
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
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
              <button onClick={() => handleUpdateStatus(newStatus)} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Update</button>
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
                <button type="submit" disabled={recordingPayment} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: recordingPayment ? 'default' : 'pointer', opacity: recordingPayment ? 0.6 : 1 }}>
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
