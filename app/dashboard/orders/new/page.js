'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { getPlanLimits } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [customers, setCustomers] = useState([])
  const [orderCount, setOrderCount] = useState(0)

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    title: '',
    price: '',
    amount_paid: '',
    due_date: '',
    current_status: 'Order placed',
    notes: '',
  })

  const [isNewCustomer, setIsNewCustomer] = useState(false)

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

        // Fetch business plan
        const { data: bizData } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', bizId)
          .single()
        if (bizData) setBusinessPlan(bizData.plan || 'free')

        // Fetch customers
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('business_id', bizId)
          .order('name')
        setCustomers(custData || [])

        // Count existing orders for plan limit
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', bizId)
        setOrderCount(count || 0)

      } catch (err) {
        console.error(err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleCustomerChange = (e) => {
    const value = e.target.value
    if (value === 'new') {
      setIsNewCustomer(true)
      setFormData({
        ...formData,
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
      })
    } else {
      setIsNewCustomer(false)
      const selected = customers.find(c => c.id === value)
      setFormData({
        ...formData,
        customer_id: value,
        customer_name: selected?.name || '',
        customer_phone: selected?.phone || '',
        customer_email: selected?.email || '',
      })
    }
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

      // ─── Plan limit check ───
      const limits = getPlanLimits(businessPlan)
      if (orderCount >= limits.orders) {
        setError(`You have reached the limit of ${limits.orders} orders on your current plan. Please upgrade to add more.`)
        setSaving(false)
        return
      }

      // ─── Validate form ───
      if (!formData.title) {
        setError('Please enter an item / garment name.')
        setSaving(false)
        return
      }

      const price = parseFloat(formData.price)
      if (!price || price <= 0) {
        setError('Please enter a valid price.')
        setSaving(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // ─── Build payload ───
      const payload = {
        business_id: businessId,
        title: formData.title,
        price: price,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
      }

      if (isNewCustomer) {
        payload.customer_name = formData.customer_name
        payload.customer_phone = formData.customer_phone || null
        payload.customer_email = formData.customer_email || null
      } else if (formData.customer_id) {
        payload.customer_id = formData.customer_id
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order')
      }

      router.push(`/dashboard/orders?business_id=${businessId}`)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      setSaving(false)
    }
  }

  // ─── Skeleton ───
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
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>New Order</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        {orderCount} orders used · {getPlanLimits(businessPlan).orders === Infinity ? 'Unlimited' : getPlanLimits(businessPlan).orders} max
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* ─── Customer ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Customer</label>
          <select
            value={isNewCustomer ? 'new' : formData.customer_id}
            onChange={handleCustomerChange}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          >
            <option value="">Select customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">➕ Create new customer</option>
          </select>
        </div>

        {/* ─── New Customer Fields ─── */}
        {isNewCustomer && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Name *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Phone</label>
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Email</label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        )}

        {/* ─── Item / Garment ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Item / Garment *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g. Aso-ebi Gown"
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
              placeholder="5000"
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
              placeholder="2000"
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
            placeholder="Any extra information about this order..."
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
            <Icon name="plus" size={16} stroke="#0F2B4A" /> {saving ? 'Creating...' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
