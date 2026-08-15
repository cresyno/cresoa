'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'
import { Card } from '../../../../../components/Card'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { Navigation } from '../../../../../components/Navigation'
import { MeasurementForm } from '../../../../../components/MeasurementForm'
import '../../../../globals.css'

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [order, setOrder] = useState(null)

  // ─── Form state ────────────────────────────────────────────
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    price: '',
    amount_paid: '',
    due_date: '',
    current_status: 'Order placed',
    notes: '',
    measurements: {},
  })

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load data ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!businessId || !orderId) {
        router.push('/dashboard')
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        // ─── Fetch order ──────────────────────────────────────
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('business_id', businessId)
          .single()

        if (orderError) throw orderError
        setOrder(orderData)

        setFormData({
          customer_id: orderData.customer_id || '',
          title: orderData.title || '',
          price: orderData.price || '',
          amount_paid: orderData.amount_paid || '',
          due_date: orderData.due_date || '',
          current_status: orderData.current_status || 'Order placed',
          notes: orderData.notes || '',
          measurements: orderData.measurements || {},
        })

        // ─── Fetch customers ──────────────────────────────────
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('business_id', businessId)
          .order('name')
        setCustomers(custData || [])

      } catch (err) {
        console.error(err)
        setError('Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId, businessId])

  // ─── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const payload = {
        customer_id: formData.customer_id || null,
        title: formData.title,
        price: parseFloat(formData.price) || 0,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
        measurements: formData.measurements || {},
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order')
      }

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_updated',
        details: { title: formData.title }
      })

      navigateWithBusiness(`/dashboard/orders/${orderId}`)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update order.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return

    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete order')
      }

      navigateWithBusiness('/dashboard/orders')

    } catch (err) {
      console.error(err)
      alert('Failed to delete order: ' + err.message)
      setDeleting(false)
    }
  }

  // ─── Computed ──────────────────────────────────────────────
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer_id) || null
  }, [customers, formData.customer_id])

  const remainingBalance = useMemo(() => {
    return Math.max((Number(formData.price) || 0) - (Number(formData.amount_paid) || 0), 0)
  }, [formData.price, formData.amount_paid])

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load order</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (!order) return null

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Back button */}
      <button
        onClick={() => navigateWithBusiness(`/dashboard/orders/${orderId}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Icon name="arrow-left" size={16} stroke="currentColor" /> Back to Order
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Orders</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Edit Order</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>#{orderId.slice(0, 8)} · Update order details below.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{
            padding: '0.2rem 0.8rem',
            borderRadius: '20px',
            background: order.current_status === 'Delivered' ? 'var(--cresoa-success-soft)' : 'var(--cresoa-warning-soft)',
            color: order.current_status === 'Delivered' ? 'var(--cresoa-success)' : 'var(--cresoa-warning)',
            fontSize: '0.7rem',
            fontWeight: 600
          }}>
            {order.current_status}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ─── Customer ───────────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Customer" subtitle="Select the customer for this order" />
          <div>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
            >
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
            </select>
            {selectedCustomer && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>
                {selectedCustomer.name} · {selectedCustomer.phone || 'No phone'}
              </div>
            )}
          </div>
        </Card>

        {/* ─── Order Details ──────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Order Details" />
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Item / Garment *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Total Price (₦) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="100"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Deposit (₦)</label>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.8rem', background: 'var(--cresoa-bg)', borderRadius: '6px' }}>
              <span style={{ fontWeight: 600 }}>Balance remaining</span>
              <strong style={{ color: remainingBalance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(remainingBalance)}
              </strong>
            </div>
          </div>
        </Card>

        {/* ─── Dates & Status ────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Dates & Status" />
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Status</label>
              <select
                name="current_status"
                value={formData.current_status}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              >
                <option value="Order placed">Order placed</option>
                <option value="Cutting">Cutting</option>
                <option value="Sewing">Sewing</option>
                <option value="Ready">Ready</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ─── Measurements ───────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Measurements" subtitle="Update sizing details for this order" />
          <MeasurementForm
            measurements={formData.measurements || {}}
            onChange={(updated) => setFormData(prev => ({ ...prev, measurements: updated }))}
            showNotes={false}
          />
        </Card>

        {/* ─── Notes ──────────────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Notes" subtitle="Private notes for your team" />
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Add any notes about this order..."
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', resize: 'vertical' }}
          />
        </Card>

        {/* ─── Error ──────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert-circle" size={16} stroke="var(--cresoa-danger)" /> {error}
          </div>
        )}

        {/* ─── Actions ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            className="cresoa-primary-button"
            style={{ padding: '0.6rem 1.5rem' }}
          >
            <Icon name="check" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigateWithBusiness(`/dashboard/orders/${orderId}`)}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '0.9rem', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              marginLeft: 'auto',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--cresoa-danger)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--cresoa-danger)',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: deleting ? 0.6 : 1
            }}
          >
            <Icon name="trash-2" size={14} stroke="var(--cresoa-danger)" /> {deleting ? 'Deleting...' : 'Delete Order'}
          </button>
        </div>

      </form>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
