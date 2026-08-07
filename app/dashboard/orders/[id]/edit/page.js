'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    price: '',
    amount_paid: '',
    due_date: '',
    current_status: 'Order placed',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const bizId = getCurrentBusinessId()
        if (!bizId) {
          router.push('/dashboard')
          return
        }
        setBusinessId(bizId)

        // ─── Fetch order ───
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('business_id', bizId)
          .single()

        if (orderError) throw orderError

        setFormData({
          customer_id: order.customer_id || '',
          title: order.title || '',
          price: order.price || '',
          amount_paid: order.amount_paid || '',
          due_date: order.due_date || '',
          current_status: order.current_status || 'Order placed',
          notes: order.notes || '',
        })

        // ─── Fetch customers ───
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', bizId)
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
  }, [orderId, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!businessId) {
        setError('No business selected.')
        setSaving(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const payload = {
        customer_id: formData.customer_id || null,
        title: formData.title,
        price: parseFloat(formData.price) || 0,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
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

      router.push(`/dashboard/orders/${orderId}?business_id=${businessId}`)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this order?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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

      router.push(`/dashboard/orders?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to delete order.')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Edit Order</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        #{orderId.slice(0, 8)} · Update order details below.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* ─── Customer ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Customer</label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          >
            <option value="">No customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* ─── Item / Garment ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Item / Garment *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          />
        </div>

        {/* ─── Price & Deposit ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Total Price (₦) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Deposit (₦)</label>
            <input
              type="number"
              name="amount_paid"
              value={formData.amount_paid}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* ─── Due Date ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          />
        </div>

        {/* ─── Status ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Status</label>
          <select
            name="current_status"
            value={formData.current_status}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          >
            <option value="Order placed">Order placed</option>
            <option value="Cutting">Cutting</option>
            <option value="Sewing">Sewing</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* ─── Notes ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Notes (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#0F2B4A',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="check" size={16} stroke="#0F2B4A" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="trash-2" size={16} stroke="var(--color-danger)" /> Delete Order
          </button>
        </div>
      </form>
    </div>
  )
}
