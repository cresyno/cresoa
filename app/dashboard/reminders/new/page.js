'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import WhatsAppReminderModal from '../../../../../components/WhatsAppReminderModal'

export default function NewReminderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    customer_id: '',
    order_id: '',
  })
  const [createdReminder, setCreatedReminder] = useState(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
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

        // Fetch customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', bizId)
          .order('name')
        setCustomers(customersData || [])

        // Fetch orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, title, price, customers(name)')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
        setOrders(ordersData || [])
      } catch (err) {
        console.error(err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          business_id: businessId,
          title: formData.title,
          due_date: formData.due_date || null,
          customer_id: formData.customer_id || null,
          order_id: formData.order_id || null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'reminder_created',
        details: { title: formData.title }
      })

      setCreatedReminder(data)
      setShowWhatsAppModal(true)
    } catch (err) {
      console.error(err)
      setError('Failed to create reminder.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  const getOrderDisplay = (order) => {
    if (!order) return ''
    const customerName = order.customers?.name || 'No customer'
    return `${order.title || 'Untitled'} (₦${order.price || 0}) — ${customerName}`
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>New Reminder</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Create a reminder for yourself or a customer.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g. Payment reminder for Aso Ebi"
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
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
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Customer (optional)</label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          >
            <option value="">No customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Order (optional)</label>
          <select
            name="order_id"
            value={formData.order_id}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          >
            <option value="">No order</option>
            {orders.map(o => <option key={o.id} value={o.id}>{getOrderDisplay(o)}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Creating...' : 'Create Reminder'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)'
            }}
          >
            Cancel
          </button>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}
      </form>

      {/* ─── WhatsApp Modal ─── */}
      {showWhatsAppModal && createdReminder && (
        <WhatsAppReminderModal
          reminder={createdReminder}
          onClose={() => {
            setShowWhatsAppModal(false)
            router.push(`/dashboard/reminders?business_id=${businessId}`)
          }}
          businessId={businessId}
        />
      )}
    </div>
  )
          }
