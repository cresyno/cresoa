'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    price: '',
    due_date: '',
    current_status: 'Order placed',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const businessId = getCurrentBusinessId()
        if (!businessId) {
          router.push('/dashboard')
          return
        }

        // Fetch order
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
          due_date: orderData.due_date || '',
          current_status: orderData.current_status || 'Order placed',
        })

        // Fetch customers for dropdown
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .order('name')
        setCustomers(customersData || [])

      } catch (err) {
        console.error(err)
        setError('Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [orderId, router])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const businessId = getCurrentBusinessId()
      const { data: { user } } = await supabase.auth.getUser()

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          customer_id: formData.customer_id || null,
          title: formData.title,
          price: parseFloat(formData.price) || 0,
          due_date: formData.due_date || null,
          current_status: formData.current_status,
        })
        .eq('id', orderId)
        .eq('business_id', businessId)

      if (updateError) throw updateError

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'order_updated',
        details: { order_id: orderId }
      })

      router.push(`/dashboard/orders?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      const businessId = getCurrentBusinessId()
      const { data: { user } } = await supabase.auth.getUser()

      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('business_id', businessId)

      if (deleteError) throw deleteError

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'order_deleted',
        details: { order_id: orderId }
      })

      router.push(`/dashboard/orders?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to delete order.')
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Edit Order</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        #{orderId.slice(0, 8)} · {order?.title || 'Untitled'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Customer</label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)'
            }}
          >
            <option value="">No customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Item / Garment</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Total Price (₦)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Status</label>
          <select
            name="current_status"
            value={formData.current_status}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)'
            }}
          >
            <option value="Order placed">Order placed</option>
            <option value="Cutting">Cutting</option>
            <option value="Sewing">Sewing</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-text)'
            }}
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
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              marginLeft: 'auto'
            }}
          >
            Delete order
          </button>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  )
          }
